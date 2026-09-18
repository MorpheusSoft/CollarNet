#include <HardwareSerial.h>
#include "gps_manager.h"
#include "TinyGPS++.h"
#include "config.h"

// Objeto global de la librería TinyGPS++
TinyGPSPlus gps;

void initGPS() {
    Serial.println("[GPS] Módulo GNSS integrado en SIM7670G gestionado vía SerialAT.");
}

void updateGPS() {
    // La adquisición satelital se maneja directamente vía módem SIM7670G en el loop principal
}

Coordinate getGPSLocation() {
    Coordinate coord;
    if (gps.location.isValid()) {
        coord.lat = gps.location.lat();
        coord.lon = gps.location.lng();
    } else {
        coord.lat = 0.0;
        coord.lon = 0.0;
    }
    return coord;
}

bool isGPSLocationValid() {
    // Consideramos válida la posición si la librería confirma la fijación (isValid)
    // y si el último dato decodificado no tiene más de 5 segundos de antigüedad.
    return gps.location.isValid() && gps.location.age() < 5000;
}

uint32_t getGPSAge() {
    if (gps.location.isValid()) {
        return gps.location.age();
    }
    return 999999;
}

uint32_t getGPSSatellites() {
    if (gps.satellites.isValid()) {
        return gps.satellites.value();
    }
    return 0;
}

uint32_t getGPSCharsProcessed() {
    return gps.charsProcessed();
}

String getGPSTimeString() {
    if (gps.time.isValid()) {
        char buf[16];
        // Convertir UTC a hora local de Venezuela (VET UTC-4)
        int hour = gps.time.hour();
        int min = gps.time.minute();
        int sec = gps.time.second();
        
        hour = (hour + 20) % 24; // (hour - 4 + 24) % 24
        
        snprintf(buf, sizeof(buf), "%02d:%02d:%02d", hour, min, sec);
        return String(buf);
    }
    return String("00:00:00");
}
