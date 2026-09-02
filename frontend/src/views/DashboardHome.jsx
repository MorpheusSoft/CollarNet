import React from 'react';
import { 
  Radio, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight, 
  Layers, 
  Zap, 
  Sparkles,
  Scale,
  Calendar
} from 'lucide-react';

export default function DashboardHome({ 
  user, 
  monitoringData, 
  collares, 
  geocercas, 
  onNavigate 
}) {
  const totalAnimales = monitoringData?.length || 0;
  const collaresActivos = collares?.filter(c => c.activo).length || 0;
  const warningsCount = monitoringData?.filter(m => m.estado_cerca === 'ADVERTENCIA').length || 0;
  const escapesCount = monitoringData?.filter(m => m.estado_cerca === 'FUERA').length || 0;
  const safeCount = monitoringData?.filter(m => m.estado_cerca === 'DENTRO' || !m.estado_cerca).length || 0;
  const totalHatos = geocercas?.hatos?.length || 0;
  const totalPotreros = geocercas?.potreros?.length || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Centro de Control Ganadero CollarNet</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
            ¡Hola, <span className="text-emerald-400">{user?.nombre || 'Administrador'}</span>!
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Resumen en tiempo real del estado de pastoreo, telemetría de collares y alertas perimetrales en <strong>{user?.fincaAsignada || 'Hato Principal San Juan'}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <MapPin className="w-4 h-4" />
            <span>Monitoreo GIS en Vivo</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('geofences')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 flex items-center gap-2 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Gestionar Geocercas</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Animales */}
        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Ganado Registrado</span>
            <div className="font-display font-black text-3xl text-white mt-1">{totalAnimales}</div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> {safeCount} en pastoreo seguro
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Collares IoT */}
        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Collares Solares Activos</span>
            <div className="font-display font-black text-3xl text-cyan-400 mt-1">{collaresActivos}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              de {collares?.length || 0} dispositivos vinculados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Advertencias */}
        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">En Margen de Alerta</span>
            <div className="font-display font-black text-3xl text-amber-400 mt-1">{warningsCount}</div>
            <span className="text-[11px] text-amber-400/80 font-semibold mt-1 block">
              Tono sonoro activo en collar
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Escapes */}
        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Fugas / Fuera de Potrero</span>
            <div className={`font-display font-black text-3xl mt-1 ${escapesCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
              {escapesCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {escapesCount > 0 ? '🚨 Requiere revisión en mapa' : 'Perímetro 100% respetado'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${escapesCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Two Column Layout: Quick Actions & Live Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Quick Modules */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <span>⚡ Accesos Rápidos a Módulos</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 hover:border-emerald-500/40 text-left hover:bg-slate-900 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-emerald-300">Mapa Satelital GIS</h4>
              <p className="text-xs text-slate-400 mt-1">
                Visualiza el ganado sobre mapas satelitales en tiempo real y gestiona capas.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('geofences')}
              className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 hover:border-cyan-500/40 text-left hover:bg-slate-900 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-cyan-300">Diseño de Geocercas</h4>
              <p className="text-xs text-slate-400 mt-1">
                Traza hatos, potreros de rotación, escala en metros y sube planos en PDF.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('livestock')}
              className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 hover:border-amber-500/40 text-left hover:bg-slate-900 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-amber-300">Inventario Ganadero</h4>
              <p className="text-xs text-slate-400 mt-1">
                Fichas de reses, aretes, razas, genealogía y altas de nuevos collares.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 hover:border-teal-500/40 text-left hover:bg-slate-900 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-300 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-teal-300">Proyecciones GDP & Venta</h4>
              <p className="text-xs text-slate-400 mt-1">
                Cálculo de rentabilidad por animal, peso proyectado y recomendación óptima.
              </p>
            </button>

          </div>
        </div>

        {/* Right 5 Columns: Potreros & Infrastructure Status */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <span>🌿 Estado de la Finca</span>
          </h3>

          <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Hatos Delimitados</span>
                <div className="font-display font-bold text-lg text-white">{totalHatos} perímetros</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Principal Activo
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Potreros de Rotación</span>
                <div className="font-display font-bold text-lg text-white">{totalPotreros} subdivisiones</div>
              </div>
              <span className="text-xs text-slate-400">
                Margen: 10m advertencia
              </span>
            </div>

            <div className="pt-1">
              <span className="text-xs text-slate-400 block mb-2">Resumen de Telemetría:</span>
              <div className="flex items-center justify-between text-xs bg-slate-900/80 p-3 rounded-xl border border-white/5">
                <span className="text-slate-300">Frecuencia de muestreo</span>
                <span className="font-semibold text-emerald-400">Cada 10 seg (GPS activo)</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
