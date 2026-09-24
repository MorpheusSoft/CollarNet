# 🐄 CollarNet / CowIA

**Ecosistema IoT Integral de Cerca Virtual, Telemetría Satelital y Monitoreo Ganadero en Tiempo Real**

---

## 📌 Descripción General

**CollarNet** (marca comercial **CowIA**) es una plataforma ganadera inteligente diseñada para entornos de campo y alta exigencia agropecuaria. Integra hardware IoT con geolocalización GNSS de alta precisión, comunicación celular 4G LTE, cercas virtuales poligonales dinámicas, acelerometría para monitoreo de actividad/rumia y una suite multiplataforma para técnicos y supervisores de finca.

---

## 🏗️ Arquitectura del Sistema

```
                   ┌──────────────────────────────────────────────┐
                   │               Collar IoT                     │
                   │    (ESP32-S3 + SIM7670G 4G LTE Digitel)     │
                   │  - GNSS Satelital (Lat/Lon en tiempo real)   │
                   │  - Algoritmo de Geocerca Ray-Casting Local   │
                   │  - Acelerómetro IMU (Reposo / Movimiento)    │
                   │  - Zumbador Piezoeléctrico (Alertas de Cerca)│
                   └──────────────────────┬───────────────────────┘
                                          │ MQTT (4G LTE Móvil)
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │             Broker MQTT Privado              │
                   │            (HiveMQ / Mosquitto)              │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Servidor VPS en la Nube                                │
│                                                                                 │
│   ┌───────────────────────────┐         ┌───────────────────────────────────┐   │
│   │    Backend Node.js API    │◄───────►│    Base de Datos Espacial         │   │
│   │   - Express REST API      │         │    - PostgreSQL 16 + PostGIS      │   │
│   │   - Socket.io WebSockets  │         │    - Geometrías Hatos/Potreros    │   │
│   │   - Despacho de Alertas   │         │    - Histórico de Telemetría      │   │
│   └─────────────┬─────────────┘         └───────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────────────────────────┘
                  │
     ┌────────────┴────────────┬────────────────────────┐
     ▼                         ▼                        ▼
┌──────────────┐      ┌──────────────────┐     ┌──────────────────┐
│  Dashboard   │      │    CowIA Ops     │     │   CowIA Campo    │
│  Web Central │      │  (App Técnico)   │     │ (App Supervisor) │
│ (React+Vite) │      │ (Android / PWA)  │     │ (Android / PWA)  │
└──────────────┘      └──────────────────┘     └──────────────────┘
```

---

## 🧩 Componentes del Repositorio

### 1. 📡 Firmware del Collar (`CollarNet.ino`, `config.h`)
* **Hardware**: Waveshare ESP32-S3 + módem celular SIM7670G 4G LTE.
* **Conectividad**: Comunicación celular fija (`NET_PREF_CELLULAR`) mediante APN `gprsweb.digitel.ve` con radio Wi-Fi apagada para máxima autonomía en campo abierto.
* **Seguridad de Ganado**: Cálculo de límites de potrero y hato directo en el collar por Ray-Casting; genera estímulos sonoros graduales (advertencia y peligro) si el animal se aproxima o supera el lindero.
* **Ahorro de Energía**: Transición a modo reposo cuando el acelerómetro no detecta movimiento.

### 2. 🖥️ Backend REST & WebSockets (`backend/`)
* Construido con Node.js y Express.
* Suscriptor MQTT que procesa telemetría en tiempo real y la retransmite a través de WebSockets (`socket.io`).
* Conexión a PostgreSQL con extensión espacial PostGIS para consultas geométricas avanzadas (`ST_Contains`, `ST_Distance`).
* Portal de descargas y servicio de aplicaciones PWA (`/descargas`, `/iphone`, `/apps/tecnico`, `/apps/finca`).

### 3. 🌐 Dashboard Web Central (`frontend/`)
* Aplicación de una sola página (SPA) desarrollada con React, Vite y TailwindCSS.
* Mapa satelital interactivo con capas Leaflet, trazado de geocercas, edición de vértices en vivo, monitoreo de collares y estado de batería.

### 4. 📱 Aplicaciones Móviles (`movil_ops/` y `movil_supervisor/`)
* Desarrolladas con **Flutter 3**.
* **CowIA Ops**: Herramienta de laboratorio y despliegue técnico (alta de hatos, escaneo de collares, diagnóstico GNSS/IMU).
* **CowIA Campo**: Herramienta de gestión ganadera (subdivisión de potreros, arreo en vivo, báscula Bluetooth y alertas sanitarias).
* Distribución disponible como instalador nativo Android (`.apk`) y Progressive Web App (`PWA`) optimizada para Safari en iOS.

---

## 🚀 Despliegue Rápido con Docker

El sistema de servidor está completamente contenedorizado para un despliegue inmediato:

```bash
# 1. Clonar el repositorio
git clone git@github.com:MorpheusSoft/CollarNet.git
cd CollarNet

# 2. Iniciar todos los servicios (Base de Datos PostGIS, Broker MQTT y Backend)
docker compose up -d --build
```

Los servicios quedarán disponibles en:
- **Dashboard Web & API**: `http://localhost:3500` (o `https://cowai.net` en producción)
- **Portal de Descargas Móviles**: `http://localhost:3500/descargas`
- **Broker MQTT**: puerto `1883`

---

## ⚡ Compilación y Flasheo del Firmware

Para compilar y grabar el firmware en el chip ESP32-S3 con `arduino-cli`:

```bash
# Compilar el sketch
arduino-cli compile --fqbn esp32:esp32:esp32s3 CollarNet.ino

# Subir al dispositivo físico conectado por USB (ejemplo en /dev/ttyACM4)
arduino-cli upload -p /dev/ttyACM4 --fqbn esp32:esp32:esp32s3 CollarNet.ino
```

---

## 📄 Licencia

Desarrollado para **CollarNet / CowIA** © 2026. Todos los derechos reservados.
