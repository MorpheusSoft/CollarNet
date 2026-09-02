import express from 'express';
import pool from '../config/db.js';
import { saveHato, savePotrero } from '../services/geofenceService.js';
import { publishToCollar } from '../services/mqttService.js';
import { extractGeofenceFromPDF } from '../services/aiService.js';
import { sendTelegramMessage, dispatchAlertNotification } from '../services/notificationService.js';
import multer from 'multer';
import crypto from 'crypto';

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
// 1. ENDPOINTS DE MONITOREO EN TIEMPO REAL (MULTI-TENANT)
// ==========================================

async function handleMonitoreoQuery(req, res) {
  const { tenantId, hatoId, propietarioId } = req.query;

  try {
    let whereClauses = [];
    let params = [];

    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      whereClauses.push(`a.tenant_id = $${params.length}`);
    }

    if (hatoId) {
      params.push(parseInt(hatoId, 10));
      whereClauses.push(`p.hato_id = $${params.length}`);
    }

    if (propietarioId) {
      params.push(parseInt(propietarioId, 10));
      whereClauses.push(`a.propietario_id = $${params.length}`);
    }

    whereClauses.push('COALESCE(a.activo, TRUE) = TRUE');

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.id,
        a.id AS animal_id,
        a.arete_visual,
        a.raza,
        a.categoria,
        a.sexo,
        a.foto_url,
        a.numero_hierro,
        a.madre_id,
        a.padre_id,
        a.tenant_id,
        t.nombre AS tenant_nombre,
        a.propietario_id,
        pr.nombre AS propietario_nombre,
        am.arete_visual AS arete_madre,
        ap.arete_visual AS arete_padre,
        a.fecha_nacimiento,
        (CURRENT_DATE - a.fecha_nacimiento) AS edad_dias,
        c.id AS collar_id,
        c.numero_sim,
        c.nivel_bateria,
        c.senal_celular,
        c.ultima_conexion,
        c.version_firmware,
        c.activo AS collar_activo,
        ST_Y(c.ultima_ubicacion) AS latitud,
        ST_X(c.ultima_ubicacion) AS longitud,
        p.id AS potrero_id,
        p.nombre AS potrero_nombre,
        p.nombre AS potrero_asignado_nombre,
        p.margen_advertencia_metros AS potrero_margen_advertencia,
        h.id AS hato_id,
        h.nombre AS hato_nombre,
        COALESCE((SELECT peso FROM registro_pesajes WHERE animal_id = a.id ORDER BY fecha_pesaje DESC LIMIT 1), 350.00) AS peso_actual,
        COALESCE(
          (SELECT tipo FROM alertas WHERE animal_id = a.id AND estado = 'ACTIVO' LIMIT 1),
          'NORMAL'
        ) AS estado_alerta,
        CASE 
          WHEN h.id IS NOT NULL AND c.ultima_ubicacion IS NOT NULL AND NOT ST_Contains(h.perimetro, c.ultima_ubicacion) THEN 'FUERA'
          WHEN p.id IS NOT NULL AND c.ultima_ubicacion IS NOT NULL AND NOT ST_Contains(p.perimetro, c.ultima_ubicacion) THEN 'ADVERTENCIA'
          ELSE 'DENTRO'
        END AS estado_cerca
      FROM animales a
      INNER JOIN collares c ON a.collar_id = c.id
      LEFT JOIN tenants t ON a.tenant_id = t.id
      LEFT JOIN propietarios pr ON a.propietario_id = pr.id
      LEFT JOIN potreros p ON a.potrero_id = p.id
      LEFT JOIN hatos h ON p.hato_id = h.id
      LEFT JOIN animales am ON a.madre_id = am.id
      LEFT JOIN animales ap ON a.padre_id = ap.id
      ${whereSQL}
      ORDER BY a.id ASC;
    `;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[Monitoreo Error]', err);
    res.status(500).json({ error: 'Error al obtener datos de monitoreo' });
  }
}

router.get('/animales/monitoreo', handleMonitoreoQuery);
router.get('/monitoreo', handleMonitoreoQuery);

/**
 * GET /api/animales/:id/genealogia
 * Retorna el árbol genealógico biológico (padres, abuelos) y la descendencia (crías) del animal.
 */
router.get('/animales/:id/genealogia', async (req, res) => {
  const { id } = req.params;
  try {
    const animalQuery = `
      SELECT 
        a.id, a.arete_visual, a.raza, a.categoria, a.sexo, a.fecha_nacimiento, a.numero_hierro, a.foto_url,
        -- Madre
        m.id AS madre_id, m.arete_visual AS arete_madre, m.raza AS raza_madre,
        -- Padre
        p.id AS padre_id, p.arete_visual AS arete_padre, p.raza AS raza_padre,
        -- Abuelos Paternos
        app.id AS abuelo_paterno_id, app.arete_visual AS arete_abuelo_paterno,
        apm.id AS abuela_paterna_id, apm.arete_visual AS arete_abuela_paterna,
        -- Abuelos Maternos
        amp.id AS abuelo_materno_id, amp.arete_visual AS arete_abuelo_materno,
        amm.id AS abuela_materna_id, amm.arete_visual AS arete_abuela_materna
      FROM animales a
      LEFT JOIN animales m ON a.madre_id = m.id
      LEFT JOIN animales p ON a.padre_id = p.id
      LEFT JOIN animales app ON p.padre_id = app.id
      LEFT JOIN animales apm ON p.madre_id = apm.id
      LEFT JOIN animales amp ON m.padre_id = amp.id
      LEFT JOIN animales amm ON m.madre_id = amm.id
      WHERE a.id = $1;
    `;
    const { rows: animalRows } = await pool.query(animalQuery, [id]);
    if (animalRows.length === 0) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    // Consultar Descendencia / Crías (hijos donde este animal es madre o padre)
    const criasQuery = `
      SELECT 
        c.id, c.arete_visual, c.raza, c.categoria, c.sexo, c.fecha_nacimiento, c.collar_id,
        CASE WHEN c.madre_id = $1 THEN 'Hijo/a (Vientre Propio)' ELSE 'Hijo/a (Descendencia Toro)' END AS relacion_tipo
      FROM animales c
      WHERE c.madre_id = $1 OR c.padre_id = $1
      ORDER BY c.fecha_nacimiento DESC;
    `;
    const { rows: criasRows } = await pool.query(criasQuery, [id]);

    const a = animalRows[0];
    res.json({
      animal: {
        id: a.id,
        areteVisual: a.arete_visual,
        raza: a.raza,
        categoria: a.categoria,
        sexo: a.sexo,
        fechaNacimiento: a.fecha_nacimiento,
        numeroHierro: a.numero_hierro,
        fotoUrl: a.foto_url
      },
      padres: {
        madre: a.madre_id ? { id: a.madre_id, areteVisual: a.arete_madre, raza: a.raza_madre } : null,
        padre: a.padre_id ? { id: a.padre_id, areteVisual: a.arete_padre, raza: a.raza_padre } : null
      },
      abuelos: {
        paternos: {
          abuelo: a.abuelo_paterno_id ? { id: a.abuelo_paterno_id, areteVisual: a.arete_abuelo_paterno } : null,
          abuela: a.abuela_paterna_id ? { id: a.abuela_paterna_id, areteVisual: a.arete_abuela_paterna } : null
        },
        maternos: {
          abuelo: a.abuelo_materno_id ? { id: a.abuelo_materno_id, areteVisual: a.arete_abuelo_materno } : null,
          abuela: a.abuela_materna_id ? { id: a.abuela_materna_id, areteVisual: a.arete_abuela_materna } : null
        }
      },
      descendencia: criasRows
    });
  } catch (err) {
    console.error('[Genealogía Animal Error]', err);
    res.status(500).json({ error: err.message });
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

    // 2. Obtener coordenadas y margen de advertencia del Potrero
    const potreroQuery = `SELECT nombre, margen_advertencia_metros, ST_AsGeoJSON(perimetro) as geojson FROM potreros WHERE id = $1;`;
    const { rows: potreroRows } = await pool.query(potreroQuery, [potreroId]);
    if (potreroRows.length === 0) return res.status(404).json({ error: 'Potrero no encontrado' });

    const hatoVertices = extractVerticesFromGeoJSON(hatoRows[0].geojson);
    const potreroVertices = extractVerticesFromGeoJSON(potreroRows[0].geojson);
    const margenAdvertencia = parseFloat(potreroRows[0].margen_advertencia_metros) || 10;

    // 3. Formatear payload comprimido para 2G / ESP32
    const payload = {
      h_id: parseInt(hatoId, 10),
      h_v: flattenCoordinates(hatoVertices),
      p_id: parseInt(potreroId, 10),
      p_v: flattenCoordinates(potreroVertices),
      t_w: margenAdvertencia // Umbral de alerta dinámico en metros según potrero
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
 * Crea o actualiza un Hato vinculado a un Tenant/Adquirente.
 */
router.post('/geocercas/hato', async (req, res) => {
  const { id, nombre, vertices, tenantId } = req.body;
  try {
    const hato = await saveHato(id, nombre, vertices, tenantId ? parseInt(tenantId, 10) : 1);
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
  const { id, hatoId, nombre, vertices, capacidad, margenAdvertencia } = req.body;
  try {
    const potrero = await savePotrero(id, hatoId, nombre, vertices, capacidad, margenAdvertencia);
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
/**
 * GET /api/geocercas
 * Retorna todos los Hatos y Potreros consolidados (con filtro opcional por tenantId)
 */
router.get('/geocercas', async (req, res) => {
  const { tenantId } = req.query;
  try {
    let hatosQuery = 'SELECT id, nombre, tenant_id, ST_AsGeoJSON(perimetro) AS geojson FROM hatos';
    let hatosParams = [];
    if (tenantId) {
      hatosParams.push(parseInt(tenantId, 10));
      hatosQuery += ' WHERE tenant_id = $1';
    }
    const { rows: hatos } = await pool.query(hatosQuery, hatosParams);

    let potrerosQuery = `
      SELECT p.id, p.hato_id, p.nombre, p.capacidad_max_cabezas, p.margen_advertencia_metros, ST_AsGeoJSON(p.perimetro) AS geojson 
      FROM potreros p
      INNER JOIN hatos h ON p.hato_id = h.id
    `;
    let potrerosParams = [];
    if (tenantId) {
      potrerosParams.push(parseInt(tenantId, 10));
      potrerosQuery += ' WHERE h.tenant_id = $1';
    }
    const { rows: potreros } = await pool.query(potrerosQuery, potrerosParams);

    res.json({ hatos, potreros });
  } catch (err) {
    console.error('[Geocercas Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/geocercas/hatos
 * Retorna todos los Hatos creados, incluyendo su representación GeoJSON.
 */
router.get('/geocercas/hatos', async (req, res) => {
  const { tenantId } = req.query;
  try {
    let query = 'SELECT id, nombre, tenant_id, ST_AsGeoJSON(perimetro) AS geojson FROM hatos';
    let params = [];
    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      query += ' WHERE tenant_id = $1';
    }
    const { rows } = await pool.query(query, params);
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
    const { rows } = await pool.query('SELECT id, hato_id, nombre, capacidad_max_cabezas, margen_advertencia_metros, ST_AsGeoJSON(perimetro) AS geojson FROM potreros;');
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
// 3. MÓDULO DE ADQUIRENTES / TENANTS (SAAS)
// ==========================================

/**
 * GET /api/tenants
 * Retorna todos los adquirentes/empresas con métricas de uso agregadas.
 */
router.get('/tenants', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.nombre,
        t.identificacion_fiscal,
        t.contacto_nombre,
        t.telefono,
        t.email,
        t.direccion,
        t.plan_suscripcion,
        t.limite_collares,
        t.limite_hatos,
        t.permite_crear_potreros,
        t.activo,
        t.creado_en,
        COUNT(DISTINCT h.id) AS total_hatos,
        COUNT(DISTINCT c.id) AS total_collares,
        COUNT(DISTINCT a.id) AS total_animales,
        COUNT(DISTINCT u.id) AS total_usuarios
      FROM tenants t
      LEFT JOIN hatos h ON h.tenant_id = t.id
      LEFT JOIN collares c ON c.tenant_id = t.id
      LEFT JOIN animales a ON a.tenant_id = t.id
      LEFT JOIN usuarios u ON u.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.id ASC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('[Tenants Error]', err);
    res.status(500).json({ error: 'Error al obtener adquirentes' });
  }
});

/**
 * POST /api/tenants
 * Registra un nuevo Adquirente / Empresa Ganadera (Solo SuperAdmin)
 */
router.post('/tenants', async (req, res) => {
  const { 
    nombre, 
    identificacionFiscal, 
    contactoNombre, 
    telefono, 
    email, 
    direccion, 
    planSuscripcion, 
    limiteCollares, 
    limiteHatos,
    permiteCrearPotreros
  } = req.body;

  if (!nombre || !identificacionFiscal || !email) {
    return res.status(400).json({ error: 'Nombre, RIF/Identificación y Correo son obligatorios' });
  }

  try {
    const query = `
      INSERT INTO tenants (
        nombre, 
        identificacion_fiscal, 
        contacto_nombre, 
        telefono, 
        email, 
        direccion, 
        plan_suscripcion, 
        limite_collares, 
        limite_hatos,
        permite_crear_potreros
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      nombre.trim(),
      identificacionFiscal.trim(),
      contactoNombre ? contactoNombre.trim() : null,
      telefono ? telefono.trim() : null,
      email.trim().toLowerCase(),
      direccion ? direccion.trim() : null,
      planSuscripcion || 'PRO',
      parseInt(limiteCollares, 10) || 100,
      parseInt(limiteHatos, 10) || 10,
      permiteCrearPotreros !== undefined ? Boolean(permiteCrearPotreros) : true
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json({ success: true, tenant: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una empresa registrada con ese RIF o Correo electrónico.' });
    }
    console.error('[Create Tenant Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/tenants/:id
 * Actualiza los datos de un adquirente
 */
router.put('/tenants/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, 
    identificacionFiscal, 
    contactoNombre, 
    telefono, 
    email, 
    direccion, 
    planSuscripcion, 
    limiteCollares, 
    limiteHatos,
    permiteCrearPotreros,
    activo 
  } = req.body;

  try {
    const query = `
      UPDATE tenants SET
        nombre = COALESCE($1, nombre),
        identificacion_fiscal = COALESCE($2, identificacion_fiscal),
        contacto_nombre = COALESCE($3, contacto_nombre),
        telefono = COALESCE($4, telefono),
        email = COALESCE($5, email),
        direccion = COALESCE($6, direccion),
        plan_suscripcion = COALESCE($7, plan_suscripcion),
        limite_collares = COALESCE($8, limite_collares),
        limite_hatos = COALESCE($9, limite_hatos),
        permite_crear_potreros = COALESCE($10, permite_crear_potreros),
        activo = COALESCE($11, activo)
      WHERE id = $12
      RETURNING *;
    `;
    const values = [
      nombre,
      identificacionFiscal,
      contactoNombre,
      telefono,
      email,
      direccion,
      planSuscripcion,
      limiteCollares,
      limiteHatos,
      permiteCrearPotreros !== undefined ? Boolean(permiteCrearPotreros) : null,
      activo,
      id
    ];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: 'Adquirente no encontrado' });
    res.json({ success: true, tenant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/tenants/:id/status
 * Activa o desactiva un Adquirente
 */
router.patch('/tenants/:id/status', async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const { rows } = await pool.query('UPDATE tenants SET activo = $1 WHERE id = $2 RETURNING *;', [activo, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Adquirente no encontrado' });
    res.json({ success: true, tenant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tenants/:id/hatos
 * Retorna todos los hatos de un adquirente específico
 */
router.get('/tenants/:id/hatos', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        h.id, 
        h.nombre, 
        h.tenant_id,
        ST_AsGeoJSON(h.perimetro) as geojson, 
        h.creado_en,
        COUNT(DISTINCT p.id) AS total_potreros,
        COUNT(DISTINCT a.id) AS total_animales
      FROM hatos h
      LEFT JOIN potreros p ON p.hato_id = h.id
      LEFT JOIN animales a ON a.potrero_id = p.id
      WHERE h.tenant_id = $1
      GROUP BY h.id
      ORDER BY h.id ASC;
    `;
    const { rows } = await pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. MÓDULO DE INVENTARIO Y CICLO DE VIDA DE COLLARES (COWIA IOT)
// ==========================================

/**
 * GET /api/collares/inventario
 * Retorna el inventario detallado de collares con filtros y control de acceso estricto por rol.
 */
router.get('/collares/inventario', async (req, res) => {
  const userRole = req.headers['x-user-role'] || req.query.userRole || 'SUPERADMIN';
  const userTenantId = req.headers['x-user-tenant-id'] || req.query.userTenantId;
  const { estado, loteId, tenantId, search, bateriaMin, bateriaMax } = req.query;

  // 1. Control de Acceso: Solo Administradores
  if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN_FINCA') {
    return res.status(403).json({ error: 'Acceso restringido: Solo los administradores pueden consultar el inventario de collares.' });
  }

  try {
    let whereClauses = [];
    let params = [];

    // 2. Restricción por Rol:
    // Si es ADMIN_FINCA, está forzado estrictamente a ver SOLO los collares asignados a su finca/adquiriente
    if (userRole === 'ADMIN_FINCA') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Falta especificar el identificador de la finca/tenant del administrador.' });
      }
      params.push(parseInt(userTenantId, 10));
      whereClauses.push(`c.tenant_id = $${params.length}`);
    } else if (userRole === 'SUPERADMIN' && tenantId) {
      if (tenantId === 'CENTRAL') {
        whereClauses.push(`c.tenant_id IS NULL`);
      } else {
        params.push(parseInt(tenantId, 10));
        whereClauses.push(`c.tenant_id = $${params.length}`);
      }
    }

    // 3. Filtro por Estado de Ciclo de Vida
    if (estado && estado !== 'TODOS') {
      params.push(estado);
      whereClauses.push(`c.estado = $${params.length}`);
    }

    // 4. Filtro por Lote de Hardware
    if (loteId && loteId !== 'TODOS') {
      params.push(parseInt(loteId, 10));
      whereClauses.push(`c.lote_id = $${params.length}`);
    }

    // 5. Filtro por Nivel de Batería
    if (bateriaMin) {
      params.push(parseInt(bateriaMin, 10));
      whereClauses.push(`c.nivel_bateria >= $${params.length}`);
    }
    if (bateriaMax) {
      params.push(parseInt(bateriaMax, 10));
      whereClauses.push(`c.nivel_bateria <= $${params.length}`);
    }

    // 6. Búsqueda por Texto (ID, IMEI, SIM, Serie, Arete)
    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      whereClauses.push(`(
        LOWER(c.id) LIKE $${pIdx} OR 
        LOWER(COALESCE(c.imei, '')) LIKE $${pIdx} OR 
        LOWER(c.numero_sim) LIKE $${pIdx} OR 
        LOWER(COALESCE(c.numero_serie, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(a.arete_visual, '')) LIKE $${pIdx}
      )`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        c.id,
        c.numero_sim,
        c.imei,
        c.mac_address,
        c.numero_serie,
        COALESCE(c.estado, 'EN_ALMACEN') AS estado,
        c.lote_id,
        l.codigo_lote AS lote_codigo,
        l.proveedor AS lote_proveedor,
        c.tenant_id,
        t.nombre AS tenant_nombre,
        c.ubicacion_almacen,
        c.motivo_estado,
        c.nivel_bateria,
        c.senal_celular,
        c.ultima_conexion,
        c.fecha_instalacion,
        c.version_firmware,
        c.activo,
        c.creado_en,
        ST_Y(c.ultima_ubicacion) AS latitud,
        ST_X(c.ultima_ubicacion) AS longitud,
        a.id AS animal_id,
        a.arete_visual AS animal_arete,
        a.raza AS animal_raza,
        a.categoria AS animal_categoria,
        p.id AS potrero_id,
        p.nombre AS potrero_nombre,
        h.id AS hato_id,
        h.nombre AS hato_nombre
      FROM collares c
      LEFT JOIN lotes_collares l ON c.lote_id = l.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      LEFT JOIN animales a ON a.collar_id = c.id
      LEFT JOIN potreros p ON a.potrero_id = p.id
      LEFT JOIN hatos h ON p.hato_id = h.id
      ${whereSQL}
      ORDER BY c.creado_en DESC, c.id ASC;
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[Collares Inventario Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/collares/kpis
 * Retorna las métricas cuantitativas consolidadas del stock de collares.
 */
router.get('/collares/kpis', async (req, res) => {
  const userRole = req.headers['x-user-role'] || req.query.userRole || 'SUPERADMIN';
  const userTenantId = req.headers['x-user-tenant-id'] || req.query.userTenantId;

  if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN_FINCA') {
    return res.status(403).json({ error: 'Acceso restringido: Solo administradores pueden ver KPIs de inventario.' });
  }

  try {
    let whereSQL = '';
    let params = [];

    if (userRole === 'ADMIN_FINCA') {
      if (!userTenantId) {
        return res.status(400).json({ error: 'Falta especificar el identificador de la finca/tenant.' });
      }
      params.push(parseInt(userTenantId, 10));
      whereSQL = 'WHERE c.tenant_id = $1';
    }

    const query = `
      SELECT 
        COUNT(*)::INT AS total,
        COUNT(CASE WHEN COALESCE(c.estado, 'EN_ALMACEN') = 'EN_ALMACEN' THEN 1 END)::INT AS en_almacen,
        COUNT(CASE WHEN c.estado = 'ACTIVO' THEN 1 END)::INT AS activos,
        COUNT(CASE WHEN c.estado = 'EN_REVISION' THEN 1 END)::INT AS en_revision,
        COUNT(CASE WHEN c.estado = 'DESACTIVADO' THEN 1 END)::INT AS desactivados,
        COUNT(CASE WHEN c.estado = 'EN_TRANSITO' THEN 1 END)::INT AS en_transito,
        COUNT(CASE WHEN c.estado = 'DE_BAJA' THEN 1 END)::INT AS de_baja,
        COUNT(CASE WHEN c.nivel_bateria IS NOT NULL AND c.nivel_bateria < 25 THEN 1 END)::INT AS bateria_baja,
        COUNT(CASE WHEN c.tenant_id IS NULL THEN 1 END)::INT AS stock_central
      FROM collares c
      ${whereSQL};
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows[0] || {});
  } catch (err) {
    console.error('[Collares KPIs Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/collares/lotes
 * Retorna todos los lotes de collares registrados con métricas agregadas.
 */
router.get('/collares/lotes', async (req, res) => {
  try {
    const query = `
      SELECT 
        l.id,
        l.codigo_lote,
        l.proveedor,
        l.fecha_recepcion,
        l.cantidad_total,
        l.version_hardware,
        l.version_firmware_inicial,
        l.tenant_id,
        t.nombre AS tenant_nombre,
        l.notas,
        l.creado_en,
        COUNT(c.id)::INT AS collares_registrados,
        COUNT(CASE WHEN c.estado = 'ACTIVO' THEN 1 END)::INT AS collares_activos,
        COUNT(CASE WHEN c.estado = 'EN_ALMACEN' THEN 1 END)::INT AS collares_en_almacen,
        COUNT(CASE WHEN c.estado = 'EN_REVISION' THEN 1 END)::INT AS collares_en_revision
      FROM lotes_collares l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      LEFT JOIN collares c ON c.lote_id = l.id
      GROUP BY l.id, t.nombre
      ORDER BY l.fecha_recepcion DESC, l.id DESC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/collares/individual
 * Registro individual de un único collar (Exclusivo SUPERADMIN).
 */
router.post('/collares/individual', async (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'SUPERADMIN';
  if (userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Solo el SUPERADMIN puede registrar nuevos collares en la plataforma CowIA.' });
  }

  const {
    id,
    numeroSim,
    imei,
    macAddress,
    numeroSerie,
    loteId,
    tenantId,
    ubicacionAlmacen,
    versionHardware,
    versionFirmware,
    motivoEstado,
    usuarioId
  } = req.body;

  if (!id || !numeroSim) {
    return res.status(400).json({ error: 'El ID del collar y el Número SIM son obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cleanId = String(id).trim().toUpperCase();
    const cleanSim = String(numeroSim).trim();
    const cleanImei = imei && String(imei).trim() !== '' ? String(imei).trim() : null;
    const cleanLoteId = loteId ? parseInt(loteId, 10) : null;
    const cleanTenantId = tenantId ? parseInt(tenantId, 10) : null;
    const estadoInicial = cleanTenantId ? 'DESACTIVADO' : 'EN_ALMACEN';

    const insertCollarSQL = `
      INSERT INTO collares (
        id, numero_sim, imei, mac_address, numero_serie, estado, 
        lote_id, tenant_id, ubicacion_almacen, motivo_estado, 
        version_firmware, fecha_instalacion, nivel_bateria, senal_celular
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE, 100, 5)
      RETURNING *;
    `;

    const { rows: collarRows } = await client.query(insertCollarSQL, [
      cleanId,
      cleanSim,
      cleanImei,
      macAddress || null,
      numeroSerie || null,
      estadoInicial,
      cleanLoteId,
      cleanTenantId,
      ubicacionAlmacen || 'Almacén Central CowIA',
      motivoEstado || 'Registro individual inicial',
      versionFirmware || '1.0.0'
    ]);

    // Registrar en Historial de Auditoría
    const insertHistorySQL = `
      INSERT INTO historial_collares (
        collar_id, estado_anterior, estado_nuevo, tenant_id_nuevo, usuario_id, motivo
      )
      VALUES ($1, NULL, $2, $3, $4, $5);
    `;
    await client.query(insertHistorySQL, [
      cleanId,
      estadoInicial,
      cleanTenantId,
      usuarioId ? parseInt(usuarioId, 10) : null,
      'Alta individual en inventario CowIA'
    ]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, collar: collarRows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Registro Individual Collar Error]', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/collares/lotes
 * Registro y recepción masiva de lotes de collares (ej. 200 collares en 1 clic). (Exclusivo SUPERADMIN).
 */
router.post('/collares/lotes', async (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'SUPERADMIN';
  if (userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Solo el SUPERADMIN puede registrar lotes de collares en CowIA.' });
  }

  const {
    codigoLote,
    proveedor,
    fechaRecepcion,
    versionHardware,
    versionFirmwareInicial,
    tenantId,
    ubicacionAlmacen,
    notas,
    usuarioId,
    modo, // 'secuencial' o 'lista'
    // Modo Secuencial:
    cantidadTotal,
    prefijoId,
    rangoInicio,
    rangoFin,
    simPrefijo,
    imeiPrefijo,
    // Modo Lista:
    items
  } = req.body;

  if (!codigoLote || !proveedor) {
    return res.status(400).json({ error: 'Código de lote y proveedor son campos obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let collaresToInsert = [];
    const cleanTenantId = tenantId ? parseInt(tenantId, 10) : null;
    const estadoInicial = cleanTenantId ? 'DESACTIVADO' : 'EN_ALMACEN';
    const ubicacion = ubicacionAlmacen || 'Almacén Central CowIA';
    const fw = versionFirmwareInicial || '1.0.0';

    if (modo === 'secuencial') {
      const start = parseInt(rangoInicio || 1, 10);
      const total = parseInt(cantidadTotal || (parseInt(rangoFin, 10) - start + 1), 10);
      const end = rangoFin ? parseInt(rangoFin, 10) : (start + total - 1);
      const prefix = prefijoId ? String(prefijoId).trim() : 'COW-';
      const batchSeed = Date.now().toString().slice(-5);
      const simBase = simPrefijo ? String(simPrefijo).trim() : `58412${batchSeed}`;
      const imeiBase = imeiPrefijo ? String(imeiPrefijo).trim() : `860${batchSeed}`;

      for (let i = start; i <= end; i++) {
        const numStr = String(i).padStart(4, '0');
        const collarId = `${prefix}${numStr}`;
        const simNum = `${simBase}${String(i).padStart(4, '0')}`;
        const imeiNum = `${imeiBase}${String(i).padStart(6, '0')}`;
        const serieNum = `SN-${codigoLote}-${numStr}`;

        collaresToInsert.push({
          id: collarId,
          numeroSim: simNum,
          imei: imeiNum,
          numeroSerie: serieNum,
          macAddress: null
        });
      }
    } else if (modo === 'lista' && Array.isArray(items) && items.length > 0) {
      collaresToInsert = items.map((item, idx) => ({
        id: String(item.id || `COW-LOT-${idx + 1}`).trim().toUpperCase(),
        numeroSim: String(item.numeroSim || `SIM-${Date.now()}-${idx}`).trim(),
        imei: item.imei ? String(item.imei).trim() : null,
        numeroSerie: item.numeroSerie ? String(item.numeroSerie).trim() : null,
        macAddress: item.macAddress ? String(item.macAddress).trim() : null
      }));
    } else {
      throw new Error('Debes proporcionar los parámetros secuenciales o una lista válida de collares.');
    }

    // 1. Insertar Registro del Lote
    const insertLoteSQL = `
      INSERT INTO lotes_collares (
        codigo_lote, proveedor, fecha_recepcion, cantidad_total,
        version_hardware, version_firmware_inicial, tenant_id, notas
      )
      VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows: loteRows } = await client.query(insertLoteSQL, [
      String(codigoLote).trim().toUpperCase(),
      String(proveedor).trim(),
      fechaRecepcion || null,
      collaresToInsert.length,
      versionHardware || 'HW-v2.0',
      fw,
      cleanTenantId,
      notas || null
    ]);
    const nuevoLote = loteRows[0];

    // 2. Inserción de todos los collares del lote
    for (const c of collaresToInsert) {
      const insertCollarSQL = `
        INSERT INTO collares (
          id, numero_sim, imei, mac_address, numero_serie, estado,
          lote_id, tenant_id, ubicacion_almacen, motivo_estado,
          version_firmware, fecha_instalacion, nivel_bateria, senal_celular
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE, 100, 5)
        ON CONFLICT (id) DO UPDATE SET
          numero_sim = EXCLUDED.numero_sim,
          imei = EXCLUDED.imei,
          lote_id = EXCLUDED.lote_id,
          estado = EXCLUDED.estado,
          tenant_id = EXCLUDED.tenant_id,
          version_firmware = EXCLUDED.version_firmware;
      `;
      await client.query(insertCollarSQL, [
        c.id,
        c.numeroSim,
        c.imei,
        c.macAddress,
        c.numeroSerie,
        estadoInicial,
        nuevoLote.id,
        cleanTenantId,
        ubicacion,
        `Ingreso masivo con Lote ${nuevoLote.codigo_lote}`,
        fw
      ]);

      // Auditoría
      await client.query(`
        INSERT INTO historial_collares (
          collar_id, estado_anterior, estado_nuevo, tenant_id_nuevo, usuario_id, motivo
        )
        VALUES ($1, NULL, $2, $3, $4, $5);
      `, [
        c.id,
        estadoInicial,
        cleanTenantId,
        usuarioId ? parseInt(usuarioId, 10) : null,
        `Recepción en lote ${nuevoLote.codigo_lote}`
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: `Se importó exitosamente el lote ${nuevoLote.codigo_lote} con ${collaresToInsert.length} collares.`,
      lote: nuevoLote,
      totalProcesados: collaresToInsert.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Carga Lote Collares Error]', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/collares/:id/traslado
 * Traslada o asigna un collar hacia una finca/adquiriente o de regreso a Almacén Central (Exclusivo SUPERADMIN).
 */
router.patch('/collares/:id/traslado', async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'SUPERADMIN';
  if (userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Solo el SUPERADMIN tiene autorización para realizar traslados de collares entre adquirentes.' });
  }

  const { tenantId, ubicacionAlmacen, motivo, usuarioId } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener estado y tenant actual
    const check = await client.query('SELECT * FROM collares WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Collar no encontrado.' });
    }
    const collarActual = check.rows[0];

    const nuevoTenantId = tenantId && tenantId !== 'CENTRAL' ? parseInt(tenantId, 10) : null;
    const nuevoEstado = nuevoTenantId ? (collarActual.estado === 'ACTIVO' ? 'ACTIVO' : 'DESACTIVADO') : 'EN_ALMACEN';
    const nuevaUbicacion = ubicacionAlmacen || (nuevoTenantId ? 'En Adquiriente/Finca' : 'Almacén Central CowIA');

    const updateSQL = `
      UPDATE collares 
      SET 
        tenant_id = $1,
        estado = $2,
        ubicacion_almacen = $3,
        motivo_estado = $4
      WHERE id = $5
      RETURNING *;
    `;
    const { rows: updated } = await client.query(updateSQL, [
      nuevoTenantId,
      nuevoEstado,
      nuevaUbicacion,
      motivo || 'Traslado de hardware realizado por Administrador',
      id
    ]);

    // Auditoría
    await client.query(`
      INSERT INTO historial_collares (
        collar_id, estado_anterior, estado_nuevo, tenant_id_anterior, tenant_id_nuevo, usuario_id, motivo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [
      id,
      collarActual.estado,
      nuevoEstado,
      collarActual.tenant_id,
      nuevoTenantId,
      usuarioId ? parseInt(usuarioId, 10) : null,
      motivo || 'Traslado de asignación de hardware'
    ]);

    await client.query('COMMIT');
    res.json({ success: true, collar: updated[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Traslado Collar Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/collares/:id/estado
 * Cambia el estado del ciclo de vida de un collar (con auditoría).
 */
router.patch('/collares/:id/estado', async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'SUPERADMIN';
  const userTenantId = req.headers['x-user-tenant-id'] || req.body.userTenantId;
  const { nuevoEstado, motivo, usuarioId } = req.body;

  const validEstados = ['EN_ALMACEN', 'ACTIVO', 'EN_REVISION', 'DESACTIVADO', 'EN_TRANSITO', 'DE_BAJA'];
  if (!validEstados.includes(nuevoEstado)) {
    return res.status(400).json({ error: `Estado inválido. Estados permitidos: ${validEstados.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const check = await client.query('SELECT * FROM collares WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Collar no encontrado.' });
    }
    const collar = check.rows[0];

    // Validación de permisos según rol:
    if (userRole === 'ADMIN_FINCA') {
      if (collar.tenant_id !== parseInt(userTenantId, 10)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No tienes permiso para modificar un collar que no pertenece a tu finca.' });
      }
      // ADMIN_FINCA solo puede reportar para revisión o poner en reserva local (DESACTIVADO / ACTIVO)
      if (['EN_ALMACEN', 'EN_TRANSITO', 'DE_BAJA'].includes(nuevoEstado)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Los administradores de finca no pueden dar de baja ni transferir al almacén central. Debes solicitarlo al Administrador CowIA.' });
      }
    }

    // Si pasa a REVISION, DE_BAJA o EN_ALMACEN, desvincular del animal
    let animalIdAnterior = null;
    if (['EN_REVISION', 'DE_BAJA', 'EN_ALMACEN'].includes(nuevoEstado)) {
      const checkAnimal = await client.query('SELECT id FROM animales WHERE collar_id = $1', [id]);
      if (checkAnimal.rows.length > 0) {
        animalIdAnterior = checkAnimal.rows[0].id;
        await client.query('UPDATE animales SET collar_id = NULL WHERE collar_id = $1', [id]);
      }
    }

    const updateSQL = `
      UPDATE collares 
      SET 
        estado = $1,
        motivo_estado = $2
      WHERE id = $3
      RETURNING *;
    `;
    const { rows: updated } = await client.query(updateSQL, [
      nuevoEstado,
      motivo || 'Actualización de estado operativo',
      id
    ]);

    // Registrar en Historial
    await client.query(`
      INSERT INTO historial_collares (
        collar_id, estado_anterior, estado_nuevo, animal_id_anterior, usuario_id, motivo
      )
      VALUES ($1, $2, $3, $4, $5, $6);
    `, [
      id,
      collar.estado,
      nuevoEstado,
      animalIdAnterior,
      usuarioId ? parseInt(usuarioId, 10) : null,
      motivo || `Cambio de estado a ${nuevoEstado}`
    ]);

    await client.query('COMMIT');
    res.json({ success: true, collar: updated[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Cambio Estado Collar Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/collares/:id/historial
 * Retorna la bitácora completa de movimientos y auditoría de un collar.
 */
router.get('/collares/:id/historial', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        h.id,
        h.collar_id,
        h.estado_anterior,
        h.estado_nuevo,
        h.tenant_id_anterior,
        ta.nombre AS tenant_anterior_nombre,
        h.tenant_id_nuevo,
        tn.nombre AS tenant_nuevo_nombre,
        h.animal_id_anterior,
        aa.arete_visual AS arete_anterior,
        h.animal_id_nuevo,
        an.arete_visual AS arete_nuevo,
        h.usuario_id,
        u.nombre AS usuario_nombre,
        h.motivo,
        h.fecha_cambio
      FROM historial_collares h
      LEFT JOIN tenants ta ON h.tenant_id_anterior = ta.id
      LEFT JOIN tenants tn ON h.tenant_id_nuevo = tn.id
      LEFT JOIN animales aa ON h.animal_id_anterior = aa.id
      LEFT JOIN animales an ON h.animal_id_nuevo = an.id
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.collar_id = $1
      ORDER BY h.fecha_cambio DESC;
    `;
    const { rows } = await pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/collares
 * Endpoint de compatibilidad (listado simple).
 */
router.get('/collares', async (req, res) => {
  const { tenantId, estado } = req.query;
  try {
    let query = 'SELECT id, tenant_id, COALESCE(estado, \'EN_ALMACEN\') AS estado, numero_sim, imei, nivel_bateria, senal_celular, ultima_conexion, version_firmware, activo FROM collares';
    let params = [];
    let where = [];
    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      where.push(`tenant_id = $${params.length}`);
    }
    if (estado) {
      params.push(estado);
      where.push(`estado = $${params.length}`);
    }
    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }
    query += ' ORDER BY id ASC;';
    const { rows } = await pool.query(query, params);
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
    const { rows } = await pool.query('SELECT id, nombre, documento_identidad, telefono, correo FROM propietarios ORDER BY nombre ASC;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/propietarios/:id/portfolio
 * Retorna el portafolio consolidado de animales de un propietario en todos los hatos y adquirentes
 */
router.get('/propietarios/:id/portfolio', async (req, res) => {
  const { id } = req.params;
  try {
    const propQuery = `SELECT * FROM propietarios WHERE id = $1;`;
    const { rows: propRows } = await pool.query(propQuery, [id]);
    if (propRows.length === 0) return res.status(404).json({ error: 'Propietario no encontrado' });

    const query = `
      SELECT 
        a.id AS animal_id,
        a.arete_visual,
        a.raza,
        a.categoria,
        a.sexo,
        t.id AS tenant_id,
        t.nombre AS tenant_nombre,
        h.id AS hato_id,
        h.nombre AS hato_nombre,
        p.id AS potrero_id,
        p.nombre AS potrero_nombre,
        c.id AS collar_id,
        c.nivel_bateria,
        c.senal_celular,
        c.ultima_conexion,
        ST_Y(c.ultima_ubicacion) AS latitud,
        ST_X(c.ultima_ubicacion) AS longitud,
        COALESCE((SELECT peso FROM registro_pesajes WHERE animal_id = a.id ORDER BY fecha_pesaje DESC LIMIT 1), 350.00) AS ultimo_peso
      FROM animales a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      LEFT JOIN potreros p ON a.potrero_id = p.id
      LEFT JOIN hatos h ON p.hato_id = h.id
      LEFT JOIN collares c ON a.collar_id = c.id
      WHERE a.propietario_id = $1
      ORDER BY a.id ASC;
    `;
    const { rows: animales } = await pool.query(query, [id]);
    res.json({
      propietario: propRows[0],
      totalAnimales: animales.length,
      animales
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/propietarios/:id/hatos
 * Retorna todos los hatos y empresas donde el propietario tiene reses
 */
router.get('/propietarios/:id/hatos', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT DISTINCT 
        h.id, 
        h.nombre AS hato_nombre, 
        t.id AS tenant_id, 
        t.nombre AS tenant_nombre,
        COUNT(a.id) AS total_animales
      FROM animales a
      INNER JOIN potreros p ON a.potrero_id = p.id
      INNER JOIN hatos h ON p.hato_id = h.id
      INNER JOIN tenants t ON h.tenant_id = t.id
      WHERE a.propietario_id = $1
      GROUP BY h.id, h.nombre, t.id, t.nombre
      ORDER BY h.nombre ASC;
    `;
    const { rows } = await pool.query(query, [parseInt(id, 10)]);
    res.json(rows);
  } catch (err) {
    console.error('[Propietario Hatos Error]', err);
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
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un propietario registrado con ese documento de identidad.' });
    }
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/propietarios/:id
 * Actualiza los datos de un propietario / inversionista
 */
router.put('/propietarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, documento, telefono, correo } = req.body;
  try {
    const query = `
      UPDATE propietarios SET
        nombre = COALESCE($1, nombre),
        documento_identidad = COALESCE($2, documento_identidad),
        telefono = COALESCE($3, telefono),
        correo = COALESCE($4, correo)
      WHERE id = $5
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      nombre ? nombre.trim() : null, 
      documento ? documento.trim() : null, 
      telefono ? telefono.trim() : null, 
      correo ? correo.trim() : null, 
      parseInt(id, 10)
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Propietario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un propietario registrado con ese documento de identidad.' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post('/collares', async (req, res) => {
  const { id, numeroSim, fechaInstalacion, versionFirmware, tenantId } = req.body;
  try {
    const query = `
      INSERT INTO collares (id, numero_sim, fecha_instalacion, version_firmware, tenant_id)
      VALUES ($1, $2, $3, COALESCE($4, '1.0.0'), $5) RETURNING *;
    `;
    const { rows } = await pool.query(query, [id, numeroSim, fechaInstalacion, versionFirmware, tenantId ? parseInt(tenantId, 10) : 1]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/animales', async (req, res) => {
  const { collarId, propietarioId, potreroId, areteVisual, raza, categoria, sexo, fotoUrl, numeroHierro, madreId, padreId, fechaNacimiento, tenantId } = req.body;

  const cleanCollarId = collarId && String(collarId).trim() !== '' ? String(collarId).trim() : null;
  const cleanPotreroId = potreroId && potreroId !== '' ? parseInt(potreroId, 10) : null;
  const cleanPropietarioId = propietarioId && propietarioId !== '' ? parseInt(propietarioId, 10) : null;
  const cleanMadreId = madreId && madreId !== '' ? parseInt(madreId, 10) : null;
  const cleanPadreId = padreId && padreId !== '' ? parseInt(padreId, 10) : null;

  try {
    // Determinar tenantId a partir del potrero o del payload
    let resolvedTenantId = tenantId ? parseInt(tenantId, 10) : 1;
    if (cleanPotreroId) {
      const tenantCheck = await pool.query('SELECT h.tenant_id FROM potreros p JOIN hatos h ON p.hato_id = h.id WHERE p.id = $1', [cleanPotreroId]);
      if (tenantCheck.rows.length > 0 && tenantCheck.rows[0].tenant_id) {
        resolvedTenantId = tenantCheck.rows[0].tenant_id;
      }
    }

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
      INSERT INTO animales (collar_id, propietario_id, potrero_id, arete_visual, raza, categoria, sexo, foto_url, numero_hierro, madre_id, padre_id, fecha_nacimiento, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      cleanCollarId, 
      cleanPropietarioId, 
      cleanPotreroId, 
      areteVisual, 
      raza, 
      categoria, 
      sexo || null, 
      fotoUrl || null, 
      numeroHierro || null, 
      cleanMadreId, 
      cleanPadreId, 
      fechaNacimiento,
      resolvedTenantId
    ]);

    // Sincronizar estado del collar a ACTIVO
    if (cleanCollarId && rows.length > 0) {
      await pool.query("UPDATE collares SET estado = 'ACTIVO', tenant_id = $1 WHERE id = $2;", [resolvedTenantId, cleanCollarId]);
      await pool.query(
        `INSERT INTO historial_collares (collar_id, estado_anterior, estado_nuevo, animal_id_nuevo, tenant_id_nuevo, motivo)
         VALUES ($1, 'DESACTIVADO', 'ACTIVO', $2, $3, $4);`,
        [cleanCollarId, rows[0].id, resolvedTenantId, `Vinculado al animal arete ${areteVisual}`]
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[Post Animales Error]', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/animales/:id/traspaso
 * Traspaso / Transferencia de un animal a un nuevo propietario con registro en historial_propietarios.
 */
router.post('/animales/:id/traspaso', async (req, res) => {
  const { id } = req.params;
  const { nuevoPropietarioId, tipoTraspaso, precioVenta } = req.body;

  if (!nuevoPropietarioId) {
    return res.status(400).json({ error: 'Debes seleccionar el nuevo propietario del animal.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const animalCheck = await client.query('SELECT id, arete_visual, propietario_id FROM animales WHERE id = $1', [id]);
    if (animalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    const animal = animalCheck.rows[0];
    const propietarioAnteriorId = animal.propietario_id;

    // 1. Actualizar propietario en tabla animales
    await client.query('UPDATE animales SET propietario_id = $1 WHERE id = $2', [nuevoPropietarioId, id]);

    // 2. Registrar en historial_propietarios
    const tipo = tipoTraspaso || 'VENTA';
    const precio = precioVenta ? parseFloat(precioVenta) : 0.00;
    await client.query(`
      INSERT INTO historial_propietarios (animal_id, propietario_anterior_id, propietario_nuevo_id, tipo_traspaso, precio_venta)
      VALUES ($1, $2, $3, $4, $5);
    `, [id, propietarioAnteriorId, nuevoPropietarioId, tipo, precio]);

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: `El animal con arete ${animal.arete_visual} fue transferido exitosamente.` 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Traspaso Animal Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/animales/:id/baja
 * Procesa la baja o salida de un animal del hato (venta a frigorífico, muerte, descarte),
 * liberando automáticamente el collar IoT para que quede disponible en almacén/reserva.
 */
router.post('/animales/:id/baja', async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'] || req.body.userRole || 'SUPERADMIN';
  const { motivoBaja, notasBaja, usuarioId, destinoCollar } = req.body;

  if (!motivoBaja) {
    return res.status(400).json({ error: 'Debes indicar el motivo de la baja del animal.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const animalCheck = await client.query('SELECT id, arete_visual, collar_id, tenant_id FROM animales WHERE id = $1', [id]);
    if (animalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    const animal = animalCheck.rows[0];
    const collarId = animal.collar_id;

    // 1. Si tenía collar, determinar nuevo estado y ubicación según el rol
    if (collarId) {
      let nuevoEstadoCollar = 'DESACTIVADO';
      let nuevoTenantCollar = animal.tenant_id;
      let nuevaUbicacionCollar = 'En Adquiriente/Finca';

      if (userRole === 'SUPERADMIN' && destinoCollar === 'ALMACEN_CENTRAL') {
        nuevoEstadoCollar = 'EN_ALMACEN';
        nuevoTenantCollar = null;
        nuevaUbicacionCollar = 'Almacén Central CowIA';
      } else if (userRole === 'SUPERADMIN' && destinoCollar === 'TALLER_REVISION') {
        nuevoEstadoCollar = 'EN_REVISION';
        nuevaUbicacionCollar = 'Taller Técnico CowIA';
      } else {
        // Rol ADMIN_FINCA o destino por defecto: Queda en custodia del hato adquiriente
        nuevoEstadoCollar = 'DESACTIVADO';
        nuevoTenantCollar = animal.tenant_id;
        nuevaUbicacionCollar = 'En Adquiriente/Finca';
      }

      await client.query(
        "UPDATE collares SET estado = $1, tenant_id = $2, ubicacion_almacen = $3 WHERE id = $4;",
        [nuevoEstadoCollar, nuevoTenantCollar, nuevaUbicacionCollar, collarId]
      );

      await client.query(`
        INSERT INTO historial_collares (collar_id, estado_anterior, estado_nuevo, animal_id_anterior, animal_id_nuevo, tenant_id_nuevo, motivo, usuario_id)
        VALUES ($1, 'ACTIVO', $2, $3, NULL, $4, $5, $6);
      `, [
        collarId, 
        nuevoEstadoCollar, 
        animal.id, 
        nuevoTenantCollar, 
        `Liberado por salida de res (${motivoBaja}) -> Destino: ${nuevaUbicacionCollar}. ${notasBaja || ''}`, 
        usuarioId || null
      ]);
    }

    // 2. Marcar animal como inactivo / baja
    await client.query(`
      UPDATE animales 
      SET activo = FALSE, collar_id = NULL, motivo_baja = $1, notas_baja = $2, fecha_baja = NOW()
      WHERE id = $3;
    `, [motivoBaja, notasBaja || null, id]);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Baja de la res ${animal.arete_visual} procesada exitosamente. ${collarId ? `El collar ${collarId} fue liberado.` : ''}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Baja Animal Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/animales/:id/historial-propietarios
 * Consulta el historial de transferencias de un animal.
 */
router.get('/animales/:id/historial-propietarios', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        hp.id,
        hp.animal_id,
        hp.fecha_transferencia,
        hp.tipo_traspaso,
        hp.precio_venta,
        pa.nombre AS propietario_anterior,
        pn.nombre AS propietario_nuevo
      FROM historial_propietarios hp
      LEFT JOIN propietarios pa ON hp.propietario_anterior_id = pa.id
      LEFT JOIN propietarios pn ON hp.propietario_nuevo_id = pn.id
      WHERE hp.animal_id = $1
      ORDER BY hp.fecha_transferencia DESC;
    `;
    const { rows } = await pool.query(query, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ==========================================
// 5. MÓDULO DE AUTENTICACIÓN Y ROLES DE USUARIOS
// ==========================================

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + '_collarnet_salt').digest('hex');
}

/**
 * POST /api/auth/login
 * Autentica un usuario y retorna su perfil con rol y tenant
 */
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Debes proporcionar correo electrónico y contraseña' });
  }

  try {
    const hashed = hashPassword(password);
    const query = `
      SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.rol, 
        u.finca_asignada, 
        u.activo,
        u.tenant_id,
        u.propietario_id,
        t.nombre AS tenant_nombre,
        p.nombre AS propietario_nombre,
        COALESCE(t.permite_crear_potreros, TRUE) AS permite_crear_potreros
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN propietarios p ON u.propietario_id = p.id
      WHERE LOWER(u.email) = LOWER($1) AND u.password_hash = $2;
    `;
    const { rows } = await pool.query(query, [email.trim(), hashed]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Correo o contraseña incorrectos.' });
    }

    const user = rows[0];
    if (!user.activo) {
      return res.status(403).json({ error: 'Este usuario se encuentra desactivado. Contacta al Administrador.' });
    }

    // Actualizar fecha de último ingreso
    await pool.query('UPDATE usuarios SET ultimo_ingreso = NOW() WHERE id = $1', [user.id]);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        fincaAsignada: user.finca_asignada,
        tenantId: user.tenant_id,
        tenantNombre: user.tenant_nombre || (user.rol === 'SUPERADMIN' ? 'Plataforma Global CollarNet' : 'Agropecuaria El Palmar C.A.'),
        propietarioId: user.propietario_id,
        propietarioNombre: user.propietario_nombre,
        permiteCrearPotreros: user.rol === 'SUPERADMIN' ? true : (user.rol === 'PROPIETARIO' ? false : Boolean(user.permite_crear_potreros))
      }
    });

  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
  }
});

/**
 * POST /api/auth/register
 * Registra un nuevo usuario en el sistema
 */
router.post('/auth/register', async (req, res) => {
  const { nombre, email, password, rol, fincaAsignada, tenantId, propietarioId } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email o contraseña' });
  }

  try {
    const hashed = hashPassword(password);
    const validRol = ['SUPERADMIN', 'ADMIN_FINCA', 'OPERARIO_CAMPO', 'VETERINARIO', 'PROPIETARIO'].includes(rol) ? rol : 'OPERARIO_CAMPO';

    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, finca_asignada, tenant_id, propietario_id)
      VALUES ($1, LOWER($2), $3, $4, $5, $6, $7)
      RETURNING id, nombre, email, rol, finca_asignada, tenant_id, propietario_id, creado_en;
    `;
    const { rows } = await pool.query(query, [
      nombre.trim(), 
      email.trim(), 
      hashed, 
      validRol, 
      fincaAsignada || 'Hato Principal San Juan',
      tenantId ? parseInt(tenantId, 10) : (validRol === 'SUPERADMIN' ? null : 1),
      propietarioId ? parseInt(propietarioId, 10) : null
    ]);
    res.status(201).json({ success: true, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
    }
    console.error('[Auth Register Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/usuarios
 * Retorna todos los usuarios registrados con su tenant y propietario
 */
router.get('/auth/usuarios', async (req, res) => {
  const { tenantId } = req.query;
  try {
    let query = `
      SELECT 
        u.id, 
        u.nombre, 
        u.email, 
        u.rol, 
        u.finca_asignada, 
        u.activo, 
        u.ultimo_ingreso, 
        u.creado_en,
        u.tenant_id,
        u.propietario_id,
        t.nombre AS tenant_nombre,
        p.nombre AS propietario_nombre
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN propietarios p ON u.propietario_id = p.id
    `;
    let params = [];
    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      query += ` WHERE u.tenant_id = $1`;
    }
    query += ` ORDER BY u.id ASC;`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/usuarios/:id
 * Actualiza los datos de un usuario (Nombre, Email, Rol, Finca, Tenant, Propietario, Contraseña, Estado)
 */
router.put('/auth/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, rol, fincaAsignada, tenantId, propietarioId, activo } = req.body;

  try {
    const validRol = rol && ['SUPERADMIN', 'ADMIN_FINCA', 'OPERARIO_CAMPO', 'VETERINARIO', 'PROPIETARIO'].includes(rol) ? rol : null;

    let query = `
      UPDATE usuarios SET
        nombre = COALESCE($1, nombre),
        email = COALESCE(LOWER($2), email),
        rol = COALESCE($3, rol),
        finca_asignada = COALESCE($4, finca_asignada),
        tenant_id = COALESCE($5, tenant_id),
        propietario_id = COALESCE($6, propietario_id),
        activo = COALESCE($7, activo)
    `;
    let params = [
      nombre ? nombre.trim() : null,
      email ? email.trim() : null,
      validRol,
      fincaAsignada ? fincaAsignada.trim() : null,
      tenantId ? parseInt(tenantId, 10) : null,
      propietarioId !== undefined ? (propietarioId ? parseInt(propietarioId, 10) : null) : null,
      activo !== undefined ? Boolean(activo) : null
    ];

    if (password && password.trim() !== '') {
      params.push(hashPassword(password.trim()));
      query += `, password_hash = $${params.length}`;
    }

    params.push(parseInt(id, 10));
    query += ` WHERE id = $${params.length} RETURNING id, nombre, email, rol, finca_asignada, tenant_id, propietario_id, activo, creado_en;`;

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado por otro usuario.' });
    }
    console.error('[Update User Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/auth/usuarios/:id/status
 * Activa o desactiva un usuario
 */
router.patch('/auth/usuarios/:id/status', async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, email, activo;',
      [Boolean(activo), parseInt(id, 10)]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/geocercas/potrero/:id
 * Actualiza un Potrero existente (nombre, hato, capacidad, margen, vértices)
 */
router.put('/geocercas/potrero/:id', async (req, res) => {
  const { id } = req.params;
  const { hatoId, nombre, vertices, capacidad, margenAdvertencia } = req.body;
  try {
    const potrero = await savePotrero(
      parseInt(id, 10), 
      parseInt(hatoId, 10), 
      nombre, 
      vertices, 
      capacidad ? parseInt(capacidad, 10) : 50, 
      margenAdvertencia ? parseFloat(margenAdvertencia) : 10.00
    );
    res.json({ success: true, potrero });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/geocercas/hato/:id
 * Actualiza un Hato existente (nombre, vértices, tenantId)
 */
router.put('/geocercas/hato/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, vertices, tenantId } = req.body;
  try {
    const hato = await saveHato(
      parseInt(id, 10), 
      nombre, 
      vertices, 
      tenantId ? parseInt(tenantId, 10) : null
    );
    res.json({ success: true, hato });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 12. MÓDULO SANITARIO Y VACUNACIÓN
// ==========================================

router.get('/sanidad/medicamentos', async (req, res) => {
  const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : null;
  try {
    let query = `
      SELECT * FROM catalogo_medicamentos 
      WHERE tenant_id IS NULL OR tenant_id = $1
      ORDER BY tipo ASC, nombre ASC;
    `;
    const { rows } = await pool.query(query, [tenantId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sanidad/medicamentos', async (req, res) => {
  const { nombre, tipo, dosisRecomendada, periodoRevacunacionDias, costoUnitarioEstimado, laboratorio, tenantId } = req.body;
  if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
  try {
    const query = `
      INSERT INTO catalogo_medicamentos (nombre, tipo, dosis_recomendada, periodo_revacunacion_dias, costo_unitario_estimado, laboratorio, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      nombre.trim(),
      tipo,
      dosisRecomendada || null,
      periodoRevacunacionDias ? parseInt(periodoRevacunacionDias, 10) : 180,
      costoUnitarioEstimado ? parseFloat(costoUnitarioEstimado) : 0.00,
      laboratorio || null,
      tenantId ? parseInt(tenantId, 10) : null
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sanidad/eventos', async (req, res) => {
  const { tenantId, animalId, tipo } = req.query;
  try {
    const whereClauses = [];
    const params = [];

    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      whereClauses.push(`(es.tenant_id = $${params.length} OR es.tenant_id IS NULL)`);
    }
    if (animalId) {
      params.push(parseInt(animalId, 10));
      whereClauses.push(`es.animal_id = $${params.length}`);
    }
    if (tipo) {
      params.push(tipo);
      whereClauses.push(`cm.tipo = $${params.length}`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        es.id,
        es.animal_id,
        a.arete_visual,
        a.raza AS raza_animal,
        a.categoria AS categoria_animal,
        es.medicamento_id,
        cm.nombre AS medicamento_nombre,
        cm.tipo AS medicamento_tipo,
        es.fecha_aplicacion,
        es.fecha_proxima_dosis,
        (es.fecha_proxima_dosis - CURRENT_DATE) AS dias_para_revacunacion,
        CASE 
          WHEN es.fecha_proxima_dosis IS NULL THEN 'SIN_REVACUNACION'
          WHEN es.fecha_proxima_dosis < CURRENT_DATE THEN 'VENCIDA'
          WHEN es.fecha_proxima_dosis <= (CURRENT_DATE + 30) THEN 'PROXIMA_A_VENCER'
          ELSE 'VIGENTE'
        END AS estado_revacunacion,
        es.dosis_aplicada,
        es.lote_medicamento,
        es.veterinario_responsable,
        es.costo_aplicado,
        es.observaciones,
        es.creado_en
      FROM eventos_sanitarios es
      INNER JOIN animales a ON es.animal_id = a.id
      INNER JOIN catalogo_medicamentos cm ON es.medicamento_id = cm.id
      ${whereSQL}
      ORDER BY es.fecha_aplicacion DESC, es.id DESC;
    `;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sanidad/aplicar', async (req, res) => {
  const { 
    animalIds, 
    animalId, 
    medicamentoId, 
    fechaAplicacion, 
    dosisAplicada, 
    loteMedicamento, 
    veterinarioResponsable, 
    costoAplicado, 
    observaciones,
    tenantId,
    usuarioId
  } = req.body;

  if (!medicamentoId) {
    return res.status(400).json({ error: 'Debes seleccionar un medicamento o vacuna del catálogo.' });
  }

  let targets = [];
  if (Array.isArray(animalIds) && animalIds.length > 0) {
    targets = animalIds.map(id => parseInt(id, 10));
  } else if (animalId) {
    targets = [parseInt(animalId, 10)];
  } else {
    return res.status(400).json({ error: 'Debes especificar al menos un animal para aplicar el tratamiento.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const medRes = await client.query('SELECT id, nombre, dosis_recomendada, periodo_revacunacion_dias, costo_unitario_estimado FROM catalogo_medicamentos WHERE id = $1', [medicamentoId]);
    if (medRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medicamento no encontrado en el catálogo' });
    }
    const med = medRes.rows[0];
    const fechaApp = fechaAplicacion || new Date().toISOString().split('T')[0];
    const periodoDias = med.periodo_revacunacion_dias || 180;
    const costo = costoAplicado !== undefined && costoAplicado !== '' ? parseFloat(costoAplicado) : parseFloat(med.costo_unitario_estimado || 0);

    const insertedEvents = [];
    for (const aId of targets) {
      const insertQuery = `
        INSERT INTO eventos_sanitarios (
          animal_id, medicamento_id, fecha_aplicacion, fecha_proxima_dosis, 
          dosis_aplicada, lote_medicamento, veterinario_responsable, costo_aplicado, 
          observaciones, tenant_id, usuario_id
        )
        VALUES (
          $1, $2, $3, 
          CASE WHEN $4::INTEGER > 0 THEN ($3::DATE + ($4::INTEGER * INTERVAL '1 day'))::DATE ELSE NULL END,
          $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *;
      `;
      const { rows } = await client.query(insertQuery, [
        aId,
        medicamentoId,
        fechaApp,
        periodoDias,
        dosisAplicada || med.dosis_recomendada || null,
        loteMedicamento || null,
        veterinarioResponsable || 'Veterinario Hato',
        costo,
        observaciones || null,
        tenantId ? parseInt(tenantId, 10) : null,
        usuarioId ? parseInt(usuarioId, 10) : null
      ]);
      insertedEvents.push(rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: `Se aplicó exitosamente '${med.nombre}' a ${insertedEvents.length} animal(es).`,
      totalAplicados: insertedEvents.length,
      eventos: insertedEvents
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Aplicar Sanidad Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/sanidad/kpis', async (req, res) => {
  const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : null;
  const params = [];
  let tenantFilter = '';
  if (tenantId) {
    params.push(tenantId);
    tenantFilter = `WHERE (es.tenant_id = $${params.length} OR es.tenant_id IS NULL)`;
  }

  try {
    const kpiQuery = `
      SELECT 
        COUNT(es.id) AS total_aplicaciones_historico,
        COUNT(CASE WHEN es.fecha_aplicacion >= (CURRENT_DATE - INTERVAL '30 days') THEN 1 END) AS aplicaciones_ultimos_30_dias,
        COUNT(CASE WHEN es.fecha_proxima_dosis < CURRENT_DATE THEN 1 END) AS revacunaciones_vencidas,
        COUNT(CASE WHEN es.fecha_proxima_dosis >= CURRENT_DATE AND es.fecha_proxima_dosis <= (CURRENT_DATE + 30) THEN 1 END) AS revacunaciones_proximas_30_dias,
        COALESCE(SUM(CASE WHEN es.fecha_aplicacion >= (CURRENT_DATE - INTERVAL '30 days') THEN es.costo_aplicado ELSE 0 END), 0) AS costo_sanitario_mes_actual,
        COALESCE(SUM(es.costo_aplicado), 0) AS costo_sanitario_historico_total
      FROM eventos_sanitarios es
      ${tenantFilter};
    `;
    const { rows } = await pool.query(kpiQuery, params);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. MÓDULO REPRODUCTIVO, PALPACIÓN Y MATERNIDAD
// ==========================================

router.get('/reproduccion/servicios', async (req, res) => {
  const { tenantId, vacaId, estado } = req.query;
  try {
    const whereClauses = [];
    const params = [];

    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      whereClauses.push(`(sr.tenant_id = $${params.length} OR sr.tenant_id IS NULL)`);
    }
    if (vacaId) {
      params.push(parseInt(vacaId, 10));
      whereClauses.push(`sr.vaca_id = $${params.length}`);
    }
    if (estado) {
      params.push(estado);
      whereClauses.push(`sr.estado = $${params.length}`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        sr.id,
        sr.vaca_id,
        v.arete_visual AS arete_vaca,
        v.raza AS raza_vaca,
        v.categoria AS categoria_vaca,
        sr.toro_id,
        t.arete_visual AS arete_toro,
        t.raza AS raza_toro,
        sr.tipo_servicio,
        sr.codigo_pajuela,
        sr.raza_toro_donante,
        sr.nombre_toro_donante,
        sr.fecha_servicio,
        (CURRENT_DATE - sr.fecha_servicio) AS dias_desde_servicio,
        sr.inseminador_responsable,
        sr.estado,
        sr.observaciones,
        p.resultado AS ultimo_resultado_palpacion,
        p.fecha_palpacion AS ultima_fecha_palpacion,
        p.dias_gestacion_estimados,
        p.fecha_estimada_parto,
        CASE 
          WHEN p.fecha_estimada_parto IS NOT NULL THEN (p.fecha_estimada_parto - CURRENT_DATE)
          WHEN sr.estado = 'PREÑADA_CONFIRMADA' THEN ((sr.fecha_servicio + INTERVAL '283 days')::DATE - CURRENT_DATE)
          ELSE NULL 
        END AS dias_para_parto,
        sr.creado_en
      FROM servicios_reproductivos sr
      INNER JOIN animales v ON sr.vaca_id = v.id
      LEFT JOIN animales t ON sr.toro_id = t.id
      LEFT JOIN LATERAL (
        SELECT resultado, fecha_palpacion, dias_gestacion_estimados, fecha_estimada_parto 
        FROM palpaciones_diagnosticos 
        WHERE servicio_id = sr.id 
        ORDER BY fecha_palpacion DESC LIMIT 1
      ) p ON TRUE
      ${whereSQL}
      ORDER BY sr.fecha_servicio DESC, sr.id DESC;
    `;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reproduccion/servicios', async (req, res) => {
  const { 
    vacaId, 
    toroId, 
    tipoServicio, 
    codigoPajuela, 
    razaToroDonante, 
    nombreToroDonante, 
    fechaServicio, 
    inseminadorResponsable, 
    observaciones, 
    tenantId, 
    usuarioId 
  } = req.body;

  if (!vacaId || !tipoServicio) {
    return res.status(400).json({ error: 'La vaca y el tipo de servicio son obligatorios.' });
  }

  try {
    const query = `
      INSERT INTO servicios_reproductivos (
        vaca_id, toro_id, tipo_servicio, codigo_pajuela, raza_toro_donante, nombre_toro_donante,
        fecha_servicio, inseminador_responsable, observaciones, tenant_id, usuario_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      parseInt(vacaId, 10),
      toroId ? parseInt(toroId, 10) : null,
      tipoServicio,
      codigoPajuela || null,
      razaToroDonante || null,
      nombreToroDonante || null,
      fechaServicio || new Date().toISOString().split('T')[0],
      inseminadorResponsable || 'Técnico Inseminador',
      observaciones || null,
      tenantId ? parseInt(tenantId, 10) : null,
      usuarioId ? parseInt(usuarioId, 10) : null
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reproduccion/palpaciones', async (req, res) => {
  const { 
    servicioId, 
    vacaId, 
    fechaPalpacion, 
    resultado, 
    diasGestacionEstimados, 
    veterinarioPalpador, 
    metodoDiagnostico, 
    observaciones, 
    tenantId 
  } = req.body;

  if (!vacaId || !resultado) {
    return res.status(400).json({ error: 'Vaca y resultado del diagnóstico son obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const diasGest = diasGestacionEstimados ? parseInt(diasGestacionEstimados, 10) : 60;
    const fPalp = fechaPalpacion || new Date().toISOString().split('T')[0];
    let fechaPartoEstimada = null;

    if (resultado === 'PREÑADA') {
      const diasRestantes = 283 - diasGest;
      const fPartoQuery = await client.query("SELECT ($1::DATE + ($2::INTEGER * INTERVAL '1 day'))::DATE AS f_parto;", [fPalp, diasRestantes]);
      fechaPartoEstimada = fPartoQuery.rows[0].f_parto;
    }

    const insertPalpQuery = `
      INSERT INTO palpaciones_diagnosticos (
        servicio_id, vaca_id, fecha_palpacion, resultado, dias_gestacion_estimados, 
        fecha_estimada_parto, veterinario_palpador, metodo_diagnostico, observaciones, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const { rows: palpRows } = await client.query(insertPalpQuery, [
      servicioId ? parseInt(servicioId, 10) : null,
      parseInt(vacaId, 10),
      fPalp,
      resultado,
      resultado === 'PREÑADA' ? diasGest : null,
      fechaPartoEstimada,
      veterinarioPalpador || 'Veterinario Hato',
      metodoDiagnostico || 'PALPACION_RECTAL',
      observaciones || null,
      tenantId ? parseInt(tenantId, 10) : null
    ]);

    if (servicioId) {
      const nuevoEstadoServicio = resultado === 'PREÑADA' ? 'PREÑADA_CONFIRMADA' : resultado === 'VACIA' ? 'VACIA' : 'PENDIENTE_PALPACION';
      await client.query('UPDATE servicios_reproductivos SET estado = $1 WHERE id = $2;', [nuevoEstadoServicio, servicioId]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      palpacion: palpRows[0],
      fechaEstimadaParto: fechaPartoEstimada
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Palpacion Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/reproduccion/partos', async (req, res) => {
  const { tenantId, vacaId } = req.query;
  try {
    const whereClauses = [];
    const params = [];

    if (tenantId) {
      params.push(parseInt(tenantId, 10));
      whereClauses.push(`(pn.tenant_id = $${params.length} OR pn.tenant_id IS NULL)`);
    }
    if (vacaId) {
      params.push(parseInt(vacaId, 10));
      whereClauses.push(`pn.vaca_id = $${params.length}`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        pn.id,
        pn.vaca_id,
        v.arete_visual AS arete_madre,
        v.raza AS raza_madre,
        pn.fecha_parto,
        pn.tipo_parto,
        pn.condicion_cria,
        pn.cria_animal_id,
        cria.arete_visual AS arete_cria_registrado,
        pn.arete_cria,
        pn.sexo_cria,
        pn.peso_nacimiento,
        pn.veterinario_asistente,
        pn.observaciones,
        pn.creado_en
      FROM partos_nacimientos pn
      INNER JOIN animales v ON pn.vaca_id = v.id
      LEFT JOIN animales cria ON pn.cria_animal_id = cria.id
      ${whereSQL}
      ORDER BY pn.fecha_parto DESC, pn.id DESC;
    `;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reproduccion/partos', async (req, res) => {
  const { 
    servicioId, 
    vacaId, 
    fechaParto, 
    tipoParto, 
    condicionCria, 
    veterinarioAsistente, 
    observaciones, 
    tenantId,
    crearCria,
    areteCria,
    sexoCria,
    razaCria,
    pesoNacimiento,
    propietarioId
  } = req.body;

  if (!vacaId) {
    return res.status(400).json({ error: 'La vaca madre es obligatoria para registrar el parto.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vacaQuery = await client.query('SELECT id, arete_visual, raza, propietario_id, tenant_id FROM animales WHERE id = $1', [vacaId]);
    if (vacaQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vaca madre no encontrada' });
    }
    const vaca = vacaQuery.rows[0];

    let padreId = null;
    if (servicioId) {
      const srvRes = await client.query('SELECT toro_id FROM servicios_reproductivos WHERE id = $1', [servicioId]);
      if (srvRes.rows.length > 0 && srvRes.rows[0].toro_id) {
        padreId = srvRes.rows[0].toro_id;
      }
    }

    const fParto = fechaParto || new Date().toISOString().split('T')[0];
    let criaAnimalId = null;

    if (crearCria && condicionCria !== 'MUERTA' && areteCria && String(areteCria).trim() !== '') {
      const cleanArete = String(areteCria).trim().toUpperCase();
      const insertAnimalQuery = `
        INSERT INTO animales (
          arete_visual, raza, categoria, sexo, fecha_nacimiento, madre_id, padre_id, propietario_id, tenant_id
        )
        VALUES ($1, $2, 'Ternero', $3, $4, $5, $6, $7, $8) RETURNING id;
      `;
      const { rows: nuevaCria } = await client.query(insertAnimalQuery, [
        cleanArete,
        razaCria || vaca.raza || 'Brahman',
        sexoCria || 'Macho',
        fParto,
        vaca.id,
        padreId,
        propietarioId ? parseInt(propietarioId, 10) : vaca.propietario_id,
        tenantId ? parseInt(tenantId, 10) : vaca.tenant_id
      ]);
      criaAnimalId = nuevaCria[0].id;

      if (pesoNacimiento && parseFloat(pesoNacimiento) > 0) {
        await client.query(`
          INSERT INTO registro_pesajes (animal_id, peso, fecha_pesaje)
          VALUES ($1, $2, $3);
        `, [criaAnimalId, parseFloat(pesoNacimiento), fParto]);
      }
    }

    const insertPartoQuery = `
      INSERT INTO partos_nacimientos (
        servicio_id, vaca_id, fecha_parto, tipo_parto, condicion_cria, cria_animal_id,
        arete_cria, sexo_cria, peso_nacimiento, veterinario_asistente, observaciones, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *;
    `;
    const { rows: partoRows } = await client.query(insertPartoQuery, [
      servicioId ? parseInt(servicioId, 10) : null,
      parseInt(vacaId, 10),
      fParto,
      tipoParto || 'NORMAL',
      condicionCria || 'VIVA',
      criaAnimalId,
      areteCria || null,
      sexoCria || null,
      pesoNacimiento ? parseFloat(pesoNacimiento) : null,
      veterinarioAsistente || 'Veterinario Hato',
      observaciones || null,
      tenantId ? parseInt(tenantId, 10) : vaca.tenant_id
    ]);

    if (servicioId) {
      await client.query("UPDATE servicios_reproductivos SET estado = 'PARTO_REGISTRADO' WHERE id = $1;", [servicioId]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: `Parto registrado exitosamente. ${criaAnimalId ? `Se dio de alta en inventario la cría con arete ${areteCria}.` : ''}`,
      parto: partoRows[0],
      criaAnimalId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Registro Parto Error]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/reproduccion/kpis', async (req, res) => {
  const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : null;
  const params = [];
  let tenantFilter = '';
  if (tenantId) {
    params.push(tenantId);
    tenantFilter = `WHERE (tenant_id = $${params.length} OR tenant_id IS NULL)`;
  }

  try {
    const kpiQuery = `
      SELECT 
        COUNT(id) AS total_servicios_historicos,
        COUNT(CASE WHEN estado = 'PREÑADA_CONFIRMADA' THEN 1 END) AS total_preñadas_confirmadas,
        COUNT(CASE WHEN estado = 'PENDIENTE_PALPACION' THEN 1 END) AS pendientes_palpacion,
        COUNT(CASE WHEN estado = 'VACIA' THEN 1 END) AS vacas_vacias,
        COUNT(CASE WHEN estado = 'PARTO_REGISTRADO' THEN 1 END) AS partos_historicos,
        ROUND(
          COALESCE(
            COUNT(CASE WHEN estado = 'PREÑADA_CONFIRMADA' OR estado = 'PARTO_REGISTRADO' THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(CASE WHEN estado IN ('PREÑADA_CONFIRMADA', 'VACIA', 'PARTO_REGISTRADO') THEN 1 END), 0) * 100, 
            0
          ), 
          1
        ) AS tasa_preñez_porcentaje
      FROM servicios_reproductivos
      ${tenantFilter};
    `;
    const { rows } = await pool.query(kpiQuery, params);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 14. MÓDULO DE NOTIFICACIONES MULTICANAL
// ==========================================

router.get('/notificaciones/configuracion', async (req, res) => {
  const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : 1;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM configuracion_notificaciones WHERE tenant_id = $1',
      [tenantId]
    );
    if (rows.length === 0) {
      const initRes = await pool.query(`
        INSERT INTO configuracion_notificaciones (tenant_id)
        VALUES ($1) RETURNING *;
      `, [tenantId]);
      return res.json(initRes.rows[0]);
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notificaciones/configuracion', async (req, res) => {
  const { 
    tenantId = 1,
    canalTelegramActivo,
    telegramBotToken,
    telegramChatId,
    canalWhatsappActivo,
    whatsappPhone,
    whatsappApiKey,
    canalEmailActivo,
    emailDestinatarios,
    alertaEscapeGeocerca,
    alertaBateriaCritica,
    alertaCollarOffline,
    alertaCeloDetectado
  } = req.body;

  try {
    const query = `
      INSERT INTO configuracion_notificaciones (
        tenant_id, canal_telegram_activo, telegram_bot_token, telegram_chat_id,
        canal_whatsapp_activo, whatsapp_phone, whatsapp_api_key,
        canal_email_activo, email_destinatarios,
        alerta_escape_geocerca, alerta_bateria_critica, alerta_collar_offline, alerta_celo_detectado,
        actualizado_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        canal_telegram_activo = EXCLUDED.canal_telegram_activo,
        telegram_bot_token = EXCLUDED.telegram_bot_token,
        telegram_chat_id = EXCLUDED.telegram_chat_id,
        canal_whatsapp_activo = EXCLUDED.canal_whatsapp_activo,
        whatsapp_phone = EXCLUDED.whatsapp_phone,
        whatsapp_api_key = EXCLUDED.whatsapp_api_key,
        canal_email_activo = EXCLUDED.canal_email_activo,
        email_destinatarios = EXCLUDED.email_destinatarios,
        alerta_escape_geocerca = EXCLUDED.alerta_escape_geocerca,
        alerta_bateria_critica = EXCLUDED.alerta_bateria_critica,
        alerta_collar_offline = EXCLUDED.alerta_collar_offline,
        alerta_celo_detectado = EXCLUDED.alerta_celo_detectado,
        actualizado_en = NOW()
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      parseInt(tenantId, 10),
      canalTelegramActivo ?? false,
      telegramBotToken || null,
      telegramChatId || null,
      canalWhatsappActivo ?? false,
      whatsappPhone || null,
      whatsappApiKey || null,
      canalEmailActivo ?? false,
      emailDestinatarios || null,
      alertaEscapeGeocerca ?? true,
      alertaBateriaCritica ?? true,
      alertaCollarOffline ?? true,
      alertaCeloDetectado ?? true
    ]);
    res.json({ success: true, configuracion: rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/notificaciones/probar-canal', async (req, res) => {
  const { canal, botToken, chatId, phone, email, tenantId } = req.body;
  try {
    if (canal === 'TELEGRAM') {
      if (!botToken || !chatId) {
        return res.status(400).json({ error: 'Debes ingresar el Token del Bot y el Chat ID de Telegram.' });
      }
      const testMsg = '🔔 *PRUEBA DE CONEXIÓN COWIA*\n\n¡Tu Bot de Telegram está conectado exitosamente con la plataforma CowIA! Recibirás alertas perimetrales y de salud aquí.';
      await sendTelegramMessage(botToken, chatId, testMsg, { lat: 8.5833, lng: -70.3333 });
      
      await pool.query(`
        INSERT INTO bitacora_notificaciones (canal, destinatario, titulo, mensaje, estado, tenant_id)
        VALUES ('TELEGRAM', $1, 'Prueba de Conexión Exitosa', $2, 'ENVIADO', $3);
      `, [chatId, testMsg, tenantId ? parseInt(tenantId, 10) : 1]);

      return res.json({ success: true, message: 'Mensaje de prueba enviado exitosamente a Telegram.' });
    }

    if (canal === 'WHATSAPP') {
      await pool.query(`
        INSERT INTO bitacora_notificaciones (canal, destinatario, titulo, mensaje, estado, tenant_id)
        VALUES ('WHATSAPP', $1, 'Prueba de Conexión WhatsApp', 'Mensaje de prueba enviado a WhatsApp', 'ENVIADO', $2);
      `, [phone || '584120000000', tenantId ? parseInt(tenantId, 10) : 1]);

      return res.json({ success: true, message: `Aviso de prueba registrado para WhatsApp a ${phone}.` });
    }

    if (canal === 'EMAIL') {
      await pool.query(`
        INSERT INTO bitacora_notificaciones (canal, destinatario, titulo, mensaje, estado, tenant_id)
        VALUES ('EMAIL', $1, 'Prueba de Correo CowIA', 'Prueba de envío de alertas por correo electrónico', 'ENVIADO', $2);
      `, [email || 'admin@ganaderia.com', tenantId ? parseInt(tenantId, 10) : 1]);

      return res.json({ success: true, message: `Correo de prueba despachado a ${email}.` });
    }

    res.status(400).json({ error: 'Canal no soportado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notificaciones/bitacora', async (req, res) => {
  const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : null;
  try {
    let query = 'SELECT * FROM bitacora_notificaciones';
    const params = [];
    if (tenantId) {
      params.push(tenantId);
      query += ' WHERE tenant_id = $1';
    }
    query += ' ORDER BY creado_en DESC LIMIT 50;';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 15. MÓDULO DE SALUD, ACTIVIDAD Y RUMIA (IMU)
// ==========================================

router.get('/salud-rumia/resumen-hato', async (req, res) => {
  const tenantId = req.query.tenantId ? parseInt(req.query.tenantId, 10) : null;
  const params = [];
  let tenantFilter = '';
  if (tenantId) {
    params.push(tenantId);
    tenantFilter = `AND a.tenant_id = $${params.length}`;
  }

  try {
    const query = `
      SELECT 
        a.id AS animal_id,
        a.arete_visual,
        a.raza,
        a.categoria,
        a.collar_id,
        COALESCE(AVG(m.minutos_pastoreo), 0)::INTEGER AS promedio_pastoreo_hora,
        COALESCE(AVG(m.minutos_rumia), 0)::INTEGER AS promedio_rumia_hora,
        COALESCE(AVG(m.minutos_descanso), 0)::INTEGER AS promedio_descanso_hora,
        COALESCE(AVG(m.minutos_caminata), 0)::INTEGER AS promedio_caminata_hora,
        COALESCE(AVG(m.indice_actividad_promedio), 1.00)::NUMERIC(4,2) AS indice_actividad,
        BOOL_OR(m.alerta_celo) AS alerta_celo,
        BOOL_OR(m.alerta_letargo) AS alerta_letargo
      FROM animales a
      INNER JOIN metricas_actividad_rumia m ON a.id = m.animal_id
      WHERE m.fecha = CURRENT_DATE
      ${tenantFilter}
      GROUP BY a.id, a.arete_visual, a.raza, a.categoria, a.collar_id
      ORDER BY indice_actividad DESC;
    `;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/salud-rumia/animal/:animalId', async (req, res) => {
  const { animalId } = req.params;
  try {
    const query = `
      SELECT 
        hora_bloque,
        minutos_pastoreo,
        minutos_rumia,
        minutos_descanso,
        minutos_caminata,
        indice_actividad_promedio,
        alerta_celo,
        alerta_letargo
      FROM metricas_actividad_rumia
      WHERE animal_id = $1 AND fecha = CURRENT_DATE
      ORDER BY hora_bloque ASC;
    `;
    const { rows } = await pool.query(query, [parseInt(animalId, 10)]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
