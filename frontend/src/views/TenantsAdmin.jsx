import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { InputMask } from 'primereact/inputmask';
import { 
  Building2, 
  Plus, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Layers, 
  Tractor, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Users, 
  ExternalLink,
  Edit2
} from 'lucide-react';
import { fetchTenants, createTenant, updateTenant, updateTenantStatus } from '../services/apiService';
import { fireCelebration, fireQuickSuccess } from '../services/confettiHelper';

export default function TenantsAdmin({ currentUser, onSelectTenantContext, onRefreshData }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Create / Edit Modal State
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    identificacionFiscal: '',
    contactoNombre: '',
    telefono: '',
    email: '',
    direccion: '',
    planSuscripcion: 'PRO',
    limiteCollares: 100,
    limiteHatos: 10,
    permiteCrearPotreros: true
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchTenants();
      setTenants(data || []);
    } catch (err) {
      console.error('Error al cargar adquirentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setIsEditing(false);
    setSelectedTenant(null);
    setFormData({
      nombre: '',
      identificacionFiscal: '',
      contactoNombre: '',
      telefono: '',
      email: '',
      direccion: '',
      planSuscripcion: 'PRO',
      limiteCollares: 100,
      limiteHatos: 10,
      permiteCrearPotreros: true
    });
    setErrorMsg('');
    setIsDialogVisible(true);
  };

  const openEditDialog = (tenant) => {
    setIsEditing(true);
    setSelectedTenant(tenant);
    setFormData({
      nombre: tenant.nombre || '',
      identificacionFiscal: tenant.identificacion_fiscal || '',
      contactoNombre: tenant.contacto_nombre || '',
      telefono: tenant.telefono || '',
      email: tenant.email || '',
      direccion: tenant.direccion || '',
      planSuscripcion: tenant.plan_suscripcion || 'PRO',
      limiteCollares: tenant.limite_collares || 100,
      limiteHatos: tenant.limite_hatos || 10,
      permiteCrearPotreros: tenant.permite_crear_potreros !== false
    });
    setErrorMsg('');
    setIsDialogVisible(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    try {
      if (isEditing) {
        await updateTenant(selectedTenant.id, formData);
        fireQuickSuccess();
      } else {
        await createTenant(formData);
        fireCelebration();
      }
      setIsDialogVisible(false);
      await loadData();
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar la empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (tenant) => {
    try {
      const newStatus = !tenant.activo;
      await updateTenantStatus(tenant.id, newStatus);
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, activo: newStatus } : t));
      fireQuickSuccess();
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      alert('Error al cambiar estado del adquirente: ' + err.message);
    }
  };

  // KPIs
  const totalTenants = tenants.length;
  const totalHatos = tenants.reduce((acc, t) => acc + parseInt(t.total_hatos || 0, 10), 0);
  const totalCollares = tenants.reduce((acc, t) => acc + parseInt(t.total_collares || 0, 10), 0);
  const totalAnimales = tenants.reduce((acc, t) => acc + parseInt(t.total_animales || 0, 10), 0);

  // Column Templates
  const tenantNameTemplate = (rowData) => {
    const planColors = {
      ENTERPRISE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      PRO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      STARTER: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    };

    return (
      <div className="flex items-start gap-3 py-1">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
          <Building2 size={20} />
        </div>
        <div>
          <div className="font-bold text-white text-base leading-snug flex items-center gap-2">
            {rowData.nombre}
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${planColors[rowData.plan_suscripcion] || 'bg-slate-800 text-slate-300'}`}>
              {rowData.plan_suscripcion}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            RIF/NIT: <span className="text-slate-200">{rowData.identificacion_fiscal}</span>
          </div>
          {rowData.direccion && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate max-w-xs">
              <MapPin size={11} className="shrink-0" />
              {rowData.direccion}
            </div>
          )}
        </div>
      </div>
    );
  };

  const contactTemplate = (rowData) => (
    <div className="space-y-1 text-xs">
      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
        <Users size={13} className="text-emerald-400" />
        {rowData.contacto_nombre || 'Sin contacto registrado'}
      </div>
      {rowData.email && (
        <div className="text-slate-400 flex items-center gap-1.5 truncate">
          <Mail size={12} className="text-slate-500" />
          <a href={`mailto:${rowData.email}`} className="hover:text-emerald-400 transition-colors">
            {rowData.email}
          </a>
        </div>
      )}
      {rowData.telefono && (
        <div className="text-slate-400 flex items-center gap-1.5">
          <Phone size={12} className="text-slate-500" />
          <span>{rowData.telefono}</span>
        </div>
      )}
    </div>
  );

  const usageTemplate = (rowData) => {
    const collaresUso = parseInt(rowData.total_collares || 0, 10);
    const collaresMax = rowData.limite_collares || 100;
    const hatosUso = parseInt(rowData.total_hatos || 0, 10);
    const hatosMax = rowData.limite_hatos || 10;
    const resesUso = parseInt(rowData.total_animales || 0, 10);

    const collaresPct = Math.min(100, Math.round((collaresUso / collaresMax) * 100));

    return (
      <div className="space-y-2 min-w-[170px]">
        <div>
          <div className="flex justify-between text-[11px] text-slate-300 font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Radio size={12} className="text-emerald-400" /> Collares IoT
            </span>
            <span className="font-mono">{collaresUso} / {collaresMax}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${collaresPct > 90 ? 'bg-rose-500' : collaresPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${collaresPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-1.5">
          <span className="flex items-center gap-1">
            <Layers size={12} className="text-cyan-400" /> Hatos: <b className="text-white">{hatosUso}/{hatosMax}</b>
          </span>
          <span className="flex items-center gap-1">
            <Tractor size={12} className="text-amber-400" /> Reses: <b className="text-white">{resesUso}</b>
          </span>
        </div>
      </div>
    );
  };

  const statusTemplate = (rowData) => (
    <button
      onClick={() => handleToggleStatus(rowData)}
      className="group cursor-pointer"
      title="Clic para cambiar estado"
    >
      <Tag 
        value={rowData.activo ? 'ACTIVO' : 'SUSPENDIDO'} 
        severity={rowData.activo ? 'success' : 'danger'}
        className="text-[11px] font-bold px-2.5 py-1 transition-transform group-hover:scale-105"
      />
    </button>
  );

  const actionsTemplate = (rowData) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => openEditDialog(rowData)}
        className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
        title="Editar datos de la empresa"
      >
        <Edit2 size={14} />
      </button>

      {onSelectTenantContext && (
        <button
          onClick={() => onSelectTenantContext(rowData)}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-semibold text-xs transition-all border border-emerald-500/30 flex items-center gap-1"
          title="Administrar infraestructura de esta empresa"
        >
          <span>Entrar</span>
          <ExternalLink size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Gestión de Adquirentes
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  SuperAdmin SaaS
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Crea y administra las empresas ganaderas, sus cupos de collares, límites de fincas y planes contratados.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateDialog}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 shrink-0"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Registrar Adquirente</span>
        </button>
      </div>

      {/* 2. Global Metric KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalTenants}</div>
            <div className="text-xs text-slate-400 font-medium">Empresas Adquirentes</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalHatos}</div>
            <div className="text-xs text-slate-400 font-medium">Hatos Totales</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalCollares}</div>
            <div className="text-xs text-slate-400 font-medium">Collares IoT Desplegados</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Tractor size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalAnimales}</div>
            <div className="text-xs text-slate-400 font-medium">Cabezas Bajo Monitoreo</div>
          </div>
        </div>
      </div>

      {/* 3. DataTable Section */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5">
        
        {/* Table Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar por empresa, RIF o persona de contacto..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Mostrando <b className="text-white">{tenants.length}</b> clientes registrados</span>
          </div>
        </div>

        <DataTable
          value={tenants}
          loading={loading}
          globalFilter={globalFilter}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage="No se encontraron adquirentes registrados"
          className="p-datatable-sm"
          responsiveLayout="scroll"
        >
          <Column header="Empresa Ganadera" body={tenantNameTemplate} sortable sortField="nombre" style={{ minWidth: '240px' }} />
          <Column header="Contacto Principal" body={contactTemplate} style={{ minWidth: '200px' }} />
          <Column header="Infraestructura y Uso" body={usageTemplate} style={{ minWidth: '190px' }} />
          <Column header="Estado" body={statusTemplate} sortable sortField="activo" style={{ width: '120px' }} />
          <Column header="Acciones" body={actionsTemplate} style={{ width: '120px' }} />
        </DataTable>

      </div>

      {/* 4. Modal de Registro / Edición de Adquirente */}
      <Dialog
        visible={isDialogVisible}
        onHide={() => setIsDialogVisible(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Building2 className="text-emerald-400" size={20} />
            <span>{isEditing ? 'Editar Adquirente' : 'Registrar Nuevo Adquirente'}</span>
          </div>
        }
        className="w-full max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nombre de la Empresa */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Razón Social / Nombre Comercial *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Agropecuaria El Palmar C.A."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* RIF / Identificación Fiscal con Máscara */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Identificación Fiscal (RIF / RUT / NIT) *
              </label>
              <InputMask
                required
                mask="a-99999999-9"
                value={formData.identificacionFiscal}
                onChange={(e) => setFormData({ ...formData, identificacionFiscal: e.value ? e.value.toUpperCase() : '' })}
                placeholder="J-12345678-0"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Formato: Letra (J, V, G, E) seguido de 8 dígitos y dígito verificador</span>
            </div>

            {/* Persona de Contacto */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Persona de Contacto / Representante
              </label>
              <input
                type="text"
                value={formData.contactoNombre}
                onChange={(e) => setFormData({ ...formData, contactoNombre: e.target.value })}
                placeholder="Ej: Ing. Carlos Mendoza"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Teléfono con Máscara */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Teléfono de Contacto
              </label>
              <InputMask
                mask="+58 (999) 999-9999"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.value || '' })}
                placeholder="+58 (412) 123-4567"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico Oficial *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@elpalmar.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Plan de Suscripción */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Plan de Suscripción
              </label>
              <select
                value={formData.planSuscripcion}
                onChange={(e) => setFormData({ ...formData, planSuscripcion: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="STARTER">Starter (Hasta 30 collares)</option>
                <option value="PRO">Pro (Hasta 100 collares)</option>
                <option value="ENTERPRISE">Enterprise (Hasta 500+ collares)</option>
              </select>
            </div>

            {/* Límite de Collares */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cupo Límite de Collares IoT
              </label>
              <input
                type="number"
                min="1"
                value={formData.limiteCollares}
                onChange={(e) => setFormData({ ...formData, limiteCollares: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Límite de Hatos */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Límite de Fincas / Hatos
              </label>
              <input
                type="number"
                min="1"
                value={formData.limiteHatos}
                onChange={(e) => setFormData({ ...formData, limiteHatos: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ubicación Geográfica / Dirección Fiscal
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Ej: Calabozo, Edo. Guárico, Venezuela"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Autogestión de Potreros Flag */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers size={15} className="text-emerald-400" />
                <span>Permitir Autogestión de Potreros (Cercas Internas)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                Permite al Gerente de Finca diseñar y mover sus propios potreros dentro del perímetro del Hato maestro.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formData.permiteCrearPotreros}
                onChange={(e) => setFormData({ ...formData, permiteCrearPotreros: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDialogVisible(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEditing ? 'Actualizar Empresa' : 'Registrar Empresa'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </Dialog>

    </div>
  );
}
