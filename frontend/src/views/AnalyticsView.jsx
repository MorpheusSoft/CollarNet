import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, DollarSign, Scale, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { fetchProyeccion } from '../services/apiService';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsView({ monitoringData, initialSelectedAnimal }) {
  const [selectedAnimalId, setSelectedAnimalId] = useState(
    initialSelectedAnimal?.id || (monitoringData?.[0]?.id || '')
  );
  const [projectionData, setProjectionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSelectedAnimal?.id) {
      setSelectedAnimalId(initialSelectedAnimal.id);
    }
  }, [initialSelectedAnimal]);

  useEffect(() => {
    if (!selectedAnimalId) return;

    const loadProjection = async () => {
      setLoading(true);
      try {
        const data = await fetchProyeccion(selectedAnimalId);
        setProjectionData(data);
      } catch (err) {
        console.error('Error al cargar proyección:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjection();
  }, [selectedAnimalId]);

  // Build Chart Data
  const chartLabels = projectionData?.proyecciones?.map(p => `+${p.dias} Días`) || ['Hoy', '+30d', '+60d', '+90d', '+180d', '+365d'];
  const weightData = projectionData?.proyecciones?.map(p => p.pesoProyectado) || [350, 375, 400, 425, 500, 550];
  const profitData = projectionData?.proyecciones?.map(p => p.beneficioNeto) || [0, 25, 48, 65, 110, 140];

  const chartConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Peso Proyectado (kg)',
        data: weightData,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.35,
        fill: true,
        yAxisID: 'y'
      },
      {
        label: 'Beneficio Neto Estimado ($)',
        data: profitData,
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        tension: 0.35,
        borderDash: [5, 5],
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 } }
      },
      tooltip: {
        backgroundColor: '#0E1624',
        titleColor: '#fff',
        bodyColor: '#94A3B8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748B' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Kilogramos (kg)', color: '#10B981' },
        ticks: { color: '#64748B' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'Beneficio Neto ($)', color: '#38BDF8' },
        ticks: { color: '#64748B' },
        grid: { drawOnChartArea: false }
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Animal Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="font-display font-black text-2xl text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Analítica Zootécnica y Curvas de Rentabilidad
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulación financiera a 30, 60, 90, 180 y 365 días considerando costos de forraje y precio en pie.
          </p>
        </div>

        {/* Animal Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-300">Animal:</label>
          <select
            value={selectedAnimalId}
            onChange={(e) => setSelectedAnimalId(e.target.value)}
            className="bg-[#080D15] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-400 outline-none focus:border-emerald-500"
          >
            {monitoringData?.map(a => (
              <option key={a.id} value={a.id}>
                Arete #{a.arete_visual || a.id} - {a.raza} ({a.peso_actual || 0} kg)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Calculando curvas zootécnicas...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
              <span className="text-xs text-slate-400 font-medium">Peso Actual</span>
              <div className="font-display font-black text-2xl text-white mt-1">
                {projectionData?.pesoActual || 0} kg
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Raza: {projectionData?.raza || 'Nelore'}</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
              <span className="text-xs text-slate-400 font-medium">Ganancia Diaria (GDP)</span>
              <div className="font-display font-black text-2xl text-emerald-400 mt-1">
                +{projectionData?.gdpPromedioDiario || 0.85} kg/día
              </div>
              <span className="text-[11px] text-emerald-400/80 font-semibold mt-1 block">Rendimiento Forrajero</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
              <span className="text-xs text-slate-400 font-medium">Precio Mercado Estimado</span>
              <div className="font-display font-black text-2xl text-cyan-400 mt-1">
                ${projectionData?.precioPorKgMercado || 2.10} / kg
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Venta en Pie</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0E1624] border border-white/10 shadow-lg">
              <span className="text-xs text-slate-400 font-medium">Recomendación Zootécnica</span>
              <div className="font-display font-black text-xl text-emerald-400 mt-1">
                {projectionData?.pesoActual >= 480 ? '🎯 Venta Inmediata' : '🌿 Mantener en Pastoreo'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {projectionData?.pesoActual >= 480 ? 'Peso óptimo comercial alcanzado' : 'Ganando peso con margen positivo'}
              </span>
            </div>
          </div>

          {/* Chart Container */}
          <div className="p-6 rounded-2xl bg-[#0E1624] border border-white/10 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span>📈 Curva de Crecimiento y Beneficio Acumulado</span>
            </h3>
            <div className="h-80 w-full">
              <Line data={chartConfig} options={chartOptions} />
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="p-6 rounded-2xl bg-[#0E1624] border border-white/10 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-base text-white">
              Desglose de Rentabilidad por Plazo
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Horizonte</th>
                    <th className="pb-3">Peso Proyectado</th>
                    <th className="pb-3">Costo Manutención</th>
                    <th className="pb-3">Valor Comercial</th>
                    <th className="pb-3">Beneficio Neto</th>
                    <th className="pb-3">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {projectionData?.proyecciones?.map((item) => (
                    <tr key={item.dias} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 font-semibold text-white">+{item.dias} Días</td>
                      <td className="py-3 font-bold text-emerald-400">{item.pesoProyectado} kg</td>
                      <td className="py-3 text-slate-400">${item.costoAcumulado} USD</td>
                      <td className="py-3 font-semibold text-cyan-300">${item.valorProyectado} USD</td>
                      <td className="py-3 font-bold text-white">${item.beneficioNeto} USD</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.rentable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {item.rentable ? '✅ Rentable' : '⚠️ Costo Alto'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
