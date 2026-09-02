import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { 
  Activity, 
  HeartPulse, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  Search, 
  Filter, 
  Moon, 
  Sun,
  Flame,
  Radio
} from 'lucide-react';
import { fetchSaludRumiaHato, fetchSaludRumiaAnimal } from '../services/apiService';

export default function HealthRuminationView({ selectedTenantId }) {
  const [loading, setLoading] = useState(false);
  const [resumenHato, setResumenHato] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [curva24h, setCurva24h] = useState([]);
  const [loadingCurva, setLoadingCurva] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSaludRumiaHato(selectedTenantId);
      setResumenHato(data || []);
    } catch (err) {
      console.error('Error al cargar datos de salud y rumia:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantId]);

  const handleOpenCurva = async (animal) => {
    setSelectedAnimal(animal);
    setLoadingCurva(true);
    try {
      const datosCurva = await fetchSaludRumiaAnimal(animal.animal_id);
      setCurva24h(datosCurva || []);
    } catch (err) {
      console.error('Error al cargar curva del animal:', err);
      setCurva24h([]);
    } finally {
      setLoadingCurva(false);
    }
  };

  // KPIs Generales del Hato
  const kpis = useMemo(() => {
    if (resumenHato.length === 0) {
      return { pastoreoProm: 0, rumiaProm: 0, descansoProm: 0, celos: 0, letargos: 0 };
    }
    const totPastoreo = resumenHato.reduce((acc, a) => acc + (a.promedio_pastoreo_hora || 0), 0);
    const totRumia = resumenHato.reduce((acc, a) => acc + (a.promedio_rumia_hora || 0), 0);
    const totDescanso = resumenHato.reduce((acc, a) => acc + (a.promedio_descanso_hora || 0), 0);
    const totCelos = resumenHato.filter(a => a.alerta_celo).length;
    const totLetargos = resumenHato.filter(a => a.alerta_letargo).length;

    return {
      pastoreoProm: (totPastoreo / resumenHato.length * 24 / 60).toFixed(1), // horas
      rumiaProm: (totRumia / resumenHato.length * 24 / 60).toFixed(1),
      descansoProm: (totDescanso / resumenHato.length * 24 / 60).toFixed(1),
      celos: totCelos,
      letargos: totLetargos
    };
  }, [resumenHato]);

  const filteredData = useMemo(() => {
    return resumenHato.filter(a => {
      if (!globalFilter) return true;
      const q = globalFilter.toLowerCase();
      return (
        a.arete_visual?.toLowerCase().includes(q) ||
        a.raza?.toLowerCase().includes(q) ||
        a.collar_id?.toLowerCase().includes(q)
      );
    });
  }, [resumenHato, globalFilter]);

  // Barra de Distribución de Tiempo
  const distribucionBody = (row) => {
    const p = row.promedio_pastoreo_hora || 20;
    const r = row.promedio_rumia_hora || 20;
    const d = row.promedio_descanso_hora || 15;
    const c = row.promedio_caminata_hora || 5;
    const total = p + r + d + c || 60;

    const pctP = ((p / total) * 100).toFixed(0);
    const pctR = ((r / total) * 100).toFixed(0);
    const pctD = ((d / total) * 100).toFixed(0);
    const pctC = ((c / total) * 100).toFixed(0);

    return (
      <div className="space-y-1">
        <div className="h-3 w-48 bg-slate-800 rounded-full flex overflow-hidden border border-white/5">
          <div style={{ width: `${pctP}%` }} className="bg-emerald-500" title={`Pastoreo: ${pctP}%`} />
          <div style={{ width: `${pctR}%` }} className="bg-cyan-400" title={`Rumia: ${pctR}%`} />
          <div style={{ width: `${pctD}%` }} className="bg-indigo-500" title={`Descanso: ${pctD}%`} />
          <div style={{ width: `${pctC}%` }} className="bg-amber-400" title={`Caminata: ${pctC}%`} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span className="text-emerald-400">{pctP}% Pastoreo</span>
          <span className="text-cyan-400">{pctR}% Rumia</span>
          <span className="text-indigo-400">{pctD}% Descanso</span>
        </div>
      </div>
    );
  };

  const estadoSaludBody = (row) => {
    if (row.alerta_celo) {
      return (
        <span className="px-2 py-1 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[10px] font-black flex items-center gap-1 animate-pulse">
          <Flame size={11} className="text-pink-400" /> CELO / ESTRO
        </span>
      );
    }
    if (row.alerta_letargo) {
      return (
        <span className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black flex items-center gap-1">
          <AlertTriangle size={11} /> LETARGO / FIEBRE
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
        <CheckCircle2 size={11} /> Normal / Saludable
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400">
            <HeartPulse size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Salud Animal, Actividad y Rumia (Sensor IMU)
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Monitoreo inercial continuo con detección precoz de celo (estro), timpanismo y letargo por fiebre.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sun size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pastoreo Promedio</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{kpis.pastoreoProm} h/día</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Rumia Promedio</div>
            <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">{kpis.rumiaProm} h/día</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Moon size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Descanso Promedio</div>
            <div className="text-xl font-black text-indigo-300 font-mono mt-0.5">{kpis.descansoProm} h/día</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Flame size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Alertas de Celo</div>
            <div className="text-xl font-black text-pink-400 font-mono mt-0.5">{kpis.celos}</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Alertas Letargo</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{kpis.letargos}</div>
          </div>
        </div>
      </div>

      {/* 3. Tabla Principal de Monitoreo de Salud */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio size={16} className="text-cyan-400" />
            Estado Biomecánico de la Manada (Hoy)
          </h2>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filtrar por arete o collar..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-60"
            />
          </div>
        </div>

        <DataTable
          value={filteredData}
          loading={loading}
          paginator
          rows={10}
          className="p-datatable-sm custom-datatable"
          emptyMessage="No hay datos de telemetría inercial para hoy."
        >
          <Column 
            field="arete_visual" 
            header="Arete Res" 
            body={(r) => (
              <div>
                <span className="font-mono font-bold text-white text-xs">{r.arete_visual}</span>
                <span className="block text-[10px] text-slate-400">{r.raza} ({r.categoria})</span>
              </div>
            )}
            sortable 
            className="text-xs" 
          />
          <Column 
            field="collar_id" 
            header="Collar IoT" 
            body={(r) => <span className="font-mono text-cyan-300 text-xs font-semibold">{r.collar_id}</span>}
            sortable 
            className="text-xs" 
          />
          <Column 
            header="Distribución de Actividad (24h)" 
            body={distribucionBody} 
            className="text-xs" 
          />
          <Column 
            field="indice_actividad" 
            header="Índice Actividad (G-Force)" 
            body={(r) => <span className="font-mono text-xs font-bold text-white">{parseFloat(r.indice_actividad || 1).toFixed(2)}x</span>}
            sortable 
            className="text-xs text-center" 
          />
          <Column 
            field="estado" 
            header="Diagnóstico Comportamiento" 
            body={estadoSaludBody} 
            sortable 
            className="text-xs" 
          />
          <Column 
            body={(row) => (
              <button
                type="button"
                onClick={() => handleOpenCurva(row)}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                title="Ver gráfica horaria de 24 horas"
              >
                <Eye size={12} /> Ver Curva 24h
              </button>
            )}
            className="text-xs text-right" 
          />
        </DataTable>
      </div>

      {/* 4. Modal: Curva de Actividad Circadiana de 24 Horas */}
      <Dialog
        visible={!!selectedAnimal}
        onHide={() => setSelectedAnimal(null)}
        header={
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Curva de Actividad & Rumia de 24h: {selectedAnimal?.arete_visual} ({selectedAnimal?.collar_id})</span>
          </div>
        }
        className="w-full max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
            <span className="text-slate-300 font-semibold">Leyenda Biomecánica:</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pastoreo
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Rumia
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Descanso
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Caminata
              </span>
            </div>
          </div>

          {/* Gráfica de Barras Horarias */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
            <div className="h-44 flex items-end justify-between gap-1 pt-4">
              {curva24h.map((c) => {
                const total = c.minutos_pastoreo + c.minutos_rumia + c.minutos_descanso + c.minutos_caminata || 60;
                const hP = (c.minutos_pastoreo / total) * 100;
                const hR = (c.minutos_rumia / total) * 100;
                const hD = (c.minutos_descanso / total) * 100;
                const hC = (c.minutos_caminata / total) * 100;

                return (
                  <div key={c.hora_bloque} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    <div className="w-full max-w-[16px] rounded-t flex flex-col justify-end overflow-hidden h-full">
                      <div style={{ height: `${hC}%` }} className="bg-amber-400 w-full" />
                      <div style={{ height: `${hD}%` }} className="bg-indigo-500 w-full" />
                      <div style={{ height: `${hR}%` }} className="bg-cyan-400 w-full" />
                      <div style={{ height: `${hP}%` }} className="bg-emerald-500 w-full" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono mt-1">{c.hora_bloque}h</span>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-900">
              Eje X: Horas del Día (00:00 a 23:00) • Eje Y: % de Minutos de Actividad por Hora
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setSelectedAnimal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
