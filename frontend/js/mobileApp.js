/**
 * mobileApp.js
 * Controlador de la App Móvil de Campo (PWA) de CollarNet.
 * Sprint 2: Manga (3 toques), Lector QR, Pesaje Ágil & GDP, Brújula GPS y Sincronización Offline.
 */

import { enqueueAction, getPendingQueue, removeQueueItem, cacheSet, cacheGet } from './dbLocal.js';

// Estado global de la aplicación móvil
const state = {
  isOnline: navigator.onLine,
  animals: [],
  collars: [],
  paddocks: [],
  owners: [],
  currentTab: 'tab-manga',
  activeQRScanner: null,
  userLocation: { lat: 9.1000, lon: -67.1005 }, // Coordenada base finca de pruebas
  deviceHeading: 0,
  selectedTargetAnimal: null,
  currentUser: null
};

// ==========================================================================
// 1. INICIALIZACIÓN ROBUSTA
// ==========================================================================
async function initApp() {
  setupAuthModule();
  setupNavigation();
  setupNetworkListeners();
  setupMangaModule();
  setupQRModule();
  setupPesajeModule();
  setupCompassModule();
  setupOfflineModule();

  // Cargar datos iniciales
  await refreshData();
  await updateQueueBadge();

  // Registrar Service Worker si está soportado
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (e) {
      console.log('[PWA] Service Worker registration skipped');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ==========================================================================
// 2. NAVEGACIÓN Y TABS
// ==========================================================================
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

export function switchTab(tabId) {
  state.currentTab = tabId;

  // Actualizar botones de navegación
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // Mostrar panel de contenido
  document.querySelectorAll('.tab-content').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId);
  });

  // Detener cámara si salimos de la pestaña QR
  if (tabId !== 'tab-qr' && state.activeQRScanner) {
    stopQRCamera();
  }

  // Activar brújula si entramos en pestaña brújula
  if (tabId === 'tab-brujula') {
    startCompassTracking();
  }
}

// ==========================================================================
// 3. GESTIÓN DE CONEXIÓN ONLINE / OFFLINE
// ==========================================================================
function setupNetworkListeners() {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  function updateStatus(online) {
    state.isOnline = online;
    if (online) {
      statusPill.classList.remove('offline');
      statusText.textContent = 'Online';
      showToast('📡 Conexión restablecida', 'success');
      // Intentar auto-sincronización
      syncOfflineQueue();
    } else {
      statusPill.classList.add('offline');
      statusText.textContent = 'Modo Offline';
      showToast('📶 Trabajando sin conexión (Modo Campo)', 'warn');
    }
  }

  window.addEventListener('online', () => updateStatus(true));
  window.addEventListener('offline', () => updateStatus(false));
  updateStatus(navigator.onLine);
}

// ==========================================================================
// 4. CARGA Y CACHÉ DE DATOS
// ==========================================================================
async function refreshData() {
  if (state.isOnline) {
    try {
      const [animalsRes, collarsRes, paddocksRes, ownersRes] = await Promise.all([
        fetch('/api/animales/monitoreo').then(r => r.json()),
        fetch('/api/collares').then(r => r.json()),
        fetch('/api/geocercas/potreros').then(r => r.json()),
        fetch('/api/propietarios').then(r => r.json()).catch(() => [])
      ]);

      state.animals = Array.isArray(animalsRes) ? animalsRes : [];
      state.collars = Array.isArray(collarsRes) ? collarsRes : [];
      state.paddocks = Array.isArray(paddocksRes) ? paddocksRes : [];
      state.owners = Array.isArray(ownersRes) ? ownersRes : [];

      // Guardar en IndexedDB para disponibilidad offline
      await cacheSet('cached_animals', state.animals);
      await cacheSet('cached_collars', state.collars);
      await cacheSet('cached_paddocks', state.paddocks);
      await cacheSet('cached_owners', state.owners);

    } catch (err) {
      console.warn('[Data] Fallo al consultar backend, recurriendo a IndexedDB local:', err);
      await loadFromLocalCache();
    }
  } else {
    await loadFromLocalCache();
  }

  populateSelectOptions();
}

async function loadFromLocalCache() {
  state.animals = (await cacheGet('cached_animals')) || [];
  state.collars = (await cacheGet('cached_collars')) || [];
  state.paddocks = (await cacheGet('cached_paddocks')) || [];
  state.owners = (await cacheGet('cached_owners')) || [];
}

