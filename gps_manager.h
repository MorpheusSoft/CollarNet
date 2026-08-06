#ifndef GPS_MANAGER_H
#define GPS_MANAGER_H

#include "geofence.h"

// Inicializa la comunicación serial por hardware Serial2 para el GPS
void initGPS();

// Procesa los caracteres recibidos en el búfer serial (debe llamarse constantemente en loop)
void updateGPS();

// Retorna la coordenada geográfica actual
Coordinate getGPSLocation();

// Verifica si la señal satelital es válida e indica si tiene Fix
bool isGPSLocationValid();

// Retorna el tiempo (en ms) transcurrido desde la última lectura válida
uint32_t getGPSAge();

// Retorna la cantidad de satélites en vista
uint32_t getGPSSatellites();

// Retorna la cantidad de caracteres procesados por la librería (diagnóstico de comunicación)
uint32_t getGPSCharsProcessed();

// Retorna la hora local de Venezuela (HH:MM:SS) obtenida del satélite GPS
String getGPSTimeString();

#endif // GPS_MANAGER_H
