import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { initMQTT } from './services/mqttService.js';
import pool from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno resolviendo backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const app = express();
const server = http.createServer(app);

// Inicializar Socket.io con CORS permitido para desarrollo frontend
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Compartir instancia de Socket.io en la aplicación Express
app.set('io', io);

// Middleware para procesar payloads JSON
app.use(express.json());

// Servir los archivos estáticos de producción compilados por Vite (React)
const distPath = path.join(__dirname, '../frontend/dist');
const rawFrontendPath = path.join(__dirname, '../frontend');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(rawFrontendPath));

// Servir descargas directas de APKs generados en la raíz del proyecto
const rootDir = path.join(__dirname, '..');
app.use('/apk', express.static(rootDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    }
  }
}));

// Servir versiones web / PWA para iPhone y alias directos
const iphoneAppsPath = path.join(__dirname, '../apps_para_iphone');
if (fs.existsSync(iphoneAppsPath)) {
  app.use('/iphone', express.static(iphoneAppsPath));
  app.use('/apps/tecnico', express.static(path.join(iphoneAppsPath, 'CowIA_Tecnico_PWA_iPhone')));
  app.use('/apps/finca', express.static(path.join(iphoneAppsPath, 'CowIA_Finca_PWA_iPhone')));
}

// Ruta amigable y moderna para ver y descargar APKs y PWAs desde el móvil
app.get('/descargas', (req, res) => {
  const host = req.get('host') || `192.168.86.23:${PORT}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <title>Portal de Aplicaciones - CowIA & CollarNet</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          background: #090d16; 
          color: #f1f5f9; 
          padding: 24px 16px 48px; 
          min-height: 100vh;
        }
        .container { max-width: 540px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { font-size: 0.95rem; color: #94a3b8; margin-top: 4px; }
        .ip-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          background: #1e293b; 
          border: 1px solid #334155; 
          padding: 6px 14px; 
          border-radius: 20px; 
          font-size: 0.8rem; 
          color: #38bdf8; 
          margin-top: 12px; 
        }
        .section-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #64748b;
          font-weight: 700;
          margin: 28px 0 12px 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card { 
          background: #131c2e; 
          border-radius: 16px; 
          padding: 20px; 
          margin-bottom: 16px; 
          border: 1px solid #1e293b; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          transition: transform 0.15s, border-color 0.15s;
        }
        .card:hover { border-color: #334155; }
        .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .icon-box { 
          width: 44px; 
          height: 44px; 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 1.4rem; 
          flex-shrink: 0;
        }
        .icon-finca { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
        .icon-ops { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
        .icon-web { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
        .card-title { font-size: 1.15rem; font-weight: 700; color: #f8fafc; }
        .card-desc { font-size: 0.85rem; color: #94a3b8; line-height: 1.4; margin-bottom: 16px; }
        .btn-group { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn { 
          flex: 1; 
          min-width: 140px; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px; 
          padding: 12px 16px; 
          border-radius: 10px; 
          font-weight: 600; 
          font-size: 0.9rem; 
          text-decoration: none; 
          transition: all 0.2s; 
          text-align: center;
        }
        .btn-apk-finca { background: #059669; color: white; }
        .btn-apk-finca:hover { background: #10b981; transform: translateY(-1px); }
        .btn-apk-ops { background: #0284c7; color: white; }
        .btn-apk-ops:hover { background: #38bdf8; transform: translateY(-1px); }
        .btn-ios { background: #1e293b; color: #f8fafc; border: 1px solid #475569; }
        .btn-ios:hover { background: #334155; border-color: #94a3b8; transform: translateY(-1px); }
        .btn-web { background: #4f46e5; color: white; width: 100%; }
        .btn-web:hover { background: #6366f1; transform: translateY(-1px); }
        .ios-tip { 
          background: rgba(30, 41, 59, 0.7); 
          border-left: 3px solid #38bdf8; 
          padding: 10px 14px; 
          border-radius: 0 8px 8px 0; 
          font-size: 0.78rem; 
          color: #cbd5e1; 
          margin-top: 12px; 
          line-height: 1.4;
        }
        .footer { text-align: center; margin-top: 32px; font-size: 0.8rem; color: #475569; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🐄 CowIA / CollarNet</div>
          <div class="subtitle">Ecosistema Móvil y Portal de Despliegue en Campo</div>
          <div class="ip-badge">🟢 Servidor: http://${host}</div>
        </div>

        <div class="section-title">📱 Aplicaciones Móviles Nativas & PWAs</div>

        <!-- Card CowIA Finca -->
        <div class="card">
          <div class="card-header">
            <div class="icon-box icon-finca">🤠</div>
            <div>
              <div class="card-title">CowIA Finca</div>
              <div style="font-size: 0.75rem; color: #10b981; font-weight: 600;">SUPERVISOR DE HATO & MANGA</div>
            </div>
          </div>
          <p class="card-desc">Subdivisión de potreros, modo arreo en vivo, pesaje ágil con báscula Bluetooth, brújula de rescate offline y alertas de celo/sanidad.</p>
          <div class="btn-group">
            <a class="btn btn-apk-finca" href="/apk/CowIA-Finca-Release.apk" download>🤖 Descargar APK (Android)</a>
            <a class="btn btn-ios" href="/iphone/CowIA_Finca_PWA_iPhone/" target="_blank">🍏 Abrir en iPhone / Safari</a>
          </div>
          <div class="ios-tip">💡 <b>En iPhone:</b> Abre el enlace en Safari, toca <b>Compartir</b> (<span style="font-size: 1rem;">􀈂</span>) y selecciona <b>"Añadir a pantalla de inicio"</b>.</div>
        </div>

        <!-- Card CowIA Ops -->
        <div class="card">
          <div class="card-header">
            <div class="icon-box icon-ops">🛠️</div>
            <div>
              <div class="card-title">CowIA Ops</div>
              <div style="font-size: 0.75rem; color: #38bdf8; font-weight: 600;">TÉCNICO & LABORATORIO</div>
            </div>
          </div>
          <p class="card-desc">Alta de hatos perimetrales maestros, suite de pruebas de hardware (GNSS/IMU/Shock), escaneo masivo de lotes y flasheo OTA.</p>
          <div class="btn-group">
            <a class="btn btn-apk-ops" href="/apk/CowIA-Tecnico-Release.apk" download>🤖 Descargar APK (Android)</a>
            <a class="btn btn-ios" href="/iphone/CowIA_Tecnico_PWA_iPhone/" target="_blank">🍏 Abrir en iPhone / Safari</a>
          </div>
          <div class="ios-tip">💡 <b>En iPhone:</b> Abre en Safari y selecciona <b>"Añadir a pantalla de inicio"</b> para usarla a pantalla completa.</div>
        </div>

        <div class="section-title">💻 Acceso Web Central</div>

        <!-- Card Dashboard Web -->
        <div class="card">
          <div class="card-header">
            <div class="icon-box icon-web">🌐</div>
            <div>
              <div class="card-title">Plataforma Web CowIA</div>
              <div style="font-size: 0.75rem; color: #818cf8; font-weight: 600;">PANEL DE CONTROL CENTRAL</div>
            </div>
          </div>
          <p class="card-desc">Monitoreo en tiempo real por WebSockets, diseño GIS de geocercas, telemetría de salud/rumia, reportes e inventario completo.</p>
          <a class="btn btn-web" href="/">💻 Abrir Dashboard Web</a>
        </div>

        <div class="footer">
          CowIA IoT & Virtual Fencing System &copy; 2026<br>
          Desarrollado para entornos de campo y alta exigencia ganadera
        </div>
      </div>
    </body>
    </html>
  `);
});

