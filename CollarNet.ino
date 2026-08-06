#include <WiFi.h>
#include "config.h"
#include "secrets.h"
#include "wifi_manager.h"
#include "alerts.h"
#include "geofence.h"
#include "gps_emulator.h"
#include "gps_manager.h"
#include "imu_manager.h"
#include "storage_manager.h"
#include "mqtt_manager.h"

// Temporizador para procesar la telemetría y geocercas cada 1 segundo (Tiempo Real Instantáneo)
unsigned long lastGPSCheckTime = 0;
const unsigned long GPS_CHECK_INTERVAL = 1000;

void setup() {
    // Inicializar puerto Serial de depuración (USB)
    Serial.begin(SERIAL_BAUD);
    while (!Serial) {
        ; // Espera para puertos USB nativos
    }
    delay(1000); // Pausa estética
    
    Serial.println("=========================================");
    Serial.println("   COLLAR GANADERO - PROTOTIPO FASE 4     ");
    Serial.println("   (Geocerca, MQTT, Storage y GPS)        ");
    Serial.println("=========================================");
    
    // Inicializar subsistemas
    initAlerts();
    initIMU(); // Inicializar acelerómetro MPU-6050 vía I2C
    
    // Inicializar almacenamiento persistente LittleFS
    initStorage();
    // Volcar caja negra de la caminata previa a la consola Serial USB
    dumpWalkLog();
    // Carga la geocerca previamente guardada, o los valores por defecto si es el primer arranque
    loadGeofenceConfig();
    
    // Conectar Wi-Fi
    initWiFi();
    
    // Inicializar cliente MQTT y suscribirse
    initMQTT(COLLAR_ID);
    
    // Inicializar receptor GPS físico o Emulador según configuración
    if (USE_EMULATOR) {
        Serial.println("[Sistema] Modo SIMULACIÓN activo (Caminata de pruebas).");
        initGPSEmulator();
    } else {
        Serial.println("[Sistema] Modo GPS FÍSICO activo.");
        initGPS();
    }
    
    Serial.println("\n[Sistema] Iniciando monitoreo de geocerca...");
    lastGPSCheckTime = millis();
}

