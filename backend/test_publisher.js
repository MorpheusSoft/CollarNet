import pool from './config/db.js';
import { verticesToWKT } from './services/geofenceService.js';
import mqtt from 'mqtt';
import http from 'http';

// Configuración
const COLLAR_ID = 'collar_test_001';
const PREFIX = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
const PUB_TOPIC = `${PREFIX}/${COLLAR_ID}/telemetria`;

// Coordenadas del Hato (Polígono rectangular ~220m x 220m)
const hatoVertices = [
  [9.1010, -67.1010], // Noroeste
  [9.1010, -67.0990], // Noreste
  [9.0990, -67.0990], // Sureste
  [9.0990, -67.1010]  // Suroeste
];

// Coordenadas del Potrero 1 (Mitad Izquierda del Hato)
const potrero1Vertices = [
  [9.1010, -67.1010], // Noroeste
  [9.1010, -67.1000], // Noreste (Línea divisoria central)
  [9.0990, -67.1000], // Sureste
  [9.0990, -67.1010]  // Suroeste
];

// Ruta del animal simulada
const route = [
  { step: 1, lat: 9.1000, lon: -67.1005, bat: 95, sig: 4, desc: 'Paso 1: Centro del Potrero 1 (Seguro - NORMAL)' },
  { step: 2, lat: 9.1000, lon: -67.0995, bat: 94, sig: 3, desc: 'Paso 2: Dentro de Potrero 2, pero asignado a Potrero 1 (Infracción - INFRACCION_ROTACION)' },
  { step: 3, lat: 9.1000, lon: -67.0988, bat: 93, sig: 2, desc: 'Paso 3: Escape exterior al este del Hato (Peligro - ESCAPE_HATO)' },
  { step: 4, lat: 9.1000, lon: -67.1005, bat: 92, sig: 5, desc: 'Paso 4: Retorno y rearme en Potrero 1 (Seguro - NORMAL de nuevo)' }
];

function makeGetRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function seedDatabase() {
  console.log('[Test Setup] Limpiando y preparando base de datos...');
  
  // Limpiar base de datos para pruebas limpias
  await pool.query('DELETE FROM alertas;');
  await pool.query('DELETE FROM telemetria;');
  await pool.query('DELETE FROM registro_pesajes;');
  await pool.query('DELETE FROM animales WHERE collar_id = $1;', [COLLAR_ID]);
  await pool.query('DELETE FROM collares WHERE id = $1;', [COLLAR_ID]);
  await pool.query('DELETE FROM potreros WHERE nombre IN ($1);', ['Potrero Test 1']);
  await pool.query('DELETE FROM hatos WHERE nombre = $1;', ['Hato Test Principal']);
  await pool.query('DELETE FROM propietarios WHERE documento_identidad = $1;', ['123456789']);

  // 1. Crear Propietario
  const { rows: propRows } = await pool.query(`
    INSERT INTO propietarios (nombre, documento_identidad, telefono, correo)
    VALUES ($1, $2, $3, $4) RETURNING id;
  `, ['Luis Zambrano (Propietario Test)', '123456789', '+584121112233', 'luis@collarnet.com']);
  const propietarioId = propRows[0].id;

  // 2. Crear Hato
  const hatoWKT = verticesToWKT(hatoVertices);
  const { rows: hatoRows } = await pool.query(`
    INSERT INTO hatos (nombre, perimetro)
    VALUES ($1, ST_GeomFromText($2, 4326)) RETURNING id;
  `, ['Hato Test Principal', hatoWKT]);
  const hatoId = hatoRows[0].id;

  // 3. Crear Potrero
  const potreroWKT = verticesToWKT(potrero1Vertices);
  const { rows: potreroRows } = await pool.query(`
    INSERT INTO potreros (hato_id, nombre, perimetro, capacidad_max_cabezas)
    VALUES ($1, $2, ST_GeomFromText($3, 4326), $4) RETURNING id;
  `, [hatoId, 'Potrero Test 1', potreroWKT, 30]);
  const potreroId = potreroRows[0].id;

  // 4. Crear Collar
  await pool.query(`
    INSERT INTO collares (id, numero_sim, fecha_instalacion)
    VALUES ($1, $2, NOW());
  `, [COLLAR_ID, '+584129999999']);

  // 5. Crear Animal (Vinculado a Collar, Propietario y Potrero 1)
  const { rows: animalRows } = await pool.query(`
    INSERT INTO animales (collar_id, propietario_id, potrero_id, arete_visual, raza, categoria, fecha_nacimiento)
    VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01') RETURNING id;
  `, [COLLAR_ID, propietarioId, potreroId, 'arete-demo-01', 'Nelore', 'Novillo']);
  const animalId = animalRows[0].id;

  // 6. Configurar Parámetros de Rendimiento para Nelore Novillo
  await pool.query(`
    INSERT INTO parametros_rendimiento (raza, categoria, gdp_promedio, peso_adulto_esperado, costo_diario_manutencion, precio_mercado_por_kg)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (raza, categoria) DO NOTHING;
  `, ['Nelore', 'Novillo', 0.850, 550.00, 1.20, 2.10]);

  // 7. Registrar Peso Inicial
  await pool.query(`
    INSERT INTO registro_pesajes (animal_id, peso, fecha_pesaje)
    VALUES ($1, $2, CURRENT_DATE - 30); -- Pesaje hace 30 días
  `, [animalId, 320.00]);

  await pool.query(`
    INSERT INTO registro_pesajes (animal_id, peso, fecha_pesaje)
    VALUES ($1, $2, CURRENT_DATE); -- Pesaje hoy
  `, [animalId, 345.50]);

  console.log('[Test Setup] Base de datos sembrada exitosamente.');
  return { animalId, hatoId, potreroId };
}

