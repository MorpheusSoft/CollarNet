/**
 * CollarNet API Service Wrapper
 * Handles all REST API communications with the Node.js / Express backend.
 * Full Multi-Tenant & Multi-Owner architecture support.
 */

const API_BASE = '/api';

/**
 * Obtiene el listado de monitoreo con filtros opcionales de multi-tenant
 */
export async function fetchMonitoreo(filters = {}) {
  const params = new URLSearchParams();
  if (filters.tenantId) params.append('tenantId', filters.tenantId);
  if (filters.hatoId) params.append('hatoId', filters.hatoId);
  if (filters.propietarioId) params.append('propietarioId', filters.propietarioId);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/monitoreo${queryStr}`);
  if (!res.ok) throw new Error('Error al obtener datos de monitoreo');
  return res.json();
}

/**
 * Obtiene la lista de collares registrados
 */
export async function fetchCollares(tenantId = null) {
  const queryStr = tenantId ? `?tenantId=${tenantId}` : '';
  const res = await fetch(`${API_BASE}/collares${queryStr}`);
  if (!res.ok) throw new Error('Error al obtener la lista de collares');
  return res.json();
}

/**
 * Obtiene la lista global de propietarios registrados
 */
export async function fetchPropietarios() {
  const res = await fetch(`${API_BASE}/propietarios`);
  if (!res.ok) throw new Error('Error al obtener propietarios');
  return res.json();
}

/**
 * Obtiene el portafolio consolidado de animales de un propietario
 */
export async function fetchPropietarioPortfolio(propietarioId) {
  const res = await fetch(`${API_BASE}/propietarios/${propietarioId}/portfolio`);
  if (!res.ok) throw new Error('Error al obtener el portafolio del propietario');
  return res.json();
}

/**
 * Obtiene las geocercas (hatos y potreros) filtradas por tenant
 */
export async function fetchGeocercasData(tenantId = null) {
  const queryStr = tenantId ? `?tenantId=${tenantId}` : '';
  const res = await fetch(`${API_BASE}/geocercas${queryStr}`);
  if (!res.ok) throw new Error('Error al obtener geocercas');
  return res.json();
}

/**
 * Proyecciones financieras de Ganancia Diaria de Peso (GDP)
 */
export async function fetchProyeccion(animalId) {
  const res = await fetch(`${API_BASE}/proyecciones/${animalId}`);
  if (!res.ok) throw new Error('Error al calcular proyección financiera');
  return res.json();
}

// ==========================================
// GESTIÓN DE GEOCERCAS Y PROTOCOLO MQTT
// ==========================================

export async function syncGeocercas(collarId, hatoId, potreroId) {
  const res = await fetch(`${API_BASE}/geocercas/sincronizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collarId, hatoId, potreroId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al sincronizar geocerca');
  return data;
}

export async function apiGuardarHato(nombre, vertices, tenantId = 1, id = null) {
  const res = await fetch(`${API_BASE}/geocercas/hato`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, nombre, vertices, tenantId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al guardar hato');
  return data;
}

export async function apiGuardarPotrero(nombre, hatoId, vertices, margenAdvertencia = 10, id = null) {
  const res = await fetch(`${API_BASE}/geocercas/potrero`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, nombre, hatoId, vertices, margenAdvertencia })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al guardar potrero');
  return data;
}

