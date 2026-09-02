import React, { useState, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputMask } from 'primereact/inputmask';
import { 
  Plus, 
  Search, 
  Layers, 
  TrendingUp, 
  Radio, 
  Scale, 
  CheckCircle2, 
  Battery, 
  Signal, 
  Loader2,
  Calendar,
  Eye,
  Building2,
  Users,
  MapPin,
  Filter,
  GitFork,
  Dna,
  Heart,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { 
  registrarAnimal, 
  registrarPesaje,
  updateCollarStatus,
  fetchAnimalGenealogia,
  traspasarAnimal,
  darBajaAnimal,
  fetchAnimalHistorialPropietarios
} from '../services/apiService';
import { exportFichaAnimalPDF, exportInventarioGanaderoExcel } from '../services/reportExportService';
import { fireQuickSuccess, fireCelebration } from '../services/confettiHelper';

export default function LivestockTable({ 
  monitoringData = [], 
  collares = [], 
  propietarios = [], 
  geocercas = { hatos: [], potreros: [] }, 
  tenants = [],
  currentUser,
  onRefreshData,
  onOpenProjection 
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('ALL');
  const [selectedHatoFilter, setSelectedHatoFilter] = useState('ALL');
  const [selectedPropietarioFilter, setSelectedPropietarioFilter] = useState('ALL');

  // Dialog Visibility
  const [showAnimalDialog, setShowAnimalDialog] = useState(false);
  const [showWeighingDialog, setShowWeighingDialog] = useState(false);
  const [showTraspasoDialog, setShowTraspasoDialog] = useState(false);
  const [showBajaDialog, setShowBajaDialog] = useState(false);
  const [selectedAnimalDetail, setSelectedAnimalDetail] = useState(null);
  const [genealogyData, setGenealogyData] = useState(null);
  const [loadingGenealogy, setLoadingGenealogy] = useState(false);

  // Form States
  const [animalForm, setAnimalForm] = useState({
    areteVisual: '',
    raza: 'Brahman',
    sexo: 'Macho',
    categoria: 'Novillo',
    fotoUrl: '',
    numeroHierro: '',
    fechaNacimiento: '2023-01-01',
    madreId: '',
    padreId: '',
    collarId: '',
    propietarioId: '',
    tenantId: '1'
  });

  const [animalForTraspaso, setAnimalForTraspaso] = useState(null);
  const [traspasoForm, setTraspasoForm] = useState({
    nuevoPropietarioId: '',
    tipoTraspaso: 'VENTA',
    precioVenta: ''
  });

  const [animalForBaja, setAnimalForBaja] = useState(null);
  const [bajaForm, setBajaForm] = useState({
    motivoBaja: 'VENTA_FRIGORIFICO',
    notasBaja: ''
  });

  const [weighingForm, setWeighingForm] = useState({
    animalId: '',
    peso: '',
    fechaPesaje: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);

  // Candidatos a Madres y Padres (Identidad Biológica)
  const madresCandidatas = useMemo(() => {
    return monitoringData.filter(a => a.sexo === 'Hembra' || ['Vaca', 'Vaquillona'].includes(a.categoria));
  }, [monitoringData]);

  const padresCandidatos = useMemo(() => {
    return monitoringData.filter(a => a.sexo === 'Macho' || ['Toro', 'Novillo'].includes(a.categoria));
  }, [monitoringData]);

  const handleOpenDetail = async (animal) => {
    setSelectedAnimalDetail(animal);
    setLoadingGenealogy(true);
    try {
      const data = await fetchAnimalGenealogia(animal.id);
      setGenealogyData(data);
    } catch (err) {
      console.error('Error al cargar genealogía:', err);
      setGenealogyData(null);
    } finally {
      setLoadingGenealogy(false);
    }
  };

  const handleOpenTraspaso = (animal) => {
    setAnimalForTraspaso(animal);
    setTraspasoForm({
      nuevoPropietarioId: '',
      tipoTraspaso: 'VENTA',
      precioVenta: ''
    });
    setShowTraspasoDialog(true);
  };

  const handleTraspasoSubmit = async (e) => {
    e.preventDefault();
    if (!animalForTraspaso) return;
    setLoading(true);
    try {
      await traspasarAnimal(animalForTraspaso.id, traspasoForm);
      fireCelebration();
      setShowTraspasoDialog(false);
      setAnimalForTraspaso(null);
      await onRefreshData();
    } catch (err) {
      alert('Error en el traspaso: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBaja = (animal) => {
    setAnimalForBaja(animal);
    setBajaForm({
      motivoBaja: 'VENTA_FRIGORIFICO',
      notasBaja: '',
      destinoCollar: 'FINCA_CUSTODIA'
    });
    setShowBajaDialog(true);
  };

  const handleBajaSubmit = async (e) => {
    e.preventDefault();
    if (!animalForBaja) return;
    if (!window.confirm(`¿Confirmas la baja/salida de la res arete "${animalForBaja.arete_visual}"? Si tiene collar IoT vinculado, este será liberado automáticamente.`)) {
      return;
    }
    setLoading(true);
    try {
      await darBajaAnimal(animalForBaja.id, { 
        ...bajaForm, 
        userRole: currentUser?.rol || 'SUPERADMIN',
        usuarioId: currentUser?.id 
      });
      fireQuickSuccess();
      setShowBajaDialog(false);
      setAnimalForBaja(null);
      await onRefreshData();
    } catch (err) {
      alert('Error al procesar baja: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Submit Animal
  const handleAnimalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registrarAnimal(animalForm);
      fireCelebration();
      setShowAnimalDialog(false);
      setAnimalForm({
        areteVisual: '',
        raza: 'Brahman',
        sexo: 'Macho',
        categoria: 'Novillo',
        fotoUrl: '',
        numeroHierro: '',
        fechaNacimiento: '2023-01-01',
        madreId: '',
        padreId: '',
        collarId: '',
        propietarioId: '',
        tenantId: '1'
      });
      await onRefreshData();
    } catch (err) {
      alert('Error al registrar animal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Weighing
  const handleWeighingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registrarPesaje(weighingForm);
      fireQuickSuccess();
      setShowWeighingDialog(false);
      setWeighingForm({ animalId: '', peso: '', fechaPesaje: new Date().toISOString().split('T')[0] });
      await onRefreshData();
    } catch (err) {
      alert('Error al registrar pesaje: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered dataset according to UI multi-tenant & owner controls
  const filteredData = useMemo(() => {
    return monitoringData.filter(item => {
      // Tenant filter
      if (selectedTenantFilter !== 'ALL' && String(item.tenant_id) !== String(selectedTenantFilter)) {
        return false;
      }
      // Hato filter
      if (selectedHatoFilter !== 'ALL' && String(item.hato_id) !== String(selectedHatoFilter)) {
        return false;
      }
      // Propietario filter
      if (selectedPropietarioFilter !== 'ALL' && String(item.propietario_id) !== String(selectedPropietarioFilter)) {
        return false;
      }
      return true;
    });
  }, [monitoringData, selectedTenantFilter, selectedHatoFilter, selectedPropietarioFilter]);

  // Column Templates
  const areteBody = (row) => (
    <div className="flex items-center gap-3 py-1">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20 shrink-0">
        🐂
      </div>
      <div>
        <div className="font-bold text-white text-xs font-mono">{row.arete_visual || 'Sin Arete'}</div>
        <div className="text-[11px] text-slate-400">
          {row.raza || 'Brahman'} · <span className="text-slate-300">{row.categoria || 'Novillo'}</span>
        </div>
      </div>
    </div>
  );

  const propietarioBody = (row) => (
    <div className="text-xs">
      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
        <Users size={12} className="text-blue-400" />
        <span>{row.propietario_nombre || 'Agropecuaria Principal'}</span>
      </div>
    </div>
  );

  const ubicacionBody = (row) => (
    <div className="text-xs space-y-0.5">
      <div className="font-semibold text-slate-200 flex items-center gap-1">
        <MapPin size={12} className="text-emerald-400" />
        <span>{row.hato_nombre || 'Sin Hato'}</span>
      </div>
      <div className="text-[11px] text-slate-400 ml-4">
        {row.potrero_asignado_nombre || row.potrero_nombre || 'Sin Potrero'}
      </div>
      {row.tenant_nombre && (
        <div className="text-[10px] text-purple-300 ml-4 flex items-center gap-1">
          <Building2 size={10} /> {row.tenant_nombre}
        </div>
      )}
    </div>
  );

  const estadoCercaBody = (row) => {
    const estado = row.estado_cerca || 'DENTRO';
    if (estado === 'FUERA') return <Tag value="🚨 FUGA / FUERA" severity="danger" className="text-[10px] font-bold" />;
    if (estado === 'ADVERTENCIA') return <Tag value="⚠️ CERCA LÍMITE" severity="warning" className="text-[10px] font-bold" />;
    return <Tag value="✅ DENTRO" severity="success" className="text-[10px] font-bold" />;
  };

  const collarBody = (row) => (
    <div className="flex flex-col text-xs text-slate-300 gap-0.5">
      <div className="flex items-center gap-1 font-mono text-cyan-300 font-semibold">
        <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>{row.collar_id}</span>
      </div>
      <div className="text-[10px] text-slate-400 flex items-center gap-2">
        <span className="flex items-center gap-0.5 text-emerald-400">
          <Battery size={11} /> {row.nivel_bateria ?? 100}%
        </span>
        <span className="flex items-center gap-0.5 text-cyan-400">
          <Signal size={11} /> {row.senal_celular ?? 4}/5
        </span>
      </div>
    </div>
  );

  const pesoBody = (row) => (
    <div className="text-right">
      <div className="font-bold text-white text-xs font-mono">
        {parseFloat(row.peso_actual || 350).toFixed(1)} kg
      </div>
      <div className="text-[10px] text-emerald-400 font-semibold">
        +0.85 kg/día
      </div>
    </div>
  );

  const actionsBody = (row) => (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onOpenProjection(row)}
        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
        title="Ver proyección financiera y rentabilidad GDP"
      >
        <TrendingUp className="w-3 h-3" /> GDP
      </button>

      <button
        type="button"
        onClick={() => handleOpenDetail(row)}
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all border border-slate-700"
        title="Ver ficha zootécnica y genealogía completa"
      >
        <Eye className="w-3.5 h-3.5 text-emerald-400" />
      </button>

      <button
        type="button"
        onClick={() => handleOpenTraspaso(row)}
        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs transition-all"
        title="Traspasar animal a otro dueño / inversionista"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleOpenBaja(row)}
        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all"
        title="Dar de baja / Salida del hato (Venta matadero, muerte, traslado)"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* 1. Header & Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Inventario Ganadero y Trazabilidad
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Control zootécnico de reses, genealogía, traspasos, bajas y pesajes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportInventarioGanaderoExcel(filteredData, 'Inventario_Bovino')}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm"
            title="Descargar libro de inventario en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setShowAnimalDialog(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Registrar Res
          </button>
          <button
            type="button"
            onClick={() => setShowWeighingDialog(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Scale className="w-4 h-4 text-amber-400" /> Registrar Pesaje
          </button>
        </div>
      </div>

      {/* 2. Filter Bar (Multi-Tenant & Multi-Owner) */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar por arete, raza o collar..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Tenant Selector (if SuperAdmin) */}
          {currentUser?.rol === 'SUPERADMIN' && tenants.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <Building2 size={13} className="text-purple-400" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none text-xs"
              >
                <option value="ALL" className="bg-slate-900 text-white">🏢 Todos los Adquirentes</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Hato Filter */}
          <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <MapPin size={13} className="text-emerald-400" />
            <select
              value={selectedHatoFilter}
              onChange={(e) => setSelectedHatoFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-white">📍 Todos los Hatos</option>
              {geocercas?.hatos?.map(h => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-white">{h.nombre}</option>
              ))}
            </select>
          </div>

          {/* Propietario Filter */}
          <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <Users size={13} className="text-blue-400" />
            <select
              value={selectedPropietarioFilter}
              onChange={(e) => setSelectedPropietarioFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-white">👤 Todos los Propietarios</option>
              {propietarios.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="text-slate-400 font-medium pl-2">
            Mostrando <b className="text-white">{filteredData.length}</b> animales
          </div>

        </div>

      </div>

      {/* 3. DataTable Section */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5">
        <DataTable
          value={filteredData}
          globalFilter={globalFilter}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          emptyMessage="No se encontraron animales con los filtros seleccionados"
          className="p-datatable-sm"
          responsiveLayout="scroll"
        >
          <Column header="Arete / Raza" body={areteBody} sortable sortField="arete_visual" style={{ minWidth: '180px' }} />
          <Column header="Propietario (Dueño)" body={propietarioBody} sortable sortField="propietario_nombre" style={{ minWidth: '180px' }} />
          <Column header="Ubicación (Hato/Potrero)" body={ubicacionBody} style={{ minWidth: '190px' }} />
          <Column header="Collar IoT" body={collarBody} style={{ minWidth: '150px' }} />
          <Column header="Peso Actual" body={pesoBody} sortable sortField="peso_actual" style={{ width: '130px', textAlign: 'right' }} />
          <Column header="Geocerca" body={estadoCercaBody} sortable sortField="estado_cerca" style={{ width: '130px' }} />
          <Column header="Acciones" body={actionsBody} style={{ width: '130px', textAlign: 'right' }} />
        </DataTable>
      </div>

      {/* 4. Modal: Registrar Res */}
      <Dialog
        visible={showAnimalDialog}
        onHide={() => setShowAnimalDialog(false)}
        header={<div className="font-bold text-white text-base">🐂 Registrar Nueva Res en Inventario</div>}
        className="w-full max-w-xl"
      >
        <form onSubmit={handleAnimalSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Arete Visual *</label>
              <input
                type="text"
                required
                value={animalForm.areteVisual}
                onChange={(e) => setAnimalForm({ ...animalForm, areteVisual: e.target.value })}
                placeholder="ej: BR-405, TORO-01"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Raza</label>
              <input
                type="text"
                value={animalForm.raza}
                onChange={(e) => setAnimalForm({ ...animalForm, raza: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría</label>
              <select
                value={animalForm.categoria}
                onChange={(e) => setAnimalForm({ ...animalForm, categoria: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Toro">Toro</option>
                <option value="Vaca">Vaca</option>
                <option value="Novillo">Novillo</option>
                <option value="Ternero">Ternero</option>
                <option value="Vaquillona">Vaquillona</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Sexo</label>
              <select
                value={animalForm.sexo}
                onChange={(e) => setAnimalForm({ ...animalForm, sexo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>

            {/* Propietario / Dueño */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Propietario / Dueño *</label>
              <select
                value={animalForm.propietarioId}
                onChange={(e) => setAnimalForm({ ...animalForm, propietarioId: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona el dueño...</option>
                {propietarios.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.documento_identidad})</option>
                ))}
              </select>
            </div>

            {/* Número de Hierro */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">N° de Hierro / Marca</label>
              <input
                type="text"
                value={animalForm.numeroHierro}
                onChange={(e) => setAnimalForm({ ...animalForm, numeroHierro: e.target.value })}
                placeholder="ej: H-89, PALMAR-04"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha de Nacimiento *</label>
              <input
                type="date"
                required
                value={animalForm.fechaNacimiento}
                onChange={(e) => setAnimalForm({ ...animalForm, fechaNacimiento: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Genealogía: Madre Biológica */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Heart size={12} className="text-pink-400" />
                <span>Madre Biológica (Vientre)</span>
              </label>
              <select
                value={animalForm.madreId}
                onChange={(e) => setAnimalForm({ ...animalForm, madreId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
              >
                <option value="">Desconocida / Sin registro</option>
                {madresCandidatas.map(m => (
                  <option key={m.id} value={m.id}>
                    🏷️ {m.arete_visual} ({m.raza} - {m.categoria})
                  </option>
                ))}
              </select>
            </div>

            {/* Genealogía: Padre Biológico */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Dna size={12} className="text-blue-400" />
                <span>Padre Biológico (Reproductor)</span>
              </label>
              <select
                value={animalForm.padreId}
                onChange={(e) => setAnimalForm({ ...animalForm, padreId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="">Desconocido / Sin registro</option>
                {padresCandidatos.map(p => (
                  <option key={p.id} value={p.id}>
                    🐂 {p.arete_visual} ({p.raza} - {p.categoria})
                  </option>
                ))}
              </select>
            </div>

            {/* Collar IoT */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Collar IoT a Vincular <span className="text-slate-500 text-[10px] font-normal">(Hardware rotativo temporal)</span>
              </label>
              <select
                value={animalForm.collarId}
                onChange={(e) => setAnimalForm({ ...animalForm, collarId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="">Sin collar vinculado (Asignar más tarde)</option>
                {collares.map(c => (
                  <option key={c.id} value={c.id}>{c.id} (Estado: {c.estado || 'DISPONIBLE'} · Bat: {c.nivel_bateria}%)</option>
                ))}
              </select>
            </div>

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAnimalDialog(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400"
            >
              {loading ? 'Guardando...' : 'Guardar Res'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 5. Modal: Registrar Pesaje */}
      <Dialog
        visible={showWeighingDialog}
        onHide={() => setShowWeighingDialog(false)}
        header={<div className="font-bold text-white text-base">⚖️ Registrar Pesaje en Corral</div>}
        className="w-full max-w-md"
      >
        <form onSubmit={handleWeighingSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Seleccionar Animal *</label>
            <select
              value={weighingForm.animalId}
              onChange={(e) => setWeighingForm({ ...weighingForm, animalId: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecciona el animal...</option>
              {monitoringData.map(a => (
                <option key={a.id} value={a.id}>Arete: {a.arete_visual} ({a.raza || 'Brahman'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Peso Registrado (Kg) *</label>
            <input
              type="number"
              step="0.1"
              required
              value={weighingForm.peso}
              onChange={(e) => setWeighingForm({ ...weighingForm, peso: e.target.value })}
              placeholder="ej: 385.5"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha de Pesaje</label>
            <input
              type="date"
              value={weighingForm.fechaPesaje}
              onChange={(e) => setWeighingForm({ ...weighingForm, fechaPesaje: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowWeighingDialog(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300"
            >
              {loading ? 'Guardando...' : 'Guardar Pesaje'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 6. Modal: Traspaso de Animal (Cambio de Dueño) */}
      <Dialog
        visible={showTraspasoDialog}
        onHide={() => setShowTraspasoDialog(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <span>Traspaso de Res: {animalForTraspaso?.arete_visual}</span>
          </div>
        }
        className="w-full max-w-md"
      >
        {animalForTraspaso && (
          <form onSubmit={handleTraspasoSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1">
              <div>
                <span className="text-slate-400">Propietario Actual: </span>
                <span className="font-bold text-slate-200">{animalForTraspaso.propietario_nombre || 'Agropecuaria Principal'}</span>
              </div>
              <div>
                <span className="text-slate-400">Raza / Categoría: </span>
                <span className="font-semibold text-emerald-400">{animalForTraspaso.raza} ({animalForTraspaso.categoria})</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nuevo Propietario / Inversionista *</label>
              <select
                required
                value={traspasoForm.nuevoPropietarioId}
                onChange={(e) => setTraspasoForm({ ...traspasoForm, nuevoPropietarioId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona el nuevo dueño...</option>
                {propietarios
                  .filter(p => p.id !== animalForTraspaso.propietario_id)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.documento_identidad})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Operación</label>
                <select
                  value={traspasoForm.tipoTraspaso}
                  onChange={(e) => setTraspasoForm({ ...traspasoForm, tipoTraspaso: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="VENTA">Venta Comercial</option>
                  <option value="TRASPASO_INTERNO">Traspaso Interno</option>
                  <option value="HERENCIA">Herencia / Cesión</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Precio de Transacción ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={traspasoForm.precioVenta}
                  onChange={(e) => setTraspasoForm({ ...traspasoForm, precioVenta: e.target.value })}
                  placeholder="ej: 850.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTraspasoDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-500 hover:bg-blue-400 shadow-md shadow-blue-500/20"
              >
                {loading ? 'Procesando...' : 'Confirmar Traspaso'}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* 7. Modal: Dar de Baja / Salida de Animal del Hato */}
      <Dialog
        visible={showBajaDialog}
        onHide={() => setShowBajaDialog(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <LogOut className="w-5 h-5 text-rose-400" />
            <span>Baja / Salida de Res: {animalForBaja?.arete_visual}</span>
          </div>
        }
        className="w-full max-w-md"
      >
        {animalForBaja && (
          <form onSubmit={handleBajaSubmit} className="space-y-4 text-xs">
            {/* Datos del Collar que se va a Desvincular/Desactivar */}
            {animalForBaja.collar_id ? (
              <div className="p-3.5 bg-slate-900 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                    <Radio className="w-4 h-4" />
                    <span>Hardware a Desvincular: {animalForBaja.collar_id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-bold border border-cyan-500/20">
                    Pasa a Reserva / Almacén
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-white/5 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nivel Batería:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Battery size={12} /> {animalForBaja.nivel_bateria ?? 100}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Señal Celular:</span>
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <Signal size={12} /> {animalForBaja.senal_celular ?? 4}/5
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Línea SIM:</span>
                    <span className="text-slate-200 font-mono font-semibold truncate block">
                      {animalForBaja.numero_sim || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-amber-300/90 flex items-start gap-1.5 pt-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <AlertTriangle size={13} className="shrink-0 text-amber-400 mt-0.5" />
                  <span>El collar quedará <b>libre de inmediato</b> para ser reasignado a otra res o retornado a almacén según corresponda.</span>
                </div>

                {/* Selector de Destino del Collar: SUPERADMIN vs Rol Finca */}
                {currentUser?.rol === 'SUPERADMIN' ? (
                  <div className="pt-1">
                    <label className="text-xs font-semibold text-cyan-300 block mb-1">
                      Destino del Collar Liberado (Control Superadmin) *
                    </label>
                    <select
                      value={bajaForm.destinoCollar}
                      onChange={(e) => setBajaForm({ ...bajaForm, destinoCollar: e.target.value })}
                      className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="FINCA_CUSTODIA">🏢 Mantener en Custodia del Hato / Finca Adquiriente (Reserva Local)</option>
                      <option value="ALMACEN_CENTRAL">🏭 Retornar al Almacén Central CowIA (Recuperar Stock Global)</option>
                      <option value="TALLER_REVISION">🛠️ Enviar a Taller / Revisión Técnica</option>
                    </select>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-white/5">
                    <span className="text-slate-300 font-semibold block mb-0.5">Custodia de Hardware:</span>
                    El collar permanecerá automáticamente bajo custodia de este hato en estado de reserva local.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 text-slate-400 text-xs">
                ℹ️ Esta res no tiene ningún collar IoT vinculado actualmente.
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Motivo de la Salida / Baja *</label>
              <select
                required
                value={bajaForm.motivoBaja}
                onChange={(e) => setBajaForm({ ...bajaForm, motivoBaja: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="VENTA_FRIGORIFICO">Venta a Frigorífico / Matadero</option>
                <option value="VENTA_OTRA_FINCA">Venta a Otra Finca / Hato</option>
                <option value="MUERTE_NATURAL">Muerte Natural / Enfermedad</option>
                <option value="ACCIDENTE">Accidente en Campo / Mordedura</option>
                <option value="CONSUMO_INTERNO">Consumo Interno de la Finca</option>
                <option value="OTRO">Otro Motivo</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Observaciones / Detalles</label>
              <textarea
                rows={3}
                value={bajaForm.notasBaja}
                onChange={(e) => setBajaForm({ ...bajaForm, notasBaja: e.target.value })}
                placeholder="Detalla peso de salida, comprador o informe de necropsia..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBajaDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20"
              >
                {loading ? 'Procesando...' : 'Confirmar Baja'}
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* 8. Modal: Ficha Detalle del Animal y Árbol Genealógico */}
      <Dialog
        visible={!!selectedAnimalDetail}
        onHide={() => setSelectedAnimalDetail(null)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">🐂</span>
            <span>Ficha Biológica & Genealogía: {selectedAnimalDetail?.arete_visual}</span>
          </div>
        }
        className="w-full max-w-2xl"
      >
        {selectedAnimalDetail && (
          <div className="space-y-4 text-xs">
            {/* 1. Datos Generales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900/90 rounded-2xl border border-white/5">
              <div>
                <span className="text-slate-400 block text-[11px]">Arete Visual:</span>
                <span className="font-bold text-white font-mono text-sm">{selectedAnimalDetail.arete_visual}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">N° de Hierro:</span>
                <span className="font-bold text-emerald-400 font-mono">{selectedAnimalDetail.numero_hierro || 'Sin marca'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Raza / Sexo:</span>
                <span className="font-bold text-white">{selectedAnimalDetail.raza || 'Brahman'} ({selectedAnimalDetail.sexo || 'Macho'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Categoría:</span>
                <span className="font-bold text-white">{selectedAnimalDetail.categoria || 'Novillo'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Propietario / Dueño:</span>
                <span className="font-bold text-blue-400 truncate block">{selectedAnimalDetail.propietario_nombre || 'Agropecuaria Principal'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Hato & Potrero:</span>
                <span className="font-bold text-slate-200 truncate block">
                  {selectedAnimalDetail.hato_nombre || 'Sin Hato'} - {selectedAnimalDetail.potrero_asignado_nombre || selectedAnimalDetail.potrero_nombre || 'Sin Potrero'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Collar IoT (Rotativo):</span>
                <span className="font-mono text-cyan-300 font-bold flex items-center gap-1">
                  <Radio size={12} className="text-cyan-400" />
                  {selectedAnimalDetail.collar_id || 'Sin Collar'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Peso Actual:</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedAnimalDetail.peso_actual || 350} kg</span>
              </div>
            </div>

            {/* 2. Árbol Genealógico (Ascendencia Biológica) */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Dna size={14} className="text-emerald-400" />
                  <span>Árbol Genealógico (Linaje Biológico)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ID Res: #{selectedAnimalDetail.id}</span>
              </div>

              {loadingGenealogy ? (
                <div className="py-6 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-1" />
                  <span>Cargando linaje genealógico...</span>
                </div>
              ) : genealogyData ? (
                <div className="space-y-3">
                  {/* Padres */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Padre */}
                    <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                        <Dna size={13} />
                        <span>Padre Biológico (Toro)</span>
                      </div>
                      {genealogyData.padres?.padre ? (
                        <div>
                          <div className="font-mono font-bold text-white text-sm">
                            🏷️ {genealogyData.padres.padre.areteVisual}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Raza: {genealogyData.padres.padre.raza || 'Brahman'}
                          </div>
                          {genealogyData.abuelos?.paternos?.abuelo && (
                            <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-blue-500/10">
                              Abuelo: {genealogyData.abuelos.paternos.abuelo.areteVisual}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Padre no registrado en sistema</span>
                      )}
                    </div>

                    {/* Madre */}
                    <div className="p-3 bg-pink-950/30 border border-pink-500/20 rounded-xl">
                      <div className="flex items-center gap-1.5 text-pink-400 font-bold mb-1">
                        <Heart size={13} />
                        <span>Madre Biológica (Vientre)</span>
                      </div>
                      {genealogyData.padres?.madre ? (
                        <div>
                          <div className="font-mono font-bold text-white text-sm">
                            🏷️ {genealogyData.padres.madre.areteVisual}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Raza: {genealogyData.padres.madre.raza || 'Brahman'}
                          </div>
                          {genealogyData.abuelos?.maternos?.abuela && (
                            <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-pink-500/10">
                              Abuela: {genealogyData.abuelos.maternos.abuela.areteVisual}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Madre no registrada en sistema</span>
                      )}
                    </div>
                  </div>

                  {/* 3. Descendencia / Crías */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                        <GitFork size={13} className="text-emerald-400" />
                        <span>Descendencia / Crías Registradas ({genealogyData.descendencia?.length || 0})</span>
                      </span>
                    </div>

                    {genealogyData.descendencia && genealogyData.descendencia.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                        {genealogyData.descendencia.map(cria => (
                          <div key={cria.id} className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-emerald-400 text-xs">
                                🏷️ {cria.arete_visual}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {cria.raza} · {cria.categoria} ({cria.sexo})
                              </div>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-semibold">
                              {cria.relacion_tipo}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900/40 rounded-xl text-center text-slate-500 italic text-xs">
                        Este animal aún no tiene crías registradas como progenitor en el sistema.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAnimalDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportFichaAnimalPDF(selectedAnimalDetail, genealogyData)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1.5 shadow-sm text-xs transition-all"
                  title="Descargar Ficha Zootécnica Oficial en PDF"
                >
                  <FileText size={14} />
                  <span>📄 Descargar Ficha PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const anim = selectedAnimalDetail;
                    setSelectedAnimalDetail(null);
                    onOpenProjection(anim);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 text-xs"
                >
                  <TrendingUp size={14} />
                  <span>Ver Curva GDP</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
}