// Montar enrutador de la API REST
app.use('/api', apiRouter);

// Fallback para SPA en cualquier ruta no-API y no-móvil
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/iphone') || req.path.startsWith('/apps') || req.path.startsWith('/apk') || req.path.startsWith('/descargas')) {
    return next();
  }
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  const rawIndexHtml = path.join(rawFrontendPath, 'index.html');
  if (fs.existsSync(rawIndexHtml)) {
    return res.sendFile(rawIndexHtml);
  }
  next();
});

// Ruta base de estado de la API
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ONLINE', 
    service: 'CowIA IoT & Virtual Fences Platform', 
    timestamp: new Date().toISOString() 
  });
});

// Registrar conexiones de WebSockets para monitoreo en vivo
io.on('connection', (socket) => {
  // Nueva conexión del mapa web
  socket.on('disconnect', () => {
    // Desconexión
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // 1. Probar conexión física a la base de datos PostgreSQL
    try {
      await pool.query('SELECT 1;');
      console.log('✅ Base de datos PostgreSQL conectada exitosamente.');
    } catch (dbErr) {
      console.warn('⚠️ Aviso: PostgreSQL no está respondiendo en localhost:5432. Modo memoria/fallback activo.');
    }
    
    // 2. Arrancar conectividad MQTT y enlazar con Socket.io
    try {
      initMQTT(io);
    } catch (mqttErr) {
      console.warn('⚠️ Aviso MQTT:', mqttErr.message);
    }

    // 3. Encender servidor HTTP y escuchar conexiones
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(` Servidor CollarNet / CowIA Iniciado`);
      console.log(` Escuchando en: http://0.0.0.0:${PORT}`);
      console.log(` Acceso Local: http://localhost:${PORT}`);
      console.log(` Acceso Red Wi-Fi: http://192.168.86.23:${PORT}`);
      console.log(` Portal Descargas Móvil: http://192.168.86.23:${PORT}/descargas`);
      console.log(` Prefijo MQTT: ${process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano'}`);
      console.log(`=========================================`);
    });

  } catch (err) {
    console.error('[Server] Fallo crítico al iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
