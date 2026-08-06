#include "gps_emulator.h"



// Ruta sintética de caminata del animal para validación
Coordinate mockRoute[] = {
    {9.1000, -67.1005}, // Paso 0: Centro de Potrero 1 (Seguro, lejos de bordes)
    {9.1000, -67.1001}, // Paso 1: Acercándose a la división central interna (Seguro)
    {9.1000, -67.0999}, // Paso 2: Cruzando a Potrero 2 (Seguro, transición interna sin alertas)
    {9.1000, -67.0995}, // Paso 3: Centro de Potrero 2 (Seguro)
    {9.1000, -67.09907},// Paso 4: Aproximación al borde derecho del Hato (Pre-alerta, a ~7.7m del límite)
    {9.1000, -67.0988}, // Paso 5: Escape exterior al este del Hato (Alerta Peligro)
    {9.1000, -67.1005}  // Paso 6: Retorno y rearme rápido en Potrero 1 (Seguro)
};

const int totalRoutePoints = sizeof(mockRoute) / sizeof(mockRoute[0]);
int currentRouteIndex = 0;

void initGPSEmulator() {
    currentRouteIndex = 0;
}

Coordinate getNextMockGPS() {
    Coordinate currentPoint = mockRoute[currentRouteIndex];
    // Incrementa y cicla el índice para la siguiente consulta
    currentRouteIndex = (currentRouteIndex + 1) % totalRoutePoints;
    return currentPoint;
}

int getMockGPSIndex() {
    return currentRouteIndex == 0 ? totalRoutePoints - 1 : currentRouteIndex - 1;
}

int getMockGPSTotalPoints() {
    return totalRoutePoints;
}
