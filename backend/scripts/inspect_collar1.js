import pool from '../config/db.js';

async function main() {
  try {
    await pool.query(`
      UPDATE collares 
      SET medio_red = '4G LTE (DIGITEL)', 
          preferencia_red = 'CELULAR' 
      WHERE id = 'COW-001'
    `);
    const c = await pool.query("SELECT id, medio_red, preferencia_red, estado, ultima_conexion, ST_AsGeoJSON(ultima_ubicacion) as loc FROM collares WHERE id = 'COW-001'");
    console.log('Collar COW-001:', c.rows[0]);
    const a = await pool.query(`
      SELECT a.id, a.arete_visual, a.collar_id, a.potrero_id, a.hato_id, 
             p.nombre as potrero_nombre, h.nombre as hato_nombre,
             c.medio_red, c.preferencia_red,
             ST_AsGeoJSON(c.ultima_ubicacion) as loc
      FROM animales a 
      LEFT JOIN collares c ON a.collar_id = c.id
      LEFT JOIN potreros p ON a.potrero_id = p.id 
      LEFT JOIN hatos h ON p.hato_id = h.id 
      WHERE a.collar_id = 'COW-001'
    `);
    console.log('Animal COW-001:', a.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
