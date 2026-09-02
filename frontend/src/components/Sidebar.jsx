import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  DraftingCompass, 
  Layers, 
  Scale, 
  TrendingUp, 
  Users, 
  Smartphone, 
  Home, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Building2,
  Radio,
  Syringe,
  Heart,
  HeartPulse,
  Bell
} from 'lucide-react';

export default function Sidebar({ currentTab, onChangeTab, user, onGoToLanding }) {
  const [collapsed, setCollapsed] = useState(false);

  let menuItems = [];

  if (user?.rol === 'PROPIETARIO') {
    menuItems = [
      { id: 'home', label: 'Mi Portafolio / Resumen', icon: LayoutDashboard },
      { id: 'map', label: 'Monitoreo Satelital', icon: Map },
      { id: 'livestock', label: 'Mis Reses e Inventario', icon: Layers },
      { id: 'salud-rumia', label: 'Salud y Actividad', icon: HeartPulse },
      { id: 'sanidad', label: 'Historial Sanitario', icon: Syringe },
      { id: 'reproduccion', label: 'Reproducción y Crías', icon: Heart },
      { id: 'weighing', label: 'Historial de Pesajes', icon: Scale },
      { id: 'analytics', label: 'Proyecciones y Retorno', icon: TrendingUp },
    ];
  } else {
    menuItems = [
      { id: 'home', label: 'Inicio / Resumen', icon: LayoutDashboard },
      { id: 'map', label: 'Monitoreo en Vivo', icon: Map },
      { id: 'geofences', label: 'Diseño Geocercas', icon: DraftingCompass },
      { id: 'livestock', label: 'Ganado e Inventario', icon: Layers },
      { id: 'salud-rumia', label: 'Salud & Rumia (IMU)', icon: HeartPulse },
      { id: 'sanidad', label: 'Plan Sanitario & Vacunas', icon: Syringe },
      { id: 'reproduccion', label: 'Reproducción & Preñez', icon: Heart },
      { id: 'propietarios', label: 'Propietarios / Dueños', icon: Users },
      { id: 'weighing', label: 'Pesaje & Zootecnia', icon: Scale },
      { id: 'analytics', label: 'Proyecciones GDP', icon: TrendingUp },
    ];

    // 🏢 Only show Tenants SaaS administration tab to SuperAdmin
    if (user?.rol === 'SUPERADMIN') {
      menuItems.splice(1, 0, { id: 'tenants', label: 'Adquirentes (SaaS)', icon: Building2 });
    }

    // 📡 Módulo de Inventario de Collares IoT y Alertas (Exclusivo Administradores)
    if (user?.rol === 'SUPERADMIN' || user?.rol === 'ADMIN_FINCA') {
      menuItems.push({ id: 'inventory', label: 'Inventario de Collares', icon: Radio });
      menuItems.push({ id: 'notificaciones', label: 'Centro de Alertas / Bot', icon: Bell });
      menuItems.push({ id: 'users', label: 'Usuarios y Accesos', icon: ShieldCheck });
    }
  }

  return (
    <aside
      className={`bg-[#0B121C] border-r border-white/10 flex flex-col justify-between transition-all duration-300 z-20 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      <div className="p-3">
        
        {/* Collapse toggle button */}
        <div className="flex items-center justify-between px-3 py-2 mb-3">
          {!collapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Menú Principal
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

      </div>

      {/* Bottom Shortcuts */}
      <div className="p-3 border-t border-white/10 space-y-1.5">
        <a
          href="app-campo.html"
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 transition-colors"
          title="App Móvil de Campo (Manga y Pesaje)"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          {!collapsed && <span>App de Campo PWA</span>}
        </a>

        <button
          type="button"
          onClick={onGoToLanding}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Ver Portal / Presentación de Producto"
        >
          <Home className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Portal Comercial</span>}
        </button>
      </div>

    </aside>
  );
}
