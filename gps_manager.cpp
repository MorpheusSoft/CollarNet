#include <HardwareSerial.h>
#include "gps_manager.h"
#include "TinyGPS++.h"
#include "config.h"

// Objeto global de la librería TinyGPS++
TinyGPSPlus gps;

void initGPS() {
    // En el ESP32, Serial2 es un periférico de hardware dedicado.
    // Lo inicializamos a la velocidad por defecto del NEO-6M (9600 bps)
    // asignando explícitamente los pines RX2 (GPIO 16) y TX2 (GPIO 17).
    Serial2.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.printf("[GPS] Puerto Serial2 inicializado a %d baudios en Pines RX2=%d, TX2=%d\n", 
                  GPS_BAUD, GPS_RX_PIN, GPS_TX_PIN);
}

void updateGPS() {
    // Leemos todos los caracteres que hayan llegado al búfer FIFO de hardware
    // y los pasamos al decodificador NMEA de la librería.
    while (Serial2.available() > 0) {
        gps.encode(Serial2.read());
    }
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
