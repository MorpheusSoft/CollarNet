import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || '86.48.23.195',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Pegaso#26',
  database: process.env.DB_NAME || 'collarnet'
});

async function run() {
  await pool.query(`
    INSERT INTO collares (id, numero_sim, tenant_id, activo, estado, version_firmware, nivel_bateria, creado_en)
    VALUES ('COW-002', '+584120000002', 6, true, 'ACTIVO', '1.0.0', 100, NOW())
    ON CONFLICT (id) DO UPDATE SET activo = true, estado = 'ACTIVO';
  `);
  await pool.query(`
    UPDATE collares 
    SET imei = '14:63:93:4B:C1:48', mac_address = '14:63:93:4B:C1:48', estado = 'ACTIVO', activo = true 
    WHERE id = 'COW-002';
  `);
  const c = await pool.query(`
    SELECT id, imei, activo, estado, nivel_bateria, voltaje_mv, medio_red, ip 
    FROM collares 
    WHERE id = 'COW-002';
  `);
  console.log('ESTADO COW-002 EN DB:', c.rows[0]);
  const a = await pool.query(`
    SELECT a.id, a.arete_visual, a.collar_id 
    FROM animales a 
    WHERE a.collar_id = 'COW-002';
  `);
  console.log('ANIMAL VINCULADO:', a.rows[0]);
  await pool.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
