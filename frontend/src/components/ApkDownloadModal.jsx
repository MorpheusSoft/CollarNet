import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { 
  Download, 
  QrCode, 
  Copy, 
  Check, 
  Wrench, 
  Smartphone, 
  ShieldCheck, 
  FileCode2,
  ExternalLink
} from 'lucide-react';

export default function ApkDownloadModal({ visible, onHide, user, initialApp = 'campo' }) {
  const [copied, setCopied] = useState(false);
  const [activeApp, setActiveApp] = useState(initialApp || (user?.rol === 'SUPERADMIN' ? 'tecnico' : 'campo'));

  useEffect(() => {
    if (visible) {
      setActiveApp(initialApp || (user?.rol === 'SUPERADMIN' ? 'tecnico' : 'campo'));
    }
  }, [visible, initialApp, user]);

  const isTecnico = activeApp === 'tecnico';
  const apkFileName = isTecnico ? 'CowIA-Tecnico.apk' : 'CowIA-Campo.apk';
  const appTitle = isTecnico ? 'CowIA Técnico (Taller & IoT)' : 'CowIA Campo (Manga & Finca)';
  const appSubtitle = isTecnico 
    ? 'Herramienta de taller, alta de hatos, Bluetooth y diagnóstico de hardware' 
    : 'Gestión de potreros, vinculación rápida en manga en 2 toques, pesaje y rescate';

  // URL absoluta para descarga directa y código QR
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apkUrl = `${baseUrl}/apk/${apkFileName}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(apkUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(apkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const headerContent = (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
        isTecnico 
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/25' 
          : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25'
      }`}>
        {isTecnico ? <Wrench className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-display font-black text-lg text-white leading-none">
            {appTitle}
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
            isTecnico 
              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            Android APK
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{appSubtitle}</p>
      </div>
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={headerContent}
      className="w-full max-w-md mx-4"
      contentClassName="bg-[#0B1320] text-slate-100 border-x border-b border-white/10 rounded-b-2xl p-6"
      headerClassName="bg-[#0B1320] text-slate-100 border-t border-x border-white/10 rounded-t-2xl p-6"
      maskClassName="bg-black/75 backdrop-blur-sm"
      dismissableMask
    >
      <div className="space-y-4">
        
        {/* Selector de Aplicación */}
        <div className="flex p-1 bg-slate-950/80 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveApp('campo')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isTecnico
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>CowIA Campo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveApp('tecnico')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isTecnico
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>CowIA Técnico</span>
          </button>
        </div>

        {/* Botón Principal de Descarga Directa */}
        <div>
          <a
            href={`/apk/${apkFileName}`}
            download={apkFileName}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-200 cursor-pointer ${
              isTecnico
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30 hover:shadow-cyan-500/40 hover:-translate-y-0.5'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5'
            }`}
          >
            <Download className="w-5 h-5 animate-bounce" />
            <span>Descargar {apkFileName}</span>
          </a>
          <p className="text-[11px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1">
            <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Paquete APK para teléfonos y tabletas Android (Versión v1.0.2)</span>
          </p>
        </div>

        {/* Sección de Código QR para Celular */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-white/10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <QrCode className={`w-4 h-4 ${isTecnico ? 'text-cyan-400' : 'text-emerald-400'}`} />
            <span>Escanear con la cámara de tu celular</span>
          </div>

          <div className="p-2.5 bg-white rounded-xl shadow-md my-1">
            <img 
              src={qrApiUrl} 
              alt={`QR Descarga ${apkFileName}`}
              className="w-36 h-36 block rounded-lg"
              loading="lazy"
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Apunta la cámara de tu teléfono Android al código QR para iniciar la descarga directa.
          </p>
        </div>

        {/* Copiar enlace directo */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={apkUrl}
            className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Copiar enlace de descarga al portapapeles"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Opción Alternativa: Versión Web PWA */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-400">¿Deseas probarla sin instalar?</span>
          <a
            href={isTecnico ? "/iphone/CowIA_Tecnico_PWA_iPhone/" : "/app-campo.html"}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold inline-flex items-center gap-1 hover:underline ${
              isTecnico ? 'text-cyan-400' : 'text-emerald-400'
            }`}
          >
            <span>Abrir Web PWA</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Nota de Seguridad Android */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-white/5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <b>Instalación en Android:</b> Si el sistema te lo solicita, activa la opción <i>"Permitir instalar aplicaciones de fuentes desconocidas"</i> en tu navegador.
          </span>
        </div>

      </div>
    </Dialog>
  );
}
