import net from 'net';
import dgram from 'dgram';
import { processTelemetryPayload, publishTelemetry } from './mqttService.js';
import pool from '../config/db.js';

/** Mapa de sockets TCP activos para enviar comandos directos a los collares */
const activeClients = new Map(); // collarId -> { socket, vendor, lastSeen }

/**
 * Genera un comando o respuesta en protocolo 3G / Wonlex / Topin / Starry.
 * Estructura: [Vendor*CollarID*HexLen*Command]
 */
export function create3GCommand(vendor = '3G', collarId, commandString) {
  const hexLen = commandString.length.toString(16).toUpperCase().padStart(4, '0');
  return `[${vendor}*${collarId}*${hexLen}*${commandString}]`;
}

/**
 * Envía un comando directo a un collar conectado vía TCP.
 */
export function sendCommandToCollar(collarId, commandString) {
  const client = activeClients.get(collarId);
  if (!client || !client.socket || client.socket.destroyed) {
    console.warn(`[3G Tracker] No hay conexión TCP activa para el collar ${collarId}`);
    return false;
  }
  const cmd = create3GCommand(client.vendor || '3G', collarId, commandString);
  client.socket.write(cmd);
  console.log(`[3G Tracker] Comando enviado a ${collarId}: ${cmd}`);
  return true;
}

/**
 * Cálculo de CRC-ITU (X.25) para paquetes del protocolo GT06.
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
 * Genera paquete ACK para protocolo binario GT06.
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
 * Convierte buffer BCD a string.
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
 * Procesa un búfer de datos entrante (TCP o UDP).
 */
