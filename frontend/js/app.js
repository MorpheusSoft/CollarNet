import {
  fetchMonitoreo,
  fetchCollares,
  fetchPropietarios,
  fetchGeocercasData,
  fetchProyeccion,
  syncGeocercas,
  registrarPropietario,
  registrarCollar,
  registrarAnimal,
  registrarPesaje,
  registrarRendimiento,
  apiGuardarHato,
  apiGuardarPotrero,
  apiEliminarHato,
  apiEliminarPotrero,
  updateCollarStatus,
  apiCrearManual,
  apiCrearIA,
  apiEscalarGeocerca
} from './api.js';

import {
  initMap,
  setLayer,
  startDrawing,
  onPolygonComplete,
  drawGeocercas,
  updateAnimalMarker,
  centerOnAnimal,
  focusOnGeofence,
  enablePolygonEditing,
  disablePolygonEditing,
  drawGPSTracks,
  animateHerdGuidance,
  locateUserPosition,
  ESRI_SATELLITE,
  OSM_STREETS
} from './mapManager.js';

// Variables de Estado Local
let currentTab = 'tab-mapa';
let socket = null;
let projectionChartInstance = null;
let allAnimals = [];
let currentGeocercasData = { hatos: [], potreros: [] };

/**
 * Inicialización Principal
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar mini mapa si existe contenedor
  const miniMapElem = document.getElementById('mini-map');
  if (miniMapElem) {
    initMap(9.1000, -67.1000, 15, 'mini-map');
  } else {
    initMap(9.1000, -67.1000, 15);
  }
  
  // 2. Conectar a WebSockets si socket.io está disponible
  if (typeof io !== 'undefined') {
    initWebSocketConnection();
  }

  // 3. Configurar eventos UI
  initUIEvents();
});

/**
 * Establece conexión con el canal WebSockets
 */
function initWebSocketConnection() {
  const statusDot = document.querySelector('#connection-status .status-dot');
  const statusText = document.querySelector('#connection-status .status-text');

  console.log('[WebSockets] Conectando...');
  socket = io();

  socket.on('connect', () => {
    console.log('[WebSockets] Conectado exitosamente.');
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Monitoreo en vivo conectado';
  });

  socket.on('disconnect', () => {
    console.warn('[WebSockets] Servidor desconectado.');
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Servidor desconectado (reintentando)';
  });

  // Escuchar tramas de telemetría emitidas en vivo
  socket.on('telemetria_realtime', (data) => {
    // 1. Actualizar en el mapa
    updateAnimalMarker(data);

    // 2. Actualizar en nuestra lista de estado local
    const index = allAnimals.findIndex(a => a.collar_id === data.collarId);
    const updatedAnimal = {
      animal_id: data.animalId,
      arete_visual: data.areteVisual,
      collar_id: data.collarId,
      nivel_bateria: data.bateria,
      senal_celular: data.senal,
      latitud: data.lat,
      longitud: data.lon,
      potrero_asignado_nombre: data.potreroActual, // Se asume actual temporal
      estado_alerta: data.alertType
    };

    if (index !== -1) {
      allAnimals[index] = { ...allAnimals[index], ...updatedAnimal };
    } else {
      allAnimals.push(updatedAnimal);
    }

    // 3. Re-renderizar la lista visual y actualizar estadísticas
    renderAnimalList(allAnimals);
    updateStatsCounters(allAnimals);
  });
}

/**
 * Carga inicial de datos desde los endpoints REST de la API
 */
