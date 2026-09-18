import React, { useState } from 'react';
import { 
  Radio, 
  LogOut, 
  MapPin, 
  Building2, 
  Layers, 
  ChevronDown,
  Briefcase,
  Wrench,
  Download
} from 'lucide-react';
import TecnicoDownloadModal from './TecnicoDownloadModal';

export default function Header({ 
  user, 
  isConnected, 
  onLogout, 
  tenants = [], 
  selectedTenantId, 
  onSelectTenant, 
  hatos = [], 
  selectedHatoId, 
  onSelectHato 
}) {
  const getRoleIcon = (rol) => {
    switch (rol) {
      case 'SUPERADMIN': return '👑';
      case 'ADMIN_FINCA': return '🚜';
      case 'VETERINARIO': return '🩺';
      case 'PROPIETARIO': return '💼';
      default: return '🤠';
    }
  };

  const isSuperAdmin = user?.rol === 'SUPERADMIN';
  const isPropietario = user?.rol === 'PROPIETARIO';
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);

  return (
    <header className="h-16 bg-[#0B121C] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0">
      
      {/* Left: Branding & Multi-Tenant / Hato Switchers */}
      <div className="flex items-center gap-3 md:gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <span className="font-display font-black text-lg text-white hidden sm:inline tracking-tight">
            Cow<span className="text-emerald-400">IA</span>
          </span>
        </div>

        <div className="h-5 w-px bg-white/10 hidden sm:block"></div>

        {/* 💼 Badge de Propietario / Inversionista */}
        {isPropietario ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs font-semibold text-amber-200">
            <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Portafolio: {user.propietarioNombre || user.nombre}</span>
          </div>
        ) : isSuperAdmin && tenants.length > 0 ? (
          /* 🏢 Selector de Adquirente (Visible EXCLUSIVAMENTE para SuperAdmin) */
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs font-semibold text-purple-200">
            <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select
              value={selectedTenantId || ''}
              onChange={(e) => onSelectTenant && onSelectTenant(e.target.value)}
              aria-label="Seleccionar Adquirente / Empresa"
              className="bg-transparent text-purple-200 focus:outline-none cursor-pointer pr-1 text-xs font-bold"
            >
              <option value="ALL" className="bg-slate-900 text-white font-normal">🌐 Todos los Adquirentes</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white font-normal">
                  🏢 {t.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          user?.tenantNombre && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-purple-500/20 text-xs font-semibold text-purple-300">
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{user.tenantNombre}</span>
            </div>
          )
        )}

        {/* 🏰 Selector de Hato / Finca (Soporta hatos del propietario en diferentes empresas) */}
        {hatos.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-medium text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedHatoId || ''}
              onChange={(e) => onSelectHato && onSelectHato(e.target.value)}
              aria-label="Seleccionar Hato / Finca"
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1 text-xs font-semibold"
            >
              <option value="ALL" className="bg-slate-900 text-white font-normal">
                {isPropietario ? '🌾 Todos mis Hatos' : 'Todos los Hatos'}
              </option>
              {hatos.map(h => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-white font-normal">
                  📍 {h.nombre || h.hato_nombre} {h.tenant_nombre ? `(${h.tenant_nombre})` : ''} {h.total_animales ? `· ${h.total_animales} reses` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* Right: IoT Status, Notifications, User Badge, Logout */}
      <div className="flex items-center gap-3">
        
        {/* Connection Status Dot */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span className="text-[11px] text-slate-300 font-medium hidden md:inline">
            {isConnected ? 'IoT Broker Online' : 'Desconectado'}
          </span>
        </div>

        {/* 🛠️ Botón Exclusivo para Super Administrador: Descargar App Técnica */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowTecnicoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 to-blue-600/15 hover:from-sky-500/25 hover:to-blue-600/25 border border-sky-400/40 hover:border-sky-400/70 text-sky-300 hover:text-white text-xs font-semibold shadow-sm shadow-sky-500/10 transition-all duration-200 group cursor-pointer"
            title="Descargar o Abrir Aplicación Técnica CowIA Ops (Exclusivo Superadmin)"
          >
            <Wrench className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-45 transition-transform" />
            <span className="hidden sm:inline">Descargar App Técnica</span>
            <span className="sm:hidden">App Técnica</span>
            <Download className="w-3 h-3 text-sky-400 opacity-75 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
          </button>
        )}

        {/* User Profile Chip */}
        {user && (
          <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-900 border border-white/10">
            <span className="text-sm">{getRoleIcon(user.rol)}</span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight">
                {user.nombre.split(' ')[0]}
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold leading-tight">
                {user.rol}
              </span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

      {/* Modal de Descarga de App Técnica (Exclusivo Superadmin) */}
      {isSuperAdmin && (
        <TecnicoDownloadModal 
          visible={showTecnicoModal} 
          onHide={() => setShowTecnicoModal(false)} 
        />
      )}

    </header>
  );
}
