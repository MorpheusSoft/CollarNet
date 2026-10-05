#include "gps_emulator.h"



// Ruta sintética de caminata del animal para validación en Área Amplia
Coordinate mockRoute[] = {
    {10.671340, -71.604120}, // Paso 0: Centro de Potrero Amplio (Zona Segura)
    {10.672400, -71.602800}, // Paso 1: Caminata interna noreste (~200m del centro)
    {10.673800, -71.601200}, // Paso 2: Borde este de Potrero de Pruebas (~400m - Pre-alerta)
    {10.675500, -71.599500}, // Paso 3: Lindero este del Hato Principal (~600m - Alerta Advertencia)
    {10.677500, -71.597500}, // Paso 4: Escape exterior fuera del Hato (>800m - Alerta Escape Hato)
    {10.671340, -71.604120}  // Paso 5: Retorno seguro al centro del área amplia (Rearme)
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
