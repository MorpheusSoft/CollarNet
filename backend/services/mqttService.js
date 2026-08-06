import mqtt from 'mqtt';
import pool from '../config/db.js';
import { evaluateAnimalPosition } from './geofenceService.js';

let mqttClient = null;

/**
 * Inicializa el cliente MQTT, se conecta al broker y se suscribe al canal de telemetría.
 * @param {Object} io - Instancia del servidor de WebSockets (Socket.io)
 */
export function initMQTT(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
  const prefix = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
  const subscribeTopic = `${prefix}/+/telemetria`; // collarnet/lzambrano/[collar_id]/telemetria

  console.log(`[MQTT] Conectando al broker: ${brokerUrl}...`);
  mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log(`[MQTT] Conectado exitosamente. Suscribiéndose al tópico: ${subscribeTopic}`);
    mqttClient.subscribe(subscribeTopic, (err) => {
      if (err) {
        console.error(`[MQTT] Error al suscribirse al tópico ${subscribeTopic}:`, err);
      } else {
        console.log(`[MQTT] Suscripción exitosa a ${subscribeTopic}`);
      }
    });
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error en el cliente MQTT:', err);
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      // Extraer collarId del tópico (ej: collarnet/lzambrano/collar_001/telemetria -> collar_001)
      const topicParts = topic.split('/');
      const collarId = topicParts[topicParts.length - 2];
      
      const payload = JSON.parse(message.toString());
      
      // Soportar claves optimizadas o legibles
      const lat = parseFloat(payload.lat !== undefined ? payload.lat : payload.latitude);
      const lon = parseFloat(payload.lon !== undefined ? payload.lon : payload.longitude);
      const bateria = parseInt(payload.bat !== undefined ? payload.bat : payload.battery, 10);
      const senal = parseInt(payload.sig !== undefined ? payload.sig : payload.signal, 10);

      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`[MQTT] Telemetría inválida del collar ${collarId}: coordenadas no numéricas.`);
        return;
      }

      // 1. Buscar si hay un animal vinculado a este collar y el estado activo del collar
      const collarQuery = `
        SELECT a.id AS animal_id, a.arete_visual, c.activo 
        FROM collares c 
        LEFT JOIN animales a ON a.collar_id = c.id 
        WHERE c.id = $1;
      `;
      const { rows: collarRows } = await pool.query(collarQuery, [collarId]);
      
      if (collarRows.length === 0) {
        console.warn(`[MQTT] Collar ${collarId} no está registrado en el inventario.`);
        return;
      }

      const { animal_id: animalId, arete_visual: areteVisual, activo } = collarRows[0];
      let checkResult = null;

      if (animalId) {
        if (activo) {
          // 2. Evaluar geocerca mediante PostGIS en geofenceService (si el collar está habilitado)
          checkResult = await evaluateAnimalPosition(animalId, lat, lon);

          // 3. Registrar en tabla histórica de telemetría
          const insertTelemetryQuery = `
            INSERT INTO telemetria (animal_id, ubicacion, bateria, senal)
            VALUES ($1, ST_SetSRID(ST_Point($3, $2), 4326), $4, $5);
          `;
          await pool.query(insertTelemetryQuery, [animalId, lat, lon, bateria, senal]);

          // 4. Administrar ciclo de vida de las alertas en la base de datos
          await handleAlertLifecycle(animalId, checkResult.alertType, lat, lon);
        } else {
          // El collar está DESHABILITADO: Guardar telemetría pero silenciar alarmas
          console.log(`[Live IoT] Collar ${collarId} está deshabilitado. Omitiendo geocercas y alertas.`);
          
          // Cerramos cualquier alerta activa que haya quedado huérfana de este animal
          const resolveAlertsQuery = `
            UPDATE alertas 
            SET estado = 'RESUELTO', fecha_fin = NOW() 
            WHERE animal_id = $1 AND estado = 'ACTIVO' AND tipo IN ('ESCAPE_HATO', 'INFRACCION_ROTACION');
          `;
          await pool.query(resolveAlertsQuery, [animalId]);
        }
      }

      // 5. Actualizar el estado actual del dispositivo físico (Collar)
      const updateCollarQuery = `
        UPDATE collares 
        SET nivel_bateria = $1, senal_celular = $2, ultima_conexion = NOW(),
            ultima_ubicacion = ST_SetSRID(ST_Point($4, $3), 4326)
        WHERE id = $5;
      `;
      await pool.query(updateCollarQuery, [bateria, senal, lat, lon, collarId]);

      // 6. Broadcast en tiempo real al panel Web usando Socket.io
      const broadcastData = {
        collarId,
        animalId: animalId || null,
        areteVisual: areteVisual || 'SIN VÍNCULO',
        lat,
        lon,
        bateria,
        senal,
        timestamp: new Date().toISOString(),
        alertType: (activo && checkResult) ? checkResult.alertType : (activo ? 'NORMAL' : 'INACTIVO'),
        potreroActual: checkResult ? checkResult.potreroActualNombre : (activo ? 'Desconocido' : 'TRÁNSITO / DESACTIVADO'),
        distanciaHato: checkResult ? checkResult.distanciaHato : 0.0,
        dentroHato: checkResult ? checkResult.dentroHato : true,
        dentroPotrero: checkResult ? checkResult.dentroPotrero : true,
        collarActivo: activo
      };

      io.emit('telemetria_realtime', broadcastData);
      console.log(`[Live IoT] Collar: ${collarId} | Res: ${broadcastData.areteVisual} | Lat: ${lat}, Lon: ${lon} | Alerta: ${broadcastData.alertType}`);

    } catch (err) {
      console.error('[MQTT] Error procesando mensaje de telemetría:', err);
    }
  });
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
  const topic = `${prefix}/${collarId}/config`;
  mqttClient.publish(topic, JSON.stringify(payload), { qos: 1, retain: true });
  console.log(`[MQTT] Publicada configuración al collar ${collarId} en tópico ${topic}`);
  return true;
}

