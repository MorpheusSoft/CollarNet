#!/usr/bin/env node

/**
 * SIMULADOR Y GATEWAY DE TELEMETRÍA DE COLLAR IOT (CowIA / CollarNet)
 * ==================================================================
 * Este script permite simular la telemetría satelital (GPS + Batería + Señal)
 * para un collar físico o virtual (ej: COLLAR_01) conectado al sistema.
 * 
 * Publica periódicamente vía MQTT al broker oficial de la plataforma:
 * Tópico: collarnet/lzambrano/<COLLAR_ID>/telemetria
 */

import mqtt from 'mqtt';

// 1. Configuración del Collar y Conectividad
const COLLAR_ID = process.env.COLLAR_ID || process.argv[2] || 'COLLAR_01';
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'collarnet/lzambrano';
const TELEMETRIA_TOPIC = `${TOPIC_PREFIX}/${COLLAR_ID}/telemetria`;
const CMD_TOPIC = `${TOPIC_PREFIX}/${COLLAR_ID}/cmd`;

// Coordenadas reales del Hato 'Oficina' (Maracaibo) y sus Potreros
// Potrero A: lat ~ 10.67134, lon ~ -71.60404
// Potrero B: lat ~ 10.67134, lon ~ -71.60417
const WAYPOINTS = [
  { lat: 10.671340, lon: -71.604030, desc: 'Potrero A (Centro)' },
  { lat: 10.671355, lon: -71.604045, desc: 'Potrero A (Noreste)' },
  { lat: 10.671360, lon: -71.604060, desc: 'Potrero A (Límite Norte)' },
  { lat: 10.671345, lon: -71.604050, desc: 'Potrero A (Abrevadero)' },
  { lat: 10.671335, lon: -71.604035, desc: 'Potrero A (Sureste)' },
  { lat: 10.671338, lon: -71.604025, desc: 'Potrero A (Retorno)' }
];

console.log('====================================================');
console.log('  🐄 SIMULADOR DE TELEMETRÍA IOT - COLLARNET / COWIA');
console.log('====================================================');
console.log(`📡 Collar ID       : ${COLLAR_ID}`);
console.log(`🌐 Broker MQTT     : ${BROKER_URL}`);
console.log(`🎯 Tópico Publica  : ${TELEMETRIA_TOPIC}`);
console.log(`📥 Tópico Comandos : ${CMD_TOPIC}`);
console.log('----------------------------------------------------');

const client = mqtt.connect(BROKER_URL);

let stepIndex = 0;
let bateria = 98;
let senal = 5;

client.on('connect', () => {
  console.log('✅ Conectado exitosamente al broker MQTT.');
  console.log('🔔 Suscribiéndose a canal de comandos remotos...');
  client.subscribe(CMD_TOPIC, (err) => {
    if (!err) console.log(`👂 Escuchando comandos en: ${CMD_TOPIC}`);
  });

  console.log('\n🚀 Iniciando transmisión de telemetría cada 3 segundos...');
  console.log('Presiona Ctrl+C para detener la simulación.\n');

  // Enviar el primer punto de inmediato
  sendTelemetry();

  // Ciclo periódico cada 3 segundos
  setInterval(sendTelemetry, 3000);
});

client.on('message', (topic, message) => {
  console.log(`\n📩 [Comando Recibido en ${topic}]: ${message.toString()}`);
});

client.on('error', (err) => {
  console.error('❌ Error MQTT:', err.message);
});

function sendTelemetry() {
  const wp = WAYPOINTS[stepIndex];
  
  // Agregar micro-variación para simular jitter GPS real
  const jitterLat = (Math.random() - 0.5) * 0.000008;
  const jitterLon = (Math.random() - 0.5) * 0.000008;
  const currentLat = parseFloat((wp.lat + jitterLat).toFixed(6));
  const currentLon = parseFloat((wp.lon + jitterLon).toFixed(6));

  const payload = {
    lat: currentLat,
    lon: currentLon,
    bat: bateria,
    sig: senal,
    alert: 'NORMAL',
    timestamp: new Date().toISOString()
  };

  client.publish(TELEMETRIA_TOPIC, JSON.stringify(payload), { qos: 0 }, (err) => {
    if (err) {
      console.error(`⚠️ Error al publicar telemetría:`, err.message);
    } else {
      console.log(`[Paso ${stepIndex + 1}/${WAYPOINTS.length}] 📍 Lat: ${currentLat}, Lon: ${currentLon} | 🔋 ${bateria}% | 📶 ${senal}/5 (${wp.desc})`);
    }
  });

  stepIndex = (stepIndex + 1) % WAYPOINTS.length;
}
