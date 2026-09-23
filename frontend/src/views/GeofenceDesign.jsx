import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Dialog } from 'primereact/dialog';
import { 
  DraftingCompass, 
  MapPin, 
  Sparkles, 
  Layers, 
  Radio, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  Scale, 
  Send,
  Edit2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Satellite,
  Compass,
  Plus,
  Undo2,
  Check,
  X,
  Search,
  Building2,
  Fence,
  Maximize2
} from 'lucide-react';
import { 
  apiCrearManual, 
  apiCrearIA, 
  apiEscalarGeocerca, 
  syncGeocercas, 
  apiEliminarHato, 
  apiEliminarPotrero,
  apiUpdatePotrero,
  apiUpdateHato
} from '../services/apiService';
import { fireQuickSuccess } from '../services/confettiHelper';

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Paleta de colores para diferenciar claramente los potreros en el mapa
export const POTRERO_PALETTE = [
  { border: '#10b981', fill: '#10b981', text: '#34d399', name: 'Potrero 1 (Esmeralda)' },
  { border: '#06b6d4', fill: '#06b6d4', text: '#22d3ee', name: 'Potrero 2 (Cian)' },
  { border: '#f59e0b', fill: '#f59e0b', text: '#fbbf24', name: 'Potrero 3 (Ámbar)' },
  { border: '#a855f7', fill: '#a855f7', text: '#c084fc', name: 'Potrero 4 (Púrpura)' },
  { border: '#ec4899', fill: '#ec4899', text: '#f472b6', name: 'Potrero 5 (Rosa)' },
  { border: '#3b82f6', fill: '#3b82f6', text: '#60a5fa', name: 'Potrero 6 (Azul)' },
];

// Función para calcular área geodésica en Hectáreas usando fórmula esférica
function calculateGeodesicAreaHa(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const R = 6378137; // Radio de la Tierra en metros
  let area = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % latlngs.length];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lon1 = (p1[1] * Math.PI) / 180;
    const lon2 = (p2[1] * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2); // m²
  return (area / 10000).toFixed(2); // Ha
}

// Convertir GeoJSON a lista de pares "lat, lon" por línea
function geojsonToCoords(geojsonStr) {
  if (!geojsonStr) return '';
  try {
    const parsed = typeof geojsonStr === 'string' ? JSON.parse(geojsonStr) : geojsonStr;
    if (parsed && parsed.coordinates && parsed.coordinates[0]) {
      return parsed.coordinates[0].map(pt => `${pt[1].toFixed(6)}, ${pt[0].toFixed(6)}`).join('\n');
    }
  } catch (e) {
    console.error('Error al parsear geojson', e);
  }
  return '';
}

// Convertir string de coordenadas a array de pares [[lat, lon], ...]
function coordsTextToVertices(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split('\n');
  const points = [];
  for (const line of lines) {
    const parts = line.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      points.push([parts[0], parts[1]]);
    }
  }
  return points;
}

