#include <WiFi.h>
#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024
#include <TinyGsmClient.h>
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

// Hardware Serial para módem SIM7670G (ESP32-S3 UART1: RX=17, TX=18)
HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);
TinyGsmClient gsmClient(modem);
WiFiClient wifiClient;

bool gsmActive = false;
bool wifiActive = false;
// Temporizador para procesar la telemetría y geocercas cada 1 segundo
unsigned long lastGPSCheckTime = 0;
const unsigned long GPS_CHECK_INTERVAL = 1000;

String hardwareIMEI = "";

// Función para leer el IMEI unívoco del módem SIM7670G
String readHardwareIMEI() {
    modem.sendAT("+CGSN");
    if (modem.waitResponse(1000L, GF("\r\n")) == 1) {
        String imei = SerialAT.readStringUntil('\n');
        modem.waitResponse();
        imei.trim();
        if (imei.length() >= 14) {
            return imei;
        }
    }
    modem.sendAT("+SIMEI?");
    if (modem.waitResponse(1000L, GF("+SIMEI: ")) == 1) {
        String imei = SerialAT.readStringUntil('\n');
        modem.waitResponse();
        imei.trim();
        if (imei.length() >= 14) {
            return imei;
        }
    }
    return "864643061445526"; // Fallback por defecto verificado en hardware
}

// Función para consultar porcentaje de batería, voltaje y estado de carga vía módem AT+CBC
bool readBatteryStatus(int &percent, int &voltageMv, bool &isCharging) {
    modem.sendAT("+CBC");
    if (modem.waitResponse(1000L, GF("+CBC:")) == 1) {
        String resp = SerialAT.readStringUntil('\n');
        modem.waitResponse();
        resp.trim();

        if (resp.endsWith("V") || resp.indexOf('.') != -1) {
            float v = resp.toFloat();
            if (v > 0.1f) {
                voltageMv = (int)(v * 1000.0f);
            }
        } else if (resp.indexOf(',') != -1) {
            int c1 = resp.indexOf(',');
            int c2 = resp.indexOf(',', c1 + 1);
            if (c1 != -1 && c2 != -1) {
                int bcs = resp.substring(0, c1).toInt();
                percent = resp.substring(c1 + 1, c2).toInt();
                voltageMv = resp.substring(c2 + 1).toInt();
                isCharging = (bcs == 1 || bcs == 2);
            }
        }

        if (voltageMv > 0) {
            if (voltageMv >= 4220) {
                isCharging = true;
                percent = 100;
            } else if (voltageMv >= 4150) {
                percent = 98;
            } else if (voltageMv >= 4050) {
                percent = 90;
            } else if (voltageMv >= 3950) {
                percent = 80;
            } else if (voltageMv >= 3850) {
                percent = 70;
            } else if (voltageMv >= 3780) {
                percent = 60;
            } else if (voltageMv >= 3730) {
                percent = 50;
            } else if (voltageMv >= 3680) {
                percent = 40;
            } else if (voltageMv >= 3620) {
                percent = 30;
            } else if (voltageMv >= 3550) {
                percent = 20;
            } else if (voltageMv >= 3450) {
                percent = 10;
            } else {
                percent = 5;
            }
            return true;
        }
    }
    return false;
}

