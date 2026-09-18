#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Configuración de Consola Serial
#define SERIAL_BAUD 115200

// Identificador de Collar
#define COLLAR_ID "COLLAR_01"

// Configuración de Pines de Hardware
#define STATUS_LED_PIN 2     // LED de estado
#define BUZZER_PIN 5         // Zumbador piezoeléctrico en IO5 (4000 Hz)
#define IMPULSE_LED_PIN -1   // Desactivado en ESP32-S3
#define MODEM_POWER_PIN 21   // Pin de alimentación del módulo SIM7670G en Waveshare

// Configuración del Módem Celular SIM7670G 4G LTE
#define MODEM_RX_PIN 17      // Pin RX ESP32-S3 <- TX SIM7670G
#define MODEM_TX_PIN 18      // Pin TX ESP32-S3 -> RX SIM7670G
#define MODEM_BAUD 115200
#define MODEM_APN "gprsweb.digitel.ve"

// Configuración del GPS / GNSS
#define USE_EMULATOR false   // false: usa el GNSS real del SIM7670G
#define GPS_RX_PIN 17
#define GPS_TX_PIN 18
#define GPS_BAUD 115200

// Intervalos de Tiempo (en milisegundos)
#define WIFI_CONNECT_TIMEOUT 15000 // Tiempo de espera máximo para conectar al Wi-Fi (15s)
#define WIFI_RECONNECT_INTERVAL 10000 // Intervalo de intento de reconexión (10s)

// Configuración del Broker MQTT
#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_TOPIC_PREFIX "collarnet/lzambrano"

#endif // CONFIG_H