function populateSelectOptions() {
  // 1. Selector de Res en Manga
  const mangaAnimalSel = document.getElementById('manga-select-animal');
  if (mangaAnimalSel) {
    mangaAnimalSel.innerHTML = '<option value="">Selecciona Res existente...</option>';
    state.animals.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.animal_id;
      opt.textContent = `🐂 ${a.arete_visual} - ${a.raza || 'Sin raza'} (${a.collar_id ? 'Collar: ' + a.collar_id : 'Sin collar'})`;
      mangaAnimalSel.appendChild(opt);
    });
  }

  // 2. Selector de Collares en Manga
  const mangaCollarSel = document.getElementById('manga-select-collar');
  if (mangaCollarSel) {
    mangaCollarSel.innerHTML = '<option value="">Selecciona Collar...</option>';
    state.collars.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `📱 ${c.id} (Bat: ${c.nivel_bateria ?? '--'}%)`;
      mangaCollarSel.appendChild(opt);
    });
  }

  // 3. Selector de Potreros en Manga
  const mangaPotreroSel = document.getElementById('manga-select-potrero');
  if (mangaPotreroSel) {
    mangaPotreroSel.innerHTML = '<option value="">Selecciona Potrero...</option>';
    state.paddocks.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `🟡 ${p.nombre} (Cap: ${p.capacidad_max_cabezas || 50} cab)`;
      mangaPotreroSel.appendChild(opt);
    });
  }

  // 4. Selector de Res en Pesaje
  const pesoAnimalSel = document.getElementById('peso-select-animal');
  if (pesoAnimalSel) {
    pesoAnimalSel.innerHTML = '<option value="">Selecciona la res...</option>';
    state.animals.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.animal_id;
      opt.textContent = `🐂 ${a.arete_visual} (${a.categoria || 'Novillo'} - ${a.raza || 'Nelore'})`;
      pesoAnimalSel.appendChild(opt);
    });
  }

  // 5. Selector de Res en Brújula
  const compassAnimalSel = document.getElementById('compass-select-animal');
  if (compassAnimalSel) {
    compassAnimalSel.innerHTML = '<option value="">Selecciona res para rastreo...</option>';
    state.animals.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.animal_id;
      const statusIcon = a.estado_alerta === 'ESCAPE_HATO' ? '🚨' : (a.estado_alerta === 'INFRACCION_ROTACION' ? '⚠️' : '🟢');
      opt.textContent = `${statusIcon} ${a.arete_visual} - ${a.potrero_asignado_nombre || 'Sin potrero'}`;
      compassAnimalSel.appendChild(opt);
    });
  }
}

// ==========================================================================
// 5. MÓDULO 1: MANGA / CORRAL (VINCULACIÓN EN 3 TOQUES)
// ==========================================================================
function setupMangaModule() {
  const form = document.getElementById('form-manga-sync');
  const btnNewAnimal = document.getElementById('btn-quick-new-animal');
  const newAnimalBox = document.getElementById('quick-new-animal-box');
  const btnMangaQR = document.getElementById('btn-manga-scan-qr');

  if (btnNewAnimal && newAnimalBox) {
    btnNewAnimal.addEventListener('click', () => {
      const isVisible = newAnimalBox.style.display === 'block';
      newAnimalBox.style.display = isVisible ? 'none' : 'block';
      btnNewAnimal.textContent = isVisible ? '➕ Nueva' : '✖ Cancelar';
      if (!isVisible) {
        document.getElementById('manga-select-animal').value = '';
        document.getElementById('manga-select-animal').removeAttribute('required');
        document.getElementById('quick-arete').setAttribute('required', 'required');
      } else {
        document.getElementById('manga-select-animal').setAttribute('required', 'required');
        document.getElementById('quick-arete').removeAttribute('required');
      }
    });
  }

  if (btnMangaQR) {
    btnMangaQR.addEventListener('click', () => {
      switchTab('tab-qr');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const isQuickNew = newAnimalBox && newAnimalBox.style.display === 'block';
      const collarId = document.getElementById('manga-select-collar').value;
      const potreroId = document.getElementById('manga-select-potrero').value;

      let animalId = null;
      let areteVisual = '';

      if (isQuickNew) {
        areteVisual = document.getElementById('quick-arete').value.trim();
        const raza = document.getElementById('quick-raza').value.trim() || 'Nelore';
        const categoria = document.getElementById('quick-categoria').value;

        if (!areteVisual) {
          showToast('Ingresa el número de arete', 'warn');
          return;
        }

        const newAnimalPayload = {
          areteVisual,
          raza,
          categoria,
          collarId,
          potreroId,
          propietarioId: state.owners[0]?.id || 1,
          fechaNacimiento: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
        };

        await processMangaLink('ALTA_Y_VINCULAR', newAnimalPayload, `Alta y asignación arete ${areteVisual} con collar ${collarId}`);
      } else {
        animalId = document.getElementById('manga-select-animal').value;
        const selectedAnimal = state.animals.find(a => String(a.animal_id) === String(animalId));
        areteVisual = selectedAnimal ? selectedAnimal.arete_visual : `ID ${animalId}`;

        const linkPayload = {
          animalId,
          collarId,
          potreroId
        };

        await processMangaLink('REASIGNAR_MANGA', linkPayload, `Vinculación res ${areteVisual} a collar ${collarId}`);
      }
    });
  }
}

