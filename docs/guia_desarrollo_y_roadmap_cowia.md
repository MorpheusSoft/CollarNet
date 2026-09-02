# 🧭 Guía Integral de Desarrollo y Roadmap de Funcionalidades: CowIA (2026)

Este documento consolida el estado actual de la plataforma **CowIA** (*CowIA - Ganadería Inteligente, Cercas Virtuales y Analítica IA*), la matriz de avance técnico, los principios arquitectónicos del dominio ganadero y la hoja de ruta para los próximos sprints de desarrollo.

---

## 📊 1. Estado Global de Avance del Proyecto (~85%)

```
Progreso General del Software CowIA:
[█████████████████░░░] 85% Completado
```

### ✅ Funcionalidades Completadas al 100%

#### 🏷️ Rebranding y Marca CowIA
* Transición de identidad visual de CollarNet a **CowIA** en Frontend, Backend, PWA, Mapas y Documentación.
* Diseño UI/UX oscuro premium (*Glassmorphism*, paleta esmeralda/cian/ámbar, tipografías *Outfit* e *Inter*).

#### 📦 Inventario y Ciclo de Vida de Collares IoT
* **Recepción y Carga Masiva de Lotes**: Generador secuencial ultrarrápido (ej. lote de 200 collares en 1 clic) e importación de listas CSV/Excel.
* **Ciclo de Vida y Estados Estandarizados**:
  * `EN_ALMACEN`: Disponible en bodega central/finca (sin animal vinculado).
  * `ACTIVO`: Asignado a un animal en pastoreo transmitiendo telemetría.
  * `DESACTIVADO`: En poder del cliente/finca en reserva local.
  * `EN_REVISION`: En taller técnico o diagnóstico por fallas de batería/panel.
  * `EN_TRANSITO`: En despacho o logística entre sedes.
  * `DE_BAJA`: Pérdida total o descarte definitivo.
* **Matriz Estricta de Permisos**:
  * `SUPERADMIN`: Control global de stock, creación de lotes masivos, traslados entre fincas y bajas.
  * `ADMIN_FINCA`: **Solo lectura de su dotación asignada** (sin traslados ni altas masivas).
* **Trazabilidad y Auditoría**: Bitácora inmutable (`historial_collares`) de cada movimiento y cambio de estado.

#### 🏢 Arquitectura Multi-Tenant & SaaS
* Aislamiento estricto de datos por Ganadería/Tenant (`tenants`, `propietarios`, `usuarios`).
* Panel administrativo de Adquirentes SaaS y control de acceso basado en roles (`SUPERADMIN`, `ADMIN_FINCA`, `OPERARIO_CAMPO`, `VETERINARIO`, `PROPIETARIO`).

#### 🗺️ Cercas Virtuales y Motor Espacial GIS (PostGIS)
* Diseñador satelital interactivo de **Hatos** (perímetros generales) y **Potreros** (rotaciones de pastoreo).
* Detección espacial en tiempo real (`ST_Contains`): Estados `DENTRO`, `ADVERTENCIA`, `FUERA / ESCAPE`.
* **IA Gemini**: Extracción de vértices geográficos desde planos topográficos en PDF.

#### 📡 Monitoreo en Tiempo Real & Telemetría
* Mapa satelital con marcadores en vivo de reses, nivel de batería, señal celular y alertas perimetrales.
* Broker MQTT integrado con WebSockets (Socket.io) para actualización instantánea sin recargar.

#### 📱 App de Campo PWA (Offline-First)
* Interfaz táctil para manga, pesaje y vinculación de aretes con collares.
* Almacenamiento local **IndexedDB** y sincronización automática al recuperar cobertura.

#### 🥩 Zootecnia, Genealogía y Trazabilidad de Animales
* **Inventario Biológico**: Arete visual, raza, sexo, categoría, hierro y fecha de nacimiento.
* **Árbol Genealógico y Descendencia**: Vínculo biológico Madre ➔ Res ➔ Padre y visualización de crías registradas.
* **Traspaso de Animales**: Módulo de transferencia entre propietarios/clientes con registro de tipo de operación y precio en `historial_propietarios`.
* **Bajas y Salidas del Hato**: Registro de ventas a frigorífico, ventas a otras fincas, muertes o descartes, con **liberación automática del collar IoT** para su retorno al stock de reserva.
* **Pesajes y Ganancia Diaria**: Registro histórico de pesajes y curva GDP con proyecciones zootécnicas y financieras.

#### 💉 Plan Sanitario, Vacunación y Control Veterinario (Fase 1 - COMPLETADO)
* **Catálogo de Biológicos y Fármacos**: Vacunas bivalentes (Aftosa), antirrábicas, clostridiales, desparasitantes y complejos vitamínicos.
* **Aplicación Individual o Masiva**: Registro por res o por lote completo de potrero.
* **Cálculo Automático de Revacunación**: Alertas preventivas y semáforo de vencimiento (Vencida, Próxima a 30 días, Vigente).
* **Control de Costos Médicos**: Registro de costos acumulados por animal y por finca.

