#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "mqtt_manager.h"
#include "storage_manager.h"
#include "geofence.h"
#include "config.h"

PubSubClient client;
Client* currentNetClient = nullptr;

String staticCollarId = "";
String configTopic = "";
String cmdTopic = "";
String telemetryTopic = "";
unsigned long lastMqttReconnect = 0;

// Declaraciones externas para actuar ante comandos remotos
extern void onNetworkPreferenceChanged(NetPreference newPref);
extern void onGpsPowerChanged(bool powerOn);

// Callback de recepción de mensajes MQTT
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("\n[MQTT] Mensaje recibido en: %s\n", topic);
    
    String payloadStr = "";
    for (unsigned int i = 0; i < length; i++) {
        payloadStr += (char)payload[i];
    }
    Serial.println("[MQTT] Contenido: " + payloadStr);

    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payloadStr);
    if (!err) {
        if (doc.containsKey("p_open")) {
            potreroAbierto = (doc["p_open"].as<int>() == 1);
            Serial.printf("[MQTT] ¡Estado de Potrero actualizado vía MQTT!: %s\n", 
                          potreroAbierto ? "ABIERTO (Modo Traslado)" : "CERRADO (Cerca Activa)");
        }
        if (doc.containsKey("net_pref")) {
            String np = doc["net_pref"].as<String>();
            np.toUpperCase();
            NetPreference pref = NET_PREF_AUTO;
            if (np == "CELULAR" || np == "1") pref = NET_PREF_CELLULAR;
            else if (np == "WIFI" || np == "2") pref = NET_PREF_WIFI;
            else pref = NET_PREF_AUTO;
            Serial.printf("[MQTT] Recibido cambio de preferencia de red: %s\n", np.c_str());
            saveNetPreference(pref);
            onNetworkPreferenceChanged(pref);
        }
        if (doc.containsKey("gps_pwr")) {
            bool pwr = doc["gps_pwr"].as<bool>();
            Serial.printf("[MQTT] Recibido control de encendido de GPS: %s\n", pwr ? "ENCENDER" : "APAGAR");
            onGpsPowerChanged(pwr);
        }
    }
    
    // Guardar los nuevos perímetros en LittleFS y recargar memoria si tiene datos de geocerca
    if (saveGeofenceConfig(payloadStr)) {
        Serial.println("[MQTT] Configuración cargada y guardada en LittleFS correctamente.");
    }
}

// Conexión no bloqueante al Broker
bool reconnectMQTT() {
    if (!currentNetClient) return false;
    
    Serial.println("[MQTT] Intentando conectar al broker HiveMQ...");
    String clientId = "CollarNetClient-" + staticCollarId + "-" + String(random(1000, 9999));
    
    if (client.connect(clientId.c_str())) {
        Serial.println("[MQTT] ¡Conectado con éxito al broker!");
        client.subscribe(configTopic.c_str());
        client.subscribe(cmdTopic.c_str());
        Serial.printf("[MQTT] Suscrito a %s y %s\n", configTopic.c_str(), cmdTopic.c_str());
        return true;
    } else {
        Serial.printf("[MQTT] Fallo de conexión, rc=%d. Se reintentará en 10s.\n", client.state());
        return false;
    }
}

void setMQTTNetworkClient(Client* netClient) {
    currentNetClient = netClient;
    if (currentNetClient) {
        client.setClient(*currentNetClient);
    }
}

void initMQTT(const char* collarId, Client* netClient) {
    staticCollarId = String(collarId);
    configTopic = String(MQTT_TOPIC_PREFIX) + "/" + staticCollarId + "/config";
    cmdTopic = String(MQTT_TOPIC_PREFIX) + "/" + staticCollarId + "/cmd";
    telemetryTopic = String(MQTT_TOPIC_PREFIX) + "/" + staticCollarId + "/telemetria";

    setMQTTNetworkClient(netClient);
    client.setServer(MQTT_SERVER, MQTT_PORT);
    client.setCallback(mqttCallback);
    client.setBufferSize(2048);
    
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

bool publishTelemetry(double lat, double lon, int bateria, int senal, const String& alertType, const String& imei, int vbat, bool isCharging, const String& netType, bool gpsPwr, bool gpsFix, int sats) {
    if (!client.connected()) {
        Serial.println("[MQTT] Envío omitido: Cliente MQTT desconectado.");
        return false;
    }

    StaticJsonDocument<512> doc;
    doc["lat"] = lat;
    doc["lon"] = lon;
    doc["bat"] = bateria;
    doc["sig"] = senal;
    doc["alert"] = alertType;
    if (imei.length() > 0) {
        doc["imei"] = imei;
    }
    if (vbat > 0) {
        doc["vbat"] = vbat;
    }
    doc["charging"] = isCharging;
    doc["net"] = netType;
    doc["gps_pwr"] = gpsPwr;
    doc["gps_fix"] = gpsFix;
    doc["sats"] = sats;

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.printf("[MQTT] Publicando telemetría en %s...\n", telemetryTopic.c_str());
    Serial.println("[MQTT] Payload: " + jsonString);

    return client.publish(telemetryTopic.c_str(), jsonString.c_str());
}

bool isMQTTConnected() {
    return client.connected();
}
