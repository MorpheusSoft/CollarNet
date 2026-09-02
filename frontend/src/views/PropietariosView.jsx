import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { InputMask } from 'primereact/inputmask';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  FileText, 
  Tractor, 
  Layers, 
  Radio, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingUp,
  Edit2,
  KeyRound,
  UserPlus,
  Loader2,
  Briefcase
} from 'lucide-react';
import { 
  fetchPropietarios, 
  registrarPropietario, 
  apiUpdatePropietario, 
  fetchPropietarioPortfolio,
  apiRegisterUser 
} from '../services/apiService';
import { fireQuickSuccess, fireCelebration } from '../services/confettiHelper';

export default function PropietariosView({ onOpenProjection, onRefreshData }) {
  const [propietarios, setPropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Registration Modal State
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    correo: '',
    crearUsuario: false,
    passwordUsuario: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Owner Modal State
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [selectedOwnerForEdit, setSelectedOwnerForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    correo: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Quick User Account Creation Modal State
  const [isUserAccountModalVisible, setIsUserAccountModalVisible] = useState(false);
  const [selectedOwnerForUser, setSelectedOwnerForUser] = useState(null);
  const [userAccountForm, setUserAccountForm] = useState({
    nombre: '',
    email: '',
    password: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userErrorMsg, setUserErrorMsg] = useState('');

  // Portfolio Inspection Modal State
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPropietarios();
      setPropietarios(data || []);
    } catch (err) {
      console.error('Error al cargar propietarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Create Propietario (with optional user account)
  const handleCreatePropietario = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const newProp = await registrarPropietario({
        nombre: formData.nombre,
        documento: formData.documento,
        telefono: formData.telefono,
        correo: formData.correo
      });

      // If requested, create portal user account simultaneously
      if (formData.crearUsuario && formData.correo && formData.passwordUsuario) {
        await apiRegisterUser({
          nombre: formData.nombre,
          email: formData.correo,
          password: formData.passwordUsuario,
          rol: 'PROPIETARIO',
          fincaAsignada: 'Multi-Finca',
          tenantId: 1,
          propietarioId: newProp.id
        });
      }

      fireCelebration();
      setIsDialogVisible(false);
      setFormData({ 
        nombre: '', 
        documento: '', 
        telefono: '', 
        correo: '', 
        crearUsuario: false, 
        passwordUsuario: '' 
      });
      await loadData();
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar el propietario');
    } finally {
      setSaving(false);
    }
  };

  // 2. Open Edit Propietario
  const openEditOwner = (owner) => {
    setSelectedOwnerForEdit(owner);
    setEditFormData({
      nombre: owner.nombre || '',
      documento: owner.documento_identidad || '',
      telefono: owner.telefono || '',
      correo: owner.correo || ''
    });
    setEditErrorMsg('');
    setIsEditDialogVisible(true);
  };

  // 3. Save Edit Propietario
  const handleUpdatePropietario = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditErrorMsg('');
    try {
      await apiUpdatePropietario(selectedOwnerForEdit.id, editFormData);
      fireQuickSuccess();
      setIsEditDialogVisible(false);
      await loadData();
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      setEditErrorMsg(err.message || 'Error al actualizar propietario');
    } finally {
      setSavingEdit(false);
    }
  };

  // 4. Open User Account Creation Modal for an existing owner
  const openCreateUserForOwner = (owner) => {
    setSelectedOwnerForUser(owner);
    setUserAccountForm({
      nombre: owner.nombre || '',
      email: owner.correo || '',
      password: ''
    });
    setUserErrorMsg('');
    setIsUserAccountModalVisible(true);
  };

  // 5. Submit User Account Creation
  const handleCreateUserAccount = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setUserErrorMsg('');
    try {
      await apiRegisterUser({
        nombre: userAccountForm.nombre,
        email: userAccountForm.email,
        password: userAccountForm.password,
        rol: 'PROPIETARIO',
        fincaAsignada: 'Multi-Finca',
        tenantId: 1,
        propietarioId: selectedOwnerForUser.id
      });
      fireCelebration();
      setIsUserAccountModalVisible(false);
      alert(`¡Usuario de acceso creado con éxito para ${selectedOwnerForUser.nombre}! Ya puede ingresar como PROPIETARIO.`);
    } catch (err) {
      setUserErrorMsg(err.message || 'Error al crear cuenta de usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  // 6. Inspect Portfolio
  const handleInspectPortfolio = async (propietario) => {
    try {
      setLoadingPortfolio(true);
      setIsPortfolioModalOpen(true);
      const portfolio = await fetchPropietarioPortfolio(propietario.id);
      setSelectedPortfolio(portfolio);
    } catch (err) {
      console.error('Error al cargar portafolio:', err);
      alert('Error al cargar portafolio: ' + err.message);
      setIsPortfolioModalOpen(false);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const ownerTemplate = (rowData) => (
    <div className="flex items-center gap-3 py-1">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
        {rowData.nombre ? rowData.nombre.charAt(0).toUpperCase() : 'P'}
      </div>
      <div>
        <div className="font-bold text-white text-sm leading-snug">{rowData.nombre}</div>
        <div className="text-xs text-slate-400 font-mono mt-0.5">
          Doc: <span className="text-slate-200">{rowData.documento_identidad || 'Sin Documento'}</span>
        </div>
      </div>
    </div>
  );

  const contactTemplate = (rowData) => (
    <div className="space-y-1 text-xs">
      {rowData.correo && (
        <div className="text-slate-400 flex items-center gap-1.5 truncate">
          <Mail size={12} className="text-slate-500" />
          <a href={`mailto:${rowData.correo}`} className="hover:text-blue-400 transition-colors">
            {rowData.correo}
          </a>
        </div>
      )}
      {rowData.telefono ? (
        <div className="text-slate-400 flex items-center gap-1.5">
          <Phone size={12} className="text-slate-500" />
          <span>{rowData.telefono}</span>
        </div>
      ) : (
        <span className="text-slate-600 italic">Sin teléfono registrado</span>
      )}
    </div>
  );

  const actionsTemplate = (rowData) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleInspectPortfolio(rowData)}
        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-semibold text-xs transition-all border border-blue-500/30 flex items-center gap-1.5"
        title="Ver inventario de reses y valoración"
      >
        <Tractor size={13} />
        <span>Ver Patrimonio</span>
      </button>

      <button
        onClick={() => openEditOwner(rowData)}
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/5"
        title="Editar datos del propietario"
      >
        <Edit2 size={13} className="text-emerald-400" />
      </button>

      <button
        onClick={() => openCreateUserForOwner(rowData)}
        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/20"
        title="Crear o asignar cuenta de acceso a la plataforma"
      >
        <KeyRound size={13} />
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Propietarios e Inversionistas
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Padrón global de dueños de ganado, socios e inversionistas con animales distribuidos en múltiples hatos.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDialogVisible(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105"
        >
          <Plus size={18} />
          <span>Registrar Propietario</span>
        </button>
      </div>

      {/* 2. Search & DataTable */}
      <div className="glass-panel rounded-2xl border border-white/5 p-4 shadow-xl">
        <div className="flex items-center justify-between pb-4">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-[#080D15] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total: <b className="text-white">{propietarios.length}</b> propietarios registrados
          </div>
        </div>

        <DataTable
          value={propietarios}
          loading={loading}
          globalFilter={globalFilter}
          paginator
          rows={10}
          emptyMessage="No se encontraron propietarios registrados"
          className="p-datatable-sm"
        >
          <Column field="nombre" header="Propietario / Inversionista" body={ownerTemplate} sortable />
          <Column header="Canales de Contacto" body={contactTemplate} />
          <Column header="Acciones y Portafolio" body={actionsTemplate} style={{ width: '280px' }} />
        </DataTable>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO PROPIETARIO */}
      <Dialog
        visible={isDialogVisible}
        onHide={() => setIsDialogVisible(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Users className="text-blue-400" size={18} />
            <span>Registrar Nuevo Propietario / Inversionista</span>
          </div>
        }
        className="w-[95vw] max-w-md"
      >
        <form onSubmit={handleCreatePropietario} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Completo o Empresa *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Agropecuaria Los Llanos / Juan Pérez"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Documento de Identidad (C.I. / RIF) *</label>
            <InputMask
              mask="a-99999999-9"
              value={formData.documento}
              onChange={(e) => setFormData({ ...formData, documento: e.value })}
              placeholder="V-12345678-0"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">Formato: Letra (V, J, E, G) - Cédula/RIF de 8 dígitos - Dígito</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono</label>
            <InputMask
              mask="+58 (999) 999-9999"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.value })}
              placeholder="+58 (414) 123-4567"
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              placeholder="inversionista@email.com"
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Opción de crear cuenta de acceso simultáneamente */}
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <KeyRound size={13} className="text-amber-400" />
                <span>Generar usuario de acceso al portal</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.crearUsuario}
                  onChange={(e) => setFormData({ ...formData, crearUsuario: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {formData.crearUsuario && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Contraseña de Acceso *</label>
                <input
                  type="password"
                  value={formData.passwordUsuario}
                  onChange={(e) => setFormData({ ...formData, passwordUsuario: e.target.value })}
                  placeholder="••••••••"
                  required={formData.crearUsuario}
                  className="w-full bg-[#080D15] border border-amber-500/30 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDialogVisible(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Guardar Propietario</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: EDITAR PROPIETARIO */}
      <Dialog
        visible={isEditDialogVisible}
        onHide={() => setIsEditDialogVisible(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Edit2 className="text-emerald-400" size={18} />
            <span>Editar Propietario: {selectedOwnerForEdit?.nombre}</span>
          </div>
        }
        className="w-[95vw] max-w-md"
      >
        <form onSubmit={handleUpdatePropietario} className="space-y-4 pt-2">
          {editErrorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{editErrorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Completo o Empresa *</label>
            <input
              type="text"
              value={editFormData.nombre}
              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Documento de Identidad (C.I. / RIF) *</label>
            <InputMask
              mask="a-99999999-9"
              value={editFormData.documento}
              onChange={(e) => setEditFormData({ ...editFormData, documento: e.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono</label>
            <InputMask
              mask="+58 (999) 999-9999"
              value={editFormData.telefono}
              onChange={(e) => setEditFormData({ ...editFormData, telefono: e.value })}
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={editFormData.correo}
              onChange={(e) => setEditFormData({ ...editFormData, correo: e.target.value })}
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditDialogVisible(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center gap-2"
            >
              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 3: CREAR USUARIO DE ACCESO PARA PROPIETARIO */}
      <Dialog
        visible={isUserAccountModalVisible}
        onHide={() => setIsUserAccountModalVisible(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <KeyRound className="text-amber-400" size={18} />
            <span>Generar Cuenta de Acceso para: {selectedOwnerForUser?.nombre}</span>
          </div>
        }
        className="w-[95vw] max-w-md"
      >
        <form onSubmit={handleCreateUserAccount} className="space-y-4 pt-2">
          {userErrorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{userErrorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            💡 Esta cuenta tendrá rol <b>PROPIETARIO</b> y solo tendrá acceso al monitoreo y pesajes de las reses registradas a nombre de <b>{selectedOwnerForUser?.nombre}</b>.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Completo *</label>
            <input
              type="text"
              value={userAccountForm.nombre}
              onChange={(e) => setUserAccountForm({ ...userAccountForm, nombre: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico (Login) *</label>
            <input
              type="email"
              value={userAccountForm.email}
              onChange={(e) => setUserAccountForm({ ...userAccountForm, email: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Contraseña de Acceso *</label>
            <input
              type="password"
              value={userAccountForm.password}
              onChange={(e) => setUserAccountForm({ ...userAccountForm, password: e.target.value })}
              placeholder="••••••••"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsUserAccountModalVisible(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingUser}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md flex items-center gap-2"
            >
              {creatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus size={14} />}
              <span>Crear Cuenta</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 4: INSPECCIÓN DE PORTAFOLIO GANADERO */}
      <Dialog
        visible={isPortfolioModalOpen}
        onHide={() => setIsPortfolioModalOpen(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Tractor className="text-blue-400" size={20} />
            <span>Portafolio e Inversión: {selectedPortfolio?.propietario?.nombre}</span>
          </div>
        }
        className="w-[95vw] max-w-4xl"
      >
        {loadingPortfolio ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
            <p className="text-xs">Consultando inventario en múltiples hatos...</p>
          </div>
        ) : selectedPortfolio ? (
          <div className="space-y-6 pt-2">
            
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Total Reses</span>
                <div className="text-2xl font-black text-white mt-1">{selectedPortfolio.totalAnimales}</div>
                <span className="text-[10px] text-slate-400">Distribuidas en hatos</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Peso Promedio</span>
                <div className="text-2xl font-black text-white mt-1">
                  {selectedPortfolio.animales?.length > 0
                    ? (selectedPortfolio.animales.reduce((acc, a) => acc + parseFloat(a.ultimo_peso || 0), 0) / selectedPortfolio.animales.length).toFixed(1)
                    : 0} kg
                </div>
                <span className="text-[10px] text-slate-400">En báscula / pesaje</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">Collares Activos</span>
                <div className="text-2xl font-black text-white mt-1">
                  {selectedPortfolio.animales?.filter(a => a.collar_id).length || 0}
                </div>
                <span className="text-[10px] text-slate-400">Con telemetría GPS</span>
              </div>
            </div>

            {/* Animals Table */}
            <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/40">
              <DataTable
                value={selectedPortfolio.animales || []}
                paginator
                rows={5}
                className="p-datatable-sm"
                emptyMessage="El propietario no tiene animales asignados actualmente"
              >
                <Column field="arete_visual" header="Arete Visual" sortable body={(r) => (
                  <span className="font-mono font-bold text-emerald-400">{r.arete_visual}</span>
                )} />
                <Column field="raza" header="Raza" sortable />
                <Column field="categoria" header="Categoría" sortable />
                <Column field="sexo" header="Sexo" sortable />
                <Column field="tenant_nombre" header="Empresa / Adquirente" sortable body={(r) => (
                  <span className="text-xs text-purple-300 font-semibold">{r.tenant_nombre || 'N/D'}</span>
                )} />
                <Column field="hato_nombre" header="Hato" sortable body={(r) => (
                  <span className="text-xs text-slate-200">📍 {r.hato_nombre || 'Sin Hato'}</span>
                )} />
                <Column field="potrero_nombre" header="Potrero" sortable body={(r) => (
                  <span className="text-xs text-slate-400">🌱 {r.potrero_nombre || 'Sin Asignar'}</span>
                )} />
                <Column field="ultimo_peso" header="Último Peso" sortable body={(r) => (
                  <span className="font-bold text-white">{parseFloat(r.ultimo_peso || 0).toFixed(0)} kg</span>
                )} />
              </DataTable>
            </div>

          </div>
        ) : null}
      </Dialog>

    </div>
  );
}