async function processTrackerBuffer(rxBuffer, clientKey, replyFn, sessionState, io, transport = 'TCP') {
  let modified = false;

  // =========================================================================
  // CASO 1: Protocolo 3G / Wonlex / Topin / Starry GPS: [Vendor*ID*Len*Data]
  // =========================================================================
  const rawStr = rxBuffer.toString('utf8');
  if (rawStr.includes('[') && rawStr.includes(']')) {
    const regex3G = /\[([A-Z0-9]{2,4})\*(\d+)\*([0-9A-Fa-f]{4})\*([^\]]+)\]/g;
    let match3G;

    while ((match3G = regex3G.exec(rawStr)) !== null) {
      const vendor = match3G[1];
      const collarId = match3G[2];
      const hexLen = match3G[3];
      const content = match3G[4];

      sessionState.terminalId = collarId;
      sessionState.vendor = vendor;
      modified = true;

      console.log(`[${transport} Tracker 3G] Collar ${collarId} (${vendor}) -> Comando: ${content}`);

      // Auto-registrar en BD
      try {
        await pool.query(`
          INSERT INTO collares (id, numero_sim, imei, numero_serie, estado, activo, nivel_bateria, senal_celular, version_firmware, fecha_instalacion, tenant_id)
          VALUES ($1, $2, $3, $4, 'ACTIVO', true, 100, 5, 'F10_A7670SA_LASA', CURRENT_DATE, (SELECT id FROM tenants ORDER BY id ASC LIMIT 1))
          ON CONFLICT (id) DO UPDATE SET ultima_conexion = NOW();
        `, [collarId, '04122684691', collarId, collarId]);
      } catch (_) {}

      // A. Identificación de Tarjeta SIM (CCID)
      if (content.startsWith('CCID')) {
        const parts = content.split(',');
        const iccid = parts[1] || '';
        console.log(`[${transport} Tracker 3G] 💳 ICCID detectado: ${iccid} para collar ${collarId}`);
        try {
          await pool.query(`
            UPDATE collares 
            SET imei = $1, numero_serie = $1, ultima_conexion = NOW() 
            WHERE id = $2;
          `, [iccid, collarId]);
        } catch (_) {}

        // Enviar configuración de reporte rápido (60s) y solicitar posición inmediata (CR)
        setTimeout(() => {
          const cmdUpload = create3GCommand(vendor, collarId, 'UPLOAD,60');
          replyFn(Buffer.from(cmdUpload));
          console.log(`[${transport} Tracker 3G] ⚡ Enviado UPLOAD 60s a ${collarId}: ${cmdUpload}`);
        }, 500);

        setTimeout(() => {
          const cmdCr = create3GCommand(vendor, collarId, 'CR');
          replyFn(Buffer.from(cmdCr));
          console.log(`[${transport} Tracker 3G] 📍 Enviado comando CR (Solicitud de Ubicación) a ${collarId}: ${cmdCr}`);
        }, 1500);
      }
      // B. Información de Celda / Antena Móvil LBS (GS1 o GSM)
      else if (content.startsWith('GS1') || content.startsWith('GSM')) {
        const parts = content.split(',');
        // Formato: GS1,flag,wifiCount,mcc,mnc,lac,cellId,rssi
        const mcc = parts[3];
        const mnc = parts[4];
        const lac = parts[5];
        const cellId = parts[6];
        console.log(`[${transport} Tracker 3G] 📶 Torre Celular: MCC:${mcc} MNC:${mnc} LAC:${lac} CID:${cellId}`);

        const statusTelemetry = {
          collar_id: collarId,
          collarId: collarId,
          net: '4G LTE (Digitel)',
          csq: 18,
          signal: 4,
          battery: 100,
          lat: 10.0647, // Barquisimeto aproximado por LAC/CID Digitel mientras fija GPS
          lon: -69.3570,
          gps_fix: false,
          gps_pwr: true
        };
        await processTelemetryPayload(io, collarId, statusTelemetry);
        publishTelemetry(collarId, statusTelemetry);

        // Pedir reporte GPS
        setTimeout(() => {
          const cmdCr = create3GCommand(vendor, collarId, 'CR');
          replyFn(Buffer.from(cmdCr));
        }, 800);
      }
      // C. Latido / Heartbeat y Batería (LK)
      else if (content.startsWith('LK')) {
        console.log(`[${transport} Tracker 3G] ❤️ Heartbeat recibido de ${collarId}`);
        const parts = content.split(',');
        let battery = 100;
        for (let p of parts) {
          const num = parseInt(p, 10);
          if (!isNaN(num) && num > 10 && num <= 100) {
            battery = num;
          }
        }

        // ACK obligatorio para responder al heartbeat del collar
        const lkAck = create3GCommand(vendor, collarId, 'LK');
        replyFn(Buffer.from(lkAck));
        console.log(`[${transport} Tracker 3G] Enviado ACK LK a ${collarId}: ${lkAck}`);

        const statusTelemetry = {
          collar_id: collarId,
          collarId: collarId,
          battery,
          net: '4G LTE (Digitel)',
          signal: 5
        };
        await processTelemetryPayload(io, collarId, statusTelemetry);
        publishTelemetry(collarId, statusTelemetry);
      }
      // D. Reporte de Ubicación GPS (UD o UD2)
      else if (content.startsWith('UD') || content.startsWith('UD2')) {
        // Formato: UD,DDMMYY,HHMMSS,status,lat,NS,lon,EW,speed,course,alt,sats,gsmSig,batPct,...
        const parts = content.split(',');
        const dateStr = parts[1];
        const timeStr = parts[2];
        const status = parts[3]; // 'A' = FIX satelital válido, 'V' = sin fix / bajo techo
        let lat = parseFloat(parts[4]);
        const ns = parts[5];
        let lon = parseFloat(parts[6]);
        const ew = parts[7];
        const speed = parseFloat(parts[8]) || 0;
        const course = parseFloat(parts[9]) || 0;
        const alt = parseFloat(parts[10]) || 0;
        const sats = parseInt(parts[11], 10) || 0;
        const gsmSignal = parseInt(parts[12], 10) || 50;
        const bat = parseInt(parts[13], 10) || 100;

        const isFix = (status === 'A' && !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0));
        if (isFix) {
          if (ns === 'S' || ns === 's') lat = -lat;
          if (ew === 'W' || ew === 'w') lon = -lon;
          console.log(`[${transport} Tracker 3G GPS] 🎯 Collar ${collarId} -> Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)} | Fix: SÍ | Sats: ${sats} | Bat: ${bat}%`);
        } else {
          console.log(`[${transport} Tracker 3G GPS] 🏠 Collar ${collarId} en interiores (Sin FIX GPS aún) | Sats: ${sats} | Señal: ${gsmSignal}% | Bat: ${bat}%`);
        }

        const telemetry = {
          collar_id: collarId,
          collarId: collarId,
          sats,
          gps_fix: isFix,
          gps_pwr: true,
          battery: bat,
          signal: Math.min(5, Math.max(1, Math.round(gsmSignal / 20))),
          csq: Math.round(gsmSignal / 3.2),
          net: '4G LTE (Digitel)'
        };

        if (isFix) {
          telemetry.lat = lat;
          telemetry.lon = lon;
          telemetry.speed = Math.round(speed * 1.852);
        }

        await processTelemetryPayload(io, collarId, telemetry);
        publishTelemetry(collarId, telemetry);
      }
      // E. Alarma (AL)
      else if (content.startsWith('AL')) {
        console.log(`[${transport} Tracker 3G ALARMA] 🚨 Alerta de collar ${collarId}: ${content}`);
        const alAck = create3GCommand(vendor, collarId, 'AL');
        replyFn(Buffer.from(alAck));
      }
      // F. Respuestas del collar a comandos UPLOAD o CR
      else {
        console.log(`[${transport} Tracker 3G Respuesta] Collar ${collarId}: ${content}`);
      }
    }

    // Limpiar tramas 3G procesadas del búfer
    const cleanedStr = rawStr.replace(/\[[A-Z0-9]{2,4}\*\d+\*[0-9A-Fa-f]{4}\*[^\]]+\]/g, '');
    rxBuffer = Buffer.from(cleanedStr, 'utf8');
  }

  // =========================================================================
  // CASO 2: Protocolo Binario GT06 / Concox (0x78 0x78 o 0x79 0x79)
  // =========================================================================
  while (rxBuffer.length >= 5) {
    let startIdx = -1;
    for (let i = 0; i < rxBuffer.length - 1; i++) {
      if ((rxBuffer[i] === 0x78 && rxBuffer[i + 1] === 0x78) ||
          (rxBuffer[i] === 0x79 && rxBuffer[i + 1] === 0x79)) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) break;

    if (startIdx > 0) {
      rxBuffer = rxBuffer.slice(startIdx);
    }

    const isExtended = (rxBuffer[0] === 0x79 && rxBuffer[1] === 0x79);
    const headerLen = isExtended ? 4 : 3;
    
    if (rxBuffer.length < headerLen) break;

    const packetDataLen = isExtended 
      ? rxBuffer.readUInt16BE(2) 
      : rxBuffer.readUInt8(2);

    const fullPacketLen = headerLen + packetDataLen + 2;

    if (rxBuffer.length < fullPacketLen) break;

    const packet = rxBuffer.slice(0, fullPacketLen);
    rxBuffer = rxBuffer.slice(fullPacketLen);
    modified = true;

    const protocolNum = isExtended ? packet[4] : packet[3];
    console.log(`[${transport} Tracker GT06] Paquete 0x${protocolNum.toString(16).padStart(2, '0').toUpperCase()} (${packet.length} B) de ${clientKey}:`, packet.toString('hex'));

    // A. Login GT06 (0x01)
    if (protocolNum === 0x01) {
      const idBytes = packet.slice(4, 12);
      let rawId = bcdToString(idBytes);
      let termId = rawId.replace(/^0+/, '') || rawId;
      if (rawId.includes('8081421526')) termId = '8081421526';
      sessionState.terminalId = termId;

      const serialOffset = packet.length - 6;
      const serial = packet.readUInt16BE(serialOffset);

      console.log(`[${transport} Tracker GT06] Login exitoso para collar ID: ${termId} (Serial: ${serial})`);
      const ack = createGt06Ack(0x01, serial);
      replyFn(ack);

      try {
        await pool.query(`
          INSERT INTO collares (id, numero_sim, imei, numero_serie, estado, activo, nivel_bateria, senal_celular, version_firmware, fecha_instalacion, tenant_id)
          VALUES ($1, $2, $3, $4, 'ACTIVO', true, 100, 5, 'F10_A7670SA_LASA', CURRENT_DATE, (SELECT id FROM tenants ORDER BY id ASC LIMIT 1))
          ON CONFLICT (id) DO NOTHING;
        `, [termId, '04122684691', termId, termId]);
      } catch (_) {}
    }
    // B. Posición GPS (0x12 o 0x22)
    else if (protocolNum === 0x12 || protocolNum === 0x22) {
      const dateOffset = 4;
      const satCount = packet[dateOffset + 6] & 0x0F;
      const rawLat = packet.readUInt32BE(dateOffset + 7);
      const rawLon = packet.readUInt32BE(dateOffset + 11);
      const speed = packet[dateOffset + 15];

      const courseStatus = packet.readUInt16BE(dateOffset + 16);
      const isGpsFix = Boolean(courseStatus & 0x1000);
      const isWest = Boolean(courseStatus & 0x0800);
      const isNorth = Boolean(courseStatus & 0x0400);

      let lat = rawLat / 1800000.0;
      let lon = rawLon / 1800000.0;
      if (!isNorth) lat = -lat;
      if (isWest) lon = -lon;

      const collarId = sessionState.terminalId || '8081421526';
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)) {
        console.log(`[${transport} Tracker GT06 GPS] Collar: ${collarId} -> Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)} | Vel: ${speed} km/h | Fix: ${isGpsFix}`);
        const telemetry = {
          collar_id: collarId,
          collarId: collarId,
          lat,
          lon,
          speed,
          sats: satCount,
          gps_fix: isGpsFix,
          gps_pwr: true,
          net: '4G LTE (Digitel)'
        };
        await processTelemetryPayload(io, collarId, telemetry);
        publishTelemetry(collarId, telemetry);
      }
    }
    // C. Heartbeat GT06 (0x13)
    else if (protocolNum === 0x13) {
      const serialOffset = packet.length - 6;
      const serial = packet.readUInt16BE(serialOffset);
      const ack = createGt06Ack(0x13, serial);
      replyFn(ack);
    }
  }

  // Si no se reconoció nada y el búfer supera 2 KB, limpiar
  if (!modified && rxBuffer.length > 2048) {
    rxBuffer = Buffer.alloc(0);
  }

  return rxBuffer;
}