void loop() {
    // 1. Mantener el acelerómetro actualizado en cada ciclo
    updateIMU();
    
    // 2. Control del Modo de Ahorro de Energía (IMU)
    static bool powerSaveModeActive = false;
    bool moving = isAnimalMoving();
    
    if (!moving && !powerSaveModeActive) {
        powerSaveModeActive = true;
        Serial.println("\n[Energía] INACTIVIDAD DETECTADA (reposo). Entrando en Modo Ahorro...");
        Serial.println("[Energía] Apagando Wi-Fi (Consumo reducido a ~20mA)...");
        WiFi.disconnect(true);
        WiFi.mode(WIFI_OFF);
    } else if (moving && powerSaveModeActive) {
        powerSaveModeActive = false;
        Serial.println("\n[Energía] MOVIMIENTO DETECTADO! Saliendo del Modo Ahorro...");
        initWiFi(); // Re-conectar a la red Wi-Fi
        initMQTT(COLLAR_ID); // Re-conectar al Broker MQTT
    }
    
    // 3. Mantener la conexión Wi-Fi de fondo (solo si no está en ahorro)
    handleWiFi();
    
    // 4. Procesar tareas MQTT en segundo plano (escucha de tópicos)
    if (!powerSaveModeActive) {
        handleMQTT();
    }
    
    // 5. Mantener el parpadeo del LED integrado y zumbador físico de fondo
    extern AlertLevel currentAlert;
    updateAlerts(currentAlert);
    
    // 6. Si usamos el GPS físico y no estamos en ahorro, leer el puerto serial
    if (!USE_EMULATOR && !powerSaveModeActive) {
        updateGPS();
    }
    
    // 7. Procesamiento de geocerca y envío de telemetría cada 5 segundos
    unsigned long currentMillis = millis();
    if (currentMillis - lastGPSCheckTime >= GPS_CHECK_INTERVAL) {
        lastGPSCheckTime = currentMillis;
        
        Coordinate currentPos;
        bool hasPosition = false;
        uint32_t sats = 0;
        uint32_t age = 0;
        
        static Coordinate lastKnownPos = {0.0, 0.0};
        static bool everHadFix = false;

        if (USE_EMULATOR) {
            // Obtener coordenada del simulador de caminata
            currentPos = getNextMockGPS();
            hasPosition = true;
            sats = 8;
            age = 0;
        } else {
            // Obtener coordenada del GPS físico y requerir mínimo 4 satélites para estabilidad 3D
            bool rawHasPosition = isGPSLocationValid();
            sats = getGPSSatellites();
            age = getGPSAge();
            bool validFix = rawHasPosition && (sats >= 4);

            if (validFix) {
                Coordinate rawPos = getGPSLocation();
                if (everHadFix) {
                    // Filtro Exponencial EMA para eliminar deriva y parpadeos de 2-3m en el GPS (70% lectura actual, 30% anterior)
                    currentPos.lat = 0.7 * rawPos.lat + 0.3 * lastKnownPos.lat;
                    currentPos.lon = 0.7 * rawPos.lon + 0.3 * lastKnownPos.lon;
                } else {
                    currentPos = rawPos;
                }
                lastKnownPos = currentPos;
                everHadFix = true;
                hasPosition = true;
            } else if (everHadFix && age < 15000) {
                // Retener última posición conocida por 15s si hubo caída/parpadeo de satélites (<4 sats)
                currentPos = lastKnownPos;
                hasPosition = true;
            } else {
                hasPosition = false;
            }
        }
        
        // Si no tenemos una posición válida del GPS físico (ej. sin señal en interiores)
        if (!hasPosition) {
            Serial.println("\n------------------------------------------------");
            Serial.println("[GPS] Esperando señal satelital válida...");
            Serial.printf("Satélites en vista: %d | Antigüedad del dato: %d ms\n", sats, age);
            if (!USE_EMULATOR) {
                Serial.printf("Caracteres procesados del GPS: %u\n", getGPSCharsProcessed());
            }
            Serial.println("------------------------------------------------");
            
            // Colocar alerta en NONE y silenciar de inmediato
            updateAlerts(ALERT_NONE);
            return;
        }
        
        // --- PROCESAMIENTO DE GEOCERCAS ---
        
        // A. Evaluar si está dentro del Hato Principal
        bool insideHato = (hatoMaster.numVertices > 0) ? isPointInPolygon(currentPos, hatoMaster.vertices, hatoMaster.numVertices) : true;
        
        // B. Evaluar si está dentro del Potrero Asignado
        bool insidePotrero = (numPotreros > 0 && potrerosList[0].numVertices > 0) ? isPointInPolygon(currentPos, potrerosList[0].vertices, potrerosList[0].numVertices) : true;
        
        AlertLevel nextAlertLevel = ALERT_NONE;
        String alertStr = "NORMAL";
        double distToHatoBorder = (hatoMaster.numVertices > 0) ? getDistanceToPolygon(currentPos, hatoMaster.vertices, hatoMaster.numVertices) : 0.0;
        double distToPotreroBorder = (numPotreros > 0 && potrerosList[0].numVertices > 0) ? getDistanceToPolygon(currentPos, potrerosList[0].vertices, potrerosList[0].numVertices) : 0.0;
        const char* currentUbicacion = "Zona Segura";
        
        double warningThreshold = (hatoWarningThreshold > 0) ? hatoWarningThreshold : 3.0;

        if (!insideHato) {
            // Fuera del Hato (¡Escape real!)
            nextAlertLevel = ALERT_DANGER;
            alertStr = "ESCAPE_HATO";
            currentUbicacion = "FUERA DEL HATO (¡ESCAPE!)";
        } else if (!insidePotrero) {
            // Fuera del Potrero asignado (Infracción de rotación real)
            nextAlertLevel = ALERT_DANGER;
            alertStr = "INFRACCION_ROTACION";
            currentUbicacion = "Fuera de Potrero Asignado (Infracción Rotación)";
        } else if (distToPotreroBorder <= warningThreshold || distToHatoBorder <= warningThreshold) {
            // Dentro del Potrero pero A MENOS DE 3 METROS de la cerca (Advertencia Preventiva)
            nextAlertLevel = ALERT_WARNING;
            alertStr = "PROXIMIDAD_CERCA";
            currentUbicacion = "Aproximándose a cerca virtual (Advertencia 3m)";
        } else {
            // Dentro del Potrero y A MÁS DE 3 METROS de la cerca (Zona Segura Centro)
            nextAlertLevel = ALERT_NONE;
            alertStr = "NORMAL";
            currentUbicacion = (numPotreros > 0) ? potrerosList[0].name : "Hato Principal";
        }
        
        // C. Actualizar nivel de alertas local (led y buzzer)
        updateAlerts(nextAlertLevel);
        
        // D. Publicar telemetría por MQTT
        int mockBattery = 92; // Simular nivel de batería
        int mockSignal = 5;  // Simular señal celular de red
        publishTelemetry(currentPos.lat, currentPos.lon, mockBattery, mockSignal, alertStr);
        
        // E. Registrar muestra en la Caja Negra de memoria Flash (LittleFS)
        String timeStr = getGPSTimeString();
        logWalkPoint(timeStr.c_str(), currentPos.lat, currentPos.lon, sats, age, nextAlertLevel, distToHatoBorder, distToPotreroBorder, insideHato, insidePotrero);
        
        // E. Imprimir reporte de depuración por consola serial (USB)
        Serial.println("\n------------------------------------------------");
        if (USE_EMULATOR) {
            int stepIdx = getMockGPSIndex();
            int totalSteps = getMockGPSTotalPoints();
            Serial.printf("[Telemetría (SIMULADO)] Paso: %d/%d\n", stepIdx + 1, totalSteps);
        } else {
            Serial.printf("[Telemetría (GPS REAL)] Satélites: %d | Edad: %d ms\n", sats, age);
        }
        Serial.printf("Coordenadas: Lat: %.6f, Lon: %.6f\n", currentPos.lat, currentPos.lon);
        Serial.printf("Ubicación Actual: %s\n", currentUbicacion);
        Serial.printf("¿En Hato?: %s | ¿En Potrero?: %s\n", insideHato ? "SÍ" : "NO", insidePotrero ? "SÍ" : "NO");
        Serial.printf("Distancia al límite exterior: %.2f metros\n", distToHatoBorder);
        
        Serial.print("Nivel de Alerta: ");
        if (currentAlert == ALERT_NONE) {
            Serial.println("NORMAL (Seguro)");
        } else if (currentAlert == ALERT_WARNING) {
            Serial.println("ADVERTENCIA (Rotación/Límite)");
        } else if (currentAlert == ALERT_DANGER) {
            Serial.println("PELIGRO (¡Escape!)");
        }
        Serial.println("------------------------------------------------");
    }
}
