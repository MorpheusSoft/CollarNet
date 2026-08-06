import express from 'express';
import pool from '../config/db.js';
import { saveHato, savePotrero } from '../services/geofenceService.js';
import { publishToCollar } from '../services/mqttService.js';
import { extractGeofenceFromPDF } from '../services/aiService.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper para aplanar coordenadas [[lat, lon], ...] a [lat, lon, lat, lon...]
 */
function flattenCoordinates(vertices) {
  const flat = [];
  for (const pt of vertices) {
    flat.push(parseFloat(pt[0]));
    flat.push(parseFloat(pt[1]));
  }
  return flat;
}

/**
 * Helper para extraer vértices de una cadena GeoJSON de PostGIS
 */
function extractVerticesFromGeoJSON(geojsonStr) {
  if (!geojsonStr) return [];
  const geojson = JSON.parse(geojsonStr);
  if (geojson.type !== 'Polygon') return [];
  const outerRing = geojson.coordinates[0]; // Primer anillo (exterior)
  // Convertir de [lon, lat] a [lat, lon]
  return outerRing.map(pt => [pt[1], pt[0]]);
}

// ==========================================
// 1. ENDPOINTS DE MONITOREO EN TIEMPO REAL
// ==========================================

/**
 * GET /api/animales/monitoreo
 * Retorna el listado del estado actual de todos los animales vinculados a collares.
 */
router.get('/animales/monitoreo', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id AS animal_id,
        a.arete_visual,
        a.raza,
        a.categoria,
        a.fecha_nacimiento,
        (CURRENT_DATE - a.fecha_nacimiento) AS edad_dias,
        c.id AS collar_id,
        c.numero_sim,
        c.nivel_bateria,
        c.senal_celular,
        c.ultima_conexion,
        ST_Y(c.ultima_ubicacion) AS latitud,
        ST_X(c.ultima_ubicacion) AS longitud,
        p.nombre AS potrero_asignado_nombre,
        COALESCE(
          (SELECT tipo FROM alertas WHERE animal_id = a.id AND estado = 'ACTIVO' LIMIT 1),
          'NORMAL'
        ) AS estado_alerta
      FROM animales a
      INNER JOIN collares c ON a.collar_id = c.id
      LEFT JOIN potreros p ON a.potrero_id = p.id;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos de monitoreo' });
  }
});

// ==========================================
// 2. CONFIGURACIÓN Y SINCRONIZACIÓN
// ==========================================

/**
 * POST /api/geocercas/sincronizar
 * Genera el payload de geocercas anidadas y lo publica en el collar correspondiente vía MQTT.
 */