async function processMangaLink(type, payload, description) {
  if (state.isOnline) {
    try {
      if (type === 'ALTA_Y_VINCULAR') {
        const res = await fetch('/api/animales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al vincular en manga');
        }
      } else {
        // Reasignar animal
        const selPotrero = state.paddocks.find(p => String(p.id) === String(payload.potreroId));
        if (selPotrero) {
          await fetch('/api/geocercas/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collarId: payload.collarId,
              hatoId: selPotrero.hato_id || 1,
              potreroId: payload.potreroId
            })
          });
        }
      }

      showToast(`⚡ ¡${description} exitosa!`, 'success');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      await refreshData();
      resetMangaForm();
    } catch (err) {
      console.warn('[Manga] Error online, guardando en cola offline:', err.message);
      await enqueueAction(type, payload, description);
      showToast(`📦 Guardado en cola local (Offline): ${description}`, 'warn');
      await updateQueueBadge();
      resetMangaForm();
    }
  } else {
    await enqueueAction(type, payload, description);
    showToast(`📦 Guardado en cola local (Offline): ${description}`, 'warn');
    await updateQueueBadge();
    resetMangaForm();
  }
}

function resetMangaForm() {
  const form = document.getElementById('form-manga-sync');
  if (form) form.reset();
  const newAnimalBox = document.getElementById('quick-new-animal-box');
  if (newAnimalBox) newAnimalBox.style.display = 'none';
  const btnNewAnimal = document.getElementById('btn-quick-new-animal');
  if (btnNewAnimal) btnNewAnimal.textContent = '➕ Nueva';
}

// ==========================================================================
// 6. MÓDULO 2: LECTOR QR Y CÁMARA
// ==========================================================================
function setupQRModule() {
  const btnToggleCam = document.getElementById('btn-toggle-camera');
  const simBtns = document.querySelectorAll('.btn-sim-qr');
  const actionManga = document.getElementById('btn-qr-action-manga');
  const actionPeso = document.getElementById('btn-qr-action-peso');

  if (btnToggleCam) {
    btnToggleCam.addEventListener('click', () => {
      if (state.activeQRScanner) {
        stopQRCamera();
      } else {
        startQRCamera();
      }
    });
  }

  // Botones de simulación para pruebas en escritorio
  simBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      handleQRCodeDetected(code);
    });
  });

  if (actionManga) {
    actionManga.addEventListener('click', () => {
      const text = document.getElementById('qr-result-text').textContent.trim();
      applyQRToManga(text);
    });
  }

  if (actionPeso) {
    actionPeso.addEventListener('click', () => {
      const text = document.getElementById('qr-result-text').textContent.trim();
      applyQRToPesaje(text);
    });
  }
}

