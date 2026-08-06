#ifndef GEOFENCE_H
#define GEOFENCE_H

#include <Arduino.h>

struct Coordinate {
    double lat;
    double lon;
};

struct Polygon {
    int id;                 // ID único (ej: 100 para Hato, 1 para Potrero 1)
    const char* name;       // Nombre legible
    Coordinate* vertices;   // Puntero al arreglo de vértices
    int numVertices;        // Cantidad de vértices
};

// Límites estáticos de vértices en ESP32 para evitar fragmentación
#define MAX_VERTICES 16

extern Coordinate hatoVertices[MAX_VERTICES];
extern Coordinate potreroVertices[MAX_VERTICES];

extern Polygon hatoMaster;
extern Polygon potrerosList[];
extern int numPotreros;
extern double hatoWarningThreshold;

// Algoritmo de "Punto en Polígono" (Ray-Casting)
bool isPointInPolygon(Coordinate p, Coordinate* poly, int numVertices);

// Cálculo de distancia de un punto a un segmento de recta en metros (proyección plana local)
double getDistanceToSegment(Coordinate p, Coordinate a, Coordinate b);

// Cálculo de la distancia mínima de un punto al perímetro de un polígono en metros
double getDistanceToPolygon(Coordinate p, Coordinate* poly, int numVertices);

#endif // GEOFENCE_H