async function refreshData() {
  try {
    // A. Cargar Monitoreo de Ganado
    allAnimals = await fetchMonitoreo();
    renderAnimalList(allAnimals);
    updateStatsCounters(allAnimals);

    // Cargar collares y ganados existentes para llenar selectores
    const collares = await fetchCollares();
    const propietarios = await fetchPropietarios();
    
    // Renderizar la lista de estados de los collares en el panel de inventario
    renderCollarsStatusList(collares);
    
    const syncCollarSelect = document.getElementById('sync-collar-select');
    const animCollarSelect = document.getElementById('anim-collar');
    const pesoAnimalSelect = document.getElementById('peso-animal');
    const animPropietarioSelect = document.getElementById('anim-propietario');

    // Limpiar selectores
    syncCollarSelect.innerHTML = '<option value="">Selecciona un dispositivo...</option>';
    animCollarSelect.innerHTML = '<option value="">Asociar a Collar...</option>';
    pesoAnimalSelect.innerHTML = '<option value="">Selecciona el Animal...</option>';
    animPropietarioSelect.innerHTML = '<option value="">Asociar a Dueño...</option>';

    collares.forEach(c => {
      syncCollarSelect.innerHTML += `<option value="${c.id}">${c.id} (${c.numero_sim})</option>`;
      animCollarSelect.innerHTML += `<option value="${c.id}">${c.id}</option>`;
    });

    propietarios.forEach(p => {
      animPropietarioSelect.innerHTML += `<option value="${p.id}">${p.nombre} (${p.documento_identidad})</option>`;
    });

    allAnimals.forEach(a => {
      pesoAnimalSelect.innerHTML += `<option value="${a.animal_id}">Arete: ${a.arete_visual}</option>`;
      // Dibujar marcadores estáticos de inicio
      if (a.latitud && a.longitud) {
        updateAnimalMarker({
          collarId: a.collar_id,
          animalId: a.animal_id,
          areteVisual: a.arete_visual,
          lat: parseFloat(a.latitud),
          lon: parseFloat(a.longitud),
          alertType: a.estado_alerta,
          potreroActual: a.potrero_asignado_nombre || 'Sin asignación',
          bateria: a.nivel_bateria,
          senal: a.senal_celular
        });
      }
    });

    // B. Cargar Hatos y Potreros creados para el selector de sincronización
    const geocercas = await fetchGeocercasData();
    currentGeocercasData = geocercas;

    const syncHatoSelect = document.getElementById('sync-hato-select');
    const syncPotreroSelect = document.getElementById('sync-potrero-select');
    const animPotreroSelect = document.getElementById('anim-potrero');
    const manualHatoSelect = document.getElementById('manual-hato-id');

    const scaleSelect = document.getElementById('scale-select');

    syncHatoSelect.innerHTML = '<option value="">Selecciona un hato...</option>';
    syncPotreroSelect.innerHTML = '<option value="">Selecciona un potrero...</option>';
    animPotreroSelect.innerHTML = '<option value="">Asignar Potrero Inicial...</option>';
    if (manualHatoSelect) {
      manualHatoSelect.innerHTML = '<option value="">Selecciona un hato...</option>';
    }
    if (scaleSelect) {
      scaleSelect.innerHTML = '<option value="">Selecciona un perímetro...</option>';
    }

    geocercas.hatos.forEach(h => {
      syncHatoSelect.innerHTML += `<option value="${h.id}">${h.nombre} (ID: ${h.id})</option>`;
      if (manualHatoSelect) {
        manualHatoSelect.innerHTML += `<option value="${h.id}">${h.nombre} (ID: ${h.id})</option>`;
      }
      if (scaleSelect) {
        scaleSelect.innerHTML += `<option value="hato:${h.id}">🔴 Hato ${h.nombre} (ID: ${h.id})</option>`;
      }
    });
    geocercas.potreros.forEach(p => {
      syncPotreroSelect.innerHTML += `<option value="${p.id}">${p.nombre} (ID: ${p.id})</option>`;
      animPotreroSelect.innerHTML += `<option value="${p.id}">${p.nombre} (ID: ${p.id})</option>`;
      if (scaleSelect) {
        scaleSelect.innerHTML += `<option value="potrero:${p.id}">🟡 Potrero ${p.nombre} (ID: ${p.id})</option>`;
      }
    });

    // C. Dibujar geocercas en el mapa en base a las geometrías de la base de datos
    drawGeocercas(geocercas.hatos, geocercas.potreros);

    // D. Renderizar la lista de geocercas en el panel lateral con botones de eliminación
    renderGeofencesList(geocercas.hatos, geocercas.potreros);

  } catch (err) {
    console.error('[REST Error] Fallo al cargar datos iniciales:', err);
  }
}

/**
 * Enlaza los listeners de todos los formularios e interacciones UI
 */
