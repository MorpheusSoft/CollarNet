import mqtt from 'mqtt';
import pg from 'pg';

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
  console.log('--- 1. Actualizando preferencia de red a CELULAR en BD para COW-001 y COW-002 ---');
  await pool.query(`
    UPDATE collares 
    SET preferencia_red = 'CELULAR', 
        medio_red = '4G LTE (DIGITEL)'
    WHERE id IN ('COW-001', 'COW-002');
  `);
  console.log('✅ Base de datos actualizada con preferencia CELULAR.');

  console.log('--- 2. Publicando orden de conmutación a RED CELULAR 4G LTE y Geocercas vía MQTT ---');
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
      'collarnet/lzambrano/COW-002/config',
      'collarnet/lzambrano/COW-002/cmd',
      'collarnet/lzambrano/14:63:93:4B:C1:48/config',
      'collarnet/lzambrano/14:63:93:4B:C1:48/cmd'
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
          console.log('🎉 ¡COW-002 configurado a Red Celular 4G LTE Digitel y sincronizado con Hato oficina / Potrero A!');
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
