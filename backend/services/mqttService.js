import mqtt from 'mqtt';
import pool from '../config/db.js';
import { evaluateAnimalPosition } from './geofenceService.js';
import { processTelemetryInMemory } from '../routes/api.js';
import { pushCollarFrame } from './cameraService.js';
import { sendCommandToCollar } from './trackerTcpService.js';

let mqttClient = null;

/**
 * Inicializa el cliente MQTT, se conecta al broker y se suscribe a los canales de telemetría y cámara.
 * @param {Object} io - Instancia del servidor de WebSockets (Socket.io)
 */
export function initMQTT(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
  const subscribeTopics = [
    `${prefix}/+/telemetria`,
    `${prefix}/+/camera`,
    `${prefix}/+/snapshot`
  ];

  console.log(`[MQTT] Conectando al broker: ${brokerUrl}...`);
  mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log(`[MQTT] Conectado exitosamente. Suscribiéndose a tópicos globales de telemetría y cámara...`);
    subscribeTopics.forEach(topic => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`[MQTT] Error al suscribirse al tópico ${topic}:`, err);
        } else {
          console.log(`[MQTT] Suscripción exitosa a ${topic}`);
        }
      });
    });
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error en el cliente MQTT:', err);
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      // Extraer collarId del tópico (ej: collarnet/lzambrano/COW-001/telemetria -> COW-001)
      const topicParts = topic.split('/');
      const collarId = topicParts[topicParts.length - 2] || 'COW-001';
      const actionType = topicParts[topicParts.length - 1];

      // Ingestión de fotogramas de cámara vía MQTT 4G LTE
      if (actionType === 'camera' || actionType === 'snapshot') {
        if (message && message.length > 0) {
          pushCollarFrame(collarId, message, 'image/jpeg');
          if (io) {
            io.emit('camera_frame_update', { collarId, timestamp: Date.now() });
          }
        }
        return;
      }
      
      const payload = JSON.parse(message.toString());
      await processTelemetryPayload(io, collarId, payload);
    } catch (err) {
      console.error('[MQTT] Error procesando mensaje de telemetría:', err);
    }
  });
}

/**
 * Publica telemetría cruda en el broker MQTT para interoperabilidad con clientes externos.
 */
export function publishTelemetry(collarId, payload) {
  if (!mqttClient || !mqttClient.connected) return false;
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
  const topic = `${prefix}/${collarId}/telemetria`;
  mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
  return true;
}

/**
 * Procesa e inyecta la telemetría recibida (sea vía MQTT o vía TCP puerto 7700).
 */
