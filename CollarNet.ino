#include <WiFi.h>
#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024
#define TINY_GSM_DEBUG Serial
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
#include "camera_manager.h"
#include "camera_stream_server.h"

// Hardware Serial para módem SIM7670G (ESP32-S3 UART1: RX=17, TX=18)
HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);
TinyGsmClient gsmClient(modem);
WiFiClient wifiClient;

bool gsmActive = false;
bool wifiActive = false;
NetPreference currentNetPref = DEFAULT_NET_PREF;
bool gpsPowered = true;

// Temporizador para procesar la telemetría y geocercas cada 10 segundos
unsigned long lastGPSCheckTime = 0;
const unsigned long GPS_CHECK_INTERVAL = 10000;

String hardwareIMEI = "";

String getActiveNetType() {
    if (currentNetPref == NET_PREF_CELLULAR) {
        return "CELULAR";
    }
    if (wifiActive && WiFi.status() == WL_CONNECTED) {
        return "WIFI";
    }
    return "CELULAR";
}

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

void applyNetworkPreference() {
    Serial.printf("\n[Red] Configurando modo de red: %s\n", 
                  currentNetPref == NET_PREF_CELLULAR ? "FORZAR CELULAR (SIM 4G LTE DIGITEL)" : 
                  (currentNetPref == NET_PREF_WIFI ? "FORZAR WIFI" : "AUTO (WIFI -> SIM 4G)"));

    if (currentNetPref == NET_PREF_CELLULAR) {
        if (wifiActive || WiFi.status() == WL_CONNECTED) {
            Serial.println("[Red] Desactivando radio Wi-Fi por preferencia de CELULAR...");
            WiFi.disconnect(true);
            WiFi.mode(WIFI_OFF);
            wifiActive = false;
        }
        Serial.println("[Celular] Esperando registro en la red celular de Digitel...");
        modem.waitForNetwork(15000L);
        Serial.printf("[Celular] Conectando a red de datos APN: %s...\n", MODEM_APN);
        if (!modem.isGprsConnected()) {
            modem.gprsConnect(MODEM_APN, "", "");
        }
        if (modem.isGprsConnected()) {
            Serial.println("[Celular] ¡Conexión de datos 4G LTE DIGITEL establecida con éxito!");
            modem.sendAT("+CDNSCFG=\"8.8.8.8\",\"8.8.4.4\"");
            modem.waitResponse();
            gsmActive = true;
        } else {
            Serial.println("[Celular] ⚠️ No se pudo establecer conexión de datos móviles GPRS/LTE en arranque. Se continuará reintentando en bucle...");
        }
        // Inicializar siempre cliente MQTT enlazado al módem celular GSM
        initMQTT(COLLAR_ID, &gsmClient);
    } else if (currentNetPref == NET_PREF_WIFI) {
        if (gsmActive && modem.isGprsConnected()) {
            Serial.println("[Red] Desconectando datos móviles por preferencia de Wi-Fi...");
            modem.gprsDisconnect();
            gsmActive = false;
        }
        Serial.println("[Red] Inicializando Wi-Fi...");
        initWiFi();
        if (WiFi.status() == WL_CONNECTED) {
            wifiActive = true;
            Serial.printf("[Red] ¡Conectado a Wi-Fi! IP: %s\n", WiFi.localIP().toString().c_str());
            if (!camStreamServer.isRunning()) {
                camStreamServer.begin(81);
                Serial.printf("[Cámara] 🚀 Servidor de video en vivo listo en: http://%s:81/stream\n", WiFi.localIP().toString().c_str());
            }
            initMQTT(COLLAR_ID, &wifiClient);
        } else {
            Serial.println("[Red] ⚠️ Wi-Fi no disponible.");
        }
    } else { // NET_PREF_AUTO
        Serial.println("[Red] Modo AUTO: Comprobando disponibilidad de Wi-Fi...");
        initWiFi();
        if (WiFi.status() == WL_CONNECTED) {
            wifiActive = true;
            Serial.printf("[Red] ¡Conectado a Wi-Fi de alta velocidad! IP: %s\n", WiFi.localIP().toString().c_str());
            if (!camStreamServer.isRunning()) {
                camStreamServer.begin(81);
                Serial.printf("[Cámara] 🚀 Servidor de video en vivo listo en: http://%s:81/stream\n", WiFi.localIP().toString().c_str());
            }
            initMQTT(COLLAR_ID, &wifiClient);
        } else {
            Serial.printf("[Celular] Wi-Fi no disponible. Conectando a red de datos APN: %s...\n", MODEM_APN);
            modem.waitForNetwork(15000L);
            if (modem.gprsConnect(MODEM_APN, "", "")) {
                Serial.println("[Celular] ¡Conexión de datos 4G LTE DIGITEL establecida con éxito!");
                gsmActive = true;
                initMQTT(COLLAR_ID, &gsmClient);
            } else {
                Serial.println("[Red] Sin conexión celular ni Wi-Fi inicial. Reintentando de fondo...");
                initMQTT(COLLAR_ID, &wifiClient);
            }
        }
    }
}

