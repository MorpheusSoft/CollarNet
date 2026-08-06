# Seguimiento Cronológico del Proyecto: Collar Ganadero

Este archivo registra el avance y el detalle técnico de cada una de las fases del desarrollo del prototipo de "Collar Ganadero con Cerca Virtual" basado en ESP32 (C++ / Arduino framework).

---

## 📅 Estado General del Proyecto

| Fase | Título | Estado | Fecha de Certificación |
| :--- | :--- | :--- | :--- |
| **1** | [FASE 1: Prueba de Fuego](#1-fase-1-prueba-de-fuego-completada) | **COMPLETADA** | 15 de Julio, 2026 |
| **3** | [FASE 3: Algoritmo de Geocerca (Adelantada)](#2-fase-3-algoritmo-de-geocerca-completada) | **COMPLETADA** | 16 de Julio, 2026 |
| **2** | [FASE 2: Geolocalización Física](#3-fase-2-geolocalizacion-fisica-completada) | **COMPLETADA** | 17 de Julio, 2026 |
| **4** | [FASE 4: Registro, Vincular Reses a Collares y Alertas](#4-fase-4-alertas-fisicas-y-sensores-completada-en-software) | **COMPLETADA** | 1 de Agosto, 2026 |
| **5** | [FASE 5: Flasheo Físico e Integración IoT](#5-fase-5-transmision-de-datos-e-interfaz-pendiente) | **COMPLETADA** | 1 de Agosto, 2026 |

---

## 🛠️ Detalle Técnico por Fase (Orden Cronológico)

### 1. FASE 1: Prueba de Fuego (COMPLETADA)
*   **Fecha de Ejecución**: 15 de Julio, 2026.
*   **Objetivos**: Configurar el entorno local (`arduino-cli`), puerto USB-C en Linux, conexión Wi-Fi doméstica no bloqueante y control de parpadeos en el LED integrado (GPIO 2).
*   **Archivos**: [CollarNet.ino](file:///home/lzambrano/Desarrollo/CollarNet/CollarNet.ino), [config.h](file:///home/lzambrano/Desarrollo/CollarNet/config.h), [secrets.h](file:///home/lzambrano/Desarrollo/CollarNet/secrets.h), [wifi_manager.h/cpp](file:///home/lzambrano/Desarrollo/CollarNet/wifi_manager.h) y [alerts.h/cpp](file:///home/lzambrano/Desarrollo/CollarNet/alerts.h).

---

### 2. FASE 3: Algoritmo de Geocerca (COMPLETADA)
*   **Fecha de Ejecución**: 16 de Julio, 2026.
*   **Objetivos**: Implementar algoritmos de Ray-Casting y distancias en metros local. Definir Hato (seguridad) y Potreros (seguimiento de paso). Crear ruta de caminata sintética.
*   **Archivos**: [geofence.h/cpp](file:///home/lzambrano/Desarrollo/CollarNet/geofence.h) y [gps_emulator.h/cpp](file:///home/lzambrano/Desarrollo/CollarNet/gps_emulator.h).

---

### 3. FASE 2: Geolocalización Física (COMPLETADA)
*   **Fecha de Ejecución**: 17 de Julio, 2026.
*   **Objetivos**:
    *   Conexión física del receptor GPS NEO-6M al puerto serie `Serial2` (pines RX2/TX2 GPIO 16/17).
    *   Integración de la biblioteca `TinyGPS++` localmente para decodificación NMEA.
    *   Implementación de lectura continua asíncrona para vaciar búfer RX de hardware del ESP32.
    *   Filtrado de señal y prevención de falsas alarmas si se pierde fijación 3D del GPS.
*   **Archivos Involucrados**:
    *   [TinyGPS++.h](file:///home/lzambrano/Desarrollo/CollarNet/TinyGPS++.h) / [.cpp](file:///home/lzambrano/Desarrollo/CollarNet/TinyGPS++.cpp) (Librería de parseo).
    *   [gps_manager.h](file:///home/lzambrano/Desarrollo/CollarNet/gps_manager.h) / [.cpp](file:///home/lzambrano/Desarrollo/CollarNet/gps_manager.cpp) (Controlador físico).
    *   [CollarNet.ino](file:///home/lzambrano/Desarrollo/CollarNet/CollarNet.ino) (Integración del lector físico).
*   **Método de Verificación**:
    *   Flasheo exitoso en `/dev/ttyUSB0` a 115200 baudios.
    *   Monitoreo serial confirmando inicialización del puerto del GPS y lectura viva de 5 satélites con coordenadas físicas correctas en exteriores.

---

### 4. FASE 4: Alertas Físicas y Sensores (COMPLETADA EN SOFTWARE)
*   **Fecha de Ejecución**: 17 de Julio, 2026.
*   **Objetivos**:
    *   **Buzzer Pasivo**: Se implementó el control de tonos de audio dinámicos (`tone()`) a 2000Hz (Advertencia) y 3000Hz (Peligro) en el pin `D4` en sincronía con el LED.
    *   **Protección de 1 Minuto**: Se programó un temporizador de seguridad que silencia automáticamente el zumbador tras 1 minuto continuo de alerta para proteger al animal y ahorrar batería.
    *   **Acelerómetro I2C**: Se desarrolló el controlador nativo (`imu_manager.h/cpp`) para el sensor MPU-6050 utilizando la librería `Wire.h` (SDA=GPIO 21, SCL=GPIO 22).
    *   **Ahorro de Energía**: Si el acelerómetro detecta reposo por más de 30 segundos, apaga el Wi-Fi (`WIFI_OFF`) reduciendo el consumo a ~20mA, y lo enciende automáticamente al detectar movimiento.
*   **Archivos Involucrados**:
    *   [imu_manager.h](file:///home/lzambrano/Desarrollo/CollarNet/imu_manager.h) / [.cpp](file:///home/lzambrano/Desarrollo/CollarNet/imu_manager.cpp) (Módulo I2C).
    *   [alerts.cpp](file:///home/lzambrano/Desarrollo/CollarNet/alerts.cpp) (Frecuencias de audio y timeout).
    *   [wifi_manager.cpp](file:///home/lzambrano/Desarrollo/CollarNet/wifi_manager.cpp) (Ignora reconexiones en reposo).
    *   [CollarNet.ino](file:///home/lzambrano/Desarrollo/CollarNet/CollarNet.ino) (Lógica de energía y loop).
*   **Método de Verificación**:
    *   Compilación exitosa sin advertencias del compilador.
    *   Subida manual por USB completada con éxito.
    *   Consola emitiendo correctamente los reportes de escape y `[BEEP!]` auditivo.
    *   *Siguiente*: Conexión física del MPU-6050 y el Buzzer para probar la salida de audio y la suspensión por reposo.

---

### 5. FASE 5: Flasheo Físico e Integración IoT (COMPLETADA)
*   **Fecha de Ejecución**: 1 de Agosto, 2026.
*   **Objetivos**:
    *   Flasheo directo del binario compilado al chip ESP32-D0WD-V3 mediante `/dev/ttyUSB0` a 921600 baudios.
    *   Verificación de inicialización del stack de red Wi-Fi (conectado a SSID `SOITCA`, IP asignada `192.168.86.27`).
    *   Conexión viva al broker MQTT público HiveMQ (`collarnet/lzambrano/+/telemetria`).
    *   Integración telemétrica en tiempo real con el servidor Express/PostGIS y actualización de marcadores y tooltips en el mapa satelital Leaflet via WebSockets.
*   **Método de Verificación**:
    *   Monitoreo serial confirmando inicio exitoso: `[WiFi] ¡Conectado con éxito!`, `[MQTT] ¡Conectado con éxito al broker!`.