function initUIEvents() {
  // POPUP DROPDOWN DEL BOTÓN MAP (VENTANA EMERGENTE DE HERRAMIENTAS)
  const navMapBtn = document.getElementById('nav-map');
  const mapPopupMenu = document.getElementById('map-popup-menu');
  const navDropdownWrapper = document.querySelector('.nav-dropdown-wrapper');
  const btnPopupDrawGeofence = document.getElementById('btn-popup-draw-geofence');
  const btnPopupCurrentLocation = document.getElementById('btn-popup-current-location');

  if (navMapBtn && mapPopupMenu) {
    navMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mapPopupMenu.classList.toggle('active');
      if (navDropdownWrapper) navDropdownWrapper.classList.toggle('active');
    });

    // Cerrar ventana emergente al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (navDropdownWrapper && !navDropdownWrapper.contains(e.target)) {
        mapPopupMenu.classList.remove('active');
        navDropdownWrapper.classList.remove('active');
      }
    });
  }

  // Acción 1: Botón para el Dibujo de Geocercas en el Mapa
  if (btnPopupDrawGeofence) {
    btnPopupDrawGeofence.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mapPopupMenu) mapPopupMenu.classList.remove('active');
      if (navDropdownWrapper) navDropdownWrapper.classList.remove('active');
      
      startDrawing('potrero');
      alert('✏️ Modo Dibujo de Geocercas Activo.\n\nHaz clic en los puntos del mapa satelital para trazar cada esquina del perímetro. Haz clic en el primer punto para guardar.');
    });
  }

  // Acción 2: Botón para ir a la Ubicación Actual GPS
  if (btnPopupCurrentLocation) {
    btnPopupCurrentLocation.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mapPopupMenu) mapPopupMenu.classList.remove('active');
      if (navDropdownWrapper) navDropdownWrapper.classList.remove('active');
      
      locateUserPosition();
    });
  }

  // Listeners para las tarjetas de telemetría del panel derecho
  const telemetryCards = document.querySelectorAll('.telemetry-card');
  const modalProfileElem = document.getElementById('modal-animal-profile');
  const btnOpenRegister = document.getElementById('btn-open-register-modal');

  telemetryCards.forEach(card => {
    card.addEventListener('click', () => {
      const cowId = card.getAttribute('data-id');
      centerOnAnimal(`C${cowId}`);
      if (modalProfileElem) modalProfileElem.classList.add('active');
    });
  });

  if (btnOpenRegister) {
    btnOpenRegister.addEventListener('click', () => {
      if (modalProfileElem) modalProfileElem.classList.add('active');
    });
  }

  // Toggles de Capa de Mapa (Satélite / Calles)
  const btnSat = document.getElementById('btn-layer-satellite');
  if (btnSat) {
    btnSat.addEventListener('click', (e) => {
      document.querySelectorAll('.map-control-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      setLayer(ESRI_SATELLITE, 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community');
    });
  }

  const btnStr = document.getElementById('btn-layer-streets');
  if (btnStr) {
    btnStr.addEventListener('click', (e) => {
      document.querySelectorAll('.map-control-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      setLayer(OSM_STREETS, 'Tiles &copy; OpenStreetMap contributors');
    });
  }

  // Colapsar Menú Lateral en pantallas de campo
  const btnSidebarToggle = document.getElementById('sidebar-toggle-btn');
  if (btnSidebarToggle) {
    btnSidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('collapsed');
    });
  }

  // Botones de Dibujo Poligonal
  const btnDrawHato = document.getElementById('btn-draw-hato');
  const btnDrawPotrero = document.getElementById('btn-draw-potrero');

  if (btnDrawHato) {
    btnDrawHato.addEventListener('click', () => {
      if (btnDrawPotrero) btnDrawPotrero.classList.remove('active');
      btnDrawHato.classList.toggle('active');
      if (btnDrawHato.classList.contains('active')) {
        startDrawing('hato');
      } else {
        cancelDrawing();
      }
    });
  }

  if (btnDrawPotrero) {
    btnDrawPotrero.addEventListener('click', () => {
      if (btnDrawHato) btnDrawHato.classList.remove('active');
      btnDrawPotrero.classList.toggle('active');
      if (btnDrawPotrero.classList.contains('active')) {
        startDrawing('potrero');
      } else {
        cancelDrawing();
      }
    });
  }

  // Recibir vértices completados desde el mapa
  onPolygonComplete(async (mode, vertices) => {
    if (btnDrawHato) btnDrawHato.classList.remove('active');
    if (btnDrawPotrero) btnDrawPotrero.classList.remove('active');
    
    const nombre = prompt(`Ingrese el nombre para este nuevo ${mode === 'hato' ? 'Hato' : 'Potrero'}:`);
    if (!nombre) return;

    try {
      if (mode === 'hato') {
        await apiGuardarHato(null, nombre, vertices);
        alert(`Hato "${nombre}" guardado con éxito.`);
      } else {
        const hatoOptions = currentGeocercasData.hatos.map(h => `ID ${h.id} -> ${h.nombre}`).join('\n');
        const hatoId = prompt(`Ingresa el número de ID del Hato al que pertenece este Potrero:\n\nHatos disponibles:\n${hatoOptions || 'Ninguno (Crea un hato primero)'}`);
        if (!hatoId) return;
        await apiGuardarPotrero(null, parseInt(hatoId, 10), nombre, vertices, 50);
        alert(`Potrero "${nombre}" guardado con éxito.`);
      }
      await refreshData();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    }
  });

  // Filtrar Potreros dinámicamente al seleccionar un Hato
  const syncHatoSelect = document.getElementById('sync-hato-select');
  if (syncHatoSelect) {
    syncHatoSelect.addEventListener('change', (e) => {
      const selectedHatoId = parseInt(e.target.value, 10);
      const syncPotreroSelect = document.getElementById('sync-potrero-select');
      if (!syncPotreroSelect) return;
      syncPotreroSelect.innerHTML = '<option value="">Selecciona un potrero...</option>';

      if (!isNaN(selectedHatoId)) {
        const filtered = currentGeocercasData.potreros.filter(p => p.hato_id === selectedHatoId);
        if (filtered.length === 0) {
          syncPotreroSelect.innerHTML = '<option value="">No hay potreros en este hato</option>';
        } else {
          filtered.forEach(p => {
            syncPotreroSelect.innerHTML += `<option value="${p.id}">${p.nombre} (ID: ${p.id})</option>`;
          });
        }
      } else {
        currentGeocercasData.potreros.forEach(p => {
          syncPotreroSelect.innerHTML += `<option value="${p.id}">${p.nombre} (ID: ${p.id})</option>`;
        });
      }
    });
  }

  // Botón Sincronizar Geocerca con Collar (MQTT)
  const btnSyncGeofence = document.getElementById('btn-sync-geofence');
  if (btnSyncGeofence) {
    btnSyncGeofence.addEventListener('click', async () => {
      const collarId = document.getElementById('sync-collar-select')?.value;
      const hatoId = document.getElementById('sync-hato-select')?.value;
      const potreroId = document.getElementById('sync-potrero-select')?.value;

      if (!collarId || !hatoId || !potreroId) {
        alert('Por favor selecciona el Collar, Hato y Potrero para sincronizar.');
        return;
      }

      try {
        const res = await syncGeocercas(collarId, hatoId, potreroId);
        alert(res.message);
      } catch (err) {
        alert(`Fallo en la sincronización: ${err.message}`);
      }
    });
  }

  // ==========================================
  // FORMULARIOS DE REGISTRO
  // ==========================================

  // Registro Propietario
  const formProp = document.getElementById('form-propietario');
  if (formProp) {
    formProp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('prop-nombre').value;
      const documento = document.getElementById('prop-documento').value;
      const telefono = document.getElementById('prop-telefono').value;
      const correo = document.getElementById('prop-correo').value;

      try {
        await registrarPropietario(nombre, documento, telefono, correo);
        alert('Propietario registrado exitosamente.');
        e.target.reset();
        await refreshData();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Registro Collar
  const formColl = document.getElementById('form-collar');
  if (formColl) {
    formColl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('coll-id').value;
      const numeroSim = document.getElementById('coll-sim').value;
      const fechaInstalacion = document.getElementById('coll-instalacion').value;

      try {
        await registrarCollar(id, numeroSim, fechaInstalacion);
        alert('Collar registrado exitosamente.');
        e.target.reset();
        await refreshData();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Registro Pesaje
  const formPesaje = document.getElementById('form-pesaje');
  if (formPesaje) {
    formPesaje.addEventListener('submit', async (e) => {
      e.preventDefault();
      const animalId = document.getElementById('peso-animal').value;
      const peso = document.getElementById('peso-valor').value;
      const fechaPesaje = document.getElementById('peso-fecha').value;

      try {
        await registrarPesaje(animalId, peso, fechaPesaje);
        alert('Pesaje guardado exitosamente.');
        e.target.reset();
        await refreshData();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Guardar Parámetros de Rendimiento
  const formRend = document.getElementById('form-rendimiento');
  if (formRend) {
    formRend.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        raza: document.getElementById('rend-raza').value,
        categoria: document.getElementById('rend-categoria').value,
        gdpPromedio: parseFloat(document.getElementById('rend-gdp').value),
        pesoAdulto: parseFloat(document.getElementById('rend-adulto').value),
        costoDiario: parseFloat(document.getElementById('rend-costo').value),
        precioKg: parseFloat(document.getElementById('rend-precio').value)
      };

      try {
        await registrarRendimiento(data);
        alert('Parámetros guardados.');
        e.target.reset();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Vincular Animal
  const formAnimal = document.getElementById('form-animal');
  if (formAnimal) {
    formAnimal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const propietarioId = document.getElementById('anim-propietario').value;
      if (!propietarioId) {
        alert('Por favor selecciona un dueño para el animal.');
        return;
      }

      const data = {
        areteVisual: document.getElementById('anim-arete').value,
        raza: document.getElementById('anim-raza').value,
        categoria: document.getElementById('anim-categoria').value,
        fechaNacimiento: document.getElementById('anim-nacimiento').value,
        collarId: document.getElementById('anim-collar').value,
        propietarioId: parseInt(propietarioId, 10),
        potreroId: document.getElementById('anim-potrero').value ? parseInt(document.getElementById('anim-potrero').value, 10) : null
      };

      try {
        await registrarAnimal(data);
        alert('Animal registrado y vinculado con éxito.');
        e.target.reset();
        await refreshData();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Escuchar Evento para mostrar Ventana Modal de Proyecciones
  document.addEventListener('showProyeccion', async (e) => {
    const animalId = e.detail;
    await openProjectionModal(animalId);
  });

  // Cerrar Modal Proyección
  const btnCloseModalElem = document.getElementById('btn-close-modal');
  if (btnCloseModalElem) {
    btnCloseModalElem.addEventListener('click', () => {
      const modalProy = document.getElementById('modal-proyeccion');
      if (modalProy) modalProy.classList.remove('active');
    });
  }

  // Filtro de búsqueda del panel de animales
  const searchAnimalInput = document.getElementById('search-animal');
  if (searchAnimalInput) {
    searchAnimalInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allAnimals.filter(a => 
        a.arete_visual.toLowerCase().includes(query) || 
        a.collar_id.toLowerCase().includes(query)
      );
      renderAnimalList(filtered);
    });
  }

  // Mostrar/Ocultar Hato Asociado en Entrada Manual
  const manualTypeSelect = document.getElementById('manual-type');
  const manualHatoGroup = document.getElementById('manual-hato-association-group');
  if (manualTypeSelect && manualHatoGroup) {
    manualTypeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'potrero') {
        manualHatoGroup.style.display = 'block';
        document.getElementById('manual-hato-id').setAttribute('required', 'true');
      } else {
        manualHatoGroup.style.display = 'none';
        document.getElementById('manual-hato-id').removeAttribute('required');
      }
    });
  }

  // Registro de Geocerca Manual
  const formManualGeofence = document.getElementById('form-manual-geofence');
  if (formManualGeofence) {
    formManualGeofence.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('manual-type').value;
      const hatoId = document.getElementById('manual-hato-id').value;
      const nombre = document.getElementById('manual-name').value;
      const coordenadasText = document.getElementById('manual-coordinates').value;

      try {
        await apiCrearManual(type, hatoId, nombre, coordenadasText);
        alert(`Geocerca manual "${nombre}" creada con éxito.`);
        formManualGeofence.reset();
        if (manualHatoGroup) manualHatoGroup.style.display = 'none';
        await refreshData();
      } catch (err) {
        alert(`Error al crear geocerca manual: ${err.message}`);
      }
    });
  }

  // Re-dimensionar Geocerca (Metros)
  const scaleSelect = document.getElementById('scale-select');
  if (scaleSelect) {
    scaleSelect.addEventListener('change', () => {
      const val = scaleSelect.value;
      if (!val || !currentGeocercasData) return;
      const [type, id] = val.split(':');
      const list = type === 'hato' ? currentGeocercasData.hatos : currentGeocercasData.potreros;
      const item = list.find(x => x.id == id);
      if (item && item.geojson) {
        try {
          const geo = JSON.parse(item.geojson);
          const coords = geo.coordinates[0];
          let minLat = 999, maxLat = -999, minLon = 999, maxLon = -999;
          coords.forEach(pt => {
            const lon = pt[0], lat = pt[1];
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          });
          const heightMeters = Math.round((maxLat - minLat) * 111320);
          const widthMeters = Math.round((maxLon - minLon) * (111320 * Math.cos(((minLat + maxLat)/2) * Math.PI / 180)));
          document.getElementById('scale-width').value = widthMeters > 0 ? widthMeters : 100;
          document.getElementById('scale-height').value = heightMeters > 0 ? heightMeters : 100;
        } catch (_) {}
      }
    });
  }

  const formScaleGeofence = document.getElementById('form-scale-geofence');
  if (formScaleGeofence) {
    formScaleGeofence.addEventListener('submit', async (e) => {
      e.preventDefault();
      const scaleValue = document.getElementById('scale-select').value;
      if (!scaleValue) {
        alert('Por favor selecciona una geocerca para re-dimensionar.');
        return;
      }
      const [type, id] = scaleValue.split(':');
      const widthMeters = parseFloat(document.getElementById('scale-width').value);
      const heightMeters = parseFloat(document.getElementById('scale-height').value);

      try {
        const res = await apiEscalarGeocerca(id, type, widthMeters, heightMeters);
        alert(res.message || 'Geocerca re-dimensionada con éxito.');
        await refreshData();

        // Autodetectar si hay un collar seleccionado en el panel de sincronización para re-sincronizar automáticamente
        const syncCollarSelect = document.getElementById('sync-collar-select');
        const syncHatoSelect = document.getElementById('sync-hato-select');
        const syncPotreroSelect = document.getElementById('sync-potrero-select');

        if (syncCollarSelect && syncCollarSelect.value && syncHatoSelect && syncHatoSelect.value && syncPotreroSelect && syncPotreroSelect.value) {
          await syncGeocercas(syncCollarSelect.value, syncHatoSelect.value, syncPotreroSelect.value);
          console.log('[Auto-Sync] Geocerca re-dimensionada enviada automáticamente al collar.');
        }
      } catch (err) {
        alert(`Error al re-dimensionar geocerca: ${err.message}`);
      }
    });
  }

  // Registro de Geocerca con IA (PDF)
  const formAiPdf = document.getElementById('form-ai-pdf');
  const aiLoadingSpinner = document.getElementById('ai-loading-spinner');
  const btnSubmitAi = document.getElementById('btn-submit-ai');

  if (formAiPdf) {
    formAiPdf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('ai-pdf-file');
      if (!fileInput || fileInput.files.length === 0) {
        alert('Por favor selecciona un archivo PDF.');
        return;
      }

      const file = fileInput.files[0];

      // Mostrar spinner y deshabilitar botón
      if (aiLoadingSpinner) aiLoadingSpinner.style.display = 'flex';
      if (btnSubmitAi) {
        btnSubmitAi.disabled = true;
        btnSubmitAi.innerText = 'Procesando plano con Gemini IA...';
      }

      try {
        const res = await apiCrearIA(file);
        alert(`¡Éxito! Hato catastrado: "${res.data.nombre}"`);
        formAiPdf.reset();
        await refreshData();
      } catch (err) {
        alert(`Error al analizar PDF: ${err.message}`);
      } finally {
        if (aiLoadingSpinner) aiLoadingSpinner.style.display = 'none';
        if (btnSubmitAi) {
          btnSubmitAi.disabled = false;
          btnSubmitAi.innerText = 'Analizar con Gemini IA';
        }
      }
    });
  }

  // ==========================================
  // EVENTOS Y MODALES DE COWAI MVP v1.0
  // ==========================================

  // Cierre Global Infalible de Modales (al hacer clic en la X, fuera del contenido o presionando ESC)
  document.addEventListener('click', (e) => {
    // 1. Si hace clic en un botón de cerrar (clase .close-modal-btn o id btn-close-)
    const closeBtn = e.target.closest('.close-modal-btn') || (e.target.id && e.target.id.startsWith('btn-close-') ? e.target : null);
    if (closeBtn) {
      const parentModal = closeBtn.closest('.modal');
      if (parentModal) parentModal.classList.remove('active');
      return;
    }

    // 2. Si hace clic fuera del recuadro (.modal-content) sobre el fondo oscuro (.modal)
    const targetModal = e.target.classList.contains('modal') ? e.target : null;
    if (targetModal && !e.target.closest('.modal-content')) {
      targetModal.classList.remove('active');
    }
  });

  // Tecla Escape (ESC)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });

  // 1. Modal de Escáner QR de Collar
  const modalQr = document.getElementById('modal-qr-scanner');
  const btnOpenQr = document.getElementById('btn-open-qr-scanner');
  const btnScanQrForm = document.getElementById('btn-scan-collar-qr');
  const btnSimulateQr = document.getElementById('btn-simulate-qr-read');
  const qrResultBox = document.getElementById('qr-result-box');

  const openQrModal = () => {
    if (modalQr) modalQr.classList.add('active');
    if (qrResultBox) qrResultBox.style.display = 'none';
  };

  const btnPairCollarFromProfile = document.getElementById('btn-trigger-pair-collar');

  if (btnOpenQr) btnOpenQr.addEventListener('click', openQrModal);
  if (btnScanQrForm) btnScanQrForm.addEventListener('click', openQrModal);
  if (btnPairCollarFromProfile) btnPairCollarFromProfile.addEventListener('click', openQrModal);

  if (btnSimulateQr) {
    btnSimulateQr.addEventListener('click', () => {
      if (qrResultBox) qrResultBox.style.display = 'block';
      const animCollarSelect = document.getElementById('anim-collar');
      const collIdInput = document.getElementById('coll-id');

      if (collIdInput) collIdInput.value = 'COW-COLLAR-8821';
      if (animCollarSelect) {
        let opt = Array.from(animCollarSelect.options).find(o => o.value === 'COW-COLLAR-8821');
        if (!opt) {
          opt = new Option('COW-COLLAR-8821 (Emparejado QR 📷)', 'COW-COLLAR-8821');
          animCollarSelect.add(opt);
        }
        animCollarSelect.value = 'COW-COLLAR-8821';
      }
      setTimeout(() => {
        alert('✅ Collar inteligente COW-COLLAR-8821 emparejado con éxito por QR.');
        modalQr.classList.remove('active');
      }, 1200);
    });
  }

  // 2. Modal de Ficha Técnica del Animal & Genealogía
  const modalProfile = document.getElementById('modal-animal-profile');
  const btnCloseProfile = document.getElementById('btn-close-profile-modal');
  if (btnCloseProfile && modalProfile) {
    btnCloseProfile.addEventListener('click', () => modalProfile.classList.remove('active'));
  }

  document.addEventListener('openAnimalProfile', (e) => {
    const animal = e.detail;
    if (!animal) return;

    if (document.getElementById('prof-name')) document.getElementById('prof-name').textContent = animal.nombre || 'Esperanza';
    if (document.getElementById('prof-arete')) document.getElementById('prof-arete').textContent = animal.arete_visual || '4821';
    if (document.getElementById('prof-hierro')) document.getElementById('prof-hierro').textContent = animal.hierro || '#78';
    if (document.getElementById('prof-breed')) document.getElementById('prof-breed').textContent = `${animal.raza || 'Brahman Puro'} (${animal.categoria || 'Vaca'})`;
    if (document.getElementById('prof-iron-badge')) document.getElementById('prof-iron-badge').textContent = `Hierro ${animal.hierro || '#78'}`;
    if (document.getElementById('prof-sire')) document.getElementById('prof-sire').textContent = animal.padre || 'Duke (RFID 1198)';
    if (document.getElementById('prof-dam')) document.getElementById('prof-dam').textContent = animal.madre || 'Bella (RFID 3042)';
    if (document.getElementById('prof-lineage')) document.getElementById('prof-lineage').textContent = animal.linea_genetica || 'Línea Red Brahman de Alta Leche';

    if (modalProfile) modalProfile.classList.add('active');
  });

  const btnProjFromProf = document.getElementById('btn-open-projection-from-profile');
  if (btnProjFromProf) {
    btnProjFromProf.addEventListener('click', () => {
      if (modalProfile) modalProfile.classList.remove('active');
      openProjectionModal(1);
    });
  }

  // 3. Botón de Guía Activa / Arreo Remoto
  const btnStartHerdGuide = document.getElementById('btn-start-herd-guide');
  const btnQuickActiveHerd = document.getElementById('btn-quick-active-herd');

  const triggerHerdGuideAnimation = () => {
    alert('🧭 ¡Guía Activa Iniciada! Los collares emitirán secuencias de señales sonoras progresivas para orientar al hato hacia la Zona de Ordeño.');
    const chip = document.getElementById('guidance-status-chip');
    if (chip) {
      chip.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
      chip.innerHTML = '<span class="pulse-icon">📡</span><span>Guía Activa: <strong>En Progreso -> Zona Ordeño 🥛</strong></span>';
    }

    // Ejecutar animación de arreo en el mapa
    animateHerdGuidance(9.1025, -67.0980, () => {
      alert('🥛 ¡El hato ha ingresado exitosamente a la Zona de Ordeño!');
      if (chip) {
        chip.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        chip.innerHTML = '<span class="pulse-icon">📡</span><span>Guía Activa: <strong>Completada &bull; En Zona Ordeño 🥛</strong></span>';
      }
    });
  };

  if (btnStartHerdGuide) btnStartHerdGuide.addEventListener('click', triggerHerdGuideAnimation);
  if (btnQuickActiveHerd) btnQuickActiveHerd.addEventListener('click', triggerHerdGuideAnimation);

  // 4. Selector de Historial de Recorrido (Tracks 24h, 7d, 30d)
  const trackBtns = document.querySelectorAll('.track-btn');
  trackBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      trackBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.getAttribute('data-range');
      drawGPSTracks(range);
    });
  });

  // Dibujar estela GPS por defecto
  drawGPSTracks('24h');
}

