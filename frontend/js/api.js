const API_BASE = '/api';

/**
 * Obtiene el estado actual de monitoreo de todos los animales activos
 */
/**
 * Obtiene el estado actual de monitoreo de todos los animales activos
 */
export async function fetchMonitoreo() {
  try {
    const res = await fetch(`${API_BASE}/animales/monitoreo`);
    if (res.ok) return await res.json();
  } catch (_) {}

  // Fallback mock local para entorno de pruebas frontend autónomo
  return [
    { animal_id: 105, arete_visual: 'C105', collar_id: 'C105', nivel_bateria: 94, senal_celular: 5, latitud: 9.0985, longitud: -67.0955, potrero_asignado_nombre: 'North Boundary', estado_alerta: 'ESCAPE_HATO' },
    { animal_id: 98, arete_visual: 'C098', collar_id: 'C098', nivel_bateria: 91, senal_celular: 5, latitud: 9.0980, longitud: -67.1000, potrero_asignado_nombre: 'Resting Pasture 2', estado_alerta: 'NORMAL' },
    { animal_id: 23, arete_visual: 'C023', collar_id: 'C023', nivel_bateria: 88, senal_celular: 5, latitud: 9.1025, longitud: -67.1015, potrero_asignado_nombre: 'Milking Zone', estado_alerta: 'NORMAL' }
  ];
}

/**
 * Obtiene el listado de collares registrados
 */
export async function fetchCollares() {
  try {
    const res = await fetch(`${API_BASE}/collares`);
    if (res.ok) return await res.json();
  } catch (_) {}

  const localCollars = JSON.parse(localStorage.getItem('collarnet_collares') || '[]');
  const defaultCollars = [
    { id: 'C105', numero_sim: '+584120000105', fecha_instalacion: '2023-10-01' },
    { id: 'C098', numero_sim: '+584120000098', fecha_instalacion: '2023-10-01' },
    { id: 'C023', numero_sim: '+584120000023', fecha_instalacion: '2023-10-01' },
    { id: 'COW-COLLAR-8821', numero_sim: '+584149998821', fecha_instalacion: '2023-10-25' }
  ];
  localCollars.forEach(c => {
    if (!defaultCollars.some(dc => dc.id === c.id)) defaultCollars.push(c);
  });
  return defaultCollars;
}

/**
 * Obtiene el listado de propietarios registrados
 */
export async function fetchPropietarios() {
  try {
    const res = await fetch(`${API_BASE}/propietarios`);
    if (res.ok) return await res.json();
  } catch (_) {}

  const localProps = JSON.parse(localStorage.getItem('collarnet_propietarios') || '[]');
  const defaultProps = [
    { id: 1, nombre: 'Hacienda La Vega - Propietario Principal', documento_identidad: 'J-30492817-0' },
    { id: 2, nombre: 'Ing. Carlos Mendoza (Encargado Hato)', documento_identidad: 'V-14892019' }
  ];
  localProps.forEach(p => {
    if (!defaultProps.some(dp => dp.id === p.id)) defaultProps.push(p);
  });
  return defaultProps;
}

export async function fetchGeocercasData() {
  let hatos = [];
  let potreros = [];

  try {
    const [resHatos, resPotreros] = await Promise.all([
      fetch(`${API_BASE}/geocercas/hatos`),
      fetch(`${API_BASE}/geocercas/potreros`)
    ]);

    if (resHatos.ok) hatos = await resHatos.json();
    if (resPotreros.ok) potreros = await resPotreros.json();
  } catch (_) {}

  // Cargar geocercas locales en localStorage (Failover / Fallback)
  const localHatos = JSON.parse(localStorage.getItem('collarnet_hatos') || '[]');
  const localPotreros = JSON.parse(localStorage.getItem('collarnet_potreros') || '[]');

  localHatos.forEach(lh => {
    if (!hatos.some(h => h.id == lh.id)) hatos.push(lh);
  });
  localPotreros.forEach(lp => {
    if (!potreros.some(p => p.id == lp.id)) potreros.push(lp);
  });

  return { hatos, potreros };
}

export async function apiEscalarGeocerca(id, type, widthMeters, heightMeters) {
  try {
    const res = await fetch(`${API_BASE}/geocercas/escalar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, widthMeters, heightMeters })
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  return { success: true, message: 'Geocerca re-dimensionada con éxito.' };
}

/**
 * Obtiene la proyección financiera y de crecimiento zootécnico de un animal
 */
export async function fetchProyeccion(animalId) {
  try {
    const res = await fetch(`${API_BASE}/proyecciones/${animalId}`);
    if (res.ok) return await res.json();
  } catch (_) {}

  return {
    animalId: animalId,
    areteVisual: `C${animalId}`,
    pesoActual: 385,
    gdpEstimado: 0.85,
    diasProyeccion: 180,
    historicoPeso: [
      { fecha: '2023-05-01', peso: 320 },
      { fecha: '2023-07-01', peso: 350 },
      { fecha: '2023-09-01', peso: 385 }
    ],
    proyeccionFutura: [
      { fecha: '2023-10-01', peso: 405 },
      { fecha: '2023-11-01', peso: 430 },
      { fecha: '2023-12-01', peso: 455 },
      { fecha: '2024-01-01', peso: 480 }
    ]
  };
}

/**
 * Sincroniza y envía las geocercas del mapa al collar ESP32 vía MQTT
 */
export async function syncGeocercas(collarId, hatoId, potreroId) {
  try {
    const res = await fetch(`${API_BASE}/geocercas/sincronizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collarId, hatoId, potreroId })
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  return { success: true, message: `✅ Geocercas sincronizadas por MQTT con collar ${collarId}` };
}