/**
 * Inicializa el servidor TCP y UDP en el puerto 7700 para recibir telemetría de collares de ganado.
 */
export function initTrackerTcpService(io) {
  const PORT = parseInt(process.env.TRACKER_TCP_PORT || '7700', 10);
  const HOST = '0.0.0.0';

  // ==========================================
  // 1. SERVIDOR TCP (Puerto 7700)
  // ==========================================
  const tcpServer = net.createServer((socket) => {
    const clientKey = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[TCP Tracker] 🟢 Nueva conexión entrante desde: ${clientKey}`);
    socket.setKeepAlive(true, 30000);

    const sessionState = { terminalId: null, vendor: '3G' };
    let rxBuffer = Buffer.alloc(0);

    socket.on('data', async (chunk) => {
      console.log(`[TCP Tracker RAW] ${chunk.length} B de ${clientKey}: [HEX: ${chunk.toString('hex')}] [TXT: ${chunk.toString('utf8').replace(/[^\x20-\x7E]/g, '.')}]`);
      rxBuffer = Buffer.concat([rxBuffer, chunk]);

      try {
        rxBuffer = await processTrackerBuffer(
          rxBuffer, 
          clientKey, 
          (replyBuf) => socket.write(replyBuf), 
          sessionState, 
          io, 
          'TCP'
        );

        if (sessionState.terminalId) {
          socket.terminalId = sessionState.terminalId;
          activeClients.set(sessionState.terminalId, {
            socket,
            vendor: sessionState.vendor || '3G',
            lastSeen: new Date()
          });
        }
      } catch (err) {
        console.error(`[TCP Tracker] Error procesando paquete de ${clientKey}:`, err);
      }
    });

    socket.on('close', () => {
      console.log(`[TCP Tracker] 🔴 Conexión cerrada con: ${clientKey} (Collar: ${socket.terminalId || 'N/A'})`);
      if (socket.terminalId) {
        activeClients.delete(socket.terminalId);
      }
    });

    socket.on('error', (err) => {
      console.warn(`[TCP Tracker] Error en socket ${clientKey}:`, err.message);
    });

    // Timeout de inactividad de 15 minutos
    socket.setTimeout(900000, () => {
      console.log(`[TCP Tracker] Timeout de inactividad en ${clientKey}. Cerrando socket.`);
      socket.end();
    });
  });

  tcpServer.on('error', (err) => {
    console.error(`[TCP Tracker] Error en servidor TCP puerto ${PORT}:`, err);
  });

  tcpServer.listen(PORT, HOST, () => {
    console.log(`=========================================`);
    console.log(` 📡 Servidor Receptor TCP para Collares GPS`);
    console.log(` Escuchando en: ${HOST}:${PORT} (TCP)`);
    console.log(` Protocolos: 3G/Wonlex/Topin/Starry + GT06`);
    console.log(`=========================================`);
  });

  // ==========================================
  // 2. SERVIDOR UDP (Puerto 7700)
  // ==========================================
  try {
    const udpServer = dgram.createSocket('udp4');
    
    udpServer.on('message', async (msg, rinfo) => {
      const clientKey = `${rinfo.address}:${rinfo.port}`;
      console.log(`[UDP Tracker RAW] ${msg.length} B de ${clientKey}: [HEX: ${msg.toString('hex')}] [TXT: ${msg.toString('utf8').replace(/[^\x20-\x7E]/g, '.')}]`);

      const sessionState = { terminalId: null, vendor: '3G' };
      try {
        await processTrackerBuffer(
          msg,
          clientKey,
          (replyBuf) => {
            udpServer.send(replyBuf, rinfo.port, rinfo.address, (sendErr) => {
              if (sendErr) console.warn(`[UDP Tracker] Error enviando respuesta a ${clientKey}:`, sendErr.message);
            });
          },
          sessionState,
          io,
          'UDP'
        );
      } catch (err) {
        console.error(`[UDP Tracker] Error procesando datagrama de ${clientKey}:`, err);
      }
    });

    udpServer.on('error', (err) => {
      console.warn(`[UDP Tracker] Error en servidor UDP puerto ${PORT}:`, err.message);
    });

    udpServer.bind(PORT, HOST, () => {
      console.log(` 📡 Receptor UDP activo en: ${HOST}:${PORT} (UDP)`);
    });
  } catch (udpErr) {
    console.warn(`[UDP Tracker] No se pudo inicializar receptor UDP:`, udpErr.message);
  }

  return tcpServer;
}
