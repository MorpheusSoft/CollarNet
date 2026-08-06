#ifndef IMU_MANAGER_H
#define IMU_MANAGER_H

#include <Arduino.h>

// Inicializa el bus I2C en los pines por defecto (SDA=21, SCL=22) y despierta al MPU-6050
void initIMU();

// Lee los registros de aceleración del MPU-6050 y actualiza el análisis de movimiento
void updateIMU();

// Retorna true si el animal se está moviendo, false si está en reposo
bool isAnimalMoving();

// Retorna el último delta de cambio de aceleración calculado (diagnóstico de vibración)
uint32_t getMotionDelta();

#endif // IMU_MANAGER_H
