#ifndef GPS_EMULATOR_H
#define GPS_EMULATOR_H

#include "geofence.h"

// Cantidad de vértices para los rectángulos de prueba (4)
#define RECT_VERTICES 4

// Umbral de distancia para pre-alerta (en metros)
#define HATO_WARNING_THRESHOLD_M 10.0



// Inicializa las coordenadas de la simulación
void initGPSEmulator();

// Retorna la siguiente coordenada simulada en el camino y avanza el índice
Coordinate getNextMockGPS();

// Retorna el índice actual de la simulación
int getMockGPSIndex();

// Retorna la cantidad total de puntos en la ruta simulada
int getMockGPSTotalPoints();

#endif // GPS_EMULATOR_H
