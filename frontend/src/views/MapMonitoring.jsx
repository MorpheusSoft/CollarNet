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
  Moon
} from 'lucide-react';
import { apiCambiarEstadoPotrero } from '../services/apiService';

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function MapMonitoring({ 
  monitoringData, 
  geocercas, 
  selectedHatoId,
  onSelectAnimalForProjection 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const polygonsGroupRef = useRef(null);
  const potreroLayersRef = useRef({});
  const hatoLayersRef = useRef({});

  const [currentLayer, setCurrentLayer] = useState('satellite');
  const [sidebarTab, setSidebarTab] = useState('animals'); // 'animals' | 'potreros'
  const [filterType, setFilterType] = useState('all');
  const [potreroFilter, setPotreroFilter] = useState('all'); // 'all' | 'abierto' | 'descanso' | 'arreo'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [selectedPotreroId, setSelectedPotreroId] = useState(null);
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
        mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 17, animate: true });
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

    // Buscar si ya existe algún hato para no arrancar fijamente en el llano
    let initialLat = 9.1000;
    let initialLon = -67.1000;
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
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.05,
            dashArray: '6, 6'
          }).bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 4px;">
              <div style="font-weight: bold; font-size: 14px; color: #991b1b; margin-bottom: 4px;">
                🏰 Hato Maestro: ${hato.nombre}
              </div>
              <div><strong>ID:</strong> #${hato.id}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Perímetro legal y límite perimetral de la propiedad</div>
            </div>
          `);

          // Nombre del Hato flotando permanentemente sobre el polígono
          poly.bindTooltip(`
            <div style="display: flex; items-center: center; gap: 6px; font-weight: 800; letter-spacing: 0.05em; font-size: 11px; text-transform: uppercase;">
              <span>🏰</span>
              <span style="color: #fca5a5;">HATO: ${hato.nombre}</span>
            </div>
          `, {
            permanent: true,
            direction: 'center',
            className: 'map-tooltip-hato'
          });

          polygonsGroupRef.current.addLayer(poly);
          hatoLayersRef.current[hato.id] = poly;
        } catch (e) {
          console.error('Error al dibujar hato:', e);
        }
      });
    }

    // Auto-centrar en el hato seleccionado al renderizar las geocercas
    if (selectedHatoId && selectedHatoId !== 'ALL') {
      setTimeout(() => centerOnHato(selectedHatoId), 300);
    } else if (geocercas.hatos && geocercas.hatos.length > 0) {
      setTimeout(() => centerOnHato(geocercas.hatos[0].id), 300);
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
          const isAbierto = estado === 'ABIERTO' && !isArreo;

          // Distinct visual styles
          let strokeColor = '#10b981'; // Green (Abierto)
          let fillColor = '#10b981';
          let fillOpacity = 0.20;
          let weight = 2.5;
          let dashArray = null;

          if (isSalida) {
            strokeColor = '#f59e0b'; // Amber / Orange (Salida / Origen)
            fillColor = '#f59e0b';
            fillOpacity = 0.35;
            weight = 3.5;
            dashArray = '8, 4';
          } else if (isLlegada) {
            strokeColor = '#06b6d4'; // Cyan (Llegada / Destino)
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
            strokeColor = '#6366f1'; // Indigo / Slate (En Descanso / Cerrado)
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

          // Nombre del Potrero flotando permanentemente sobre el polígono
          let tooltipClass = 'map-tooltip-potrero';
          let tooltipHtml = '';

          if (isSalida) {
            tooltipClass += ' map-tooltip-potrero-salida';
            tooltipHtml = `
              <div style="font-family: inherit; line-height: 1.3;">
                <div style="font-size: 10px; font-weight: 900; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>📤</span> SALIDA (ORIGEN)
                </div>
                <div style="font-size: 13px; font-weight: 800; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${pot.nombre}</div>
                <div style="font-size: 10px; color: #fef08a; font-weight: 600;">🐮 ${pot.total_animales || 0} reses en traslado</div>
              </div>
            `;
          } else if (isLlegada) {
            tooltipClass += ' map-tooltip-potrero-llegada';
            tooltipHtml = `
              <div style="font-family: inherit; line-height: 1.3;">
                <div style="font-size: 10px; font-weight: 900; color: #67e8f9; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>📥</span> LLEGADA (DESTINO)
                </div>
                <div style="font-size: 13px; font-weight: 800; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${pot.nombre}</div>
                <div style="font-size: 10px; color: #a5f3fc; font-weight: 600;">Cap: ${pot.capacidad_max_cabezas || 50} reses</div>
              </div>
            `;
          } else if (isDescanso) {
            tooltipClass += ' map-tooltip-potrero-descanso';
            tooltipHtml = `
              <div style="font-family: inherit; line-height: 1.3;">
                <div style="font-size: 12px; font-weight: 700; color: #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>💤</span> ${pot.nombre}
                </div>
                <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">En Descanso • ${pot.dias_descanso || 0}d</div>
              </div>
            `;
          } else {
            tooltipHtml = `
              <div style="font-family: inherit; line-height: 1.3;">
                <div style="font-size: 12px; font-weight: 800; color: #a7f3d0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>🌱</span> ${pot.nombre}
                </div>
                <div style="font-size: 10px; color: #ecfdf5; font-weight: 600;">🟢 ${pot.total_animales || 0} reses</div>
              </div>
            `;
          }

          poly.bindTooltip(tooltipHtml, {
            permanent: true,
            direction: 'center',
            className: tooltipClass
          });

          // Rich popup with real-time status and operational details
          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 220px; padding: 2px;">
              ${isSalida ? '<div style="background:#fef3c7; color:#b45309; padding:4px 8px; border-radius:6px; font-weight:bold; margin-bottom:6px; font-size:11px; border:1px solid #fde68a;">📤 Potrero de SALIDA (Origen de Traslado)</div>' : ''}
              ${isLlegada ? '<div style="background:#cffafe; color:#0e7490; padding:4px 8px; border-radius:6px; font-weight:bold; margin-bottom:6px; font-size:11px; border:1px solid #a5f3fc;">📥 Potrero de LLEGADA (Destino de Traslado)</div>' : ''}

              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <strong style="font-size: 14px; color: #0f172a;">🌱 ${pot.nombre}</strong>
                <span style="font-size: 10px; font-weight: bold; padding: 2px 7px; border-radius: 9999px; ${
                  isSalida
                    ? 'background:#fef3c7; color:#b45309; border:1px solid #fde68a;'
                    : (isLlegada
                      ? 'background:#cffafe; color:#0e7490; border:1px solid #a5f3fc;'
                      : (isArreo 
                        ? 'background:#fef3c7; color:#b45309; border:1px solid #fde68a;' 
                        : (isDescanso 
                          ? 'background:#e2e8f0; color:#475569; border:1px solid #cbd5e1;' 
                          : 'background:#d1fae5; color:#065f46; border:1px solid #a7f3d0;')))
                }">
                  ${isSalida ? '📤 SALIDA DE TRASLADO' : (isLlegada ? '📥 LLEGADA DE TRASLADO' : (isArreo ? '⚡ TRASLADO EN CURSO' : (isDescanso ? '💤 EN DESCANSO (CERRADO)' : '🟢 ABIERTO (PASTOREO)')))}
                </span>
              </div>
              
              <div style="font-size: 11px; color: #334155; line-height: 1.5; margin-bottom: 8px;">
                <div>🐮 <strong>Animales Asignados:</strong> ${pot.total_animales || 0} cabezas</div>
                <div>📏 <strong>Capacidad Máxima:</strong> ${pot.capacidad_max_cabezas || 50} cabezas</div>
                <div>⚠️ <strong>Margen Alerta:</strong> ${pot.margen_advertencia_metros || 10} m</div>
                <div>⏳ <strong>Régimen:</strong> ${isDescanso ? `${pot.dias_descanso || 0} días en descanso` : `${pot.dias_ocupacion || 0} días de pastoreo`}</div>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 10px; color: #64748b;">
                ${isSalida 
                  ? '📤 <em>Compuerta de salida abierta. El ganado está siendo trasladado desde aquí.</em>' 
                  : (isLlegada
                    ? '📥 <em>Compuerta de recepción abierta. Destino programado para el lote de ganado.</em>'
                    : (isDescanso 
                      ? '🌾 <em>Pastura en recuperación vegetativa.</em>' 
                      : '🌱 <em>Pastura óptima para consumo directo.</em>'))}
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

      // C. Corredor de Tránsito animado entre Salida y Llegada (cuando hay traslado activo)
      if (hasActiveArreo && potreroSalida && potreroLlegada && potreroSalida.id !== potreroLlegada.id) {
        const salidaLayer = potreroLayersRef.current[potreroSalida.id];
        const llegadaLayer = potreroLayersRef.current[potreroLlegada.id];
        if (salidaLayer && llegadaLayer) {
          const centerSalida = salidaLayer.getBounds().getCenter();
          const centerLlegada = llegadaLayer.getBounds().getCenter();

          const corridorLine = L.polyline([centerSalida, centerLlegada], {
            color: '#f59e0b',
            weight: 3.5,
            dashArray: '10, 8',
            opacity: 0.85
          });

          const midLat = (centerSalida.lat + centerLlegada.lat) / 2;
          const midLng = (centerSalida.lng + centerLlegada.lng) / 2;

          const transitMarker = L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: 'leaflet-tooltip-base',
              html: `
                <div style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid #f59e0b; border-radius: 9999px; padding: 4px 10px; color: #fbbf24; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.6); white-space: nowrap; transform: translate(-50%, -50%);">
                  <span style="color:#fbbf24;">📤 ${potreroSalida.nombre}</span>
                  <span style="color:#f59e0b; font-size: 14px; font-weight: 900;">════▶</span>
                  <span style="color:#67e8f9;">📥 ${potreroLlegada.nombre}</span>
                </div>
              `,
              iconSize: [0, 0]
            })
          });

          polygonsGroupRef.current.addLayer(corridorLine);
          polygonsGroupRef.current.addLayer(transitMarker);
        }
      }
    }
  }, [geocercas]);

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
          <div class="relative flex items-center justify-center cursor-pointer group">
            <span class="absolute -top-6 bg-slate-900/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap border border-white/10">
              #${animal.arete_visual || animal.collar_id}
            </span>
            <div class="w-8 h-8 rounded-full ${colorClass} text-white flex items-center justify-center text-sm font-bold shadow-lg ring-4 ring-opacity-40 animate-pulse">
              ${emoji}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (markersRef.current[animal.collar_id]) {
        markersRef.current[animal.collar_id].setLatLng([lat, lon]);
        markersRef.current[animal.collar_id].setIcon(customIcon);
      } else {
        const marker = L.marker([lat, lon], { icon: customIcon }).addTo(mapInstanceRef.current);
        
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; padding: 4px; min-width:180px;">
            <div style="font-weight: bold; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
              🐂 Arete: ${animal.arete_visual || 'Sin Arete'} (${animal.raza || 'Ganado'})
            </div>
            <div><strong>Collar ID:</strong> ${animal.collar_id}</div>
            <div><strong>Estado Cerca:</strong> <span style="font-weight:bold; color:${isEscape ? '#e11d48' : (isWarn ? '#d97706' : '#059669')}">${estado}</span></div>
            <div><strong>Batería:</strong> 🔋 ${animal.bateria_nivel || 100}%</div>
            <div><strong>Potrero Actual:</strong> 🌱 ${animal.potrero_nombre || 'No asignado'}</div>
            <div><strong>Última Señal:</strong> ${animal.fecha_hora ? new Date(animal.fecha_hora).toLocaleTimeString() : 'En vivo'}</div>
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

  // Summary counters for Potreros
  const totalPotreros = geocercas?.potreros?.length || 0;
  const abiertosCount = (geocercas?.potreros || []).filter(p => p.estado === 'ABIERTO' && !p.modo_arreo_activo).length;
  const descansoCount = (geocercas?.potreros || []).filter(p => p.estado === 'DESCANSO' || p.estado === 'CERRADO').length;
  const arreoCount = activeArreoPotreros.length;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row overflow-hidden">
      
      {/* 1. MAP VIEWPORT (Center/Left) */}
      <div className="relative flex-1 h-[50vh] md:h-full w-full">
        
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Top Active Traslado / Modo Arreo Banner */}
        {hasActiveArreo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/95 backdrop-blur-md text-white font-sans px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-500/60 max-w-[95%] md:max-w-2xl shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-400 fill-current animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                  Modo Traslado Activo
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Compuertas virtuales sin alertas de fuga
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                  <span className="text-amber-400 font-extrabold text-[11px]">📤 SALIDA (ORIGEN):</span>
                  <span className="font-bold text-white tracking-wide">
                    {potreroSalida ? potreroSalida.nombre : (arreoInfo?.origen || 'Origen')}
                  </span>
                </div>
                
                <span className="text-amber-400 font-black text-base animate-pulse">════▶</span>
                
                <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/40 px-2.5 py-1 rounded-lg">
                  <span className="text-cyan-400 font-extrabold text-[11px]">📥 LLEGADA (DESTINO):</span>
                  <span className="font-bold text-white tracking-wide">
                    {potreroLlegada ? potreroLlegada.nombre : (arreoInfo?.destino || 'Destino')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Layer Controls (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#0E1624]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
          <button
            type="button"
            onClick={handleLocateHato}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            title="Centrar y enfocar en el Hato seleccionado"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-200 animate-bounce" />
            <span>🎯 Ubicar Hato</span>
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
            <span>Convenciones del Mapa</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            {/* Potrero Abierto */}
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-500/20"></span>
              <span className="text-slate-300">Potrero Abierto</span>
            </div>

            {/* Potrero Descanso */}
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-indigo-400 bg-slate-700/30"></span>
              <span className="text-slate-300">Descanso (Cerrado)</span>
            </div>

            {/* Salida Traslado */}
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-amber-400 bg-amber-500/30 animate-pulse"></span>
              <span className="text-amber-300 font-semibold">📤 Salida (Origen)</span>
            </div>

            {/* Llegada Traslado */}
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-cyan-400 bg-cyan-500/30 animate-pulse"></span>
              <span className="text-cyan-300 font-semibold">📥 Llegada (Destino)</span>
            </div>

            {/* Límite Hato */}
            <div className="flex items-center gap-2 col-span-2">
              <span className="w-3.5 h-3.5 rounded border-2 border-dashed border-rose-500 bg-rose-500/10"></span>
              <span className="text-slate-300">🏰 Hato (Límite Maestro)</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Res Normal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Advertencia</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Fuga</span>
          </div>
        </div>

      </div>

      {/* 2. SIDEBAR LIVE TELEMETRY & POTREROS PANEL (Right) */}
      <div className="w-full md:w-96 bg-[#0B121C] border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[50vh] md:h-full z-20">
        
        {/* Panel Header */}
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          
          {/* Main Tab Switcher: RESES vs POTREROS */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSidebarTab('animals')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                sidebarTab === 'animals'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>🐮 Rebaño</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {filteredAnimals.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('potreros')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
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
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={sidebarTab === 'animals' ? 'Buscar por arete, collar, raza...' : 'Buscar potrero por nombre...'}
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
                Todos
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

          {/* Sub-Filters for Potreros Tab */}
          {sidebarTab === 'potreros' && (
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPotreroFilter('all')}
                className={`py-1 rounded-lg text-center transition-all ${
                  potreroFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({totalPotreros})
              </button>
              <button
                type="button"
                onClick={() => setPotreroFilter('abierto')}
                className={`py-1 rounded-lg text-center transition-all ${
                  potreroFilter === 'abierto' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Abiertos ({abiertosCount})
              </button>
              <button
                type="button"
                onClick={() => setPotreroFilter('descanso')}
                className={`py-1 rounded-lg text-center transition-all ${
                  potreroFilter === 'descanso' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💤 Descanso ({descansoCount})
              </button>
              <button
                type="button"
                onClick={() => setPotreroFilter('arreo')}
                className={`py-1 rounded-lg text-center transition-all ${
                  potreroFilter === 'arreo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ Traslado ({arreoCount})
              </button>
            </div>
          )}

        </div>

        {/* Panel Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          
          {/* TAB 1: ANIMALS LIST */}
          {sidebarTab === 'animals' && (
            filteredAnimals.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No se encontraron animales con los filtros actuales.
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
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500/60 shadow-glow-emerald'
                        : isEscape
                        ? 'bg-rose-950/20 border-rose-500/40 hover:bg-rose-950/30'
                        : isWarn
                        ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                        : 'bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          Arete: {animal.arete_visual || 'Sin Arete'}
                        </span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">
                          {animal.categoria || 'Novillo'}
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

                    <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-400" />
                        {animal.bateria_nivel || 100}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Signal className="w-3 h-3 text-cyan-400" />
                        {animal.senial_dbm || -75} dBm
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {animal.fecha_hora ? new Date(animal.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                      </span>
                    </div>

                    {/* Actions footer */}
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Potrero: <strong className="text-slate-200">{animal.potrero_nombre || 'Principal'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnimalForProjection(animal);
                        }}
                        className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" /> Proyección GDP
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
                No se encontraron potreros registrados con los filtros seleccionados.
              </div>
            ) : (
              potrerosList.map((pot) => {
                const isSelected = selectedPotreroId === pot.id;
                const estado = (pot.estado || 'ABIERTO').toUpperCase();
                const isSalida = pot.rol_arreo === 'SALIDA' || (arreoInfo?.activo && pot.nombre === arreoInfo?.origen);
                const isLlegada = pot.rol_arreo === 'LLEGADA' || (arreoInfo?.activo && pot.nombre === arreoInfo?.destino);
                const isArreo = isSalida || isLlegada || !!pot.modo_arreo_activo;
                const isDescanso = estado === 'DESCANSO' || estado === 'CERRADO';
                const isAbierto = estado === 'ABIERTO' && !isArreo;

                return (
                  <div
                    key={pot.id}
                    onClick={() => centerOnPotrero(pot)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-glow-emerald'
                        : isSalida
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isLlegada
                        ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : isArreo
                        ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                        : isDescanso
                        ? 'bg-slate-900/80 border-slate-700/60 hover:bg-slate-800/80'
                        : 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          🌱 {pot.nombre}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isSalida
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 animate-pulse'
                            : isLlegada
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 animate-pulse'
                            : isArreo
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : isDescanso
                            ? 'bg-slate-800 text-slate-300 border border-slate-600'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isSalida ? '📤 SALIDA (ORIGEN)' : (isLlegada ? '📥 LLEGADA (DESTINO)' : (isArreo ? '⚡ EN TRASLADO' : (isDescanso ? '💤 DESCANSO' : '🟢 ABIERTO')))}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 my-2 bg-slate-950/40 p-2 rounded-lg border border-white/5">
                      <div>
                        <span className="text-[10px] block text-slate-500">Ocupación Actual</span>
                        <strong className="text-white text-xs">{pot.total_animales || 0}</strong>
                        <span className="text-[10px] text-slate-400"> / {pot.capacidad_max_cabezas || 50} max</span>
                      </div>
                      <div>
                        <span className="text-[10px] block text-slate-500">Tiempo de Ciclo</span>
                        <strong className="text-white text-xs">
                          {isDescanso ? `${pot.dias_descanso || 0}d descanso` : `${pot.dias_ocupacion || 0}d pastoreo`}
                        </strong>
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-slate-400">
                        Margen Alerta: <strong className="text-slate-300">{pot.margen_advertencia_metros || 10}m</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isTogglingPotrero}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePotreroEstado(pot.id, pot.estado);
                          }}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                            isDescanso
                              ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10'
                          }`}
                          title={isDescanso ? 'Abrir a pastoreo' : 'Poner en descanso de recuperación'}
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          <span>{isDescanso ? 'Abrir a Pastoreo' : 'Poner en Descanso'}</span>
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
