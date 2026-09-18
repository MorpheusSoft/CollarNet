import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { 
  Wrench, 
  Download, 
  Smartphone, 
  ExternalLink, 
  QrCode, 
  Copy, 
  Check, 
  Crown, 
  ShieldCheck, 
  Info 
} from 'lucide-react';

export default function TecnicoDownloadModal({ visible, onHide }) {
  const [copied, setCopied] = useState(false);

  // Determinar la URL del servidor actual para que funcione tanto en localhost como por IP en red local
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '192.168.86.23';
  const currentPort = typeof window !== 'undefined' && window.location.port ? window.location.port : '3500';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  
  const baseUrl = `${protocol}//${currentHost}:${currentPort}`;
  const tecnicoUrl = `${baseUrl}/apps/tecnico/`;
  const apkUrl = `${baseUrl}/apk/CowIA-Tecnico-Release.apk`;
  const descargasUrl = `${baseUrl}/descargas`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(tecnicoUrl)}&bgcolor=0F172A&color=38BDF8&margin=1`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tecnicoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      modal
      dismissableMask
      header={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg text-white">App Técnica CowIA Ops</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-wide">
                <Crown className="w-3 h-3" /> SUPERADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Herramienta de campo, calibración y altas de hatos</p>
          </div>
        </div>
      }
      className="w-[95vw] max-w-[560px] p-0"
    >
      <div className="space-y-4 pt-2">
        
        {/* Banner Exclusivo */}
        <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 flex items-start gap-3 text-xs text-sky-200">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sky-100">Acceso Técnico Restringido: </span>
            Esta aplicación móvil permite el trazado de perímetros maestros, configuración directa de collares vía Bluetooth/4G y pruebas de choque/IMU en laboratorio.
          </div>
        </div>

        {/* Grid de Métodos de Acceso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Card 1: iPhone / iOS PWA */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-sky-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs">
                    🍏
                  </div>
                  <span className="text-sm font-bold text-white">iPhone & iPad</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                  Safari / PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Versión oficial optimizada para iOS con soporte táctil, GPS satelital y funcionamiento a pantalla completa.
              </p>
            </div>

            <a
              href={tecnicoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
            >
              <span>Abrir en iPhone / Safari</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 2: Android APK / PWA */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    🤖
                  </div>
                  <span className="text-sm font-bold text-white">Android</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
                  APK / Chrome
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Descarga directa del paquete APK o acceso PWA instalable para dispositivos Android y colectores industriales.
              </p>
            </div>

            <div className="space-y-2">
              <a
                href={apkUrl}
                download="CowIA-Tecnico-Release.apk"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar APK Android</span>
              </a>
              <a
                href={tecnicoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/5 transition-all"
              >
                <span>Abrir Web / PWA</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

        </div>

        {/* Sección Código QR & Enlace Directo */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
          <div className="p-2 rounded-lg bg-slate-900 border border-sky-500/30 shrink-0 shadow-md">
            <img 
              src={qrImageUrl} 
              alt="Código QR App Técnica" 
              className="w-24 h-24 rounded object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-white">
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>Escanea con la cámara de tu móvil</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Apunta la cámara de tu teléfono a este código QR para abrir e instalar la App Técnica al instante en tu dispositivo.
            </p>
            
            {/* Input con botón de copiar */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-sky-300 font-mono truncate select-all flex-1">
                {tecnicoUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Copiar enlace"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Centro General de Descargas */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            ¿Necesitas también la App de Finca / Supervisor?
          </span>
          <a
            href={descargasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Ver Portal Completo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </Dialog>
  );
}