void setup() {
    // Inicializar puerto Serial de depuración (USB)
    Serial.begin(SERIAL_BAUD);
    delay(1000); // Pausa estética
    
    Serial.println("=========================================");
    Serial.println("   COLLAR GANADERO - HARDWARE 4G LTE     ");
    Serial.println("   (Waveshare ESP32-S3 + SIM7670G)        ");
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
    
    // Alimentar e iniciar UART1 con módem SIM7670G
    #if defined(MODEM_POWER_PIN) && (MODEM_POWER_PIN >= 0)
    pinMode(MODEM_POWER_PIN, OUTPUT);
    digitalWrite(MODEM_POWER_PIN, HIGH);
    delay(500);
    #endif

    Serial.printf("[Módem] Iniciando comunicación UART1 (RX=%d, TX=%d) a %d baud...\n", 
                  MODEM_RX_PIN, MODEM_TX_PIN, MODEM_BAUD);
    SerialAT.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
    delay(1000);

    // Leer y validar IMEI único del hardware SIM7670G
    Serial.println("[Hardware] Identificando módulo y leyendo IMEI...");
    hardwareIMEI = readHardwareIMEI();
    Serial.printf("[Hardware] ✅ IMEI Identificado: %s\n", hardwareIMEI.c_str());

    // Encender GPS satelital interno del SIM7670G
    Serial.println("[GNSS] Encendiendo receptor GNSS satelital del SIM7670G...");
    modem.sendAT("+CGNSSPWR=1");
    delay(500);
    modem.sendAT("+CGNSSTST=1");
    delay(300);

    // Conectar Wi-Fi primero para asegurar conectividad de desarrollo y broker
    Serial.println("[Red] Inicializando conectividad...");
    initWiFi();
    if (WiFi.status() == WL_CONNECTED) {
        wifiActive = true;
        Serial.println("[Red] ¡Conectado a Wi-Fi de alta velocidad!");
        initMQTT(COLLAR_ID, &wifiClient);
    } else {
        Serial.printf("[Celular] Conectando a red de datos APN: %s...\n", MODEM_APN);
        if (modem.gprsConnect(MODEM_APN, "", "")) {
            Serial.println("[Celular] ¡Conexión de datos 4G LTE DIGITEL establecida con éxito!");
            gsmActive = true;
            initMQTT(COLLAR_ID, &gsmClient);
        } else {
            Serial.println("[Red] Sin conexión celular ni Wi-Fi inicial. Reintentando de fondo...");
            initMQTT(COLLAR_ID, &wifiClient);
        }
    }
    
    // Inicializar receptor GPS físico o Emulador según configuración
    if (USE_EMULATOR) {
        Serial.println("[Sistema] Modo SIMULACIÓN activo (Caminata de pruebas).");
        initGPSEmulator();
    } else {
        Serial.println("[Sistema] Modo GPS FÍSICO GNSS activo.");
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
        if (gsmActive) {
            initMQTT(COLLAR_ID, &gsmClient);
        } else {
            initWiFi();
            initMQTT(COLLAR_ID, &wifiClient);
        }
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
            // Obtener coordenada del receptor GNSS del módem SIM7670G
            float gLat = 0.0, gLon = 0.0, gSpeed = 0.0, gAlt = 0.0;
            int gVsat = 0, gUsat = 0;
            bool rawHasPosition = false;
            Coordinate rawPos = {0.0, 0.0};

            if (modem.getGPS(&gLat, &gLon, &gSpeed, &gAlt, &gVsat, &gUsat)) {
                if (abs(gLat) > 0.001) {
                    rawPos.lat = gLat;
                    rawPos.lon = gLon;
                    sats = (gUsat > 0) ? gUsat : gVsat;
                    rawHasPosition = true;
                }
            }

            if (rawHasPosition) {
                if (everHadFix) {
                    // Filtro Exponencial EMA para eliminar deriva y parpadeos (70% lectura actual, 30% anterior)
                    currentPos.lat = 0.7 * rawPos.lat + 0.3 * lastKnownPos.lat;
                    currentPos.lon = 0.7 * rawPos.lon + 0.3 * lastKnownPos.lon;
                } else {
                    currentPos = rawPos;
                }
                lastKnownPos = currentPos;
                everHadFix = true;
                hasPosition = true;
                age = 0;
            } else if (everHadFix) {
                // Retener última posición conocida
                currentPos = lastKnownPos;
                hasPosition = true;
                age = millis() - lastGPSCheckTime;
            } else {
                hasPosition = false;
            }
        }
        
        // Si no tenemos una posición válida del GPS (ej. sin cobertura en interiores)
        if (!hasPosition) {
            int currentBat = 100;
            int currentVbat = 4227;
            bool isCharging = false;
            readBatteryStatus(currentBat, currentVbat, isCharging);

            Serial.println("\n------------------------------------------------");
            Serial.println("[GNSS SIM7670G] Esperando enganche de satélites en cielo abierto...");
            Serial.printf("Satélites: %d | Batería: %d%% (%d mV) | ⚡ Carga USB: %s\n", 
                          sats, currentBat, currentVbat, isCharging ? "ACTIVA" : "DESCONECTADA");
            Serial.printf("Dispositivo IMEI: %s\n", hardwareIMEI.c_str());
            Serial.println("------------------------------------------------");

            // Enviar telemetría de latido para que el porcentaje y estado se vean en vivo en la web
            static unsigned long lastIndoorTelemetryTime = 0;
            if (millis() - lastIndoorTelemetryTime >= 3000) {
                lastIndoorTelemetryTime = millis();
                // Coordenadas de prueba en Potrero A (Hato Oficina)
                double refLat = 10.671340;
                double refLon = -71.604030;
                publishTelemetry(refLat, refLon, currentBat, 4, "INDOOR_USB", hardwareIMEI, currentVbat, isCharging);
            }
            
            // Colocar alerta en NONE y silenciar de inmediato
            updateAlerts(ALERT_NONE);
            return;
        }
        
        // --- PROCESAMIENTO DE GEOCERCAS JERÁRQUICAS (HATO Y POTRERO) ---
        
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
            // FUERA DEL HATO (¡ESCAPE MAYOR DE LA FINCA!): ALERTA MÁXIMA CONTINUA Y MÁS FUERTE
            nextAlertLevel = ALERT_CRITICAL_HATO;
            alertStr = "ESCAPE_HATO";
            currentUbicacion = "¡¡FUERA DEL HATO (ESCAPE MAYOR)!!";
        } else if (distToHatoBorder <= warningThreshold) {
            // APROXIMÁNDOSE AL LÍMITE EXTERIOR DEL HATO (<3m): ADVERTENCIA
            nextAlertLevel = ALERT_WARNING;
            alertStr = "PROXIMIDAD_HATO";
            currentUbicacion = "Aproximándose a lindero de Hato (Advertencia 3m)";
        } else if (!potreroAbierto) {
            // MODO POTRERO CERRADO (Pastoreo regular con contención en potrero)
            if (!insidePotrero) {
                // Fuera del Potrero asignado (Infracción de rotación)
                nextAlertLevel = ALERT_DANGER;
                alertStr = "INFRACCION_ROTACION";
                currentUbicacion = "Fuera de Potrero Asignado (Infracción Rotación)";
            } else if (distToPotreroBorder <= warningThreshold) {
                // Dentro del Potrero pero a menos del umbral de advertencia (<3m)
                nextAlertLevel = ALERT_WARNING;
                alertStr = "PROXIMIDAD_CERCA";
                currentUbicacion = "Aproximándose a cerca de potrero (Advertencia 3m)";
            } else {
                // Dentro del Potrero seguro
                nextAlertLevel = ALERT_NONE;
                alertStr = "NORMAL";
                currentUbicacion = (numPotreros > 0) ? potrerosList[0].name : "Potrero Asignado";
            }
        } else {
            // MODO TRASLADO / TALANQUERA ABIERTA:
            // Permite salir del potrero sin emitir alarma de potrero.
            // Solo sonará si se acerca o cruza los límites exteriores del Hato (evaluado arriba).
            nextAlertLevel = ALERT_NONE;
            alertStr = "MODO_TRASLADO";
            currentUbicacion = "Modo Traslado (Talanquera Abierta - Tránsito Libre)";
        }
        
        // C. Actualizar nivel de alertas local (led y buzzer en IO5 a 4000 Hz)
        updateAlerts(nextAlertLevel);
        
        // D. Publicar telemetría por MQTT con batería real e IMEI
        int currentBat = 100;
        int currentVbat = 4227;
        bool isCharging = false;
        readBatteryStatus(currentBat, currentVbat, isCharging);
        int mockSignal = (sats > 4) ? 5 : 3;
        publishTelemetry(currentPos.lat, currentPos.lon, currentBat, mockSignal, alertStr, hardwareIMEI, currentVbat, isCharging);
        
        // E. Registrar muestra en la Caja Negra de memoria Flash (LittleFS)
        String timeStr = String(millis() / 1000) + "s";
        logWalkPoint(timeStr.c_str(), currentPos.lat, currentPos.lon, sats, age, nextAlertLevel, distToHatoBorder, distToPotreroBorder, insideHato, insidePotrero);
        
        // F. Imprimir reporte de depuración por consola serial (USB)
        Serial.println("\n------------------------------------------------");
        if (USE_EMULATOR) {
            int stepIdx = getMockGPSIndex();
            int totalSteps = getMockGPSTotalPoints();
            Serial.printf("[Telemetría (SIMULADO)] Paso: %d/%d\n", stepIdx + 1, totalSteps);
        } else {
            Serial.printf("[Telemetría (GNSS 4G)] Satélites: %d | Potrero: %s\n", 
                          sats, potreroAbierto ? "ABIERTO (Traslado)" : "CERRADO");
        }
        Serial.printf("Coordenadas: Lat: %.6f, Lon: %.6f\n", currentPos.lat, currentPos.lon);
        Serial.printf("Ubicación Actual: %s\n", currentUbicacion);
        Serial.printf("¿En Hato?: %s | ¿En Potrero?: %s\n", insideHato ? "SÍ" : "NO", insidePotrero ? "SÍ" : "NO");
        Serial.printf("Distancia lindero Hato: %.2f m | Distancia lindero Potrero: %.2f m\n", distToHatoBorder, distToPotreroBorder);
        
        Serial.print("Nivel de Alerta: ");
        if (currentAlert == ALERT_NONE) {
            Serial.println("NORMAL (Silencio / Seguro)");
        } else if (currentAlert == ALERT_WARNING) {
            Serial.println("ADVERTENCIA (Lindero a < 3m - Bips lentos 4000Hz)");
        } else if (currentAlert == ALERT_DANGER) {
            Serial.println("PELIGRO (Infracción Potrero - Bips rápidos 4000Hz)");
        } else if (currentAlert == ALERT_CRITICAL_HATO) {
            Serial.println("¡¡ESCAPE CRÍTICO DE HATO (SONIDO CONTINUO MÁS FUERTE 4000Hz)!!");
        }
        Serial.println("------------------------------------------------");
    }
}
