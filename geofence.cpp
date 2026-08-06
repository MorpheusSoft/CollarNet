#include "geofence.h"
#include <math.h>

// Definición de variables globales dinámicas de geocercas
Coordinate hatoVertices[MAX_VERTICES];
Coordinate potreroVertices[MAX_VERTICES];

Polygon hatoMaster = {100, "Hato Principal", hatoVertices, 0};
Polygon potrerosList[1] = {
    {1, "Potrero Activo", potreroVertices, 0}
};
int numPotreros = 0;
double hatoWarningThreshold = 10.0;

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Coeficiente promedio de conversión de grados a metros (Latitud)
const double METERS_PER_DEGREE_LAT = 111132.95;

bool isPointInPolygon(Coordinate p, Coordinate* poly, int numVertices) {
    if (numVertices < 3 || poly == nullptr) return false;
    
    bool inside = false;
    for (int i = 0, j = numVertices - 1; i < numVertices; j = i++) {
        // Algoritmo de Ray-Casting para determinar intersección del rayo
        if (((poly[i].lat > p.lat) != (poly[j].lat > p.lat)) &&
            (p.lon < (poly[j].lon - poly[i].lon) * (p.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lon)) {
            inside = !inside;
        }
    }
    return inside;
}

double getDistanceToSegment(Coordinate p, Coordinate a, Coordinate b) {
    // Proyección cartográfica plana local tomando el punto A como origen (0,0)
    double latRad = a.lat * M_PI / 180.0;
    double metersPerDegreeLon = METERS_PER_DEGREE_LAT * cos(latRad);
    
    // Vector del punto B relativo a A (en metros)
    double bx = (b.lon - a.lon) * metersPerDegreeLon;
    double by = (b.lat - a.lat) * METERS_PER_DEGREE_LAT;
    
    // Vector del punto P relativo a A (en metros)
    double px = (p.lon - a.lon) * metersPerDegreeLon;
    double py = (p.lat - a.lat) * METERS_PER_DEGREE_LAT;
    
    // Proyección vectorial de P sobre el segmento AB
    double dotProduct = px * bx + py * by;
    double segmentLenSq = bx * bx + by * by;
    
    double t = 0.0;
    if (segmentLenSq > 0.0) {
        t = dotProduct / segmentLenSq;
        // Truncar el factor de proyección a los extremos del segmento
        if (t < 0.0) t = 0.0;
        if (t > 1.0) t = 1.0;
    }
    
    // Punto más cercano C en metros
    double cx = t * bx;
    double cy = t * by;
    
    // Distancia euclidiana entre P y C
    double dx = px - cx;
    double dy = py - cy;
    return sqrt(dx * dx + dy * dy);
}

double getDistanceToPolygon(Coordinate p, Coordinate* poly, int numVertices) {
    if (numVertices < 3 || poly == nullptr) return 999999.0;
    
    double minDistance = 999999.0;
    for (int i = 0, j = numVertices - 1; i < numVertices; j = i++) {
        double dist = getDistanceToSegment(p, poly[j], poly[i]);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }
    return minDistance;
}
