import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { 
  DraftingCompass, 
  MapPin, 
  Sparkles, 
  Layers, 
  Radio, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  Scale, 
  Send,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { 
  apiCrearManual, 
  apiCrearIA, 
  apiEscalarGeocerca, 
  syncGeocercas, 
  apiEliminarHato, 
  apiEliminarPotrero,
  apiUpdatePotrero,
  apiUpdateHato
} from '../services/apiService';
import { fireQuickSuccess } from '../services/confettiHelper';

function geojsonToCoords(geojsonStr) {
  if (!geojsonStr) return '';
  try {
    const parsed = typeof geojsonStr === 'string' ? JSON.parse(geojsonStr) : geojsonStr;
    if (parsed && parsed.coordinates && parsed.coordinates[0]) {
      return parsed.coordinates[0].map(pt => `${pt[1].toFixed(6)}, ${pt[0].toFixed(6)}`).join('\n');
    }
  } catch (e) {
    console.error('Error parse geojson', e);
  }
  return '';
}

export default function GeofenceDesign({ 
  geocercas, 
  collares, 
  tenants = [], 
  selectedTenantId, 
  currentUser, 
  onRefreshData 
}) {
  const isSuperAdmin = currentUser?.rol === 'SUPERADMIN';
  const canManagePotreros = isSuperAdmin || currentUser?.permiteCrearPotreros !== false;

  // Tabs for Creation Methods
  const [activeTab, setActiveTab] = useState('manual'); // 'manual', 'ai', 'scale', 'sync'

  // Form State: Manual
  const [manualTipo, setManualTipo] = useState(isSuperAdmin ? 'hato' : 'potrero');
  const [manualTenantId, setManualTenantId] = useState(selectedTenantId || '1');
  const [manualHatoId, setManualHatoId] = useState('');
  const [manualNombre, setManualNombre] = useState('');
  const [manualMargen, setManualMargen] = useState(10);
  const [manualCoords, setManualCoords] = useState(
    '9.1010, -67.1010\n9.1010, -67.0990\n9.0990, -67.0990\n9.0990, -67.1010'
  );
  const [loadingManual, setLoadingManual] = useState(false);

  // Form State: AI PDF
  const [aiPdfFile, setAiPdfFile] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Form State: Scale
  const [scaleSelect, setScaleSelect] = useState('');
  const [scaleWidth, setScaleWidth] = useState(100);
  const [scaleHeight, setScaleHeight] = useState(100);
  const [loadingScale, setLoadingScale] = useState(false);

  // Form State: Sync Collar
  const [syncCollarId, setSyncCollarId] = useState('');
  const [syncHatoId, setSyncHatoId] = useState('');
  const [syncPotreroId, setSyncPotreroId] = useState('');
  const [loadingSync, setLoadingSync] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // EDIT POTRERO MODAL STATE
  const [showEditPotreroModal, setShowEditPotreroModal] = useState(false);
  const [selectedPotreroForEdit, setSelectedPotreroForEdit] = useState(null);
  const [editPotreroForm, setEditPotreroForm] = useState({
    nombre: '',
    hatoId: '',
    capacidad: 50,
    margenAdvertencia: 10,
    coordenadas: ''
  });
  const [savingPotreroEdit, setSavingPotreroEdit] = useState(false);

  // EDIT HATO MODAL STATE (SuperAdmin)
  const [showEditHatoModal, setShowEditHatoModal] = useState(false);
  const [selectedHatoForEdit, setSelectedHatoForEdit] = useState(null);
  const [editHatoForm, setEditHatoForm] = useState({
    nombre: '',
    tenantId: '1',
    coordenadas: ''
  });
  const [savingHatoEdit, setSavingHatoEdit] = useState(false);

  // 1. Submit Manual Geofence
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoadingManual(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const parsedVertices = manualCoords
        .trim()
        .split('\n')
        .map(line => {
          const [lat, lon] = line.split(',').map(s => parseFloat(s.trim()));
          return [lat, lon];
        });

      if (parsedVertices.length < 3) {
        throw new Error('Debes ingresar al menos 3 vértices para formar un polígono');
      }

      await apiCrearManual(manualTipo, manualNombre, manualHatoId || null, parsedVertices, manualMargen);
      setStatusMsg({ type: 'success', text: `Geocerca '${manualNombre}' creada exitosamente.` });
      fireQuickSuccess();
      setManualNombre('');
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingManual(false);
    }
  };

  // 2. Submit AI PDF Extraction
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPdfFile) return;

    setLoadingAi(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('pdfPlano', aiPdfFile);

      const result = await apiCrearIA(formData);
      setStatusMsg({
        type: 'success',
        text: `¡Plano analizado por Gemini IA! Hato '${result.nombre}' creado con éxito.`
      });
      fireQuickSuccess();
      setAiPdfFile(null);
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingAi(false);
    }
  };

  // 3. Submit Geofence Scaling
  const handleScaleSubmit = async (e) => {
    e.preventDefault();
    if (!scaleSelect) return;

    setLoadingScale(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const [tipo, idStr] = scaleSelect.split(':');
      await apiEscalarGeocerca(tipo, parseInt(idStr, 10), parseFloat(scaleWidth), parseFloat(scaleHeight));
      setStatusMsg({
        type: 'success',
        text: `Geocerca redimensionada a ${scaleWidth}m x ${scaleHeight}m y actualizada en la base de datos.`
      });
      fireQuickSuccess();
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingScale(false);
    }
  };

  // 4. Submit MQTT Sync to Physical Collar
  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    if (!syncCollarId || !syncHatoId || !syncPotreroId) {
      setStatusMsg({ type: 'error', text: 'Por favor selecciona el collar, hato y potrero a sincronizar.' });
      return;
    }

    setLoadingSync(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await syncGeocercas(syncCollarId, syncHatoId, syncPotreroId);
      setStatusMsg({
        type: 'success',
        text: `📡 ¡Geocerca enviada al collar ${syncCollarId} vía MQTT! Umbral de aviso: ${res.payload?.t_w || 10}m.`
      });
      fireQuickSuccess();
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingSync(false);
    }
  };

  // 5. Delete Geofence
  const handleDeleteGeofence = async (tipo, id, nombre) => {
    const confirm = window.confirm(`¿Estás seguro de eliminar el ${tipo} '${nombre}'?`);
    if (!confirm) return;

    try {
      if (tipo === 'hato') await apiEliminarHato(id);
      else await apiEliminarPotrero(id);
      setStatusMsg({ type: 'success', text: `Geocerca '${nombre}' eliminada.` });
      await onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // 6. Open Edit Potrero Dialog
  const openEditPotrero = (potrero) => {
    setSelectedPotreroForEdit(potrero);
    setEditPotreroForm({
      nombre: potrero.nombre || '',
      hatoId: potrero.hato_id || (geocercas?.hatos[0]?.id || ''),
      capacidad: potrero.capacidad_max_cabezas || 50,
      margenAdvertencia: potrero.margen_advertencia_metros || 10,
      coordenadas: geojsonToCoords(potrero.geojson)
    });
    setShowEditPotreroModal(true);
  };

  // 7. Save Edit Potrero
  const handleSaveEditPotrero = async (e) => {
    e.preventDefault();
    setSavingPotreroEdit(true);

    try {
      const parsedVertices = editPotreroForm.coordenadas
        .trim()
        .split('\n')
        .map(line => {
          const [lat, lon] = line.split(',').map(s => parseFloat(s.trim()));
          return [lat, lon];
        });

      if (parsedVertices.length < 3) {
        throw new Error('Debes ingresar al menos 3 vértices válidos para el potrero');
      }

      await apiUpdatePotrero(selectedPotreroForEdit.id, {
        nombre: editPotreroForm.nombre,
        hatoId: editPotreroForm.hatoId,
        capacidad: editPotreroForm.capacidad,
        margenAdvertencia: editPotreroForm.margenAdvertencia,
        vertices: parsedVertices
      });

      setStatusMsg({ type: 'success', text: `Potrero '${editPotreroForm.nombre}' actualizado con éxito.` });
      fireQuickSuccess();
      setShowEditPotreroModal(false);
      await onRefreshData();
    } catch (err) {
      alert('Error al actualizar potrero: ' + err.message);
    } finally {
      setSavingPotreroEdit(false);
    }
  };

  // 8. Open Edit Hato Dialog (SuperAdmin)
  const openEditHato = (hato) => {
    setSelectedHatoForEdit(hato);
    setEditHatoForm({
      nombre: hato.nombre || '',
      tenantId: hato.tenant_id ? String(hato.tenant_id) : '1',
      coordenadas: geojsonToCoords(hato.geojson)
    });
    setShowEditHatoModal(true);
  };

  // 9. Save Edit Hato
  const handleSaveEditHato = async (e) => {
    e.preventDefault();
    setSavingHatoEdit(true);

    try {
      const parsedVertices = editHatoForm.coordenadas
        .trim()
        .split('\n')
        .map(line => {
          const [lat, lon] = line.split(',').map(s => parseFloat(s.trim()));
          return [lat, lon];
        });

      if (parsedVertices.length < 3) {
        throw new Error('Debes ingresar al menos 3 vértices válidos para el hato');
      }

      await apiUpdateHato(selectedHatoForEdit.id, {
        nombre: editHatoForm.nombre,
        tenantId: editHatoForm.tenantId,
        vertices: parsedVertices
      });

      setStatusMsg({ type: 'success', text: `Hato '${editHatoForm.nombre}' actualizado con éxito.` });
      fireQuickSuccess();
      setShowEditHatoModal(false);
      await onRefreshData();
    } catch (err) {
      alert('Error al actualizar hato: ' + err.message);
    } finally {
      setSavingHatoEdit(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="font-display font-black text-2xl text-white flex items-center gap-2.5">
            <DraftingCompass className="w-6 h-6 text-emerald-400" />
            Diseñador y Calibración de Geocercas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Traza y edita potreros, calibra márgenes sonoros, redimensiona áreas y sincroniza por MQTT.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'manual' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ✏️ Coordenadas
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ai' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🤖 Extraer PDF (IA)
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('scale')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'scale' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Escalar / Mover
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'sync' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📡 Sincronizar Collar
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg.text && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{statusMsg.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{statusMsg.text}</span>
          </div>
          <button type="button" onClick={() => setStatusMsg({ type: '', text: '' })} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* 2-Column Grid: Form on Left, Registered List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Active Method Form */}
        <div className="lg:col-span-7 bg-[#0E1624] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          
          {/* TAB 1: Manual Coordinates */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <span>✏️ Entrada Manual de Coordenadas</span>
              </h3>

              {!canManagePotreros && !isSuperAdmin ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  🔒 El diseño de potreros para tu empresa está configurado como servicio gestionado por el equipo técnico de CollarNet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Geocerca</label>
                    {isSuperAdmin ? (
                      <select
                        value={manualTipo}
                        onChange={(e) => setManualTipo(e.target.value)}
                        className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                      >
                        <option value="hato">🏰 Hato (Perímetro Maestro de Finca)</option>
                        <option value="potrero">🌾 Potrero (Cerca Virtual Interna)</option>
                      </select>
                    ) : (
                      <div className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Layers size={14} />
                        <span>🌾 Potrero (Cerca Virtual Interna)</span>
                      </div>
                    )}
                  </div>

                  {manualTipo === 'hato' && isSuperAdmin && tenants.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Empresa Adquirente Asignada</label>
                      <select
                        value={manualTenantId}
                        onChange={(e) => setManualTenantId(e.target.value)}
                        required
                        className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {manualTipo === 'potrero' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Hato Perimetral Asociado *</label>
                      <select
                        value={manualHatoId}
                        onChange={(e) => setManualHatoId(e.target.value)}
                        required
                        className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                      >
                        <option value="">Selecciona un hato...</option>
                        {geocercas?.hatos?.map(h => (
                          <option key={h.id} value={h.id}>{h.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre de la Geocerca</label>
                <input
                  type="text"
                  value={manualNombre}
                  onChange={(e) => setManualNombre(e.target.value)}
                  placeholder="ej: Potrero A (Norte), Potrero Maternidad"
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              {manualTipo === 'potrero' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Margen de Advertencia Sonoro (Metros del Perímetro)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualMargen}
                    onChange={(e) => setManualMargen(parseFloat(e.target.value))}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Vértices Poligonales (Latitud, Longitud - uno por línea)
                </label>
                <textarea
                  rows={5}
                  value={manualCoords}
                  onChange={(e) => setManualCoords(e.target.value)}
                  required
                  className="w-full font-mono text-xs bg-[#080D15] border border-white/10 rounded-xl p-3 text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingManual || (!canManagePotreros && !isSuperAdmin)}
                className="w-full py-3 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loadingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Guardar y Publicar Geocerca</span>
              </button>
            </form>
          )}

          {/* TAB 2: AI PDF Extraction */}
          {activeTab === 'ai' && isSuperAdmin && (
            <form onSubmit={handleAiSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>Extracción Inteligente de Planos Catastrales (Gemini 2.5)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Sube el plano topográfico o documento catastral del Hato en PDF. El modelo multimodal extraerá las coordenadas georreferenciadas.
              </p>

              <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-purple-500/50 transition-colors">
                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-white font-semibold">Selecciona o arrastra el archivo PDF del Plano</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setAiPdfFile(e.target.files[0])}
                  required
                  className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAi || !aiPdfFile}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Analizar con IA y Crear Hato</span>
              </button>
            </form>
          )}

          {/* TAB 3: Scale / Move */}
          {activeTab === 'scale' && (
            <form onSubmit={handleScaleSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-400" />
                <span>Re-dimensionar o Mover Geocerca</span>
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona una geocerca e ingresa las nuevas dimensiones en metros. Se recalculará en tiempo real sobre la ubicación geográfica actual.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Geocerca a Redimensionar</label>
                <select
                  value={scaleSelect}
                  onChange={(e) => setScaleSelect(e.target.value)}
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecciona un perímetro...</option>
                  {isSuperAdmin && (
                    <optgroup label="Hatos">
                      {geocercas?.hatos?.map(h => (
                        <option key={`hato:${h.id}`} value={`hato:${h.id}`}>🏰 Hato: {h.nombre}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Potreros">
                    {geocercas?.potreros?.map(p => (
                      <option key={`potrero:${p.id}`} value={`potrero:${p.id}`}>🌱 Potrero: {p.nombre}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Ancho Este-Oeste (m)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={scaleWidth}
                    onChange={(e) => setScaleWidth(e.target.value)}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Largo Norte-Sur (m)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={scaleHeight}
                    onChange={(e) => setScaleHeight(e.target.value)}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingScale || !scaleSelect}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingScale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                <span>⚡ Re-dimensionar Geocerca y Guardar</span>
              </button>
            </form>
          )}

          {/* TAB 4: Sync MQTT */}
          {activeTab === 'sync' && (
            <form onSubmit={handleSyncSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span>Sincronizar Cerca Virtual con Collar Físico</span>
              </h3>
              <p className="text-xs text-slate-400">
                Empaqueta los vértices comprimidos y el margen de advertencia en formato MQTT para grabarlos en la memoria flash del collar ESP32.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Collar Físico de Destino</label>
                <select
                  value={syncCollarId}
                  onChange={(e) => setSyncCollarId(e.target.value)}
                  required
                  className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecciona un dispositivo...</option>
                  {collares?.map(c => (
                    <option key={c.id} value={c.id}>
                      Collar #{c.id} ({c.activo ? '🟢 Activo' : '🔴 Inactivo'}) - SIM: {c.numero_sim}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Hato General</label>
                  <select
                    value={syncHatoId}
                    onChange={(e) => setSyncHatoId(e.target.value)}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecciona hato...</option>
                    {geocercas?.hatos?.map(h => (
                      <option key={h.id} value={h.id}>{h.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Potrero Asignado</label>
                  <select
                    value={syncPotreroId}
                    onChange={(e) => setSyncPotreroId(e.target.value)}
                    required
                    className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecciona potrero...</option>
                    {geocercas?.potreros?.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Margen: {p.margen_advertencia_metros || 10}m)</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingSync || !syncCollarId || !syncHatoId || !syncPotreroId}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingSync ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>📡 Transmitir Geocerca por MQTT</span>
              </button>
            </form>
          )}

        </div>

        {/* Right 5 Columns: Registered Geofences List */}
        <div className="lg:col-span-5 bg-[#0E1624] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col h-full">
          <h3 className="font-display font-bold text-base text-white flex items-center justify-between">
            <span>Perímetros Registrados</span>
            <span className="text-xs text-emerald-400 font-semibold">
              {(geocercas?.hatos?.length || 0) + (geocercas?.potreros?.length || 0)} Total
            </span>
          </h3>

          <div className="space-y-3 overflow-y-auto flex-1 max-h-[500px] pr-1">
            
            {/* Hatos */}
            <div>
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-2">
                🏰 Hatos (Límites Generales)
              </span>
              {geocercas?.hatos?.length === 0 ? (
                <p className="text-xs text-slate-500">No hay hatos registrados.</p>
              ) : (
                geocercas?.hatos?.map(h => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20 flex items-center justify-between mb-2 hover:border-rose-500/40 transition-all"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{h.nombre}</div>
                      <div className="text-[10px] text-slate-400">ID: {h.id}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditHato(h)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Editar Hato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGeofence('hato', h.id, h.nombre)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar hato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Potreros */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                🌱 Potreros (Rotación de Pastura)
              </span>
              {geocercas?.potreros?.length === 0 ? (
                <p className="text-xs text-slate-500">No hay potreros registrados.</p>
              ) : (
                geocercas?.potreros?.map(p => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-center justify-between mb-2 hover:border-emerald-500/40 transition-all"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{p.nombre}</div>
                      <div className="text-[10px] text-slate-400">
                        Hato ID: {p.hato_id} | Margen: {p.margen_advertencia_metros || 10}m | Cap: {p.capacidad_max_cabezas || 50} reses
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canManagePotreros && (
                        <button
                          type="button"
                          onClick={() => openEditPotrero(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Editar Potrero (Nombre, Hato, Margen, Coordenadas)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManagePotreros && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGeofence('potrero', p.id, p.nombre)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar potrero"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>

      {/* MODAL 1: EDITAR POTRERO */}
      <Dialog
        visible={showEditPotreroModal}
        onHide={() => setShowEditPotreroModal(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Edit2 className="text-emerald-400" size={18} />
            <span>Editar Potrero: {selectedPotreroForEdit?.nombre}</span>
          </div>
        }
        className="w-[95vw] max-w-lg"
      >
        <form onSubmit={handleSaveEditPotrero} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Potrero *</label>
            <input
              type="text"
              value={editPotreroForm.nombre}
              onChange={(e) => setEditPotreroForm({ ...editPotreroForm, nombre: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Hato Perteneciente *</label>
              <select
                value={editPotreroForm.hatoId}
                onChange={(e) => setEditPotreroForm({ ...editPotreroForm, hatoId: e.target.value })}
                required
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                {geocercas?.hatos?.map(h => (
                  <option key={h.id} value={h.id}>{h.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Margen Advertencia (m)</label>
              <input
                type="number"
                step="0.5"
                value={editPotreroForm.margenAdvertencia}
                onChange={(e) => setEditPotreroForm({ ...editPotreroForm, margenAdvertencia: parseFloat(e.target.value) })}
                required
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Coordenadas de los Vértices (Latitud, Longitud - uno por línea) *
            </label>
            <textarea
              rows={5}
              value={editPotreroForm.coordenadas}
              onChange={(e) => setEditPotreroForm({ ...editPotreroForm, coordenadas: e.target.value })}
              required
              className="w-full font-mono text-xs bg-[#080D15] border border-white/10 rounded-xl p-3 text-emerald-400 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditPotreroModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPotreroEdit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center gap-2"
            >
              {savingPotreroEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Guardar Potrero</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: EDITAR HATO (SuperAdmin) */}
      <Dialog
        visible={showEditHatoModal}
        onHide={() => setShowEditHatoModal(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Edit2 className="text-rose-400" size={18} />
            <span>Editar Hato Maestro: {selectedHatoForEdit?.nombre}</span>
          </div>
        }
        className="w-[95vw] max-w-lg"
      >
        <form onSubmit={handleSaveEditHato} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Hato *</label>
            <input
              type="text"
              value={editHatoForm.nombre}
              onChange={(e) => setEditHatoForm({ ...editHatoForm, nombre: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          {tenants.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Empresa Adquirente Asignada</label>
              <select
                value={editHatoForm.tenantId}
                onChange={(e) => setEditHatoForm({ ...editHatoForm, tenantId: e.target.value })}
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Coordenadas del Perímetro Maestro (Latitud, Longitud - uno por línea) *
            </label>
            <textarea
              rows={5}
              value={editHatoForm.coordenadas}
              onChange={(e) => setEditHatoForm({ ...editHatoForm, coordenadas: e.target.value })}
              required
              className="w-full font-mono text-xs bg-[#080D15] border border-white/10 rounded-xl p-3 text-rose-400 outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditHatoModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingHatoEdit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center gap-2"
            >
              {savingHatoEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Guardar Hato</span>
            </button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
