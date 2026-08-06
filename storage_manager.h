#ifndef STORAGE_MANAGER_H
#define STORAGE_MANAGER_H

#include <Arduino.h>

// Inicializa el sistema de archivos LittleFS
bool initStorage();

// Guarda la configuración JSON recibida vía MQTT en LittleFS
bool saveGeofenceConfig(const String& jsonConfig);

// Carga la configuración guardada desde LittleFS a la memoria del collar
bool loadGeofenceConfig();

// Carga los polígonos por defecto de prueba (fallbacks si no hay archivo)
void loadDefaultGeofence();

// Caja Negra LittleFS: Registra coordenadas y métricas de caminata en memoria flash
void logWalkPoint(const char* timeStr, double lat, double lon, int sats, uint32_t age, int alertLevel, double distHato, double distPotrero, bool insideHato, bool insidePotrero);

// Imprime el registro completo de la caminata por consola serie USB
void dumpWalkLog();

// Borra el archivo de caja negra para empezar un registro 100% nuevo desde cero
void clearWalkLog();

#endif // STORAGE_MANAGER_H
