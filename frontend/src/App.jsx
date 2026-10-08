import React, { useEffect, useState, useRef } from 'react';
import LandingPage from './views/LandingPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardHome from './views/DashboardHome';
import MapMonitoring from './views/MapMonitoring';
import GeofenceDesign from './views/GeofenceDesign';
import LivestockTable from './views/LivestockTable';
import PropietariosView from './views/PropietariosView';
import WeighingView from './views/WeighingView';
import AnalyticsView from './views/AnalyticsView';
import UsersAdmin from './views/UsersAdmin';
import TenantsAdmin from './views/TenantsAdmin';
import CollarsInventoryView from './views/CollarsInventoryView';
import VeterinaryHealthView from './views/VeterinaryHealthView';
import ReproductionView from './views/ReproductionView';
import NotificationsConfigView from './views/NotificationsConfigView';
import HealthRuminationView from './views/HealthRuminationView';
import ApkDownloadModal from './components/ApkDownloadModal';
import ErrorBoundary from './components/ErrorBoundary';
import CollarCameraViewer from './components/CollarCameraViewer';
import { GripVertical, GripHorizontal } from 'lucide-react';

import { 
  fetchMonitoreo, 
  fetchCollares, 
  fetchPropietarios, 
  fetchGeocercasData,
  fetchTenants,
  apiFetchPropietarioHatos
} from './services/apiService';
import { initSocket } from './services/socketService';
import soundService from './services/soundService';

