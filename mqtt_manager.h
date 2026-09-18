#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <Arduino.h>
#include <Client.h>

// Inicializa el cliente MQTT y se suscribe al canal de configuración
void initMQTT(const char* collarId, Client* netClient);

// Actualiza el cliente de red subyacente (GSM o Wi-Fi)
void setMQTTNetworkClient(Client* netClient);

// Mantiene activa la conexión con el Broker (reconexión automática no bloqueante)
void handleMQTT();

// Publica una trama de telemetría por MQTT en formato JSON comprimido
bool publishTelemetry(double lat, double lon, int bateria, int senal, const String& alertType);

// Retorna el estado actual de conexión al Broker
bool isMQTTConnected();

#endif // MQTT_MANAGER_H
