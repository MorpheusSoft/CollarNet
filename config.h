#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Configuración de Consola Serial
#define SERIAL_BAUD 115200

// Identificador de Collar
#define COLLAR_ID "COW-002"

// Modos de Preferencia de Red
enum NetPreference {
    NET_PREF_AUTO = 0,     // Prioriza Wi-Fi en corrales/taller, conmuta a SIM 4G en potreros
    NET_PREF_CELLULAR = 1, // Fuerza exclusivamente SIM 4G LTE Digitel
    NET_PREF_WIFI = 2      // Fuerza exclusivamente Wi-Fi
};

// Modo por defecto: Fuerza conexión Wi-Fi de alta velocidad (SOITCA)
#define DEFAULT_NET_PREF NET_PREF_WIFI

// Configuración de Pines de Hardware (Arquitectura Opción 2 Monolítica All-in-One)
#define STATUS_LED_PIN 2     // LED SMD de estado (Azul)
#define BUZZER_PIN 5         // Zumbador piezoeléctrico en IO5 (4000 Hz, 95 dB)
#define IMPULSE_PIN 4        // Disparo de pulso disuasorio hacia optoacoplador EL817C (Cerca Virtual)
#define IMPULSE_LED_PIN IMPULSE_PIN // Alias de compatibilidad
#define MODEM_POWER_PIN 21   // Pin PWRKEY de control de encendido del módem SIM7670
#define I2C_SDA_PIN 8        // Bus I2C datos acelerómetro SC7A20
#define I2C_SCL_PIN 9        // Bus I2C reloj acelerómetro SC7A20

// Configuración del Módem Celular SIM7670G 4G LTE
#define MODEM_RX_PIN 17      // Pin RX ESP32-S3 <- TX SIM7670G
#define MODEM_TX_PIN 18      // Pin TX ESP32-S3 -> RX SIM7670G
#define MODEM_BAUD 115200
#define MODEM_APN "gprsweb.digitel.ve"

// Configuración del GPS / GNSS
#define USE_EMULATOR false   // false: activa receptor GNSS físico real del SIM7670G para pruebas en área amplia
#define RESET_GEOFENCE_ON_BOOT false // false: preserva geocercas sincronizadas vía MQTT desde cowai.net
#define GPS_RX_PIN 17
#define GPS_TX_PIN 18
#define GPS_BAUD 115200

// Intervalos de Tiempo (en milisegundos)
#define WIFI_CONNECT_TIMEOUT 15000 // Tiempo de espera máximo para conectar al Wi-Fi (15s)
#define WIFI_RECONNECT_INTERVAL 10000 // Intervalo de intento de reconexión (10s)

// Configuración del Broker MQTT Oficial COWAI (cowai.net)
#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_TOPIC_PREFIX "collarnet/lzambrano"

#endif // CONFIG_H