void onNetworkPreferenceChanged(NetPreference newPref) {
    if (newPref == currentNetPref) return;
    currentNetPref = newPref;
    applyNetworkPreference();
}

void onGpsPowerChanged(bool powerOn) {
    gpsPowered = powerOn;
    Serial.printf("\n[GNSS] Cambiando estado de alimentación satelital a: %s\n", powerOn ? "ENCENDIDO" : "APAGADO");
    if (powerOn) {
        modem.sendAT("+CGNSSMODE=15,0");
        modem.waitResponse(1000);
    }
    modem.sendAT(powerOn ? "+CGNSSPWR=1" : "+CGNSSPWR=0");
    modem.waitResponse();
}

bool cameraStreamingActive = false;
unsigned long lastCameraFrameTime = 0;
unsigned long cameraStreamStartTime = 0;
const unsigned long CAMERA_STREAM_MAX_DURATION_MS = 120000; // 120s timeout de protección de batería
unsigned long cameraFrameIntervalMs = 300; // ~3.3 FPS por defecto para balance perfecto entre fluidez y ancho de banda

void onCameraStreamingControl(bool enabled, int fps, const String& quality) {
    cameraStreamingActive = enabled;
    if (enabled) {
        cameraStreamStartTime = millis();
        framesize_t res = (quality.length() > 0) ? cameraMgr.parseResolution(quality) : FRAMESIZE_QVGA;
        cameraMgr.setResolution(res);
        cameraMgr.setQuality(25); // Compresión JPEG altamente optimizada para 4G (~3.2 KB por frame, máxima fluidez)
        cameraFrameIntervalMs = 50; // Envío continuo sin pausas artificiales
    } else {
        cameraMgr.setQuality(12); // Calidad alta estándar cuando no esté en streaming continuo
    }
    Serial.printf("\n[Cámara 4G] Streaming remoto %s | Intervalo: %lu ms | Resolución: %s\n", 
                  enabled ? "INICIADO (Reverse Stream Activo)" : "DETENIDO (Modo Reposo)", 
                  cameraFrameIntervalMs, cameraMgr.getResolutionName(cameraMgr.getCurrentResolution()).c_str());
}