export async function processTelemetryPayload(io, collarId, payload) {
  try {
    const lat = parseFloat(payload.lat !== undefined ? payload.lat : payload.latitude);
    const lon = parseFloat(payload.lon !== undefined ? payload.lon : payload.longitude);
      const bateria = Math.min(100, Math.max(0, parseInt(payload.bat !== undefined ? payload.bat : (payload.battery !== undefined ? payload.battery : 100), 10)));
      const senal = Math.min(5, Math.max(0, parseInt(payload.sig !== undefined ? payload.sig : (payload.signal !== undefined ? payload.signal : 4), 10)));
      const imei = payload.imei ? String(payload.imei).trim() : null;
      const vbat = payload.vbat !== undefined ? parseInt(payload.vbat, 10) : null;
      const estaCargando = payload.charging === true || (vbat !== null && vbat >= 4220);
      const medioRed = payload.net ? String(payload.net).toUpperCase() : 'CELULAR';
      const gpsEncendido = payload.gps_pwr !== undefined ? Boolean(payload.gps_pwr) : true;
      const gpsFijado = payload.gps_fix !== undefined ? Boolean(payload.gps_fix) : false;
      const satelites = payload.sats !== undefined ? parseInt(payload.sats, 10) : 0;
      const ip = payload.ip ? String(payload.ip).trim() : null;

      let broadcastData = null;
      let handledByDb = false;

      // 1. Intentar persistencia y validación en PostgreSQL si la base de datos está disponible
      try {
        const collarQuery = `
          SELECT c.id AS collar_id, a.id AS animal_id, a.arete_visual, c.activo, c.estado, c.imei AS db_imei,
                 COALESCE(ST_Y(c.ultima_ubicacion), ST_Y(ST_Centroid(p.perimetro)), ST_Y(ST_Centroid(h.perimetro))) AS last_lat,
                 COALESCE(ST_X(c.ultima_ubicacion), ST_X(ST_Centroid(p.perimetro)), ST_X(ST_Centroid(h.perimetro))) AS last_lon
          FROM collares c 
          LEFT JOIN animales a ON a.collar_id = c.id 
          LEFT JOIN potreros p ON a.potrero_id = p.id
          LEFT JOIN hatos h ON p.hato_id = h.id
          WHERE c.id = $1 OR ($2::varchar IS NOT NULL AND c.imei = $2::varchar)
          ORDER BY (c.id = $1) DESC;
        `;
        const { rows: collarRows } = await pool.query(collarQuery, [collarId, imei]);
        
        if (collarRows.length > 0) {
          const activeCollar = collarRows[0];
          const matchedCollarId = activeCollar.collar_id;
          const { animal_id: animalId, arete_visual: areteVisual, activo, estado: estadoCollar, db_imei: dbImei } = activeCollar;
          let checkResult = null;

          if (dbImei && imei && dbImei !== imei) {
            console.warn(`[MQTT Seguridad] Advertencia: Dispositivo con IMEI ${imei} transmitiendo para el collar ${matchedCollarId} (registrado con IMEI: ${dbImei}).`);
          }

          const hasValidCoords = (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) > 1.0 && Math.abs(lon) > 1.0);
          const effectiveLat = hasValidCoords ? lat : (activeCollar.last_lat ? parseFloat(activeCollar.last_lat) : null);
          const effectiveLon = hasValidCoords ? lon : (activeCollar.last_lon ? parseFloat(activeCollar.last_lon) : null);

          const isOperativo = Boolean(activo && animalId && estadoCollar === 'ACTIVO');

          if (animalId && isOperativo && effectiveLat !== null && effectiveLon !== null) {
            checkResult = await evaluateAnimalPosition(animalId, effectiveLat, effectiveLon);

            if (hasValidCoords) {
              const insertTelemetryQuery = `
                INSERT INTO telemetria (animal_id, ubicacion, bateria, senal)
                VALUES ($1, ST_SetSRID(ST_Point($3, $2), 4326), $4, $5);
              `;
              await pool.query(insertTelemetryQuery, [animalId, effectiveLat, effectiveLon, bateria, senal]);
              await handleAlertLifecycle(animalId, checkResult.alertType, effectiveLat, effectiveLon);

              if (checkResult.alertType !== 'NORMAL') {
                console.log(`[Alerta Activa] Animal ${animalId} (${areteVisual}) en ${checkResult.alertType}. Enviando orden de sonar al collar ${matchedCollarId}`);
                sendCommandToCollar(matchedCollarId, 'FIND');
                publishCameraCmd(matchedCollarId, { cmd: 'buzzer', duration: 400, freq: 4000 });
              }
            }
          }

          if (hasValidCoords) {
            const updateCollarQuery = `
              UPDATE collares 
              SET nivel_bateria = $1, 
                  senal_celular = $2, 
                  ultima_conexion = NOW(),
                  ultima_ubicacion = ST_SetSRID(ST_Point($4, $3), 4326),
                  esta_cargando = $5,
                  voltaje_mv = $6,
                  medio_red = $7,
                  gps_encendido = $8,
                  gps_fijado = $9,
                  satelites_visibles = $10
              WHERE id = $11;
            `;
            await pool.query(updateCollarQuery, [bateria, senal, effectiveLat, effectiveLon, estaCargando, vbat, medioRed, gpsEncendido, gpsFijado, satelites, matchedCollarId]);
          } else {
            const updateCollarStatusQuery = `
              UPDATE collares 
              SET nivel_bateria = $1, 
                  senal_celular = $2, 
                  ultima_conexion = NOW(),
                  esta_cargando = $3,
                  voltaje_mv = $4,
                  medio_red = $5,
                  gps_encendido = $6,
                  gps_fijado = $7,
                  satelites_visibles = $8
              WHERE id = $9;
            `;
            await pool.query(updateCollarStatusQuery, [bateria, senal, estaCargando, vbat, medioRed, gpsEncendido, gpsFijado, satelites, matchedCollarId]);
          }

          broadcastData = {
            collarId: matchedCollarId,
            collar_id: matchedCollarId,
            animalId: animalId || null,
            animal_id: animalId || null,
            areteVisual: areteVisual || 'SIN VÍNCULO',
            lat: effectiveLat !== null ? parseFloat(effectiveLat) : null,
            lon: effectiveLon !== null ? parseFloat(effectiveLon) : null,
            latitud: effectiveLat !== null ? parseFloat(effectiveLat) : null,
            longitud: effectiveLon !== null ? parseFloat(effectiveLon) : null,
            bateria: parseInt(bateria, 10),
            nivel_bateria: parseInt(bateria, 10),
            senal: parseInt(senal, 10),
            senal_celular: parseInt(senal, 10),
            esta_cargando: Boolean(estaCargando),
            charging: Boolean(estaCargando),
            voltaje_mv: vbat,
            imei: imei || dbImei || null,
            timestamp: new Date().toISOString(),
            alertType: (isOperativo && checkResult) ? checkResult.alertType : (isOperativo ? 'NORMAL' : 'INACTIVO'),
            alerta: (isOperativo && checkResult) ? checkResult.alertType : (isOperativo ? 'NORMAL' : 'INACTIVO'),
            estado_cerca: (isOperativo && checkResult) ? (checkResult.estadoCerca || (checkResult.alertType === 'NORMAL' ? 'DENTRO' : (checkResult.alertType === 'ESCAPE_HATO' ? 'FUERA' : 'ADVERTENCIA'))) : (isOperativo ? 'DENTRO' : 'SIN_MONITOREO'),
            potreroActual: checkResult ? checkResult.potreroActualNombre : (isOperativo ? 'Desconocido' : 'EN ALMACÉN / DESACTIVADO'),
            potrero_nombre: checkResult ? checkResult.potreroActualNombre : (isOperativo ? 'Desconocido' : 'EN ALMACÉN / DESACTIVADO'),
            distanciaHato: checkResult ? checkResult.distanciaHato : 0.0,
            distancia_hato: checkResult ? checkResult.distanciaHato : 0.0,
            distanciaPotrero: checkResult ? checkResult.distanciaPotrero : 0.0,
            distancia_potrero: checkResult ? checkResult.distanciaPotrero : 0.0,
            margenPotrero: checkResult ? checkResult.margenPotrero : 3.0,
            dentroHato: checkResult ? checkResult.dentroHato : true,
            dentro_hato: checkResult ? checkResult.dentroHato : true,
            dentroPotrero: checkResult ? checkResult.dentroPotrero : true,
            dentro_potrero: checkResult ? checkResult.dentroPotrero : true,
            collarActivo: activo,
            activo: activo,
            medio_red: medioRed,
            net: medioRed,
            gps_encendido: gpsEncendido,
            gps_fijado: gpsFijado,
            satelites_visibles: satelites,
            sats: satelites,
            ip: ip || null
          };
          handledByDb = true;
        }
      } catch (dbErr) {
        console.error('[MQTT DB Error]:', dbErr.message);
      }

      // 2. Si no fue procesado por PostgreSQL, usar el almacén unificado en memoria
      if (!handledByDb) {
        broadcastData = processTelemetryInMemory({
          collarId,
          imei,
          lat,
          lon,
          bateria,
          senal,
          estaCargando,
          vbat,
          medioRed,
          gpsEncendido,
          gpsFijado,
          satelites,
          alert: payload.alert,
          ip
        });
      }

      // 3. Emitir datos en tiempo real a todos los clientes (Web, iOS, Android, apps técnicas)
      if (broadcastData && io) {
        const posStr = (broadcastData.lat !== null && broadcastData.lon !== null) 
          ? `[${broadcastData.lat.toFixed(5)}, ${broadcastData.lon.toFixed(5)}]` 
          : '[Sin Fix GPS]';
        console.log(`[Live IoT] Collar: ${broadcastData.collarId} | IMEI: ${broadcastData.imei || 'N/A'} | Red: ${broadcastData.medio_red || 'CELULAR'} | GPS: ${broadcastData.gps_encendido ? (broadcastData.gps_fijado ? `FIX (${broadcastData.satelites_visibles} sats)` : `Buscando (${broadcastData.satelites_visibles} sats)`) : 'APAGADO'} | Bat: ${broadcastData.bateria}% (${broadcastData.esta_cargando ? '⚡ USB/Carga' : '🔋 Batería'}) | Res: ${broadcastData.areteVisual} | Pos: ${posStr} | Alerta: ${broadcastData.alertType}`);
      }

    } catch (err) {
      console.error('[MQTT] Error procesando mensaje de telemetría:', err);
    }
  }

