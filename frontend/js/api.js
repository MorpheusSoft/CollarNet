const API_BASE = '/api';

/**
 * Obtiene el estado actual de monitoreo de todos los animales activos
 */
export async function fetchMonitoreo() {
  const res = await fetch(`${API_BASE}/animales/monitoreo`);
  if (!res.ok) throw new Error('Error al obtener datos de monitoreo');
  return res.json();
}

/**
 * Obtiene el listado de collares registrados
 */
export async function fetchCollares() {
  const res = await fetch(`${API_BASE}/collares`);
  if (!res.ok) throw new Error('Error al obtener lista de collares');
  return res.json();
}

/**
 * Obtiene el listado de propietarios registrados
 */
export async function fetchPropietarios() {
  const res = await fetch(`${API_BASE}/propietarios`);
  if (!res.ok) throw new Error('Error al obtener lista de propietarios');
  return res.json();
}

export async function fetchGeocercasData() {
  const [resHatos, resPotreros] = await Promise.all([
    fetch(`${API_BASE}/geocercas/hatos`),
    fetch(`${API_BASE}/geocercas/potreros`)
  ]);

  if (!resHatos.ok || !resPotreros.ok) {
    throw new Error('Error al obtener datos de geocercas');
  }

  const hatos = await resHatos.json();
  const potreros = await resPotreros.json();

  return { hatos, potreros };
}

export async function apiEscalarGeocerca(id, type, widthMeters, heightMeters) {
  const res = await fetch(`${API_BASE}/geocercas/escalar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type, widthMeters, heightMeters })
  });
  if (!res.ok) {
    let errorMsg = 'Error al re-dimensionar la geocerca';
    try {
      const errData = await res.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return res.json();
}

/**
 * Obtiene la proyección financiera y de crecimiento zootécnico de un animal
 */
export async function fetchProyeccion(animalId) {
  const res = await fetch(`${API_BASE}/proyecciones/${animalId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al obtener proyecciones');
  }
  return res.json();
}

/**
 * Sincroniza y envía las geocercas del mapa al collar ESP32 vía MQTT
 */
export async function syncGeocercas(collarId, hatoId, potreroId) {
  const res = await fetch(`${API_BASE}/geocercas/sincronizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collarId, hatoId, potreroId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al sincronizar geocercas');
  }
  return res.json();
}

/**
 * Registra un nuevo Propietario (Dueño)
 */
export async function registrarPropietario(nombre, documento, telefono, correo) {
  const res = await fetch(`${API_BASE}/propietarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, documento, telefono, correo })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar propietario');
  }
  return res.json();
}

/**
 * Registra un nuevo Collar Físico
 */
export async function registrarCollar(id, numeroSim, fechaInstalacion) {
  const res = await fetch(`${API_BASE}/collares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, numeroSim, fechaInstalacion })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar collar');
  }
  return res.json();
}

/**
 * Registra y vincula una res
 */
export async function registrarAnimal(data) {
  const res = await fetch(`${API_BASE}/animales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar animal');
  }
  return res.json();
}

/**
 * Registra un pesaje
 */
export async function registrarPesaje(animalId, peso, fechaPesaje) {
  const res = await fetch(`${API_BASE}/pesajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animalId, peso: parseFloat(peso), fechaPesaje })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar pesaje');
  }
  return res.json();
}

/**
 * Registra parámetros de rendimiento de una raza/categoría
 */
export async function registrarRendimiento(data) {
  const res = await fetch(`${API_BASE}/rendimiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar parámetros de rendimiento');
  }
  return res.json();
}

/**
 * Guarda o actualiza un Hato dibujado
 */
export async function apiGuardarHato(id, nombre, vertices) {
  const res = await fetch(`${API_BASE}/geocercas/hato`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, nombre, vertices })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar hato');
  }
  return res.json();
}

/**
 * Guarda o actualiza un Potrero dibujado
 */
export async function apiGuardarPotrero(id, hatoId, nombre, vertices, capacidad = 50) {
  const res = await fetch(`${API_BASE}/geocercas/potrero`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, hatoId, nombre, vertices, capacidad })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar potrero');
  }
  return res.json();
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
