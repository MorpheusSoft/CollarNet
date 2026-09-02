import pool from '../config/db.js';

/**
 * Convierte un array de coordenadas [[lat, lon], ...] en un string WKT POLYGON de PostGIS.
 * Asegura que el polígono esté cerrado y ordena como "longitude latitude" (estándar PostGIS).
 */
export function verticesToWKT(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) {
    throw new Error('Un polígono válido requiere al menos 3 vértices.');
  }

  // Mapear a "longitud latitud" (PostGIS usa el orden X Y / Lon Lat)
  const points = vertices.map(v => `${v[1]} ${v[0]}`);

  // Cerrar el polígono si el último vértice no coincide con el primero
  if (points[0] !== points[points.length - 1]) {
    points.push(points[0]);
  }

  return `POLYGON((${points.join(', ')}))`;
}

/**
 * Evalúa la posición actual de un animal frente a su Hato de seguridad y Potrero asignado.
 * Retorna si está dentro del hato, si infringe rotación, la distancia al límite exterior y alertas.
 */
export async function evaluateAnimalPosition(animalId, lat, lon) {
  const query = `
    SELECT 
      a.id AS animal_id,
      a.arete_visual,
      a.potrero_id AS potrero_asignado_id,
      p_asig.nombre AS potrero_asignado_nombre,
      h.id AS hato_id,
      h.nombre AS hato_nombre,
      -- ¿Está en el Hato?
      CASE 
        WHEN h.id IS NULL THEN true
        ELSE ST_Contains(h.perimetro, ST_SetSRID(ST_Point($2, $1), 4326))
      END AS dentro_hato,
      -- ¿Está en el Potrero asignado?
      CASE 
        WHEN a.potrero_id IS NULL THEN true
        ELSE ST_Contains(p_asig.perimetro, ST_SetSRID(ST_Point($2, $1), 4326))
      END AS dentro_potrero,
      -- Distancia al límite del Hato (en metros) usando geografía
      CASE 
        WHEN h.id IS NULL THEN 0.0
        ELSE ST_Distance(ST_SetSRID(ST_Point($2, $1), 4326)::geography, h.perimetro::geography)
      END AS distancia_hato,
      -- Nombre del potrero donde está físicamente ahora (si está en alguno)
      (
        SELECT p_actual.nombre 
        FROM potreros p_actual 
        WHERE ST_Contains(p_actual.perimetro, ST_SetSRID(ST_Point($2, $1), 4326))
        LIMIT 1
      ) AS potrero_actual_nombre
    FROM animales a
    LEFT JOIN potreros p_asig ON a.potrero_id = p_asig.id
    LEFT JOIN hatos h ON (p_asig.hato_id = h.id OR (p_asig.id IS NULL AND h.id = (SELECT id FROM hatos LIMIT 1)))
    WHERE a.id = $3;
  `;

  const values = [lat, lon, animalId];
  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    throw new Error(`No se encontró el animal con ID ${animalId}`);
  }

  const result = rows[0];

  let alertType = 'NORMAL';
  if (!result.dentro_hato) {
    alertType = 'ESCAPE_HATO'; // Peligro crítico fuera del Hato
  } else if (!result.dentro_potrero) {
    alertType = 'INFRACCION_ROTACION'; // Alerta media fuera de su potrero asignado
  }

  return {
    animalId: result.animal_id,
    areteVisual: result.arete_visual,
    hatoId: result.hato_id,
    hatoNombre: result.hato_nombre || 'Sin Hato',
    dentroHato: !!result.dentro_hato,
    potreroAsignadoId: result.potrero_asignado_id,
    potreroAsignadoNombre: result.potrero_asignado_nombre || 'Sin Asignar',
    dentroPotrero: !!result.dentro_potrero,
    distanciaHato: parseFloat(result.distancia_hato || '0'),
    potreroActualNombre: result.potrero_actual_nombre || 'Callejón / Tránsito',
    alertType
  };
}

/**
 * Guarda o actualiza la geocerca de un Hato.
 */
export async function saveHato(id, nombre, vertices, tenantId = 1) {
  const wkt = verticesToWKT(vertices);
  if (id) {
    const query = `
      UPDATE hatos 
      SET nombre = $1, perimetro = ST_GeomFromText($2, 4326), tenant_id = COALESCE($3, tenant_id)
      WHERE id = $4 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [nombre, wkt, tenantId, id]);
    return rows[0];
  } else {
    const query = `
      INSERT INTO hatos (nombre, perimetro, tenant_id) 
      VALUES ($1, ST_GeomFromText($2, 4326), $3) 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [nombre, wkt, tenantId || 1]);
    return rows[0];
  }
}

/**
 * Guarda o actualiza la geocerca de un Potrero.
 */
export async function savePotrero(id, hatoId, nombre, vertices, capacidad = 50, margenAdvertencia = 10.00) {
  const wkt = verticesToWKT(vertices);
  if (id) {
    const query = `
      UPDATE potreros 
      SET hato_id = $1, nombre = $2, perimetro = ST_GeomFromText($3, 4326), capacidad_max_cabezas = $4, margen_advertencia_metros = $5
      WHERE id = $6 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [hatoId, nombre, wkt, capacidad, margenAdvertencia, id]);
    return rows[0];
  } else {
    const query = `
      INSERT INTO potreros (hato_id, nombre, perimetro, capacidad_max_cabezas, margen_advertencia_metros) 
      VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5) 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [hatoId, nombre, wkt, capacidad, margenAdvertencia]);
    return rows[0];
  }
}