/**
 * Publica un comando de actualización para un collar (ej: nuevas coordenadas de geocercas).
 */
export function publishToCollar(collarId, payload) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('[MQTT] Cliente no inicializado o desconectado. Imposible publicar.');
    return false;
  }
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
  const cleanId = String(collarId || '').trim();
  const targetIds = cleanId ? [cleanId] : ['COW-001'];
  targetIds.forEach(id => {
    if (id) {
      const topic = `${prefix}/${id}/config`;
      mqttClient.publish(topic, JSON.stringify(payload), { qos: 1, retain: false });
      console.log(`[MQTT] Publicada configuración al collar ${id} en tópico ${topic}`);
    }
  });
  return true;
}

/**
 * Publica un comando de control de cámara / buzzer (encendido/apagado bajo demanda, fps, buzzer beep)
 */
export function publishCameraCmd(collarId, payload) {
  if (!mqttClient || !mqttClient.connected) {
    console.warn('[MQTT] Cliente desconectado. No se pudo enviar comando al collar.');
    return false;
  }
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
  const cleanId = String(collarId || '').trim();
  const targetIds = cleanId ? [cleanId] : ['COW-001'];
  targetIds.forEach(id => {
    if (id) {
      const topic = `${prefix}/${id}/cmd`;
      mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
      console.log(`[MQTT Cmd] Comando enviado a ${topic}:`, payload);
    }
  });
  return true;
}

