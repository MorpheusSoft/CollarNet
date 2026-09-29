import net from 'net';
import { processTelemetryPayload, publishTelemetry } from './mqttService.js';
import pool from '../config/db.js';

/**
 * Cálculo de CRC-ITU (X.25) para paquetes del protocolo GT06.
 * Polinomio: 0x8408 (invertido de 0x1021)
 */
function crc16_itu(buffer) {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0x8408;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return (~crc) & 0xFFFF;
}

/**
 * Genera el paquete de respuesta ACK para protocolo binario GT06.
 * Estructura: 0x78 0x78 | Longitud (0x05) | Protocolo | Serial (2B) | CRC (2B) | 0x0D 0x0A
 */
function createGt06Ack(protocolNumber, serialNumber) {
  const len = 0x05;
  const payload = Buffer.from([
    len,
    protocolNumber,
    (serialNumber >> 8) & 0xFF,
    serialNumber & 0xFF
  ]);
  const crc = crc16_itu(payload);
  return Buffer.from([
    0x78, 0x78,
    len,
    protocolNumber,
    (serialNumber >> 8) & 0xFF,
    serialNumber & 0xFF,
    (crc >> 8) & 0xFF,
    crc & 0xFF,
    0x0D, 0x0A
  ]);
}

/**
 * Convierte un buffer BCD a cadena numérica (para extraer IMEI / ID de terminal).
 */
function bcdToString(buffer) {
  let result = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const high = (byte >> 4) & 0x0F;
    const low = byte & 0x0F;
    if (high <= 9) result += high.toString();
    if (low <= 9) result += low.toString();
  }
  return result;
}

/**
 * Inicializa el servidor TCP en el puerto 7700 para receptar collares comerciales.
 * @param {Object} io - Instancia del servidor de WebSockets de Socket.io
 */
