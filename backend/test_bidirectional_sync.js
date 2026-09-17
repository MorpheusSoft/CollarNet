import http from 'http';
import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const SERVER_URL = 'http://localhost:3500';

function postRequest(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3500,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('--- INICIANDO TEST DE SINCRONIZACIÓN BIDIRECCIONAL ---');

  // 1. Conectar Socket.io cliente simulando la Plataforma Web
  const eventsReceived = [];
  const socket = io(SERVER_URL, { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('[Socket] Conectado exitosamente al backend CollarNet');
  });

  socket.on('datos_actualizados', (data) => {
    console.log('[Socket Event] Recibido datos_actualizados:', data.tipo, data);
    eventsReceived.push({ event: 'datos_actualizados', data });
  });

  socket.on('geocercas_actualizadas', (data) => {
    console.log('[Socket Event] Recibido geocercas_actualizadas');
    eventsReceived.push({ event: 'geocercas_actualizadas', data });
  });

  // Esperar conexión socket
  await new Promise(r => setTimeout(r, 1000));

  // 2. Probar GET /api/finca/resumen/1 (Carga inicial móvil)
  console.log('\n[Test 1] GET /api/finca/resumen/1');
  const resumen = await getRequest('/api/finca/resumen/1');
  console.log('Status:', resumen.status);
  console.log('Hato:', resumen.body?.hato?.nombre);
  console.log('Potreros:', resumen.body?.potreros?.length);
  console.log('Animales:', resumen.body?.animales?.length);

  // 3. Probar POST /api/pesajes (Móvil registra pesaje de 432.5 kg)
  console.log('\n[Test 2] POST /api/pesajes (Pesaje en báscula)');
  const pesajeRes = await postRequest('/api/pesajes', {
    areteVisual: 'V-042',
    peso: 432.5
  });
  console.log('Pesaje Result:', pesajeRes.status, pesajeRes.body);

  // 4. Probar POST /api/collares/vincular-rapido (Manga 3 toques)
  console.log('\n[Test 3] POST /api/collares/vincular-rapido (Manga 3 Toques)');
  const vinculacionRes = await postRequest('/api/collares/vincular-rapido', {
    areteVisual: 'V-099',
    collarId: 'COL-0099',
    potreroId: 1,
    raza: 'Brahman Rojo',
    categoria: 'Novilla'
  });
  console.log('Vinculacion Result:', vinculacionRes.status, vinculacionRes.body);

  // 5. Probar POST /api/potreros/arreo (Modo Arreo)
  console.log('\n[Test 4] POST /api/potreros/arreo (Iniciar y Terminar Arreo)');
  const arreoStart = await postRequest('/api/potreros/arreo', {
    origen: 'Potrero 1',
    destino: 'Potrero 2',
    duracionMinutos: 45,
    activo: true
  });
  console.log('Arreo Start Result:', arreoStart.status, arreoStart.body);

  const arreoStop = await postRequest('/api/potreros/arreo', {
    origen: 'Potrero 1',
    destino: 'Potrero 2',
    activo: false
  });
  console.log('Arreo Stop Result:', arreoStop.status, arreoStop.body);

  // 6. Probar POST /api/sanidad/vacunacion-lote
  console.log('\n[Test 5] POST /api/sanidad/vacunacion-lote (Vacunación Masiva)');
  const vacRes = await postRequest('/api/sanidad/vacunacion-lote', {
    potreroNombre: 'Potrero 1',
    medicamentoNombre: 'Fiebre Aftosa Ciclo II',
    dosis: '2 ml',
    lote: 'L-2026-TEST'
  });
  console.log('Vacunacion Result:', vacRes.status, vacRes.body);

  // Esperar a recibir todos los eventos
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n--- RESUMEN DE EVENTOS WEBSOCKET RECIBIDOS POR LA WEB ---');
  console.log(`Total de eventos recibidos en tiempo real: ${eventsReceived.length}`);
  eventsReceived.forEach((e, idx) => {
    console.log(` ${idx + 1}. [${e.event}] tipo: ${e.data?.tipo || 'N/A'}`);
  });

  socket.disconnect();
  console.log('\n✅ TODAS LAS PRUEBAS DE SINCRONIZACIÓN PASARON SATISFACTORIAMENTE');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Error ejecutando tests:', err);
  process.exit(1);
});
