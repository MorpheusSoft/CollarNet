// Capas de Mapas
const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

let map = null;
let activeLayer = null;
let animalMarkersMap = new Map(); // collarId -> Leaflet marker
let hatoPolygonsMap = new Map();
let potreroPolygonsMap = new Map();

// Estado de dibujo manual
let isDrawing = false;
let drawMode = null; // 'hato' o 'potrero'
let tempPoints = [];
let tempMarkers = [];
let tempPolyline = null;
let onPolygonCompleteCallback = null;

/**
 * Inicializa el mapa de Leaflet
 */
export function initMap(lat = 9.1000, lon = -67.1000, zoom = 15) {
  const savedLat = localStorage.getItem('collarnet_saved_farm_lat');
  const savedLng = localStorage.getItem('collarnet_saved_farm_lng');
  if (savedLat && savedLng) {
    lat = parseFloat(savedLat);
    lon = parseFloat(savedLng);
  }

  map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([lat, lon], zoom);

  // Cargar satélite de Esri por defecto
  setLayer(ESRI_SATELLITE, 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, and the GIS User Community');

  // Registrar eventos de mapa para dibujo poligonal libre
  map.on('click', handleMapClick);

  // Agregar botón flotante de Posición Actual GPS en los controles de la esquina superior izquierda
  const locateControl = L.control({ position: 'topleft' });
  locateControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom-locate');
    div.innerHTML = `<button type="button" title="Ir a Mi Posición Actual GPS" style="background:#121826; border:1px solid rgba(255,255,255,0.2); width:34px; height:34px; line-height:34px; font-size:16px; cursor:pointer; color:white; border-radius:4px; display:flex; align-items:center; justify-content:center;">📍</button>`;
    div.onclick = function(e) {
      L.DomEvent.stopPropagation(e);
      locateUserPosition();
    };
    return div;
  };
  locateControl.addTo(map);

  return map;
}

/**
 * Cambia la capa del mapa (Satélite vs Calles)
 */
export function setLayer(url, attribution = '') {
  if (activeLayer) map.removeLayer(activeLayer);
  activeLayer = L.tileLayer(url, {
    maxZoom: 19,
    attribution: attribution
  }).addTo(map);
}

/**
 * Registra un callback para cuando se complete un dibujo poligonal
 */
export function onPolygonComplete(callback) {
  onPolygonCompleteCallback = callback;
}

/**
 * Activa el modo de dibujo de polígonos
 */
export function startDrawing(mode) {
  cancelDrawing(); // resetear dibujos previos
  isDrawing = true;
  drawMode = mode;
  console.log(`[Map] Iniciando dibujo para: ${mode}`);
  showDrawingControlBanner();
}

/**
 * Cancela el dibujo actual y limpia la interfaz
 */
export function cancelDrawing() {
  isDrawing = false;
  drawMode = null;
  tempPoints = [];
  
  tempMarkers.forEach(m => map.removeLayer(m));
  tempMarkers = [];
  
  if (tempPolyline) {
    map.removeLayer(tempPolyline);
    tempPolyline = null;
  }

  hideDrawingControlBanner();
}

/**
 * Cambia dinámicamente el modo de trazado (Hato = Rojo vs Potrero = Amarillo)
 */
export function setDrawMode(mode) {
  drawMode = mode;
  const color = drawMode === 'hato' ? '#ef4444' : '#f59e0b';

  // Actualizar la línea conectora en tiempo real
  if (tempPolyline) {
    tempPolyline.setStyle({ color: color });
  }

  // Actualizar el color de los marcadores de vértices en tiempo real
  tempMarkers.forEach(m => {
    m.setStyle({ color: color });
  });

  // Actualizar los botones de pastilla (pills) del banner
  const pillHato = document.getElementById('banner-pill-hato');
  const pillPotrero = document.getElementById('banner-pill-potrero');

  if (pillHato && pillPotrero) {
    if (mode === 'hato') {
      pillHato.style.background = 'rgba(239, 68, 68, 0.35)';
      pillHato.style.borderColor = '#ef4444';
      pillHato.style.fontWeight = '700';
      pillPotrero.style.background = 'rgba(255, 255, 255, 0.05)';
      pillPotrero.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      pillPotrero.style.fontWeight = '500';
    } else {
      pillPotrero.style.background = 'rgba(245, 158, 11, 0.35)';
      pillPotrero.style.borderColor = '#f59e0b';
      pillPotrero.style.fontWeight = '700';
      pillHato.style.background = 'rgba(255, 255, 255, 0.05)';
      pillHato.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      pillHato.style.fontWeight = '500';
    }
  }
}