export async function apiUpdatePotrero(id, payload) {
  const res = await fetch(`${API_BASE}/geocercas/potrero/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar potrero');
  return data;
}

export async function apiUpdateHato(id, payload) {
  const res = await fetch(`${API_BASE}/geocercas/hato/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar hato');
  return data;
}

export async function apiEliminarHato(id) {
  const res = await fetch(`${API_BASE}/geocercas/hato/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar hato');
  return data;
}

export async function apiEliminarPotrero(id) {
  const res = await fetch(`${API_BASE}/geocercas/potrero/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar potrero');
  return data;
}

export async function apiCrearManual(tipo, nombre, hatoId, vertices, margenAdvertencia = 10) {
  const res = await fetch(`${API_BASE}/geocercas/crear-manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, nombre, hatoId, vertices, margenAdvertencia })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear geocerca manual');
  return data;
}

export async function apiCrearIA(formData) {
  const res = await fetch(`${API_BASE}/geocercas/crear-ia`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la extracción con IA');
  return data;
}

export async function apiEscalarGeocerca(tipo, id, anchoMetros, largoMetros) {
  const res = await fetch(`${API_BASE}/geocercas/escalar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, id, anchoMetros, largoMetros })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al redimensionar geocerca');
  return data;
}

// ==========================================
// ALTAS DE DATOS (PROPIETARIOS, COLLARES, RESES)
// ==========================================

export async function registrarPropietario(payload) {
  const res = await fetch(`${API_BASE}/propietarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar dueño');
  return data;
}

export async function apiUpdatePropietario(id, payload) {
  const res = await fetch(`${API_BASE}/propietarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar propietario');
  return data;
}

export async function registrarCollar(payload) {
  const res = await fetch(`${API_BASE}/collares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar collar');
  return data;
}

export async function updateCollarStatus(collarId, activo) {
  const res = await fetch(`${API_BASE}/collares/${collarId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar estado del collar');
  return data;
}

export async function registrarAnimal(payload) {
  const res = await fetch(`${API_BASE}/animales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar animal');
  return data;
}

export async function registrarPesaje(payload) {
  const res = await fetch(`${API_BASE}/pesajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al guardar pesaje');
  return data;
}

export async function registrarRendimiento(payload) {
  const res = await fetch(`${API_BASE}/rendimiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al guardar rendimiento');
  return data;
}

// ==========================================
// MÓDULO MULTI-TENANT (ADQUIRENTES / CLIENTES SAAS)
// ==========================================

export async function fetchTenants() {
  const res = await fetch(`${API_BASE}/tenants`);
  if (!res.ok) throw new Error('Error al obtener la lista de adquirentes');
  return res.json();
}

export async function createTenant(payload) {
  const res = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar adquirente');
  return data;
}

export async function updateTenant(id, payload) {
  const res = await fetch(`${API_BASE}/tenants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar adquirente');
  return data;
}

export async function updateTenantStatus(id, activo) {
  const res = await fetch(`${API_BASE}/tenants/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar estado');
  return data;
}

export async function fetchTenantHatos(tenantId) {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/hatos`);
  if (!res.ok) throw new Error('Error al obtener hatos del adquirente');
  return res.json();
}

// ==========================================
// AUTENTICACIÓN Y USUARIOS
// ==========================================

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
  return data;
}

export async function apiRegisterUser(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar usuario');
  return data;
}

export async function apiFetchUsers(tenantId = null) {
  const queryStr = tenantId ? `?tenantId=${tenantId}` : '';
  const res = await fetch(`${API_BASE}/auth/usuarios${queryStr}`);
  if (!res.ok) throw new Error('Error al obtener lista de usuarios');
  return res.json();
}

export async function apiUpdateUser(id, payload) {
  const res = await fetch(`${API_BASE}/auth/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar usuario');
  return data;
}

export async function apiToggleUserStatus(id, activo) {
  const res = await fetch(`${API_BASE}/auth/usuarios/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar estado del usuario');
  return data;
}

export async function apiFetchPropietarioHatos(propietarioId) {
  const res = await fetch(`${API_BASE}/propietarios/${propietarioId}/hatos`);
  if (!res.ok) throw new Error('Error al obtener los hatos del propietario');
  return res.json();
}

// ==========================================
// MÓDULO DE INVENTARIO DE COLLARES COWIA
// ==========================================

export async function fetchCollaresInventario(filters = {}, user = {}) {
  const params = new URLSearchParams();
  if (user.rol) params.append('userRole', user.rol);
  if (user.tenantId) params.append('userTenantId', user.tenantId);
  if (filters.estado && filters.estado !== 'TODOS') params.append('estado', filters.estado);
  if (filters.loteId && filters.loteId !== 'TODOS') params.append('loteId', filters.loteId);
  if (filters.tenantId && filters.tenantId !== 'TODOS') params.append('tenantId', filters.tenantId);
  if (filters.search) params.append('search', filters.search);
  if (filters.bateriaMin) params.append('bateriaMin', filters.bateriaMin);
  if (filters.bateriaMax) params.append('bateriaMax', filters.bateriaMax);

  const res = await fetch(`${API_BASE}/collares/inventario?${params.toString()}`, {
    headers: {
      'x-user-role': user.rol || 'SUPERADMIN',
      'x-user-tenant-id': user.tenantId ? String(user.tenantId) : ''
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener inventario de collares');
  return data;
}

export async function fetchCollaresKPIs(user = {}) {
  const params = new URLSearchParams();
  if (user.rol) params.append('userRole', user.rol);
  if (user.tenantId) params.append('userTenantId', user.tenantId);

  const res = await fetch(`${API_BASE}/collares/kpis?${params.toString()}`, {
    headers: {
      'x-user-role': user.rol || 'SUPERADMIN',
      'x-user-tenant-id': user.tenantId ? String(user.tenantId) : ''
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener KPIs de collares');
  return data;
}

export async function fetchCollaresLotes() {
  const res = await fetch(`${API_BASE}/collares/lotes`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener lotes de collares');
  return data;
}

export async function registrarCollarIndividual(collarData, user = {}) {
  const res = await fetch(`${API_BASE}/collares/individual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': user.rol || 'SUPERADMIN'
    },
    body: JSON.stringify({ ...collarData, userRole: user.rol, usuarioId: user.id })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar collar');
  return data;
}

export async function registrarCollaresLote(loteData, user = {}) {
  const res = await fetch(`${API_BASE}/collares/lotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': user.rol || 'SUPERADMIN'
    },
    body: JSON.stringify({ ...loteData, userRole: user.rol, usuarioId: user.id })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar lote de collares');
  return data;
}

export async function trasladarCollar(collarId, trasladoData, user = {}) {
  const res = await fetch(`${API_BASE}/collares/${collarId}/traslado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': user.rol || 'SUPERADMIN'
    },
    body: JSON.stringify({ ...trasladoData, userRole: user.rol, usuarioId: user.id })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al realizar traslado');
  return data;
}

export async function cambiarEstadoCollar(collarId, estadoData, user = {}) {
  const res = await fetch(`${API_BASE}/collares/${collarId}/estado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': user.rol || 'SUPERADMIN',
      'x-user-tenant-id': user.tenantId ? String(user.tenantId) : ''
    },
    body: JSON.stringify({ ...estadoData, userRole: user.rol, userTenantId: user.tenantId, usuarioId: user.id })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar estado del collar');
  return data;
}

export async function fetchCollarHistorial(collarId) {
  const res = await fetch(`${API_BASE}/collares/${collarId}/historial`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar historial del collar');
  return data;
}

export async function fetchAnimalGenealogia(animalId) {
  const res = await fetch(`${API_BASE}/animales/${animalId}/genealogia`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener genealogía del animal');
  return data;
}

export async function traspasarAnimal(animalId, traspasoData) {
  const res = await fetch(`${API_BASE}/animales/${animalId}/traspaso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(traspasoData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al traspasar animal');
  return data;
}

export async function darBajaAnimal(animalId, bajaData) {
  const res = await fetch(`${API_BASE}/animales/${animalId}/baja`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bajaData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al procesar baja del animal');
  return data;
}

export async function fetchAnimalHistorialPropietarios(animalId) {
  const res = await fetch(`${API_BASE}/animales/${animalId}/historial-propietarios`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar historial de propietarios');
  return data;
}

// ==========================================
// SANIDAD Y VACUNACIÓN
// ==========================================

export async function fetchMedicamentos(tenantId) {
  const url = tenantId ? `${API_BASE}/sanidad/medicamentos?tenantId=${tenantId}` : `${API_BASE}/sanidad/medicamentos`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar catálogo de medicamentos');
  return data;
}

export async function registrarMedicamento(payload) {
  const res = await fetch(`${API_BASE}/sanidad/medicamentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar medicamento');
  return data;
}

export async function fetchEventosSanitarios(params = {}) {
  const query = new URLSearchParams();
  if (params.tenantId) query.append('tenantId', params.tenantId);
  if (params.animalId) query.append('animalId', params.animalId);
  if (params.tipo) query.append('tipo', params.tipo);

  const res = await fetch(`${API_BASE}/sanidad/eventos?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar historial sanitario');
  return data;
}

export async function aplicarTratamientoSanitario(payload) {
  const res = await fetch(`${API_BASE}/sanidad/aplicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar aplicación sanitaria');
  return data;
}

export async function fetchSanidadKpis(tenantId) {
  const url = tenantId ? `${API_BASE}/sanidad/kpis?tenantId=${tenantId}` : `${API_BASE}/sanidad/kpis`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar KPIs sanitarios');
  return data;
}

// ==========================================
// REPRODUCCIÓN, PALPACIÓN Y MATERNIDAD
// ==========================================

export async function fetchServiciosReproductivos(params = {}) {
  const query = new URLSearchParams();
  if (params.tenantId) query.append('tenantId', params.tenantId);
  if (params.vacaId) query.append('vacaId', params.vacaId);
  if (params.estado) query.append('estado', params.estado);

  const res = await fetch(`${API_BASE}/reproduccion/servicios?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar servicios reproductivos');
  return data;
}

export async function registrarServicioReproductivo(payload) {
  const res = await fetch(`${API_BASE}/reproduccion/servicios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar servicio reproductivo');
  return data;
}

export async function registrarPalpacion(payload) {
  const res = await fetch(`${API_BASE}/reproduccion/palpaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar diagnóstico de palpación');
  return data;
}

export async function fetchPartos(params = {}) {
  const query = new URLSearchParams();
  if (params.tenantId) query.append('tenantId', params.tenantId);
  if (params.vacaId) query.append('vacaId', params.vacaId);

  const res = await fetch(`${API_BASE}/reproduccion/partos?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar registro de partos');
  return data;
}

export async function registrarParto(payload) {
  const res = await fetch(`${API_BASE}/reproduccion/partos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar parto');
  return data;
}

export async function fetchReproduccionKpis(tenantId) {
  const url = tenantId ? `${API_BASE}/reproduccion/kpis?tenantId=${tenantId}` : `${API_BASE}/reproduccion/kpis`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar KPIs reproductivos');
  return data;
}

// ==========================================
// NOTIFICACIONES MULTICANAL
// ==========================================

export async function fetchNotificacionesConfig(tenantId) {
  const url = tenantId ? `${API_BASE}/notificaciones/configuracion?tenantId=${tenantId}` : `${API_BASE}/notificaciones/configuracion`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar configuración de notificaciones');
  return data;
}

export async function updateNotificacionesConfig(payload) {
  const res = await fetch(`${API_BASE}/notificaciones/configuracion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al guardar configuración de notificaciones');
  return data;
}

export async function probarCanalNotificacion(payload) {
  const res = await fetch(`${API_BASE}/notificaciones/probar-canal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al probar canal');
  return data;
}

export async function fetchNotificacionesBitacora(tenantId) {
  const url = tenantId ? `${API_BASE}/notificaciones/bitacora?tenantId=${tenantId}` : `${API_BASE}/notificaciones/bitacora`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar bitácora de alertas');
  return data;
}

// ==========================================
// SALUD, ACTIVIDAD Y RUMIA (IMU)
// ==========================================

export async function fetchSaludRumiaHato(tenantId) {
  const url = tenantId ? `${API_BASE}/salud-rumia/resumen-hato?tenantId=${tenantId}` : `${API_BASE}/salud-rumia/resumen-hato`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar métricas de salud y rumia');
  return data;
}

export async function fetchSaludRumiaAnimal(animalId) {
  const res = await fetch(`${API_BASE}/salud-rumia/animal/${animalId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al consultar curva de actividad del animal');
  return data;
}


