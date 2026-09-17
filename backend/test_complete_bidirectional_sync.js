import http from 'http';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3500,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPERADMIN',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' INICIANDO TEST DE SINCRONIZACIÓN BIDIRECCIONAL COMPLETA');
  console.log(' (Web ⟷ App Usuario CowIA Finca ⟷ App Técnico CowIA)');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // ----------------------------------------------------
  // FASE 1: WEB -> APP USUARIO & APP TÉCNICO
  // ----------------------------------------------------
  console.log('--- [FASE 1] Datos creados en WEB -> Visibles en Móvil Usuario & Técnico ---');

  // 1.0 Web registra un nuevo Adquirente / Tenant
  const tenantRes = await request('POST', '/api/tenants', {
    nombre: 'Agropecuaria El Porvenir C.A.',
    identificacionFiscal: 'J-50998877-0',
    contactoNombre: 'Dr. Roberto Mendoza',
    telefono: '+584145558899',
    email: 'contacto@elporvenir.com',
    direccion: 'Socopó, Barinas',
    planSuscripcion: 'ENTERPRISE',
    limiteCollares: 300,
    limiteHatos: 20,
    permiteCrearPotreros: true
  });
  assert(tenantRes.status === 201 || tenantRes.status === 200, `Adquirente registrado en Web: ID ${tenantRes.data?.tenant?.id || tenantRes.data?.id}`);
  const createdTenantId = tenantRes.data?.tenant?.id || tenantRes.data?.id || 1;

  // 1.1 Web crea un nuevo Hato vinculado al Tenant
  const hatoRes = await request('POST', '/api/geocercas/hato', {
    nombre: 'Hato San Francisco (Creado en Web)',
    tenantId: createdTenantId,
    vertices: [[8.50, -70.40], [8.52, -70.40], [8.52, -70.38], [8.50, -70.38]]
  });
  assert(hatoRes.status === 201 || hatoRes.status === 200, `Hato creado en Web: ID ${hatoRes.data?.id}`);
  const createdHatoId = hatoRes.data?.id;

  // 1.2 Web crea un nuevo Potrero
  const potRes = await request('POST', '/api/geocercas/potrero', {
    hatoId: createdHatoId,
    nombre: 'Potrero Primavera (Creado en Web)',
    capacidad: 45,
    vertices: [[8.505, -70.395], [8.515, -70.395], [8.515, -70.385], [8.505, -70.385]]
  });
  assert(potRes.status === 201 || potRes.status === 200, `Potrero creado en Web: ID ${potRes.data?.id}`);

  // 1.3 Web crea un nuevo Animal
  const animRes = await request('POST', '/api/animales', {
    areteVisual: 'TORO-WEB-99',
    raza: 'Senepol Puro',
    categoria: 'Toro Reproductor',
    sexo: 'Macho',
    potreroId: potRes.data?.id,
    tenantId: 1
  });
  assert(animRes.status === 201 || animRes.status === 200, `Animal registrado en Web: Arete TORO-WEB-99`);

  // 1.4 Web crea un nuevo Medicamento
  const medRes = await request('POST', '/api/sanidad/medicamentos', {
    nombre: 'Vacuna Clostridial 8 Vías (Web)',
    tipo: 'VACUNA',
    dosisRecomendada: '5 ml Subcutánea',
    periodoRevacunacionDias: 365,
    costoUnitarioEstimado: 3.50,
    laboratorio: 'Sanofi Animal Health'
  });
  assert(medRes.status === 201 || medRes.status === 200, `Medicamento creado en Web: ID ${medRes.data?.id}`);

  // 1.5 VERIFICAR QUE LA APP DEL USUARIO LO VE AHORA MISMO
  console.log('\n  [Comprobando lectura desde App Usuario (finca/resumen)]');
  const userResumen = await request('GET', `/api/finca/resumen/${createdHatoId}`);
  assert(userResumen.status === 200, 'App Usuario responde con código 200');
  assert(userResumen.data?.hato?.nombre === 'Hato San Francisco (Creado en Web)', `App Usuario ve el nuevo Hato: ${userResumen.data?.hato?.nombre}`);
  const potreroEncontrado = (userResumen.data?.potreros || []).some(p => p.nombre === 'Potrero Primavera (Creado en Web)');
  assert(potreroEncontrado, 'App Usuario ve el nuevo Potrero');
  const animalEncontrado = (userResumen.data?.animales || []).some(a => a.areteVisual === 'TORO-WEB-99');
  assert(animalEncontrado, 'App Usuario ve el nuevo Animal registrado en Web');

  // 1.6 VERIFICAR QUE LA APP DEL TÉCNICO LO VE AHORA MISMO
  console.log('\n  [Comprobando lectura desde App Técnico (geocercas/hatos y potreros)]');
  const techHatos = await request('GET', '/api/geocercas/hatos');
  const hatoEnTech = (techHatos.data || []).some(h => h.nombre === 'Hato San Francisco (Creado en Web)');
  assert(hatoEnTech, 'App Técnico ve el nuevo Hato en su lista');

  const techPotreros = await request('GET', '/api/geocercas/potreros');
  const potEnTech = (techPotreros.data || []).some(p => p.nombre === 'Potrero Primavera (Creado en Web)');
  assert(potEnTech, 'App Técnico ve el nuevo Potrero en su lista');

  // ----------------------------------------------------
  // FASE 2: APP USUARIO -> WEB & APP TÉCNICO
  // ----------------------------------------------------
  console.log('\n--- [FASE 2] Datos creados en Móvil Usuario -> Visibles en WEB & Técnico ---');

  // 2.1 App Usuario vincula en manga un collar QR a una res
  const vincularRes = await request('POST', '/api/collares/vincular-rapido', {
    areteVisual: 'TORO-WEB-99',
    collarId: 'COW-QR-8888',
    raza: 'Senepol Puro',
    categoria: 'Toro Reproductor',
    potreroId: potRes.data?.id
  });
  assert(vincularRes.status === 200, `Vinculación rápida en manga: Collar COW-QR-8888 a TORO-WEB-99`);

  // 2.2 App Usuario aplica vacuna masiva en potrero
  const vacRes = await request('POST', '/api/sanidad/vacunacion-lote', {
    potreroNombre: 'Potrero Primavera (Creado en Web)',
    medicamentoNombre: 'Vacuna Clostridial 8 Vías (Web)',
    dosis: '5 ml Subcutánea',
    lote: 'L-CLOST-2026'
  });
  assert(vacRes.status === 201 || vacRes.status === 200, `Vacunación por lote ejecutada desde móvil`);

  // 2.3 App Usuario cambia estado del potrero a DESCANSO
  const estRes = await request('POST', `/api/potreros/${potRes.data?.id}/estado`, {
    estado: 'DESCANSO'
  });
  assert(estRes.status === 200, `Potrero cambiado a DESCANSO desde móvil`);

  // 2.4 VERIFICAR QUE LA WEB VE LOS CAMBIOS DEL USUARIO
  console.log('\n  [Comprobando lectura desde Plataforma Web]');
  const webSanidad = await request('GET', '/api/sanidad/eventos');
  const evtFound = (webSanidad.data || []).some(e => e.arete_visual === 'TORO-WEB-99' && e.medicamento_nombre === 'Vacuna Clostridial 8 Vías (Web)');
  assert(evtFound, 'Web ve el nuevo historial de vacunación registrado desde el móvil');

  const webMonitoreo = await request('GET', '/api/monitoreo');
  const animMonitoreo = (webMonitoreo.data || []).find(a => a.arete_visual === 'TORO-WEB-99');
  assert(animMonitoreo?.collar_id === 'COW-QR-8888', `Web ve el collar ${animMonitoreo?.collar_id} vinculado desde manga`);

  const webPotreros = await request('GET', '/api/geocercas/potreros');
  const potActualizado = (webPotreros.data || []).find(p => p.id === potRes.data?.id);
  assert(potActualizado?.estado === 'DESCANSO', `Web ve el estado del potrero actualizado a ${potActualizado?.estado}`);

  // ----------------------------------------------------
  // FASE 3: APP TÉCNICO -> WEB & APP USUARIO
  // ----------------------------------------------------
  console.log('\n--- [FASE 3] Datos creados en Móvil Técnico -> Visibles en WEB & Usuario ---');

  // 3.1 Técnico registra un lote de 20 collares por escaneo
  const loteTechRes = await request('POST', '/api/collares/lotes', {
    userRole: 'SUPERADMIN',
    codigoLote: 'LOT-TECH-2026',
    proveedor: 'CowIA Shenzhen',
    modo: 'lista',
    collares: [
      { id: 'COW-TECH-001', imei: '869001001', numeroSim: '+58412001' },
      { id: 'COW-TECH-002', imei: '869001002', numeroSim: '+58412002' }
    ]
  });
  assert(loteTechRes.status === 201, 'Lote de collares registrado por Técnico');

  // 3.2 Web e Inventario ven los nuevos collares
  const webCollares = await request('GET', '/api/collares/inventario');
  const collar1 = (webCollares.data || []).some(c => c.id === 'COW-TECH-001');
  assert(collar1, 'Web ve los nuevos collares ingresados por el Técnico');

  // 3.3 App Usuario los ve disponibles para vincular en manga
  const userResumenFinal = await request('GET', `/api/finca/resumen/1`);
  const collarEnAlmacen = (userResumenFinal.data?.collaresDisponibles || []).some(c => c === 'COW-TECH-001' || c === 'COW-TECH-002');
  assert(collarEnAlmacen, 'App Usuario ve los nuevos collares listos para usar en la manga');

  console.log('\n====================================================');
  console.log(` RESULTADO FINAL: ${passed}/${total} PRUEBAS EXITOSAS (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================');
}

runTests().catch(console.error);
