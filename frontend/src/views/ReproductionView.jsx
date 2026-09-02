import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { 
  Heart, 
  Dna, 
  Baby, 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles,
  Stethoscope,
  Activity,
  Layers
} from 'lucide-react';
import { 
  fetchServiciosReproductivos, 
  registrarServicioReproductivo, 
  registrarPalpacion, 
  fetchPartos, 
  registrarParto, 
  fetchReproduccionKpis 
} from '../services/apiService';
import { fireQuickSuccess, fireCelebration } from '../services/confettiHelper';

export default function ReproductionView({ monitoringData = [], currentUser, selectedTenantId, onRefreshData }) {
  const [activeTab, setActiveTab] = useState('SERVICIOS'); // 'SERVICIOS' | 'PALPACIONES' | 'PARTOS'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Datos
  const [servicios, setServicios] = useState([]);
  const [partos, setPartos] = useState([]);
  const [kpis, setKpis] = useState({
    total_servicios_historicos: 0,
    total_preñadas_confirmadas: 0,
    pendientes_palpacion: 0,
    vacas_vacias: 0,
    partos_historicos: 0,
    tasa_preñez_porcentaje: 0
  });

  // Filtros
  const [globalFilter, setGlobalFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('ALL');

  // Modales
  const [showServicioModal, setShowServicioModal] = useState(false);
  const [showPalpacionModal, setShowPalpacionModal] = useState(false);
  const [showPartoModal, setShowPartoModal] = useState(false);
  const [selectedServicioParaPalpar, setSelectedServicioParaPalpar] = useState(null);

  // Formularios
  const [servicioForm, setServicioForm] = useState({
    vacaId: '',
    toroId: '',
    tipoServicio: 'MONTA_NATURAL',
    codigoPajuela: '',
    razaToroDonante: 'Brahman Rojo',
    nombreToroDonante: '',
    fechaServicio: new Date().toISOString().split('T')[0],
    inseminadorResponsable: currentUser?.nombre || 'Técnico Inseminador',
    observaciones: ''
  });

  const [palpacionForm, setPalpacionForm] = useState({
    servicioId: '',
    vacaId: '',
    fechaPalpacion: new Date().toISOString().split('T')[0],
    resultado: 'PREÑADA',
    diasGestacionEstimados: 60,
    veterinarioPalpador: currentUser?.nombre || 'Dr. Médico Veterinario',
    metodoDiagnostico: 'PALPACION_RECTAL',
    observaciones: ''
  });

  const [partoForm, setPartoForm] = useState({
    servicioId: '',
    vacaId: '',
    fechaParto: new Date().toISOString().split('T')[0],
    tipoParto: 'NORMAL',
    condicionCria: 'VIVA',
    veterinarioAsistente: currentUser?.nombre || 'Dr. Médico Veterinario',
    observaciones: '',
    crearCria: true,
    areteCria: '',
    sexoCria: 'Hembra',
    razaCria: 'Brahman',
    pesoNacimiento: '32.5'
  });

  // Candidatas Hembras (Vacas) y Machos (Toros)
  const hembras = useMemo(() => {
    return monitoringData.filter(a => a.sexo === 'Hembra' || ['Vaca', 'Vaquillona'].includes(a.categoria));
  }, [monitoringData]);

  const toros = useMemo(() => {
    return monitoringData.filter(a => a.sexo === 'Macho' || ['Toro', 'Novillo'].includes(a.categoria));
  }, [monitoringData]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [srvs, prts, kpiData] = await Promise.all([
        fetchServiciosReproductivos({ tenantId: selectedTenantId }),
        fetchPartos({ tenantId: selectedTenantId }),
        fetchReproduccionKpis(selectedTenantId)
      ]);
      setServicios(srvs || []);
      setPartos(prts || []);
      if (kpiData) setKpis(kpiData);
    } catch (err) {
      console.error('Error al cargar datos reproductivos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedTenantId]);

  // Manejo de Registro de Servicio
  const handleServicioSubmit = async (e) => {
    e.preventDefault();
    if (!servicioForm.vacaId) {
      alert('Debes seleccionar la vaca hembra a servir.');
      return;
    }
    if (servicioForm.tipoServicio === 'MONTA_NATURAL' && !servicioForm.toroId) {
      alert('Debes seleccionar el toro reproductor para la monta natural.');
      return;
    }

    setSubmitting(true);
    try {
      await registrarServicioReproductivo({
        ...servicioForm,
        tenantId: selectedTenantId,
        usuarioId: currentUser?.id
      });
      fireCelebration();
      setShowServicioModal(false);
      setServicioForm({
        vacaId: '',
        toroId: '',
        tipoServicio: 'MONTA_NATURAL',
        codigoPajuela: '',
        razaToroDonante: 'Brahman Rojo',
        nombreToroDonante: '',
        fechaServicio: new Date().toISOString().split('T')[0],
        inseminadorResponsable: currentUser?.nombre || 'Técnico Inseminador',
        observaciones: ''
      });
      await loadAllData();
    } catch (err) {
      alert('Error al registrar servicio: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir modal de palpación desde una fila de servicio
  const handleOpenPalpar = (servicio) => {
    setSelectedServicioParaPalpar(servicio);
    setPalpacionForm({
      servicioId: servicio.id,
      vacaId: servicio.vaca_id,
      fechaPalpacion: new Date().toISOString().split('T')[0],
      resultado: 'PREÑADA',
      diasGestacionEstimados: Math.max(30, servicio.dias_desde_servicio || 60),
      veterinarioPalpador: currentUser?.nombre || 'Dr. Médico Veterinario',
      metodoDiagnostico: 'PALPACION_RECTAL',
      observaciones: ''
    });
    setShowPalpacionModal(true);
  };

  // Manejo de Registro de Palpación
  const handlePalpacionSubmit = async (e) => {
    e.preventDefault();
    if (!palpacionForm.vacaId) {
      alert('Debes seleccionar la vaca a diagnosticar.');
      return;
    }

    setSubmitting(true);
    try {
      await registrarPalpacion({
        ...palpacionForm,
        tenantId: selectedTenantId
      });
      fireQuickSuccess();
      setShowPalpacionModal(false);
      setSelectedServicioParaPalpar(null);
      await loadAllData();
    } catch (err) {
      alert('Error al guardar diagnóstico: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir modal de parto desde un servicio confirmado
  const handleOpenRegistrarParto = (servicio) => {
    setPartoForm({
      servicioId: servicio.id,
      vacaId: servicio.vaca_id,
      fechaParto: new Date().toISOString().split('T')[0],
      tipoParto: 'NORMAL',
      condicionCria: 'VIVA',
      veterinarioAsistente: currentUser?.nombre || 'Dr. Médico Veterinario',
      observaciones: '',
      crearCria: true,
      areteCria: `CRIA-${servicio.arete_vaca?.replace(/[^0-9]/g, '') || '01'}`,
      sexoCria: 'Hembra',
      razaCria: servicio.raza_vaca || 'Brahman',
      pesoNacimiento: '34.0'
    });
    setShowPartoModal(true);
  };

  // Manejo de Registro de Parto
  const handlePartoSubmit = async (e) => {
    e.preventDefault();
    if (!partoForm.vacaId) {
      alert('Debes indicar la vaca madre.');
      return;
    }

    setSubmitting(true);
    try {
      await registrarParto({
        ...partoForm,
        tenantId: selectedTenantId
      });
      fireCelebration();
      setShowPartoModal(false);
      await loadAllData();
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      alert('Error al registrar parto: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtros de Servicios
  const filteredServicios = useMemo(() => {
    return servicios.filter(s => {
      if (estadoFilter !== 'ALL' && s.estado !== estadoFilter) return false;
      if (globalFilter) {
        const q = globalFilter.toLowerCase();
        const matchVaca = s.arete_vaca?.toLowerCase().includes(q);
        const matchToro = s.arete_toro?.toLowerCase().includes(q) || s.nombre_toro_donante?.toLowerCase().includes(q);
        const matchIns = s.inseminador_responsable?.toLowerCase().includes(q);
        if (!matchVaca && !matchToro && !matchIns) return false;
      }
      return true;
    });
  }, [servicios, estadoFilter, globalFilter]);

  // Column Renders
  const estadoServicioBody = (row) => {
    const map = {
      PENDIENTE_PALPACION: { label: '⏳ Pendiente Palpación', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      PREÑADA_CONFIRMADA: { label: '🤰 Preñada Confirmada', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-black' },
      VACIA: { label: '❌ Vacía / No Preñó', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
      PARTO_REGISTRADO: { label: '🍼 Parto Registrado', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-bold' }
    };
    const c = map[row.estado] || { label: row.estado, bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
    return <span className={`px-2.5 py-1 rounded-lg text-[10px] border ${c.bg}`}>{c.label}</span>;
  };

  const fechaPartoBody = (row) => {
    if (row.estado === 'PREÑADA_CONFIRMADA' && row.dias_para_parto !== null) {
      const d = row.dias_para_parto;
      if (d <= 0) {
        return <span className="text-rose-400 font-black text-xs animate-pulse flex items-center gap-1">🚨 ¡PARTO INMINENTE!</span>;
      }
      if (d <= 30) {
        return <span className="text-amber-300 font-bold text-xs flex items-center gap-1"><Clock size={11} /> en {d} días ({row.fecha_estimada_parto})</span>;
      }
      return <span className="text-slate-300 font-mono text-xs">{row.fecha_estimada_parto} ({d}d)</span>;
    }
    return <span className="text-slate-500 text-[10px]">-</span>;
  };

  const accionesServicioBody = (row) => (
    <div className="flex items-center justify-end gap-1.5">
      {row.estado === 'PENDIENTE_PALPACION' && (
        <button
          type="button"
          onClick={() => handleOpenPalpar(row)}
          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
          title="Diagnosticar preñez (Palpación o Ecografía)"
        >
          <Stethoscope className="w-3 h-3" /> Palpar
        </button>
      )}

      {row.estado === 'PREÑADA_CONFIRMADA' && (
        <button
          type="button"
          onClick={() => handleOpenRegistrarParto(row)}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
          title="Registrar parto y dar de alta la cría"
        >
          <Baby className="w-3 h-3" /> Registrar Parto
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400">
            <Heart size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Reproducción, Preñez y Maternidad
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Control de servicios reproductivos (Montas / IA), cálculo automático de gestación (283 días) y registro de nacimientos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowServicioModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-pink-500 hover:bg-pink-400 shadow-md shadow-pink-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Registrar Servicio Reproductivo
          </button>
          <button
            type="button"
            onClick={() => setShowPartoModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Baby className="w-4 h-4 text-emerald-400" /> Registrar Nacimiento
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Dna size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Servicios Totales</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{kpis.total_servicios_historicos}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Vacas Preñadas</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{kpis.total_preñadas_confirmadas}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pendientes Palpación</div>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{kpis.pendientes_palpacion}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tasa de Preñez</div>
            <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">{kpis.tasa_preñez_porcentaje}%</div>
          </div>
        </div>
      </div>

      {/* 3. Pestañas de Navegación */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SERVICIOS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'SERVICIOS'
                ? 'bg-pink-500 text-slate-950 shadow-md shadow-pink-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
            }`}
          >
            <Dna size={14} /> Servicios & Diagnósticos ({servicios.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PARTOS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PARTOS'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
            }`}
          >
            <Baby size={14} /> Maternidad & Partos ({partos.length})
          </button>
        </div>

        {/* Buscador y Filtro */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar por arete de vaca o toro..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 w-60"
            />
          </div>

          {activeTab === 'SERVICIOS' && (
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDIENTE_PALPACION">Pendiente Palpación</option>
              <option value="PREÑADA_CONFIRMADA">Preñada Confirmada</option>
              <option value="VACIA">Vacía</option>
              <option value="PARTO_REGISTRADO">Parto Registrado</option>
            </select>
          )}
        </div>
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'SERVICIOS' ? (
        <div className="glass-panel p-4 rounded-2xl border border-white/5">
          <DataTable
            value={filteredServicios}
            loading={loading}
            paginator
            rows={10}
            className="p-datatable-sm custom-datatable"
            emptyMessage="No se han registrado servicios reproductivos."
          >
            <Column 
              field="fecha_servicio" 
              header="Fecha Servicio" 
              body={(r) => <span className="font-mono text-xs text-slate-300">{r.fecha_servicio ? new Date(r.fecha_servicio).toLocaleDateString() : '-'}</span>}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="arete_vaca" 
              header="Vaca (Hembra)" 
              body={(r) => (
                <div>
                  <span className="font-mono font-bold text-white text-xs">{r.arete_vaca}</span>
                  <span className="block text-[10px] text-pink-400">{r.raza_vaca} ({r.categoria_vaca})</span>
                </div>
              )}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="tipo_servicio" 
              header="Tipo Servicio" 
              body={(r) => (
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {r.tipo_servicio === 'MONTA_NATURAL' ? '🐂 Monta Natural' : '🧪 Inseminación Artificial'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {r.tipo_servicio === 'MONTA_NATURAL' ? `Toro: ${r.arete_toro || 'Hato'}` : `Pajuela: ${r.codigo_pajuela || r.raza_toro_donante || 'IA'}`}
                  </div>
                </div>
              )}
              className="text-xs" 
            />
            <Column 
              field="dias_desde_servicio" 
              header="Días de Servicio" 
              body={(r) => <span className="font-mono text-xs text-slate-300">{r.dias_desde_servicio} días</span>}
              sortable 
              className="text-xs text-center" 
            />
            <Column field="estado" header="Estado Gestación" body={estadoServicioBody} sortable className="text-xs" />
            <Column field="fecha_estimada_parto" header="Fecha Estimada Parto (283d)" body={fechaPartoBody} sortable className="text-xs" />
            <Column body={accionesServicioBody} header="Acciones" className="text-xs text-right" />
          </DataTable>
        </div>
      ) : (
        <div className="glass-panel p-4 rounded-2xl border border-white/5">
          <DataTable
            value={partos}
            loading={loading}
            paginator
            rows={10}
            className="p-datatable-sm custom-datatable"
            emptyMessage="No hay partos registrados en la maternidad."
          >
            <Column 
              field="fecha_parto" 
              header="Fecha Parto" 
              body={(r) => <span className="font-mono text-xs text-slate-300">{r.fecha_parto ? new Date(r.fecha_parto).toLocaleDateString() : '-'}</span>}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="arete_madre" 
              header="Madre" 
              body={(r) => <span className="font-mono font-bold text-pink-400 text-xs">{r.arete_madre} ({r.raza_madre})</span>}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="condicion_cria" 
              header="Condición Cría" 
              body={(r) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.condicion_cria === 'VIVA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {r.condicion_cria === 'VIVA' ? '🍼 Viva' : '❌ Mortinato'}
                </span>
              )}
              className="text-xs" 
            />
            <Column 
              field="arete_cria" 
              header="Cría Registrada" 
              body={(r) => (
                <div>
                  <span className="font-mono font-bold text-white text-xs">{r.arete_cria_registrado || r.arete_cria || 'Sin arete'}</span>
                  <span className="block text-[10px] text-slate-400">{r.sexo_cria} - {r.peso_nacimiento ? `${r.peso_nacimiento} kg` : ''}</span>
                </div>
              )}
              className="text-xs" 
            />
            <Column field="tipo_parto" header="Tipo de Parto" body={(r) => <span className="text-slate-300 text-xs">{r.tipo_parto}</span>} className="text-xs" />
            <Column field="veterinario_asistente" header="Veterinario / Asistente" className="text-slate-400 text-xs" />
          </DataTable>
        </div>
      )}

      {/* 5. Modal: Registrar Servicio Reproductivo */}
      <Dialog
        visible={showServicioModal}
        onHide={() => setShowServicioModal(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Heart className="w-5 h-5 text-pink-400" />
            <span>Registrar Servicio Reproductivo (Monta / IA)</span>
          </div>
        }
        className="w-full max-w-lg"
      >
        <form onSubmit={handleServicioSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Vaca Hembra a Servir *</label>
            <select
              required
              value={servicioForm.vacaId}
              onChange={(e) => setServicioForm({ ...servicioForm, vacaId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
            >
              <option value="">Selecciona la vaca hembra...</option>
              {hembras.map(h => (
                <option key={h.id} value={h.id}>
                  Arete: {h.arete_visual} - {h.raza} ({h.categoria})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Servicio *</label>
              <select
                required
                value={servicioForm.tipoServicio}
                onChange={(e) => setServicioForm({ ...servicioForm, tipoServicio: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                <option value="MONTA_NATURAL">🐂 Monta Natural en Campo</option>
                <option value="INSEMINACION_ARTIFICIAL">🧪 Inseminación Artificial (IA)</option>
                <option value="TRANSFERENCIA_EMBRION">🧬 Transferencia de Embriones</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha del Servicio *</label>
              <input
                type="date"
                required
                value={servicioForm.fechaServicio}
                onChange={(e) => setServicioForm({ ...servicioForm, fechaServicio: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {servicioForm.tipoServicio === 'MONTA_NATURAL' ? (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Toro Reproductor del Hato *</label>
              <select
                required
                value={servicioForm.toroId}
                onChange={(e) => setServicioForm({ ...servicioForm, toroId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                <option value="">Selecciona el toro padrote...</option>
                {toros.map(t => (
                  <option key={t.id} value={t.id}>
                    Arete: {t.arete_visual} - {t.raza} ({t.categoria})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Código de Pajuela IA</label>
                <input
                  type="text"
                  value={servicioForm.codigoPajuela}
                  onChange={(e) => setServicioForm({ ...servicioForm, codigoPajuela: e.target.value })}
                  placeholder="ej: PAJ-BRH-982"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Raza del Toro Donante</label>
                <input
                  type="text"
                  value={servicioForm.razaToroDonante}
                  onChange={(e) => setServicioForm({ ...servicioForm, razaToroDonante: e.target.value })}
                  placeholder="ej: Angus / Nelore / Brahman"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Técnico Inseminador / Operario</label>
            <input
              type="text"
              value={servicioForm.inseminadorResponsable}
              onChange={(e) => setServicioForm({ ...servicioForm, inseminadorResponsable: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowServicioModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-pink-500 hover:bg-pink-400 shadow-md shadow-pink-500/20"
            >
              {submitting ? 'Guardando...' : 'Guardar Servicio'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 6. Modal: Diagnóstico de Palpación / Ecografía */}
      <Dialog
        visible={showPalpacionModal}
        onHide={() => setShowPalpacionModal(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Stethoscope className="w-5 h-5 text-amber-400" />
            <span>Diagnóstico de Gestación & Palpación</span>
          </div>
        }
        className="w-full max-w-md"
      >
        <form onSubmit={handlePalpacionSubmit} className="space-y-4 text-xs">
          {selectedServicioParaPalpar && (
            <div className="p-3 bg-slate-900 rounded-xl border border-white/5 space-y-1 text-slate-300">
              <div>Vaca: <b className="text-white">{selectedServicioParaPalpar.arete_vaca}</b></div>
              <div>Fecha Servicio: <span className="font-mono text-cyan-300">{selectedServicioParaPalpar.fecha_servicio}</span> ({selectedServicioParaPalpar.dias_desde_servicio} días)</div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Resultado del Diagnóstico *</label>
            <select
              required
              value={palpacionForm.resultado}
              onChange={(e) => setPalpacionForm({ ...palpacionForm, resultado: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="PREÑADA">🤰 PREÑADA (Gestación Confirmada)</option>
              <option value="VACIA">❌ VACÍA (No Preñada)</option>
              <option value="DUDOSA">⚠️ DUDOSA (Requiere repetir en 15 días)</option>
            </select>
          </div>

          {palpacionForm.resultado === 'PREÑADA' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Días de Gestación Estimados</label>
              <input
                type="number"
                min="1"
                max="280"
                value={palpacionForm.diasGestacionEstimados}
                onChange={(e) => setPalpacionForm({ ...palpacionForm, diasGestacionEstimados: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                El sistema calculará automáticamente la fecha esperada de parto sumando el periodo de 283 días.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha Palpación *</label>
              <input
                type="date"
                required
                value={palpacionForm.fechaPalpacion}
                onChange={(e) => setPalpacionForm({ ...palpacionForm, fechaPalpacion: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Método</label>
              <select
                value={palpacionForm.metodoDiagnostico}
                onChange={(e) => setPalpacionForm({ ...palpacionForm, metodoDiagnostico: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="PALPACION_RECTAL">Palpación Rectal</option>
                <option value="ECOGRAFIA">Ecografía Veterinaria</option>
                <option value="OBSERVACION_CELO">Observación No Retorno a Celo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Veterinario Palpador</label>
            <input
              type="text"
              value={palpacionForm.veterinarioPalpador}
              onChange={(e) => setPalpacionForm({ ...palpacionForm, veterinarioPalpador: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPalpacionModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/20"
            >
              {submitting ? 'Guardando...' : 'Confirmar Diagnóstico'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 7. Modal: Registrar Parto y Nacimiento */}
      <Dialog
        visible={showPartoModal}
        onHide={() => setShowPartoModal(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Baby className="w-5 h-5 text-emerald-400" />
            <span>Maternidad: Registrar Parto & Nacimiento</span>
          </div>
        }
        className="w-full max-w-lg"
      >
        <form onSubmit={handlePartoSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Vaca Madre *</label>
            <select
              required
              value={partoForm.vacaId}
              onChange={(e) => setPartoForm({ ...partoForm, vacaId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecciona la madre...</option>
              {hembras.map(h => (
                <option key={h.id} value={h.id}>
                  Arete: {h.arete_visual} - {h.raza}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha del Parto *</label>
              <input
                type="date"
                required
                value={partoForm.fechaParto}
                onChange={(e) => setPartoForm({ ...partoForm, fechaParto: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Condición de la Cría *</label>
              <select
                value={partoForm.condicionCria}
                onChange={(e) => setPartoForm({ ...partoForm, condicionCria: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="VIVA">🍼 Nacido Vivo y Sano</option>
                <option value="MELLIZOS_VIVOS">🍼🍼 Mellizos Vivos</option>
                <option value="MUERTA">❌ Mortinato / Fallecido</option>
              </select>
            </div>
          </div>

          {/* Alta automática de la cría en el inventario ganadero */}
          {partoForm.condicionCria !== 'MUERTA' && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Sparkles size={14} />
                <span>Alta Automática de la Cría en Inventario Biológico</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Arete Cría *</label>
                  <input
                    type="text"
                    required
                    value={partoForm.areteCria}
                    onChange={(e) => setPartoForm({ ...partoForm, areteCria: e.target.value.toUpperCase() })}
                    placeholder="ej: TER-001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Sexo</label>
                  <select
                    value={partoForm.sexoCria}
                    onChange={(e) => setPartoForm({ ...partoForm, sexoCria: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Hembra">Hembra</option>
                    <option value="Macho">Macho</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Peso Nac. (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={partoForm.pesoNacimiento}
                    onChange={(e) => setPartoForm({ ...partoForm, pesoNacimiento: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="text-[10px] text-emerald-300/80">
                La cría quedará registrada con categoría <b>Ternero</b> y vinculada a su madre y padre para el pedigrí genealógico.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowPartoModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
            >
              {submitting ? 'Guardando...' : 'Confirmar Parto'}
            </button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
