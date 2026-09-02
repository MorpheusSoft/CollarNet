import { io } from 'socket.io-client';

let socket = null;

export function initSocket(onConnect, onTelemetry, onAlerta, onDisconnect) {
  if (socket) return socket;

  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
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