export function initTrackerTcpService(io) {
  const PORT = parseInt(process.env.TRACKER_TCP_PORT || '7700', 10);
  const HOST = '0.0.0.0';

  const server = net.createServer((socket) => {
    const clientKey = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[TCP Tracker] Nueva conexión entrante desde: ${clientKey}`);

    // Contexto de sesión para el socket
    let terminalId = null;
    let rxBuffer = Buffer.alloc(0);

    socket.on('data', async (chunk) => {
      rxBuffer = Buffer.concat([rxBuffer, chunk]);

      try {
        // ----------------------------------------------------
        // CASO 1: Protocolo Binario GT06 / Concox (0x78 0x78 o 0x79 0x79)
        // ----------------------------------------------------
        while (rxBuffer.length >= 5) {
          // Buscar cabecera GT06
          let startIdx = -1;
          for (let i = 0; i < rxBuffer.length - 1; i++) {
            if ((rxBuffer[i] === 0x78 && rxBuffer[i + 1] === 0x78) ||
                (rxBuffer[i] === 0x79 && rxBuffer[i + 1] === 0x79)) {
              startIdx = i;
              break;
            }
          }

          if (startIdx === -1) {
            break; // No hay cabecera binaria, verificar si es ASCII más abajo
          }

          if (startIdx > 0) {
            rxBuffer = rxBuffer.slice(startIdx);
          }

          const isExtended = (rxBuffer[0] === 0x79 && rxBuffer[1] === 0x79);
          const headerLen = isExtended ? 4 : 3; // 78 78 len (3B) o 79 79 len_h len_l (4B)
          
          if (rxBuffer.length < headerLen) break;

          const packetDataLen = isExtended 
            ? rxBuffer.readUInt16BE(2) 
            : rxBuffer.readUInt8(2);

          const fullPacketLen = headerLen + packetDataLen + 2; // +2 por 0x0D 0x0A

          if (rxBuffer.length < fullPacketLen) {
            break; // Esperar más bytes del buffer TCP
          }

          const packet = rxBuffer.slice(0, fullPacketLen);
          rxBuffer = rxBuffer.slice(fullPacketLen);

          const protocolNum = isExtended ? packet[4] : packet[3];
          console.log(`[TCP Tracker GT06] Paquete 0x${protocolNum.toString(16).padStart(2, '0').toUpperCase()} (${packet.length} bytes) de ${clientKey}:`, packet.toString('hex'));

          // A. Paquete de Login (0x01)
          if (protocolNum === 0x01) {
            // Bytes 4..11: Terminal ID (8 bytes BCD)
            const idBytes = packet.slice(4, 12);
            let rawId = bcdToString(idBytes);
            // Quitar ceros a la izquierda para emparejar con el ID de 10 dígitos (ej. 8081421526)
            terminalId = rawId.replace(/^0+/, '') || rawId;
            socket.terminalId = terminalId;

            // Extraer serial de 2 bytes (antes del CRC y 0x0D 0x0A)
            const serialOffset = packet.length - 6;
            const serial = packet.readUInt16BE(serialOffset);

            console.log(`[TCP Tracker] Login exitoso para collar ID: ${terminalId} (Serial: ${serial})`);
            const ack = createGt06Ack(0x01, serial);
            socket.write(ack);
            console.log(`[TCP Tracker] Enviado Login ACK:`, ack.toString('hex'));

            // Auto-registro en DB si no existe
            try {
              await pool.query(`
                INSERT INTO collares (id, numero_sim, imei, numero_serie, estado, activo, nivel_bateria, senal_celular, version_firmware, fecha_instalacion)
                VALUES ($1, $2, $3, $4, 'ACTIVO', true, 100, 5, 'F10_A7670SA_LASA', CURRENT_DATE)
                ON CONFLICT (id) DO NOTHING;
              `, [terminalId, `SIM-${terminalId}`, terminalId, terminalId]);
            } catch (_) {}
          }
          // B. Paquete de Posición GPS (0x12 o 0x22)
          else if (protocolNum === 0x12 || protocolNum === 0x22) {
            const dateOffset = 4;
            const year = 2000 + packet[dateOffset];
            const month = packet[dateOffset + 1];
            const day = packet[dateOffset + 2];
            const hour = packet[dateOffset + 3];
            const min = packet[dateOffset + 4];
            const sec = packet[dateOffset + 5];

            const satCount = packet[dateOffset + 6] & 0x0F;
            const rawLat = packet.readUInt32BE(dateOffset + 7);
            const rawLon = packet.readUInt32BE(dateOffset + 11);
            const speed = packet[dateOffset + 15]; // km/h

            const courseStatus = packet.readUInt16BE(dateOffset + 16);
            const isGpsFix = Boolean(courseStatus & 0x1000);
            const isWest = Boolean(courseStatus & 0x0800);
            const isNorth = Boolean(courseStatus & 0x0400);
            const course = courseStatus & 0x03FF;

            let lat = rawLat / 1800000.0;
            let lon = rawLon / 1800000.0;
            if (!isNorth) lat = -lat;
            if (isWest) lon = -lon;

            // Validar coordenadas razonables
            if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)) {
              console.log(`[TCP Tracker GPS] Collar: ${terminalId || clientKey} -> Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)} | Vel: ${speed} km/h | Sats: ${satCount} | Fecha: ${year}-${month}-${day} ${hour}:${min}:${sec}`);
              
              const telemetry = {
                lat,
                lon,
                speed,
                sats: satCount,
                gps_fix: isGpsFix,
                gps_pwr: true,
                net: '4G LTE',
                collar_id: terminalId || '8081421526'
              };

              if (terminalId) {
                await processTelemetryPayload(io, terminalId, telemetry);
                publishTelemetry(terminalId, telemetry);
              }
            }
          }
          // C. Paquete de Heartbeat / Estado de Batería y Red (0x13)
          else if (protocolNum === 0x13) {
            const terminalInfo = packet[4];
            const voltageLevel = packet[5];
            const gsmSignal = packet[6];

            // Conversión de nivel de voltaje de batería (0-6) a porcentaje
            let batteryPct = 100;
            if (voltageLevel <= 6) {
              const batteryMap = [0, 10, 25, 45, 65, 85, 100];
              batteryPct = batteryMap[voltageLevel] || 100;
            } else {
              batteryPct = Math.min(100, Math.max(0, voltageLevel));
            }

            const serialOffset = packet.length - 6;
            const serial = packet.readUInt16BE(serialOffset);

            console.log(`[TCP Tracker Heartbeat] Collar: ${terminalId || clientKey} | Bat: ${batteryPct}% (Nivel ${voltageLevel}) | CSQ: ${gsmSignal}`);
            const ack = createGt06Ack(0x13, serial);
            socket.write(ack);

            if (terminalId) {
              const statusTelemetry = {
                battery: batteryPct,
                signal: Math.min(5, Math.max(1, Math.round(gsmSignal / 6))),
                csq: gsmSignal,
                net: '4G LTE',
                collar_id: terminalId
              };
              await processTelemetryPayload(io, terminalId, statusTelemetry);
              publishTelemetry(terminalId, statusTelemetry);
            }
          }
          // D. Paquete de Alarma (0x16 o 0x26)
          else if (protocolNum === 0x16 || protocolNum === 0x26) {
            const serialOffset = packet.length - 6;
            const serial = packet.readUInt16BE(serialOffset);
            console.log(`[TCP Tracker ALARMA] Alarma reportada por collar: ${terminalId || clientKey}`);
            const ack = createGt06Ack(protocolNum, serial);
            socket.write(ack);
          }
        }

        // ----------------------------------------------------
        // CASO 2: Protocolo de Texto ASCII TK103: (ID...COMMAND...)
        // ----------------------------------------------------
        const rawStr = rxBuffer.toString('utf8');
        const asciiMatches = rawStr.match(/\(([^\)]+)\)/g);
        if (asciiMatches && asciiMatches.length > 0) {
          for (const match of asciiMatches) {
            const content = match.replace(/[()]/g, '');
            console.log(`[TCP Tracker ASCII TK103]: ${content}`);

            // Formato típico TK103: 08081421526BP050000...
            const idMatch = content.match(/^(\d{10,12})/);
            if (idMatch) {
              terminalId = idMatch[1].replace(/^0+/, '');
              socket.terminalId = terminalId;

              // Responder ACK según comando
              if (content.includes('BP05') || content.includes('BP00')) {
                // Login ACK
                socket.write(`(${idMatch[1]}AP05)`);
                console.log(`[TCP Tracker TK103] Enviado Login ACK a ${terminalId}`);
              } else if (content.includes('BR00')) {
                // Location ACK
                socket.write(`(${idMatch[1]}AR00)`);
              }
            }
          }
          // Limpiar el texto procesado
          rxBuffer = Buffer.alloc(0);
        }

        // ----------------------------------------------------
        // CASO 3: Trama de texto con etiquetas (Starry GPS / Formato texto directo)
        // Ej: lat:22.695768,lon:114.371173,bat:100%,ID:8081421526
        // ----------------------------------------------------
        if (rawStr.includes('lat:') || rawStr.includes('ID:')) {
          const latMatch = rawStr.match(/lat[:=]([-+]?\d+\.\d+)/i);
          const lonMatch = rawStr.match(/lon[:=]([-+]?\d+\.\d+)/i);
          const idMatch = rawStr.match(/ID[:=](\d+)/i);
          const batMatch = rawStr.match(/bat[:=](\d+)%/i);

          if (idMatch) terminalId = idMatch[1];
          if (latMatch && lonMatch && terminalId) {
            const lat = parseFloat(latMatch[1]);
            const lon = parseFloat(lonMatch[1]);
            const battery = batMatch ? parseInt(batMatch[1], 10) : 100;
            console.log(`[TCP Tracker Texto] Collar ${terminalId} -> Lat: ${lat}, Lon: ${lon}, Bat: ${battery}%`);
            await processTelemetryPayload(io, terminalId, { lat, lon, battery, net: '4G LTE' });
          }
          rxBuffer = Buffer.alloc(0);
        }

      } catch (err) {
        console.error(`[TCP Tracker] Error decodificando paquete de ${clientKey}:`, err);
      }
    });

    socket.on('close', () => {
      console.log(`[TCP Tracker] Conexión cerrada con: ${clientKey} (Collar: ${socket.terminalId || 'N/A'})`);
    });

    socket.on('error', (err) => {
      console.warn(`[TCP Tracker] Error en socket ${clientKey}:`, err.message);
    });

    // Timeout de inactividad de 5 minutos
    socket.setTimeout(300000, () => {
      console.log(`[TCP Tracker] Timeout de inactividad en ${clientKey}. Cerrando conexión.`);
      socket.end();
    });
  });

  server.on('error', (err) => {
    console.error(`[TCP Tracker] Error en servidor TCP puerto ${PORT}:`, err);
  });

  server.listen(PORT, HOST, () => {
    console.log(`=========================================`);
    console.log(` 📡 Servidor Receptor TCP para Collares GPS`);
    console.log(` Escuchando en: ${HOST}:${PORT} (TCP)`);
    console.log(` Soporte: Protocolos GT06 / TK103 / F10`);
    console.log(`=========================================`);
  });

  return server;
}
