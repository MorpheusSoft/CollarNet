#include "storage_manager.h"
#include "geofence.h"
#include "config.h"
#include <LittleFS.h>
#include <ArduinoJson.h>

const char* CONFIG_FILE = "/geofence.json";
const char* NET_PREF_FILE = "/net_pref.txt";
const char* ACTIVE_STATE_FILE = "/collar_active.txt";

bool saveCollarActiveState(bool active) {
    File file = LittleFS.open(ACTIVE_STATE_FILE, "w");
    if (!file) {
        Serial.println("[Storage] Error al abrir archivo de estado operativo para escribir.");
        return false;
    }
    file.print(active ? "1" : "0");
    file.close();
    Serial.printf("[Storage] Estado operativo guardado en LittleFS: %s\n", active ? "ACTIVO" : "DESACTIVADO (SILENCIO TOTAL)");
    return true;
}

bool loadCollarActiveState() {
    if (!LittleFS.exists(ACTIVE_STATE_FILE)) {
        return true; // Por defecto ACTIVO si no se ha configurado
    }
    File file = LittleFS.open(ACTIVE_STATE_FILE, "r");
    if (!file) return false;
    String val = file.readString();
    file.close();
    val.trim();
    return (val == "1");
}

bool initStorage() {
    if (!LittleFS.begin(true)) {
        Serial.println("[Storage] ¡ERROR! Fallo al montar LittleFS. Formateando...");
        return false;
    }
    Serial.println("[Storage] LittleFS montado exitosamente.");
    return true;
}

bool saveNetPreference(NetPreference pref) {
    File file = LittleFS.open(NET_PREF_FILE, "w");
    if (!file) {
        Serial.println("[Storage] Error al abrir archivo de preferencia de red para escribir.");
        return false;
    }
    file.print((int)pref);
    file.close();
    Serial.printf("[Storage] Preferencia de red guardada en LittleFS: %d\n", (int)pref);
    return true;
}

NetPreference loadNetPreference() {
    if (!LittleFS.exists(NET_PREF_FILE)) {
        return DEFAULT_NET_PREF;
    }
    File file = LittleFS.open(NET_PREF_FILE, "r");
    if (!file) return DEFAULT_NET_PREF;
    String val = file.readString();
    file.close();
    val.trim();
    int p = val.toInt();
    if (p >= 0 && p <= 2) {
        return (NetPreference)p;
    }
    return DEFAULT_NET_PREF;
}

bool saveGeofenceConfig(const String& jsonConfig) {
    File file = LittleFS.open(CONFIG_FILE, "w");
    if (!file) {
        Serial.println("[Storage] Error al abrir el archivo para escribir geocerca.");
        return false;
    }

    int bytesWritten = file.print(jsonConfig);
    file.close();

    if (bytesWritten > 0) {
        Serial.printf("[Storage] Geocerca guardada: %d bytes escritos.\n", bytesWritten);
        // Actualizar la memoria RAM inmediatamente
        return loadGeofenceConfig();
    }
    return false;
}

bool loadGeofenceConfig() {
    if (!LittleFS.exists(CONFIG_FILE)) {
        Serial.println("[Storage] Archivo de geocerca no encontrado. Cargando valores por defecto...");
        loadDefaultGeofence();
        return false;
    }

    File file = LittleFS.open(CONFIG_FILE, "r");
    if (!file) {
        Serial.println("[Storage] Error al abrir archivo de geocerca para lectura.");
        loadDefaultGeofence();
        return false;
    }

    StaticJsonDocument<1536> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        Serial.printf("[Storage] Error al parsear JSON: %s. Cargando valores por defecto...\n", error.c_str());
        loadDefaultGeofence();
        return false;
    }

    // 0. Cargar Estado Operativo / Silencio
    if (doc.containsKey("collar_activo")) {
        collarActivo = doc["collar_activo"].as<bool>();
        saveCollarActiveState(collarActivo);
    } else if (doc.containsKey("activo")) {
        collarActivo = doc["activo"].as<bool>();
        saveCollarActiveState(collarActivo);
    } else if (doc.containsKey("silence")) {
        collarActivo = !doc["silence"].as<bool>();
        saveCollarActiveState(collarActivo);
    } else {
        collarActivo = loadCollarActiveState();
    }
    Serial.printf("[Storage] Estado operativo del collar: %s\n", collarActivo ? "ACTIVO" : "DESACTIVADO (SILENCIO TOTAL)");

    // 1. Cargar Hato Maestro
    if (doc.containsKey("h_id") && doc.containsKey("h_v")) {
        hatoMaster.id = doc["h_id"];
        JsonArray h_v = doc["h_v"];
        int count = h_v.size() / 2;
        if (count > MAX_VERTICES) count = MAX_VERTICES;
        
        hatoMaster.numVertices = count;
        for (int i = 0; i < count; i++) {
            hatoVertices[i].lat = h_v[2 * i];
            hatoVertices[i].lon = h_v[2 * i + 1];
        }
        Serial.printf("[Storage] Hato ID %d cargado con %d vértices.\n", hatoMaster.id, hatoMaster.numVertices);
    }

    // 2. Cargar Potrero Asignado
    if (doc.containsKey("p_id") && doc.containsKey("p_v")) {
        potrerosList[0].id = doc["p_id"];
        JsonArray p_v = doc["p_v"];
        int count = p_v.size() / 2;
        if (count > MAX_VERTICES) count = MAX_VERTICES;

        potrerosList[0].numVertices = count;
        potrerosList[0].name = "Potrero Activo Asignado";
        for (int i = 0; i < count; i++) {
            potreroVertices[i].lat = p_v[2 * i];
            potreroVertices[i].lon = p_v[2 * i + 1];
        }
        numPotreros = 1;
        Serial.printf("[Storage] Potrero ID %d cargado con %d vértices.\n", potrerosList[0].id, potrerosList[0].numVertices);
    } else {
        numPotreros = 0; // Sin potreros asignados
    }

    // 3. Cargar Estado de Potrero (Abierto / Cerrado)
    if (doc.containsKey("p_open")) {
        potreroAbierto = (doc["p_open"].as<int>() == 1);
        Serial.printf("[Storage] Estado de potrero: %s\n", potreroAbierto ? "ABIERTO (Modo Traslado)" : "CERRADO (Cerca Activa)");
    }

    // 4. Cargar Umbrales de Alerta Independientes (Hato y Potrero)
    if (doc.containsKey("h_tw")) {
        hatoWarningThreshold = doc["h_tw"].as<double>();
    } else if (doc.containsKey("t_w_hato")) {
        hatoWarningThreshold = doc["t_w_hato"].as<double>();
    } else if (doc.containsKey("t_w")) {
        hatoWarningThreshold = doc["t_w"].as<double>();
    } else {
        hatoWarningThreshold = 10.0;
    }

    if (doc.containsKey("p_tw")) {
        potreroWarningThreshold = doc["p_tw"].as<double>();
    } else if (doc.containsKey("t_w_potrero")) {
        potreroWarningThreshold = doc["t_w_potrero"].as<double>();
    } else if (doc.containsKey("t_w")) {
        potreroWarningThreshold = doc["t_w"].as<double>();
    } else {
        potreroWarningThreshold = 10.0;
    }
    Serial.printf("[Storage] Umbral Hato: %.1f m | Umbral Potrero: %.1f m\n", hatoWarningThreshold, potreroWarningThreshold);

    return true;
}

