import pg from 'pg';
import mqtt from 'mqtt';
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
    // pt is [lon, lat] -> firmware expects [lat, lon]
    flat.push(parseFloat(pt[1]));
    flat.push(parseFloat(pt[0]));
  }
  return flat;
}

async function run() {
  console.log('--- 1. Actualizando / Verificando Hato Oficina en PostgreSQL ---');
  // Asegurar que el Hato oficina tenga el polígono completo y margen de 1m
  await pool.query(`
    UPDATE hatos 
    SET perimetro = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
        margen_advertencia_metros = 1.00
    WHERE id = 9;
  `, [JSON.stringify(hatoOficinaGeoJSON)]);

  const hRes = await pool.query("SELECT id, nombre, margen_advertencia_metros FROM hatos WHERE id = 9");
  console.log('Hato Oficina:', hRes.rows[0]);

  console.log('--- 2. Creando / Asegurando Potrero A en Hato Oficina ---');
  let potreroRes = await pool.query("SELECT id, nombre, hato_id, margen_advertencia_metros FROM potreros WHERE hato_id = 9 AND LOWER(nombre) LIKE '%potrero a%'");
  let potreroId;

  if (potreroRes.rows.length === 0) {
    const insertPotrero = await pool.query(`
      INSERT INTO potreros (hato_id, nombre, perimetro, capacidad_max_cabezas, margen_advertencia_metros, estado, modo_arreo_activo, creado_en)
      VALUES (9, 'Potrero A', ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 10, 3.00, 'ABIERTO', false, NOW())
      RETURNING id, nombre, hato_id, margen_advertencia_metros;
    `, [JSON.stringify(potreroAGeoJSON)]);
    potreroId = insertPotrero.rows[0].id;
    console.log('Potrero A creado en Hato oficina con ID:', potreroId);
  } else {
    potreroId = potreroRes.rows[0].id;
    await pool.query(`
      UPDATE potreros 
      SET perimetro = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
          margen_advertencia_metros = 3.00,
          estado = 'ABIERTO'
      WHERE id = $2;
    `, [JSON.stringify(potreroAGeoJSON), potreroId]);
    console.log('Potrero A actualizado con ID:', potreroId);
  }

  console.log('--- 3. Registrando y Vinculando COW-002 y Arete VAC-002 ---');
  // Asegurar que COW-002 exista en collares
  await pool.query(`
    INSERT INTO collares (id, numero_sim, tenant_id, imei, mac_address, activo, estado, version_firmware, nivel_bateria, creado_en)
    VALUES ('COW-002', '+584120000002', 6, '14:63:93:4B:C1:48', '14:63:93:4B:C1:48', true, 'ACTIVO', '1.0.0', 100, NOW())
    ON CONFLICT (id) DO UPDATE SET 
      imei = '14:63:93:4B:C1:48', 
      mac_address = '14:63:93:4B:C1:48', 
      activo = true, 
      estado = 'ACTIVO';
  `);

  // Vincular animal VAC-002 (ID 7) a COW-002, Hato 9 (oficina) y Potrero A
  await pool.query(`
    UPDATE animales 
    SET collar_id = 'COW-002',
        hato_id = 9,
        potrero_id = $1,
        arete_visual = 'VAC-002',
        activo = true
    WHERE id = 7;
  `, [potreroId]);

  // También asegurar que VACA-001 (COW-001) esté en Hato 9 y Potrero A
  await pool.query(`
    UPDATE animales 
    SET hato_id = 9,
        potrero_id = $1,
        activo = true
    WHERE collar_id = 'COW-001';
  `, [potreroId]);

  const verifyAnimals = await pool.query(`
    SELECT a.id, a.arete_visual, a.collar_id, h.nombre as hato_nom, p.nombre as potrero_nom, p.margen_advertencia_metros as margen_potrero
    FROM animales a
    LEFT JOIN hatos h ON a.hato_id = h.id
    LEFT JOIN potreros p ON a.potrero_id = p.id
    WHERE a.collar_id IN ('COW-001', 'COW-002')
    ORDER BY a.collar_id ASC;
  `);
  console.log('Animales vinculados en BD:', verifyAnimals.rows);

  console.log('--- 4. Actualizando Almacén Local local_store.json ---');
  const storePath = path.join(__dirname, '../config/local_store.json');
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    
    // Verificar o añadir animal 2
    let animal2 = store.animales.find(a => a.collar_id === 'COW-002' || a.id === 2);
    if (!animal2) {
      animal2 = {
        id: 2,
        animal_id: 2,
        arete: "VAC-002",
        arete_visual: "VAC-002",
        raza: "Brahman",
        categoria: "Novillo",
        sexo: "Macho",
        foto_url: null,
        numero_hierro: "H-002",
        tenant_id: 6,
        tenant_nombre: "Hacienda Santa Inés",
        propietario_id: 3,
        propietario_nombre: "Renier Morales",
        fecha_nacimiento: "2023-01-15",
        collar_id: "COW-002",
        collar_activo: true,
        numero_sim: "+584120000002",
        nivel_bateria: 100,
        senal_celular: 5,
        esta_cargando: false,
        voltaje_mv: 4227,
        medio_red: "WIFI",
        gps_encendido: true,
        gps_fijado: false,
        satelites_visibles: 0,
        preferencia_red: "WIFI",
        ultima_conexion: new Date().toISOString(),
        version_firmware: "1.0.0",
        latitud: 10.6713,
        longitud: -71.6042,
        potrero_id: 10,
        potrero_nombre: "Potrero A",
        potrero_asignado_nombre: "Potrero A",
        hato_id: 7,
        hato_nombre: "oficina",
        peso_actual: 450,
        estado_alerta: "NORMAL",
        estado_cerca: "DENTRO",
        activo: true
      };
      store.animales.push(animal2);
    } else {
      animal2.collar_id = 'COW-002';
      animal2.hato_nombre = 'oficina';
      animal2.potrero_nombre = 'Potrero A';
      animal2.potrero_asignado_nombre = 'Potrero A';
    }

    // Asegurar collar COW-002 en collares de store
    let collar2 = store.collares.find(c => c.id === 'COW-002');
    if (!collar2) {
      collar2 = {
        id: "COW-002",
        numero_sim: "+584120000002",
        imei: "14:63:93:4B:C1:48",
        mac_address: "14:63:93:4B:C1:48",
        numero_serie: "PROTO-S3-002",
        estado: "ACTIVO",
        lote_id: null,
        tenant_id: 6,
        tenant_nombre: "Los Corralitos",
        hato_nombre: "oficina",
        animal_raza: "Brahman",
        animal_categoria: "Novillo",
        ubicacion_almacen: "En Campo (Asignado)",
        motivo_estado: "Vinculado a VAC-002",
        esta_cargando: false,
        voltaje_mv: 4227,
        medio_red: "WIFI",
        gps_encendido: true,
        gps_fijado: false,
        satelites_visibles: 0,
        preferencia_red: "WIFI",
        version_firmware: "1.0.0",
        latitud: 10.6713,
        longitud: -71.6042,
        activo: true,
        creado_en: new Date().toISOString(),
        ultima_conexion: new Date().toISOString(),
        animal_id: 2,
        animal_arete: "VAC-002",
        potrero_nombre: "Potrero A",
        arete_visual: "VAC-002"
      };
      store.collares.push(collar2);
    }

    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    console.log('local_store.json actualizado con COW-002.');
  }

  console.log('--- 5. Publicando Geocercas a COW-002 vía MQTT Retain ---');
  const hatoCoords = hatoOficinaGeoJSON.coordinates[0];
  const potreroCoords = potreroAGeoJSON.coordinates[0];

  const payload = {
    collar_activo: true,
    silence: false,
    h_id: 9,
    h_v: flattenCoordinates(hatoCoords),
    h_tw: 1.0,
    p_id: potreroId,
    p_v: flattenCoordinates(potreroCoords),
    p_tw: 3.0,
    t_w: 3.0,
    p_open: 0
  };

  console.log('Payload de sincronización para COW-002:', JSON.stringify(payload, null, 2));

  const client = mqtt.connect('mqtt://broker.hivemq.com:1883');
  client.on('connect', () => {
    const topics = [
      'collarnet/lzambrano/COW-002/config',
      'collarnet/lzambrano/14:63:93:4B:C1:48/config',
      'collarnet/simulacion/COW-002/config'
    ];

    let pending = topics.length;
    topics.forEach(t => {
      client.publish(t, JSON.stringify(payload), { qos: 1, retain: true }, (err) => {
        if (err) console.error('Error publicando en', t, err);
        else console.log('✅ Publicado con éxito en:', t);
        pending--;
        if (pending === 0) {
          client.end();
          pool.end();
          console.log('🎉 ¡Segundo dispositivo COW-002 vinculado exitosamente a VAC-002 en Hato oficina / Potrero A!');
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