/**
 * Lógica para abrir o resolver alertas (infracciones) en la base de datos de forma inteligente.
 */
async function handleAlertLifecycle(animalId, alertType, lat, lon) {
  // A. Si está fuera del Hato o de Potrero, buscamos si ya existe una alerta activa para ese animal
  if (alertType !== 'NORMAL') {
    const activeAlertQuery = `
      SELECT id FROM alertas 
      WHERE animal_id = $1 AND tipo = $2 AND estado = 'ACTIVO';
    `;
    const { rows } = await pool.query(activeAlertQuery, [animalId, alertType]);

    if (rows.length === 0) {
      // Si no existe, creamos la alerta
      const insertAlertQuery = `
        INSERT INTO alertas (animal_id, tipo, estado, coordenada_evento)
        VALUES ($1, $2, 'ACTIVO', ST_SetSRID(ST_Point($4, $3), 4326));
      `;
      await pool.query(insertAlertQuery, [animalId, alertType, lat, lon]);
      console.log(`[Alerta] ¡CREADA ALERTA ${alertType} para el animal ID ${animalId}!`);
    }
  } 
  
  // B. Si volvió a la normalidad, cerramos todas las alertas activas de geocercas
  if (alertType === 'NORMAL') {
    const resolveAlertsQuery = `
      UPDATE alertas 
      SET estado = 'RESUELTO', fecha_fin = NOW() 
      WHERE animal_id = $1 AND estado = 'ACTIVO' AND tipo IN ('ESCAPE_HATO', 'INFRACCION_ROTACION');
    `;
    const result = await pool.query(resolveAlertsQuery, [animalId]);
    if (result.rowCount > 0) {
      console.log(`[Alerta] Resuelto: El animal ID ${animalId} ha retornado a zona segura. Cerrando alertas activas.`);
    }
  }
}
