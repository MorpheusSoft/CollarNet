import React, { useState } from 'react';
import { Radio, Smartphone, LogIn, LayoutDashboard, Menu, X, ShieldCheck } from 'lucide-react';

export default function Navbar({ user, onOpenLogin, onGoToDashboard }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#060B12]/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand */}
          <a href="#hero" className="flex items-center gap-3 group text-decoration-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl tracking-tight text-white">
                Cow<span className="text-emerald-400">IA</span>
              </span>
              <span className="text-[10px] tracking-widest text-emerald-400 uppercase font-semibold -mt-1">
                Ganadería Inteligente con IA
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#ecosistema" className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors">
              Ecosistema
            </a>
            <a href="#hardware" className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors">
              Collar IoT
            </a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors">
              ¿Cómo Funciona?
            </a>
            <a href="#comparativa" className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors">
              Rentabilidad
            </a>
            <a href="#roles" className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors">
              Roles y Accesos
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="app-campo.html"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400 transition-all duration-200"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App de Campo</span>
            </a>

            {user ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Panel ({user.nombre.split(' ')[0]})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A121E]/95 backdrop-blur-xl border-b border-white/10 px-4 pt-2 pb-6 space-y-3">
          <a
            href="#ecosistema"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-emerald-400"
          >
            Ecosistema
          </a>
          <a
            href="#hardware"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-emerald-400"
          >
            Collar IoT
          </a>
          <a
            href="#como-funciona"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-emerald-400"
          >
            ¿Cómo Funciona?
          </a>
          <a
            href="#comparativa"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-emerald-400"
          >
            Rentabilidad
          </a>
          <a
            href="#roles"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-emerald-400"
          >
            Roles y Accesos
          </a>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            <a
              href="app-campo.html"
              className="w-full text-center py-2.5 rounded-lg text-sm font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30"
            >
              📱 Abrir App de Campo PWA
            </a>
            {user ? (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onGoToDashboard(); }}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 shadow-md"
              >
                Panel de Control ({user.nombre.split(' ')[0]})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 shadow-md"
              >
                🔐 Iniciar Sesión en CollarNet
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