router.post('/geocercas/sincronizar', async (req, res) => {
  const { collarId, hatoId, potreroId } = req.body;

  if (!collarId || !hatoId || !potreroId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: collarId, hatoId, potreroId' });
  }

  try {
    // 0. Validar que el collar no esté activo en un Hato diferente (solo si está habilitado!)
    const activeHatoQuery = `
      SELECT p.hato_id, h.nombre AS hato_nombre, c.activo 
      FROM animales a 
      INNER JOIN potreros p ON a.potrero_id = p.id 
      INNER JOIN hatos h ON p.hato_id = h.id 
      INNER JOIN collares c ON a.collar_id = c.id
      WHERE a.collar_id = $1;
    `;
    const { rows: activeHatoRows } = await pool.query(activeHatoQuery, [collarId]);
    if (activeHatoRows.length > 0 && activeHatoRows[0].activo && activeHatoRows[0].hato_id !== parseInt(hatoId, 10)) {
      return res.status(400).json({ 
        error: `No se permite trasladar el collar a un Hato diferente mientras esté habilitado. Deshabilita el collar en '${activeHatoRows[0].hato_nombre}' primero.` 
      });
    }

    // 1. Obtener coordenadas del Hato
    const hatoQuery = `SELECT nombre, ST_AsGeoJSON(perimetro) as geojson FROM hatos WHERE id = $1;`;
    const { rows: hatoRows } = await pool.query(hatoQuery, [hatoId]);
    if (hatoRows.length === 0) return res.status(404).json({ error: 'Hato no encontrado' });

    // 2. Obtener coordenadas del Potrero
    const potreroQuery = `SELECT nombre, ST_AsGeoJSON(perimetro) as geojson FROM potreros WHERE id = $1;`;
    const { rows: potreroRows } = await pool.query(potreroQuery, [potreroId]);
    if (potreroRows.length === 0) return res.status(404).json({ error: 'Potrero no encontrado' });

    const hatoVertices = extractVerticesFromGeoJSON(hatoRows[0].geojson);
    const potreroVertices = extractVerticesFromGeoJSON(potreroRows[0].geojson);

    // 3. Formatear payload comprimido para 2G / ESP32
    const payload = {
      h_id: parseInt(hatoId, 10),
      h_v: flattenCoordinates(hatoVertices),
      p_id: parseInt(potreroId, 10),
      p_v: flattenCoordinates(potreroVertices),
      t_w: 10 // Umbral de alerta en metros (10m)
    };

    // 4. Actualizar la res vinculada a este potrero en la base de datos
    await pool.query('UPDATE animales SET potrero_id = $1 WHERE collar_id = $2;', [parseInt(potreroId, 10), collarId]);

    // 5. Publicar vía MQTT
    const success = publishToCollar(collarId, payload);

    if (success) {
      res.json({
        message: `Geocercas sincronizadas y enviadas al collar ${collarId}`,
        topic: `${process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano'}/${collarId}/config`,
        payload
      });
    } else {
      res.status(500).json({ error: 'No se pudo enviar el mensaje MQTT. Broker desconectado.' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la sincronización de geocercas' });
  }
});

/**
 * POST /api/geocercas/hato
 * Crea o actualiza un Hato.
 */
router.post('/geocercas/hato', async (req, res) => {
  const { id, nombre, vertices } = req.body;
  try {
    const hato = await saveHato(id, nombre, vertices);
    res.status(201).json(hato);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/geocercas/potrero
 * Crea o actualiza un Potrero.
 */
router.post('/geocercas/potrero', async (req, res) => {
  const { id, hatoId, nombre, vertices, capacidad } = req.body;
  try {
    const potrero = await savePotrero(id, hatoId, nombre, vertices, capacidad);
    res.status(201).json(potrero);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/geocercas/crear-manual
 * Crea un Hato o Potrero a partir de una cadena de texto de coordenadas ingresadas manualmente.
 */
router.post('/geocercas/crear-manual', async (req, res) => {
  const { type, hatoId, nombre, coordenadasText } = req.body;
  if (!type || !nombre || !coordenadasText) {
    return res.status(400).json({ error: 'Faltan campos requeridos: type, nombre o coordenadasText' });
  }

  try {
    // Expresión regular robusta para buscar pares numéricos (Latitud, Longitud)
    // Coincide con números decimales (negativos o positivos) separados por coma, espacios, tabulación, etc.
    const regex = /(-?\d+(?:\.\d+)?)\s*[\s,]\s*(-?\d+(?:\.\d+)?)/g;
    let match;
    const vertices = [];
    while ((match = regex.exec(coordenadasText)) !== null) {
      vertices.push([parseFloat(match[1]), parseFloat(match[2])]);
    }

    if (vertices.length < 3) {
      return res.status(400).json({ error: 'Se requieren al menos 3 vértices válidos para formar la geocerca.' });
    }

    let result;
    if (type === 'hato') {
      result = await saveHato(null, nombre, vertices);
    } else {
      if (!hatoId) {
        return res.status(400).json({ error: 'Debe especificar el Hato asociado para crear un potrero.' });
      }
      result = await savePotrero(null, parseInt(hatoId, 10), nombre, vertices);
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[Manual Geocerca Error]', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/geocercas/escalar
 * Recibe id, type ('hato' | 'potrero'), widthMeters, heightMeters.
 * Re-calcula los vértices centrados en la ubicación actual de la geocerca.
 */
router.post('/geocercas/escalar', async (req, res) => {
  const { id, type, widthMeters, heightMeters } = req.body;
  if (!id || !type || !widthMeters || !heightMeters) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: id, type, widthMeters, heightMeters' });
  }

  try {
    const table = type === 'hato' ? 'hatos' : 'potreros';
    const queryCenter = `
      SELECT id, nombre, ${type === 'potrero' ? 'hato_id,' : ''} ST_Y(ST_Centroid(perimetro)) as lat, ST_X(ST_Centroid(perimetro)) as lon 
      FROM ${table} WHERE id = $1;
    `;
    const { rows } = await pool.query(queryCenter, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `No se encontró el ${type} con ID ${id}` });
    }

    const item = rows[0];
    const centerLat = parseFloat(item.lat);
    const centerLon = parseFloat(item.lon);

    const latDelta = (parseFloat(heightMeters) / 2) / 111320;
    const lonDelta = (parseFloat(widthMeters) / 2) / (111320 * Math.cos(centerLat * Math.PI / 180));

    const top = centerLat + latDelta;
    const bottom = centerLat - latDelta;
    const left = centerLon - lonDelta;
    const right = centerLon + lonDelta;

    const vertices = [
      [parseFloat(top.toFixed(6)), parseFloat(left.toFixed(6))],
      [parseFloat(top.toFixed(6)), parseFloat(right.toFixed(6))],
      [parseFloat(bottom.toFixed(6)), parseFloat(right.toFixed(6))],
      [parseFloat(bottom.toFixed(6)), parseFloat(left.toFixed(6))]
    ];

    let result;
    if (type === 'hato') {
      result = await saveHato(item.id, item.nombre, vertices);
    } else {
      result = await savePotrero(item.id, item.hato_id, item.nombre, vertices);
    }

    res.json({ success: true, message: `Geocerca ${item.nombre} re-dimensionada a ${widthMeters}m x ${heightMeters}m con éxito.`, data: result });
  } catch (err) {
    console.error('[Escalar Geocerca Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/geocercas/crear-ia
 * Recibe un archivo PDF de plano catastral, lo analiza con Gemini y crea un Hato automáticamente.
 */
router.post('/geocercas/crear-ia', upload.single('pdfFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debe adjuntar un archivo PDF.' });
  }

  try {
    // 1. Extraer linderos llamando al servicio de IA
    const extracted = await extractGeofenceFromPDF(req.file.buffer);

    // 2. Guardar la geocerca extraída como un nuevo Hato
    const hato = await saveHato(null, extracted.nombre, extracted.vertices);

    res.status(201).json({
      success: true,
      message: 'Plano catastral analizado con IA exitosamente.',
      data: hato
    });
  } catch (err) {
    console.error('[AI Geocerca Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/geocercas/hatos
 * Retorna todos los Hatos creados, incluyendo su representación GeoJSON.
 */
router.get('/geocercas/hatos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre, ST_AsGeoJSON(perimetro) AS geojson FROM hatos;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/geocercas/potreros
 * Retorna todos los Potreros creados, incluyendo su representación GeoJSON.
 */
router.get('/geocercas/potreros', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, hato_id, nombre, ST_AsGeoJSON(perimetro) AS geojson FROM potreros;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/geocercas/hato/:id
 * Elimina un Hato y todas sus pasturas (potreros) en cascada.
 */
router.delete('/geocercas/hato/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Validar que no existan collares activos en los potreros de este hato
    const checkQuery = `
      SELECT COUNT(*) FROM animales a 
      INNER JOIN potreros p ON a.potrero_id = p.id 
      WHERE p.hato_id = $1 AND a.collar_id IS NOT NULL;
    `;
    const { rows } = await pool.query(checkQuery, [id]);
    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el hato porque tiene collares activos asociados a sus potreros.' });
    }

    await pool.query('DELETE FROM hatos WHERE id = $1;', [id]);
    res.json({ success: true, message: `Hato con ID ${id} eliminado con éxito.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/geocercas/potrero/:id
 * Elimina un Potrero específico.
 */
router.delete('/geocercas/potrero/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Validar que no existan collares activos asociados a este potrero
    const checkQuery = `
      SELECT COUNT(*) FROM animales 
      WHERE potrero_id = $1 AND collar_id IS NOT NULL;
    `;
    const { rows } = await pool.query(checkQuery, [id]);
    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el potrero porque tiene collares activos asociados.' });
    }

    await pool.query('DELETE FROM potreros WHERE id = $1;', [id]);
    res.json({ success: true, message: `Potrero con ID ${id} eliminado con éxito.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. REGISTRO Y ADMINISTRACIÓN (Altas de datos)
// ==========================================

/**
 * GET /api/collares
 * Retorna todos los collares registrados.
 */
router.get('/collares', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, numero_sim, nivel_bateria, senal_celular, ultima_conexion, activo FROM collares;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/collares/:id/status
 * Habilita o deshabilita un collar físico.
 */
router.put('/collares/:id/status', async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const query = 'UPDATE collares SET activo = $1 WHERE id = $2 RETURNING *;';
    const { rows } = await pool.query(query, [activo, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Collar no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/propietarios
 * Retorna todos los propietarios registrados.
 */
router.get('/propietarios', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre, documento_identidad FROM propietarios;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/propietarios', async (req, res) => {
  const { nombre, documento, telefono, correo } = req.body;
  try {
    const query = `
      INSERT INTO propietarios (nombre, documento_identidad, telefono, correo)
      VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const { rows } = await pool.query(query, [nombre, documento, telefono, correo]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/collares', async (req, res) => {
  const { id, numeroSim, fechaInstalacion } = req.body;
  try {
    const query = `
      INSERT INTO collares (id, numero_sim, fecha_instalacion)
      VALUES ($1, $2, $3) RETURNING *;
    `;
    const { rows } = await pool.query(query, [id, numeroSim, fechaInstalacion]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/animales', async (req, res) => {
  const { collarId, propietarioId, potreroId, areteVisual, raza, categoria, fechaNacimiento } = req.body;

  const cleanCollarId = collarId && String(collarId).trim() !== '' ? String(collarId).trim() : null;
  const cleanPotreroId = potreroId && potreroId !== '' ? parseInt(potreroId, 10) : null;
  const cleanPropietarioId = propietarioId && propietarioId !== '' ? parseInt(propietarioId, 10) : null;

  try {
    // Validar si el collar ya está asignado a otro animal
    if (cleanCollarId) {
      const checkCollarQuery = `SELECT id, arete_visual FROM animales WHERE collar_id = $1;`;
      const { rows: existing } = await pool.query(checkCollarQuery, [cleanCollarId]);
      if (existing.length > 0) {
        return res.status(400).json({ 
          error: `El collar '${cleanCollarId}' ya se encuentra asignado a la res con arete '${existing[0].arete_visual}'.` 
        });
      }
    }

    const query = `
      INSERT INTO animales (collar_id, propietario_id, potrero_id, arete_visual, raza, categoria, fecha_nacimiento)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const { rows } = await pool.query(query, [cleanCollarId, cleanPropietarioId, cleanPotreroId, areteVisual, raza, categoria, fechaNacimiento]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[Post Animales Error]', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/pesajes', async (req, res) => {
  const { animalId, peso, fechaPesaje } = req.body;
  try {
    const query = `
      INSERT INTO registro_pesajes (animal_id, peso, fecha_pesaje)
      VALUES ($1, $2, COALESCE($3, CURRENT_DATE)) RETURNING *;
    `;
    const { rows } = await pool.query(query, [animalId, peso, fechaPesaje]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/rendimiento', async (req, res) => {
  const { raza, categoria, gdpPromedio, pesoAdulto, costoDiario, precioKg } = req.body;
  try {
    const query = `
      INSERT INTO parametros_rendimiento (raza, categoria, gdp_promedio, peso_adulto_esperado, costo_diario_manutencion, precio_mercado_por_kg)
      VALUES ($1, $2, $3, $4, $5, $6) 
      ON CONFLICT (raza, categoria) DO UPDATE 
      SET gdp_promedio = EXCLUDED.gdp_promedio, 
          peso_adulto_esperado = EXCLUDED.peso_adulto_esperado,
          costo_diario_manutencion = EXCLUDED.costo_diario_manutencion,
          precio_mercado_por_kg = EXCLUDED.precio_mercado_por_kg
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [raza, categoria, gdpPromedio, pesoAdulto, costoDiario, precioKg]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. MÓDULO DE PROYECCIONES FINANCIERAS
// ==========================================

/**
 * GET /api/proyecciones/:animalId
 * Calcula y compara el crecimiento proyectado y el beneficio financiero de una res.
 */
router.get('/proyecciones/:animalId', async (req, res) => {
  const animalId = req.params.animalId;

  try {
    // 1. Obtener la ficha del animal
    const animalQuery = `
      SELECT id, arete_visual, raza, categoria, fecha_nacimiento, (CURRENT_DATE - fecha_nacimiento) AS edad_dias 
      FROM animales 
      WHERE id = $1;
    `;
    const { rows: animalRows } = await pool.query(animalQuery, [animalId]);
    if (animalRows.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });
    const animal = animalRows[0];

    // 2. Obtener el peso más reciente registrado
    const pesoQuery = `
      SELECT peso, fecha_pesaje 
      FROM registro_pesajes 
      WHERE animal_id = $1 
      ORDER BY fecha_pesaje DESC, id DESC 
      LIMIT 1;
    `;
    const { rows: pesoRows } = await pool.query(pesoQuery, [animalId]);
    
    // Si no hay pesajes, asignamos un peso por defecto temporal (300kg)
    const pesoActual = pesoRows.length > 0 ? parseFloat(pesoRows[0].peso) : 300.00;

    // 3. Obtener los parámetros de referencia de rendimiento
    const rendimientoQuery = `
      SELECT gdp_promedio, peso_adulto_esperado, costo_diario_manutencion, precio_mercado_por_kg
      FROM parametros_rendimiento
      WHERE raza = $1 AND categoria = $2;
    `;
    const { rows: rendRows } = await pool.query(rendimientoQuery, [animal.raza, animal.categoria]);

    if (rendRows.length === 0) {
      return res.status(404).json({ 
        error: `No hay parámetros de rendimiento configurados para la combinación Raza: '${animal.raza}', Categoría: '${animal.categoria}'` 
      });
    }

    const { gdp_promedio, peso_adulto_esperado, costo_diario_manutencion, precio_mercado_por_kg } = rendRows[0];

    const gdp = parseFloat(gdp_promedio);
    const pesoMax = parseFloat(peso_adulto_esperado);
    const costoDia = parseFloat(costo_diario_manutencion);
    const precioKg = parseFloat(precio_mercado_por_kg);

    // 4. Calcular el historial de pesajes para el gráfico
    const historialQuery = `SELECT peso, fecha_pesaje FROM registro_pesajes WHERE animal_id = $1 ORDER BY fecha_pesaje ASC;`;
    const { rows: historial } = await pool.query(historialQuery, [animalId]);

    // 5. Proyectar ganancias a 30, 60, 90, 180 y 365 días
    const intervalos = [30, 60, 90, 180, 365];
    const proyecciones = intervalos.map(dias => {
      const pesoProyectado = Math.min(pesoActual + (dias * gdp), pesoMax);
      const costoAcumulado = dias * costoDia;
      
      const valorActual = pesoActual * precioKg;
      const valorProyectado = pesoProyectado * precioKg;
      
      const beneficioNeto = (valorProyectado - valorActual) - costoAcumulado;

      return {
        dias,
        pesoProyectado: parseFloat(pesoProyectado.toFixed(2)),
        costoAcumulado: parseFloat(costoAcumulado.toFixed(2)),
        valorProyectado: parseFloat(valorProyectado.toFixed(2)),
        beneficioNeto: parseFloat(beneficioNeto.toFixed(2)),
        rentable: beneficioNeto > 0
      };
    });

    res.json({
      animalId: animal.id,
      areteVisual: animal.arete_visual,
      raza: animal.raza,
      categoria: animal.categoria,
      edadActualDias: animal.edad_dias,
      pesoActual,
      precioPorKgMercado: precioKg,
      gdpPromedioDiario: gdp,
      historialPesajes: historial,
      proyecciones
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular la proyección financiera' });
  }
});

export default router;