/**
 * Renderiza la lista de animales en la barra lateral derecha
 */
function renderAnimalList(animals) {
  const liveList = document.getElementById('live-list');
  liveList.innerHTML = '';

  if (animals.length === 0) {
    liveList.innerHTML = '<p class="placeholder-text">No se encontraron animales.</p>';
    return;
  }

  animals.forEach(a => {
    const card = document.createElement('div');
    card.className = `animal-card ${a.estado_alerta}`;
    
    const alertLabels = {
      'NORMAL': '🟢 SEGURO',
      'INFRACCION_ROTACION': '⚠️ ROTACIÓN',
      'ESCAPE_HATO': '🚨 ESCAPE'
    };

    card.innerHTML = `
      <div class="animal-card-header">
        <span class="animal-arete">🐂 Arete: ${a.arete_visual}</span>
        <span class="animal-status-tag">${alertLabels[a.estado_alerta] || a.estado_alerta}</span>
      </div>
      <div class="animal-card-body">
        <p><strong>Potrero:</strong> ${a.potrero_asignado_nombre || 'Sin asignación'}</p>
        <p><strong>Clasificación:</strong> ${a.raza} (${a.categoria})</p>
      </div>
      <div class="animal-card-footer">
        <span class="stat-item">🔋 ${a.nivel_bateria || 0}%</span>
        <span class="stat-item">📶 ${a.senal_celular || 0}/5</span>
        <span class="stat-item">⏱️ ${a.ultima_conexion ? new Date(a.ultima_conexion).toLocaleTimeString() : 'Nunca'}</span>
      </div>
    `;

    // Clic en la tarjeta centra la cámara del mapa y abre la Ficha Técnica / Genealogía
    card.addEventListener('click', () => {
      centerOnAnimal(a.collar_id);
      document.dispatchEvent(new CustomEvent('openAnimalProfile', {
        detail: {
          nombre: a.arete_visual ? `Res Arete ${a.arete_visual}` : 'Esperanza',
          arete_visual: a.arete_visual,
          hierro: a.hierro || '#78',
          raza: a.raza || 'Brahman Puro',
          categoria: a.categoria || 'Vaca',
          padre: 'Duke (RFID 1198)',
          madre: 'Bella (RFID 3042)',
          linea_genetica: 'Línea Red Brahman de Alta Leche'
        }
      }));
    });

    liveList.appendChild(card);
  });
}