async function startQRCamera() {
  const videoElem = document.getElementById('qr-video-preview');
  const placeholder = document.getElementById('qr-placeholder-msg');
  const btnToggle = document.getElementById('btn-toggle-camera');

  try {
    if (window.Html5Qrcode) {
      state.activeQRScanner = new Html5Qrcode('qr-container');
      await state.activeQRScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          handleQRCodeDetected(decodedText);
          stopQRCamera();
        },
        () => {} // Ignorar frames sin QR
      );
      if (placeholder) placeholder.style.display = 'none';
      if (btnToggle) btnToggle.textContent = '⏹ Detener Cámara';
    } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoElem.srcObject = stream;
      state.activeQRScanner = stream;
      if (placeholder) placeholder.style.display = 'none';
      if (btnToggle) btnToggle.textContent = '⏹ Detener Cámara';
    } else {
      showToast('Cámara no compatible. Usa los botones de simulación.', 'warn');
    }
  } catch (err) {
    console.warn('[QR] No se pudo acceder a la cámara:', err);
    showToast('No se pudo acceder a la cámara. Usa la simulación.', 'warn');
  }
}

function stopQRCamera() {
  const btnToggle = document.getElementById('btn-toggle-camera');
  const placeholder = document.getElementById('qr-placeholder-msg');

  if (state.activeQRScanner) {
    if (state.activeQRScanner.stop) {
      state.activeQRScanner.stop().catch(() => {});
    } else if (state.activeQRScanner.getTracks) {
      state.activeQRScanner.getTracks().forEach(t => t.stop());
    }
    state.activeQRScanner = null;
  }

  if (placeholder) placeholder.style.display = 'block';
  if (btnToggle) btnToggle.textContent = '📷 Activar Cámara';
}

function handleQRCodeDetected(code) {
  if (!code) return;
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

  const resultCard = document.getElementById('qr-result-card');
  const resultText = document.getElementById('qr-result-text');
  const codeType = document.getElementById('qr-code-type');

  if (resultCard && resultText) {
    resultText.textContent = code;
    const isCollar = code.toLowerCase().includes('collar');
    codeType.textContent = isCollar ? 'Collar Hardware' : 'Arete Ganadero';
    resultCard.style.display = 'block';
    showToast(`🎯 Detectado: ${code}`, 'success');
  }
}

function applyQRToManga(code) {
  switchTab('tab-manga');
  const isCollar = code.toLowerCase().includes('collar');
  if (isCollar) {
    const collarSel = document.getElementById('manga-select-collar');
    if (collarSel) {
      // Buscar coincidencia exacta o crear opción temporal
      let found = false;
      for (let opt of collarSel.options) {
        if (opt.value.toLowerCase() === code.toLowerCase()) {
          collarSel.value = opt.value;
          found = true;
          break;
        }
      }
      if (!found) {
        const opt = new Option(`📱 ${code} (Detectado por QR)`, code, true, true);
        collarSel.add(opt);
      }
    }
  } else {
    const animalSel = document.getElementById('manga-select-animal');
    if (animalSel) {
      for (let opt of animalSel.options) {
        if (opt.textContent.includes(code)) {
          animalSel.value = opt.value;
          break;
        }
      }
    }
  }
}

function applyQRToPesaje(code) {
  switchTab('tab-pesaje');
  const pesoSel = document.getElementById('peso-select-animal');
  if (pesoSel) {
    for (let opt of pesoSel.options) {
      if (opt.textContent.includes(code)) {
        pesoSel.value = opt.value;
        pesoSel.dispatchEvent(new Event('change'));
        break;
      }
    }
  }
}

