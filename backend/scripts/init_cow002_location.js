import pool from '../config/db.js';

async function main() {
  try {
    const res = await pool.query(`
      UPDATE collares 
      SET ultima_ubicacion = ST_SetSRID(ST_Point(-71.604287884, 10.671321982), 4326) 
      WHERE id = 'COW-002';
    `);
    console.log('Updated COW-002 location:', res.rowCount);

    const check = await pool.query(`
      SELECT c.id, c.estado, c.medio_red, ST_AsGeoJSON(c.ultima_ubicacion) as loc,
             a.id as animal_id, a.arete_visual, p.nombre as potrero
      FROM collares c
      LEFT JOIN animales a ON a.collar_id = c.id
      LEFT JOIN potreros p ON a.potrero_id = p.id
      WHERE c.id = 'COW-002';
    `);
    console.log('Result:', check.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