/**
 * Renderiza el banner flotante de control de trazado sobre el mapa
 */
function showDrawingControlBanner() {
  hideDrawingControlBanner();

  const banner = document.createElement('div');
  banner.id = 'map-drawing-banner';
  banner.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 30px;
    padding: 8px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.6);
    color: white;
    font-size: 0.85rem;
    backdrop-filter: blur(8px);
  `;

  const isHato = drawMode === 'hato';

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <button id="banner-pill-hato" type="button" style="
        background: ${isHato ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.05)'};
        color: white;
        border: 1px solid ${isHato ? '#ef4444' : 'rgba(255,255,255,0.2)'};
        padding: 4px 10px;
        border-radius: 14px;
        font-size: 0.75rem;
        cursor: pointer;
        font-weight: ${isHato ? '700' : '500'};
        transition: all 0.2s ease;
      ">🔴 Hato (Rojo)</button>
      <button id="banner-pill-potrero" type="button" style="
        background: ${!isHato ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255,255,255,0.05)'};
        color: white;
        border: 1px solid ${!isHato ? '#f59e0b' : 'rgba(255,255,255,0.2)'};
        padding: 4px 10px;
        border-radius: 14px;
        font-size: 0.75rem;
        cursor: pointer;
        font-weight: ${!isHato ? '700' : '500'};
        transition: all 0.2s ease;
      ">🟡 Potrero (Amarillo)</button>
    </div>
    <span style="border-left: 1px solid rgba(255,255,255,0.2); padding-left: 10px;">
      <small id="drawing-banner-count">0 puntos</small>
    </span>
    <button id="btn-banner-finish-drawing" style="
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
    ">✅ Finalizar y Nombrar</button>
    <button id="btn-banner-undo-drawing" style="
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
    ">↩️ Deshacer</button>
    <button id="btn-banner-cancel-drawing" style="
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.4);
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
    ">❌ Cancelar</button>
  `;

  const mapContainer = document.getElementById('map');
  if (mapContainer) mapContainer.appendChild(banner);

  document.getElementById('banner-pill-hato').addEventListener('click', (e) => {
    e.stopPropagation();
    setDrawMode('hato');
  });

  document.getElementById('banner-pill-potrero').addEventListener('click', (e) => {
    e.stopPropagation();
    setDrawMode('potrero');
  });

  document.getElementById('btn-banner-finish-drawing').addEventListener('click', (e) => {
    e.stopPropagation();
    closePolygon();
  });

  document.getElementById('btn-banner-undo-drawing').addEventListener('click', (e) => {
    e.stopPropagation();
    undoLastAction();
    updateDrawingBannerCount();
  });

  document.getElementById('btn-banner-cancel-drawing').addEventListener('click', (e) => {
    e.stopPropagation();
    cancelDrawing();
  });
}

function hideDrawingControlBanner() {
  const banner = document.getElementById('map-drawing-banner');
  if (banner) banner.remove();
}

function updateDrawingBannerCount() {
  const countElem = document.getElementById('drawing-banner-count');
  if (countElem) {
    countElem.textContent = `${tempPoints.length} punto${tempPoints.length === 1 ? '' : 's'}`;
  }
}

/**
 * Maneja el clic en el mapa para recolectar vértices
 */
function handleMapClick(e) {
  if (!isDrawing) return;

  const latlng = e.latlng;
  tempPoints.push([latlng.lat, latlng.lng]);

  updateDrawingBannerCount();

  // Crear marcador para el vértice
  const marker = L.circleMarker(latlng, {
    radius: 7,
    color: drawMode === 'hato' ? '#ef4444' : '#f59e0b',
    fillColor: '#ffffff',
    fillOpacity: 1,
    weight: 2
  }).addTo(map);

  // Permitir cerrar el polígono al hacer clic en cualquiera de los marcadores si hay 3 o más vértices
  marker.on('click', (event) => {
    L.DomEvent.stopPropagation(event);
    if (tempPoints.length >= 3) {
      closePolygon();
    } else {
      alert('Se requieren por lo menos 3 vértices para delimitar el perímetro.');
    }
  });

  marker.bindTooltip(tempMarkers.length === 0 ? 'Haz clic aquí o en "Finalizar" para nombrar' : `Vértice ${tempPoints.length}`, { direction: 'top' });

  tempMarkers.push(marker);

  // Dibujar línea conectora
  if (tempPolyline) {
    tempPolyline.addLatLng(latlng);
  } else {
    tempPolyline = L.polyline(tempPoints, {
      color: drawMode === 'hato' ? '#ef4444' : '#f59e0b',
      weight: 3,
      dashArray: '5, 5'
    }).addTo(map);
  }
}

