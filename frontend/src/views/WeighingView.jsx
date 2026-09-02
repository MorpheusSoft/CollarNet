import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Scale, TrendingUp, Plus, Search, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { registrarPesaje } from '../services/apiService';
import { fireQuickSuccess } from '../services/confettiHelper';

export default function WeighingView({ monitoringData, onRefreshData, onOpenProjection }) {
  const [showWeighingDialog, setShowWeighingDialog] = useState(false);
  const [animalId, setAnimalId] = useState('');
  const [peso, setPeso] = useState('');
  const [fechaPesaje, setFechaPesaje] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registrarPesaje({ animalId, peso, fechaPesaje });
      fireQuickSuccess();
      setShowWeighingDialog(false);
      setAnimalId('');
      setPeso('');
      await onRefreshData();
    } catch (err) {
      alert('Error al registrar peso: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const avgWeight = monitoringData?.length > 0
    ? (monitoringData.reduce((acc, a) => acc + (parseFloat(a.peso_actual) || 0), 0) / monitoringData.length).toFixed(1)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="font-display font-black text-2xl text-white flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-emerald-400" />
            Control de Pesaje y Ganancia Diaria (GDP)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historial de pesaje en báscula, evolución de peso y cálculo zootécnico de rendimiento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowWeighingDialog(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> ⚖️ Registrar Pesaje
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Peso Promedio del Hato</span>
          <div className="font-display font-black text-3xl text-emerald-400 mt-1">{avgWeight} kg</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Calculado sobre {monitoringData?.length || 0} reses</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Ganancia Diaria Promedio (GDP)</span>
          <div className="font-display font-black text-3xl text-cyan-400 mt-1">+0.850 kg/día</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">Rendimiento Óptimo en Pastoreo</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Listo para Venta Comercial</span>
          <div className="font-display font-black text-3xl text-amber-400 mt-1">
            {monitoringData?.filter(a => (parseFloat(a.peso_actual) || 0) >= 480).length || 0} Novillos
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Peso mayor a 480 kg</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0E1624] border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-4">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar por arete o raza..."
              className="w-full bg-[#080D15] border border-white/10 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        <DataTable
          value={monitoringData || []}
          globalFilter={globalFilter}
          paginator
          rows={10}
          emptyMessage="No hay registros de peso."
          className="p-datatable-sm"
        >
          <Column field="arete_visual" header="Arete" body={(r) => `🐂 #${r.arete_visual || r.id}`} sortable />
          <Column field="raza" header="Raza" sortable />
          <Column field="categoria" header="Categoría" sortable />
          <Column field="peso_actual" header="Último Peso" body={(r) => <span className="font-bold text-emerald-400">{r.peso_actual || 0} kg</span>} sortable />
          <Column field="potrero_nombre" header="Potrero" sortable />
          <Column
            header="Acciones"
            body={(r) => (
              <button
                type="button"
                onClick={() => onOpenProjection(r)}
                className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Curva GDP
              </button>
            )}
          />
        </DataTable>
      </div>

      {/* Modal Pesaje */}
      <Dialog
        visible={showWeighingDialog}
        onHide={() => setShowWeighingDialog(false)}
        header="⚖️ Registrar Nuevo Pesaje"
        className="w-[95vw] max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Animal *</label>
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            >
              <option value="">Selecciona el animal...</option>
              {monitoringData?.map(a => (
                <option key={a.id} value={a.id}>Arete: {a.arete_visual} ({a.raza})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Peso en Kilogramos (kg) *</label>
            <input
              type="number"
              step="0.1"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="ej: 380.0"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha del Pesaje</label>
            <input
              type="date"
              value={fechaPesaje}
              onChange={(e) => setFechaPesaje(e.target.value)}
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
            <span>Guardar Registro de Peso</span>
          </button>
        </form>
      </Dialog>

    </div>
  );
}
