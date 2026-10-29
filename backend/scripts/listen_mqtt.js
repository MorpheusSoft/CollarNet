import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

client.on('connect', () => {
  console.log('📡 Conectado a HiveMQ, escuchando telemetría...');
  client.subscribe('collarnet/lzambrano/#');
  client.subscribe('collarnet/simulacion/#');
});

client.on('message', (topic, message) => {
  console.log(`[MQTT IN] ${topic}:`, message.toString());
});

setTimeout(() => {
  console.log('Finalizado test MQTT');
  client.end();
  process.exit(0);
}, 10000);
