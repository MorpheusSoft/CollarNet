import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { 
  Activity, 
  Syringe, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Layers, 
  Pill, 
  Clock, 
  UserCheck, 
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { 
  fetchMedicamentos, 
  registrarMedicamento, 
  fetchEventosSanitarios, 
  aplicarTratamientoSanitario, 
  fetchSanidadKpis 
} from '../services/apiService';
import { fireQuickSuccess, fireCelebration } from '../services/confettiHelper';

export default function VeterinaryHealthView({ monitoringData = [], currentUser, selectedTenantId }) {
  const [activeTab, setActiveTab] = useState('EVENTOS'); // 'EVENTOS' | 'CATALOGO' | 'ALERTAS'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Datos
  const [eventos, setEventos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [kpis, setKpis] = useState({
    total_aplicaciones_historico: 0,
    aplicaciones_ultimos_30_dias: 0,
    revacunaciones_vencidas: 0,
    revacunaciones_proximas_30_dias: 0,
    costo_sanitario_mes_actual: 0,
    costo_sanitario_historico_total: 0
  });

  // Filtros
  const [globalFilter, setGlobalFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('ALL');

  // Modales
  const [showAplicarModal, setShowAplicarModal] = useState(false);
  const [showNuevoMedModal, setShowNuevoMedModal] = useState(false);

  // Formulario de Aplicación
  const [aplicacionForm, setAplicacionForm] = useState({
    modo: 'INDIVIDUAL', // 'INDIVIDUAL' | 'MASIVO'
    animalId: '',
    animalIds: [],
    medicamentoId: '',
    fechaAplicacion: new Date().toISOString().split('T')[0],
    dosisAplicada: '',
    loteMedicamento: '',
    veterinarioResponsable: currentUser?.nombre || 'Dr. Médico Veterinario',
    costoAplicado: '',
    observaciones: ''
  });

  // Formulario de Medicamento
  const [nuevoMedForm, setNuevoMedForm] = useState({
    nombre: '',
    tipo: 'VACUNA',
    dosisRecomendada: '2 ml Subcutánea',
    periodoRevacunacionDias: 180,
    costoUnitarioEstimado: '',
    laboratorio: ''
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [evts, meds, kpiData] = await Promise.all([
        fetchEventosSanitarios({ tenantId: selectedTenantId }),
        fetchMedicamentos(selectedTenantId),
        fetchSanidadKpis(selectedTenantId)
      ]);
      setEventos(evts || []);
      setMedicamentos(meds || []);
      if (kpiData) setKpis(kpiData);
    } catch (err) {
      console.error('Error al cargar datos sanitarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedTenantId]);

  // Manejo de Aplicación de Tratamiento
  const handleAplicarSubmit = async (e) => {
    e.preventDefault();
    if (aplicacionForm.modo === 'INDIVIDUAL' && !aplicacionForm.animalId) {
      alert('Debes seleccionar el animal a tratar.');
      return;
    }
    if (aplicacionForm.modo === 'MASIVO' && aplicacionForm.animalIds.length === 0) {
      alert('Debes seleccionar al menos un animal para la aplicación masiva.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        medicamentoId: aplicacionForm.medicamentoId,
        fechaAplicacion: aplicacionForm.fechaAplicacion,
        dosisAplicada: aplicacionForm.dosisAplicada,
        loteMedicamento: aplicacionForm.loteMedicamento,
        veterinarioResponsable: aplicacionForm.veterinarioResponsable,
        costoAplicado: aplicacionForm.costoAplicado,
        observaciones: aplicacionForm.observaciones,
        tenantId: selectedTenantId,
        usuarioId: currentUser?.id
      };

      if (aplicacionForm.modo === 'INDIVIDUAL') {
        payload.animalId = aplicacionForm.animalId;
      } else {
        payload.animalIds = aplicacionForm.animalIds;
      }

      await aplicarTratamientoSanitario(payload);
      fireCelebration();
      setShowAplicarModal(false);
      setAplicacionForm({
        modo: 'INDIVIDUAL',
        animalId: '',
        animalIds: [],
        medicamentoId: '',
        fechaAplicacion: new Date().toISOString().split('T')[0],
        dosisAplicada: '',
        loteMedicamento: '',
        veterinarioResponsable: currentUser?.nombre || 'Dr. Médico Veterinario',
        costoAplicado: '',
        observaciones: ''
      });
      await loadAllData();
    } catch (err) {
      alert('Error al aplicar tratamiento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Registro de Medicamento
  const handleNuevoMedSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registrarMedicamento({
        ...nuevoMedForm,
        tenantId: selectedTenantId
      });
      fireQuickSuccess();
      setShowNuevoMedModal(false);
      setNuevoMedForm({
        nombre: '',
        tipo: 'VACUNA',
        dosisRecomendada: '2 ml Subcutánea',
        periodoRevacunacionDias: 180,
        costoUnitarioEstimado: '',
        laboratorio: ''
      });
      await loadAllData();
    } catch (err) {
      alert('Error al registrar medicamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado de Eventos
  const filteredEventos = useMemo(() => {
    return eventos.filter(ev => {
      if (activeTab === 'ALERTAS') {
        if (ev.estado_revacunacion !== 'VENCIDA' && ev.estado_revacunacion !== 'PROXIMA_A_VENCER') {
          return false;
        }
      }
      if (tipoFilter !== 'ALL' && ev.medicamento_tipo !== tipoFilter) {
        return false;
      }
      if (globalFilter) {
        const q = globalFilter.toLowerCase();
        const matchArete = ev.arete_visual?.toLowerCase().includes(q);
        const matchMed = ev.medicamento_nombre?.toLowerCase().includes(q);
        const matchVet = ev.veterinario_responsable?.toLowerCase().includes(q);
        const matchLote = ev.lote_medicamento?.toLowerCase().includes(q);
        if (!matchArete && !matchMed && !matchVet && !matchLote) return false;
      }
      return true;
    });
  }, [eventos, activeTab, tipoFilter, globalFilter]);

  // Renders de Columnas
  const tipoBody = (row) => {
    const map = {
      VACUNA: { label: '💉 Vacuna', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      DESPARASITANTE: { label: '🐛 Desparasitante', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      VITAMINA: { label: '💊 Vitamina', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      ANTIBIOTICO: { label: '🛡️ Antibiótico', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
    };
    const c = map[row.medicamento_tipo] || { label: row.medicamento_tipo, bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg}`}>{c.label}</span>;
  };

  const estadoRevacunacionBody = (row) => {
    if (row.estado_revacunacion === 'VENCIDA') {
      return (
        <span className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black flex items-center gap-1">
          <AlertTriangle size={11} /> VENCIDA ({Math.abs(row.dias_para_revacunacion)}d)
        </span>
      );
    }
    if (row.estado_revacunacion === 'PROXIMA_A_VENCER') {
      return (
        <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
          <Clock size={11} /> Próx. en {row.dias_para_revacunacion}d
        </span>
      );
    }
    if (row.estado_revacunacion === 'VIGENTE') {
      return (
        <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
          <CheckCircle2 size={11} /> Vigente ({row.dias_para_revacunacion}d)
        </span>
      );
    }
    return <span className="text-slate-500 text-[10px]">Sin revacunación</span>;
  };

  const costoBody = (row) => (
    <div className="font-mono text-xs text-right font-bold text-white">
      ${parseFloat(row.costo_aplicado || 0).toFixed(2)}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Plan Sanitario, Vacunación y Salud Animal
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Control oficial de biológicos, desparasitaciones periódicas, alertas de revacunación y costos médicos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAplicarModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Syringe className="w-4 h-4" strokeWidth={2.5} /> Aplicar Dosis / Tratamiento
          </button>
          <button
            type="button"
            onClick={() => setShowNuevoMedModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-400" /> Nuevo Medicamento
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Dosis Aplicadas (Mes)</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{kpis.aplicaciones_ultimos_30_dias}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Revacunaciones Vencidas</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{kpis.revacunaciones_vencidas}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Próximas (30 días)</div>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{kpis.revacunaciones_proximas_30_dias}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Costo Sanitario (Mes)</div>
            <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">
              ${parseFloat(kpis.costo_sanitario_mes_actual || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pestañas de Navegación */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('EVENTOS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'EVENTOS'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
            }`}
          >
            <Syringe size={14} /> Historial de Aplicaciones ({eventos.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALERTAS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ALERTAS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle size={14} /> Alertas de Revacunación ({kpis.revacunaciones_vencidas + kpis.revacunaciones_proximas_30_dias})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CATALOGO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CATALOGO'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
            }`}
          >
            <Pill size={14} /> Catálogo de Medicamentos ({medicamentos.length})
          </button>
        </div>

        {/* Buscador & Filtros */}
        {activeTab !== 'CATALOGO' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Buscar por arete, vacuna o lote..."
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-60"
              />
            </div>

            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="VACUNA">Vacunas</option>
              <option value="DESPARASITANTE">Desparasitantes</option>
              <option value="VITAMINA">Vitaminas</option>
              <option value="ANTIBIOTICO">Antibióticos</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'CATALOGO' ? (
        <div className="glass-panel p-4 rounded-2xl border border-white/5">
          <DataTable
            value={medicamentos}
            loading={loading}
            paginator
            rows={10}
            className="p-datatable-sm custom-datatable"
            emptyMessage="No hay medicamentos en el catálogo."
          >
            <Column field="nombre" header="Nombre del Producto" sortable className="font-bold text-white text-xs" />
            <Column field="tipo" header="Categoría" body={tipoBody} sortable className="text-xs" />
            <Column field="laboratorio" header="Laboratorio Fabricante" className="text-slate-400 text-xs" />
            <Column field="dosis_recomendada" header="Dosis Sugerida" className="text-slate-300 font-mono text-xs" />
            <Column 
              field="periodo_revacunacion_dias" 
              header="Periodicidad" 
              body={(r) => <span className="font-mono text-xs text-cyan-300">{r.periodo_revacunacion_dias ? `Cada ${r.periodo_revacunacion_dias} días` : 'Dosis única'}</span>}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="costo_unitario_estimado" 
              header="Costo Sugerido ($)" 
              body={(r) => <span className="font-mono text-xs text-emerald-400 font-bold">${parseFloat(r.costo_unitario_estimado || 0).toFixed(2)}</span>}
              sortable 
              className="text-xs text-right" 
            />
          </DataTable>
        </div>
      ) : (
        <div className="glass-panel p-4 rounded-2xl border border-white/5">
          <DataTable
            value={filteredEventos}
            loading={loading}
            paginator
            rows={12}
            className="p-datatable-sm custom-datatable"
            emptyMessage={activeTab === 'ALERTAS' ? '🎉 ¡Excelente! No hay revacunaciones vencidas o pendientes.' : 'No se han registrado aplicaciones sanitarias.'}
          >
            <Column 
              field="fecha_aplicacion" 
              header="Fecha Aplicación" 
              body={(r) => <span className="font-mono text-xs text-slate-300">{r.fecha_aplicacion ? new Date(r.fecha_aplicacion).toLocaleDateString() : '-'}</span>}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="arete_visual" 
              header="Arete Res" 
              body={(r) => (
                <div>
                  <div className="font-bold text-white font-mono text-xs">{r.arete_visual}</div>
                  <div className="text-[10px] text-slate-400">{r.raza_animal} ({r.categoria_animal})</div>
                </div>
              )}
              sortable 
              className="text-xs" 
            />
            <Column field="medicamento_nombre" header="Producto / Vacuna" className="text-white font-semibold text-xs" />
            <Column field="medicamento_tipo" header="Tipo" body={tipoBody} sortable className="text-xs" />
            <Column 
              field="dosis_aplicada" 
              header="Dosis & Lote" 
              body={(r) => (
                <div className="text-xs text-slate-300">
                  <span>{r.dosis_aplicada || 'Dosis std'}</span>
                  {r.lote_medicamento && <span className="block text-[10px] text-slate-500 font-mono">Lote: {r.lote_medicamento}</span>}
                </div>
              )}
              className="text-xs" 
            />
            <Column field="veterinario_responsable" header="Veterinario" className="text-slate-400 text-xs" />
            <Column field="estado_revacunacion" header="Estado Revacunación" body={estadoRevacunacionBody} sortable className="text-xs" />
            <Column field="costo_aplicado" header="Costo ($)" body={costoBody} sortable className="text-xs text-right" />
          </DataTable>
        </div>
      )}

      {/* 5. Modal: Aplicar Dosis / Tratamiento Sanitario */}
      <Dialog
        visible={showAplicarModal}
        onHide={() => setShowAplicarModal(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Syringe className="w-5 h-5 text-emerald-400" />
            <span>Aplicar Vacuna o Tratamiento Médico</span>
          </div>
        }
        className="w-full max-w-lg"
      >
        <form onSubmit={handleAplicarSubmit} className="space-y-4 text-xs">
          {/* Selector de Modo: Individual vs Masivo */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setAplicacionForm({ ...aplicacionForm, modo: 'INDIVIDUAL' })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                aplicacionForm.modo === 'INDIVIDUAL' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              🐂 Individual (1 Res)
            </button>
            <button
              type="button"
              onClick={() => setAplicacionForm({ ...aplicacionForm, modo: 'MASIVO' })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                aplicacionForm.modo === 'MASIVO' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 Masivo (Todo el Lote / Hato)
            </button>
          </div>

          {/* Selección de Animal(es) */}
          {aplicacionForm.modo === 'INDIVIDUAL' ? (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Seleccionar Res / Animal *</label>
              <select
                required
                value={aplicacionForm.animalId}
                onChange={(e) => setAplicacionForm({ ...aplicacionForm, animalId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Selecciona el arete del animal...</option>
                {monitoringData.map(a => (
                  <option key={a.id} value={a.id}>
                    Arete: {a.arete_visual} - {a.raza} ({a.categoria})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Seleccionar Reses del Hato ({aplicacionForm.animalIds.length} seleccionadas) *</label>
                <button
                  type="button"
                  onClick={() => {
                    if (aplicacionForm.animalIds.length === monitoringData.length) {
                      setAplicacionForm({ ...aplicacionForm, animalIds: [] });
                    } else {
                      setAplicacionForm({ ...aplicacionForm, animalIds: monitoringData.map(a => a.id) });
                    }
                  }}
                  className="text-[10px] text-emerald-400 hover:underline font-semibold"
                >
                  {aplicacionForm.animalIds.length === monitoringData.length ? 'Deseleccionar Todas' : 'Seleccionar Todo el Hato'}
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl p-2 space-y-1">
                {monitoringData.map(a => (
                  <label key={a.id} className="flex items-center gap-2 p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={aplicacionForm.animalIds.includes(a.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAplicacionForm({ ...aplicacionForm, animalIds: [...aplicacionForm.animalIds, a.id] });
                        } else {
                          setAplicacionForm({ ...aplicacionForm, animalIds: aplicacionForm.animalIds.filter(id => id !== a.id) });
                        }
                      }}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="font-mono font-bold text-white text-xs">{a.arete_visual}</span>
                    <span className="text-[10px] text-slate-400">({a.raza} - {a.categoria})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Medicamento / Vacuna */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Medicamento o Vacuna del Catálogo *</label>
            <select
              required
              value={aplicacionForm.medicamentoId}
              onChange={(e) => {
                const medId = e.target.value;
                const selectedMed = medicamentos.find(m => String(m.id) === String(medId));
                setAplicacionForm({
                  ...aplicacionForm,
                  medicamentoId: medId,
                  dosisAplicada: selectedMed?.dosis_recomendada || aplicacionForm.dosisAplicada,
                  costoAplicado: selectedMed?.costo_unitario_estimado || aplicacionForm.costoAplicado
                });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecciona el producto biológico o medicina...</option>
              {medicamentos.map(m => (
                <option key={m.id} value={m.id}>
                  [{m.tipo}] {m.nombre} - (Periodicidad: {m.periodo_revacunacion_dias}d)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha de Aplicación *</label>
              <input
                type="date"
                required
                value={aplicacionForm.fechaAplicacion}
                onChange={(e) => setAplicacionForm({ ...aplicacionForm, fechaAplicacion: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Dosis Aplicada</label>
              <input
                type="text"
                value={aplicacionForm.dosisAplicada}
                onChange={(e) => setAplicacionForm({ ...aplicacionForm, dosisAplicada: e.target.value })}
                placeholder="ej: 2 ml Subcutánea"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Lote del Medicamento</label>
              <input
                type="text"
                value={aplicacionForm.loteMedicamento}
                onChange={(e) => setAplicacionForm({ ...aplicacionForm, loteMedicamento: e.target.value })}
                placeholder="ej: LOT-AFT-2026-B"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={aplicacionForm.costoAplicado}
                onChange={(e) => setAplicacionForm({ ...aplicacionForm, costoAplicado: e.target.value })}
                placeholder="ej: 1.50"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Veterinario / Técnico Responsable</label>
            <input
              type="text"
              value={aplicacionForm.veterinarioResponsable}
              onChange={(e) => setAplicacionForm({ ...aplicacionForm, veterinarioResponsable: e.target.value })}
              placeholder="Nombre del veterinario a cargo"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Observaciones / Reacción</label>
            <textarea
              rows={2}
              value={aplicacionForm.observaciones}
              onChange={(e) => setAplicacionForm({ ...aplicacionForm, observaciones: e.target.value })}
              placeholder="Notas del estado físico, reacción al biológico o condiciones climáticas..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAplicarModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
            >
              {submitting ? 'Guardando...' : 'Confirmar Aplicación'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 6. Modal: Nuevo Medicamento en Catálogo */}
      <Dialog
        visible={showNuevoMedModal}
        onHide={() => setShowNuevoMedModal(false)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Pill className="w-5 h-5 text-cyan-400" />
            <span>Registrar Producto en Catálogo de Farmacia</span>
          </div>
        }
        className="w-full max-w-md"
      >
        <form onSubmit={handleNuevoMedSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Comercial del Medicamento *</label>
            <input
              type="text"
              required
              value={nuevoMedForm.nombre}
              onChange={(e) => setNuevoMedForm({ ...nuevoMedForm, nombre: e.target.value })}
              placeholder="ej: Aftogan Bivalente / Ivermectina L.A."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Producto *</label>
              <select
                required
                value={nuevoMedForm.tipo}
                onChange={(e) => setNuevoMedForm({ ...nuevoMedForm, tipo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="VACUNA">Vacuna</option>
                <option value="DESPARASITANTE">Desparasitante</option>
                <option value="VITAMINA">Vitamina</option>
                <option value="ANTIBIOTICO">Antibiótico</option>
                <option value="SUPLEMENTO">Suplemento</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Laboratorio Fabricante</label>
              <input
                type="text"
                value={nuevoMedForm.laboratorio}
                onChange={(e) => setNuevoMedForm({ ...nuevoMedForm, laboratorio: e.target.value })}
                placeholder="ej: Bayer / Zoetis"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Dosis Recomendada</label>
              <input
                type="text"
                value={nuevoMedForm.dosisRecomendada}
                onChange={(e) => setNuevoMedForm({ ...nuevoMedForm, dosisRecomendada: e.target.value })}
                placeholder="ej: 2 ml Subcutánea"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Periodo Revacunación (Días)</label>
              <input
                type="number"
                min="0"
                value={nuevoMedForm.periodoRevacunacionDias}
                onChange={(e) => setNuevoMedForm({ ...nuevoMedForm, periodoRevacunacionDias: e.target.value })}
                placeholder="ej: 180 (6 meses)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Costo Unitario Sugerido ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={nuevoMedForm.costoUnitarioEstimado}
              onChange={(e) => setNuevoMedForm({ ...nuevoMedForm, costoUnitarioEstimado: e.target.value })}
              placeholder="ej: 2.50"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowNuevoMedModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
            >
              {submitting ? 'Guardando...' : 'Guardar en Catálogo'}
            </button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
