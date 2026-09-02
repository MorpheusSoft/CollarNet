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
  Compass
} from 'lucide-react';

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function MapMonitoring({ 
  monitoringData, 
  geocercas, 
  onSelectAnimalForProjection 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const polygonsGroupRef = useRef(null);

  const [currentLayer, setCurrentLayer] = useState('satellite');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = 9.1000;
    const initialLon = -67.1000;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 15,
      zoomControl: true
    });

    // Default tile layer: Satellite
    const tileLayer = L.tileLayer(ESRI_SATELLITE, {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
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

  // 3. Render Geofences (Hatos and Potreros)
  useEffect(() => {
    if (!mapInstanceRef.current || !polygonsGroupRef.current || !geocercas) return;

    polygonsGroupRef.current.clearLayers();

    // Render Hatos (Límites Generales)
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
            fillOpacity: 0.08,
            dashArray: '5, 5'
          }).bindPopup(`<b>🏰 Hato: ${hato.nombre}</b><br>ID: ${hato.id}`);
          polygonsGroupRef.current.addLayer(poly);
        } catch (e) {
          console.error('Error al dibujar hato:', e);
        }
      });
    }

    // Render Potreros (Subdivisiones de Pastura)
    if (geocercas.potreros) {
      geocercas.potreros.forEach(pot => {
        if (!pot.geojson) return;
        try {
          const geo = typeof pot.geojson === 'string' ? JSON.parse(pot.geojson) : pot.geojson;
          const latlngs = geo.coordinates[0].map(c => [c[1], c[0]]);
          const poly = L.polygon(latlngs, {
            color: '#10b981',
            weight: 2.5,
            fillColor: '#10b981',
            fillOpacity: 0.15
          }).bindPopup(`<b>🌱 Potrero: ${pot.nombre}</b><br>Margen advertencia: ${pot.margen_advertencia_metros || 10}m`);
          polygonsGroupRef.current.addLayer(poly);
        } catch (e) {
          console.error('Error al dibujar potrero:', e);
        }
      });
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
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; padding: 4px;">
            <div style="font-weight: bold; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
              🐂 Arete: ${animal.arete_visual || 'Sin Arete'} (${animal.raza || 'Ganado'})
            </div>
            <div><strong>Collar ID:</strong> ${animal.collar_id}</div>
            <div><strong>Estado:</strong> <span style="font-weight:bold; color:${isEscape ? '#e11d48' : (isWarn ? '#d97706' : '#059669')}">${estado}</span></div>
            <div><strong>Batería:</strong> 🔋 ${animal.bateria_nivel || 100}%</div>
            <div><strong>Potrero:</strong> ${animal.potrero_nombre || 'No asignado'}</div>
            <div><strong>Última señal:</strong> ${animal.fecha_hora ? new Date(animal.fecha_hora).toLocaleTimeString() : 'En vivo'}</div>
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

  // Filter animals for sidebar list
  const filteredAnimals = (monitoringData || []).filter(animal => {
    const matchesSearch = 
      (animal.arete_visual && animal.arete_visual.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (animal.collar_id && animal.collar_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (animal.raza && animal.raza.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'warnings') return animal.estado_cerca === 'ADVERTENCIA';
    if (filterType === 'escapes') return animal.estado_cerca === 'FUERA';
    return true;
  });

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row overflow-hidden">
      
      {/* 1. MAP VIEWPORT (Center/Left) */}
      <div className="relative flex-1 h-[50vh] md:h-full w-full">
        
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Layer Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#0E1624]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
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

      </div>

      {/* 2. SIDEBAR LIVE TELEMETRY PANEL (Right) */}
      <div className="w-full md:w-96 bg-[#0B121C] border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[50vh] md:h-full z-20">
        
        {/* Panel Header & Search */}
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Monitoreo en Tiempo Real
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {filteredAnimals.length} Reses
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por arete, collar o raza..."
              className="w-full bg-[#080D15] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                filterType === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('warnings')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                filterType === 'warnings' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚠️ Alerta
            </button>
            <button
              type="button"
              onClick={() => setFilterType('escapes')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                filterType === 'escapes' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🚨 Fuga
            </button>
          </div>
        </div>

        {/* Animals Live List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredAnimals.length === 0 ? (
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
          )}
        </div>

      </div>

    </div>
  );
}