/**
 * Actualiza las cajas estadísticas superiores en la UI
 */
function updateStatsCounters(animals) {
  const okCount = animals.filter(a => a.estado_alerta === 'NORMAL').length;
  const warnCount = animals.filter(a => a.estado_alerta === 'INFRACCION_ROTACION').length;
  const dangerCount = animals.filter(a => a.estado_alerta === 'ESCAPE_HATO').length;

  document.getElementById('stat-ok-count').textContent = okCount;
  document.getElementById('stat-warn-count').textContent = warnCount;
  document.getElementById('stat-danger-count').textContent = dangerCount;
}

/**
 * Abre el modal de proyecciones, descarga datos y dibuja el gráfico Chart.js
 */
async function openProjectionModal(animalId) {
  try {
    const data = await fetchProyeccion(animalId);
    
    // 1. Mostrar modal agregando la clase active
    const modal = document.getElementById('modal-proyeccion');
    modal.classList.add('active');

    // 2. Llenar textos del encabezado y estadísticas
    document.getElementById('proj-modal-title').textContent = `Peso y Rentabilidad - Arete: ${data.areteVisual}`;
    document.getElementById('proj-peso-actual').textContent = `${data.pesoActual.toFixed(2)} kg`;
    document.getElementById('proj-gdp').textContent = `${data.gdpPromedioDiario.toFixed(3)} kg/día`;

    // Evaluar recomendación comercial
    const cardDecision = document.getElementById('card-decision');
    const txtDecision = document.getElementById('proj-decision');
    
    // Si la proyección a 180 días es rentable, pero a 365 decae, se le recomienda al productor
    const proy180 = data.proyecciones.find(p => p.dias === 180);
    const proy365 = data.proyecciones.find(p => p.dias === 365);

    if (proy180 && proy180.rentable && (!proy365 || !proy365.rentable)) {
      txtDecision.textContent = 'MANTENER / VENTA PRÓXIMA';
      cardDecision.className = 'proj-card highlight-rentable';
    } else if (proy365 && !proy365.rentable) {
      txtDecision.textContent = '🔴 VENDER AHORA (Estancamiento)';
      cardDecision.className = 'proj-card highlight-loss';
    } else {
      txtDecision.textContent = '🟢 MANTENER EN PASTOREO';
      cardDecision.className = 'proj-card highlight-rentable';
    }

    // 3. Renderizar tabla desglosada
    const tbody = document.getElementById('projection-table-body');
    tbody.innerHTML = '';
    
    data.proyecciones.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>Proyección a ${p.dias} días</td>
        <td><strong>${p.pesoProyectado.toFixed(2)} kg</strong></td>
        <td>$${p.costoAcumulado.toFixed(2)}</td>
        <td>$${p.valorProyectado.toFixed(2)}</td>
        <td style="color: ${p.beneficioNeto > 0 ? '#10b981' : '#ef4444'}; font-weight: 700;">
          $${p.beneficioNeto.toFixed(2)}
        </td>
        <td>
          <span class="${p.rentable ? 'badge-rentable' : 'badge-loss'}">
            ${p.rentable ? 'Rentable' : 'Pérdida'}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // 4. Renderizar gráfico interactivo en Canvas
    renderProjectionChart(data);

  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

/**
 * Renderiza o refresca el canvas del gráfico interactivo con Chart.js
 */
function renderProjectionChart(data) {
  const ctx = document.getElementById('projectionChart').getContext('2d');
  
  if (projectionChartInstance) {
    projectionChartInstance.destroy(); // Limpiar gráfico previo
  }

  const labels = ['Hoy', '30d', '60d', '90d', '180d', '365d'];
  
  // Peso proyectado por intervalos
  const pesos = [
    data.pesoActual,
    ...data.proyecciones.map(p => p.pesoProyectado)
  ];

  // Beneficios netos proyectados
  const beneficios = [
    0,
    ...data.proyecciones.map(p => p.beneficioNeto)
  ];

  projectionChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Peso Proyectado (kg)',
          data: pesos,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y-peso',
          tension: 0.3,
          borderWidth: 3,
          fill: true
        },
        {
          label: 'Beneficio Neto Estimado ($)',
          data: beneficios,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y-usd',
          tension: 0.3,
          borderWidth: 3,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        'y-peso': {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9ca3af' },
          title: { display: true, text: 'Kilogramos (kg)', color: '#3b82f6' }
        },
        'y-usd': {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#9ca3af' },
          title: { display: true, text: 'Beneficio Neto ($)', color: '#10b981' }
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9ca3af' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f3f4f6' }
        }
      }
    }
  });
}

