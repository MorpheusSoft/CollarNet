import mqtt from 'mqtt';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  host: process.env.DB_HOST || '86.48.23.195',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Pegaso#26',
  database: process.env.DB_NAME || 'collarnet'
});

const hatoOficinaGeoJSON = {
  type: "Polygon",
  coordinates: [[
    [-71.60456133, 10.671862454],
    [-71.603576436, 10.672089043],
    [-71.603349447, 10.67102773],
    [-71.604363749, 10.670829439],
    [-71.60456133, 10.671862454]
  ]]
};

const potreroAGeoJSON = {
  type: "Polygon",
  coordinates: [[
    [-71.604434904, 10.671375364],
    [-71.604204553, 10.671426403],
    [-71.604142978, 10.671271749],
    [-71.604364845, 10.671214099],
    [-71.604434904, 10.671375364]
  ]]
};

function flattenCoordinates(coords) {
  const flat = [];
  for (const pt of coords) {
    flat.push(parseFloat(pt[1]));
    flat.push(parseFloat(pt[0]));
  }
  return flat;
}

async function run() {
  console.log('--- 1. Actualizando preferencia de red a CELULAR en Base de Datos de Producción (COW-001) ---');
  await pool.query(`
    UPDATE collares 
    SET preferencia_red = 'CELULAR', 
        medio_red = '4G LTE (DIGITEL)'
    WHERE id = 'COW-001';
  `);
  console.log('✅ Base de datos actualizada con preferencia CELULAR para COW-001.');

  console.log('--- 2. Actualizando local_store.json ---');
  const storePath = path.join(__dirname, '../config/local_store.json');
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const collar = store.collares.find(c => c.id === 'COW-001');
    if (collar) {
      collar.preferencia_red = 'CELULAR';
      collar.medio_red = '4G LTE (DIGITEL)';
    }
    const animal = store.animales.find(a => a.collar_id === 'COW-001');
    if (animal) {
      animal.preferencia_red = 'CELULAR';
      animal.medio_red = '4G LTE (DIGITEL)';
    }
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    console.log('✅ local_store.json actualizado.');
  }

  console.log('--- 3. Publicando orden de conmutación a Red Celular (4G LTE Digitel) vía MQTT ---');
  const hatoCoords = hatoOficinaGeoJSON.coordinates[0];
  const potreroCoords = potreroAGeoJSON.coordinates[0];

  const configPayload = {
    collar_activo: true,
    silence: false,
    net_pref: "CELULAR",
    preference_red: "CELULAR",
    h_id: 9,
    h_v: flattenCoordinates(hatoCoords),
    h_tw: 1.0,
    p_id: 11,
    p_v: flattenCoordinates(potreroCoords),
    p_tw: 3.0,
    t_w: 3.0,
    p_open: 0
  };

  const client = mqtt.connect('mqtt://broker.hivemq.com:1883');
  client.on('connect', () => {
    const topics = [
      'collarnet/lzambrano/COW-001/config',
      'collarnet/lzambrano/COW-001/cmd',
      'collarnet/lzambrano/864643061445526/config',
      'collarnet/lzambrano/864643061445526/cmd'
    ];

    let pending = topics.length;
    topics.forEach(t => {
      client.publish(t, JSON.stringify(configPayload), { qos: 1, retain: t.endsWith('/config') }, (err) => {
        if (err) console.error('Error publicando en', t, err);
        else console.log('✅ Publicado exitosamente en:', t);
        pending--;
        if (pending === 0) {
          client.end();
          pool.end();
          console.log('🎉 ¡COW-001 configurado a Red Celular (Digitel 4G LTE) exitosamente!');
          process.exit(0);
        }
      });
    });
  });
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