void loadDefaultGeofence() {
    collarActivo = loadCollarActiveState();
    Serial.printf("[Storage] Estado operativo (default): %s\n", collarActivo ? "ACTIVO" : "DESACTIVADO (SILENCIO TOTAL)");
    Serial.println("[Storage] Cargando geocerca de Área Amplia para pruebas...");
    
    // Perímetro Hato Maestro Área Amplia (~1.3 km x 1.3 km de cobertura)
    hatoMaster.id = 100;
    hatoMaster.name = "Hato Principal (Área Amplia)";
    hatoMaster.numVertices = 4;
    hatoVertices[0] = {10.677000, -71.610000}; // Vértice Noroeste
    hatoVertices[1] = {10.677000, -71.598000}; // Vértice Noreste
    hatoVertices[2] = {10.665000, -71.598000}; // Vértice Sureste
    hatoVertices[3] = {10.665000, -71.610000}; // Vértice Suroeste

    // Potrero de Pruebas Amplio (~650m x 650m)
    potrerosList[0].id = 10;
    potrerosList[0].numVertices = 4;
    potrerosList[0].name = "Potrero Área Amplia";
    potreroVertices[0] = {10.674000, -71.607000}; // Vértice Noroeste
    potreroVertices[1] = {10.674000, -71.601000}; // Vértice Noreste
    potreroVertices[2] = {10.668000, -71.601000}; // Vértice Sureste
    potreroVertices[3] = {10.668000, -71.607000}; // Vértice Suroeste

    numPotreros = 1;
    hatoWarningThreshold = 20.0;
    potreroWarningThreshold = 15.0;
    
    Serial.println("[Storage] Geocerca de Área Amplia inicializada en memoria RAM.");
}

const char* WALK_LOG_FILE = "/walk_log.txt";

void clearWalkLog() {
    if (LittleFS.exists(WALK_LOG_FILE)) {
        LittleFS.remove(WALK_LOG_FILE);
        Serial.println("[WalkLog] ¡Caja Negra BORRADA y reiniciada a 0 bytes para la próxima caminata!");
    }
}

void logWalkPoint(const char* timeStr, double lat, double lon, int sats, uint32_t age, int alertLevel, double distHato, double distPotrero, bool insideHato, bool insidePotrero) {
    File file = LittleFS.open(WALK_LOG_FILE, "a");
    if (!file) return;
    
    // Formato CSV compacto: HoraLocal,Millis,Lat,Lon,Sats,AgeMs,AlertLevel,DistHato,DistPotrero,InHato,InPotrero
    file.printf("%s,%lu,%.7f,%.7f,%d,%u,%d,%.1f,%.1f,%d,%d\n",
                timeStr, millis(), lat, lon, sats, age, alertLevel, distHato, distPotrero, insideHato ? 1 : 0, insidePotrero ? 1 : 0);
    file.close();
}

void dumpWalkLog() {
    if (!LittleFS.exists(WALK_LOG_FILE)) {
        Serial.println("[WalkLog] No hay registros previos de caminata en memoria Flash LittleFS (Caja limpia).");
        return;
    }

    File file = LittleFS.open(WALK_LOG_FILE, "r");
    if (!file) return;

    Serial.println("\n===========================================================");
    Serial.println("===== [CAJA NEGRA CAJA DE CAMINATA ESP32 - LOG FLASH] =====");
    Serial.println("===========================================================");
    Serial.println("HoraVET,Millis,Lat,Lon,Sats,AgeMs,AlertLevel,DistHatoM,DistPotreroM,InHato,InPotrero");
    while (file.available()) {
        String line = file.readStringUntil('\n');
        Serial.println(line);
    }
    file.close();
    Serial.println("===========================================================\n");
    
    // Borrar la caja negra tras leerla por USB para que la siguiente caminata empiece 100% limpia de cero
    clearWalkLog();
}
