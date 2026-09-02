import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  Tractor, 
  Stethoscope, 
  UserCheck, 
  Search, 
  Loader2,
  Building2,
  Edit2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { 
  apiFetchUsers, 
  apiRegisterUser, 
  apiUpdateUser, 
  apiToggleUserStatus,
  fetchPropietarios 
} from '../services/apiService';
import { fireQuickSuccess } from '../services/confettiHelper';

export default function UsersAdmin({ currentUser, tenants = [] }) {
  const [usersList, setUsersList] = useState([]);
  const [propietariosList, setPropietariosList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // Create User Modal State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'OPERARIO_CAMPO',
    fincaAsignada: currentUser?.fincaAsignada || 'Hato Principal San Juan',
    tenantId: currentUser?.tenantId || '1',
    propietarioId: ''
  });

  // Edit User Modal State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'OPERARIO_CAMPO',
    fincaAsignada: '',
    tenantId: '1',
    propietarioId: '',
    activo: true
  });
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isSuperAdmin = currentUser?.rol === 'SUPERADMIN';

  const loadUsers = async () => {
    setLoading(true);
    try {
      // SuperAdmin can see all users; Admin Finca only sees users of their tenant
      const data = await apiFetchUsers(isSuperAdmin ? null : currentUser?.tenantId);
      setUsersList(data);

      const props = await fetchPropietarios();
      setPropietariosList(props);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...newUserForm,
        tenantId: isSuperAdmin ? newUserForm.tenantId : currentUser?.tenantId,
        propietarioId: newUserForm.rol === 'PROPIETARIO' ? newUserForm.propietarioId : null
      };

      await apiRegisterUser(payload);
      fireQuickSuccess();
      setShowCreateDialog(false);
      setNewUserForm({
        nombre: '',
        email: '',
        password: '',
        rol: 'OPERARIO_CAMPO',
        fincaAsignada: currentUser?.fincaAsignada || 'Hato Principal San Juan',
        tenantId: currentUser?.tenantId || '1',
        propietarioId: ''
      });
      await loadUsers();
    } catch (err) {
      alert('Error al registrar usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit User Modal
  const openEditUser = (user) => {
    setSelectedUserForEdit(user);
    setEditUserForm({
      nombre: user.nombre || '',
      email: user.email || '',
      password: '', // Blank by default, only updated if filled
      rol: user.rol || 'OPERARIO_CAMPO',
      fincaAsignada: user.finca_asignada || 'Hato Principal San Juan',
      tenantId: user.tenant_id ? String(user.tenant_id) : '1',
      propietarioId: user.propietario_id ? String(user.propietario_id) : '',
      activo: user.activo !== false
    });
    setEditErrorMsg('');
    setShowEditDialog(true);
  };

  // Handle Submit Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditErrorMsg('');

    try {
      const payload = {
        nombre: editUserForm.nombre,
        email: editUserForm.email,
        rol: editUserForm.rol,
        fincaAsignada: editUserForm.fincaAsignada,
        tenantId: isSuperAdmin ? editUserForm.tenantId : currentUser?.tenantId,
        propietarioId: editUserForm.rol === 'PROPIETARIO' ? editUserForm.propietarioId : null,
        activo: editUserForm.activo
      };

      if (editUserForm.password && editUserForm.password.trim() !== '') {
        payload.password = editUserForm.password.trim();
      }

      await apiUpdateUser(selectedUserForEdit.id, payload);
      fireQuickSuccess();
      setShowEditDialog(false);
      await loadUsers();
    } catch (err) {
      setEditErrorMsg(err.message || 'Error al actualizar usuario');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Toggle User Status
  const handleToggleStatus = async (user) => {
    try {
      const newStatus = !user.activo;
      await apiToggleUserStatus(user.id, newStatus);
      setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, activo: newStatus } : u));
      fireQuickSuccess();
    } catch (err) {
      alert('Error al cambiar estado del usuario: ' + err.message);
    }
  };

  const rolBody = (row) => {
    switch (row.rol) {
      case 'SUPERADMIN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
            <Crown className="w-3 h-3" /> SuperAdmin
          </span>
        );
      case 'ADMIN_FINCA':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 inline-flex items-center gap-1">
            <Tractor className="w-3 h-3" /> Gerente Finca
          </span>
        );
      case 'VETERINARIO':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
            <Stethoscope className="w-3 h-3" /> Veterinario
          </span>
        );
      case 'PROPIETARIO':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 inline-flex items-center gap-1 w-fit">
              <Briefcase className="w-3 h-3" /> Inversionista / Dueño
            </span>
            {row.propietario_nombre && (
              <span className="text-[10px] text-slate-400 italic">
                Ficha: {row.propietario_nombre}
              </span>
            )}
          </div>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Operario Manga
          </span>
        );
    }
  };

  const tenantBody = (row) => (
    <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
      <Building2 size={13} className="text-purple-400 shrink-0" />
      <span>{row.tenant_nombre || (row.rol === 'SUPERADMIN' ? 'Global SaaS' : 'Empresa Principal')}</span>
    </div>
  );

  const actionsBody = (row) => {
    // Admin Finca cannot edit SuperAdmin accounts
    const canEdit = isSuperAdmin || (row.rol !== 'SUPERADMIN');

    return (
      <div className="flex items-center gap-2">
        {canEdit && (
          <button
            type="button"
            onClick={() => openEditUser(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/5 flex items-center gap-1 text-xs font-semibold"
            title="Editar datos, rol o contraseña del usuario"
          >
            <Edit2 size={13} className="text-emerald-400" />
            <span>Editar</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="font-display font-black text-2xl text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            Gestión de Usuarios y Control de Roles
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Administración global de usuarios de todas las empresas, asignación de roles y portal para propietarios.'
              : `Administración del personal asignado a ${currentUser?.tenantNombre || 'tu empresa'}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center gap-2 transition-all hover:scale-105"
        >
          <UserPlus className="w-4 h-4" /> Crear Usuario
        </button>
      </div>

      {/* Users DataTable */}
      <div className="bg-[#0E1624] border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-4">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar usuario por nombre o email..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-[#080D15] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total: <b className="text-white">{usersList.length}</b> usuarios registrados
          </div>
        </div>

        <DataTable
          value={usersList}
          loading={loading}
          globalFilter={globalFilter}
          paginator
          rows={10}
          emptyMessage="No se encontraron usuarios"
          className="p-datatable-sm"
        >
          <Column field="nombre" header="Nombre" sortable />
          <Column field="email" header="Correo Electrónico" sortable />
          {isSuperAdmin && (
            <Column header="Empresa Adquirente" body={tenantBody} sortable sortField="tenant_nombre" />
          )}
          <Column header="Rol Asignado" body={rolBody} sortable sortField="rol" />
          <Column field="finca_asignada" header="Finca / Hato" sortable />
          <Column
            field="activo"
            header="Estado"
            body={(r) => (
              <button
                type="button"
                onClick={() => handleToggleStatus(r)}
                className="cursor-pointer transition-transform hover:scale-105"
                title="Clic para cambiar estado"
              >
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {r.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </button>
            )}
          />
          <Column
            field="creado_en"
            header="Fecha Registro"
            body={(r) => r.creado_en ? new Date(r.creado_en).toLocaleDateString() : 'N/D'}
            sortable
          />
          <Column header="Acciones" body={actionsBody} style={{ width: '110px' }} />
        </DataTable>
      </div>

      {/* DIALOG 1: CREAR USUARIO */}
      <Dialog
        visible={showCreateDialog}
        onHide={() => setShowCreateDialog(false)}
        header="👥 Crear Nuevo Usuario en CollarNet"
        className="w-[95vw] max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Completo *</label>
            <input
              type="text"
              value={newUserForm.nombre}
              onChange={(e) => setNewUserForm({ ...newUserForm, nombre: e.target.value })}
              placeholder="ej: Pedro Pérez"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico *</label>
            <input
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              placeholder="ej: pedro@finca.com"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Contraseña de Acceso *</label>
            <input
              type="password"
              value={newUserForm.password}
              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
              placeholder="••••••••"
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Seleccionar Adquirente / Empresa (Solo SuperAdmin) */}
          {isSuperAdmin && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Empresa Adquirente Asignada</label>
              <select
                value={newUserForm.tenantId}
                onChange={(e) => setNewUserForm({ ...newUserForm, tenantId: e.target.value })}
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Rol de Acceso *</label>
              <select
                value={newUserForm.rol}
                onChange={(e) => setNewUserForm({ ...newUserForm, rol: e.target.value })}
                required
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="OPERARIO_CAMPO">🤠 Operario Manga</option>
                <option value="ADMIN_FINCA">🚜 Gerente Finca</option>
                <option value="VETERINARIO">🩺 Veterinario</option>
                <option value="PROPIETARIO">💼 Dueño / Inversionista</option>
                {isSuperAdmin && <option value="SUPERADMIN">👑 SuperAdmin</option>}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Finca Asignada</label>
              <input
                type="text"
                value={newUserForm.fincaAsignada}
                onChange={(e) => setNewUserForm({ ...newUserForm, fincaAsignada: e.target.value })}
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Si el rol es PROPIETARIO, vincular a la ficha de propietario */}
          {newUserForm.rol === 'PROPIETARIO' && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <label className="text-xs font-semibold text-yellow-300 block mb-1">
                💼 Vincular a Padrón de Propietario *
              </label>
              <select
                value={newUserForm.propietarioId}
                onChange={(e) => setNewUserForm({ ...newUserForm, propietarioId: e.target.value })}
                required
                className="w-full bg-[#080D15] border border-yellow-500/30 rounded-xl p-2.5 text-xs text-white outline-none focus:border-yellow-400"
              >
                <option value="">Selecciona la ficha del dueño...</option>
                {propietariosList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.documento_identidad || 'Sin Doc'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-md flex items-center justify-center gap-2 mt-4 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Crear Usuario</span>
          </button>
        </form>
      </Dialog>

      {/* DIALOG 2: EDITAR USUARIO */}
      <Dialog
        visible={showEditDialog}
        onHide={() => setShowEditDialog(false)}
        header={
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Edit2 className="text-emerald-400" size={18} />
            <span>Editar Usuario: {selectedUserForEdit?.nombre}</span>
          </div>
        }
        className="w-[95vw] max-w-md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 pt-2">
          
          {editErrorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{editErrorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Completo *</label>
            <input
              type="text"
              value={editUserForm.nombre}
              onChange={(e) => setEditUserForm({ ...editUserForm, nombre: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico *</label>
            <input
              type="email"
              value={editUserForm.email}
              onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
              required
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Cambio de Contraseña Opcional */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1"><KeyRound size={12} className="text-amber-400" /> Nueva Contraseña</span>
              <span className="text-[10px] text-slate-500">(Opcional: Dejar en blanco para no cambiar)</span>
            </label>
            <input
              type="password"
              value={editUserForm.password}
              onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
              placeholder="Escribe para cambiar la contraseña..."
              className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Seleccionar Empresa (Solo SuperAdmin) */}
          {isSuperAdmin && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Empresa Adquirente Asignada</label>
              <select
                value={editUserForm.tenantId}
                onChange={(e) => setEditUserForm({ ...editUserForm, tenantId: e.target.value })}
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>🏢 {t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Cambiar Rol */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Rol de Acceso *</label>
              <select
                value={editUserForm.rol}
                onChange={(e) => setEditUserForm({ ...editUserForm, rol: e.target.value })}
                required
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="OPERARIO_CAMPO">🤠 Operario Manga</option>
                <option value="ADMIN_FINCA">🚜 Gerente Finca</option>
                <option value="VETERINARIO">🩺 Veterinario</option>
                <option value="PROPIETARIO">💼 Dueño / Inversionista</option>
                {isSuperAdmin && <option value="SUPERADMIN">👑 SuperAdmin</option>}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Finca Asignada</label>
              <input
                type="text"
                value={editUserForm.fincaAsignada}
                onChange={(e) => setEditUserForm({ ...editUserForm, fincaAsignada: e.target.value })}
                className="w-full bg-[#080D15] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Si el rol es PROPIETARIO, vincular a la ficha de propietario */}
          {editUserForm.rol === 'PROPIETARIO' && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <label className="text-xs font-semibold text-yellow-300 block mb-1">
                💼 Vincular a Padrón de Propietario *
              </label>
              <select
                value={editUserForm.propietarioId}
                onChange={(e) => setEditUserForm({ ...editUserForm, propietarioId: e.target.value })}
                required
                className="w-full bg-[#080D15] border border-yellow-500/30 rounded-xl p-2.5 text-xs text-white outline-none focus:border-yellow-400"
              >
                <option value="">Selecciona la ficha del dueño...</option>
                {propietariosList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.documento_identidad || 'Sin Doc'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Activo */}
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Estado de la Cuenta</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editUserForm.activo}
                onChange={(e) => setEditUserForm({ ...editUserForm, activo: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditDialog(false)}
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

    </div>
  );
}