/**
 * Cierra el polígono actual y retorna los vértices
 */
function closePolygon() {
  if (tempPoints.length < 3) {
    alert('Un polígono requiere por lo menos 3 vértices para ser guardado.');
    return;
  }

  const vertices = [...tempPoints];
  const mode = drawMode;

  // Dibujar polígono definitivo visual en el mapa
  const color = mode === 'hato' ? '#ef4444' : '#f59e0b';
  const fill = mode === 'hato' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.05)';
  
  const polygon = L.polygon(vertices, {
    color: color,
    weight: 3,
    fillColor: fill,
    fillOpacity: 1
  }).addTo(map);

  if (mode === 'hato') {
    hatoPolygonsMap.set('temp', polygon);
  } else {
    potreroPolygonsMap.set('temp', polygon);
  }

  hideDrawingControlBanner();

  // Notificar callback
  if (onPolygonCompleteCallback) {
    onPolygonCompleteCallback(mode, vertices);
  }

  // Limpiar temporales sin ocultar el polígono resultante
  isDrawing = false;
  drawMode = null;
  tempPoints = [];
  tempMarkers.forEach(m => map.removeLayer(m));
  tempMarkers = [];
  if (tempPolyline) {
    map.removeLayer(tempPolyline);
    tempPolyline = null;
  }
}


/**
 * Carga y dibuja los Hatos y Potreros en el mapa
 */
export function drawGeocercas(hatosList = [], potrerosList = []) {
  // Limpiar capas previas
  hatoPolygonsMap.forEach(p => map.removeLayer(p));
  potreroPolygonsMap.forEach(p => map.removeLayer(p));
  hatoPolygonsMap.clear();
  potreroPolygonsMap.clear();

  // Polígonos de zonas por defecto idénticos a la imagen adjunta
  const defaultZones = [
    {
      id: 'zone_milking',
      nombre: 'Milking Zone',
      color: '#10b981',
      fill: 'rgba(16, 185, 129, 0.25)',
      coords: [
        [9.1040, -67.1040],
        [9.1050, -67.1000],
        [9.1015, -67.0990],
        [9.1005, -67.1030]
      ]
    },
    {
      id: 'zone_resting',
      nombre: 'Resting Pastures',
      color: '#38bdf8',
      fill: 'rgba(56, 189, 248, 0.22)',
      coords: [
        [9.1005, -67.1030],
        [9.1015, -67.0990],
        [9.0970, -67.0980],
        [9.0960, -67.1020]
      ]
    },
    {
      id: 'zone_quarantine',
      nombre: 'Quarantine Area',
      color: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.25)',
      coords: [
        [9.0970, -67.0980],
        [9.0985, -67.0950],
        [9.0940, -67.0940],
        [9.0935, -67.0970]
      ]
    }
  ];

  defaultZones.forEach(z => {
    const poly = L.polygon(z.coords, {
      color: z.color,
      weight: 3,
      fillColor: z.fill,
      fillOpacity: 1
    }).addTo(map);
    poly.bindTooltip(z.nombre, { sticky: true });
    potreroPolygonsMap.set(z.id, poly);
  });

  // Dibujar Hatos pasados por parámetro o locales
  hatosList.forEach(h => {
    if (h.geojson) {
      try {
        const geo = typeof h.geojson === 'string' ? JSON.parse(h.geojson) : h.geojson;
        const coords = geo.coordinates[0].map(c => [c[1], c[0]]); // GeoJSON [lon, lat] -> Leaflet [lat, lon]
        const poly = L.polygon(coords, {
          color: '#ef4444',
          weight: 4,
          fillColor: 'rgba(239, 68, 68, 0.08)',
          fillOpacity: 1
        }).addTo(map);
        poly.bindTooltip(`🔴 Hato: ${h.nombre}`, { sticky: true });
        hatoPolygonsMap.set(h.id, poly);
      } catch (_) {}
    }
  });

  // Dibujar Potreros pasados por parámetro o locales
  potrerosList.forEach(p => {
    if (p.geojson) {
      try {
        const geo = typeof p.geojson === 'string' ? JSON.parse(p.geojson) : p.geojson;
        const coords = geo.coordinates[0].map(c => [c[1], c[0]]);
        const poly = L.polygon(coords, {
          color: '#f59e0b',
          weight: 3,
          fillColor: 'rgba(245, 158, 11, 0.05)',
          fillOpacity: 1
        }).addTo(map);
        poly.bindTooltip(`🟡 Potrero: ${p.nombre}`, { sticky: true });
        potreroPolygonsMap.set(p.id, poly);
      } catch (_) {}
    }
  });

  // Renderizar markers por defecto para C023, C098 y C105
  updateAnimalMarker({
    collarId: 'C105',
    areteVisual: 'C105',
    lat: 9.0985,
    lon: -67.0955,
    alertType: 'ESCAPE_HATO',
    potreroActual: 'North Boundary',
    bateria: 94,
    senal: 5
  });

  updateAnimalMarker({
    collarId: 'C098',
    areteVisual: 'C098',
    lat: 9.0980,
    lon: -67.1000,
    alertType: 'NORMAL',
    potreroActual: 'Resting Pasture 2',
    bateria: 91,
    senal: 5
  });

  updateAnimalMarker({
    collarId: 'C023',
    areteVisual: 'C023',
    lat: 9.1025,
    lon: -67.1015,
    alertType: 'NORMAL',
    potreroActual: 'Milking Zone',
    bateria: 88,
    senal: 5
  });
}

