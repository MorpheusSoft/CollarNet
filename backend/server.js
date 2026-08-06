import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
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

// Middleware para procesar payloads JSON
app.use(express.json());

// Servir los archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Montar enrutador de la API REST
app.use('/api', apiRouter);

// Ruta base de estado de la API
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ONLINE', 
    service: 'CollarNet IoT Backend', 
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
    await pool.query('SELECT 1;');
    
    // 2. Arrancar conectividad MQTT y enlazar con Socket.io
    initMQTT(io);

    // 3. Encender servidor HTTP y escuchar conexiones
    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(` Servidor CollarNet Iniciado Exitosamente`);
      console.log(` Escuchando en el Puerto: http://localhost:${PORT}`);
      console.log(` Prefijo MQTT Tópico: ${process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano'}`);
      console.log(`=========================================`);
    });

  } catch (err) {
    console.error('[Server] Fallo crítico al iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
