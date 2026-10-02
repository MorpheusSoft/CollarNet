import React from 'react';
import { 
  Radio, 
  LogOut, 
  MapPin, 
  Building2, 
  Layers, 
  ChevronDown,
  Briefcase,
  Menu
} from 'lucide-react';

export default function Header({ 
  user, 
  isConnected, 
  onLogout, 
  tenants = [], 
  selectedTenantId, 
  onSelectTenant, 
  hatos = [], 
  selectedHatoId, 
  onSelectHato,
  onToggleMobileMenu
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

  return (
    <header className="h-16 bg-[#0B121C] border-b border-white/10 px-3 sm:px-6 flex items-center justify-between z-30 sticky top-0 w-full min-w-0">
      
      {/* Left: Branding & Multi-Tenant / Hato Switchers */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        
        {/* Mobile Hamburger Toggle Button (Phones & Tablets < lg) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 lg:hidden transition-colors shrink-0"
          title="Abrir Menú Principal"
        >
          <Menu className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
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
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs font-semibold text-purple-200 shrink min-w-0 max-w-[130px] sm:max-w-none">
            <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select
              value={selectedTenantId || ''}
              onChange={(e) => onSelectTenant && onSelectTenant(e.target.value)}
              aria-label="Seleccionar Adquirente / Empresa"
              className="bg-transparent text-purple-200 focus:outline-none cursor-pointer pr-1 text-xs font-bold truncate w-full"
            >
              <option value="ALL" className="bg-slate-900 text-white font-normal">🌐 Todos</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white font-normal">
                  🏢 {t.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          user?.tenantNombre && (
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-900 border border-purple-500/20 text-xs font-semibold text-purple-300 shrink truncate max-w-[120px] sm:max-w-none">
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">{user.tenantNombre}</span>
            </div>
          )
        )}

        {/* 🏰 Selector de Hato / Finca (Soporta hatos del propietario en diferentes empresas) */}
        {hatos.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-medium text-slate-200 shrink min-w-0 max-w-[120px] sm:max-w-none">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedHatoId || ''}
              onChange={(e) => onSelectHato && onSelectHato(e.target.value)}
              aria-label="Seleccionar Hato / Finca"
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1 text-xs font-semibold truncate w-full"
            >
              <option value="ALL" className="bg-slate-900 text-white font-normal">
                {isPropietario ? '🌾 Todos' : 'Todos Hatos'}
              </option>
              {hatos.map(h => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-white font-normal">
                  📍 {h.nombre || h.hato_nombre}
                </option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* Right: IoT Status, Notifications, User Badge, Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        
        {/* Connection Status Dot */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs shrink-0">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span className="text-[11px] text-slate-300 font-medium hidden md:inline">
            {isConnected ? 'IoT Online' : 'Desconectado'}
          </span>
        </div>

        {/* User Profile Chip */}
        {user && (
          <div className="flex items-center gap-1.5 pl-2 pr-2.5 sm:pr-3 py-1 rounded-full bg-slate-900 border border-white/10 shrink-0">
            <span className="text-sm">{getRoleIcon(user.rol)}</span>
            <div className="hidden sm:flex flex-col text-left">
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
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>

    </header>
  );
}