/**
 * Centra y enfoca la cámara sobre una geocerca específica
 */
export function focusOnGeofence(type, id) {
  const mapObj = type === 'hato' ? hatoPolygonsMap : potreroPolygonsMap;
  if (mapObj.has(id)) {
    recordCameraState(`Vista previa antes de enfocar geocerca ${id}`);
    const layer = mapObj.get(id);
    map.fitBounds(layer.getBounds());
    layer.openTooltip();
  }
}

// Estado de edición gráfica por arrastre de esquinas
let editHandles = [];
let editingMetadata = null;
let currentEditVertices = [];

/**
 * Activa la edición gráfica interactiva por arrastre de esquinas para una geocerca
 */
export function enablePolygonEditing(type, id, onSaveCallback) {
  disablePolygonEditing();

  const mapObj = type === 'hato' ? hatoPolygonsMap : potreroPolygonsMap;
  if (!mapObj.has(id)) return;

  const layerGroup = mapObj.get(id);
  let latlngs = [];

  layerGroup.eachLayer(layer => {
    if (layer.getLatLngs) {
      const raw = layer.getLatLngs();
      latlngs = Array.isArray(raw[0]) ? raw[0] : raw;
    }
  });

  if (!latlngs || latlngs.length === 0) return;

  map.fitBounds(layerGroup.getBounds());
  editingMetadata = { type, id, onSaveCallback };
  currentEditVertices = latlngs.map(pt => [pt.lat, pt.lng]);

  // Crear marcadores arrastrables en cada esquina
  editHandles = latlngs.map((pt, idx) => {
    const handle = L.marker([pt.lat, pt.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'vertex-edit-handle',
        html: `<div style="
          background-color: ${type === 'hato' ? '#ef4444' : '#f59e0b'};
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 8px rgba(0,0,0,0.8);
          cursor: grab;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(map);

    handle.on('drag', () => {
      const newPos = handle.getLatLng();
      currentEditVertices[idx] = [newPos.lat, newPos.lng];

      // Actualizar visualmente la capa del polígono en vivo mientras arrastra
      layerGroup.eachLayer(layer => {
        if (layer.setLatLngs) layer.setLatLngs(currentEditVertices);
      });
    });

    return handle;
  });

  // Renderizar banner flotante en el mapa para Guardar / Cancelar
  showEditControlBanner();
}

/**
 * Desactiva el modo de edición gráfica y elimina los tiradores de las esquinas
 */
export function disablePolygonEditing() {
  editHandles.forEach(h => map.removeLayer(h));
  editHandles = [];
  editingMetadata = null;
  currentEditVertices = [];

  const banner = document.getElementById('map-edit-banner');
  if (banner) banner.remove();
}

/**
 * Limpia y restablece los linderos trazados en el mapa
 */
export function resetGeofenceDrawing() {
  cancelDrawing();
  disablePolygonEditing();
  
  if (hatoPolygonsMap.has('temp')) {
    map.removeLayer(hatoPolygonsMap.get('temp'));
    hatoPolygonsMap.delete('temp');
  }
  if (potreroPolygonsMap.has('temp')) {
    map.removeLayer(potreroPolygonsMap.get('temp'));
    potreroPolygonsMap.delete('temp');
  }
}

/**
 * Activa la edición gráfica por tiradores/nodos en la geocerca activa o temporal
 */
export function enableActivePolygonEditing() {
  cancelDrawing();

  if (hatoPolygonsMap.has('temp')) {
    enablePolygonEditing('hato', 'temp', () => {});
    return true;
  }
  if (potreroPolygonsMap.has('temp')) {
    enablePolygonEditing('potrero', 'temp', () => {});
    return true;
  }

  for (let [id] of hatoPolygonsMap.entries()) {
    enablePolygonEditing('hato', id, () => {});
    return true;
  }

  for (let [id] of potreroPolygonsMap.entries()) {
    enablePolygonEditing('potrero', id, () => {});
    return true;
  }

  return false;
}

/**
 * Borra permanentemente las geocercas locales trazadas
 */
export function clearAllLocalGeofences() {
  resetGeofenceDrawing();
  localStorage.removeItem('collarnet_hatos');
  localStorage.removeItem('collarnet_potreros');
  drawGeocercas([], []);
}

/**
 * Renderiza el banner flotante sobre el mapa durante la edición gráfica
 */
function showEditControlBanner() {
  let banner = document.getElementById('map-edit-banner');
  if (banner) banner.remove();

  banner = document.createElement('div');
  banner.id = 'map-edit-banner';
  banner.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 30px;
    padding: 8px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    color: white;
    font-size: 0.85rem;
    backdrop-filter: blur(8px);
  `;

  banner.innerHTML = `
    <span>✋ <strong>Arrastra las esquinas en el mapa</strong></span>
    <button id="btn-save-drag-edit" style="
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
    ">💾 Guardar Cambios</button>
    <button id="btn-cancel-drag-edit" style="
      background: rgba(255,255,255,0.1);
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
    ">❌ Cancelar</button>
  `;

  const mapContainer = document.getElementById('map');
  if (mapContainer) mapContainer.appendChild(banner);

  document.getElementById('btn-save-drag-edit').addEventListener('click', async () => {
    if (editingMetadata && editingMetadata.onSaveCallback) {
      await editingMetadata.onSaveCallback(editingMetadata.type, editingMetadata.id, currentEditVertices);
    }
    disablePolygonEditing();
  });

  document.getElementById('btn-cancel-drag-edit').addEventListener('click', () => {
    disablePolygonEditing();
  });
}

/**
 * Actualiza o crea el marcador de un animal en tiempo real
 */
export function updateAnimalMarker(data) {
  const { collarId, areteVisual, lat, lon, alertType, potreroActual, bateria, senal } = data;

  // Determinar colores según alertas
  let markerColor = '#10b981'; // Seguro (Emerald)
  let glowClass = '';

  if (alertType === 'ESCAPE_HATO') {
    markerColor = '#ef4444'; // Escape (Crimson)
    glowClass = 'pulse-glow';
  } else if (alertType === 'INFRACCION_ROTACION') {
    markerColor = '#f59e0b'; // Infracción (Amber)
  }

  // Crear icono personalizado HTML para poder animar el parpadeo en CSS
  const customIcon = L.divIcon({
    className: `custom-marker-icon ${alertType} ${glowClass}`,
    html: `
      <div style="
        background-color: ${markerColor};
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  if (animalMarkersMap.has(collarId)) {
    // Actualizar marcador existente
    const marker = animalMarkersMap.get(collarId);
    marker.setLatLng([lat, lon]);
    marker.setIcon(customIcon);
    
    // Actualizar popup contenido
    marker.setPopupContent(buildPopupHTML(data));
  } else {
    // Crear marcador nuevo
    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    marker.bindPopup(buildPopupHTML(data));
    animalMarkersMap.set(collarId, marker);
  }
}

/**
 * Centra la cámara del mapa en un animal específico
 */
export function centerOnAnimal(collarId) {
  if (animalMarkersMap.has(collarId)) {
    recordCameraState(`Vista previa antes de enfocar Res ${collarId}`);
    const marker = animalMarkersMap.get(collarId);
    map.setView(marker.getLatLng(), 17);
    marker.openPopup();
  }
}

/**
 * Genera el HTML enriquecido para la tarjeta popup del marcador
 */
function buildPopupHTML(data) {
  const alertLabels = {
    'NORMAL': '🟢 NORMAL (Seguro)',
    'INFRACCION_ROTACION': '⚠️ ROTACIÓN (Potrero incorrecto)',
    'ESCAPE_HATO': '🚨 ¡ESCAPE DE HATO CRÍTICO!'
  };

  return `
    <div class="popup-card">
      <h4>🐂 Arete: ${data.areteVisual}</h4>
      <p><strong>Estado:</strong> ${alertLabels[data.alertType] || data.alertType}</p>
      <p><strong>Ubicación:</strong> ${data.potreroActual}</p>
      <p><strong>Batería:</strong> 🔋 ${data.bateria || 98}% | <strong>Señal:</strong> 📶 ${data.senal || 5}/5</p>
      <p><strong>Lat:</strong> ${data.lat.toFixed(6)}, <strong>Lon:</strong> ${data.lon.toFixed(6)}</p>
      <button class="popup-action-btn" onclick="document.dispatchEvent(new CustomEvent('showProyeccion', {detail: ${data.animalId}}))">
        ⚖️ Curva de Peso y Costos
      </button>
    </div>
  `;
}

// Capas de Trazados GPS Históricos (Tracks)
let activeTracksGroup = null;

/**
 * Dibuja o remueve las estelas de recorrido histórico GPS (24h, 7d, 30d)
 */
export function drawGPSTracks(range = '24h') {
  if (activeTracksGroup) {
    map.removeLayer(activeTracksGroup);
    activeTracksGroup = null;
  }

  activeTracksGroup = L.layerGroup().addTo(map);

  // Generar rutas sintéticas realistas alrededor del hato principal
  const baseLat = 9.1000;
  const baseLon = -67.1000;

  const pointsCount = range === '24h' ? 12 : (range === '7d' ? 30 : 60);
  const colorTrack1 = '#3b82f6'; // Azul 24h
  const colorTrack2 = '#10b981'; // Esmeralda 7d
  const colorTrack3 = '#f59e0b'; // Dorado 30d

  const trackColor = range === '24h' ? colorTrack1 : (range === '7d' ? colorTrack2 : colorTrack3);

  // Trazado Res 1 (Arete 4821)
  const trackCoords1 = [];
  for (let i = 0; i < pointsCount; i++) {
    const lat = baseLat + (Math.sin(i * 0.4) * 0.0015);
    const lon = baseLon + (Math.cos(i * 0.4) * 0.0015);
    trackCoords1.push([lat, lon]);
  }

  const polyline1 = L.polyline(trackCoords1, {
    color: trackColor,
    weight: 4,
    opacity: 0.8,
    dashArray: '4, 8'
  }).addTo(activeTracksGroup);

  polyline1.bindTooltip(`Ruta GPS Histórica (${range}): Arete 4821`, { sticky: true });

  console.log(`[Map] Estela de trazado GPS renderizada para rango: ${range}`);
}

/**
 * Anima el movimiento gradual del hato durante una Guía Activa (Arreo Remoto)
 */
export function animateHerdGuidance(targetLat = 9.1025, targetLon = -67.0980, onComplete) {
  let step = 0;
  const maxSteps = 25;

  const initialPositions = [];
  animalMarkersMap.forEach((marker, collarId) => {
    const currentPos = marker.getLatLng();
    initialPositions.push({ collarId, marker, startLat: currentPos.lat, startLon: currentPos.lng });
  });

  const interval = setInterval(() => {
    step++;
    const progress = step / maxSteps;

    initialPositions.forEach(({ marker, startLat, startLon }, index) => {
      const offsetLat = (index * 0.00015);
      const offsetLon = (index * 0.00015);
      
      const newLat = startLat + ((targetLat + offsetLat) - startLat) * progress;
      const newLon = startLon + ((targetLon + offsetLon) - startLon) * progress;

      marker.setLatLng([newLat, newLon]);
    });

    if (step >= maxSteps) {
      clearInterval(interval);
      console.log('[Guía Activa] ¡Arreo del hato completado exitosamente!');
      if (onComplete) onComplete();
    }
  }, 150);
}

// Historial de Acciones del Mapa (Undo Stack)
let actionHistory = [];

/**
 * Guarda el estado actual de la cámara antes de realizar un movimiento
 */
function recordCameraState(actionLabel = 'Movimiento de cámara') {
  if (!map) return;
  const center = map.getCenter();
  const zoom = map.getZoom();
  actionHistory.push({
    type: 'camera',
    label: actionLabel,
    center: [center.lat, center.lng],
    zoom: zoom
  });
  if (actionHistory.length > 20) actionHistory.shift();
}

/**
 * Revierte la última acción realizada en el mapa (Vértice dibujado o movimiento de cámara)
 */
export function undoLastAction() {
  // 1. Si está en modo dibujo activo y hay vértices colocados, deshacer el último punto
  if (isDrawing && tempPoints.length > 0) {
    tempPoints.pop();
    const lastMarker = tempMarkers.pop();
    if (lastMarker) map.removeLayer(lastMarker);

    if (tempPolyline) {
      if (tempPoints.length > 0) {
        tempPolyline.setLatLngs(tempPoints);
      } else {
        map.removeLayer(tempPolyline);
        tempPolyline = null;
      }
    }
    
    alert(`↩️ Vértice de geocerca revertido. (Puntos restantes: ${tempPoints.length})`);
    return;
  }

  // 2. Si hay historial de movimientos de cámara o navegaciones
  if (actionHistory.length > 0) {
    const lastAction = actionHistory.pop();
    if (lastAction.type === 'camera') {
      map.flyTo(lastAction.center, lastAction.zoom, { duration: 1.2 });
      alert(`↩️ Acción revertida: ${lastAction.label}`);
      return;
    }
  }

  // 3. Fallback: Si no hay acciones previas en la pila, restaurar vista por defecto del Hato
  alert('↩️ No hay más acciones recientes. Restaurando la vista inicial del Hato principal.');
  map.flyTo([9.1000, -67.1000], 15, { duration: 1.2 });
}

/**
 * Renderiza el popup interactivo para la ubicación actual con opción de mover y guardar
 */
function updateUserLocationPopup(lat, lng) {
  if (!window.userLocMarker) return;

  const savedLat = localStorage.getItem('collarnet_saved_farm_lat');
  const savedLng = localStorage.getItem('collarnet_saved_farm_lng');
  const isSavedPosition = savedLat && Math.abs(parseFloat(savedLat) - lat) < 0.0001 && Math.abs(parseFloat(savedLng) - lng) < 0.0001;

  const html = `
    <div class="user-location-popup-card" style="padding: 6px; min-width: 230px; text-align: center; font-family: system-ui, sans-serif;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px;">
        <span style="font-size: 1.1rem;">📍</span>
        <h4 style="margin: 0; color: #f8fafc; font-size: 0.95rem; font-weight: 700;">Ubicación GPS de la Finca</h4>
      </div>

      <p style="margin: 0 0 8px 0; font-size: 0.8rem; color: #94a3b8; line-height: 1.3;">
        💡 <strong>Arrastra este pin en el mapa</strong> para ajustar la posición exacta de tu hacienda/hato.
      </p>

      <div style="font-family: monospace; font-size: 0.78rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); padding: 6px 10px; border-radius: 8px; margin-bottom: 10px; color: #38bdf8; display: flex; justify-content: space-between;">
        <span><strong>Lat:</strong> ${lat.toFixed(6)}</span>
        <span><strong>Lon:</strong> ${lng.toFixed(6)}</span>
      </div>

      <button id="btn-save-custom-user-location" style="
        width: 100%;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        padding: 8px 14px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">
        💾 ${isSavedPosition ? 'Ubicación Guardada (Actualizar)' : 'Guardar esta Ubicación'}
      </button>
    </div>
  `;

  window.userLocMarker.bindPopup(html, { closeOnClick: false });
  window.userLocMarker.openPopup();

  setTimeout(() => {
    const saveBtn = document.getElementById('btn-save-custom-user-location');
    if (saveBtn) {
      saveBtn.onclick = (e) => {
        e.stopPropagation();
        saveCustomUserLocation(lat, lng);
      };
    }
  }, 100);
}

/**
 * Guarda las coordenadas de la finca en el almacenamiento local y actualiza la referencia
 */
function saveCustomUserLocation(lat, lng) {
  localStorage.setItem('collarnet_saved_farm_lat', lat.toString());
  localStorage.setItem('collarnet_saved_farm_lng', lng.toString());

  console.log(`[GPS Saved] Coordenadas guardadas: Lat ${lat}, Lon ${lng}`);

  alert(`✅ ¡Ubicación de la Finca guardada con éxito!\n\nCoordenadas ajustadas:\n• Latitud: ${lat.toFixed(6)}\n• Longitud: ${lng.toFixed(6)}\n\nEsta ubicación ha quedado registrada como punto central de tu Hato.`);

  if (window.userLocMarker) {
    window.userLocMarker.bindPopup(`
      <div style="padding: 6px; text-align: center;">
        <h4 style="margin: 0 0 4px 0; color: #10b981;">✅ Ubicación de Finca Guardada</h4>
        <small style="color: #cbd5e1; font-weight: 600;">Lat: ${lat.toFixed(6)} | Lon: ${lng.toFixed(6)}</small>
        <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: #94a3b8;">Puedes volver a arrastrar el pin cuando desees ajustarlo.</p>
      </div>
    `).openPopup();
  }
}

/**
 * Obtiene la ubicación GPS del usuario en el navegador y vuela la cámara sobre su posición
 */
export function locateUserPosition() {
  recordCameraState('Vista previa antes de Ir a Ubicación GPS');

  const savedLat = localStorage.getItem('collarnet_saved_farm_lat');
  const savedLng = localStorage.getItem('collarnet_saved_farm_lng');

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;

        if (savedLat && savedLng) {
          lat = parseFloat(savedLat);
          lng = parseFloat(savedLng);
        }

        map.flyTo([lat, lng], 17, { duration: 1.5 });
        
        if (window.userLocMarker) {
          map.removeLayer(window.userLocMarker);
        }
        
        const pulseIcon = L.divIcon({
          className: 'user-location-pulse-container',
          html: `<div class="user-pulse-dot" style="font-size:26px; cursor:grab;" title="Mueve este pin para ajustar la ubicación exacta">📍</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 32]
        });

        // Marcador movible arrastrable (draggable: true)
        window.userLocMarker = L.marker([lat, lng], {
          icon: pulseIcon,
          draggable: true
        }).addTo(map);

        updateUserLocationPopup(lat, lng);

        // Al terminar de arrastrar el pin en el mapa
        window.userLocMarker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          updateUserLocationPopup(newPos.lat, newPos.lng);
        });
      },
      (err) => {
        console.warn('[Geolocation] Permiso denegado o no disponible:', err);
        const lat = savedLat ? parseFloat(savedLat) : 9.1025;
        const lng = savedLng ? parseFloat(savedLng) : -67.0980;

        map.flyTo([lat, lng], 16, { duration: 1.5 });

        if (window.userLocMarker) map.removeLayer(window.userLocMarker);

        const pulseIcon = L.divIcon({
          className: 'user-location-pulse-container',
          html: `<div class="user-pulse-dot" style="font-size:26px; cursor:grab;">📍</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 32]
        });

        window.userLocMarker = L.marker([lat, lng], { icon: pulseIcon, draggable: true }).addTo(map);
        updateUserLocationPopup(lat, lng);

        window.userLocMarker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          updateUserLocationPopup(newPos.lat, newPos.lng);
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    alert('📍 La geolocalización no está soportada en tu navegador. Centrando mapa en el Hato principal.');
    map.flyTo([9.1025, -67.0980], 16, { duration: 1.5 });
  }
}

/**
 * Realiza una búsqueda geográfica por Nombre de Ciudad, Municipio, Estado o País (Nominatim OpenStreetMap)
 */
export async function searchLocationByCity(query) {
  if (!query || !query.trim()) return null;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1`);
    const results = await response.json();

    if (results && results.length > 0) {
      const top = results[0];
      const lat = parseFloat(top.lat);
      const lon = parseFloat(top.lon);
      const displayName = top.display_name;

      // Volar la cámara del mapa a la ciudad / país encontrado
      recordCameraState(`Búsqueda de ciudad: ${query}`);
      map.flyTo([lat, lon], 14, { duration: 1.8 });

      // Colocar pin arrastrable en esa posición
      if (window.userLocMarker) map.removeLayer(window.userLocMarker);

      const pulseIcon = L.divIcon({
        className: 'user-location-pulse-container',
        html: `<div class="user-pulse-dot" style="font-size:26px; cursor:grab;" title="Arrastra para ajustar">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 32]
      });

      window.userLocMarker = L.marker([lat, lon], { icon: pulseIcon, draggable: true }).addTo(map);
      updateUserLocationPopup(lat, lon);

      window.userLocMarker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        updateUserLocationPopup(newPos.lat, newPos.lng);
      });

      return { lat, lon, displayName };
    } else {
      alert(`⚠️ No se encontraron resultados para "${query}". Prueba ingresando la Ciudad y el País (ej. "Calabozo, Venezuela" o "Medellín, Colombia").`);
      return null;
    }
  } catch (err) {
    console.error('[Geocoding Error]', err);
    alert(`Error de conexión al buscar ciudad: ${err.message}`);
    return null;
  }
}

/**
 * Centra y guarda directamente las coordenadas Latitud / Longitud ingresadas manualmente
 */
export function setFarmCustomLocation(lat, lon, farmName = '') {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    alert('Por favor ingresa coordenadas válidas en números decimales.');
    return;
  }

  recordCameraState(`Ubicación manual: ${latitude}, ${longitude}`);
  map.flyTo([latitude, longitude], 15, { duration: 1.5 });

  if (window.userLocMarker) map.removeLayer(window.userLocMarker);

  const pulseIcon = L.divIcon({
    className: 'user-location-pulse-container',
    html: `<div class="user-pulse-dot" style="font-size:26px; cursor:grab;" title="Arrastra para ajustar">📍</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 32]
  });

  window.userLocMarker = L.marker([latitude, longitude], { icon: pulseIcon, draggable: true }).addTo(map);
  updateUserLocationPopup(latitude, longitude);

  window.userLocMarker.on('dragend', (e) => {
    const newPos = e.target.getLatLng();
    updateUserLocationPopup(newPos.lat, newPos.lng);
  });

  saveCustomUserLocation(latitude, longitude);

  if (farmName) {
    const farmTitleElem = document.querySelector('.farm-title');
    if (farmTitleElem) farmTitleElem.innerHTML = `${farmName} <small>Centro Hato</small>`;
  }
}

export { ESRI_SATELLITE, OSM_STREETS };