void onCameraSnapshotRequested() {
    Serial.println("\n[Cámara 4G] Capturando y transmitiendo instantánea...");
    camera_fb_t* fb = cameraMgr.getFrame();
    if (fb != nullptr) {
        publishCameraFrame(fb->buf, fb->len);
        cameraMgr.returnFrame(fb);
        Serial.println("[Cámara 4G] Instantánea enviada con éxito.");
    }
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
    cameraMgr.begin(); // Inicializar sensor de cámara OV2640/OV5640 con búfer multi-cliente PSRAM
    
    // Inicializar almacenamiento persistente LittleFS
    initStorage();
    // Volcar caja negra de la caminata previa a la consola Serial USB
    dumpWalkLog();
    // Carga la geocerca previamente guardada, o los valores por defecto si es el primer arranque
    loadGeofenceConfig();
    // Asegurar que el collar inicie siempre operativo en pruebas locales
    collarActivo = true;
    saveCollarActiveState(true);
    updateAlerts(ALERT_NONE);
    
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

    // Encender GPS satelital interno del SIM7670G con multi-constelación activa
    Serial.println("[GNSS] Encendiendo receptor GNSS satelital del SIM7670G (GPS+GLONASS+BeiDou+Galileo)...");
    modem.sendAT("+CGNSSMODE=15,0");
    modem.waitResponse(1000);
    modem.sendAT("+CGNSSPWR=1");
    modem.waitResponse(3000);
    delay(500);
    gpsPowered = true;

    // Inicializar preferencia de red por defecto (AUTO: Wi-Fi con conmutación a SIM 4G LTE Digitel)
    currentNetPref = DEFAULT_NET_PREF;
    saveNetPreference(currentNetPref);
    Serial.printf("[Config] Preferencia de red activa: %s\n", 
                  currentNetPref == NET_PREF_CELLULAR ? "CELULAR (SIM 4G DIGITEL)" : 
                  (currentNetPref == NET_PREF_WIFI ? "WIFI" : "AUTO (WIFI + 4G LTE)"));

    // Inicializar conectividad según preferencia
    applyNetworkPreference();
    
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

// Decodificador nativo de tramas satelitales +CGNSSINFO para SIM7670G (GPS+GLONASS+Galileo+BeiDou)
bool parseSIM7670GNSS(const String& raw, double& outLat, double& outLon, int& outSats) {
    outLat = 0.0;
    outLon = 0.0;
    outSats = 0;
    if (raw.length() < 10) return false;

    String str = raw;
    int pIdx = str.indexOf("+CGNSSINFO:");
    if (pIdx >= 0) {
        str = str.substring(pIdx + 11);
    }
    str.trim();

    // Contar satélites visibles sumando los campos numéricos de constelaciones
    int c1 = str.indexOf(',');
    if (c1 > 0) {
        int c2 = str.indexOf(',', c1 + 1);
        int c3 = (c2 > 0) ? str.indexOf(',', c2 + 1) : -1;
        int c4 = (c3 > 0) ? str.indexOf(',', c3 + 1) : -1;
        int c5 = (c4 > 0) ? str.indexOf(',', c4 + 1) : -1;
        int sGps = str.substring(c1 + 1, c2).toInt();
        int sGlo = (c2 > 0 && c3 > 0) ? str.substring(c2 + 1, c3).toInt() : 0;
        int sGal = (c3 > 0 && c4 > 0) ? str.substring(c3 + 1, c4).toInt() : 0;
        int sBds = (c4 > 0 && c5 > 0) ? str.substring(c4 + 1, c5).toInt() : 0;
        outSats = sGps + sGlo + sGal + sBds;
    }

    // Buscar indicador de hemisferio Norte/Sur: ",N," o ",S,"
    int nsIdx = str.indexOf(",N,");
    char nsChar = 'N';
    if (nsIdx < 0) {
        nsIdx = str.indexOf(",S,");
        nsChar = 'S';
    }
    if (nsIdx < 0) {
        // Aún no hay enganche de latitud (esperando fijación 2D/3D)
        return false;
    }

    // Extraer latitud inmediatamente antes de ",N," o ",S,"
    int latStart = str.lastIndexOf(',', nsIdx - 1);
    if (latStart < 0) return false;
    String latStr = str.substring(latStart + 1, nsIdx);
    latStr.trim();
    if (latStr.length() < 4) return false;

    // Buscar indicador Este/Oeste: ",W," o ",E," después de la latitud
    int ewIdx = str.indexOf(",W,", nsIdx + 3);
    char ewChar = 'W';
    if (ewIdx < 0) {
        ewIdx = str.indexOf(",E,", nsIdx + 3);
        ewChar = 'E';
    }
    if (ewIdx < 0) return false;

    // Extraer longitud entre nsIdx + 3 y ewIdx
    String lonStr = str.substring(nsIdx + 3, ewIdx);
    lonStr.trim();
    if (lonStr.length() < 4) return false;

    // Convertir formato a Grados Decimales
    double rawLat = latStr.toDouble();
    double finalLat = 0.0;
    if (rawLat < 90.0) {
        // Formato nativo SIM7670: ya viene en Grados Decimales (dd.dddddd)
        finalLat = rawLat * (nsChar == 'S' ? -1.0 : 1.0);
    } else {
        // Formato NMEA estándar: ddmm.mmmm
        double degLat = floor(rawLat / 100.0);
        double minLat = fmod(rawLat, 100.0);
        finalLat = (degLat + (minLat / 60.0)) * (nsChar == 'S' ? -1.0 : 1.0);
    }

    double rawLon = lonStr.toDouble();
    double finalLon = 0.0;
    if (rawLon < 180.0) {
        // Formato nativo SIM7670: ya viene en Grados Decimales (ddd.dddddd)
        finalLon = rawLon * (ewChar == 'W' ? -1.0 : 1.0);
    } else {
        // Formato NMEA estándar: dddmm.mmmm
        double degLon = floor(rawLon / 100.0);
        double minLon = fmod(rawLon, 100.0);
        finalLon = (degLon + (minLon / 60.0)) * (ewChar == 'W' ? -1.0 : 1.0);
    }

    if (abs(finalLat) > 0.001 && abs(finalLon) > 0.001) {
        outLat = finalLat;
        outLon = finalLon;
        return true;
    }
    return false;
}

void loop() {
    // 1. Mantener el acelerómetro actualizado en cada ciclo
    updateIMU();
    
    // 2. Control del Modo de Ahorro de Energía (IMU)
    static bool powerSaveModeActive = false;
    bool moving = isAnimalMoving();
    
    // En modo Wi-Fi (laboratorio/pruebas con la laptop) o transmitiendo video, NUNCA entrar en ahorro de energía
    if (currentNetPref == NET_PREF_WIFI || cameraStreamingActive || (wifiActive && WiFi.status() == WL_CONNECTED)) {
        powerSaveModeActive = false;
    } else if (!moving && !powerSaveModeActive) {
        powerSaveModeActive = true;
        Serial.println("\n[Energía] INACTIVIDAD DETECTADA (reposo). Entrando en Modo Ahorro...");
        Serial.println("[Energía] Apagando Wi-Fi (Consumo reducido a ~20mA)...");
        WiFi.disconnect(true);
        WiFi.mode(WIFI_OFF);
    } else if (moving && powerSaveModeActive) {
        powerSaveModeActive = false;
        Serial.println("\n[Energía] MOVIMIENTO DETECTADO! Saliendo del Modo Ahorro...");
        if (currentNetPref == NET_PREF_CELLULAR || gsmActive) {
            initMQTT(COLLAR_ID, &gsmClient);
        } else {
            initWiFi();
            initMQTT(COLLAR_ID, &wifiClient);
        }
    }
    
    // 2.1 Garantizar que el servidor de streaming de cámara local esté activo al tener Wi-Fi
    if (WiFi.status() == WL_CONNECTED && !camStreamServer.isRunning()) {
        camStreamServer.begin(81);
        Serial.printf("[Cámara] 🚀 Servidor de video en vivo listo en: http://%s:81/stream\n", WiFi.localIP().toString().c_str());
    }
    
    // 3. Mantener conectividad según preferencia
    if (!powerSaveModeActive) {
        if (currentNetPref == NET_PREF_WIFI || (currentNetPref == NET_PREF_AUTO && wifiActive)) {
            handleWiFi();
        } else if (currentNetPref == NET_PREF_CELLULAR || (currentNetPref == NET_PREF_AUTO && !wifiActive)) {
            static unsigned long lastGprsCheck = 0;
            if (!cameraStreamingActive && (millis() - lastGprsCheck > 15000)) {
                lastGprsCheck = millis();
                if (!modem.isGprsConnected()) {
                    Serial.println("[Celular] Reconectando datos móviles 4G LTE...");
                    if (modem.gprsConnect(MODEM_APN, "", "")) {
                        gsmActive = true;
                        setMQTTNetworkClient(&gsmClient);
                    }
                }
            }
        }
    }
    
    // 4. Procesar tareas MQTT en segundo plano (escucha de tópicos)
    if (!powerSaveModeActive) {
        handleMQTT();
    }

    // 4.1 Transmitir fotogramas de video en vivo por 4G LTE / Wi-Fi si el usuario activó la cámara
    if (cameraStreamingActive && !powerSaveModeActive) {
        if (millis() - cameraStreamStartTime > CAMERA_STREAM_MAX_DURATION_MS) {
            cameraStreamingActive = false;
            Serial.println("\n[Cámara 4G] ⏱️ Timeout de 120s alcanzado. Deteniendo streaming para proteger batería y datos.");
        } else {
            unsigned long camNow = millis();
            if (camNow - lastCameraFrameTime >= cameraFrameIntervalMs) {
                camera_fb_t* fb = cameraMgr.getFrame();
                if (fb != nullptr) {
                    unsigned long t0 = millis();
                    bool sent = publishCameraFrame(fb->buf, fb->len);
                    unsigned long dur = millis() - t0;
                    if (sent) {
                        Serial.printf("[Cámara 4G] 📤 Frame transmitido (%u bytes en %lu ms)\n", (unsigned int)fb->len, dur);
                    } else {
                        Serial.printf("[Cámara 4G] ⚠️ Fallo al publicar frame (%u bytes en %lu ms)\n", (unsigned int)fb->len, dur);
                    }
                    cameraMgr.returnFrame(fb);
                } else {
                    Serial.println("[Cámara 4G] ⚠️ getFrame() retornó nullptr");
                }
                lastCameraFrameTime = millis();
            }
        }
    }
    
    // 5. Mantener el parpadeo del LED integrado y zumbador físico de fondo
    extern AlertLevel currentAlert;
    if (!collarActivo) {
        currentAlert = ALERT_NONE;
    }
    updateAlerts(currentAlert);
    
    // 6. Si usamos el GPS físico y no estamos en ahorro, leer el puerto serial
    if (!USE_EMULATOR && !powerSaveModeActive) {
        updateGPS();
    }
    
    // 7. Procesamiento de geocerca y envío de telemetría cada 10 segundos
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
            bool rawHasPosition = false;
            Coordinate rawPos = {0.0, 0.0};

            // Consultar datos de satélites y posición directamente del receptor SIM7670G (+CGNSSINFO)
            String rawInfo = modem.getGPSraw();
            if (rawInfo.length() > 0) {
                Serial.printf("[GNSS RAW] %s\n", rawInfo.c_str());
            }
            double pLat = 0.0, pLon = 0.0;
            int pSats = 0;
            if (parseSIM7670GNSS(rawInfo, pLat, pLon, pSats)) {
                rawPos.lat = pLat;
                rawPos.lon = pLon;
                sats = (pSats > 0) ? pSats : 6;
                rawHasPosition = true;
            } else if (pSats > 0) {
                sats = pSats;
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
            Serial.printf("Satélites en vista: %d | Batería: %d%% (%d mV) | ⚡ Carga USB: %s\n", 
                          sats, currentBat, currentVbat, isCharging ? "ACTIVA" : "DESCONECTADA");
            Serial.printf("Dispositivo IMEI: %s\n", hardwareIMEI.c_str());
            Serial.println("------------------------------------------------");

            // Enviar telemetría de latido para que el porcentaje y estado se vean en vivo en la web
            static unsigned long lastIndoorTelemetryTime = 0;
            if (millis() - lastIndoorTelemetryTime >= 3000) {
                lastIndoorTelemetryTime = millis();
                // Coordenadas: si alguna vez tuvo fijación real, enviar lastKnownPos;
                // si aún no ha enganchado satélites, enviar 0.0 para no falsificar la ubicación
                double pubLat = everHadFix ? lastKnownPos.lat : 0.0;
                double pubLon = everHadFix ? lastKnownPos.lon : 0.0;
                String indoorAlert = collarActivo ? "NORMAL" : "DESACTIVADO";
                publishTelemetry(pubLat, pubLon, currentBat, 4, indoorAlert, hardwareIMEI, currentVbat, isCharging, getActiveNetType(), gpsPowered, false, sats);
            }
            
            // Colocar alerta en NONE y silenciar de inmediato
            updateAlerts(ALERT_NONE);
            return;
        }
        
        // --- PROCESAMIENTO DE GEOCERCAS JERÁRQUICAS (HATO Y POTRERO) ---
        bool insideHato = true;
        bool insidePotrero = true;
        AlertLevel nextAlertLevel = ALERT_NONE;
        String alertStr = "NORMAL";
        double distToHatoBorder = 0.0;
        double distToPotreroBorder = 0.0;
        const char* currentUbicacion = "Zona Segura";
        double hatoThreshold = (hatoWarningThreshold > 0.0) ? hatoWarningThreshold : 10.0;
        double potreroThreshold = (potreroWarningThreshold > 0.0) ? potreroWarningThreshold : 10.0;
        double activeAlertDist = 0.0;
        double activeMargin = 10.0;
        bool isHatoAlert = false;

        if (!collarActivo) {
            // MODO ALMACÉN / DESACTIVADO / RESERVA: SILENCIO ABSOLUTO Y CERO ALERTAS
            nextAlertLevel = ALERT_NONE;
            alertStr = "DESACTIVADO";
            currentUbicacion = "En Almacén / Desactivado (Silencio Total)";
            updateAlerts(ALERT_NONE);
        } else {
            // A. Evaluar si está dentro del Hato Principal
            insideHato = (hatoMaster.numVertices > 0) ? isPointInPolygon(currentPos, hatoMaster.vertices, hatoMaster.numVertices) : true;
            
            // B. Evaluar si está dentro del Potrero Asignado
            insidePotrero = (numPotreros > 0 && potrerosList[0].numVertices > 0) ? isPointInPolygon(currentPos, potrerosList[0].vertices, potrerosList[0].numVertices) : true;
            
            distToHatoBorder = (hatoMaster.numVertices > 0) ? getDistanceToPolygon(currentPos, hatoMaster.vertices, hatoMaster.numVertices) : 0.0;
            distToPotreroBorder = (numPotreros > 0 && potrerosList[0].numVertices > 0) ? getDistanceToPolygon(currentPos, potrerosList[0].vertices, potrerosList[0].numVertices) : 0.0;

            if (!insideHato) {
                // FUERA DEL HATO (¡ESCAPE MAYOR DE LA FINCA!): ALERTA MÁXIMA CONTINUA + DESCARGA ÚNICA DE 1s
                nextAlertLevel = ALERT_CRITICAL_HATO;
                alertStr = "ESCAPE_HATO";
                currentUbicacion = "¡¡FUERA DEL HATO (ESCAPE MAYOR)!!";
                activeAlertDist = distToHatoBorder;
                activeMargin = hatoThreshold;
                isHatoAlert = true;
            } else if (distToHatoBorder <= hatoThreshold) {
                // APROXIMÁNDOSE AL LÍMITE EXTERIOR DEL HATO: PITIDO FIJO CON MODULACIÓN DE VOLUMEN
                nextAlertLevel = ALERT_WARNING;
                alertStr = "PROXIMIDAD_HATO";
                currentUbicacion = "Aproximándose a lindero de Hato (Advertencia Fija - Volumen Progresivo)";
                activeAlertDist = distToHatoBorder;
                activeMargin = hatoThreshold;
                isHatoAlert = true;
            } else if (!potreroAbierto) {
                // MODO POTRERO CERRADO (Pastoreo regular con contención en potrero)
                if (!insidePotrero) {
                    // Fuera del Potrero asignado (Escape de potrero / Infracción de rotación - 100% Acústico)
                    nextAlertLevel = ALERT_DANGER;
                    alertStr = "ESCAPE_POTRERO";
                    currentUbicacion = "Fuera de Potrero Asignado (Escape de Potrero)";
                    activeAlertDist = distToPotreroBorder;
                    activeMargin = potreroThreshold;
                    isHatoAlert = false;
                } else if (distToPotreroBorder <= potreroThreshold) {
                    // Dentro del Potrero pero dentro del margen de advertencia (progresivo por cadencia)
                    nextAlertLevel = ALERT_WARNING;
                    alertStr = "PROXIMIDAD_POTRERO";
                    currentUbicacion = "Aproximándose a lindero de potrero (Advertencia Cadencia Progresiva)";
                    activeAlertDist = distToPotreroBorder;
                    activeMargin = potreroThreshold;
                    isHatoAlert = false;
                } else {
                    // Dentro del Potrero seguro
                    nextAlertLevel = ALERT_NONE;
                    alertStr = "NORMAL";
                    currentUbicacion = (numPotreros > 0) ? potrerosList[0].name : "Potrero Asignado";
                    activeAlertDist = 0.0;
                    activeMargin = potreroThreshold;
                    isHatoAlert = false;
                }
            } else {
                // MODO TRASLADO / TALANQUERA ABIERTA:
                // Permite salir del potrero sin emitir alarma de potrero.
                // Solo sonará si se acerca o cruza los límites exteriores del Hato (evaluado arriba).
                nextAlertLevel = ALERT_NONE;
                alertStr = "MODO_TRASLADO";
                currentUbicacion = "Modo Traslado (Talanquera Abierta - Tránsito Libre)";
                activeAlertDist = 0.0;
                activeMargin = hatoThreshold;
                isHatoAlert = false;
            }
            
            // C. Actualizar nivel de alertas local con modulación de volumen/cadencia y descarga
            updateAlerts(nextAlertLevel, activeAlertDist, activeMargin, isHatoAlert);
        }
        // D. Publicar telemetría por MQTT con batería real e IMEI
        int currentBat = 100;
        int currentVbat = 4227;
        bool isCharging = false;
        readBatteryStatus(currentBat, currentVbat, isCharging);
        int mockSignal = (sats > 4) ? 5 : 3;
        publishTelemetry(currentPos.lat, currentPos.lon, currentBat, mockSignal, alertStr, hardwareIMEI, currentVbat, isCharging, getActiveNetType(), gpsPowered, true, sats);
        
        // E. Registrar muestra en la Caja Negra de memoria Flash (LittleFS)
        String timeStr = String(millis() / 1000) + "s";
        logWalkPoint(timeStr.c_str(), currentPos.lat, currentPos.lon, sats, age, nextAlertLevel, distToHatoBorder, distToPotreroBorder, insideHato, insidePotrero);
        
        // F. Imprimir reporte de depuración por consola serial (USB)
        Serial.println("\n------------------------------------------------");
        if (!collarActivo) {
            Serial.printf("[Telemetría (GNSS 4G)] Satélites: %d | Estado: EN ALMACÉN / DESACTIVADO (Silencio Total)\n", sats);
        } else if (USE_EMULATOR) {
            int stepIdx = getMockGPSIndex();
            int totalSteps = getMockGPSTotalPoints();
            Serial.printf("[Telemetría (SIMULADO)] Paso: %d/%d\n", stepIdx + 1, totalSteps);
        } else {
            Serial.printf("[Telemetría (GNSS 4G)] Satélites: %d | Potrero: %s\n", 
                          sats, potreroAbierto ? "ABIERTO (Traslado)" : "CERRADO");
        }
        Serial.printf("Coordenadas: Lat: %.6f, Lon: %.6f\n", currentPos.lat, currentPos.lon);
        Serial.printf("Ubicación Actual: %s\n", currentUbicacion);
        if (collarActivo) {
            Serial.printf("¿En Hato?: %s (Margen: %.1fm) | ¿En Potrero?: %s (Margen: %.1fm)\n", 
                          insideHato ? "SÍ" : "NO", hatoThreshold, 
                          insidePotrero ? "SÍ" : "NO", potreroThreshold);
            Serial.printf("Distancia lindero Hato: %.2f m | Distancia lindero Potrero: %.2f m\n", distToHatoBorder, distToPotreroBorder);
        }
        
        Serial.print("Nivel de Alerta: ");
        if (!collarActivo) {
            Serial.println("MODO RESERVA / ALMACÉN (Silencio Total - Cero Alertas)");
        } else if (currentAlert == ALERT_NONE) {
            Serial.println("NORMAL (Silencio / Seguro)");
        } else if (currentAlert == ALERT_WARNING) {
            if (isHatoAlert) {
                Serial.printf("ADVERTENCIA HATO (Lindero Finca - Cadencia fija 300ms con VOLUMEN PROGRESIVO | Dist: %.1fm / Margen: %.1fm)\n", activeAlertDist, activeMargin);
            } else {
                Serial.printf("ADVERTENCIA POTRERO (Lindero Potrero - Cadencia Progresiva 800ms->100ms | Dist: %.1fm / Margen: %.1fm)\n", activeAlertDist, activeMargin);
            }
        } else if (currentAlert == ALERT_DANGER) {
            Serial.println("PELIGRO (Escape Potrero - Bips rápidos 80ms 4000Hz con timeout 60s - 100% Acústico)");
        } else if (currentAlert == ALERT_CRITICAL_HATO) {
            Serial.println("¡¡ESCAPE CRÍTICO DE HATO (DESCARGA ÚNICA 1s en IO23 + Tono continuo 4000Hz con timeout 60s)!!");
        }
        Serial.println("------------------------------------------------");
    }
}
