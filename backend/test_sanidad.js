import http from 'http';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('--- 1. GET /api/sanidad/medicamentos ---');
  const meds = await request({ hostname: '127.0.0.1', port: 3500, path: '/api/sanidad/medicamentos', method: 'GET' });
  console.log('Meds count:', meds.data.length, meds.data.map(m => m.nombre));

  console.log('\n--- 2. GET /api/sanidad/eventos (Inicial) ---');
  const evtsInit = await request({ hostname: '127.0.0.1', port: 3500, path: '/api/sanidad/eventos', method: 'GET' });
  console.log('Eventos count:', evtsInit.data.length);

  console.log('\n--- 3. POST /api/sanidad/vacunacion-lote (Simulando App Móvil) ---');
  const vacRes = await request({
    hostname: '127.0.0.1',
    port: 3500,
    path: '/api/sanidad/vacunacion-lote',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    potreroNombre: 'Potrero A1 - Pastura Norte',
    medicamentoNombre: 'Fiebre Aftosa Bivalente',
    tipo: 'VACUNA',
    dosis: '2 ml Subcutánea',
    lote: 'L-AFT-2026-X'
  });
  console.log('Resultado vacunación:', vacRes.data);

  console.log('\n--- 4. GET /api/sanidad/eventos (Tras Vacunación Masiva) ---');
  const evtsAfter = await request({ hostname: '127.0.0.1', port: 3500, path: '/api/sanidad/eventos', method: 'GET' });
  console.log('Eventos después de vacunación:', evtsAfter.data.length);
  evtsAfter.data.forEach(e => {
    console.log(`- [ID: ${e.id}] Arete: ${e.arete_visual} | Med: ${e.medicamento_nombre} | Dosis: ${e.dosis_aplicada} | Lote: ${e.lote_medicamento} | Revacunación: ${e.fecha_proxima_dosis} (${e.estado_revacunacion})`);
  });
}

run().catch(console.error);