export default function GeofenceDesign({ 
  geocercas, 
  collares, 
  tenants = [], 
  selectedTenantId, 
  selectedHatoId, 
  monitoringData = [], 
  currentUser, 
  onRefreshData,
  onEditModeChange
}) {
  const isSuperAdmin = currentUser?.rol === 'SUPERADMIN';
  const canManagePotreros = isSuperAdmin || currentUser?.permiteCrearPotreros !== false;

  // Mapa
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const polygonsGroupRef = useRef(null);
  const hatoLayersRef = useRef({});
  const potreroLayersRef = useRef({});
  const drawingLayerGroupRef = useRef(null);
  const editMarkersGroupRef = useRef(null);
  const editPolyRef = useRef(null);
  const editVerticesRef = useRef([]);
  const collarsGroupRef = useRef(null);
  const hasInitiallyCenteredRef = useRef(false);
  const prevSelectedHatoIdRef = useRef(selectedHatoId);

  const [currentLayer, setCurrentLayer] = useState('satellite');
  const [showCollarsOnMap, setShowCollarsOnMap] = useState(true);

  // Herramientas Principales: 'designer' (Mapa + Form), 'ai', 'scale', 'sync'
  const [activeMainTab, setActiveMainTab] = useState('designer');

  // Modo de Creación vs Exploración: 'explore' | 'create' | 'edit'
  const [workspaceMode, setWorkspaceMode] = useState('explore');

  // Notificar al componente padre cuando cambia el modo de edición para suspender polling
  useEffect(() => {
    if (onEditModeChange) {
      onEditModeChange(workspaceMode !== 'explore');
    }
  }, [workspaceMode, onEditModeChange]);

  // Submodo de entrada de datos en creación: 'click' (en satélite) | 'text' (manual)
  const [inputMode, setInputMode] = useState('click');

  // Búsqueda en explorador lateral
  const [searchPerimetro, setSearchPerimetro] = useState('');

  // Estado del Formulario de Creación
  const [tipoPerimetro, setTipoPerimetro] = useState(isSuperAdmin ? 'hato' : 'potrero');
  const [formTenantId, setFormTenantId] = useState(selectedTenantId || '1');
  const [formHatoId, setFormHatoId] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formMargen, setFormMargen] = useState(10);
  const [formCapacidad, setFormCapacidad] = useState(50);
  const [formCoordsText, setFormCoordsText] = useState('');
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Estado de Edición
  const [editingItem, setEditingItem] = useState(null); // { tipo: 'hato' | 'potrero', data }
  const [editNombre, setEditNombre] = useState('');
  const [editTenantId, setEditTenantId] = useState('1');
  const [editHatoId, setEditHatoId] = useState('');
  const [editMargen, setEditMargen] = useState(10);
  const [editCapacidad, setEditCapacidad] = useState(50);
  const [editCoordsText, setEditCoordsText] = useState('');
  const [editVertices, setEditVertices] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Mensaje de estado global
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Modal de Seguridad de Eliminación Bloqueada
  const [safetyBlockedItem, setSafetyBlockedItem] = useState(null);

  // Modal de Confirmación de Eliminación (cuando collares_activos === 0)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Estados de Pestañas Secundarias (AI, Escalar, Sync)
  const [aiPdfFile, setAiPdfFile] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [scaleSelect, setScaleSelect] = useState('');
  const [scaleWidth, setScaleWidth] = useState(100);
  const [scaleHeight, setScaleHeight] = useState(100);
  const [loadingScale, setLoadingScale] = useState(false);

  const [syncCollarId, setSyncCollarId] = useState('');
  const [syncHatoId, setSyncHatoId] = useState('');
  const [syncPotreroId, setSyncPotreroId] = useState('');
  const [loadingSync, setLoadingSync] = useState(false);

  // Referencia a variables para listeners de Leaflet
  const workspaceModeRef = useRef(workspaceMode);
  workspaceModeRef.current = workspaceMode;

  const drawingPointsRef = useRef(drawingPoints);
  drawingPointsRef.current = drawingPoints;

  // 1. INICIALIZAR MAPA SATELITAL
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let initialLat = 9.1000;
    let initialLon = -67.1000;

    // Si ya existen hatos, no iniciar en Guárico por defecto
    if (geocercas?.hatos && geocercas.hatos.length > 0) {
      try {
        const geo = typeof geocercas.hatos[0].geojson === 'string' 
          ? JSON.parse(geocercas.hatos[0].geojson) 
          : geocercas.hatos[0].geojson;
        if (geo?.coordinates?.[0]?.[0]) {
          initialLat = geo.coordinates[0][0][1];
          initialLon = geo.coordinates[0][0][0];
        }
      } catch (_) {}
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 15,
      zoomControl: true
    });

    const tileLayer = L.tileLayer(ESRI_SATELLITE, {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; CowIA Smart Agro GIS'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    const polygonsGroup = L.featureGroup().addTo(map);
    polygonsGroupRef.current = polygonsGroup;

    const drawingLayerGroup = L.featureGroup().addTo(map);
    drawingLayerGroupRef.current = drawingLayerGroup;

    const editMarkersGroup = L.featureGroup().addTo(map);
    editMarkersGroupRef.current = editMarkersGroup;

    const collarsGroup = L.featureGroup().addTo(map);
    collarsGroupRef.current = collarsGroup;

    // Click en el mapa para trazar vértices
    map.on('click', (e) => {
      if (workspaceModeRef.current === 'create') {
        const newPt = [parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6))];
        setDrawingPoints(prev => {
          const updated = [...prev, newPt];
          setFormCoordsText(updated.map(p => `${p[0]}, ${p[1]}`).join('\n'));
          return updated;
        });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. CAMBIAR CAPAS (SATÉLITE / CALLES)
  const switchLayer = (type) => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (type === 'satellite') {
      tileLayerRef.current = L.tileLayer(ESRI_SATELLITE, { maxZoom: 19 }).addTo(mapInstanceRef.current);
      setCurrentLayer('satellite');
    } else {
      tileLayerRef.current = L.tileLayer(OSM_STREETS, { maxZoom: 19 }).addTo(mapInstanceRef.current);
      setCurrentLayer('streets');
    }
  };

  // 3. CENTRAR / UBICAR HATO EN EL MAPA
  const centerOnHato = (targetHatoId) => {
    if (!mapInstanceRef.current || !geocercas?.hatos) return;

    let targetHato = null;
    if (targetHatoId && targetHatoId !== 'ALL') {
      targetHato = geocercas.hatos.find(h => String(h.id) === String(targetHatoId));
    }
    if (!targetHato && geocercas.hatos.length > 0) {
      targetHato = geocercas.hatos[0];
    }

    if (targetHato) {
      const layer = hatoLayersRef.current[targetHato.id];
      if (layer) {
        mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 18, animate: true });
        return;
      }
      if (targetHato.geojson) {
        try {
          const geo = typeof targetHato.geojson === 'string' ? JSON.parse(targetHato.geojson) : targetHato.geojson;
          if (geo.coordinates && geo.coordinates[0]) {
            const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
            const bounds = L.latLngBounds(latlngs);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
            return;
          }
        } catch (e) {
          console.error('Error parse geojson hato:', e);
        }
      }
    }

    if (polygonsGroupRef.current && polygonsGroupRef.current.getLayers().length > 0) {
      mapInstanceRef.current.fitBounds(polygonsGroupRef.current.getBounds(), { padding: [40, 40], maxZoom: 17, animate: true });
    }
  };

  // 4. CENTRAR EN POTRERO ESPECÍFICO
  const centerOnPotrero = (potrero) => {
    if (!mapInstanceRef.current) return;
    const layer = potreroLayersRef.current[potrero.id];
    if (layer) {
      mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 18, animate: true });
      return;
    }
    if (potrero.geojson) {
      try {
        const geo = typeof potrero.geojson === 'string' ? JSON.parse(potrero.geojson) : potrero.geojson;
        if (geo.coordinates && geo.coordinates[0]) {
          const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
          const bounds = L.latLngBounds(latlngs);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
        }
      } catch (_) {}
    }
  };

  // 4.1 CENTRAR EN COLLAR GPS ESPECÍFICO
  const centerOnCollar = (c) => {
    if (!mapInstanceRef.current || !c) return;
    const lat = parseFloat(c.lat);
    const lon = parseFloat(c.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      mapInstanceRef.current.setView([lat, lon], 18, { animate: true });
    }
  };

  // 5. RENDERIZAR POLÍGONOS REGISTRADOS (HATOS Y POTREROS)
  useEffect(() => {
    if (!mapInstanceRef.current || !polygonsGroupRef.current || !geocercas) return;

    polygonsGroupRef.current.clearLayers();
    hatoLayersRef.current = {};
    potreroLayersRef.current = {};

    // A. Hatos
    if (geocercas.hatos) {
      geocercas.hatos.forEach(hato => {
        if (!hato.geojson) return;
        // Si estamos editando este hato específicamente, no dibujar la capa estática duplicada
        if (workspaceMode === 'edit' && editingItem?.tipo === 'hato' && editingItem?.data?.id === hato.id) {
          return;
        }

        try {
          const geo = typeof hato.geojson === 'string' ? JSON.parse(hato.geojson) : hato.geojson;
          const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
          const collaresActivosCount = hato.collares_activos || 0;
          const areaHa = calculateGeodesicAreaHa(latlngs);

          const poly = L.polygon(latlngs, {
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.08,
            dashArray: '6, 6'
          }).bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
              <div style="font-weight: bold; font-size: 14px; color: #991b1b; margin-bottom: 2px;">
                🏰 Hato: ${hato.nombre}
              </div>
              <div><strong>ID:</strong> #${hato.id}</div>
              <div><strong>Superficie:</strong> ${areaHa} Ha</div>
              <div><strong>Adquirente:</strong> ${hato.tenant_nombre || 'Principal'}</div>
              <div style="margin-top: 4px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; ${
                collaresActivosCount > 0 ? 'background: #fef2f2; color: #b91c1c;' : 'background: #f0fdf4; color: #15803d;'
              }">
                ${collaresActivosCount > 0 ? `🔒 ${collaresActivosCount} Collares Activos` : '✅ 0 Collares (Seguro)'}
              </div>
            </div>
          `);

          // Tooltip en Hover: aparece solo al pasar el ratón por encima
          poly.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #fff; background: rgba(15, 23, 42, 0.95); border: 1.5px solid #ef4444; border-radius: 6px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span>🏰 Hato:</span>
              <span style="color: #fca5a5;">${hato.nombre}</span>
              <span style="color: #94a3b8; font-size: 10px;">(${areaHa} Ha)</span>
            </div>
          `, {
            permanent: false,
            sticky: true,
            direction: 'top',
            offset: [0, -10],
            className: 'map-tooltip-hover'
          });

          polygonsGroupRef.current.addLayer(poly);
          hatoLayersRef.current[hato.id] = poly;
        } catch (e) {
          console.error('Error dibujando hato:', e);
        }
      });
    }

    // B. Potreros
    if (geocercas.potreros) {
      geocercas.potreros.forEach((pot, pIdx) => {
        if (!pot.geojson) return;
        // Si estamos editando este potrero específicamente, no dibujar la capa estática duplicada
        if (workspaceMode === 'edit' && editingItem?.tipo === 'potrero' && editingItem?.data?.id === pot.id) {
          return;
        }

        try {
          const geo = typeof pot.geojson === 'string' ? JSON.parse(pot.geojson) : pot.geojson;
          const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
          const areaHa = calculateGeodesicAreaHa(latlngs);
          const collaresActivosCount = pot.collares_activos || 0;
          const colorStyle = POTRERO_PALETTE[pIdx % POTRERO_PALETTE.length];

          const poly = L.polygon(latlngs, {
            color: colorStyle.border,
            weight: 3,
            fillColor: colorStyle.fill,
            fillOpacity: 0.22
          }).bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
              <div style="font-weight: bold; font-size: 14px; color: ${colorStyle.border}; margin-bottom: 2px;">
                🌱 [${pIdx + 1}] ${pot.nombre}
              </div>
              <div><strong>Hato:</strong> ${pot.hato_nombre || '#' + pot.hato_id}</div>
              <div><strong>Superficie:</strong> ${areaHa} Ha</div>
              <div><strong>Capacidad:</strong> ${pot.capacidad_max_cabezas || 50} reses</div>
              <div><strong>Margen sonoro:</strong> ${pot.margen_advertencia_metros || 10}m</div>
              <div style="margin-top: 4px; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block; ${
                collaresActivosCount > 0 ? 'background: #fef2f2; color: #b91c1c;' : 'background: #f0fdf4; color: #15803d;'
              }">
                ${collaresActivosCount > 0 ? `🔒 ${collaresActivosCount} Collares Activos` : '✅ 0 Collares (Seguro)'}
              </div>
            </div>
          `);

          // Tooltip en Hover: aparece solo al pasar el ratón por encima
          poly.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #fff; background: rgba(15, 23, 42, 0.95); border: 1.5px solid ${colorStyle.border}; border-radius: 6px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="background: ${colorStyle.border}; color: #000; border-radius: 3px; padding: 1px 5px; font-weight: 900; font-size: 10px;">${pIdx + 1}</span>
              <span>${pot.nombre}</span>
              <span style="color: ${colorStyle.text}; font-size: 10px;">(${areaHa} Ha)</span>
            </div>
          `, {
            permanent: false,
            sticky: true,
            direction: 'center',
            className: 'map-tooltip-hover'
          });

          polygonsGroupRef.current.addLayer(poly);
          potreroLayersRef.current[pot.id] = poly;
        } catch (e) {
          console.error('Error dibujando potrero:', e);
        }
      });
    }

    // Auto-centrar solo al inicio o si cambia deliberadamente el selectedHatoId desde el menú
    const shouldCenterOnMount = !hasInitiallyCenteredRef.current;
    const hatoSelectionChanged = prevSelectedHatoIdRef.current !== selectedHatoId;
    prevSelectedHatoIdRef.current = selectedHatoId;

    if (workspaceMode === 'explore' && (shouldCenterOnMount || hatoSelectionChanged)) {
      hasInitiallyCenteredRef.current = true;
      if (selectedHatoId && selectedHatoId !== 'ALL') {
        setTimeout(() => centerOnHato(selectedHatoId), 300);
      } else if (geocercas.hatos && geocercas.hatos.length > 0) {
        setTimeout(() => centerOnHato(geocercas.hatos[0].id), 300);
      }
    }
  }, [geocercas, selectedHatoId, workspaceMode, editingItem]);

  // 5.5 RENDERIZAR COLLARES / ANIMALES EN VIVO EN EL MAPA DE DISEÑO
  useEffect(() => {
    if (!mapInstanceRef.current || !collarsGroupRef.current) return;
    collarsGroupRef.current.clearLayers();

    if (!showCollarsOnMap) return;

    // Recopilar posiciones activas de collares desde monitoreo o inventario
    const collarPositions = [];
    (monitoringData || []).forEach(item => {
      const lat = parseFloat(item.latitud);
      const lon = parseFloat(item.longitud);
      if (item.collar_id && !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        collarPositions.push({
          collarId: item.collar_id,
          areteVisual: item.arete_visual || item.collar_id,
          raza: item.raza || 'Brahman',
          lat,
          lon,
          bateria: item.nivel_bateria ?? 100,
          estaCargando: item.esta_cargando === true,
          medioRed: item.medio_red || 'CELULAR',
          satelites: item.satelites_visibles || 0,
          gpsFijado: item.gps_fijado,
          gpsEncendido: item.gps_encendido,
          estadoCerca: item.estado_cerca || 'DENTRO',
          alerta: item.estado_alerta || 'NORMAL',
          potreroNombre: item.potrero_nombre || item.potrero_asignado_nombre || 'No asignado',
          hatoNombre: item.hato_nombre || 'Oficina'
        });
      }
    });

    (collares || []).forEach(c => {
      if (c.id && !collarPositions.some(p => p.collarId === c.id)) {
        const lat = parseFloat(c.latitud);
        const lon = parseFloat(c.longitud);
        if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
          collarPositions.push({
            collarId: c.id,
            areteVisual: c.res_asociada || c.arete_visual || c.id,
            raza: 'Brahman',
            lat,
            lon,
            bateria: c.nivel_bateria ?? 100,
            estaCargando: c.esta_cargando === true,
            medioRed: c.medio_red || 'CELULAR',
            satelites: c.satelites_visibles || 0,
            gpsFijado: c.gps_fijado,
            gpsEncendido: c.gps_encendido,
            estadoCerca: 'DENTRO',
            alerta: 'NORMAL',
            potreroNombre: 'No asignado',
            hatoNombre: 'Oficina'
          });
        }
      }
    });

    collarPositions.forEach(c => {
      const isEscape = c.estadoCerca === 'FUERA' || c.alerta === 'ESCAPE_HATO';
      const isWarn = c.estadoCerca === 'ADVERTENCIA' || c.alerta === 'INFRACCION_ROTACION';

      const colorBg = isEscape ? 'background: #dc2626;' : (isWarn ? 'background: #d97706;' : 'background: #059669;');
      const ringBorder = isEscape ? 'box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.4);' : (isWarn ? 'box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.4);' : 'box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4);');
      const emoji = isEscape ? '🚨' : (isWarn ? '⚠️' : '🐮');

      const collarHtml = `
        <div style="width: 32px; height: 32px; border-radius: 9999px; ${colorBg} ${ringBorder} display: flex; align-items: center; justify-content: center; font-size: 15px; color: #fff; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          ${emoji}
        </div>
      `;

      const marker = L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: 'collar-gps-marker',
          html: collarHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      });

      // Tooltip flotante en hover: aparece solo al pasar el cursor sobre el collar
      marker.bindTooltip(`
        <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #fff; background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(255,255,255,0.25); border-radius: 6px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
          <span>🐮 ${c.areteVisual}</span>
          <span style="color: #94a3b8; font-size: 10px;">(${c.collarId})</span>
          <span style="color: #38bdf8; font-size: 10px; margin-left: 2px;">🔋 ${c.bateria}%</span>
        </div>
      `, {
        permanent: false,
        sticky: true,
        direction: 'top',
        className: 'map-tooltip-hover'
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 190px;">
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
            <span>🐮 ${c.areteVisual}</span>
            <span style="font-size: 11px; font-weight: bold; color: #0284c7;">${c.collarId}</span>
          </div>
          <div style="margin-bottom: 3px;"><strong>Estado Geocerca:</strong> <span style="font-weight: bold; color: ${isEscape ? '#dc2626' : (isWarn ? '#d97706' : '#16a34a')};">${isEscape ? '🚨 FUGA / FUERA' : (isWarn ? '⚠️ ADVERTENCIA' : '✅ DENTRO')}</span></div>
          <div style="margin-bottom: 3px;"><strong>Batería:</strong> 🔋 ${c.bateria}% ${c.estaCargando ? '⚡ (USB)' : ''}</div>
          <div style="margin-bottom: 3px;"><strong>Satélites GNSS:</strong> 🛰️ ${c.satelites} sats ${c.gpsFijado ? '(Fix)' : '(Buscando)'}</div>
          <div style="margin-bottom: 3px;"><strong>Red:</strong> ${c.medioRed === 'WIFI' ? '📶 Wi-Fi' : '📱 4G LTE Digitel'}</div>
          <div style="margin-bottom: 3px;"><strong>Potrero:</strong> 🌱 ${c.potreroNombre}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">Lat: ${c.lat.toFixed(6)}, Lon: ${c.lon.toFixed(6)}</div>
        </div>
      `);

      collarsGroupRef.current.addLayer(marker);
    });
  }, [monitoringData, collares, showCollarsOnMap]);

  // 6. RENDERIZAR LÍNEAS / POLÍGONO EN MODO TRAZADO (CREACIÓN)
  useEffect(() => {
    if (!drawingLayerGroupRef.current) return;
    drawingLayerGroupRef.current.clearLayers();

    if (workspaceMode !== 'create' || drawingPoints.length === 0) return;

    // Dibujar marcadores circulares para cada vértice
    drawingPoints.forEach((pt, idx) => {
      const marker = L.circleMarker(pt, {
        radius: 6,
        fillColor: '#34d399',
        color: '#064e3b',
        weight: 2,
        fillOpacity: 0.9
      }).bindTooltip(`${idx + 1}`, { permanent: true, direction: 'top', className: 'map-vertex-badge' });
      drawingLayerGroupRef.current.addLayer(marker);
    });

    // Dibujar línea conectora o polígono
    if (drawingPoints.length > 2) {
      const poly = L.polygon(drawingPoints, {
        color: '#10b981',
        weight: 2.5,
        fillColor: '#10b981',
        fillOpacity: 0.25,
        dashArray: '4, 4'
      });
      drawingLayerGroupRef.current.addLayer(poly);
    } else if (drawingPoints.length === 2) {
      const line = L.polyline(drawingPoints, {
        color: '#10b981',
        weight: 2.5,
        dashArray: '4, 4'
      });
      drawingLayerGroupRef.current.addLayer(line);
    }
  }, [drawingPoints, workspaceMode]);

  // 7. RENDERIZAR VÉRTICES ARRASTRABLES EN MODO EDICIÓN
  useEffect(() => {
    if (!editMarkersGroupRef.current) return;
    editMarkersGroupRef.current.clearLayers();
    editPolyRef.current = null;

    if (workspaceMode !== 'edit' || !editingItem || !editingItem.data) return;

    const rawCoords = geojsonToCoords(editingItem.data.geojson);
    const initialPoints = coordsTextToVertices(rawCoords);
    if (initialPoints.length === 0) return;

    editVerticesRef.current = [...initialPoints];

    const polyColor = editingItem.tipo === 'hato' ? '#ef4444' : '#10b981';

    // Polígono activo editable
    const poly = L.polygon(initialPoints, {
      color: polyColor,
      weight: 3,
      fillColor: polyColor,
      fillOpacity: 0.25,
      dashArray: '6, 6'
    });
    editMarkersGroupRef.current.addLayer(poly);
    editPolyRef.current = poly;

    // Marcadores arrastrables nativos para cada vértice
    initialPoints.forEach((pt, idx) => {
      const icon = L.divIcon({
        className: 'edit-vertex-marker',
        html: `
          <div style="
            width: 22px; 
            height: 22px; 
            border-radius: 9999px; 
            background: #ffffff; 
            border: 3px solid ${polyColor}; 
            color: #0f172a; 
            font-weight: 800; 
            font-size: 11px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 3px 8px rgba(0,0,0,0.5); 
            cursor: grab;
            user-select: none;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker(pt, {
        draggable: true,
        icon,
        zIndexOffset: 1000 + idx
      });

      marker.on('dragstart', () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.dragging.disable();
        }
      });

      marker.on('drag', (event) => {
        const newLatLng = event.target.getLatLng();
        const lat = parseFloat(newLatLng.lat.toFixed(6));
        const lng = parseFloat(newLatLng.lng.toFixed(6));
        editVerticesRef.current[idx] = [lat, lng];

        // Actualizar visualmente el polígono en tiempo real sin re-renderizar React
        if (editPolyRef.current) {
          editPolyRef.current.setLatLngs(editVerticesRef.current);
        }

        // Actualizar el texto de coordenadas en vivo
        const coordsStr = editVerticesRef.current.map(p => `${p[0]}, ${p[1]}`).join('\n');
        setEditCoordsText(coordsStr);
      });

      marker.on('dragend', () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.dragging.enable();
        }
        // Sincronizar el array de vértices de React únicamente al soltar el ratón
        setEditVertices([...editVerticesRef.current]);
        const coordsStr = editVerticesRef.current.map(p => `${p[0]}, ${p[1]}`).join('\n');
        setEditCoordsText(coordsStr);
      });

      editMarkersGroupRef.current.addLayer(marker);
    });
  }, [workspaceMode, editingItem]);

  // Sincronizar texto de coordenadas con puntos de trazado
  const handleCoordsTextChange = (text) => {
    setFormCoordsText(text);
    const parsed = coordsTextToVertices(text);
    setDrawingPoints(parsed);
    if (parsed.length >= 3 && mapInstanceRef.current) {
      try {
        const bounds = L.latLngBounds(parsed);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
      } catch (_) {}
    }
  };

  // Sincronizar texto de coordenadas en edición
  const handleEditCoordsTextChange = (text) => {
    setEditCoordsText(text);
    const parsed = coordsTextToVertices(text);
    editVerticesRef.current = [...parsed];
    setEditVertices(parsed);
    if (editPolyRef.current && parsed.length >= 3) {
      editPolyRef.current.setLatLngs(parsed);
    }
    if (parsed.length >= 3 && mapInstanceRef.current) {
      try {
        const bounds = L.latLngBounds(parsed);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
      } catch (_) {}
    }
  };

  // Deshacer último punto colocado con clics
  const handleUndoPoint = () => {
    if (drawingPoints.length === 0) return;
    const updated = drawingPoints.slice(0, -1);
    setDrawingPoints(updated);
    setFormCoordsText(updated.map(p => `${p[0]}, ${p[1]}`).join('\n'));
  };

  // Limpiar todos los puntos de trazado
  const handleClearPoints = () => {
    setDrawingPoints([]);
    setFormCoordsText('');
  };

  // Iniciar Creación
  const startCreateMode = (tipo = 'potrero') => {
    setWorkspaceMode('create');
    setTipoPerimetro(tipo);
    setFormNombre('');
    setDrawingPoints([]);
    setFormCoordsText('');
    setFormHatoId(geocercas?.hatos?.[0]?.id || '');
    setStatusMsg({ type: '', text: '' });
  };

  // Iniciar Edición Directa en Mapa
  const startEditMode = (tipo, item) => {
    setWorkspaceMode('edit');
    setEditingItem({ tipo, data: item });
    setStatusMsg({ type: '', text: '' });

    const rawCoords = geojsonToCoords(item.geojson);
    setEditCoordsText(rawCoords);
    const parsed = coordsTextToVertices(rawCoords);
    editVerticesRef.current = [...parsed];
    setEditVertices(parsed);

    if (tipo === 'hato') {
      setEditNombre(item.nombre || '');
      setEditTenantId(item.tenant_id ? String(item.tenant_id) : '1');
      centerOnHato(item.id);
    } else {
      setEditNombre(item.nombre || '');
      setEditHatoId(item.hato_id ? String(item.hato_id) : '');
      setEditCapacidad(item.capacidad_max_cabezas || 50);
      setEditMargen(item.margen_advertencia_metros || 10);
      centerOnPotrero(item);
    }
  };

  // Cancelar Creación o Edición y volver a Exploración
  const cancelWorkspaceAction = () => {
    setWorkspaceMode('explore');
    setDrawingPoints([]);
    setFormCoordsText('');
    setEditingItem(null);
    setEditVertices([]);
    setEditCoordsText('');
    editVerticesRef.current = [];
    if (editMarkersGroupRef.current) {
      editMarkersGroupRef.current.clearLayers();
    }
    editPolyRef.current = null;
  };

  // Enviar Formulario de Creación (Guardar Hato o Potrero)
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const vertices = drawingPoints.length >= 3 
        ? drawingPoints 
        : coordsTextToVertices(formCoordsText);

      if (vertices.length < 3) {
        throw new Error('Debes ingresar o trazar al menos 3 vértices para formar el polígono de la geocerca.');
      }

      await apiCrearManual(
        tipoPerimetro, 
        formNombre, 
        tipoPerimetro === 'potrero' ? formHatoId : null, 
        vertices, 
        formMargen
      );

      setStatusMsg({ 
        type: 'success', 
        text: `¡${tipoPerimetro === 'hato' ? 'Hato' : 'Potrero'} '${formNombre}' guardado y publicado exitosamente!` 
      });
      fireQuickSuccess();
      setFormNombre('');
      setDrawingPoints([]);
      setFormCoordsText('');
      setWorkspaceMode('explore');
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Guardar Cambios de Edición
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);

    try {
      const vertices = (editVerticesRef.current && editVerticesRef.current.length >= 3)
        ? editVerticesRef.current
        : (editVertices.length >= 3 ? editVertices : coordsTextToVertices(editCoordsText));

      if (vertices.length < 3) {
        throw new Error('Debes conservar al menos 3 vértices válidos para el polígono.');
      }

      if (editingItem.tipo === 'hato') {
        await apiUpdateHato(editingItem.data.id, {
          nombre: editNombre,
          tenantId: editTenantId,
          vertices
        });
        setStatusMsg({ type: 'success', text: `Hato '${editNombre}' actualizado con éxito.` });
      } else {
        await apiUpdatePotrero(editingItem.data.id, {
          nombre: editNombre,
          hatoId: editHatoId,
          capacidad: editCapacidad,
          margenAdvertencia: editMargen,
          vertices
        });
        setStatusMsg({ type: 'success', text: `Potrero '${editNombre}' actualizado con éxito.` });
      }

      fireQuickSuccess();
      cancelWorkspaceAction();
      await onRefreshData();
    } catch (err) {
      alert('Error al guardar cambios: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Acción de Eliminar (Valida primero collares activos)
  const handleTriggerDelete = (tipo, item) => {
    const collaresActivos = item.collares_activos || 0;

    // Buscar si hay animales activos en monitoringData asociados a este perímetro
    const animalesAsociados = (monitoringData || []).filter(a => {
      if (a.collar_id == null) return false;
      if (tipo === 'potrero') return String(a.potrero_id) === String(item.id);
      if (tipo === 'hato') return String(a.hato_id) === String(item.id);
      return false;
    });

    const totalActivos = Math.max(collaresActivos, animalesAsociados.length);

    if (totalActivos > 0) {
      // BLOQUEAR ACCIÓN Y MOSTRAR ALERTA DE SEGURIDAD
      setSafetyBlockedItem({
        tipo,
        item,
        totalActivos,
        animales: animalesAsociados
      });
      return;
    }

    // SI 0 COLLARES ACTIVOS -> SOLICITAR CONFIRMACIÓN
    setConfirmDeleteItem({ tipo, item });
  };

  // Confirmar Eliminación Definitiva (0 Collares)
  const handleExecuteDelete = async () => {
    if (!confirmDeleteItem) return;
    setDeletingItem(true);

    try {
      const { tipo, item } = confirmDeleteItem;
      if (tipo === 'hato') {
        await apiEliminarHato(item.id);
      } else {
        await apiEliminarPotrero(item.id);
      }
      setStatusMsg({ type: 'success', text: `${tipo === 'hato' ? 'Hato' : 'Potrero'} '${item.nombre}' eliminado.` });
      setConfirmDeleteItem(null);
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setDeletingItem(false);
    }
  };

  // 8. Pestañas Secundarias (IA, Escala, Sync)
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPdfFile) return;
    setLoadingAi(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('pdfPlano', aiPdfFile);
      const result = await apiCrearIA(formData);
      setStatusMsg({ type: 'success', text: `¡Plano analizado por Gemini IA! Hato '${result.nombre}' creado.` });
      fireQuickSuccess();
      setAiPdfFile(null);
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingAi(false);
    }
  };

  const handleScaleSubmit = async (e) => {
    e.preventDefault();
    if (!scaleSelect) return;
    setLoadingScale(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const [tipo, idStr] = scaleSelect.split(':');
      await apiEscalarGeocerca(tipo, parseInt(idStr, 10), parseFloat(scaleWidth), parseFloat(scaleHeight));
      setStatusMsg({ type: 'success', text: `Geocerca redimensionada a ${scaleWidth}m x ${scaleHeight}m.` });
      fireQuickSuccess();
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingScale(false);
    }
  };

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    if (!syncCollarId || !syncHatoId || !syncPotreroId) {
      setStatusMsg({ type: 'error', text: 'Por favor selecciona el collar, hato y potrero a sincronizar.' });
      return;
    }
    setLoadingSync(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await syncGeocercas(syncCollarId, syncHatoId, syncPotreroId);
      setStatusMsg({
        type: 'success',
        text: `📡 ¡Geocerca enviada al collar ${syncCollarId} vía MQTT! Margen: ${res.payload?.t_w || 10}m.`
      });
      fireQuickSuccess();
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingSync(false);
    }
  };

  // Filtrado de perímetros para explorador lateral
  const filteredHatos = (geocercas?.hatos || []).filter(h => 
    h.nombre && h.nombre.toLowerCase().includes(searchPerimetro.toLowerCase())
  );

  const filteredPotreros = (geocercas?.potreros || []).filter(p => 
    p.nombre && p.nombre.toLowerCase().includes(searchPerimetro.toLowerCase())
  );

  const currentAreaCalculated = workspaceMode === 'create'
    ? calculateGeodesicAreaHa(drawingPoints)
    : (workspaceMode === 'edit' ? calculateGeodesicAreaHa(editVertices) : 0);

  const primaryCollar = (monitoringData || []).find(m => m.collar_id && m.latitud && m.longitud && (parseFloat(m.latitud) !== 0 || parseFloat(m.longitud) !== 0))
    || (collares || []).find(c => c.id && c.latitud && c.longitud && (parseFloat(c.latitud) !== 0 || parseFloat(c.longitud) !== 0));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto animate-fadeIn flex flex-col h-[calc(100vh-4rem)]">
      
      {/* Header Superior con Selector de Herramientas */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5">
            <DraftingCompass className="w-6 h-6 text-emerald-400" />
            <span>Diseñador y Calibración de Geocercas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualiza hatos y potreros sobre satélite, traza linderos con clics o coordenadas y gestiona perímetros seguros.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-white/10 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveMainTab('designer')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'designer' 
                ? 'bg-emerald-600 text-white shadow shadow-emerald-600/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Satellite size={14} />
            <span>Diseñador Satelital</span>
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveMainTab('ai')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeMainTab === 'ai' 
                  ? 'bg-purple-600 text-white shadow shadow-purple-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span>Extraer PDF (IA)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveMainTab('scale')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'scale' 
                ? 'bg-cyan-600 text-white shadow shadow-cyan-600/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale size={14} />
            <span>Escalar / Mover</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('sync')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'sync' 
                ? 'bg-teal-600 text-white shadow shadow-teal-600/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={14} />
            <span>Sincronizar Collar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Estado */}
      {statusMsg.text && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between shrink-0 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{statusMsg.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{statusMsg.text}</span>
          </div>
          <button type="button" onClick={() => setStatusMsg({ type: '', text: '' })} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 1: ESPACIO DE TRABAJO SATELITAL PRINCIPAL (GIS)   */}
      {/* ======================================================== */}
      {activeMainTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          
          {/* LADO IZQUIERDO: MAPA SATELITAL INTERACTIVO (8 COLUMNAS) */}
          <div className="lg:col-span-8 bg-[#0A121E] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col min-h-[420px] h-full">
            
            {/* Contenedor del Mapa Leaflet */}
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* BARRA FLOTANTE SUPERIOR DEL MAPA: Capas, Auto-Centrado y Collares */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-[#0E1624]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
              <button
                type="button"
                onClick={() => centerOnHato(selectedHatoId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all active:scale-95"
                title="Centrar y enfocar en el Hato actual"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-200" />
                <span>🎯 Ubicar Hato</span>
              </button>

              {primaryCollar && (
                <button
                  type="button"
                  onClick={() => centerOnCollar({
                    lat: primaryCollar.latitud || primaryCollar.lat,
                    lon: primaryCollar.longitud || primaryCollar.lon
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60 shadow-md transition-all active:scale-95"
                  title="Centrar mapa en la ubicación del collar físico"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>🐮 Collar {primaryCollar.collar_id || primaryCollar.id}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowCollarsOnMap(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showCollarsOnMap
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={showCollarsOnMap ? 'Ocultar collares en el mapa' : 'Mostrar collares en el mapa'}
              >
                <span>{showCollarsOnMap ? '👁️' : '🕶️'}</span>
                <span className="hidden sm:inline">Collares</span>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5"></div>

              <button
                type="button"
                onClick={() => switchLayer('satellite')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentLayer === 'satellite'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                <span>Satélite</span>
              </button>
              <button
                type="button"
                onClick={() => switchLayer('streets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentLayer === 'streets'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Calles</span>
              </button>
            </div>

            {/* BANNER FLOTANTE INFORMATIVO EN MODO CREACIÓN */}
            {workspaceMode === 'create' && (
              <div className="absolute top-3 left-3 z-20 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 p-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <DraftingCompass className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Modo Trazado Activo: Haz clic en el satélite</span>
                </div>
                <div className="bg-emerald-900/60 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold">
                  {drawingPoints.length} vértices | {currentAreaCalculated} Ha
                </div>
                {drawingPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoPoint}
                    className="p-1 text-slate-300 hover:text-white bg-slate-800/80 rounded hover:bg-slate-700"
                    title="Deshacer último vértice"
                  >
                    <Undo2 size={13} />
                  </button>
                )}
              </div>
            )}

            {/* BANNER FLOTANTE EN MODO EDICIÓN */}
            {workspaceMode === 'edit' && (
              <div className="absolute top-3 left-3 z-20 bg-amber-950/90 backdrop-blur-md border border-amber-500/50 p-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs text-amber-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <Edit2 className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Editando: {editNombre || editingItem?.data?.nombre}</span>
                </div>
                <div className="bg-amber-900/60 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold">
                  {currentAreaCalculated} Ha
                </div>
                <span className="text-[10px] text-amber-300/80 hidden sm:inline">
                  Arrastra los puntos circulares para modificar la forma
                </span>
              </div>
            )}

            {/* CONVENCIONES Y LEYENDA DEL MAPA (INFERIOR IZQUIERDA) */}
            <div className="absolute bottom-4 left-4 z-20 bg-[#0B121C]/90 backdrop-blur-md p-2.5 rounded-xl border border-white/10 shadow-xl hidden md:flex items-center gap-3.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-500/20"></span>
                <span className="text-slate-300 font-semibold">Hato</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-emerald-500/30"></span>
                <span className="text-emerald-300 font-semibold">Potrero 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-cyan-500 bg-cyan-500/30"></span>
                <span className="text-cyan-300 font-semibold">Potrero 2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🐮</span>
                <span className="text-emerald-300 font-semibold">Collar GPS</span>
              </div>
            </div>

          </div>

          {/* LADO DERECHO: PANEL DE TRABAJO DINÁMICO (4 COLUMNAS) */}
          <div className="lg:col-span-4 bg-[#0E1624] border border-white/10 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden">
            
            {/* MODO 1: EXPLORADOR DE PERÍMETROS (POR DEFECTO) */}
            {workspaceMode === 'explore' && (
              <div className="p-4 flex flex-col h-full space-y-3">
                
                {/* Cabecera del Panel */}
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <Layers size={16} className="text-emerald-400" />
                    <span>Perímetros Registrados</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {(geocercas?.hatos?.length || 0) + (geocercas?.potreros?.length || 0)} Total
                  </span>
                </div>

                {/* Botones Rápidos de Nuevo Perímetro */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startCreateMode('potrero')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Plus size={14} />
                    <span>+ Trazar Potrero</span>
                  </button>

                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => startCreateMode('hato')}
                      className="py-2 px-3 rounded-xl bg-slate-900 border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                      <Plus size={14} />
                      <span>+ Trazar Hato</span>
                    </button>
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 text-slate-500 text-[11px] font-semibold flex items-center justify-center">
                      🏰 Hatos gestionados
                    </div>
                  )}
                </div>

                {/* Buscador de Perímetros */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchPerimetro}
                    onChange={(e) => setSearchPerimetro(e.target.value)}
                    placeholder="Buscar por nombre de potrero o hato..."
                    className="w-full pl-9 pr-3 py-2 bg-[#080D15] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Lista Scrolleable de Perímetros */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  
                  {/* SECCIÓN: HATOS */}
                  <div>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                      <span>🏰 Hatos Maestros ({filteredHatos.length})</span>
                      <span className="text-[9px] text-slate-500 font-normal">Perímetro legal</span>
                    </span>

                    {filteredHatos.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-500 text-center">
                        No hay hatos registrados.
                      </div>
                    ) : (
                      filteredHatos.map(h => {
                        const collaresActivos = h.collares_activos || 0;
                        return (
                          <div
                            key={h.id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20 hover:border-rose-500/40 transition-all space-y-2 mb-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-xs text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                                  <span>🏰 {h.nombre}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>ID: #{h.id}</span>
                                  {h.tenant_nombre && (
                                    <span>• Empresa: <strong className="text-slate-300">{h.tenant_nombre}</strong></span>
                                  )}
                                </div>
                              </div>

                              {/* Badge de Seguridad de Collares */}
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 border ${
                                collaresActivos > 0
                                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              }`}>
                                {collaresActivos > 0 ? (
                                  <>
                                    <Lock size={10} />
                                    <span>{collaresActivos} collares</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={10} />
                                    <span>0 collares</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Acciones del Hato */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => centerOnHato(h.id)}
                                className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                              >
                                <Maximize2 size={12} />
                                <span>Ver en Mapa</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => startEditMode('hato', h)}
                                    className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                    title="Editar Hato"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}

                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerDelete('hato', h)}
                                    className={`p-1 rounded-md transition-colors ${
                                      collaresActivos > 0
                                        ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                                        : 'text-rose-400 hover:bg-rose-500/20'
                                    }`}
                                    title={collaresActivos > 0 ? 'Collares activos (Bloqueado)' : 'Eliminar Hato'}
                                  >
                                    {collaresActivos > 0 ? <Lock size={13} /> : <Trash2 size={13} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* SECCIÓN: POTREROS */}
                  <div className="pt-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                      <span>🌱 Potreros de Pastura ({filteredPotreros.length})</span>
                      <span className="text-[9px] text-slate-500 font-normal">Cercas virtuales</span>
                    </span>

                    {filteredPotreros.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-500 text-center">
                        No hay potreros registrados.
                      </div>
                    ) : (
                      filteredPotreros.map((p, idx) => {
                        const collaresActivos = p.collares_activos || 0;
                        const colorStyle = POTRERO_PALETTE[idx % POTRERO_PALETTE.length];

                        return (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-slate-900/80 transition-all space-y-2 mb-2 group shadow-sm hover:shadow-md"
                            style={{ border: `1.5px solid ${colorStyle.border}50` }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-xs text-white transition-colors flex items-center gap-2">
                                  <span 
                                    className="px-1.5 py-0.5 rounded text-[10px] font-black shadow-sm"
                                    style={{ backgroundColor: colorStyle.border, color: '#000' }}
                                    title={`Potrero número ${idx + 1}`}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <span style={{ color: colorStyle.text }}>🌱 {p.nombre}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                  <span>Hato: <strong className="text-slate-300">{p.hato_nombre || '#' + p.hato_id}</strong></span>
                                  <span>• Margen: {p.margen_advertencia_metros || 10}m</span>
                                </div>
                              </div>

                              {/* Badge de Seguridad de Collares */}
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 border ${
                                collaresActivos > 0
                                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              }`}>
                                {collaresActivos > 0 ? (
                                  <>
                                    <Lock size={10} />
                                    <span>{collaresActivos} collares</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={10} />
                                    <span>0 collares</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Acciones del Potrero */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => centerOnPotrero(p)}
                                className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                              >
                                <Maximize2 size={12} />
                                <span>Ver en Mapa</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {canManagePotreros && (
                                  <button
                                    type="button"
                                    onClick={() => startEditMode('potrero', p)}
                                    className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                    title="Editar Potrero en Mapa"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}

                                {canManagePotreros && (
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerDelete('potrero', p)}
                                    className={`p-1 rounded-md transition-colors ${
                                      collaresActivos > 0
                                        ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                                        : 'text-rose-400 hover:bg-rose-500/20'
                                    }`}
                                    title={collaresActivos > 0 ? 'Collares activos (Bloqueado)' : 'Eliminar Potrero'}
                                  >
                                    {collaresActivos > 0 ? <Lock size={13} /> : <Trash2 size={13} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* MODO 2: FORMULARIO DE CREACIÓN (INTEGRADO CON MAPA) */}
            {workspaceMode === 'create' && (
              <form onSubmit={handleSubmitCreate} className="p-4 flex flex-col h-full space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <Plus size={16} className="text-emerald-400" />
                    <span>Nuevo {tipoPerimetro === 'hato' ? 'Hato Maestro' : 'Potrero'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={cancelWorkspaceAction}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancelar
                  </button>
                </div>

                {/* Tipo de Geocerca */}
                <div className="grid grid-cols-2 gap-2">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setTipoPerimetro('hato')}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        tipoPerimetro === 'hato'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-white/10 text-slate-400'
                      }`}
                    >
                      🏰 Hato
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTipoPerimetro('potrero')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      tipoPerimetro === 'potrero'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-white/10 text-slate-400'
                    } ${!isSuperAdmin ? 'col-span-2' : ''}`}
                  >
                    🌱 Potrero
                  </button>
                </div>

                {/* Empresa Adquirente Asignada (Hato) */}
                {tipoPerimetro === 'hato' && isSuperAdmin && tenants.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Empresa Adquirente</label>
                    <select
                      value={formTenantId}
                      onChange={(e) => setFormTenantId(e.target.value)}
                      required
                      className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Hato Padre (Potrero) */}
                {tipoPerimetro === 'potrero' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Hato Perteneciente *</label>
                    <select
                      value={formHatoId}
                      onChange={(e) => {
                        setFormHatoId(e.target.value);
                        centerOnHato(e.target.value);
                      }}
                      required
                      className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      <option value="">Selecciona un hato...</option>
                      {geocercas?.hatos?.map(h => (
                        <option key={h.id} value={h.id}>{h.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Nombre de la Geocerca */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre de la Geocerca *</label>
                  <input
                    type="text"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder={tipoPerimetro === 'hato' ? 'ej: Hato La Esperanza' : 'ej: Potrero A (Bajo)'}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Margen sonoro (Potrero) */}
                {tipoPerimetro === 'potrero' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Margen Sonoro (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formMargen}
                        onChange={(e) => setFormMargen(parseFloat(e.target.value))}
                        required
                        className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Capacidad Reses</label>
                      <input
                        type="number"
                        value={formCapacidad}
                        onChange={(e) => setFormCapacidad(parseInt(e.target.value, 10))}
                        required
                        className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Selector de Modo de Entrada: Clics vs Coordenadas */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Vértices Poligonales</label>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setInputMode('click')}
                        className={`px-2 py-0.5 rounded ${inputMode === 'click' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
                      >
                        🖱️ Clics
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('text')}
                        className={`px-2 py-0.5 rounded ${inputMode === 'text' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
                      >
                        📝 Coordenadas
                      </button>
                    </div>
                  </div>

                  {inputMode === 'click' ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/30 text-xs space-y-2">
                      <p className="text-slate-300 text-[11px]">
                        Haz clics en el mapa satelital para trazar el perímetro.
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono">
                        <span>Puntos: {drawingPoints.length}</span>
                        <span>Área: {currentAreaCalculated} Ha</span>
                      </div>
                      {drawingPoints.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleUndoPoint}
                            className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold"
                          >
                            ↩️ Deshacer punto
                          </button>
                          <button
                            type="button"
                            onClick={handleClearPoints}
                            className="py-1 px-2 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 text-[10px]"
                          >
                            Limpiar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Cuadro de Coordenadas Manuales */}
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Coordenadas (Latitud, Longitud - uno por línea):
                    </span>
                    <textarea
                      rows={inputMode === 'text' ? 5 : 3}
                      value={formCoordsText}
                      onChange={(e) => handleCoordsTextChange(e.target.value)}
                      placeholder="9.1010, -67.1010&#10;9.1010, -67.0990&#10;9.0990, -67.0990"
                      className="w-full font-mono text-[11px] bg-[#080D15] border border-white/10 rounded-xl p-2 text-emerald-400 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Botón Guardar */}
                <div className="pt-2 mt-auto">
                  <button
                    type="submit"
                    disabled={loadingSubmit}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loadingSubmit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>Guardar y Publicar Geocerca</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODO 3: FORMULARIO DE EDICIÓN DIRECTA EN MAPA */}
            {workspaceMode === 'edit' && (
              <form onSubmit={handleSaveEdit} className="p-4 flex flex-col h-full space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <Edit2 size={16} className="text-amber-400" />
                    <span>Editar {editingItem?.tipo === 'hato' ? 'Hato' : 'Potrero'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={cancelWorkspaceAction}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {editingItem?.tipo === 'hato' && tenants.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Empresa Adquirente</label>
                    <select
                      value={editTenantId}
                      onChange={(e) => setEditTenantId(e.target.value)}
                      className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editingItem?.tipo === 'potrero' && (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Hato Perteneciente</label>
                      <select
                        value={editHatoId}
                        onChange={(e) => setEditHatoId(e.target.value)}
                        required
                        className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                      >
                        {geocercas?.hatos?.map(h => (
                          <option key={h.id} value={h.id}>{h.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Margen Sonoro (m)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editMargen}
                          onChange={(e) => setEditMargen(parseFloat(e.target.value))}
                          required
                          className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">Capacidad Reses</label>
                        <input
                          type="number"
                          value={editCapacidad}
                          onChange={(e) => setEditCapacidad(parseInt(e.target.value, 10))}
                          required
                          className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Vértices Editables */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">Vértices en Satélite</label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Superficie: {currentAreaCalculated} Ha
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editCoordsText}
                    onChange={(e) => handleEditCoordsTextChange(e.target.value)}
                    required
                    className="w-full font-mono text-[11px] bg-[#080D15] border border-white/10 rounded-xl p-2 text-amber-300 outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    💡 También puedes arrastrar los círculos blancos directamente en el satélite.
                  </span>
                </div>

                <div className="pt-2 mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={cancelWorkspaceAction}
                    className="w-1/3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="w-2/3 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: EXTRACCIÓN IA PLANOS PDF (GEMINI)               */}
      {/* ======================================================== */}
      {activeMainTab === 'ai' && isSuperAdmin && (
        <div className="bg-[#0E1624] border border-white/10 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Extracción Inteligente de Planos Catastrales (Gemini 2.5)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Sube el plano topográfico o documento catastral del Hato en formato PDF. El modelo multimodal extraerá las coordenadas georreferenciadas y creará el hato.
          </p>

          <form onSubmit={handleAiSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-purple-500/50 transition-colors">
              <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-xs text-white font-semibold">Selecciona o arrastra el archivo PDF del Plano</p>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setAiPdfFile(e.target.files[0])}
                required
                className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAi || !aiPdfFile}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Analizar con IA y Crear Hato</span>
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 3: ESCALAR / MOVER GEOCERCA EN METROS              */}
      {/* ======================================================== */}
      {activeMainTab === 'scale' && (
        <div className="bg-[#0E1624] border border-white/10 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <span>Re-dimensionar Geocerca en Metros</span>
          </h3>
          <p className="text-xs text-slate-400">
            Ajusta el ancho y largo en metros. Se recalculará en tiempo real sobre la ubicación geográfica del perímetro.
          </p>

          <form onSubmit={handleScaleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Geocerca a Redimensionar</label>
              <select
                value={scaleSelect}
                onChange={(e) => setScaleSelect(e.target.value)}
                required
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="">Selecciona un perímetro...</option>
                {isSuperAdmin && (
                  <optgroup label="Hatos">
                    {geocercas?.hatos?.map(h => (
                      <option key={`hato:${h.id}`} value={`hato:${h.id}`}>🏰 Hato: {h.nombre}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Potreros">
                  {geocercas?.potreros?.map(p => (
                    <option key={`potrero:${p.id}`} value={`potrero:${p.id}`}>🌱 Potrero: {p.nombre}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Ancho Este-Oeste (m)</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={scaleWidth}
                  onChange={(e) => setScaleWidth(e.target.value)}
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Largo Norte-Sur (m)</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={scaleHeight}
                  onChange={(e) => setScaleHeight(e.target.value)}
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingScale || !scaleSelect}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingScale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
              <span>⚡ Re-dimensionar Geocerca y Guardar</span>
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 4: TRANSMISIÓN MQTT AL DISPOSITIVO FÍSICO (ESP32)  */}
      {/* ======================================================== */}
      {activeMainTab === 'sync' && (
        <div className="bg-[#0E1624] border border-white/10 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
            <span>Sincronizar Cerca Virtual con Collar Físico por MQTT</span>
          </h3>
          <p className="text-xs text-slate-400">
            Empaqueta los vértices comprimidos y el margen de advertencia en formato binario MQTT para grabarlos en la memoria flash del collar ESP32.
          </p>

          <form onSubmit={handleSyncSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Collar Físico de Destino</label>
              <select
                value={syncCollarId}
                onChange={(e) => setSyncCollarId(e.target.value)}
                required
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="">Selecciona un dispositivo...</option>
                {collares?.map(c => (
                  <option key={c.id} value={c.id}>
                    Collar #{c.id} ({c.activo ? '🟢 Activo' : '🔴 Inactivo'}) - SIM: {c.numero_sim}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Hato General</label>
                <select
                  value={syncHatoId}
                  onChange={(e) => setSyncHatoId(e.target.value)}
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecciona hato...</option>
                  {geocercas?.hatos?.map(h => (
                    <option key={h.id} value={h.id}>{h.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Potrero Asignado</label>
                <select
                  value={syncPotreroId}
                  onChange={(e) => setSyncPotreroId(e.target.value)}
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecciona potrero...</option>
                  {geocercas?.potreros?.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (Margen: {p.margen_advertencia_metros || 10}m)</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingSync || !syncCollarId || !syncHatoId || !syncPotreroId}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingSync ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>📡 Transmitir Geocerca por MQTT</span>
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ALERTA DE SEGURIDAD - ELIMINACIÓN BLOQUEADA      */}
      {/* ======================================================== */}
      <Dialog
        visible={!!safetyBlockedItem}
        onHide={() => setSafetyBlockedItem(null)}
        header={
          <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
            <ShieldAlert size={20} className="animate-pulse" />
            <span>Operación Bloqueada por Seguridad</span>
          </div>
        }
        className="w-[95vw] max-w-md bg-[#0B121C] text-white border border-rose-500/30 rounded-2xl shadow-2xl"
      >
        {safetyBlockedItem && (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs leading-relaxed">
              No es posible eliminar el {safetyBlockedItem.tipo === 'hato' ? 'Hato' : 'Potrero'}{' '}
              <strong className="text-white font-bold">"{safetyBlockedItem.item.nombre}"</strong>{' '}
              porque actualmente tiene{' '}
              <strong className="text-rose-300 font-bold">{safetyBlockedItem.totalActivos} res(es) con collar activo</strong>{' '}
              asignadas.
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Collares Activos Vinculados:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {safetyBlockedItem.animales && safetyBlockedItem.animales.length > 0 ? (
                  safetyBlockedItem.animales.map(a => (
                    <div key={a.id} className="p-2 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">🏷️ {a.arete_visual || 'Sin Arete'}</span>
                      <span className="text-emerald-400 font-mono text-[11px]">Collar #{a.collar_id}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-400">
                    Se detectaron {safetyBlockedItem.totalActivos} collar(es) activos en los potreros de este hato.
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              🛡️ <strong>Regla de Negocio:</strong> Para salvaguardar la telemetría, el arreo virtual y evitar desconfiguración de collares en campo, debes reubicar el ganado a otro potrero o desvincular sus dispositivos antes de eliminar este perímetro.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSafetyBlockedItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: CONFIRMACIÓN DE ELIMINACIÓN (0 COLLARES)        */}
      {/* ======================================================== */}
      <Dialog
        visible={!!confirmDeleteItem}
        onHide={() => setConfirmDeleteItem(null)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <AlertTriangle size={18} className="text-amber-400" />
            <span>Confirmar Eliminación</span>
          </div>
        }
        className="w-[95vw] max-w-md bg-[#0B121C] text-white border border-white/10 rounded-2xl shadow-2xl"
      >
        {confirmDeleteItem && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente el{' '}
              {confirmDeleteItem.tipo === 'hato' ? 'Hato' : 'Potrero'}{' '}
              <strong className="text-white">"{confirmDeleteItem.item.nombre}"</strong>?
            </p>

            {confirmDeleteItem.tipo === 'hato' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                ⚠️ <strong>Eliminación en cascada:</strong> Se eliminarán también todos los potreros asociados a este hato.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deletingItem}
                onClick={handleExecuteDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md flex items-center gap-1.5"
              >
                {deletingItem ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
}
