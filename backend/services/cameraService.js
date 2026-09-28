import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STANDBY_JPG_PATH = path.join(__dirname, '../assets/standby_camera.jpg');

let standbyJpgBuffer = null;
try {
  if (fs.existsSync(STANDBY_JPG_PATH)) {
    standbyJpgBuffer = fs.readFileSync(STANDBY_JPG_PATH);
  }
} catch (e) {
  console.warn('[CameraService] No se pudo cargar standby_camera.jpg:', e.message);
}

// Almacenamiento en memoria de fotogramas reales y flujos de video por collar
const latestFrames = new Map(); // collarId -> { buffer: Buffer, contentType: String, timestamp: Number }

/**
 * Guarda un fotograma real recibido desde el collar físico (vía HTTP POST, MQTT o Cámara de prueba)
 */
export function pushCollarFrame(collarId, frameBuffer, contentType = 'image/jpeg') {
  if (!collarId || !frameBuffer) return;
  latestFrames.set(String(collarId).toUpperCase(), {
    buffer: frameBuffer,
    contentType: contentType || 'image/jpeg',
    timestamp: Date.now()
  });
}

/**
 * Genera un fotograma SVG técnico de espera de señal de cámara
 */
export function generateCameraStandbyFrame(collarId, animalInfo = {}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-VE', { hour12: false });
  const dateStr = now.toISOString().slice(0, 10);
  
  const arete = animalInfo.arete_visual || animalInfo.arete || 'VACA-001';
  const nombre = animalInfo.nombre || `Res ${arete}`;
  const potrero = animalInfo.potrero_nombre || animalInfo.potrero || 'Potrero Norte 1';
  const bat = animalInfo.bateria !== undefined ? animalInfo.bateria : (animalInfo.nivel_bateria || 100);
  const lat = animalInfo.latitud || 10.671340;
  const lon = animalInfo.longitud || -71.604030;
  
  const width = 640;
  const height = 360;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#0b1320" />
        <stop offset="100%" stop-color="#020617" />
      </radialGradient>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      </pattern>
    </defs>

    <!-- Fondo Oscuro Profesional de Monitor de Video -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <rect width="${width}" height="${height}" fill="url(#grid)" />

    <!-- Retículas de Mira Telescópica Central -->
    <circle cx="320" cy="180" r="90" fill="none" stroke="rgba(16, 185, 129, 0.2)" stroke-width="1" stroke-dasharray="4,4" />
    <circle cx="320" cy="180" r="40" fill="none" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1.5" />
    <circle cx="320" cy="180" r="3" fill="#10b981" />
    
    <line x1="200" y1="180" x2="270" y2="180" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1.5" />
    <line x1="370" y1="180" x2="440" y2="180" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1.5" />
    <line x1="320" y1="60" x2="320" y2="130" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1.5" />
    <line x1="320" y1="230" x2="320" y2="300" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1.5" />

    <!-- Mensaje Central de Estado de Transmisión -->
    <rect x="140" y="152" width="360" height="56" rx="10" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5" />
    <text x="320" y="174" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="12" font-weight="bold">
      📡 TRANSMISIÓN DE CÁMARA BAJO DEMANDA
    </text>
    <text x="320" y="194" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">
      Collar: ${collarId} • Esperando fotogramas 4G/WiFi o Cámara Local
    </text>

    <!-- Overlay HUD Superior -->
    <rect x="12" y="12" width="616" height="34" rx="8" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" />
    <circle cx="28" cy="29" r="5" fill="#10b981">
      <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <text x="40" y="33" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">ENLACE ACTIVO</text>
    <text x="180" y="33" fill="#38bdf8" font-family="sans-serif" font-size="12" font-weight="bold">🐮 ${nombre} [${arete}]</text>
    <text x="420" y="33" fill="#94a3b8" font-family="monospace" font-size="11">COLLAR: ${collarId}</text>
    <text x="560" y="33" fill="#4ade80" font-family="monospace" font-size="11" font-weight="bold">🔋 ${bat}%</text>

    <!-- Overlay HUD Inferior -->
    <rect x="12" y="${height - 46}" width="616" height="34" rx="8" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" />
    <text x="24" y="${height - 25}" fill="#a7f3d0" font-family="sans-serif" font-size="11" font-weight="bold">🌱 ${potrero}</text>
    <text x="240" y="${height - 25}" fill="#cbd5e1" font-family="monospace" font-size="10">GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)}</text>
    <text x="470" y="${height - 25}" fill="#fbbf24" font-family="monospace" font-size="11">${dateStr} ${timeStr}</text>
  </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Obtiene el fotograma estático más reciente o el fotograma de espera
 */
export function getCollarSnapshot(collarId, animalInfo = {}) {
  const cleanId = String(collarId || '').toUpperCase();
  const frame = latestFrames.get(cleanId);
  if (frame && frame.buffer && (Date.now() - frame.timestamp < 30000)) {
    return {
      buffer: frame.buffer,
      contentType: frame.contentType || 'image/jpeg'
    };
  }
  if (standbyJpgBuffer) {
    return {
      buffer: standbyJpgBuffer,
      contentType: 'image/jpeg'
    };
  }
  return {
    buffer: generateCameraStandbyFrame(cleanId, animalInfo),
    contentType: 'image/svg+xml'
  };
}

/**
 * Transmite video en vivo multipart MJPEG continuo hacia un cliente HTTP (Web o Flutter)
 */
export function handleLiveStream(req, res, collarId, animalInfo = {}) {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'close',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });

  const cleanId = String(collarId || '').toUpperCase();
  let isAlive = true;

  const streamInterval = setInterval(() => {
    if (!isAlive) {
      clearInterval(streamInterval);
      return;
    }

    try {
      const snap = getCollarSnapshot(cleanId, animalInfo);
      const frameBuffer = snap.buffer;
      const contentType = snap.contentType;
      
      res.write(`--frame\r\n`);
      res.write(`Content-Type: ${contentType}\r\n`);
      res.write(`Content-Length: ${frameBuffer.length}\r\n\r\n`);
      res.write(frameBuffer);
      res.write(`\r\n`);
    } catch (e) {
      isAlive = false;
      clearInterval(streamInterval);
    }
  }, 150); // ~7 FPS estable y eficiente

  req.on('close', () => {
    isAlive = false;
    clearInterval(streamInterval);
  });
}