/**
 * Lógica para abrir o resolver alertas (infracciones) en la base de datos de forma inteligente.
 */
async function handleAlertLifecycle(animalId, alertType, lat, lon) {
  if (alertType === 'ESCAPE_HATO' || alertType === 'INFRACCION_ROTACION') {
    const activeAlertQuery = `
      SELECT id FROM alertas 
      WHERE animal_id = $1 AND tipo = $2 AND estado = 'ACTIVO';
    `;
    const { rows } = await pool.query(activeAlertQuery, [animalId, alertType]);

    if (rows.length === 0) {
      const insertAlertQuery = `
        INSERT INTO alertas (animal_id, tipo, estado, coordenada_evento)
        VALUES ($1, $2, 'ACTIVO', ST_SetSRID(ST_Point($4, $3), 4326));
      `;
      await pool.query(insertAlertQuery, [animalId, alertType, lat, lon]);
      console.log(`[Alerta] ¡CREADA ALERTA ${alertType} para el animal ID ${animalId}!`);
    }
  } 
  
  if (alertType === 'NORMAL' || alertType === 'ADVERTENCIA') {
    const resolveAlertsQuery = `
      UPDATE alertas 
      SET estado = 'RESUELTO', fecha_fin = NOW() 
      WHERE animal_id = $1 AND estado = 'ACTIVO' AND tipo IN ('ESCAPE_HATO', 'INFRACCION_ROTACION');
    `;
    const result = await pool.query(resolveAlertsQuery, [animalId]);
    if (result.rowCount > 0) {
      console.log(`[Alerta] Resuelto: El animal ID ${animalId} ha retornado al potrero. Cerrando alertas activas.`);
    }
  }
}
