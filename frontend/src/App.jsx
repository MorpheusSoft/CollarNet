import React, { useEffect, useState } from 'react';
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

import { 
  fetchMonitoreo, 
  fetchCollares, 
  fetchPropietarios, 
  fetchGeocercasData,
  fetchTenants,
  apiFetchPropietarioHatos
} from './services/apiService';
import { initSocket } from './services/socketService';

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

  // Initialize WebSockets Telemetry Listener
  useEffect(() => {

    // Connect Socket.io for Real-Time Telemetry
    const socket = initSocket(
      () => setIsSocketConnected(true),
      (telemetry) => {
        setMonitoringData(prev => {
          const index = prev.findIndex(a => a.collar_id === telemetry.collar_id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...telemetry };
            return updated;
          }
          return [...prev, telemetry];
        });
      },
      (alertData) => {
        console.warn('[Alerta Collar]', alertData);
      },
      () => setIsSocketConnected(false)
    );

    return () => {
      // Clean up socket if needed
    };
  }, []);

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
    localStorage.removeItem('collarnet_user');
    setUser(null);
    setCurrentView('landing');
  };

  // Handle Opening Financial Projection from anywhere
  const handleOpenProjection = (animal) => {
    setSelectedAnimalForProjection(animal);
    setCurrentTab('analytics');
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
      />

      {/* 2. Main Body with Sidebar + Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        
        <Sidebar
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          user={user}
          onGoToLanding={() => setCurrentView('landing')}
        />

        <main className="flex-1 overflow-y-auto bg-[#070D14]">
          
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
              onSelectAnimalForProjection={handleOpenProjection}
            />
          )}

          {currentTab === 'geofences' && (
            <GeofenceDesign
              geocercas={geocercas}
              collares={collares}
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              currentUser={user}
              onRefreshData={loadAllData}
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
              onRefreshData={loadAllData}
              onOpenProjection={handleOpenProjection}
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
        </main>

      </div>

    </div>
  );
}
