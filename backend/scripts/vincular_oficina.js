import pg from 'pg';
import mqtt from 'mqtt';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '86.48.23.195',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Pegaso#26',
  database: process.env.DB_NAME || 'collarnet'
});

function flattenCoordinates(vertices) {
  const flat = [];
  for (const pt of vertices) {
    flat.push(parseFloat(pt[0]));
    flat.push(parseFloat(pt[1]));
  }
  return flat;
}

function extractVerticesFromGeoJSON(geojsonStr) {
  if (!geojsonStr) return [];
  const geojson = JSON.parse(geojsonStr);
  if (geojson.type !== 'Polygon') return [];
  const outerRing = geojson.coordinates[0];
  return outerRing.map(pt => [pt[1], pt[0]]);
}

async function run() {
  console.log('--- Buscando Hato Oficina y Potrero A ---');
  const hRes = await pool.query("SELECT id, nombre, COALESCE(margen_advertencia_metros, 1.00) AS margen_advertencia_metros, ST_AsGeoJSON(perimetro) as geojson FROM hatos WHERE LOWER(nombre) LIKE '%oficina%'");
  if (hRes.rows.length === 0) {
    console.error('No se encontró el hato oficina');
    process.exit(1);
  }
  const hato = hRes.rows[0];
  console.log('Hato encontrado:', hato.id, hato.nombre, '| Margen:', hato.margen_advertencia_metros);

  const pRes = await pool.query("SELECT id, nombre, hato_id, COALESCE(margen_advertencia_metros, 3.00) AS margen_advertencia_metros, estado, modo_arreo_activo, ST_AsGeoJSON(perimetro) as geojson FROM potreros WHERE hato_id = $1 AND LOWER(nombre) LIKE '%potrero a%'", [hato.id]);
  if (pRes.rows.length === 0) {
    // Si no tiene nombre exacto 'potrero a', buscar cualquier potrero en ese hato
    const allP = await pool.query("SELECT id, nombre, hato_id, COALESCE(margen_advertencia_metros, 3.00) AS margen_advertencia_metros, estado, modo_arreo_activo, ST_AsGeoJSON(perimetro) as geojson FROM potreros WHERE hato_id = $1", [hato.id]);
    console.log('Potreros en Hato:', allP.rows);
    if (allP.rows.length === 0) {
      console.error('No hay potreros en este hato');
      process.exit(1);
    }
  }
  const potrero = pRes.rows[0];
  console.log('Potrero encontrado:', potrero.id, potrero.nombre, '| Margen:', potrero.margen_advertencia_metros);

  console.log('--- Vinculando COW-001 en Base de Datos ---');
  await pool.query("UPDATE animales SET hato_id = $1, potrero_id = $2 WHERE collar_id = 'COW-001'", [hato.id, potrero.id]);
  await pool.query("UPDATE collares SET tenant_id = (SELECT tenant_id FROM hatos WHERE id = $1) WHERE id = 'COW-001'", [hato.id]);

  const hatoVertices = extractVerticesFromGeoJSON(hato.geojson);
  const potreroVertices = extractVerticesFromGeoJSON(potrero.geojson);
  const mHato = parseFloat(hato.margen_advertencia_metros) || 1.0;
  const mPotrero = parseFloat(potrero.margen_advertencia_metros) || 3.0;
  const isPotreroOpen = (potrero.estado === 'ABIERTO' || potrero.modo_arreo_activo === true);

  const payload = {
    collar_activo: true,
    silence: false,
    h_id: parseInt(hato.id, 10),
    h_v: flattenCoordinates(hatoVertices),
    h_tw: mHato,
    p_id: parseInt(potrero.id, 10),
    p_v: flattenCoordinates(potreroVertices),
    p_tw: mPotrero,
    t_w: mPotrero,
    p_open: isPotreroOpen ? 1 : 0
  };

  console.log('Payload de configuración:', JSON.stringify(payload, null, 2));

  console.log('--- Publicando en MQTT HiveMQ con Retain ---');
  const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

  client.on('connect', () => {
    const topics = [
      'collarnet/lzambrano/COW-001/config',
      'collarnet/lzambrano/864643061445526/config',
      'collarnet/simulacion/COW-001/config'
    ];

    let pending = topics.length;
    topics.forEach(topic => {
      client.publish(topic, JSON.stringify(payload), { qos: 1, retain: true }, (err) => {
        if (err) console.error('Error publicando en', topic, err);
        else console.log('Publicado con éxito en', topic);
        pending--;
        if (pending === 0) {
          client.end();
          pool.end();
          console.log('✅ ¡Vinculación a Hato Oficina y Potrero A completada exitosamente!');
        }
      });
    });
  });
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