async function runTest() {
  // Inicializar base de datos
  const { animalId, hatoId, potreroId } = await seedDatabase();

  console.log('\n[Test MQTT] Conectando con el broker MQTT...');
  const client = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883');

  client.on('connect', async () => {
    console.log('[Test MQTT] Conectado. Iniciando simulación de caminata...');

    for (const point of route) {
      console.log(`\n--------------------------------------------------`);
      console.log(`[Simulación] Publicando ${point.desc}`);
      
      const payload = {
        lat: point.lat,
        lon: point.lon,
        bat: point.bat,
        sig: point.sig
      };

      client.publish(PUB_TOPIC, JSON.stringify(payload));
      console.log(`[Simulación] Mensaje enviado a: ${PUB_TOPIC}`);

      // Esperar 3 segundos para dar tiempo al backend de procesar
      await new Promise(r => setTimeout(r, 3000));

      // Consultar las alertas activas en la BD para verificar
      const { rows: alerts } = await pool.query(
        'SELECT tipo, estado FROM alertas WHERE animal_id = $1 ORDER BY id DESC LIMIT 1;',
        [animalId]
      );
      if (alerts.length > 0) {
        console.log(`[Base de Datos] Alerta en BD: Tipo = ${alerts[0].tipo} | Estado = ${alerts[0].estado}`);
      } else {
        console.log('[Base de Datos] Sin alertas en la base de datos.');
      }
    }

    console.log(`\n==================================================`);
    console.log('[API REST Test] Consultando Endpoints del Servidor...');
    console.log(`==================================================`);

    try {
      // Test de Monitoreo
      console.log('1. Consultando /api/animales/monitoreo...');
      const monitoreoRes = await makeGetRequest('http://localhost:3500/api/animales/monitoreo');
      console.log('Resultado de Monitoreo:', JSON.stringify(monitoreoRes, null, 2));

      // Test de Proyección
      console.log('\n2. Consultando /api/proyecciones...');
      const proyeccionRes = await makeGetRequest(`http://localhost:3500/api/proyecciones/${animalId}`);
      console.log('Resultado de Proyección:', JSON.stringify(proyeccionRes, null, 2));

      console.log('\n[API REST Test] Sincronizando geocercas...');
      // Test de Sincronización
      const postData = JSON.stringify({
        collarId: COLLAR_ID,
        hatoId: hatoId,
        potreroId: potreroId
      });

      const req = http.request({
        hostname: 'localhost',
        port: 3500,
        path: '/api/geocercas/sincronizar',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log('Respuesta de Sincronización:', JSON.stringify(JSON.parse(body), null, 2));
          console.log('\n[Prueba E2E] ¡Todo ha funcionado perfectamente!');
          client.end();
          pool.end();
          process.exit(0);
        });
      });
      req.write(postData);
      req.end();

    } catch (err) {
      console.error('[Error de Prueba]', err);
      client.end();
      pool.end();
      process.exit(1);
    }
  });
}

runTest();
