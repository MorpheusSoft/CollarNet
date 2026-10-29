import pool from '../config/db.js';

async function main() {
  try {
    const potCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'potreros'");
    console.log('Potreros columns:', potCols.rows.map(r => r.column_name));

    const potRows = await pool.query("SELECT id, nombre, ST_AsGeoJSON(perimetro) as perimetro, ST_AsGeoJSON(ST_Centroid(perimetro)) as centro FROM potreros WHERE id = 11");
    console.log('Potrero 11:', potRows.rows);

    const cCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'collares'");
    console.log('Collares columns:', cCols.rows.map(r => r.column_name));

    const cRows = await pool.query("SELECT id, estado, medio_red, preferencia_red, ST_AsGeoJSON(ultima_ubicacion) as loc, ultima_conexion FROM collares WHERE id IN ('COW-001', 'COW-002')");
    console.log('Collares rows:', cRows.rows);

    const animals = await pool.query(`
      SELECT a.id, a.arete_visual, a.collar_id, a.potrero_id, 
             ST_AsGeoJSON(c.ultima_ubicacion) as loc,
             c.estado, c.medio_red
      FROM animales a 
      LEFT JOIN collares c ON a.collar_id = c.id 
      WHERE a.collar_id IN ('COW-001', 'COW-002')
    `);
    console.log('Animales:', animals.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