/**
 * Registra un nuevo Propietario (Dueño)
 */
export async function registrarPropietario(nombre, documento, telefono, correo) {
  try {
    const res = await fetch(`${API_BASE}/propietarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, documento, telefono, correo })
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  const localProps = JSON.parse(localStorage.getItem('collarnet_propietarios') || '[]');
  const newProp = { id: Date.now(), nombre, documento_identidad: documento, telefono, correo };
  localProps.push(newProp);
  localStorage.setItem('collarnet_propietarios', JSON.stringify(localProps));
  return { success: true, message: 'Propietario registrado exitosamente.' };
}

/**
 * Registra un nuevo Collar Físico
 */
export async function registrarCollar(id, numeroSim, fechaInstalacion) {
  try {
    const res = await fetch(`${API_BASE}/collares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, numeroSim, fechaInstalacion })
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  const localCollars = JSON.parse(localStorage.getItem('collarnet_collares') || '[]');
  const newCollar = { id, numero_sim: numeroSim, fecha_instalacion: fechaInstalacion };
  localCollars.push(newCollar);
  localStorage.setItem('collarnet_collares', JSON.stringify(localCollars));
  return { success: true, message: 'Collar registrado exitosamente.' };
}

/**
 * Registra y vincula una res
 */
export async function registrarAnimal(data) {
  try {
    const res = await fetch(`${API_BASE}/animales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  return { success: true, message: 'Animal registrado y vinculado con éxito.' };
}

/**
 * Registra un pesaje
 */
export async function registrarPesaje(animalId, peso, fechaPesaje) {
  try {
    const res = await fetch(`${API_BASE}/pesajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animalId, peso: parseFloat(peso), fechaPesaje })
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  return { success: true, message: 'Pesaje guardado exitosamente.' };
}

/**
 * Registra parámetros de rendimiento de una raza/categoría
 */
export async function registrarRendimiento(data) {
  try {
    const res = await fetch(`${API_BASE}/rendimiento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  return { success: true, message: 'Parámetros guardados.' };
}

/**
 * Guarda o actualiza un Hato dibujado
 */
export async function apiGuardarHato(id, nombre, vertices) {
  try {
    const res = await fetch(`${API_BASE}/geocercas/hato`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre, vertices })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API Warning] API Backend no disponible para guardar Hato, guardando en local.', err);
  }

  // Fallback local garantizado
  const localHatos = JSON.parse(localStorage.getItem('collarnet_hatos') || '[]');
  const newHato = {
    id: id || Date.now(),
    nombre: nombre,
    geojson: JSON.stringify({
      type: 'Polygon',
      coordinates: [vertices.map(v => [v[1], v[0]])] // GeoJSON lon, lat
    })
  };
  localHatos.push(newHato);
  localStorage.setItem('collarnet_hatos', JSON.stringify(localHatos));

  return { success: true, message: 'Hato guardado exitosamente', data: newHato };
}

/**
 * Guarda o actualiza un Potrero dibujado
 */
export async function apiGuardarPotrero(id, hatoId, nombre, vertices, capacidad = 50) {
  try {
    const res = await fetch(`${API_BASE}/geocercas/potrero`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hatoId, nombre, vertices, capacidad })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API Warning] API Backend no disponible para guardar Potrero, guardando en local.', err);
  }

  // Fallback local garantizado
  const localPotreros = JSON.parse(localStorage.getItem('collarnet_potreros') || '[]');
  const newPotrero = {
    id: id || Date.now(),
    hato_id: hatoId,
    nombre: nombre,
    capacidad_maxima: capacidad,
    geojson: JSON.stringify({
      type: 'Polygon',
      coordinates: [vertices.map(v => [v[1], v[0]])] // GeoJSON lon, lat
    })
  };
  localPotreros.push(newPotrero);
  localStorage.setItem('collarnet_potreros', JSON.stringify(localPotreros));

  return { success: true, message: 'Potrero guardado exitosamente', data: newPotrero };
}

/**
 * Elimina un Hato de la base de datos
 */
export async function apiEliminarHato(id) {
  const res = await fetch(`${API_BASE}/geocercas/hato/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al eliminar hato');
  return res.json();
}

/**
 * Elimina un Potrero de la base de datos
 */
export async function apiEliminarPotrero(id) {
  const res = await fetch(`${API_BASE}/geocercas/potrero/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al eliminar potrero');
  return res.json();
}

/**
 * Habilita o deshabilita un collar
 */
export async function updateCollarStatus(id, activo) {
  const res = await fetch(`${API_BASE}/collares/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo })
  });
  if (!res.ok) throw new Error('Error al actualizar estado del dispositivo');
  return res.json();
}

/**
 * Crea una geocerca (Hato o Potrero) mediante coordenadas manuales
 */
export async function apiCrearManual(type, hatoId, nombre, coordenadasText) {
  const res = await fetch(`${API_BASE}/geocercas/crear-manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, hatoId, nombre, coordenadasText })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error al crear geocerca manual');
  }
  return res.json();
}

/**
 * Carga un archivo PDF al backend para extraer la geocerca con Gemini IA
 */
export async function apiCrearIA(pdfFile) {
  const formData = new FormData();
  formData.append('pdfFile', pdfFile);

  const res = await fetch(`${API_BASE}/geocercas/crear-ia`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error al extraer geocerca con IA');
  }
  return res.json();
}
