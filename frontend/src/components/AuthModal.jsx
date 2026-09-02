import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Crown, Tractor, UserCheck, Stethoscope, Lock, Mail, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { apiLogin } from '../services/apiService';
import { fireCelebration } from '../services/confettiHelper';

export default function AuthModal({ visible, onHide, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor ingresa correo electrónico y contraseña');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await apiLogin(email.trim(), password);
      // Fire celebration confetti!
      fireCelebration();
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail, quickPwd) => {
    setEmail(quickEmail);
    setPassword(quickPwd);
    setLoading(true);
    setErrorMsg('');

    try {
      const data = await apiLogin(quickEmail, quickPwd);
      fireCelebration();
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      modal
      dismissableMask
      header={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-white">Acceso a CowIA</span>
        </div>
      }
      className="w-[95vw] max-w-[460px] p-0"
    >
      <div className="space-y-5">
        
        {/* Header subtitle */}
        <div className="text-center pb-2">
          <h3 className="font-display font-extrabold text-2xl text-white">
            Portal de <span className="text-emerald-400">Autenticación</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Control de cercas virtuales y gestión ganadera inteligente
          </p>
        </div>

        {/* Quick Demo Access Roles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Acceso Rápido de Demostración:
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@collarnet.com', 'admin123')}
              disabled={loading}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/30 transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">Super Administrador</div>
                  <div className="text-[10px] text-slate-400">admin@collarnet.com</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Entrar <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('finca@collarnet.com', 'finca123')}
              disabled={loading}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-cyan-400 hover:bg-cyan-950/30 transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                  <Tractor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">Gerente de Finca</div>
                  <div className="text-[10px] text-slate-400">finca@collarnet.com</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Entrar <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('campo@collarnet.com', 'campo123')}
              disabled={loading}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-amber-400 hover:bg-amber-950/30 transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-rose-300">Operario de Campo / Manga</div>
                  <div className="text-[10px] text-slate-400">campo@collarnet.com</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Entrar <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('propietario@collarnet.com', 'prop123')}
              disabled={loading}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-yellow-500/30 hover:border-yellow-400 hover:bg-yellow-950/30 transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold text-sm">
                  💼
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-yellow-300">Dueño / Inversionista (Multi-Finca)</div>
                  <div className="text-[10px] text-slate-400">propietario@collarnet.com</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Entrar <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-700/60 w-full"></div>
          <span className="bg-[#0E1624] px-3 text-[11px] text-slate-400 uppercase tracking-wider absolute">
            o con credenciales
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Standard Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej: admin@collarnet.com"
                required
                className="w-full bg-[#080D15] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#080D15] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Iniciar Sesión en CowIA</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-1 border-t border-slate-800">
          <a
            href="app-campo.html"
            className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            📱 ¿Estás en la manga de corral? Accede a la App Móvil de Campo →
          </a>
        </div>

      </div>
    </Dialog>
  );
}
