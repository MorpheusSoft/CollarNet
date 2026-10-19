import pool from '../config/db.js';

async function main() {
  const collarQuery = `
    SELECT c.id AS collar_id, a.id AS animal_id, a.arete_visual, c.activo, c.estado, c.imei AS db_imei,
           ST_Y(c.ultima_ubicacion) AS last_lat, ST_X(c.ultima_ubicacion) AS last_lon
    FROM collares c 
    LEFT JOIN animales a ON a.collar_id = c.id 
    WHERE c.id = $1 OR ($2::varchar IS NOT NULL AND c.imei = $2::varchar)
    ORDER BY (c.id = $1) DESC;
  `;
  const { rows } = await pool.query(collarQuery, ['COW-002', '14:63:93:4B:C1:48']);
  console.log('Result for COW-002:', rows);
  process.exit(0);
}

main().catch(console.error);