/**
 * Renderiza la lista de Geocercas (Hatos y Potreros) en la pestaña de diseño
 */
function renderGeofencesList(hatos = [], potreros = []) {
  const container = document.getElementById('geofences-list');
  if (!container) return;
  container.innerHTML = '';

  if (hatos.length === 0 && potreros.length === 0) {
    container.innerHTML = '<p class="placeholder-text">Ninguna geocerca creada.</p>';
    return;
  }

  // Renderizar Hatos
  hatos.forEach(h => {
    const item = document.createElement('div');
    item.className = 'geofence-item';
    item.style.cursor = 'pointer';
    item.innerHTML = `
      <div class="geofence-info">
        <span class="geofence-type-badge hato">🔴 Hato</span>
        <span class="geofence-name">${h.nombre} <small style="color: var(--text-secondary); font-size: 0.75rem;">(ID: ${h.id})</small></span>
      </div>
      <div class="geofence-actions" style="display: flex; gap: 6px; align-items: center;">
        <button class="edit-fence-btn action-btn" data-id="${h.id}" data-type="hato" title="Mover Esquinas en el Mapa" style="padding: 4px 8px; font-size: 0.75rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;">✏️ Esquinas</button>
        <button class="delete-fence-btn" data-id="${h.id}" data-type="hato" title="Eliminar Hato">🗑️</button>
      </div>
    `;
    item.addEventListener('click', () => {
      focusOnGeofence('hato', h.id);
    });
    container.appendChild(item);
  });

  // Renderizar Potreros
  potreros.forEach(p => {
    const item = document.createElement('div');
    item.className = 'geofence-item';
    item.style.cursor = 'pointer';
    item.innerHTML = `
      <div class="geofence-info">
        <span class="geofence-type-badge potrero">🟡 Potrero</span>
        <span class="geofence-name">${p.nombre} <small style="color: var(--text-secondary); font-size: 0.75rem;">(ID: ${p.id})</small></span>
      </div>
      <div class="geofence-actions" style="display: flex; gap: 6px; align-items: center;">
        <button class="edit-fence-btn action-btn" data-id="${p.id}" data-type="potrero" title="Mover Esquinas en el Mapa" style="padding: 4px 8px; font-size: 0.75rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;">✏️ Esquinas</button>
        <button class="delete-fence-btn" data-id="${p.id}" data-type="potrero" title="Eliminar Potrero">🗑️</button>
      </div>
    `;
    item.addEventListener('click', () => {
      focusOnGeofence('potrero', p.id);
    });
    container.appendChild(item);
  });

  // Enlazar botones de Mover Esquinas Gráficamente
  const editButtons = container.querySelectorAll('.edit-fence-btn');
  editButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      const type = btn.getAttribute('data-type');
      enablePolygonEditing(type, id, handleSaveDragEdit);
    });
  });

  // Enlazar los botones de eliminar
  const deleteButtons = container.querySelectorAll('.delete-fence-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      
      const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar este ${type === 'hato' ? 'Hato (esto eliminará también todos sus potreros asociados)' : 'Potrero'}?`);
      if (!confirmDelete) return;

      try {
        if (type === 'hato') {
          await apiEliminarHato(id);
        } else {
          await apiEliminarPotrero(id);
        }
        alert('Geocerca eliminada con éxito.');
        await refreshData(); // Recargar datos y refrescar mapa
      } catch (err) {
        // Mostrar mensaje de error dinámico enviado desde la base de datos (por ejemplo, si tiene collares activos)
        alert(`Error al eliminar: ${err.message}`);
      }
    });
  });
}

/**
 * Guarda los nuevos vértices resultantes del arrastre de esquinas en el mapa
 */
async function handleSaveDragEdit(type, id, newVertices) {
  try {
    let res;
    if (type === 'hato') {
      const h = currentGeocercasData.hatos.find(item => item.id == id);
      res = await apiGuardarHato(id, h ? h.nombre : 'Hato Editado', newVertices);
    } else {
      const p = currentGeocercasData.potreros.find(item => item.id == id);
      res = await apiGuardarPotrero(id, p ? p.hato_id : 5, p ? p.nombre : 'Potrero Editado', newVertices, p ? p.capacidad_max_cabezas : 50);
    }
    alert('¡Geocerca editada en el mapa con éxito!');
    await refreshData();

    // Re-sincronizar automáticamente con el collar activo
    const syncCollarSelect = document.getElementById('sync-collar-select');
    const syncHatoSelect = document.getElementById('sync-hato-select');
    const syncPotreroSelect = document.getElementById('sync-potrero-select');

    if (syncCollarSelect && syncCollarSelect.value && syncHatoSelect && syncHatoSelect.value && syncPotreroSelect && syncPotreroSelect.value) {
      await syncGeocercas(syncCollarSelect.value, syncHatoSelect.value, syncPotreroSelect.value);
    }
  } catch (err) {
    alert(`Error al guardar edición de mapa: ${err.message}`);
  }
}

/**
 * Renderiza el listado de collares con sus switches para habilitar/deshabilitar
 */
function renderCollarsStatusList(collares = []) {
  const container = document.getElementById('collars-status-list');
  if (!container) return;
  container.innerHTML = '';

  if (collares.length === 0) {
    container.innerHTML = '<p class="placeholder-text" style="font-size: 0.75rem;">Ningún collar registrado.</p>';
    return;
  }

  collares.forEach(c => {
    const row = document.createElement('div');
    row.className = 'collar-status-row';
    row.style.display = 'flex';
    row.style.justify = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 10px';
    row.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
    row.style.border = '1px solid var(--border-color)';
    row.style.borderRadius = 'var(--radius-sm)';
    row.style.marginBottom = '5px';

    const labelText = c.activo ? '🟢 HABILITADO' : '🔴 DESHABILITADO';
    const btnText = c.activo ? 'Desactivar' : 'Activar';
    const btnColor = c.activo ? '#ef4444' : '#10b981';

    // Diagnósticos en vivo del collar físico
    const bateriaText = c.nivel_bateria !== null && c.nivel_bateria !== undefined ? `${c.nivel_bateria}%` : '--';
    const senalText = c.senal_celular !== null && c.senal_celular !== undefined ? `${c.senal_celular}/5` : '--';
    const conexionText = c.ultima_conexion ? new Date(c.ultima_conexion).toLocaleTimeString() : 'Nunca';

    row.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary);">ID: ${c.id}</span>
        <span style="font-size: 0.7rem; color: var(--text-secondary);">${labelText} (${c.numero_sim})</span>
        <span style="font-size: 0.65rem; color: var(--text-secondary);">🔋 ${bateriaText} | 📶 ${senalText} | 🕒 ${conexionText}</span>
      </div>
      <button type="button" class="toggle-collar-btn" data-id="${c.id}" data-active="${c.activo}" style="
        padding: 4px 8px;
        background-color: ${btnColor};
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition-smooth);
      ">${btnText}</button>
    `;

    const toggleBtn = row.querySelector('.toggle-collar-btn');
    toggleBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const collarId = toggleBtn.getAttribute('data-id');
      const currentActive = toggleBtn.getAttribute('data-active') === 'true';
      const nextActive = !currentActive;

      const confirmChange = confirm(`¿Estás seguro de que deseas ${nextActive ? 'Habilitar' : 'Deshabilitar'} el collar '${collarId}'?`);
      if (!confirmChange) return;

      try {
        await updateCollarStatus(collarId, nextActive);
        alert(`Collar '${collarId}' ${nextActive ? 'habilitado' : 'deshabilitado'} con éxito.`);
        await refreshData();
      } catch (err) {
        alert(`Error al actualizar estado: ${err.message}`);
      }
    });

    container.appendChild(row);
  });
}
