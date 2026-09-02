import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Cpu, 
  Package, 
  Layers, 
  Battery, 
  BatteryCharging, 
  BatteryWarning, 
  Signal, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRightLeft, 
  History, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Building2, 
  HelpCircle, 
  FileText, 
  Wrench, 
  Trash2, 
  Eye, 
  X, 
  Sparkles,
  Upload,
  Download,
  Check,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal
} from 'lucide-react';
import { 
  fetchCollaresInventario, 
  fetchCollaresKPIs, 
  fetchCollaresLotes, 
  registrarCollarIndividual, 
  registrarCollaresLote, 
  trasladarCollar, 
  cambiarEstadoCollar, 
  fetchCollarHistorial,
  fetchTenants
} from '../services/apiService';
import { exportInventarioCollaresExcel } from '../services/reportExportService';

export default function CollarsInventoryView({ user }) {
  const isSuperadmin = user?.rol === 'SUPERADMIN';
  const isAdminFinca = user?.rol === 'ADMIN_FINCA';

  // Estados principales
  const [collares, setCollares] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [selectedEstado, setSelectedEstado] = useState('TODOS');
  const [selectedLote, setSelectedLote] = useState('TODOS');
  const [selectedTenant, setSelectedTenant] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [bateriaFilter, setBateriaFilter] = useState('TODOS');

  // Modales
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerMode, setRegisterMode] = useState('secuencial'); // 'individual', 'secuencial', 'csv'
  
  const [showStateModal, setShowStateModal] = useState(false);
  const [selectedCollarForState, setSelectedCollarForState] = useState(null);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedCollarForTransfer, setSelectedCollarForTransfer] = useState(null);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCollarForHistory, setSelectedCollarForHistory] = useState(null);
  const [collarHistory, setCollarHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Formularios
  const [individualForm, setIndividualForm] = useState({
    id: '',
    numeroSim: '',
    imei: '',
    numeroSerie: '',
    versionHardware: 'HW-v2.1',
    versionFirmware: '1.0.0',
    loteId: '',
    tenantId: '',
    ubicacionAlmacen: 'Almacén Central CowIA',
    motivoEstado: 'Alta individual en CowIA'
  });

  const [loteSecuencialForm, setLoteSecuencialForm] = useState({
    codigoLote: `LOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    proveedor: 'CowIA Hardware Labs Inc.',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    cantidadTotal: 200,
    prefijoId: 'COW-2026-',
    rangoInicio: 1,
    rangoFin: 200,
    simPrefijo: '58412',
    imeiPrefijo: '86012345',
    versionHardware: 'HW-v2.1',
    versionFirmwareInicial: '1.0.0',
    tenantId: '',
    ubicacionAlmacen: 'Almacén Central CowIA',
    notas: 'Lote de collares IoT con GPS satelital y batería solar LiPo'
  });

  const [csvText, setCsvText] = useState('');
  const [csvLoteInfo, setCsvLoteInfo] = useState({
    codigoLote: `LOT-CSV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    proveedor: 'Importación Manual CSV',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    versionHardware: 'HW-v2.1',
    versionFirmwareInicial: '1.0.0',
    tenantId: '',
    ubicacionAlmacen: 'Almacén Central CowIA',
    notas: ''
  });

  const [stateForm, setStateForm] = useState({
    nuevoEstado: 'EN_REVISION',
    motivo: ''
  });

  const [transferForm, setTransferForm] = useState({
    tenantId: '',
    ubicacionAlmacen: '',
    motivo: 'Traslado asignado por Administrador CowIA'
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Cargar datos principales
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [invData, kpisData, lotesData, tenantsData] = await Promise.all([
        fetchCollaresInventario({
          estado: selectedEstado,
          loteId: selectedLote,
          tenantId: selectedTenant,
          search: searchTerm,
          bateriaMin: bateriaFilter === 'BAJA' ? null : null,
          bateriaMax: bateriaFilter === 'BAJA' ? 25 : null
        }, user),
        fetchCollaresKPIs(user),
        fetchCollaresLotes(),
        isSuperadmin ? fetchTenants() : Promise.resolve([])
      ]);

      setCollares(invData);
      setKpis(kpisData);
      setLotes(lotesData);
      if (isSuperadmin) setTenants(tenantsData);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEstado, selectedLote, selectedTenant, bateriaFilter]);

  // Manejar búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Registro Individual
  const handleRegisterIndividual = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await registrarCollarIndividual(individualForm, user);
      notify(`Collar ${individualForm.id} registrado exitosamente.`);
      setShowRegisterModal(false);
      setIndividualForm({
        id: '',
        numeroSim: '',
        imei: '',
        numeroSerie: '',
        versionHardware: 'HW-v2.1',
        versionFirmware: '1.0.0',
        loteId: '',
        tenantId: '',
        ubicacionAlmacen: 'Almacén Central CowIA',
        motivoEstado: 'Alta individual en CowIA'
      });
      loadData(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Registro Masivo Secuencial
  const handleRegisterSecuencial = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        modo: 'secuencial',
        ...loteSecuencialForm
      };
      const res = await registrarCollaresLote(payload, user);
      notify(res.message || 'Lote de collares registrado exitosamente.');
      setShowRegisterModal(false);
      loadData(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Registro Masivo CSV
  const handleRegisterCSV = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      notify('Ingresa el texto CSV con los datos de los collares', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const lines = csvText.trim().split('\n');
      const items = lines.map((line, idx) => {
        const parts = line.split(/[,;\t]/).map(p => p.trim());
        return {
          id: parts[0] || `COW-CSV-${idx + 1}`,
          numeroSim: parts[1] || `SIM-${Date.now()}-${idx}`,
          imei: parts[2] || null,
          numeroSerie: parts[3] || null
        };
      });

      const payload = {
        modo: 'lista',
        ...csvLoteInfo,
        items
      };

      const res = await registrarCollaresLote(payload, user);
      notify(res.message || `Lote con ${items.length} collares importado exitosamente.`);
      setShowRegisterModal(false);
      setCsvText('');
      loadData(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cambio de Estado
  const handleCambiarEstado = async (e) => {
    e.preventDefault();
    if (!selectedCollarForState) return;
    setActionLoading(true);
    try {
      await cambiarEstadoCollar(selectedCollarForState.id, stateForm, user);
      notify(`Estado del collar ${selectedCollarForState.id} actualizado a ${stateForm.nuevoEstado}.`);
      setShowStateModal(false);
      loadData(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Traslado de Collar
  const handleTrasladar = async (e) => {
    e.preventDefault();
    if (!selectedCollarForTransfer) return;
    setActionLoading(true);
    try {
      await trasladarCollar(selectedCollarForTransfer.id, transferForm, user);
      notify(`Collar ${selectedCollarForTransfer.id} trasladado exitosamente.`);
      setShowTransferModal(false);
      loadData(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Ver Historial
  const handleOpenHistory = async (collar) => {
    setSelectedCollarForHistory(collar);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await fetchCollarHistorial(collar.id);
      setCollarHistory(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Badge de Estado Helper
  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'EN_ALMACEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Package className="w-3 h-3" /> En Almacén
          </span>
        );
      case 'ACTIVO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Activo (Con Ganado)
          </span>
        );
      case 'DESACTIVADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Clock className="w-3 h-3" /> Desactivado (En Reserva)
          </span>
        );
      case 'EN_REVISION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Wrench className="w-3 h-3" /> En Revisión / Taller
          </span>
        );
      case 'EN_TRANSITO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ArrowRightLeft className="w-3 h-3" /> En Tránsito
          </span>
        );
      case 'DE_BAJA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-3 h-3" /> De Baja
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Notificación Flotante */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 ${
          notification.type === 'error' 
            ? 'bg-rose-950/90 border-rose-500/40 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <p className="text-sm font-medium">{notification.msg}</p>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header del Módulo CowIA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-surface/60 border border-dark-border/80 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex items-start gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center p-3 text-emerald-400 shadow-glow-emerald">
            <Radio className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">
                Inventario de Collares IoT
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CowIA Hardware
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {isSuperadmin 
                ? 'Control global de stock de hardware, recepción masiva de lotes, auditoría de estados y asignación a fincas.'
                : `Dotación de collares IoT asignados a ${user?.tenantNombre || 'tu ganadería'}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportInventarioCollaresExcel(filteredCollares)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-semibold transition-all shadow-sm"
            title="Descargar inventario de collares en Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-dark-elevated hover:bg-slate-800 text-slate-300 border border-dark-border text-sm font-medium transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refrescar</span>
          </button>

          {isSuperadmin && (
            <button
              onClick={() => {
                setRegisterMode('secuencial');
                setShowRegisterModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm shadow-glow-emerald transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Collares</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Stock */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Stock */}
        <div className="bg-dark-surface/60 border border-dark-border/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Flota</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-display text-white">
            {kpis ? kpis.total : '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Collares en sistema</p>
        </div>

        {/* En Almacén / Stock Central */}
        <div className="bg-dark-surface/60 border border-dark-border/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">En Almacén</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-display text-cyan-400">
            {kpis ? kpis.en_almacen : '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Disponibles / Bodega</p>
        </div>

        {/* Activos con Ganado */}
        <div className="bg-dark-surface/60 border border-dark-border/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Activos en Campo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-2xl font-bold font-display text-emerald-400">
            {kpis ? kpis.activos : '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Asignados a reses</p>
        </div>

        {/* Desactivados / En Reserva */}
        <div className="bg-dark-surface/60 border border-dark-border/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">En Reserva</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-display text-slate-300">
            {kpis ? kpis.desactivados : '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">En cliente sin res</p>
        </div>

        {/* En Revisión / Taller */}
        <div className="bg-dark-surface/60 border border-dark-border/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">En Taller</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-400">
            {kpis ? kpis.en_revision : '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Diagnóstico técnico</p>
        </div>

        {/* Batería Baja (<25%) */}
        <div className="bg-dark-surface/60 border border-dark-border/80 rounded-xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Batería Baja</span>
            <BatteryWarning className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-display text-rose-400">
            {kpis ? kpis.bateria_baja : '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Carga &lt; 25%</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-dark-surface/60 border border-dark-border/80 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Buscador */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, IMEI, SIM, Serie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selectores de Filtro */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filtro Estado */}
          <div className="flex items-center gap-1.5 bg-dark-elevated border border-dark-border rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="EN_ALMACEN">📦 En Almacén</option>
              <option value="ACTIVO">🟢 Activo (Con Ganado)</option>
              <option value="DESACTIVADO">⏸️ Desactivado (En Reserva)</option>
              <option value="EN_REVISION">🛠️ En Revisión</option>
              <option value="EN_TRANSITO">🚚 En Tránsito</option>
              <option value="DE_BAJA">🗑️ De Baja</option>
            </select>
          </div>

          {/* Filtro Lote */}
          {lotes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-dark-elevated border border-dark-border rounded-xl px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedLote}
                onChange={(e) => setSelectedLote(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[140px]"
              >
                <option value="TODOS">Todos los Lotes</option>
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>{l.codigo_lote} ({l.proveedor})</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Finca (Superadmin) */}
          {isSuperadmin && tenants.length > 0 && (
            <div className="flex items-center gap-1.5 bg-dark-elevated border border-dark-border rounded-xl px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[160px]"
              >
                <option value="TODOS">Todas las Fincas</option>
                <option value="CENTRAL">🏛️ Almacén Central CowIA</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Batería */}
          <div className="flex items-center gap-1.5 bg-dark-elevated border border-dark-border rounded-xl px-3 py-1.5">
            <Battery className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={bateriaFilter}
              onChange={(e) => setBateriaFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Batería: Cualquiera</option>
              <option value="BAJA">⚠️ Crítica (&lt;25%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Dispositivos */}
      <div className="bg-dark-surface/60 border border-dark-border/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-dark-elevated/80 border-b border-dark-border text-xs uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Dispositivo / ID</th>
                <th className="py-3.5 px-4">Estado Ciclo de Vida</th>
                <th className="py-3.5 px-4">Lote / Origen</th>
                <th className="py-3.5 px-4">Asignación / Finca</th>
                <th className="py-3.5 px-4">Res Asociada</th>
                <th className="py-3.5 px-4">Batería & Señal</th>
                <th className="py-3.5 px-4">Última Conexión</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <p>Cargando inventario de collares CowIA...</p>
                  </td>
                </tr>
              ) : collares.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-300">No se encontraron collares con los filtros seleccionados</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba cambiando el estado, lote o término de búsqueda.</p>
                  </td>
                </tr>
              ) : (
                collares.map((c) => {
                  const batPercent = c.nivel_bateria ?? 100;
                  const sigBars = c.senal_celular ?? 5;
                  return (
                    <tr key={c.id} className="hover:bg-dark-elevated/40 transition-colors">
                      {/* ID / SIM / IMEI */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                            IoT
                          </div>
                          <div>
                            <div className="font-mono font-bold text-white tracking-wide">
                              {c.id}
                            </div>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                              <span>SIM: {c.numero_sim}</span>
                              {c.imei && <span className="text-slate-500">| IMEI: {c.imei}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        {getEstadoBadge(c.estado)}
                        {c.motivo_estado && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[180px] truncate" title={c.motivo_estado}>
                            {c.motivo_estado}
                          </p>
                        )}
                      </td>

                      {/* Lote */}
                      <td className="py-3.5 px-4">
                        {c.lote_codigo ? (
                          <div>
                            <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1 font-mono">
                              <Layers className="w-3 h-3" />
                              {c.lote_codigo}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                              {c.lote_proveedor || 'CowIA Standard'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Sin lote asignado</span>
                        )}
                      </td>

                      {/* Tenant / Finca */}
                      <td className="py-3.5 px-4">
                        {c.tenant_nombre ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-medium truncate max-w-[140px]">{c.tenant_nombre}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                            <Package className="w-3.5 h-3.5 shrink-0" />
                            <span>Almacén Central CowIA</span>
                          </div>
                        )}
                        {c.ubicacion_almacen && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{c.ubicacion_almacen}</p>
                        )}
                      </td>

                      {/* Res Asociada */}
                      <td className="py-3.5 px-4">
                        {c.animal_arete ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5 inline-block">
                            <div className="text-xs font-bold text-emerald-400 font-mono">
                              🏷️ {c.animal_arete}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {c.animal_raza} • {c.animal_categoria}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sin asignar</span>
                        )}
                      </td>

                      {/* Batería & Señal */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 w-28">
                          {/* Batería */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Battery className={`w-3 h-3 ${batPercent < 25 ? 'text-rose-400' : 'text-emerald-400'}`} />
                              Bat:
                            </span>
                            <span className={`font-mono font-bold ${batPercent < 25 ? 'text-rose-400' : 'text-slate-200'}`}>
                              {batPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                batPercent < 25 ? 'bg-rose-500' : batPercent < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${batPercent}%` }}
                            ></div>
                          </div>

                          {/* Señal Celular */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Signal className="w-2.5 h-2.5 text-cyan-400" />
                              Señal:
                            </span>
                            <span className="font-mono">{sigBars}/5</span>
                          </div>
                        </div>
                      </td>

                      {/* Última Conexión */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-300">
                          {c.ultima_conexion 
                            ? new Date(c.ultima_conexion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Sin telemetría'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          FW: v{c.version_firmware || '1.0.0'}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Cambiar Estado */}
                          <button
                            onClick={() => {
                              setSelectedCollarForState(c);
                              setStateForm({ nuevoEstado: c.estado || 'EN_REVISION', motivo: '' });
                              setShowStateModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-dark-elevated hover:bg-slate-700 text-slate-300 hover:text-white border border-dark-border transition-colors"
                            title="Cambiar Estado / Diagnóstico"
                          >
                            <Wrench className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* Botón Trasladar (Superadmin) */}
                          {isSuperadmin && (
                            <button
                              onClick={() => {
                                setSelectedCollarForTransfer(c);
                                setTransferForm({
                                  tenantId: c.tenant_id ? String(c.tenant_id) : 'CENTRAL',
                                  ubicacionAlmacen: c.ubicacion_almacen || '',
                                  motivo: 'Reasignación de hardware'
                                });
                                setShowTransferModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-dark-elevated hover:bg-slate-700 text-slate-300 hover:text-white border border-dark-border transition-colors"
                              title="Trasladar a Finca / Central"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-teal-400" />
                            </button>
                          )}

                          {/* Botón Historial de Auditoría */}
                          <button
                            onClick={() => handleOpenHistory(c)}
                            className="p-1.5 rounded-lg bg-dark-elevated hover:bg-slate-700 text-slate-300 hover:text-white border border-dark-border transition-colors"
                            title="Ver Historial de Auditoría"
                          >
                            <History className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: REGISTRO DE COLLARES (SUPERADMIN) */}
      {/* ======================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-elevated/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Registrar Collares en CowIA</h3>
                  <p className="text-xs text-slate-400">Recepción de hardware, asignación de lotes e ingreso al stock.</p>
                </div>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs de Modalidad */}
            <div className="flex border-b border-dark-border bg-dark-surface">
              <button
                onClick={() => setRegisterMode('secuencial')}
                className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 flex items-center justify-center gap-2 transition-colors ${
                  registerMode === 'secuencial'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Carga Masiva por Lote (200 Collares)</span>
              </button>

              <button
                onClick={() => setRegisterMode('individual')}
                className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 flex items-center justify-center gap-2 transition-colors ${
                  registerMode === 'individual'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Registro Individual (1 a 1)</span>
              </button>

              <button
                onClick={() => setRegisterMode('csv')}
                className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 flex items-center justify-center gap-2 transition-colors ${
                  registerMode === 'csv'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Pegar Lista CSV / Excel</span>
              </button>
            </div>

            {/* Contenido del Formulario según Tab */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* TAB 1: MODO SECUENCIAL (LOTE MASIVO) */}
              {registerMode === 'secuencial' && (
                <form onSubmit={handleRegisterSecuencial} className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p>
                      <strong>Generador Ultrarrápido de Lote:</strong> Inserta cientos de collares correlativos en la base de datos de CowIA en menos de 1 segundo con números SIM e IMEI simulados o de serie.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Código del Lote *</label>
                      <input
                        type="text"
                        required
                        value={loteSecuencialForm.codigoLote}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, codigoLote: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Proveedor / Fabricante *</label>
                      <input
                        type="text"
                        required
                        value={loteSecuencialForm.proveedor}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, proveedor: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Prefijo de ID</label>
                      <input
                        type="text"
                        value={loteSecuencialForm.prefijoId}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, prefijoId: e.target.value })}
                        placeholder="COW-2026-"
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Rango Inicio</label>
                      <input
                        type="number"
                        min="1"
                        value={loteSecuencialForm.rangoInicio}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, rangoInicio: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Rango Fin (Cantidad)</label>
                      <input
                        type="number"
                        min="1"
                        value={loteSecuencialForm.rangoFin}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, rangoFin: parseInt(e.target.value, 10) || 200 })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Versión HW</label>
                      <input
                        type="text"
                        value={loteSecuencialForm.versionHardware}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, versionHardware: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Versión Firmware</label>
                      <input
                        type="text"
                        value={loteSecuencialForm.versionFirmwareInicial}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, versionFirmwareInicial: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Asignar a Finca Destino</label>
                      <select
                        value={loteSecuencialForm.tenantId}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, tenantId: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="">🏛️ Almacén Central CowIA (Sin Asignar)</option>
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Ubicación Física</label>
                      <input
                        type="text"
                        value={loteSecuencialForm.ubicacionAlmacen}
                        onChange={(e) => setLoteSecuencialForm({ ...loteSecuencialForm, ubicacionAlmacen: e.target.value })}
                        placeholder="Bodega Central - Estante A-1"
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
                    <span className="text-slate-500">Vista previa: </span>
                    Generará del <span className="text-emerald-400 font-bold">{loteSecuencialForm.prefijoId}{String(loteSecuencialForm.rangoInicio).padStart(4, '0')}</span> al <span className="text-emerald-400 font-bold">{loteSecuencialForm.prefijoId}{String(loteSecuencialForm.rangoFin).padStart(4, '0')}</span> ({loteSecuencialForm.rangoFin - loteSecuencialForm.rangoInicio + 1} collares).
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-dark-border">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(false)}
                      className="px-4 py-2 rounded-xl bg-dark-elevated text-slate-400 hover:text-white text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-glow-emerald flex items-center gap-2"
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Generar Lote Completo</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: MODO INDIVIDUAL (1 a 1) */}
              {registerMode === 'individual' && (
                <form onSubmit={handleRegisterIndividual} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">ID del Collar *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: COW-0150"
                        value={individualForm.id}
                        onChange={(e) => setIndividualForm({ ...individualForm, id: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Número SIM (Línea M2M) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 04141234567"
                        value={individualForm.numeroSim}
                        onChange={(e) => setIndividualForm({ ...individualForm, numeroSim: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">IMEI Módem (15 dígitos)</label>
                      <input
                        type="text"
                        placeholder="Ej: 860123456789012"
                        value={individualForm.imei}
                        onChange={(e) => setIndividualForm({ ...individualForm, imei: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Número de Serie (SN)</label>
                      <input
                        type="text"
                        placeholder="Ej: SN-COW-2026-0150"
                        value={individualForm.numeroSerie}
                        onChange={(e) => setIndividualForm({ ...individualForm, numeroSerie: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Asignar a Lote Existente</label>
                      <select
                        value={individualForm.loteId}
                        onChange={(e) => setIndividualForm({ ...individualForm, loteId: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="">Sin lote específico</option>
                        {lotes.map(l => (
                          <option key={l.id} value={l.id}>{l.codigo_lote} ({l.proveedor})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Finca / Destino</label>
                      <select
                        value={individualForm.tenantId}
                        onChange={(e) => setIndividualForm({ ...individualForm, tenantId: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="">🏛️ Almacén Central CowIA</option>
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-dark-border">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(false)}
                      className="px-4 py-2 rounded-xl bg-dark-elevated text-slate-400 hover:text-white text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-glow-emerald flex items-center gap-2"
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Registrar Collar</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: MODO CSV */}
              {registerMode === 'csv' && (
                <form onSubmit={handleRegisterCSV} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Código del Lote *</label>
                      <input
                        type="text"
                        required
                        value={csvLoteInfo.codigoLote}
                        onChange={(e) => setCsvLoteInfo({ ...csvLoteInfo, codigoLote: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Proveedor *</label>
                      <input
                        type="text"
                        required
                        value={csvLoteInfo.proveedor}
                        onChange={(e) => setCsvLoteInfo({ ...csvLoteInfo, proveedor: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Pega aquí los datos en formato: <code className="text-emerald-400">ID, SIM, IMEI, SERIE</code> (una fila por collar)
                    </label>
                    <textarea
                      rows={6}
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder={`COW-0001, 04141110001, 860123450000001, SN-2026-001\nCOW-0002, 04141110002, 860123450000002, SN-2026-002\nCOW-0003, 04141110003, 860123450000003, SN-2026-003`}
                      className="w-full p-3 bg-dark-elevated border border-dark-border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 leading-relaxed"
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-dark-border">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(false)}
                      className="px-4 py-2 rounded-xl bg-dark-elevated text-slate-400 hover:text-white text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-glow-emerald flex items-center gap-2"
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Importar Lista</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CAMBIO DE ESTADO Y DIAGNÓSTICO */}
      {/* ======================================================== */}
      {showStateModal && selectedCollarForState && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-elevated/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Cambiar Estado de Dispositivo</h3>
                  <p className="text-xs text-slate-400 font-mono">Collar: {selectedCollarForState.id}</p>
                </div>
              </div>
              <button onClick={() => setShowStateModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCambiarEstado} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Nuevo Estado Operativo *</label>
                <select
                  value={stateForm.nuevoEstado}
                  onChange={(e) => setStateForm({ ...stateForm, nuevoEstado: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {isSuperadmin && <option value="EN_ALMACEN">📦 EN_ALMACEN (Disponible en Bodega Central)</option>}
                  <option value="ACTIVO">🟢 ACTIVO (En Campo con Ganado)</option>
                  <option value="DESACTIVADO">⏸️ DESACTIVADO (En Adquiriente / Reserva)</option>
                  <option value="EN_REVISION">🛠️ EN_REVISION (Diagnóstico / Taller Técnico)</option>
                  {isSuperadmin && <option value="EN_TRANSITO">🚚 EN_TRANSITO (En Logística / Envío)</option>}
                  {isSuperadmin && <option value="DE_BAJA">🗑️ DE_BAJA (Descarte / Pérdida Total)</option>}
                </select>
              </div>

              {selectedCollarForState.animal_arete && ['EN_REVISION', 'DE_BAJA', 'EN_ALMACEN'].includes(stateForm.nuevoEstado) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Aviso de Desvinculación:</strong> Al pasar a {stateForm.nuevoEstado}, el collar se desvinculará automáticamente de la res con arete <strong>{selectedCollarForState.animal_arete}</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Motivo / Diagnóstico Técnico *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Batería degradada, daño en panel solar, revisión preventiva, desasignación..."
                  value={stateForm.motivo}
                  onChange={(e) => setStateForm({ ...stateForm, motivo: e.target.value })}
                  className="w-full p-3 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setShowStateModal(false)}
                  className="px-4 py-2 rounded-xl bg-dark-elevated text-slate-400 hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Aplicar Cambio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: TRASLADO DE COLLAR (SUPERADMIN) */}
      {/* ======================================================== */}
      {showTransferModal && selectedCollarForTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-elevated/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Trasladar / Asignar Hardware</h3>
                  <p className="text-xs text-slate-400 font-mono">Collar: {selectedCollarForTransfer.id}</p>
                </div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTrasladar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Finca / Destino de Asignación *</label>
                <select
                  value={transferForm.tenantId}
                  onChange={(e) => setTransferForm({ ...transferForm, tenantId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="CENTRAL">🏛️ Almacén Central CowIA (Desasignar de Finca)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Ubicación Física Específica</label>
                <input
                  type="text"
                  placeholder="Ej: Finca San Juan - Bodega Principal"
                  value={transferForm.ubicacionAlmacen}
                  onChange={(e) => setTransferForm({ ...transferForm, ubicacionAlmacen: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Motivo del Traslado</label>
                <input
                  type="text"
                  placeholder="Ej: Venta de lote, sustitución técnica, préstamo..."
                  value={transferForm.motivo}
                  onChange={(e) => setTransferForm({ ...transferForm, motivo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-elevated border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-dark-elevated text-slate-400 hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  <span>Confirmar Traslado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: HISTORIAL DE AUDITORÍA Y TRAZABILIDAD */}
      {/* ======================================================== */}
      {showHistoryModal && selectedCollarForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-elevated/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Trazabilidad y Bitácora del Dispositivo</h3>
                  <p className="text-xs text-slate-400 font-mono">Collar ID: {selectedCollarForHistory.id}</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                  <p>Cargando historial de auditoría...</p>
                </div>
              ) : collarHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p>No hay registros de auditoría previos para este collar.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {collarHistory.map((item, idx) => (
                    <div key={item.id || idx} className="relative">
                      {/* Punto de la línea de tiempo */}
                      <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-cyan-500 border-2 border-dark-surface shadow-glow-cyan"></div>
                      
                      <div className="bg-dark-elevated/70 border border-dark-border/80 rounded-xl p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getEstadoBadge(item.estado_nuevo)}
                            {item.estado_anterior && (
                              <span className="text-xs text-slate-500">
                                (Antes: {item.estado_anterior})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(item.fecha_cambio).toLocaleString('es-ES')}
                          </div>
                        </div>

                        {item.motivo && (
                          <p className="text-sm text-slate-200 font-medium mb-2">
                            "{item.motivo}"
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-dark-border/40">
                          {item.tenant_nuevo_nombre && (
                            <div>
                              <span className="text-slate-500">Finca Asignada: </span>
                              <span className="text-slate-300 font-medium">{item.tenant_nuevo_nombre}</span>
                            </div>
                          )}
                          {item.arete_nuevo && (
                            <div>
                              <span className="text-slate-500">Animal: </span>
                              <span className="text-emerald-400 font-mono font-bold">🏷️ {item.arete_nuevo}</span>
                            </div>
                          )}
                          {item.usuario_nombre && (
                            <div>
                              <span className="text-slate-500">Responsable: </span>
                              <span className="text-slate-300">{item.usuario_nombre}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-dark-border bg-dark-elevated/40 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-dark-elevated text-slate-300 hover:text-white text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
