#include "storage_manager.h"
#include "geofence.h"
#include <LittleFS.h>
#include <ArduinoJson.h>

const char* CONFIG_FILE = "/geofence.json";

bool initStorage() {
    if (!LittleFS.begin(true)) {
        Serial.println("[Storage] ¡ERROR! Fallo al montar LittleFS. Formateando...");
        return false;
    }
    Serial.println("[Storage] LittleFS montado exitosamente.");
    return true;
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

    // Validar si la geocerca guardada es obsoleta (ej. ID 7 de Guárico a 524 km)
    int savedHId = doc.containsKey("h_id") ? doc["h_id"].as<int>() : 0;
    if (savedHId != 5) {
        Serial.printf("[Storage] Geocerca obsoleta detectada (ID %d). Eliminando y cargando Hato Oficina (ID 5)...\n", savedHId);
        LittleFS.remove(CONFIG_FILE);
        loadDefaultGeofence();
        return false;
    }

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

    // 3. Cargar Umbral de Alerta
    if (doc.containsKey("t_w")) {
        hatoWarningThreshold = doc["t_w"];
    } else {
        hatoWarningThreshold = 10.0;
    }
    Serial.printf("[Storage] Umbral de distancia configurado a: %.1f metros.\n", hatoWarningThreshold);

    return true;
}

void loadDefaultGeofence() {
    Serial.println("[Storage] Cargando geocerca de Oficina actualizada recién por el usuario...");
    
    // Perímetro Hato Oficina (Guardado recién por el usuario)
    hatoMaster.id = 5;
    hatoMaster.numVertices = 4;
    hatoVertices[0] = {10.671444006, -71.604396701};
    hatoVertices[1] = {10.671546803, -71.603959501};
    hatoVertices[2] = {10.671256863, -71.603892446};
    hatoVertices[3] = {10.671164609, -71.604324281};

    // Potrero Oficina A (Guardado recién por el usuario)
    potrerosList[0].id = 9;
    potrerosList[0].numVertices = 4;
    potrerosList[0].name = "Potrero Oficina A";
    potreroVertices[0] = {10.671404469, -71.604294777};
    potreroVertices[1] = {10.671467728, -71.604050696};
    potreroVertices[2] = {10.671285857, -71.604002416};
    potreroVertices[3] = {10.671219961, -71.604251862};

    numPotreros = 1;
    hatoWarningThreshold = 3.0;
    
    Serial.println("[Storage] Geocerca de Oficina inicializada en memoria RAM.");
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
