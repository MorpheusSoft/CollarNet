#include <WiFi.h>
#include "wifi_manager.h"
#include "config.h"
#include "secrets.h"
#include "imu_manager.h"

unsigned long lastReconnectAttempt = 0;
bool wifiInitialized = false;

void initWiFi() {
    Serial.println("\n[WiFi] Iniciando conexión Wi-Fi...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    
    unsigned long startAttemptTime = millis();
    
    // Conexión inicial bloqueante corta (máximo 5 segundos) para no bloquear indefinidamente
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 5000) {
        delay(500);
        Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] ¡Conectado con éxito!");
        Serial.print("[WiFi] Dirección IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n[WiFi] Conexión inicial no lograda. El gestor asíncrono continuará intentándolo en segundo plano.");
    }
    wifiInitialized = true;
}

void handleWiFi() {
    if (!wifiInitialized) return;

    // Si el animal está en reposo, suspender los intentos de reconexión de Wi-Fi
    if (!isAnimalMoving()) return;

    if (WiFi.status() != WL_CONNECTED) {
        unsigned long currentMillis = millis();
        if (currentMillis - lastReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
            lastReconnectAttempt = currentMillis;
            Serial.println("[WiFi] Wi-Fi desconectado. Intentando reconectar...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASS);
        }
    }
}

bool isWiFiConnected() {
    return WiFi.status() == WL_CONNECTED;
}
