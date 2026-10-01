import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Video, X, Maximize2, Minimize2, Split, Layout, Download, 
  Battery, MapPin, Radio, Eye, Sun, Moon, Settings, RefreshCw, AlertCircle,
  Play, StopCircle, Wifi, Cpu, Globe
} from 'lucide-react';
import { API_BASE } from '../services/apiService';

export default function CollarCameraViewer({
  animal,
  mode = 'split', // 'split' | 'floating' | 'fullscreen'
  onModeChange,
  onClose
}) {
  // Fuentes: 'remote' (Stream 4G Nube Sin Límite de Distancia) | 'esp32' (MJPEG Directo :81/stream de Waveshare) | 'device' (Webcam/USB)
  const [sourceType, setSourceType] = useState(() => {
    return (animal?.medio_red === 'WIFI' || animal?.net === 'WIFI' || animal?.ip) ? 'esp32' : 'remote';
  });
  const [esp32Ip, setEsp32Ip] = useState(() => {
    return animal?.ip || localStorage.getItem('collarnet_esp32_cam_ip') || window.location.hostname || '192.168.86.31';
  });

  useEffect(() => {
    if (animal?.ip && animal.ip !== esp32Ip) {
      setEsp32Ip(animal.ip);
      localStorage.setItem('collarnet_esp32_cam_ip', animal.ip);
    }
  }, [animal?.ip]);
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [isStreamingLocal, setIsStreamingLocal] = useState(false);

  // Referencias para video local y canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const localStreamRef = useRef(null);
  const broadcastTimerRef = useRef(null);

  // Floating PiP Drag state
  const [pipPos, setPipPos] = useState({ x: window.innerWidth - 480, y: window.innerHeight - 380 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const collarId = animal?.collar_id || 'COW-001';
  const arete = animal?.arete_visual || animal?.arete || 'VACA-001';
  const nombre = animal?.nombre || `Res ${arete}`;
  const potrero = animal?.potrero_nombre || animal?.potrero || 'Potrero Norte 1';
  const bateria = animal?.bateria !== undefined ? animal?.bateria : (animal?.nivel_bateria || 100);
  const lat = animal?.latitud || 10.671340;
  const lon = animal?.longitud || -71.604030;
  const alerta = animal?.alerta || animal?.estado_alerta || 'NORMAL';

  // URLs de transmisión
  const esp32StreamUrl = `http://${esp32Ip || '192.168.86.31'}:81/stream?t=${streamKey}`;
  const remoteStreamUrl = `${API_BASE}/collares/${collarId}/camera/stream?t=${streamKey}`;

  // 1. Listar dispositivos de cámara disponibles
  useEffect(() => {
    async function getCameras() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devices.filter(d => d.kind === 'videoinput');
          setDeviceList(videoDevs);
          if (videoDevs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevs[0].deviceId);
          }
        }
      } catch (err) {
        console.warn('No se pudieron listar cámaras:', err);
      }
    }
    getCameras();
  }, []);

  // 2. Control de cámara local si está seleccionada
  useEffect(() => {
    if (sourceType === 'device') {
      startDeviceCamera();
    } else {
      stopDeviceCamera();
    }

    return () => {
      stopDeviceCamera();
    };
  }, [sourceType, selectedDeviceId]);

  const startDeviceCamera = async () => {
    stopDeviceCamera();
    setStreamError(false);
    try {
      const constraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreamingLocal(true);
      startBroadcastingFrames();
    } catch (err) {
      console.warn('Permiso de cámara local denegado o no disponible:', err);
      setStreamError(true);
      setIsStreamingLocal(false);
    }
  };

  const stopDeviceCamera = () => {
    if (broadcastTimerRef.current) {
      clearInterval(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamingLocal(false);
  };

  const startBroadcastingFrames = () => {
    if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
    broadcastTimerRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 640, 360);
        
        canvas.toBlob((blob) => {
          if (blob) {
            fetch(`${API_BASE}/collares/${collarId}/camera/frame`, {
              method: 'POST',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob
            }).catch(() => {});
          }
        }, 'image/jpeg', 0.7);
      } catch (_) {}
    }, 400);
  };

  const handleSaveIp = (newIp) => {
    setEsp32Ip(newIp.trim());
    localStorage.setItem('collarnet_esp32_cam_ip', newIp.trim());
    setStreamKey(Date.now());
  };

  // Manejador para tomar foto / snapshot instantáneo
  const handleTakeSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      if (sourceType === 'device' && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Collar_${collarId}_${arete}_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const targetUrl = sourceType === 'esp32' 
          ? `http://${esp32Ip}:81/stream?t=${Date.now()}`
          : `${API_BASE}/collares/${collarId}/camera/snapshot?t=${Date.now()}`;
        const res = await fetch(targetUrl);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Collar_${collarId}_${arete}_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Error al capturar foto:', e);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Drag listeners para el modo Ventana Flotante (PiP)
  const handleMouseDown = (e) => {
    if (mode !== 'floating') return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pipPos.x,
      y: e.clientY - pipPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      setPipPos({
        x: Math.max(10, Math.min(window.innerWidth - 440, e.clientX - dragOffsetRef.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 300, e.clientY - dragOffsetRef.current.y))
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Clases según el modo de visualización
  let containerStyle = {};
  let containerClass = "relative bg-[#030712] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col";

  if (mode === 'split') {
    containerClass += " w-full h-full min-h-[440px]";
  } else if (mode === 'floating') {
    containerClass += " fixed z-50 w-[460px] h-[320px] cursor-move resize";
    containerStyle = { left: `${pipPos.x}px`, top: `${pipPos.y}px` };
  } else if (mode === 'fullscreen') {
    containerClass += " fixed inset-0 z-50 w-screen h-screen rounded-none border-none";
  }

  return (
    <div className={containerClass} style={containerStyle}>
      {/* Canvas oculto para capturas y relay */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Barra de Cabecera Superior del Visor */}
      <div 
        onMouseDown={handleMouseDown}
        className="px-3 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between select-none z-20"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-300 text-[10px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            <span>En Vivo</span>
          </div>
          <span className="text-xs font-black text-white flex items-center gap-1.5">
            <span>📷 {nombre}</span>
            <span className="text-cyan-400 font-mono text-[11px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {arete}
            </span>
          </span>
          <span className="hidden md:inline-block text-[10px] text-slate-300 font-mono bg-white/5 px-2 py-0.5 rounded">
            Collar: {collarId}
          </span>
        </div>

        {/* Botones de Control de la Cámara */}
        <div className="flex items-center gap-1">
          {/* Selector de Modo de Transmisión */}
          <button
            type="button"
            onClick={() => setSourceType(sourceType === 'esp32' ? 'remote' : (sourceType === 'remote' ? 'device' : 'esp32'))}
            className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-all"
            title="Cambiar fuente de video"
          >
            {sourceType === 'esp32' && <Cpu size={13} className="text-cyan-200" />}
            {sourceType === 'remote' && <Globe size={13} className="text-emerald-200" />}
            {sourceType === 'device' && <Video size={13} className="text-amber-200" />}
            <span className="hidden sm:inline">
              {sourceType === 'esp32' ? 'ESP32-S3 Directo' : (sourceType === 'remote' ? 'Stream 4G' : 'Cámara Local')}
            </span>
          </button>

          {/* Menú de Ajustes / Configuración de IP */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${showSettings ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            title="Configurar IP del ESP32 / Ajustes de Cámara"
          >
            <Settings size={14} />
          </button>

          {/* Toggle HUD */}
          <button
            type="button"
            onClick={() => setHudVisible(!hudVisible)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${hudVisible ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
            title="Mostrar/Ocultar HUD Telemetría"
          >
            <Eye size={14} />
          </button>

          {/* Toggle Visión Nocturna / Filtro */}
          <button
            type="button"
            onClick={() => setNightMode(!nightMode)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${nightMode ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'}`}
            title="Alternar Modo Visión Nocturna / IR"
          >
            {nightMode ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Botón Snapshot */}
          <button
            type="button"
            onClick={handleTakeSnapshot}
            disabled={snapshotLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Tomar y Descargar Foto Instantánea Real"
          >
            <Download size={14} />
          </button>

          {/* Selector de Modo: Split */}
          <button
            type="button"
            onClick={() => onModeChange && onModeChange('split')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${mode === 'split' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
            title="Modo Pantalla Dividida (Split)"
          >
            <Split size={14} />
          </button>

          {/* Selector de Modo: Ventana Flotante (PiP) */}
          <button
            type="button"
            onClick={() => onModeChange && onModeChange('floating')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${mode === 'floating' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
            title="Modo Ventana Flotante (Picture-in-Picture)"
          >
            <Layout size={14} />
          </button>

          {/* Selector de Modo: Pantalla Completa */}
          <button
            type="button"
            onClick={() => onModeChange && onModeChange(mode === 'fullscreen' ? 'split' : 'fullscreen')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${mode === 'fullscreen' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
            title="Pantalla Completa"
          >
            {mode === 'fullscreen' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Cerrar Visor */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors ml-1"
            title="Cerrar Cámara"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Menú de Ajustes / Configuración de IP Waveshare ESP32-S3 */}
      {showSettings && (
        <div className="absolute top-12 left-3 right-3 sm:right-auto sm:w-96 bg-slate-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-4 z-30 shadow-2xl space-y-3 text-xs text-white">
          <div className="font-bold text-sm text-cyan-400 flex items-center justify-between">
            <span>⚙️ Fuente de Video de la Cámara Waveshare</span>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Seleccionar Fuente:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSourceType('esp32')}
                className={`py-1.5 px-1 rounded-lg font-bold text-center border transition-all text-[11px] ${
                  sourceType === 'esp32' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800 border-white/10 text-slate-400'
                }`}
              >
                🚀 ESP32 (:81)
              </button>
              <button
                type="button"
                onClick={() => setSourceType('remote')}
                className={`py-1.5 px-1 rounded-lg font-bold text-center border transition-all text-[11px] ${
                  sourceType === 'remote' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-800 border-white/10 text-slate-400'
                }`}
              >
                📡 Stream 4G
              </button>
              <button
                type="button"
                onClick={() => setSourceType('device')}
                className={`py-1.5 px-1 rounded-lg font-bold text-center border transition-all text-[11px] ${
                  sourceType === 'device' ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-800 border-white/10 text-slate-400'
                }`}
              >
                📹 Cámara USB
              </button>
            </div>
          </div>

          {sourceType === 'esp32' && (
            <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
              <label className="text-slate-300 font-semibold flex items-center justify-between">
                <span>Dirección IP del ESP32-S3:</span>
                <span className="text-[10px] text-cyan-400 font-mono">:81/stream</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={esp32Ip}
                  onChange={(e) => handleSaveIp(e.target.value)}
                  placeholder="192.168.86.31 o 192.168.4.1"
                  className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setStreamKey(Date.now())}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs"
                >
                  Conectar
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                💡 Asegúrate de que el <strong>microinterruptor DIP 'CAM'</strong> en la parte trasera de la placa esté en <strong>'ON'</strong>.
              </p>
            </div>
          )}

          {sourceType === 'device' && (
            <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
              <label className="text-slate-300 font-semibold">Seleccionar Cámara del Sistema:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-400"
              >
                {deviceList.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Contenedor del Video en Vivo con HUD */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* 1. Modo ESP32 Directo (:81/stream - Waveshare Tracker) */}
        {sourceType === 'esp32' && (
          <img
            key={streamKey}
            src={esp32StreamUrl}
            alt={`Cámara Waveshare ESP32 ${collarId}`}
            className={`w-full h-full object-cover select-none transition-all duration-300 ${
              nightMode ? 'filter brightness-125 contrast-125 hue-rotate-90 saturate-200' : ''
            }`}
            onError={() => {
              setStreamError(true);
            }}
            onLoad={() => {
              setStreamError(false);
            }}
          />
        )}

        {/* 2. Modo Stream Remoto 4G / Wi-Fi */}
        {sourceType === 'remote' && (
          <img
            key={streamKey}
            src={remoteStreamUrl}
            alt={`Cámara Collar ${collarId}`}
            className={`w-full h-full object-cover select-none transition-all duration-300 ${
              nightMode ? 'filter brightness-125 contrast-125 hue-rotate-90 saturate-200' : ''
            }`}
          />
        )}

        {/* 3. Modo Cámara Local (Webcam / USB) */}
        {sourceType === 'device' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover select-none transition-all duration-300 ${
              nightMode ? 'filter brightness-125 contrast-125 hue-rotate-90 saturate-200' : ''
            }`}
          />
        )}

        {/* Overlay HUD Telemetría Superpuesta */}
        {hudVisible && !streamError && (
          <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between z-10 text-[11px] font-mono">
            {/* HUD Top Bar */}
            <div className="flex items-start justify-between">
              <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center gap-2">
                <span className="text-cyan-400 font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
                  {sourceType === 'esp32' ? 'WAVESHARE MJPEG :81' : (sourceType === 'remote' ? '4G LTE DIGITEL' : 'USB HD')}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-300 font-bold">POV COLLAR</span>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-white flex items-center gap-2">
                <Battery size={14} className={bateria > 20 ? "text-emerald-400" : "text-rose-400"} />
                <span className="font-bold">{bateria}%</span>
                <span className="text-slate-500">•</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  {alerta}
                </span>
              </div>
            </div>

            {/* HUD Central Mira Retícula */}
            <div className="self-center flex flex-col items-center opacity-30 hover:opacity-75 transition-opacity">
              <div className="w-16 h-16 border border-dashed border-cyan-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
              </div>
            </div>

            {/* HUD Bottom Bar */}
            <div className="flex items-end justify-between">
              <div className="px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-white space-y-0.5">
                <div className="text-emerald-300 font-bold flex items-center gap-1 text-xs">
                  <MapPin size={12} />
                  <span>{potrero}</span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  GPS: {lat?.toFixed(6)}, {lon?.toFixed(6)}
                </div>
              </div>

              <div className="px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-slate-300 text-[10px] text-right">
                <div className="text-cyan-400 font-bold">CowIA CollarNet Vision</div>
                <div className="text-slate-400 text-[9px]">{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback cuando el stream directo ESP32 está conectando o el switch CAM está en OFF */}
        {streamError && sourceType === 'esp32' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-30">
            <Radio className="text-cyan-400 mb-3 animate-pulse" size={42} />
            <div className="text-base font-bold text-white mb-1">Conectando con Cámara Waveshare ESP32-S3...</div>
            <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
              Intentando conectar al stream directo en <span className="text-cyan-300 font-mono">http://{esp32Ip}:81/stream</span>.
              <br /><br />
              💡 <strong>Comprobación rápida de hardware:</strong><br />
              1. Verifica que el <strong>microinterruptor DIP 'CAM'</strong> (en la parte trasera de la placa Waveshare) esté en posición <strong>'ON'</strong>.<br />
              2. Asegúrate de que la placa esté conectada a la misma red Wi-Fi o configurada con su IP correcta en el botón de ajustes (⚙️).
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setStreamKey(Date.now())}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/30"
              >
                <RefreshCw size={13} />
                Reintentar Conexión (:81)
              </button>
              <button
                type="button"
                onClick={() => setSourceType('remote')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all"
              >
                Usar Stream 4G
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center gap-1.5"
              >
                <Settings size={13} /> Cambiar IP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