export default function App() {
  // Session State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('collarnet_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        localStorage.removeItem('collarnet_user');
      }
    }
    return null;
  });

  // Navigation State: 'landing' or 'dashboard'
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('collarnet_user') ? 'dashboard' : 'landing';
  });

  // Dashboard Tab State
  const [currentTab, setCurrentTab] = useState('home');
  const currentTabRef = useRef(currentTab);
  const isEditingGeofenceRef = useRef(false);

  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  // Business Data States
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('ALL');
  const [selectedHatoId, setSelectedHatoId] = useState('ALL');

  const [monitoringData, setMonitoringData] = useState([]);
  const [collares, setCollares] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [geocercas, setGeocercas] = useState({ hatos: [], potreros: [] });
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [selectedAnimalForProjection, setSelectedAnimalForProjection] = useState(null);
  const [activeCameraAnimal, setActiveCameraAnimal] = useState(null);
  const [cameraMode, setCameraMode] = useState('split'); // 'split' | 'floating' | 'fullscreen'
  const [showApkModal, setShowApkModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estado reactivo del servicio de alarma acústica web
  const [soundStatus, setSoundStatus] = useState(() => soundService.getState());

  useEffect(() => {
    return soundService.subscribe(setSoundStatus);
  }, []);

  // Split-Screen Camera Panel Splitter Resizer (Desktop W / Mobile H)
  const [cameraSplitWidth, setCameraSplitWidth] = useState(() => {
    if (typeof window === 'undefined') return 440;
    const saved = localStorage.getItem('collarnet_cam_split_w');
    return saved ? Math.min(800, Math.max(300, parseInt(saved, 10))) : 440;
  });

  const [cameraSplitHeight, setCameraSplitHeight] = useState(() => {
    if (typeof window === 'undefined') return 460;
    const saved = localStorage.getItem('collarnet_cam_split_h');
    return saved ? Math.min(650, Math.max(260, parseInt(saved, 10))) : 460;
  });

  const cameraSplitWidthRef = useRef(cameraSplitWidth);
  const cameraSplitHeightRef = useRef(cameraSplitHeight);
  const isResizingCamSplitterRef = useRef(false);
  const camSplitterStartRef = useRef({ x: 0, y: 0, initialW: 440, initialH: 460 });

  useEffect(() => {
    cameraSplitWidthRef.current = cameraSplitWidth;
  }, [cameraSplitWidth]);

  useEffect(() => {
    cameraSplitHeightRef.current = cameraSplitHeight;
  }, [cameraSplitHeight]);

  const startCamSplitterResize = (clientX, clientY, e) => {
    if (e) {
      e.stopPropagation();
      if (e.cancelable && e.type !== 'touchstart') e.preventDefault();
    }
    isResizingCamSplitterRef.current = true;
    camSplitterStartRef.current = {
      x: clientX,
      y: clientY,
      initialW: cameraSplitWidthRef.current,
      initialH: cameraSplitHeightRef.current
    };
  };

  useEffect(() => {
    const handleMove = (clientX, clientY, e) => {
      if (!isResizingCamSplitterRef.current) return;
      if (e && e.cancelable) e.preventDefault();

      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // En móvil: el divisor está arriba de la cámara. Arrastrar hacia arriba agranda la cámara.
        const deltaY = clientY - camSplitterStartRef.current.y;
        const maxH = Math.min(650, Math.round(window.innerHeight * 0.75));
        const newH = Math.max(260, Math.min(maxH, camSplitterStartRef.current.initialH - deltaY));
        setCameraSplitHeight(newH);
        cameraSplitHeightRef.current = newH;
      } else {
        // En desktop: divisor a la izquierda de la cámara. Arrastrar hacia la izquierda ensancha la cámara.
        const deltaX = camSplitterStartRef.current.x - clientX;
        const maxW = Math.min(800, window.innerWidth - 350);
        const newW = Math.max(300, Math.min(maxW, camSplitterStartRef.current.initialW + deltaX));
        setCameraSplitWidth(newW);
        cameraSplitWidthRef.current = newW;
      }
    };

    const onMouseMove = (e) => handleMove(e.clientX, e.clientY, e);
    const onTouchMove = (e) => {
      if (isResizingCamSplitterRef.current && e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    };
    const onEnd = () => {
      if (isResizingCamSplitterRef.current) {
        isResizingCamSplitterRef.current = false;
        localStorage.setItem('collarnet_cam_split_w', String(cameraSplitWidthRef.current));
        localStorage.setItem('collarnet_cam_split_h', String(cameraSplitHeightRef.current));
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // Load Core Data based on User Role, Selected Tenant & Selected Hato
  const loadAllData = async () => {
    try {
      const isSuper = user?.rol === 'SUPERADMIN';
      const isProp = user?.rol === 'PROPIETARIO';

      if (isProp && user?.propietarioId) {
        // PROPIETARIO: Aislado a sus reses (puede filtrar por Hato multi-finca)
        const filterParams = { propietarioId: user.propietarioId };
        if (selectedHatoId && selectedHatoId !== 'ALL') {
          filterParams.hatoId = selectedHatoId;
        }

        const [mon, col, propHatos] = await Promise.all([
          fetchMonitoreo(filterParams).catch(() => []),
          fetchCollares().catch(() => []),
          apiFetchPropietarioHatos(user.propietarioId).catch(() => [])
        ]);

        setMonitoringData(mon || []);
        setCollares(col || []);
        setGeocercas({ hatos: propHatos || [], potreros: [] });
      } else {
        // ADMIN / OPERARIO / SUPERADMIN
        const effectiveTenantId = isSuper 
          ? (selectedTenantId !== 'ALL' ? selectedTenantId : null)
          : (user?.tenantId || null);

        const filterParams = {};
        if (effectiveTenantId) filterParams.tenantId = effectiveTenantId;
        if (selectedHatoId && selectedHatoId !== 'ALL') filterParams.hatoId = selectedHatoId;

        const [ten, mon, col, prop, geo] = await Promise.all([
          isSuper ? fetchTenants().catch(() => []) : Promise.resolve([]),
          fetchMonitoreo(filterParams).catch(() => []),
          fetchCollares(effectiveTenantId).catch(() => []),
          fetchPropietarios().catch(() => []),
          fetchGeocercasData(effectiveTenantId).catch(() => ({ hatos: [], potreros: [] }))
        ]);

        setTenants(ten || []);
        setMonitoringData(mon || []);
        setCollares(col || []);
        setPropietarios(prop || []);
        setGeocercas(geo || { hatos: [], potreros: [] });
      }
    } catch (err) {
      console.error('Error al cargar datos globales:', err);
    }
  };

  // Reload data when user, selectedTenantId or selectedHatoId changes
  useEffect(() => {
    loadAllData();
  }, [user, selectedTenantId, selectedHatoId]);

  // Keep ref to latest loadAllData for socket listeners
  const loadAllDataRef = React.useRef(loadAllData);
  useEffect(() => {
    loadAllDataRef.current = loadAllData;
  });

  // Initialize WebSockets Telemetry Listener
  useEffect(() => {

    // Connect Socket.io for Real-Time Telemetry & Geocercas Sync
    const socket = initSocket(
      () => setIsSocketConnected(true),
      (telemetry) => {
        // 1. Actualizar telemetría en vivo del collar
        setCollares(prev => {
          const idx = prev.findIndex(c => c.id === telemetry.collar_id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              nivel_bateria: telemetry.nivel_bateria ?? telemetry.bateria,
              senal_celular: telemetry.senal_celular ?? telemetry.senal,
              esta_cargando: telemetry.esta_cargando,
              voltaje_mv: telemetry.voltaje_mv,
              latitud: telemetry.lat,
              longitud: telemetry.lon,
              ultima_conexion: telemetry.timestamp
            };
            return updated;
          }
          return prev;
        });

        // 2. Si el collar está asignado a un animal en monitoreo, actualizar su telemetría
        setMonitoringData(prev => {
          const index = prev.findIndex(a => a.collar_id === telemetry.collar_id);
          if (index >= 0) {
            const updated = [...prev];
            const newLat = telemetry.latitud ?? telemetry.lat;
            const newLon = telemetry.longitud ?? telemetry.lon;
            updated[index] = { 
              ...updated[index], 
              ...telemetry,
              latitud: newLat !== undefined && newLat !== null ? newLat : updated[index].latitud,
              longitud: newLon !== undefined && newLon !== null ? newLon : updated[index].longitud
            };
            return updated;
          }
          // Si el collar no está vinculado a una res, NO inyectar una fila fantasma en el inventario ganadero
          return prev;
        });
      },
      (alertData) => {
        console.warn('[Alerta Collar]', alertData);
      },
      () => setIsSocketConnected(false),
      () => {
        console.log('[Socket.io] Recibida notificación de geocercas_actualizadas, recargando datos...');
        if (currentTabRef.current === 'geofences' && isEditingGeofenceRef.current) {
          console.log('[Socket.io] Recarga omitida: usuario editando geocercas.');
          return;
        }
        if (loadAllDataRef.current) loadAllDataRef.current();
      },
      (data) => {
        console.log('[Socket.io] Recibida notificación de datos_actualizados:', data);
        if (data?.tipo === 'pesaje' && (data.areteVisual || data.animalId)) {
          setMonitoringData(prev => prev.map(a => {
            const matchArete = data.areteVisual && (a.arete_visual?.toUpperCase() === String(data.areteVisual).toUpperCase());
            const matchId = data.animalId && (String(a.id) === String(data.animalId) || String(a.animal_id) === String(data.animalId));
            if (matchArete || matchId) {
              return { ...a, peso_actual: parseFloat(data.peso) };
            }
            return a;
          }));
        }
        if (currentTabRef.current === 'geofences' && isEditingGeofenceRef.current) {
          console.log('[Socket.io] Recarga global omitida: usuario editando geocercas.');
          return;
        }
        if (loadAllDataRef.current) loadAllDataRef.current();
      }
    );

    // Polling en segundo plano con protección contra recargas mientras se editan geocercas
    const pollInterval = setInterval(() => {
      if (currentTabRef.current === 'geofences' && isEditingGeofenceRef.current) {
        console.log('[Polling] Pausado temporalmente: usuario editando geocercas.');
        return;
      }
      if (loadAllDataRef.current) {
        loadAllDataRef.current();
      }
    }, 15000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // 🔊 Control de Alarma Sonora Web (Intermitente al cruzar margen de advertencia de 3m del potrero)
  useEffect(() => {
    // Si no hay datos, silenciar la alarma
    if (!monitoringData || monitoringData.length === 0) {
      soundService.stopAlarm();
      return;
    }

    let highestSeverity = null;
    let triggeringAnimal = null;

    for (const animal of monitoringData) {
      // Solo evaluar reses que tengan collar asignado
      if (!animal.collar_id) continue;

      const estado = animal.estado_cerca || 'DENTRO';
      const alerta = animal.alerta || animal.estado_alerta || 'NORMAL';

      const isEscape = estado === 'FUERA' || alerta === 'ESCAPE_HATO';
      const isWarning = estado === 'ADVERTENCIA' || alerta === 'INFRACCION_ROTACION' || alerta === 'ADVERTENCIA' || alerta === 'ESCAPE_POTRERO';

      if (isEscape) {
        highestSeverity = 'FUERA';
        triggeringAnimal = animal;
        break; // Máxima severidad encontrada
      } else if (isWarning && !highestSeverity) {
        highestSeverity = 'ADVERTENCIA';
        triggeringAnimal = animal;
      }
    }

    if (highestSeverity) {
      soundService.startAlarm(highestSeverity, { animal: triggeringAnimal });
    } else {
      soundService.stopAlarm();
    }
  }, [monitoringData, currentView]);

  // Handle Login Success
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('collarnet_user', JSON.stringify(userData));
    if (userData.tenantId) {
      setSelectedTenantId(String(userData.tenantId));
    }
    setCurrentView('dashboard');
    setCurrentTab('home');
  };

  // Handle Logout
  const handleLogout = () => {
    soundService.stopAlarm();
    localStorage.removeItem('collarnet_user');
    setUser(null);
    setCurrentView('landing');
  };

  // Handle Opening Financial Projection from anywhere
  const handleOpenProjection = (animal) => {
    setSelectedAnimalForProjection(animal);
    setCurrentTab('analytics');
  };

  // Handle Opening Live Collar Camera
  const handleOpenCamera = (animal) => {
    setActiveCameraAnimal(animal);
  };

  const handleCloseCamera = () => {
    setActiveCameraAnimal(null);
  };

  // Switch context to specific tenant (from TenantsAdmin)
  const handleEnterTenantContext = (tenant) => {
    setSelectedTenantId(String(tenant.id));
    setCurrentTab('livestock');
  };

  // Render Landing Page
  if (currentView === 'landing') {
    return (
      <LandingPage
        user={user}
        onLoginSuccess={handleLoginSuccess}
        onGoToDashboard={() => setCurrentView('dashboard')}
      />
    );
  }

  // Active Hatos list filtered by selected Tenant or Owner
  const activeHatos = user?.rol === 'PROPIETARIO'
    ? (geocercas?.hatos || [])
    : (selectedTenantId && selectedTenantId !== 'ALL'
        ? geocercas?.hatos?.filter(h => String(h.tenant_id) === String(selectedTenantId))
        : geocercas?.hatos || []);

  // Render Dashboard
  return (
    <div className="min-h-screen bg-[#070D14] text-slate-100 flex flex-col antialiased">
      
      {/* 1. Header Bar with Multi-Tenant & Hato Switchers */}
      <Header
        user={user}
        isConnected={isSocketConnected}
        onLogout={handleLogout}
        tenants={tenants}
        selectedTenantId={selectedTenantId}
        onSelectTenant={setSelectedTenantId}
        hatos={activeHatos}
        selectedHatoId={selectedHatoId}
        onSelectHato={setSelectedHatoId}
        onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
      />

      {/* Mobile Drawer (Slide-over overlay on small screens) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-[#0B121C] border-r border-white/15 shadow-2xl z-10 h-full animate-in slide-in-from-left duration-200">
            <Sidebar
              currentTab={currentTab}
              onChangeTab={(tab) => {
                setCurrentTab(tab);
                setMobileMenuOpen(false);
              }}
              user={user}
              onGoToLanding={() => {
                setCurrentView('landing');
                setMobileMenuOpen(false);
              }}
              onOpenApkDownload={() => {
                setShowApkModal(true);
                setMobileMenuOpen(false);
              }}
              onCloseMobile={() => setMobileMenuOpen(false)}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* 2. Main Body with Sidebar + Tab Content */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        
        {/* Desktop Sidebar (hidden on mobile and tablet portrait) */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar
            currentTab={currentTab}
            onChangeTab={setCurrentTab}
            user={user}
            onGoToLanding={() => setCurrentView('landing')}
            onOpenApkDownload={() => setShowApkModal(true)}
          />
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-w-0">
          <main className="w-full flex-1 md:overflow-y-auto bg-[#070D14] min-w-0">
            <ErrorBoundary key={currentTab} onReset={loadAllData}>
              {/* SuperAdmin Tenants Module */}
            {currentTab === 'tenants' && user?.rol === 'SUPERADMIN' && (
              <TenantsAdmin
                currentUser={user}
                onSelectTenantContext={handleEnterTenantContext}
                onRefreshData={loadAllData}
              />
            )}

            {currentTab === 'home' && (
              <DashboardHome
                user={user}
                monitoringData={monitoringData}
                collares={collares}
                geocercas={geocercas}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'map' && (
              <MapMonitoring
                monitoringData={monitoringData}
                geocercas={geocercas}
                selectedHatoId={selectedHatoId}
                onSelectAnimalForProjection={handleOpenProjection}
                onSelectAnimalForCamera={handleOpenCamera}
              />
            )}

            {currentTab === 'geofences' && (
              <GeofenceDesign
                geocercas={geocercas}
                collares={collares}
                tenants={tenants}
                selectedTenantId={selectedTenantId}
                selectedHatoId={selectedHatoId}
                monitoringData={monitoringData}
                currentUser={user}
                onRefreshData={loadAllData}
                onEditModeChange={(isEditing) => {
                  isEditingGeofenceRef.current = isEditing;
                }}
              />
            )}

            {currentTab === 'livestock' && (
              <LivestockTable
                monitoringData={monitoringData}
                collares={collares}
                propietarios={propietarios}
                geocercas={geocercas}
                tenants={tenants}
                currentUser={user}
                selectedTenantId={selectedTenantId}
                selectedHatoId={selectedHatoId}
                onRefreshData={loadAllData}
                onOpenProjection={handleOpenProjection}
                onSelectAnimalForCamera={handleOpenCamera}
              />
            )}

            {currentTab === 'sanidad' && (
              <VeterinaryHealthView
                monitoringData={monitoringData}
                currentUser={user}
                selectedTenantId={selectedTenantId === 'ALL' ? null : selectedTenantId}
              />
            )}

            {currentTab === 'salud-rumia' && (
              <HealthRuminationView
                selectedTenantId={selectedTenantId === 'ALL' ? null : selectedTenantId}
              />
            )}

            {currentTab === 'notificaciones' && (user?.rol === 'SUPERADMIN' || user?.rol === 'ADMIN_FINCA') && (
              <NotificationsConfigView
                currentUser={user}
                selectedTenantId={selectedTenantId === 'ALL' ? 1 : selectedTenantId}
              />
            )}

            {currentTab === 'reproduccion' && (
              <ReproductionView
                monitoringData={monitoringData}
                currentUser={user}
                selectedTenantId={selectedTenantId === 'ALL' ? null : selectedTenantId}
                onRefreshData={loadAllData}
              />
            )}

            {currentTab === 'propietarios' && (
              <PropietariosView
                onOpenProjection={handleOpenProjection}
                onRefreshData={loadAllData}
              />
            )}

            {currentTab === 'weighing' && (
              <WeighingView
                monitoringData={monitoringData}
                onRefreshData={loadAllData}
                onOpenProjection={handleOpenProjection}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                monitoringData={monitoringData}
                initialSelectedAnimal={selectedAnimalForProjection}
              />
            )}

            {currentTab === 'inventory' && (user?.rol === 'SUPERADMIN' || user?.rol === 'ADMIN_FINCA') && (
              <div className="p-6">
                <CollarsInventoryView user={user} />
              </div>
            )}

            {currentTab === 'users' && (
              <UsersAdmin currentUser={user} tenants={tenants} />
            )}
            </ErrorBoundary>
          </main>

          {/* Split-Screen Collar Camera Panel */}
          {activeCameraAnimal && cameraMode === 'split' && (
            <>
              {/* 1. Versión Desktop: Divisor Vertical (Ajuste Horizontal) */}
              <div
                onMouseDown={(e) => startCamSplitterResize(e.clientX, e.clientY, e)}
                onTouchStart={(e) => {
                  if (e.touches && e.touches[0]) {
                    startCamSplitterResize(e.touches[0].clientX, e.touches[0].clientY, e);
                  }
                }}
                onDoubleClick={() => {
                  setCameraSplitWidth(440);
                  localStorage.setItem('collarnet_cam_split_w', '440');
                  window.dispatchEvent(new Event('resize'));
                }}
                className="hidden md:flex w-2.5 hover:w-3.5 bg-slate-900 border-x border-white/10 hover:border-emerald-500/50 hover:bg-emerald-950/40 cursor-col-resize items-center justify-center select-none z-30 flex-shrink-0 transition-all group"
                style={{ touchAction: 'none' }}
                title="Arrastra para cambiar el ancho de la cámara y del panel principal (Doble clic para reiniciar a 440px)"
              >
                <div className="w-1 h-8 rounded-full bg-slate-600 group-hover:bg-emerald-400 transition-colors flex items-center justify-center">
                  <GripVertical size={10} className="text-slate-950 opacity-0 group-hover:opacity-100" />
                </div>
              </div>

              {/* 2. Versión Móvil: Divisor Horizontal (Ajuste Vertical) */}
              <div
                onMouseDown={(e) => startCamSplitterResize(e.clientX, e.clientY, e)}
                onTouchStart={(e) => {
                  if (e.touches && e.touches[0]) {
                    startCamSplitterResize(e.touches[0].clientX, e.touches[0].clientY, e);
                  }
                }}
                onDoubleClick={() => {
                  setCameraSplitHeight(460);
                  localStorage.setItem('collarnet_cam_split_h', '460');
                  window.dispatchEvent(new Event('resize'));
                }}
                className="flex md:hidden h-7 w-full bg-slate-900 border-y border-white/15 hover:border-emerald-500/50 hover:bg-emerald-950/50 cursor-row-resize items-center justify-between px-4 select-none z-30 flex-shrink-0 transition-all group shadow-md"
                style={{ touchAction: 'none' }}
                title="Arrastra verticalmente para ajustar la altura de la cámara (Doble toque para reiniciar a 460px)"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 group-hover:text-emerald-300 font-bold">
                  <span className="text-emerald-400 font-mono">📹</span>
                  <span>Ajustar altura de la cámara</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-emerald-400">
                  <span className="text-[9px] font-mono opacity-70">Arrastrar</span>
                  <GripHorizontal size={14} />
                </div>
              </div>

              <aside 
                className="w-full border-t md:border-t-0 md:border-l border-emerald-500/20 bg-slate-950/95 flex flex-col shadow-2xl flex-shrink-0"
                style={{
                  width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${cameraSplitWidth}px` : '100%',
                  height: typeof window !== 'undefined' && window.innerWidth < 768 ? `${cameraSplitHeight}px` : undefined,
                  minHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '260px' : undefined
                }}
              >
                <CollarCameraViewer
                  animal={activeCameraAnimal}
                  mode="split"
                  onModeChange={setCameraMode}
                  onClose={handleCloseCamera}
                />
              </aside>
            </>
          )}
        </div>

      </div>

      {/* Floating PiP or Fullscreen Collar Camera Viewer */}
      {activeCameraAnimal && (cameraMode === 'floating' || cameraMode === 'fullscreen') && (
        <CollarCameraViewer
          animal={activeCameraAnimal}
          mode={cameraMode}
          onModeChange={setCameraMode}
          onClose={handleCloseCamera}
        />
      )}

      {/* Modal de Descarga de APKs (según rol del usuario) */}
      <ApkDownloadModal
        visible={showApkModal}
        onHide={() => setShowApkModal(false)}
        user={user}
        initialApp={user?.rol === 'SUPERADMIN' ? 'tecnico' : 'campo'}
      />

      {/* 🚨 Banner Flotante de Alerta Acústica con Desbloqueo y Test de Audio */}
      {soundStatus.isPlaying && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] bg-[#0F172A]/95 backdrop-blur-md border border-amber-500/50 shadow-2xl rounded-2xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <span className="text-lg animate-pulse">📢</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-amber-300 truncate">
                {soundStatus.currentType === 'FUERA' ? '¡ESCAPE DE HATO DETECTADO!' : '¡RES EN MARGEN DE ADVERTENCIA (3m)!'}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {soundStatus.needsUserGesture 
                  ? '⚠️ Haz clic para activar el audio en el navegador'
                  : (soundStatus.isMuted ? 'Alarma silenciada' : 'Zumbador sonando intermitente')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {soundStatus.needsUserGesture ? (
              <button
                type="button"
                onClick={() => soundService.playTestBeep()}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95"
              >
                🔊 Activar Audio
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => soundService.playTestBeep()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all"
                  title="Reproducir pitido de prueba en los altavoces"
                >
                  🔔 Probar
                </button>
                <button
                  type="button"
                  onClick={() => soundService.toggleMute()}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    soundStatus.isMuted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  {soundStatus.isMuted ? '🔊 Desmutear' : '🔇 Silenciar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
