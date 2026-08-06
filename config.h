#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Configuración de Consola Serial
#define SERIAL_BAUD 115200

// Configuración de Pines de Hardware
#define STATUS_LED_PIN 2     // LED azul integrado en la placa NodeMCU-32S (GPIO 2)
#define BUZZER_PIN 4         // Zumbador piezoeléctrico acústico (GPIO 4)
#define IMPULSE_LED_PIN 23   // LED Rojo de Simulación de Impulso Eléctrico (GPIO 23)

// Configuración del GPS NEO-6M
#define USE_EMULATOR false   // true: usa la caminata simulada, false: usa el GPS real
#define GPS_RX_PIN 16        // Pin RX2 del ESP32 (conectar al TX del GPS)
#define GPS_TX_PIN 17        // Pin TX2 del ESP32 (conectar al RX del GPS)
#define GPS_BAUD 9600        // Velocidad de transmisión serial del GPS (9600 bps)

// Intervalos de Tiempo (en milisegundos)
#define WIFI_CONNECT_TIMEOUT 15000 // Tiempo de espera máximo para conectar al Wi-Fi (15s)
#define WIFI_RECONNECT_INTERVAL 10000 // Intervalo de intento de reconexión (10s)

// Configuración del Broker MQTT
#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_TOPIC_PREFIX "collarnet/lzambrano"

#endif // CONFIG_H
