#include "gps_emulator.h"



// Ruta sintética de caminata del animal para validación (Hato Oficina / Potrero A)
Coordinate mockRoute[] = {
    {10.671340, -71.604120}, // Paso 0: Centro de Potrero A (Seguro, dentro de cerca)
    {10.671360, -71.604080}, // Paso 1: Caminata interna en Potrero A (Seguro)
    {10.671340, -71.604020}, // Paso 2: Borde este de Potrero A (Aproximación / Pre-alerta)
    {10.671340, -71.603900}, // Paso 3: Lindero este del Hato Principal (Alerta Advertencia)
    {10.671340, -71.603680}, // Paso 4: Escape exterior fuera del Hato (Alerta Peligro / Zumbador)
    {10.671340, -71.604120}  // Paso 5: Retorno seguro al centro de Potrero A (Rearme)
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
