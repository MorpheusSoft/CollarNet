import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import { 
  Radio, 
  MapPin, 
  Smartphone, 
  TrendingUp, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Volume2, 
  RotateCcw, 
  AlertTriangle, 
  DollarSign, 
  Crown, 
  Tractor, 
  Stethoscope, 
  UserCheck,
  CheckCircle2,
  ChevronRight,
  Sun,
  BatteryCharging,
  Layers,
  Compass,
  ArrowRight
} from 'lucide-react';

export default function LandingPage({ user, onLoginSuccess, onGoToDashboard }) {
  const [authModalVisible, setAuthModalVisible] = useState(false);

  return (
    <div className="min-h-screen bg-[#060B12] text-slate-100 selection:bg-emerald-500 selection:text-white">
      
      {/* 1. Header & Navigation */}
      <Navbar
        user={user}
        onOpenLogin={() => setAuthModalVisible(true)}
        onGoToDashboard={onGoToDashboard}
      />

      {/* 2. Hero Section */}
      <section id="hero" className="relative pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden text-center">
        {/* Background glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-glow-emerald">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Innovación AgTech Ganadera 2026</span>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Ganadería de Precisión sin{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Alambres ni Límites Físicos
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Delimita potreros al instante, automatiza la rotación de pasturas y monitorea tu hato las 24 horas con <strong>collares satelitales autónomos</strong> recargados por energía solar y geocercas inteligentes.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (user) onGoToDashboard();
                else setAuthModalVisible(true);
              }}
              className="px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
            >
              <span>🚀 Ingresar a la Plataforma Web</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#ecosistema"
              className="px-8 py-4 rounded-full text-base font-semibold text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-white/25 backdrop-blur-md transition-all duration-300 flex items-center gap-2"
            >
              <span>📖 Descubrir la Tecnología</span>
            </a>
          </div>

          {/* Hero Impact Stats Ribbon */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="p-3 border-r border-slate-800 last:border-none">
              <span className="block font-display font-black text-3xl sm:text-4xl text-emerald-400">0 m</span>
              <span className="text-xs text-slate-400 font-medium mt-1 block">Alambre físico requerido</span>
            </div>
            <div className="p-3 md:border-r border-slate-800 last:border-none">
              <span className="block font-display font-black text-3xl sm:text-4xl text-teal-300">100%</span>
              <span className="text-xs text-slate-400 font-medium mt-1 block">Autonomía Solar Continua</span>
            </div>
            <div className="p-3 border-r border-slate-800 last:border-none">
              <span className="block font-display font-black text-3xl sm:text-4xl text-cyan-400">GNSS 4G</span>
              <span className="text-xs text-slate-400 font-medium mt-1 block">Telemetría en Tiempo Real</span>
            </div>
            <div className="p-3 last:border-none">
              <span className="block font-display font-black text-3xl sm:text-4xl text-amber-400">+22%</span>
              <span className="text-xs text-slate-400 font-medium mt-1 block">Ganancia Diaria de Peso (GDP)</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Section 1: Ecosistema CowIA */}
      <section id="ecosistema" className="py-24 bg-dark-surface/50 border-t border-dark-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Arquitectura Integrada
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display text-white mt-4 tracking-tight">
              Ecosistema Integral de Ganadería con IA
            </h2>
            <p className="text-slate-400 mt-3 text-base">
              La plataforma CowIA unifica collares solares IoT, mapas satelitales GIS, app de campo y analítica zootécnica en una sola suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/50 hover:shadow-glow-emerald transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <Radio className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-2">Collar Inteligente</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Dispositivo robusto IP68 con GPS/GNSS, módem celular 4G/2G, panel solar y lógica de geocerca en memoria local sin depender de cobertura continua.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/50 hover:shadow-glow-cyan transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-2">Monitoreo GIS Web</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cartografía satelital con Leaflet, trazado vectorial de potreros, digitalización asistida por IA de planos en PDF y telemetría por WebSockets.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/50 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-2">App Móvil de Manga</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                PWA táctil para operar 100% offline en el corral. Asignación rápida de arete a collar en 3 toques, pesaje ágil y brújula de rescate.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-teal-500/50 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-300 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-2">Analítica & GDP</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Curvas de ganancia diaria de peso, proyección de fechas óptimas de venta en pie, descanso de forraje y cálculo de carga animal (UGM/ha).
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Section 2: Hardware & Industrial Device */}
      <section id="hardware" className="py-24 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Visual Box */}
            <div className="lg:col-span-5 text-center p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 relative">
              <div className="text-7xl mb-4 animate-bounce duration-1000">🐮⚡</div>
              <h3 className="font-display font-black text-2xl text-white">Collar Inteligente CowIA V2</h3>
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                Firmware Nativo C++ / ESP32 FreeRTOS
              </span>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                Protección sellada IP68 contra barro, agua y golpes de ganado.
              </p>
            </div>

            {/* Features List */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                Ingeniería de Hardware
              </span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
                Diseñado para el Clima Tropical y Trabajo Rudo
              </h2>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Carga Solar Autosustentable:</strong> Panel solar monocristalino de alta eficiencia con algoritmo MPPT y batería de ion-litio de larga vida útil para operación continua 24/7.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Geocercas Autónomas en Memoria Flash:</strong> El algoritmo Ray-Casting evalúa las coordenadas directamente en el collar cada segundo; la cerca sigue funcionando incluso si se corta la red celular.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Estimulación Ética y Progresiva:</strong> Alarma acústica disuasoria en el borde de advertencia, seguida de un micro-pulso estático inofensivo de bajo voltaje solo si el animal insiste en cruzar.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Sensor de Acelerometría 3D:</strong> Detecta patrones de pastoreo, rumia o inmovilidad para emitir alertas tempranas de enfermedad, parto o anomalías.
                  </div>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 5. Section 3: How it Works */}
      <section id="como-funciona" className="py-24 relative border-t border-white/5 bg-[#090F19]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Comportamiento y Bienestar Animal
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white mt-3">
              ¿Cómo Funciona la Cerca Virtual sin Alambre?
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Un sistema de aprendizaje asociativo condicionado que educa al ganado en menos de 48 horas sin sufrimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 text-center relative hover:border-emerald-500/40 transition-all">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <div className="text-4xl mb-3">🌿</div>
              <h4 className="font-display font-bold text-lg text-white mb-2">Zona Segura</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                El animal pastorea libremente dentro del perímetro del potrero delimitado en el mapa satelital.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 text-center relative hover:border-amber-500/40 transition-all">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 border border-amber-500/40 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <div className="text-4xl mb-3">🔊</div>
              <h4 className="font-display font-bold text-lg text-white mb-2">Aviso Sonoro</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Al llegar al margen de advertencia (10m del borde), el collar emite un pitido audible y reconocible.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 text-center relative hover:border-cyan-500/40 transition-all">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/40 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <div className="text-4xl mb-3">↩️</div>
              <h4 className="font-display font-bold text-lg text-white mb-2">Retorno Seguro</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                El animal aprende que el sonido indica el límite y regresa de inmediato al centro de la pastura.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 text-center relative hover:border-rose-500/40 transition-all">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-rose-400 border border-rose-500/40 font-bold text-sm flex items-center justify-center mx-auto mb-4">
                4
              </div>
              <div className="text-4xl mb-3">🚨</div>
              <h4 className="font-display font-bold text-lg text-white mb-2">Alerta Inmediata</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Si la res se fuga o cruza el hato, el collar envía una alarma inmediata vía MQTT a la web y app.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Section 4: ROI Comparison Table */}
      <section id="comparativa" className="py-24 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Retorno de Inversión (ROI)
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white mt-3">
              Cerca Tradicional de Alambre vs. CowIA
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Compara el ahorro operativo y la flexibilidad productiva de la virtualización de potreros.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80">
                  <th className="p-5 font-display font-bold text-white">Criterio Productivo</th>
                  <th className="p-5 font-display font-bold text-slate-400">Cerca Tradicional de Alambre</th>
                  <th className="p-5 font-display font-bold text-emerald-400 bg-emerald-950/20 border-l border-r border-emerald-500/20">
                    Plataforma CowIA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="p-5 font-semibold text-white">Costo de Instalación</td>
                  <td className="p-5 text-slate-400">Alto ($1,500 - $3,000 USD por km en postes y alambre).</td>
                  <td className="p-5 font-medium text-emerald-300 bg-emerald-950/10 border-l border-r border-emerald-500/20">
                    Mínimo: Se traza en el mapa satelital en 30 segundos sin obras civiles.
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-semibold text-white">Mantenimiento Continuo</td>
                  <td className="p-5 text-slate-400">Permanente: Alambres caídos por ramas, óxido y rotura por toros.</td>
                  <td className="p-5 font-medium text-emerald-300 bg-emerald-950/10 border-l border-r border-emerald-500/20">
                    Cero mantenimiento físico de linderos. Solo estado de batería solar.
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-semibold text-white">Flexibilidad de Rotación</td>
                  <td className="p-5 text-slate-400">Rígida: Mover divisiones de potrero toma días de trabajo pesado.</td>
                  <td className="p-5 font-medium text-emerald-300 bg-emerald-950/10 border-l border-r border-emerald-500/20">
                    Instantánea: Modifica dimensiones o traslada el ganado con 1 clic.
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-semibold text-white">Prevención de Abigeato</td>
                  <td className="p-5 text-slate-400">Ciego: No sabes dónde están las reses hasta el recorrido a caballo.</td>
                  <td className="p-5 font-medium text-emerald-300 bg-emerald-950/10 border-l border-r border-emerald-500/20">
                    GPS en vivo: Historial de trayectorias, mapas de calor y alertas de escape.
                  </td>
                </tr>
                <tr>
                  <td className="p-5 font-semibold text-white">Aprovechamiento de Pastos</td>
                  <td className="p-5 text-slate-400">Sobrepastoreo y pisoteo irregular por falta de subdivisiones ágiles.</td>
                  <td className="p-5 font-medium text-emerald-300 bg-emerald-950/10 border-l border-r border-emerald-500/20">
                    Pastoreo rotacional ultra-denso: Mayor biomasa y descanso del forraje.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 7. Section 5: Roles */}
      <section id="roles" className="py-24 relative border-t border-white/5 bg-[#090F19]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Control Granular de Accesos
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white mt-3">
              Una Experiencia Adaptada a Cada Rol de la Finca
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              La plataforma ofrece vistas e interfaces especializadas según la función laboral.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-white">Super Admin</h4>
                  <span className="text-[11px] text-amber-400 font-semibold">Control Global</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Visión multi-finca, administración de infraestructura en la nube, broker MQTT y creación de usuarios.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Servidores y base de datos</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auditoría de collares y SIMs</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-white">Gerente Finca</h4>
                  <span className="text-[11px] text-cyan-400 font-semibold">Administrador</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Control estratégico de la finca, diseño de potreros, análisis de costos y proyecciones de venta.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Trazado de geocercas</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Reportes de GDP y finanzas</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-white">Veterinario</h4>
                  <span className="text-[11px] text-emerald-400 font-semibold">Sanidad y Salud</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Historial zootécnico, plan de vacunación, detección de celos, preñez y control reproductivo.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Alertas de rumia y salud</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Fichas médicas por arete</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-rose-500/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-white">Operario Manga</h4>
                  <span className="text-[11px] text-rose-400 font-semibold">Trabajo en Corral</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Interfaz táctil simplificada en teléfono o tablet para la manga de pesaje y búsqueda de reses.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> Asignación arete-collar</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> Brújula de rescate offline</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 8. Section 6: CTA Banner */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-teal-950/80 border border-emerald-500/30 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h2 className="font-display font-black text-3xl sm:text-5xl text-white">
              ¿Listo para Revolucionar tu Producción Ganadera?
            </h2>
            <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
              Accede a la plataforma web de monitoreo para configurar tus primeras cercas virtuales o abre la versión móvil de campo.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (user) onGoToDashboard();
                  else setAuthModalVisible(true);
                }}
                className="px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all duration-300"
              >
                <span>🔐 Iniciar Sesión en la Plataforma</span>
              </button>
              <a
                href="app-campo.html"
                className="px-8 py-4 rounded-full text-base font-semibold text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 transition-all duration-300"
              >
                <span>📱 Abrir App de Campo PWA</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="py-12 border-t border-white/10 bg-[#04070B] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <Radio className="w-4 h-4" />
                </div>
                <span className="font-display font-black text-xl text-white">
                  Collar<span className="text-emerald-400">Net</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Ecosistema integral de cercas virtuales y ganadería de precisión inteligente para Latinoamérica.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Plataforma</h4>
              <ul className="space-y-2">
                <li><button type="button" onClick={() => { if (user) onGoToDashboard(); else setAuthModalVisible(true); }} className="hover:text-emerald-400">Monitoreo GIS</button></li>
                <li><a href="app-campo.html" className="hover:text-emerald-400">App Móvil de Manga</a></li>
                <li><a href="#hardware" className="hover:text-emerald-400">Dispositivo y Firmware</a></li>
                <li><a href="#comparativa" className="hover:text-emerald-400">Análisis de Rentabilidad</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Documentación</h4>
              <ul className="space-y-2">
                <li><a href="docs/roadmap_desarrollo_2026.pdf" target="_blank" className="hover:text-emerald-400">Roadmap Técnico 2026</a></li>
                <li><a href="docs/diccionario_datos.pdf" target="_blank" className="hover:text-emerald-400">Diccionario de Datos</a></li>
                <li><a href="docs/guia_configuracion_y_campo.pdf" target="_blank" className="hover:text-emerald-400">Manual de Operación</a></li>
                <li><a href="docs/guia_git_colaboracion.md" target="_blank" className="hover:text-emerald-400">Guía de Colaboración</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Acceso Rápido</h4>
              <ul className="space-y-2">
                <li><button type="button" onClick={() => setAuthModalVisible(true)} className="hover:text-emerald-400 text-left">Iniciar Sesión</button></li>
                <li><a href="app-campo.html" className="hover:text-emerald-400">Modo Offline</a></li>
                <li><a href="/api/status" target="_blank" className="hover:text-emerald-400">Estado del Servidor REST</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>© 2026 CowIA - Ganadería Inteligente con IA. Todos los derechos reservados.</span>
            <span className="text-emerald-400 font-semibold">Tecnología Ganadera de Vanguardia</span>
          </div>
        </div>
      </footer>

      {/* 10. Auth Modal */}
      <AuthModal
        visible={authModalVisible}
        onHide={() => setAuthModalVisible(false)}
        onLoginSuccess={(userData) => {
          setAuthModalVisible(false);
          onLoginSuccess(userData);
        }}
      />

    </div>
  );
}
