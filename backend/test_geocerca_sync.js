import http from 'http';
import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

async function testGeocercaSync() {
  console.log('--- TEST SINCRONIZACIÓN GEOCERCAS APP TÉCNICO -> WEB ---');
  
  const socket = io('http://localhost:3500');
  let eventReceived = false;

  socket.on('connect', () => {
    console.log('✅ Socket.io conectado al servidor (ID:', socket.id, ')');
  });

  socket.on('geocercas_actualizadas', (data) => {
    console.log('📢 Evento recibido: geocercas_actualizadas ->', data);
    eventReceived = true;
  });

  socket.on('datos_actualizados', (data) => {
    console.log('📢 Evento recibido: datos_actualizados ->', data);
  });

  await new Promise(r => setTimeout(r, 1000));

  // 1. Crear Hato desde app técnico
  console.log('\n1. Enviando POST /api/geocercas/hato (Hato El Samán)...');
  const hatoRes = await makeRequest('POST', '/api/geocercas/hato', {
    nombre: 'Hato El Samán',
    tenantId: 1,
    vertices: [
      [9.100, -67.100],
      [9.100, -67.090],
      [9.090, -67.090],
      [9.090, -67.100]
    ]
  });
  console.log('Respuesta Hato:', hatoRes);

  await new Promise(r => setTimeout(r, 500));

  // 2. Crear Potrero dentro del Hato
  console.log('\n2. Enviando POST /api/geocercas/potrero (Potrero Alpha)...');
  const potreroRes = await makeRequest('POST', '/api/geocercas/potrero', {
    hatoId: hatoRes.id,
    nombre: 'Potrero Alpha',
    capacidad: 40,
    margenAdvertencia: 15,
    vertices: [
      [9.098, -67.098],
      [9.098, -67.092],
      [9.092, -67.092],
      [9.092, -67.098]
    ]
  });
  console.log('Respuesta Potrero:', potreroRes);

  await new Promise(r => setTimeout(r, 1000));

  // 3. Consultar Geocercas (lo que hace la web)
  console.log('\n3. Consultando GET /api/geocercas?tenantId=1...');
  const geocercas = await makeRequest('GET', '/api/geocercas?tenantId=1');
  console.log(`Hatos totales: ${geocercas.hatos.length}`);
  console.log(`Potreros totales: ${geocercas.potreros.length}`);

  const hatoFound = geocercas.hatos.find(h => h.nombre === 'Hato El Samán');
  const potreroFound = geocercas.potreros.find(p => p.nombre === 'Potrero Alpha');

  console.log('\n=== RESULTADO DE VALIDACIÓN ===');
  console.log('Hato persistido:', hatoFound ? '✅ SÍ (ID: ' + hatoFound.id + ')' : '❌ NO');
  console.log('Potrero persistido:', potreroFound ? '✅ SÍ (ID: ' + potreroFound.id + ')' : '❌ NO');
  console.log('Evento Socket.io recibido en tiempo real:', eventReceived ? '✅ SÍ' : '❌ NO');

  socket.disconnect();
  process.exit(0);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3500,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

testGeocercaSync().catch(console.error);
