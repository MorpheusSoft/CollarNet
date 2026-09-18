import { io } from 'socket.io-client';

let socket = null;

export function initSocket(onConnect, onTelemetry, onAlerta, onDisconnect, onGeocercasUpdate, onDataUpdate) {
  if (socket) return socket;

  const targetOrigin = (typeof window !== 'undefined' && window.location.port === '5173')
    ? `http://${window.location.hostname || '192.168.86.23'}:3500`
    : (typeof window !== 'undefined' ? window.location.origin : 'http://192.168.86.23:3500');

  socket = io(targetOrigin, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Conectado exitosamente');
    if (onConnect) onConnect(socket.id);
  });

  socket.on('telemetria_actualizada', (data) => {
    if (onTelemetry) onTelemetry(data);
  });

  socket.on('alerta_collar', (data) => {
    if (onAlerta) onAlerta(data);
  });

  socket.on('geocercas_actualizadas', (data) => {
    console.log('[Socket.io] Geocercas actualizadas en servidor:', data);
    if (onGeocercasUpdate) onGeocercasUpdate(data);
  });

  socket.on('datos_actualizados', (data) => {
    console.log('[Socket.io] Datos actualizados desde móvil/web:', data);
    if (onDataUpdate) onDataUpdate(data);
    if (onGeocercasUpdate) onGeocercasUpdate(data);
  });

  socket.on('disconnect', () => {
    console.warn('[Socket.io] Desconectado del servidor');
    if (onDisconnect) onDisconnect();
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