// ==========================================================================
// 7. MÓDULO 3: PESAJE ÁGIL Y GANANCIA DIARIA DE PESO (GDP)
// ==========================================================================
function setupPesajeModule() {
  const form = document.getElementById('form-pesaje-campo');
  const selectAnimal = document.getElementById('peso-select-animal');
  const inputWeight = document.getElementById('input-weight-val');
  const quickBtns = document.querySelectorAll('.btn-add-weight');
  const prevInfo = document.getElementById('peso-prev-info');
  const valPrevWeight = document.getElementById('val-prev-weight');
  const valPrevDate = document.getElementById('val-prev-date');
  const gdpVal = document.getElementById('gdp-calculated-val');
  const gdpDays = document.getElementById('gdp-days-count');

  let lastWeight = 380;
  let lastDate = new Date(Date.now() - 30 * 24 * 3600 * 1000); // 30 días atrás por defecto

  if (selectAnimal) {
    selectAnimal.addEventListener('change', async () => {
      const animalId = selectAnimal.value;
      if (!animalId) {
        prevInfo.style.display = 'none';
        return;
      }

      // Obtener último pesaje conocido
      if (state.isOnline) {
        try {
          const res = await fetch(`/api/proyecciones/${animalId}`).then(r => r.json());
          if (res.pesoActual) {
            lastWeight = parseFloat(res.pesoActual);
            valPrevWeight.textContent = `${lastWeight.toFixed(1)} kg`;
            valPrevDate.textContent = 'Hace ~30 días';
            prevInfo.style.display = 'block';
            inputWeight.value = (lastWeight + 15).toFixed(1); // Sugerencia inteligente
            calculateGDP();
          }
        } catch (e) {
          prevInfo.style.display = 'block';
          valPrevWeight.textContent = `${lastWeight} kg`;
          valPrevDate.textContent = 'Caché previa';
        }
      } else {
        prevInfo.style.display = 'block';
        valPrevWeight.textContent = `${lastWeight} kg`;
        valPrevDate.textContent = 'Registro local';
      }
    });
  }

  // Incrementar peso con botones rápidos
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const add = parseFloat(btn.getAttribute('data-add') || '0');
      const current = parseFloat(inputWeight.value) || lastWeight || 300;
      inputWeight.value = (current + add).toFixed(1);
      calculateGDP();
    });
  });

  if (inputWeight) {
    inputWeight.addEventListener('input', calculateGDP);
  }

  function calculateGDP() {
    const current = parseFloat(inputWeight.value);
    if (!current || !lastWeight) {
      gdpVal.textContent = '-- kg/día';
      return;
    }

    const daysDiff = 30; // Promedio estándar de pesaje mensual
    const gain = current - lastWeight;
    const gdp = gain / daysDiff;

    const sign = gdp >= 0 ? '+' : '';
    gdpVal.textContent = `${sign}${gdp.toFixed(3)} kg/día`;
    gdpVal.style.color = gdp >= 0.7 ? 'var(--primary-light)' : (gdp >= 0.3 ? 'var(--accent-amber)' : 'var(--accent-rose)');
    if (gdpDays) gdpDays.textContent = `Ganancia: ${sign}${gain.toFixed(1)} kg en ${daysDiff} días`;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const animalId = selectAnimal.value;
      const peso = parseFloat(inputWeight.value);

      if (!animalId || isNaN(peso) || peso <= 0) {
        showToast('Selecciona un animal e ingresa un peso válido', 'warn');
        return;
      }

      const selAnimalObj = state.animals.find(a => String(a.animal_id) === String(animalId));
      const areteText = selAnimalObj ? selAnimalObj.arete_visual : `ID ${animalId}`;
      const payload = {
        animalId: parseInt(animalId, 10),
        peso,
        fechaPesaje: new Date().toISOString().split('T')[0]
      };

      const desc = `Pesaje de ${peso} kg para res ${areteText}`;

      if (state.isOnline) {
        try {
          const res = await fetch('/api/pesajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error('Fallo al registrar pesaje');
          showToast(`⚖️ ¡${desc} guardado exitosamente!`, 'success');
          if (navigator.vibrate) navigator.vibrate([100]);
          inputWeight.value = '';
          gdpVal.textContent = '-- kg/día';
        } catch (err) {
          await enqueueAction('REGISTRO_PESAJE', payload, desc);
          showToast(`📦 Guardado en cola local (Offline): ${desc}`, 'warn');
          await updateQueueBadge();
          inputWeight.value = '';
        }
      } else {
        await enqueueAction('REGISTRO_PESAJE', payload, desc);
        showToast(`📦 Guardado en cola local (Offline): ${desc}`, 'warn');
        await updateQueueBadge();
        inputWeight.value = '';
      }
    });
  }
}

