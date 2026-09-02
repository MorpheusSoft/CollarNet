import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { 
  Bell, 
  Send, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  History, 
  Save, 
  Radio,
  Zap
} from 'lucide-react';
import { 
  fetchNotificacionesConfig, 
  updateNotificacionesConfig, 
  probarCanalNotificacion, 
  fetchNotificacionesBitacora 
} from '../services/apiService';
import { fireQuickSuccess, fireCelebration } from '../services/confettiHelper';

export default function NotificationsConfigView({ currentUser, selectedTenantId }) {
  const [activeTab, setActiveTab] = useState('CANALES'); // 'CANALES' | 'BITACORA'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Estados de Configuración
  const [config, setConfig] = useState({
    canalTelegramActivo: false,
    telegramBotToken: '',
    telegramChatId: '',
    canalWhatsappActivo: false,
    whatsappPhone: '',
    whatsappApiKey: '',
    canalEmailActivo: false,
    emailDestinatarios: '',
    alertaEscapeGeocerca: true,
    alertaBateriaCritica: true,
    alertaCollarOffline: true,
    alertaCeloDetectado: true
  });

  const [bitacora, setBitacora] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfg, logs] = await Promise.all([
        fetchNotificacionesConfig(selectedTenantId),
        fetchNotificacionesBitacora(selectedTenantId)
      ]);
      if (cfg) {
        setConfig({
          canalTelegramActivo: cfg.canal_telegram_activo ?? false,
          telegramBotToken: cfg.telegram_bot_token || '',
          telegramChatId: cfg.telegram_chat_id || '',
          canalWhatsappActivo: cfg.canal_whatsapp_activo ?? false,
          whatsappPhone: cfg.whatsapp_phone || '',
          whatsappApiKey: cfg.whatsapp_api_key || '',
          canalEmailActivo: cfg.canal_email_activo ?? false,
          emailDestinatarios: cfg.email_destinatarios || '',
          alertaEscapeGeocerca: cfg.alerta_escape_geocerca ?? true,
          alertaBateriaCritica: cfg.alerta_bateria_critica ?? true,
          alertaCollarOffline: cfg.alerta_collar_offline ?? true,
          alertaCeloDetectado: cfg.alerta_celo_detectado ?? true
        });
      }
      setBitacora(logs || []);
    } catch (err) {
      console.error('Error al cargar configuración de notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantId]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateNotificacionesConfig({
        tenantId: selectedTenantId,
        ...config
      });
      fireCelebration();
      alert('¡Configuración de notificaciones guardada exitosamente!');
    } catch (err) {
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestChannel = async (canal) => {
    setTesting(true);
    try {
      let payload = { canal, tenantId: selectedTenantId };
      if (canal === 'TELEGRAM') {
        payload.botToken = config.telegramBotToken;
        payload.chatId = config.telegramChatId;
      } else if (canal === 'WHATSAPP') {
        payload.phone = config.whatsappPhone;
      } else if (canal === 'EMAIL') {
        payload.email = config.emailDestinatarios;
      }

      const res = await probarCanalNotificacion(payload);
      fireQuickSuccess();
      alert(res.message || 'Prueba enviada con éxito.');
      const logs = await fetchNotificacionesBitacora(selectedTenantId);
      setBitacora(logs || []);
    } catch (err) {
      alert('Error en la prueba: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 text-indigo-400">
            <Bell size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Centro de Alertas y Notificaciones Multicanal
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Configuración de Bot de Telegram, WhatsApp y Correo para alertas automáticas de escapes de geocerca y salud.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Save className="w-4 h-4" strokeWidth={2.5} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* 2. Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CANALES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CANALES'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
          }`}
        >
          <Settings size={14} /> Canales & Reglas de Disparo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BITACORA')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'BITACORA'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800'
          }`}
        >
          <History size={14} /> Bitácora de Envíos ({bitacora.length})
        </button>
      </div>

      {/* 3. Contenido de Canales */}
      {activeTab === 'CANALES' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta 1: Telegram Bot */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Bot de Telegram</h3>
                  <span className="text-[10px] text-sky-300">Alertas con mapa GPS</span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.canalTelegramActivo}
                onChange={(e) => setConfig({ ...config, canalTelegramActivo: e.target.checked })}
                className="w-4 h-4 rounded text-sky-500 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Bot Token de Telegram</label>
                <input
                  type="password"
                  value={config.telegramBotToken}
                  onChange={(e) => setConfig({ ...config, telegramBotToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuv..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Chat ID / ID de Grupo</label>
                <input
                  type="text"
                  value={config.telegramChatId}
                  onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                  placeholder="-1001234567890 o @mifinca_alertas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleTestChannel('TELEGRAM')}
                disabled={testing || !config.telegramBotToken}
                className="w-full py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold transition-all text-xs"
              >
                {testing ? 'Probando...' : '📡 Probar Envío a Telegram'}
              </button>
            </div>
          </div>

          {/* Tarjeta 2: WhatsApp */}
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">WhatsApp Business</h3>
                  <span className="text-[10px] text-emerald-300">Mensajes de emergencia</span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.canalWhatsappActivo}
                onChange={(e) => setConfig({ ...config, canalWhatsappActivo: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Número de Teléfono (+Código País)</label>
                <input
                  type="text"
                  value={config.whatsappPhone}
                  onChange={(e) => setConfig({ ...config, whatsappPhone: e.target.value })}
                  placeholder="+58 412 1234567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">API Key / Token de Pasarela</label>
                <input
                  type="password"
                  value={config.whatsappApiKey}
                  onChange={(e) => setConfig({ ...config, whatsappApiKey: e.target.value })}
                  placeholder="wh_live_key_98234..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleTestChannel('WHATSAPP')}
                disabled={testing || !config.whatsappPhone}
                className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold transition-all text-xs"
              >
                {testing ? 'Probando...' : '💬 Probar Envío a WhatsApp'}
              </button>
            </div>
          </div>

          {/* Tarjeta 3: Correo Electrónico & Reglas */}
          <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Correo Electrónico</h3>
                  <span className="text-[10px] text-purple-300">Reportes e incidencias</span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.canalEmailActivo}
                onChange={(e) => setConfig({ ...config, canalEmailActivo: e.target.checked })}
                className="w-4 h-4 rounded text-purple-500 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Destinatarios (Separados por coma)</label>
                <textarea
                  rows={2}
                  value={config.emailDestinatarios}
                  onChange={(e) => setConfig({ ...config, emailDestinatarios: e.target.value })}
                  placeholder="admin@finca.com, mayordomo@finca.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Reglas de Disparo Automático */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="font-bold text-slate-200 block text-xs">Reglas de Disparo Automático:</span>
                
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={config.alertaEscapeGeocerca}
                    onChange={(e) => setConfig({ ...config, alertaEscapeGeocerca: e.target.checked })}
                    className="rounded text-rose-500"
                  />
                  <span>🚨 Res fuera de cerca virtual / Fuga</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={config.alertaBateriaCritica}
                    onChange={(e) => setConfig({ ...config, alertaBateriaCritica: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>🔋 Batería de collar crítica (&lt; 20%)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={config.alertaCollarOffline}
                    onChange={(e) => setConfig({ ...config, alertaCollarOffline: e.target.checked })}
                    className="rounded text-cyan-500"
                  />
                  <span>📶 Collar sin reporte (&gt; 4 horas)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                  <input
                    type="checkbox"
                    checked={config.alertaCeloDetectado}
                    onChange={(e) => setConfig({ ...config, alertaCeloDetectado: e.target.checked })}
                    className="rounded text-pink-500"
                  />
                  <span>❤️ Vaca en celo / Estro detectado</span>
                </label>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="glass-panel p-4 rounded-2xl border border-white/5">
          <DataTable
            value={bitacora}
            loading={loading}
            paginator
            rows={12}
            className="p-datatable-sm custom-datatable"
            emptyMessage="No hay registros de notificaciones en la bitácora."
          >
            <Column 
              field="creado_en" 
              header="Fecha y Hora" 
              body={(r) => <span className="font-mono text-xs text-slate-300">{r.creado_en ? new Date(r.creado_en).toLocaleString() : '-'}</span>}
              sortable 
              className="text-xs" 
            />
            <Column 
              field="canal" 
              header="Canal" 
              body={(r) => (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                  {r.canal}
                </span>
              )}
              sortable 
              className="text-xs" 
            />
            <Column field="destinatario" header="Destinatario" className="font-mono text-xs text-slate-200" />
            <Column field="titulo" header="Título / Asunto" className="font-semibold text-xs text-white" />
            <Column 
              field="mensaje" 
              header="Contenido del Mensaje" 
              body={(r) => <span className="text-xs text-slate-400 truncate max-w-xs block">{r.mensaje}</span>}
              className="text-xs" 
            />
            <Column 
              field="estado" 
              header="Estado" 
              body={(r) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.estado === 'ENVIADO' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                  {r.estado}
                </span>
              )}
              sortable 
              className="text-xs text-right" 
            />
          </DataTable>
        </div>
      )}

    </div>
  );
}