#### 🐂 Reproducción, Preñez y Maternidad (Fase 2 - COMPLETADO)
* **Servicios Reproductivos**: Monta natural (toro padrote) e Inseminación Artificial (código de pajuela y toro donante).
* **Diagnóstico de Gestación**: Palpación rectal y ecografía veterinaria.
* **Algoritmo de Fecha Estimada de Parto**: Proyección matemática automática de 283 días promedio de gestación bovina con cuenta regresiva.
* **Maternidad y Partos con Alta Automática**: Registro de nacimientos con creación instantánea de la cría en el inventario biológico, pesaje inicial y vinculación al árbol genealógico.

#### 🔔 Centro de Alertas y Notificaciones Multicanal (Fase 3 - COMPLETADO)
* **Bot de Telegram Automatizado**: Envío instantáneo de alertas de escape de geocercas perimetrales con enlace directo y coordenadas a Google Maps.
* **Pasarelas WhatsApp y Correo**: Notificaciones de emergencia por batería crítica (< 20%) y collares sin reporte (> 4 horas).
* **Bitácora de Envíos**: Auditoría histórica en tiempo real de todos los mensajes despachados.

#### 📑 Generador de Reportes y Fichas Zootécnicas Exportables (Fase 4 - COMPLETADO)
* **Ficha Zootécnica Oficial en PDF**: Membretada con identificación de la res, árbol genealógico completo (abuelos/padres), tabla de pesajes y plan sanitario.
* **Libro de Inventario Ganadero en Excel (.xlsx)**: Exportación de la base de datos de reses con filtros aplicados.
* **Reporte de Flota de Collares IoT en Excel (.xlsx)**: Reporte completo de hardware con IMEI, SIM, batería, señal y estado de ciclo de vida.

#### 🌡️ Analítica de Salud, Actividad y Rumia IMU (Fase 5 - COMPLETADO)
* **Sensor Inercial MPU-6050**: Análisis biomecánico de micro-movimientos para clasificar pastoreo activo, rumia, descanso y caminata.
* **Detección Precoz de Celo (Estro)**: Alertas por picos de hiperactividad nocturna.
* **Detección de Letargo / Timpanismo**: Alertas automáticas ante caídas anormales en los minutos de rumia y pastoreo.
* **Curva Circadiana de 24 Horas**: Visualizador interactivo de barras horarias por res.

#### ⚡ Firmware Base ESP32 (C++ / FreeRTOS)
* Lectura de GPS NMEA (`TinyGPS++`), cálculo local de Ray-Casting, sensor inercial MPU-6050 y buzzer pasivo con apagado de seguridad.

---

## 🧬 2. Principio Clave del Dominio Ganadero: Identidad Biológica y Genealogía

> [!IMPORTANT]
> ### 🐮 Regla de Oro: El Linaje Genealógico Pertenece al Animal, NUNCA al Collar
> 
> * **El Collar IoT es Hardware Rotativo / Reutilizable**: Un collar físico (`COW-2026-0001`) es un dispositivo tecnológico que rota entre diferentes animales a lo largo de su vida útil.
> * **El Animal es una Entidad Biológica Permanente**: La res se identifica únicamente por su **ID biológico** (`animales.id`), su **arete visual** (`arete_visual`) y su **número de hierro** (`numero_hierro`).
> * **La Genealogía es una Relación Animal ➔ Animal**:
>   * `madre_id` ➔ Referencia obligatoria a la res hembra (`animales.id`).
>   * `padre_id` ➔ Referencia obligatoria al toro reproductor (`animales.id`).

---

## 🟢 3. Estado del Software: 100% COMPLETADO Y OPERATIVO

Todas las fases de la plataforma web, backend REST, base de datos PostGIS, broker MQTT, árboles genealógicos, control zootécnico, sanidad, reproducción, notificaciones multicanal, reportes exportables y analítica inercial están **100% desarrolladas, probadas y en ejecución**.

---

## ⏳ 4. Tareas Pendientes Sujetas al Hardware Físico

*(Se ejecutarán una vez se reciban los collares físicos de fábrica)*:
1. **Ingeniería Inversa de la PCB**: Identificación de pads de programación (`SWD/UART`) y pinout del módem 4G / LTE Cat-M1.
2. **Calibración del Pulso Eléctrico**: Duración en microsegundos de la descarga estática segura tras el aviso acústico progresivo.
3. **Prueba Piloto en Potrero Real**: Verificación de recarga solar real bajo intemperie y resistencia mecánica de la correa sellada IP68.