// ==========================================================================
// 8. MÓDULO 4: BRÚJULA DE RESCATE / RASTREO ("BUSCAR RES")
// ==========================================================================
function setupCompassModule() {
  const selectAnimal = document.getElementById('compass-select-animal');
  const btnRotLeft = document.getElementById('btn-rotate-left');
  const btnRotRight = document.getElementById('btn-rotate-right');
  const btnGpsHere = document.getElementById('btn-gps-here');

  if (selectAnimal) {
    selectAnimal.addEventListener('change', () => {
      const animalId = selectAnimal.value;
      state.selectedTargetAnimal = state.animals.find(a => String(a.animal_id) === String(animalId)) || null;
      updateCompassDisplay();
    });
  }

  // Simulador de rotación manual para pruebas en PC
  if (btnRotLeft) {
    btnRotLeft.addEventListener('click', () => {
      state.deviceHeading = (state.deviceHeading - 25 + 360) % 360;
      updateCompassDisplay();
    });
  }

  if (btnRotRight) {
    btnRotRight.addEventListener('click', () => {
      state.deviceHeading = (state.deviceHeading + 25) % 360;
      updateCompassDisplay();
    });
  }

  if (btnGpsHere) {
    btnGpsHere.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            showToast(`📍 GPS fijado: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'success');
            updateCompassDisplay();
          },
          err => {
            showToast('GPS simulado en potrero activo', 'warn');
            updateCompassDisplay();
          }
        );
      }
    });
  }
}

function startCompassTracking() {
  // 1. Escuchar sensor de orientación magnética del teléfono (DeviceOrientation)
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
      let heading = event.alpha;
      if (event.webkitCompassHeading) {
        // iOS Safari
        heading = event.webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android Chrome
        heading = 360 - event.alpha;
      }
      if (heading !== null && !isNaN(heading)) {
        state.deviceHeading = heading;
        updateCompassDisplay();
      }
    }, true);
  }

  // 2. Escuchar ubicación GPS
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      pos => {
        state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        updateCompassDisplay();
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }
}

function updateCompassDisplay() {
  const needle = document.getElementById('compass-needle');
  const distVal = document.getElementById('compass-dist-val');
  const bearingVal = document.getElementById('compass-bearing-val');

  if (!state.selectedTargetAnimal) {
    if (needle) needle.style.transform = `rotate(${-state.deviceHeading}deg)`;
    if (distVal) distVal.textContent = '-- m';
    if (bearingVal) bearingVal.textContent = 'Selecciona una res arriba';
    return;
  }

  // Coordenadas del animal (de telemetría o simuladas)
  const targetLat = state.selectedTargetAnimal.latitud || 9.1008;
  const targetLon = state.selectedTargetAnimal.longitud || -67.0992;

  // Cálculo de distancia en metros (Haversine)
  const distMeters = calculateHaversineDistance(
    state.userLocation.lat, state.userLocation.lon,
    targetLat, targetLon
  );

  // Cálculo de acimut / rumbo hacia el objetivo
  const targetBearing = calculateBearing(
    state.userLocation.lat, state.userLocation.lon,
    targetLat, targetLon
  );

  // Ángulo relativo de la aguja considerando la orientación del teléfono
  const needleAngle = (targetBearing - state.deviceHeading + 360) % 360;

  if (needle) {
    needle.style.transform = `rotate(${needleAngle}deg)`;
  }

  if (distVal) {
    distVal.textContent = distMeters >= 1000 
      ? `${(distMeters / 1000).toFixed(2)} km` 
      : `${Math.round(distMeters)} m`;
  }

  if (bearingVal) {
    const cardinal = getCardinalDirection(targetBearing);
    bearingVal.textContent = `Rumbo: ${Math.round(targetBearing)}° (${cardinal}) | Aguja: ${Math.round(needleAngle)}°`;
  }
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
}

function getCardinalDirection(bearing) {
  const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// ==========================================================================
// 9. MÓDULO 5: OFFLINE & COLA DE SINCRONIZACIÓN
// ==========================================================================
function setupOfflineModule() {
  const btnSync = document.getElementById('btn-sync-now');
  const btnCache = document.getElementById('btn-download-cache');

  if (btnSync) {
    btnSync.addEventListener('click', syncOfflineQueue);
  }

  if (btnCache) {
    btnCache.addEventListener('click', async () => {
      await refreshData();
      showToast('📥 Catálogos actualizados en almacenamiento local', 'success');
    });
  }
}

async function updateQueueBadge() {
  const queue = await getPendingQueue();
  const badge = document.getElementById('sync-count-badge');
  const queueCountText = document.getElementById('offline-queue-count');
  const queueList = document.getElementById('offline-queue-list');

  const count = queue.length;
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }

  if (queueCountText) {
    queueCountText.textContent = `${count} registro${count === 1 ? '' : 's'}`;
  }

  if (queueList) {
    if (count === 0) {
      queueList.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dim); text-align: center; padding: 20px;">No hay operaciones pendientes en cola local.</p>';
    } else {
      queueList.innerHTML = '';
      queue.forEach(item => {
        const el = document.createElement('div');
        el.className = 'queue-item';
        el.innerHTML = `
          <div>
            <div class="queue-item-type">${item.type}</div>
            <div class="queue-item-desc">${item.description}</div>
            <div class="queue-item-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
          </div>
          <span style="font-size: 1.1rem;">⏳</span>
        `;
        queueList.appendChild(el);
      });
    }
  }
}

async function syncOfflineQueue() {
  const queue = await getPendingQueue();
  if (queue.length === 0) {
    showToast('Todo está sincronizado con el servidor', 'success');
    return;
  }

  if (!state.isOnline) {
    showToast('No hay conexión a internet para sincronizar', 'warn');
    return;
  }

  showToast(`Sincronizando ${queue.length} registros...`, 'warn');
  let successCount = 0;

  for (const item of queue) {
    try {
      if (item.type === 'REGISTRO_PESAJE') {
        const res = await fetch('/api/pesajes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        if (res.ok) {
          await removeQueueItem(item.id);
          successCount++;
        }
      } else if (item.type === 'ALTA_Y_VINCULAR') {
        const res = await fetch('/api/animales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });
        if (res.ok) {
          await removeQueueItem(item.id);
          successCount++;
        }
      } else if (item.type === 'REASIGNAR_MANGA') {
        const selPotrero = state.paddocks.find(p => String(p.id) === String(item.payload.potreroId));
        if (selPotrero) {
          await fetch('/api/geocercas/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collarId: item.payload.collarId,
              hatoId: selPotrero.hato_id || 1,
              potreroId: item.payload.potreroId
            })
          });
        }
        await removeQueueItem(item.id);
        successCount++;
      }
    } catch (err) {
      console.error('[Sync] Error sincronizando elemento:', err);
    }
  }

  await updateQueueBadge();
  await refreshData();
  showToast(`✅ ${successCount} registros sincronizados con éxito`, 'success');
}

// ==========================================
// 11. MÓDULO DE AUTENTICACIÓN / USUARIOS
// ==========================================
function setupAuthModule() {
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('form-login-mobile');
  const userHeaderBadge = document.getElementById('user-header-badge');
  const userRoleIcon = document.getElementById('user-role-icon');
  const userNameShort = document.getElementById('user-name-short');
  const btnLogout = document.getElementById('btn-header-logout');
  const quickUserBtns = document.querySelectorAll('.btn-quick-user');

  const emailInput = document.getElementById('login-email');
  const pwdInput = document.getElementById('login-password');

  // 1. Revisar sesión existente
  const savedUserStr = localStorage.getItem('collarnet_user');
  if (savedUserStr) {
    try {
      state.currentUser = JSON.parse(savedUserStr);
      renderUserSession();
    } catch (e) {
      localStorage.removeItem('collarnet_user');
    }
  }

  // 2. Botones de acceso rápido
  quickUserBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = btn.getAttribute('data-email');
      const password = btn.getAttribute('data-pwd');
      if (emailInput) emailInput.value = email;
      if (pwdInput) pwdInput.value = password;
      await executeLogin(email, password);
    });
  });

  // 3. Formulario manual de login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      await executeLogin(email, password);
    });
  }

  // 4. Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.removeItem('collarnet_user');
      state.currentUser = null;
      if (userHeaderBadge) userHeaderBadge.style.display = 'none';
      if (loginOverlay) loginOverlay.style.display = 'flex';
      showToast('Sesión cerrada', 'warn');
    });
  }

  async function executeLogin(email, password) {
    try {
      showToast('Autenticando usuario...', 'warn');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      state.currentUser = data.user;
      localStorage.setItem('collarnet_user', JSON.stringify(data.user));
      renderUserSession();
      showToast(`¡Bienvenido, ${data.user.nombre.split(' ')[0]}! (${data.user.rol})`, 'success');
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
  }

  function renderUserSession() {
    if (!state.currentUser) return;
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (userHeaderBadge) {
      userHeaderBadge.style.display = 'flex';
      const role = state.currentUser.rol;
      userRoleIcon.textContent = role === 'SUPERADMIN' ? '👑' : (role === 'ADMIN_FINCA' ? '🚜' : '🤠');
      userNameShort.textContent = state.currentUser.nombre.split(' ')[0];
      userHeaderBadge.title = `${state.currentUser.nombre} (${state.currentUser.rol}) - ${state.currentUser.email}`;
    }
  }
}

