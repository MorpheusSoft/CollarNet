#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "mqtt_manager.h"
#include "storage_manager.h"
#include "config.h"

WiFiClient espClient;
PubSubClient client(espClient);

String staticCollarId = "";
String configTopic = "";
String telemetryTopic = "";
unsigned long lastMqttReconnect = 0;

// Callback de recepción de mensajes MQTT
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("\n[MQTT] Mensaje de configuración recibido en: %s\n", topic);
    
    String payloadStr = "";
    for (unsigned int i = 0; i < length; i++) {
        payloadStr += (char)payload[i];
    }
    
    // Guardar los nuevos perímetros en LittleFS y recargar memoria
    if (saveGeofenceConfig(payloadStr)) {
        Serial.println("[MQTT] Configuración cargada y guardada en LittleFS correctamente.");
    } else {
        Serial.println("[MQTT] Error al almacenar la geocerca recibida.");
    }
}

// Conexión no bloqueante al Broker
bool reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) return false;
    
    Serial.println("[MQTT] Intentando conectar al broker HiveMQ...");
    String clientId = "CollarNetClient-" + staticCollarId;
    
    if (client.connect(clientId.c_str())) {
        Serial.println("[MQTT] ¡Conectado con éxito al broker!");
        // Suscribirse al canal de configuración
        if (client.subscribe(configTopic.c_str())) {
            Serial.printf("[MQTT] Suscrito al tópico: %s\n", configTopic.c_str());
        } else {
            Serial.println("[MQTT] ¡ERROR! Fallo al suscribirse.");
        }
        return true;
    } else {
        Serial.printf("[MQTT] Fallo de conexión, rc=%d. Se reintentará en 10s.\n", client.state());
        return false;
    }
}

void initMQTT(const char* collarId) {
    staticCollarId = String(collarId);
    configTopic = String(MQTT_TOPIC_PREFIX) + "/" + staticCollarId + "/config";
    telemetryTopic = String(MQTT_TOPIC_PREFIX) + "/" + staticCollarId + "/telemetria";

    client.setServer(MQTT_SERVER, MQTT_PORT);
    client.setCallback(mqttCallback);
    
    // Conexión inicial rápida
    reconnectMQTT();
}

void handleMQTT() {
    if (!client.connected()) {
        unsigned long now = millis();
        if (now - lastMqttReconnect >= 10000) {
            lastMqttReconnect = now;
            if (reconnectMQTT()) {
                lastMqttReconnect = 0;
            }
        }
    } else {
        client.loop();
    }
}

bool publishTelemetry(double lat, double lon, int bateria, int senal, const String& alertType) {
    if (!client.connected()) {
        Serial.println("[MQTT] Envío omitido: Cliente MQTT desconectado.");
        return false;
    }

    StaticJsonDocument<256> doc;
    doc["lat"] = lat;
    doc["lon"] = lon;
    doc["bat"] = bateria;
    doc["sig"] = senal;
    doc["alert"] = alertType;

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.printf("[MQTT] Publicando telemetría en %s...\n", telemetryTopic.c_str());
    Serial.println("[MQTT] Payload: " + jsonString);

    return client.publish(telemetryTopic.c_str(), jsonString.c_str());
}

bool isMQTTConnected() {
    return client.connected();
}
