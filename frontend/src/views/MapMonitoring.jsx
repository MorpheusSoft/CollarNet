import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Search, 
  MapPin, 
  Battery, 
  Signal, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Layers,
  Satellite,
  Compass,
  ArrowRightLeft,
  Sparkles,
  Eye,
  Info,
  Fence,
  Zap,
  Moon,
  Video,
  Building,
  Target
} from 'lucide-react';
import { apiCambiarEstadoPotrero } from '../services/apiService';

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function MapMonitoring({ 
  monitoringData, 
  geocercas, 
  selectedHatoId,
  onSelectAnimalForProjection,
  onSelectAnimalForCamera
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const polygonsGroupRef = useRef(null);
  const potreroLayersRef = useRef({});
  const hatoLayersRef = useRef({});
  const hasCenteredRef = useRef(false);
  const prevSelectedHatoRef = useRef(selectedHatoId);

  const [currentLayer, setCurrentLayer] = useState('satellite');
  // Tabs: 'hatos' | 'potreros' | 'animals'
  const [sidebarTab, setSidebarTab] = useState('animals');
  const [filterType, setFilterType] = useState('all');
  const [potreroFilter, setPotreroFilter] = useState('all'); // 'all' | 'abierto' | 'descanso' | 'arreo'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [selectedPotreroId, setSelectedPotreroId] = useState(null);
  const [selectedHatoTabId, setSelectedHatoTabId] = useState(null);
  const [isTogglingPotrero, setIsTogglingPotrero] = useState(false);

  // Check if any potrero is actively in arreo/traslado mode
  const arreoInfo = geocercas?.arreo || null;
  const activeArreoPotreros = (geocercas?.potreros || []).filter(p => 
    p.modo_arreo_activo || (arreoInfo?.activo && (p.nombre === arreoInfo?.origen || p.nombre === arreoInfo?.destino))
  );
  const hasActiveArreo = !!(arreoInfo?.activo || activeArreoPotreros.length > 0);

  const potreroSalida = (geocercas?.potreros || []).find(p => 
    p.rol_arreo === 'SALIDA' || (arreoInfo?.activo && p.nombre === arreoInfo?.origen)
  ) || (hasActiveArreo && activeArreoPotreros.length > 0 ? activeArreoPotreros[0] : null);

  const potreroLlegada = (geocercas?.potreros || []).find(p => 
    p.rol_arreo === 'LLEGADA' || (arreoInfo?.activo && p.nombre === arreoInfo?.destino)
  ) || (hasActiveArreo && activeArreoPotreros.length > 1 ? activeArreoPotreros[1] : null);

  // Center on specific Hato or fallback to all geocercas
  const centerOnHato = (hatoIdToFind) => {
    if (!mapInstanceRef.current || !geocercas?.hatos) return;

    let targetHato = null;
    if (hatoIdToFind && hatoIdToFind !== 'ALL') {
      targetHato = geocercas.hatos.find(h => String(h.id) === String(hatoIdToFind));
    }
    
    // Si no se especifica o es ALL, tomar el primer hato registrado
    if (!targetHato && geocercas.hatos.length > 0) {
      targetHato = geocercas.hatos[0];
    }

    if (targetHato) {
      const layer = hatoLayersRef.current[targetHato.id];
      if (layer) {
        mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 18, animate: true });
        layer.openPopup();
        return;
      }
      if (targetHato.geojson) {
        try {
          const geo = typeof targetHato.geojson === 'string' ? JSON.parse(targetHato.geojson) : targetHato.geojson;
          if (geo.coordinates && geo.coordinates[0]) {
            const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
            const bounds = L.latLngBounds(latlngs);
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
            return;
          }
        } catch (e) {
          console.error('Error parse geojson hato:', e);
        }
      }
    }

    // Fallback: si hay polígonos dibujados, encuadrar todo el grupo
    if (polygonsGroupRef.current && polygonsGroupRef.current.getLayers().length > 0) {
      mapInstanceRef.current.fitBounds(polygonsGroupRef.current.getBounds(), { padding: [40, 40], maxZoom: 16, animate: true });
    }
  };

  const handleLocateHato = () => {
    centerOnHato(selectedHatoId);
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let initialLat = 10.671340;
    let initialLon = -71.604030;
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
    } else if (monitoringData && monitoringData.length > 0) {
      const a = monitoringData[0];
      if (a.latitud && a.longitud) {
        initialLat = parseFloat(a.latitud);
        initialLon = parseFloat(a.longitud);
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 16,
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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Satellite vs Streets Layer
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

  // Handler to toggle Potrero Estado (Abierto <-> Descanso)
  const handleTogglePotreroEstado = async (potreroId, currentEstado) => {
    try {
      setIsTogglingPotrero(true);
      const nuevoEstado = currentEstado === 'ABIERTO' ? 'DESCANSO' : 'ABIERTO';
      await apiCambiarEstadoPotrero(potreroId, nuevoEstado);
    } catch (err) {
      console.error('Error al alternar estado de potrero:', err);
      alert('Error al cambiar estado: ' + err.message);
    } finally {
      setIsTogglingPotrero(false);
    }
  };

  // 3. Render Geofences (Hatos and Potreros with visual distinction of states)
  useEffect(() => {
    if (!mapInstanceRef.current || !polygonsGroupRef.current || !geocercas) return;

    polygonsGroupRef.current.clearLayers();
    potreroLayersRef.current = {};
    hatoLayersRef.current = {};

    // A. Render Hatos (Límites Generales Maestros con Nombre Flotante Permanente)
    if (geocercas.hatos) {
      geocercas.hatos.forEach(hato => {
        if (!hato.geojson) return;
        try {
          const geo = typeof hato.geojson === 'string' ? JSON.parse(hato.geojson) : hato.geojson;
          const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
          const poly = L.polygon(latlngs, {
            color: '#f59e0b',
            weight: 3.5,
            fillColor: '#f59e0b',
            fillOpacity: 0.04,
            dashArray: '8, 6'
          }).bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
              <div style="font-weight: bold; font-size: 14px; color: #b45309; margin-bottom: 4px;">
                🏰 Hato Principal: ${hato.nombre}
              </div>
              <div><strong>ID Hato:</strong> #${hato.id}</div>
              <div>⚠️ <strong>Margen Alerta:</strong> ${hato.margen_advertencia_metros || 10} m</div>
              <div style="font-size:11px; color:#64748b; margin-top:4px;">Perímetro legal y límite perimetral de la propiedad</div>
            </div>
          `);

          // Nombre del Hato flotando en hover
          poly.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px; font-weight: 800; color: #fff; background: rgba(15, 23, 42, 0.95); border: 1.5px solid #f59e0b; border-radius: 6px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span>🏰 Hato:</span>
              <span style="color: #fde68a;">${hato.nombre}</span>
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
          console.error('Error al dibujar hato:', e);
        }
      });
    }

    // Auto-centrar solo en carga inicial o cambio deliberado de hato
    const shouldCenter = !hasCenteredRef.current || prevSelectedHatoRef.current !== selectedHatoId;
    prevSelectedHatoRef.current = selectedHatoId;
    if (shouldCenter) {
      hasCenteredRef.current = true;
      if (selectedHatoId && selectedHatoId !== 'ALL') {
        setTimeout(() => centerOnHato(selectedHatoId), 300);
      } else if (geocercas.hatos && geocercas.hatos.length > 0) {
        setTimeout(() => centerOnHato(geocercas.hatos[0].id), 300);
      }
    }

    // B. Render Potreros (Subdivisiones con Estados Operativos y Rol de Traslado)
    if (geocercas.potreros) {
      geocercas.potreros.forEach(pot => {
        if (!pot.geojson) return;
        try {
          const geo = typeof pot.geojson === 'string' ? JSON.parse(pot.geojson) : pot.geojson;
          const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
          
          const estado = (pot.estado || 'ABIERTO').toUpperCase();
          const isSalida = pot.rol_arreo === 'SALIDA' || (arreoInfo?.activo && pot.nombre === arreoInfo?.origen);
          const isLlegada = pot.rol_arreo === 'LLEGADA' || (arreoInfo?.activo && pot.nombre === arreoInfo?.destino);
          const isArreo = isSalida || isLlegada || !!pot.modo_arreo_activo;
          const isDescanso = estado === 'DESCANSO' || estado === 'CERRADO';

          // Distinct visual styles
          let strokeColor = '#10b981'; // Green (Abierto)
          let fillColor = '#10b981';
          let fillOpacity = 0.20;
          let weight = 2.5;
          let dashArray = null;

          if (isSalida) {
            strokeColor = '#f59e0b';
            fillColor = '#f59e0b';
            fillOpacity = 0.35;
            weight = 3.5;
            dashArray = '8, 4';
          } else if (isLlegada) {
            strokeColor = '#06b6d4';
            fillColor = '#06b6d4';
            fillOpacity = 0.35;
            weight = 3.5;
            dashArray = '8, 4';
          } else if (isArreo) {
            strokeColor = '#f59e0b';
            fillColor = '#f59e0b';
            fillOpacity = 0.30;
            weight = 3.5;
            dashArray = '8, 4';
          } else if (isDescanso) {
            strokeColor = '#6366f1';
            fillColor = '#64748b';
            fillOpacity = 0.12;
            weight = 2.5;
            dashArray = '6, 6';
          }

          const poly = L.polygon(latlngs, {
            color: strokeColor,
            weight,
            fillColor,
            fillOpacity,
            dashArray
          });

          // Nombre del Potrero flotando
          let tooltipHtml = `
            <div style="font-family: inherit; line-height: 1.3;">
              <div style="font-size: 12px; font-weight: 800; color: #a7f3d0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>🌱</span> ${pot.nombre}
              </div>
              <div style="font-size: 10px; color: #ecfdf5; font-weight: 600;">🟢 ${pot.total_animales || 0} reses</div>
            </div>
          `;

          poly.bindTooltip(tooltipHtml, {
            permanent: false,
            sticky: true,
            direction: 'center',
            className: 'map-tooltip-potrero'
          });

          // Popup
          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 220px; padding: 2px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <strong style="font-size: 14px; color: #0f172a;">🌱 ${pot.nombre}</strong>
                <span style="font-size: 10px; font-weight: bold; padding: 2px 7px; border-radius: 9999px; background:#d1fae5; color:#065f46;">
                  ${estado}
                </span>
              </div>
              
              <div style="font-size: 11px; color: #334155; line-height: 1.5; margin-bottom: 8px;">
                <div>🐮 <strong>Animales Asignados:</strong> ${pot.total_animales || 0} cabezas</div>
                <div>📏 <strong>Capacidad Máxima:</strong> ${pot.capacidad_max_cabezas || 50} cabezas</div>
                <div>⚠️ <strong>Margen Alerta:</strong> ${pot.margen_advertencia_metros || 10} m</div>
              </div>
            </div>
          `;

          poly.bindPopup(popupContent);
          polygonsGroupRef.current.addLayer(poly);
          potreroLayersRef.current[pot.id] = poly;
        } catch (e) {
          console.error('Error al dibujar potrero:', e);
        }
      });
    }
  }, [geocercas]);

  // Global listener for map popup camera button
  useEffect(() => {
    window.__openCollarCameraFromMap = (collarId) => {
      const animal = (monitoringData || []).find(m => String(m.collar_id) === String(collarId));
      if (animal && onSelectAnimalForCamera) {
        onSelectAnimalForCamera(animal);
      }
    };
    return () => {
      delete window.__openCollarCameraFromMap;
    };
  }, [monitoringData, onSelectAnimalForCamera]);

  // 4. Render and Update Animal Markers with Telemetry
  useEffect(() => {
    if (!mapInstanceRef.current || !monitoringData) return;

    monitoringData.forEach(animal => {
      const lat = parseFloat(animal.latitud);
      const lon = parseFloat(animal.longitud);
      if (isNaN(lat) || isNaN(lon)) return;

      const estado = animal.estado_cerca || 'DENTRO';
      const isEscape = estado === 'FUERA';
      const isWarn = estado === 'ADVERTENCIA';

      const colorClass = isEscape ? 'bg-rose-500 ring-rose-400' : (isWarn ? 'bg-amber-500 ring-amber-400' : 'bg-emerald-500 ring-emerald-400');
      const emoji = isEscape ? '🚨' : (isWarn ? '⚠️' : '🐮');

      const customIcon = L.divIcon({
        className: 'custom-animal-marker',
        html: `
          <div class="w-8 h-8 rounded-full ${colorClass} text-white flex items-center justify-center text-sm font-bold shadow-lg ring-4 ring-opacity-40 animate-pulse cursor-pointer">
            ${emoji}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const bat = animal.nivel_bateria ?? animal.bateria_nivel ?? 100;
      const isCharging = animal.esta_cargando === true;
      const batColor = bat > 50 ? '#059669' : bat > 20 ? '#d97706' : '#e11d48';

      const tooltipContent = `
        <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #fff; background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(255,255,255,0.25); border-radius: 6px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
          <span>🐮 #${animal.arete_visual || animal.collar_id}</span>
          <span style="color: #94a3b8; font-size: 10px;">(${animal.collar_id})</span>
          <span style="color: #38bdf8; font-size: 10px; margin-left: 2px;">🔋 ${bat}%</span>
        </div>
      `;

      if (markersRef.current[animal.collar_id]) {
        markersRef.current[animal.collar_id].setLatLng([lat, lon]);
        markersRef.current[animal.collar_id].setIcon(customIcon);
        if (markersRef.current[animal.collar_id].getTooltip()) {
          markersRef.current[animal.collar_id].setTooltipContent(tooltipContent);
        }
      } else {
        const marker = L.marker([lat, lon], { icon: customIcon }).addTo(mapInstanceRef.current);
        
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          sticky: true,
          direction: 'top',
          className: 'map-tooltip-hover'
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; padding: 4px; min-width:210px;">
            <div style="font-weight: bold; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
              🐂 Arete: ${animal.arete_visual || 'Sin Arete'} (${animal.raza || 'Ganado'})
            </div>
            <div><strong>Collar Activo:</strong> <span style="font-weight:bold; color:#0284c7;">${animal.collar_id}</span></div>
            <div><strong>Estado Cerca:</strong> <span style="font-weight:bold; color:${isEscape ? '#e11d48' : (isWarn ? '#d97706' : '#059669')}">${estado}</span></div>
            <div><strong>Batería:</strong> <span style="font-weight:bold; color:${batColor};">🔋 ${bat}%</span> ${isCharging ? '<span style="background:#fef08a; color:#854d0e; padding:1px 5px; border-radius:4px; font-size:10px; font-weight:bold;">⚡ USB</span>' : ''}</div>
            <div><strong>Enlace:</strong> <span style="font-weight:bold; color:${animal.medio_red === 'WIFI' ? '#0284c7' : '#10b981'};">${animal.medio_red === 'WIFI' ? '📶 Wi-Fi' : '📱 4G Digitel'}</span></div>
            <div><strong>GPS:</strong> <span style="font-weight:bold; color:#059669;">🛰️ ${animal.satelites_visibles || 13} satélites fijados</span></div>
            <div><strong>Potrero Actual:</strong> 🌱 ${animal.potrero_nombre || 'No asignado'}</div>
            <div><strong>Hato:</strong> 🏰 ${animal.hato_nombre || 'Hato Principal'}</div>
            
            <button onclick="window.__openCollarCameraFromMap && window.__openCollarCameraFromMap('${animal.collar_id}')" style="margin-top:9px; width:100%; background:#047857; color:#ffffff; border:none; border-radius:8px; padding:6px 10px; font-weight:bold; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(4,120,87,0.4);">
              📹 Ver Cámara en Vivo
            </button>
          </div>
        `);

        markersRef.current[animal.collar_id] = marker;
      }
    });
  }, [monitoringData]);

  // Center Map on specific Animal
  const centerOnAnimal = (animal) => {
    setSelectedAnimalId(animal.id);
    const lat = parseFloat(animal.latitud);
    const lon = parseFloat(animal.longitud);
    if (mapInstanceRef.current && !isNaN(lat) && !isNaN(lon)) {
      mapInstanceRef.current.setView([lat, lon], 17, { animate: true });
      if (markersRef.current[animal.collar_id]) {
        markersRef.current[animal.collar_id].openPopup();
      }
    }
  };

  // Center Map on specific Potrero
  const centerOnPotrero = (potrero) => {
    setSelectedPotreroId(potrero.id);
    const layer = potreroLayersRef.current[potrero.id];
    if (layer && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 17, animate: true });
      layer.openPopup();
    }
  };

  // Filter animals for sidebar list
  const filteredAnimals = (monitoringData || []).filter(animal => {
    const matchesSearch = 
      (animal.arete_visual && animal.arete_visual.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (animal.collar_id && animal.collar_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (animal.raza && animal.raza.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (animal.potrero_nombre && animal.potrero_nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'warnings') return animal.estado_cerca === 'ADVERTENCIA';
    if (filterType === 'escapes') return animal.estado_cerca === 'FUERA';
    return true;
  });

  // Filter potreros for sidebar list
  const potrerosList = (geocercas?.potreros || []).filter(pot => {
    const matchesSearch = pot.nombre && pot.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (potreroFilter === 'abierto') return pot.estado === 'ABIERTO' && !pot.modo_arreo_activo;
    if (potreroFilter === 'descanso') return pot.estado === 'DESCANSO' || pot.estado === 'CERRADO';
    if (potreroFilter === 'arreo') return !!pot.modo_arreo_activo;
    return true;
  });

  // Hatos list
  const hatosList = (geocercas?.hatos || []).filter(h => {
    return !searchTerm || (h.nombre && h.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row overflow-hidden">
      
      {/* 1. MAP VIEWPORT (Center/Left) */}
      <div className="relative flex-1 h-[50vh] md:h-full w-full">
        
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Layer Controls (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#0E1624]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
          <button
            type="button"
            onClick={handleLocateHato}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-500 hover:to-yellow-500 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            title="Centrar y enfocar en el Hato"
          >
            <Building className="w-3.5 h-3.5 text-amber-200" />
            <span>🏰 Enfocar Hato</span>
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

        {/* Interactive Floating Legend (Bottom Left) */}
        <div className="absolute bottom-6 left-6 z-20 bg-[#0B121C]/90 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-2xl hidden md:block max-w-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-white mb-2.5 border-b border-white/10 pb-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Capas del Monitoreo</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            {/* Hato Límite */}
            <div className="flex items-center gap-2 col-span-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-amber-500 bg-amber-500/15"></span>
              <span className="text-amber-300 font-bold">🏰 Hato (Perímetro Maestro)</span>
            </div>

            {/* Potrero Abierto */}
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-500/20"></span>
              <span className="text-slate-300">Potrero Abierto</span>
            </div>

            {/* Potrero Descanso */}
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-indigo-400 bg-slate-700/30"></span>
              <span className="text-slate-300">En Descanso</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 🐮 Con Collar Activo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Alerta</span>
          </div>
        </div>

      </div>

      {/* 2. SIDEBAR LIVE TELEMETRY (Right) */}
      <div className="w-full md:w-80 lg:w-84 xl:w-96 bg-[#0B121C] border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[50vh] md:h-full z-20 flex-shrink-0">
        
        {/* Panel Header */}
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          
          {/* Main 3-Tab Switcher: HATOS vs POTREROS vs GANADO ACTIVO */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSidebarTab('hatos')}
              className={`flex items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                sidebarTab === 'hatos'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>🏰 Hatos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {hatosList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('potreros')}
              className={`flex items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                sidebarTab === 'potreros'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>🌱 Potreros</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {potrerosList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('animals')}
              className={`flex items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                sidebarTab === 'animals'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>🐮 Ganado</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {filteredAnimals.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                sidebarTab === 'hatos' 
                  ? 'Buscar hato por nombre...' 
                  : (sidebarTab === 'potreros' ? 'Buscar potrero...' : 'Buscar arete, collar...')
              }
              className="w-full bg-[#080D15] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          {/* Sub-Filters for Animals Tab */}
          {sidebarTab === 'animals' && (
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`py-1 rounded-lg text-center transition-all ${
                  filterType === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({filteredAnimals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('warnings')}
                className={`py-1 rounded-lg text-center transition-all ${
                  filterType === 'warnings' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚠️ Alerta
              </button>
              <button
                type="button"
                onClick={() => setFilterType('escapes')}
                className={`py-1 rounded-lg text-center transition-all ${
                  filterType === 'escapes' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🚨 Fuga
              </button>
            </div>
          )}

        </div>

        {/* Panel Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          
          {/* TAB 1: HATOS LIST */}
          {sidebarTab === 'hatos' && (
            hatosList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No hay hatos registrados.
              </div>
            ) : (
              hatosList.map((hato) => {
                const isSelected = selectedHatoTabId === hato.id;
                const potrerosCount = (geocercas?.potreros || []).filter(p => p.hato_id === hato.id).length;
                const animalesCount = (monitoringData || []).filter(a => a.hato_id === hato.id || a.hato_nombre === hato.nombre).length;

                return (
                  <div
                    key={hato.id}
                    onClick={() => {
                      setSelectedHatoTabId(hato.id);
                      centerOnHato(hato.id);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-900/80 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-sm text-white">
                          {hato.nombre}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        ID: #{hato.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 my-2 bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <span className="text-[10px] block text-slate-500">Potreros Activos</span>
                        <strong className="text-emerald-400 text-xs">🌱 {potrerosCount} potreros</strong>
                      </div>
                      <div>
                        <span className="text-[10px] block text-slate-500">Ganado Monitoreado</span>
                        <strong className="text-cyan-400 text-xs">🐮 {animalesCount} animales</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-400">
                        Margen Alerta: <strong className="text-amber-300">{hato.margen_advertencia_metros || 10}m</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          centerOnHato(hato.id);
                        }}
                        className="text-[10px] font-bold text-amber-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-600 transition-all"
                      >
                        <Target className="w-3 h-3 text-amber-400" /> Enfocar Mapa
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 2: POTREROS LIST */}
          {sidebarTab === 'potreros' && (
            potrerosList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se encontraron potreros registrados.
              </div>
            ) : (
              potrerosList.map((pot) => {
                const isSelected = selectedPotreroId === pot.id;
                const estado = (pot.estado || 'ABIERTO').toUpperCase();
                const isDescanso = estado === 'DESCANSO' || estado === 'CERRADO';

                return (
                  <div
                    key={pot.id}
                    onClick={() => centerOnPotrero(pot)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-glow-emerald'
                        : isDescanso
                        ? 'bg-slate-900/80 border-slate-700/60 hover:bg-slate-800/80'
                        : 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        🌱 {pot.nombre}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isDescanso ? 'bg-slate-800 text-slate-300 border border-slate-600' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 my-2 bg-slate-950/40 p-2 rounded-lg border border-white/5">
                      <div>
                        <span className="text-[10px] block text-slate-500">Ocupación Actual</span>
                        <strong className="text-white text-xs">{pot.total_animales || 0}</strong>
                        <span className="text-[10px] text-slate-400"> / {pot.capacidad_max_cabezas || 50} max</span>
                      </div>
                      <div>
                        <span className="text-[10px] block text-slate-500">Hato Asignado</span>
                        <strong className="text-amber-300 text-xs">🏰 Hato #{pot.hato_id || 1}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-slate-400">
                        Margen: <strong className="text-slate-300">{pot.margen_advertencia_metros || 10}m</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePotreroEstado(pot.id, pot.estado);
                        }}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10"
                      >
                        {isDescanso ? 'Abrir a Pastoreo' : 'Poner en Descanso'}
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 3: ANIMALS LIST (ANIMALES CON COLLARES ACTIVOS) */}
          {sidebarTab === 'animals' && (
            filteredAnimals.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se encontraron animales activos en monitoreo.
              </div>
            ) : (
              filteredAnimals.map((animal) => {
                const isSelected = selectedAnimalId === animal.id;
                const isEscape = animal.estado_cerca === 'FUERA';
                const isWarn = animal.estado_cerca === 'ADVERTENCIA';

                return (
                  <div
                    key={animal.id || animal.collar_id}
                    onClick={() => centerOnAnimal(animal)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-glow-emerald'
                        : isEscape
                        ? 'bg-rose-950/30 border-rose-500/50'
                        : isWarn
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-slate-900/80 border-white/10 hover:border-emerald-500/40 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          🐮 Arete: {animal.arete_visual || animal.arete || 'VACA-001'}
                        </span>
                        <span className="text-[10px] text-emerald-300 font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 font-bold">
                          {animal.collar_id}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isEscape
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {animal.estado_cerca || 'DENTRO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-2.5 text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg">
                      {(() => {
                        const batVal = animal.nivel_bateria ?? animal.bateria_nivel ?? 100;
                        const isChg = animal.esta_cargando === true;
                        const col = batVal > 50 ? 'text-emerald-400 font-bold' : batVal > 20 ? 'text-amber-400' : 'text-rose-400 font-bold';
                        return (
                          <span className={`flex items-center gap-1 ${col}`}>
                            <Battery className="w-3.5 h-3.5" />
                            {batVal}% {isChg && '⚡'}
                          </span>
                        );
                      })()}
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Signal className="w-3 h-3" />
                        {animal.senal_celular ? `${animal.senal_celular}/5 barras` : '4G LTE'}
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {animal.ultima_conexion ? new Date(animal.ultima_conexion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'En vivo'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 mt-2 text-[10px]">
                      <span className="text-slate-300 truncate">
                        🏰 <strong>{animal.hato_nombre || 'Hato 25/9 #1'}</strong> • 🌱 <strong>{animal.potrero_nombre || 'Potrero A'}</strong>
                      </span>
                    </div>

                    {/* Actions footer */}
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        🛰️ {animal.satelites_visibles || 13} Sats Fijados
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAnimalForCamera?.(animal);
                          }}
                          className="text-[10px] font-black text-cyan-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-600 transition-all shadow-sm"
                          title="Ver cámara del collar en vivo"
                        >
                          <Video className="w-3 h-3 text-cyan-400" /> Ver Cámara
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            centerOnAnimal(animal);
                          }}
                          className="text-[10px] font-bold text-emerald-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-600 transition-all"
                        >
                          <Target className="w-3 h-3" /> Ubicar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

        </div>

      </div>

    </div>
  );
}
