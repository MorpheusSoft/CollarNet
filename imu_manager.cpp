#include <Wire.h>
#include "imu_manager.h"
#include "config.h"

// Dirección I2C por defecto del MPU-6050
#define MPU_ADDR 0x68

// Registros internos del MPU-6050
#define REG_PWR_MGMT_1 0x6B
#define REG_ACCEL_XOUT_H 0x3B

// Umbral de variación de aceleración para considerar que hay movimiento
// Aceleración de 1g en escala por defecto (2g) equivale a 16384 unidades raw.
// 1800 es aproximadamente un 11% de gravedad, ideal para descartar ruido y captar pasos del animal.
const uint32_t MOTION_THRESHOLD = 1800;

// Tiempo necesario de quietud para entrar en modo de ahorro (30 segundos)
const unsigned long INACTIVITY_TIMEOUT = 30000; 

// Variables globales internas de estado
int16_t prevAx = 0, prevAy = 0, prevAz = 0;
uint32_t currentDelta = 0;
unsigned long lastMovementTime = 0;
bool animalIsMoving = true;
bool imuInitialized = false;

void initIMU() {
    Wire.begin(); // Inicializar bus I2C (SDA=21, SCL=22 en ESP32)
    
    // Configurar e iniciar comunicación con el sensor
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_PWR_MGMT_1); // Registro de gestión de energía
    Wire.write(0);             // Escribir 0 para despertar al sensor (sale de sleep mode)
    byte error = Wire.endTransmission(true);
    
    if (error == 0) {
        Serial.println("[IMU] MPU-6050 detectado y despertado con éxito en dirección 0x68.");
        imuInitialized = true;
        lastMovementTime = millis();
    } else {
        Serial.printf("[IMU ERROR] No se pudo comunicar con el MPU-6050 en I2C. Código de error: %d\n", error);
        imuInitialized = false;
    }
}

void updateIMU() {
    if (!imuInitialized) return;
    
    // Solicitar lectura de 6 bytes (registros 0x3B al 0x40 para aceleraciones X, Y, Z)
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(REG_ACCEL_XOUT_H); // Iniciar lectura en el registro X OUT H
    Wire.endTransmission(false);
    
    uint8_t bytesRead = Wire.requestFrom((int)MPU_ADDR, (int)6, (int)1);
    if (bytesRead < 6) {
        return; // Lectura fallida, descartar ciclo
    }
    
    // Reconstruir los enteros de 16 bits combinando High y Low bytes
    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();
    
    // Calcular la variación absoluta de aceleración respecto al ciclo anterior
    currentDelta = abs(ax - prevAx) + abs(ay - prevAy) + abs(az - prevAz);
    
    // Guardar lecturas para la siguiente comparación
    prevAx = ax;
    prevAy = ay;
    prevAz = az;
    
    unsigned long currentMillis = millis();
    
    // Si la variación supera el umbral, el animal se está moviendo
    if (currentDelta > MOTION_THRESHOLD) {
        lastMovementTime = currentMillis;
        animalIsMoving = true;
    } else {
        // Si no supera el umbral, evaluar si ya excedimos el tiempo de quietud
        if (currentMillis - lastMovementTime >= INACTIVITY_TIMEOUT) {
            animalIsMoving = false;
        }
    }
}

bool isAnimalMoving() {
    if (!imuInitialized) return true; // Por seguridad, si el sensor falla asumimos movimiento
    return animalIsMoving;
}

uint32_t getMotionDelta() {
    return currentDelta;
}
