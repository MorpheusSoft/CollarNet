# 📱 Especificación Integral: Apps Móviles Flutter y Módulo de Pasturas con Dron (CowIA 2026)

Este documento define la arquitectura funcional, operativa y técnica de las **dos aplicaciones móviles nativas desarrolladas en Flutter**, así como el diseño e integración del nuevo módulo de **Teledetección y Aforo de Pastos con Dron (UAV)** para optimización del pastoreo rotacional.

---

## 🧭 1. Visión General del Ecosistema Móvil

Para evitar interfaces sobrecargadas y mitigar riesgos de seguridad operacional, el ecosistema móvil se desacopla en dos aplicaciones independientes:

```
                                  ┌───────────────────────────────────────────────┐
                                  │           BACKEND COWIA (CLOUD / VPS)         │
                                  │   PostGIS 16 + Express API + MQTT + Gemini   │
                                  └───────────────┬───────────────────────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         ▼                                                 ▼
        ┌───────────────────────────────────┐             ┌───────────────────────────────────┐
        │       🛠️ APP 1: COWIA OPS         │             │      🤠 APP 2: COWIA FINCA        │
        │   (Técnica, Taller y Despliegue)  │             │   (Productor, Manga y Potrero)    │
        ├───────────────────────────────────┤             ├───────────────────────────────────┤
        │ • Alta de Adquirientes (Tenants)  │             │ • Subdivisión de Potreros (Hato)  │
        │ • Creación de HATOS MAESTROS      │             │ • ABRIR / CERRAR Potreros         │
        │ • Diagnóstico Hardware BLE/USB    │             │ • Modo Arreo (Tránsito temporal)  │
        │ • Prueba de Sensores, GPS y Pulso │             │ • Vinculación Rápida Manga (3 Tap)│
        │ • Carga Masiva de Lotes de Collar │             │ • Pesaje Ágil + Conexión Báscula  │
        │ • Flasheo OTA de Firmware         │             │ • Brújula Rescate "Buscar Res"    │
        │ • Monitor de Tramas Crudas MQTT   │             │ • Semáforo de Pastos con Dron     │
        └───────────────────────────────────┘             └───────────────────────────────────┘
```

---

## 🛠️ 2. APP 1: "CowIA Ops" (Técnica, Laboratorio y Despliegue)

> **Destinatarios**: Ingenieros de soporte, técnicos de laboratorio, cuadrillas de instalación en campo y administradores de plataforma CowIA.  
> **Modo de Enlace**: Comunicación directa local (**BLE / USB-OTG**) con el collar + API REST / WebSockets hacia la nube.

### 2.1. Onboarding de Adquirientes y Creación de Hatos Maestros
* **Alta de Adquiriente (Tenant)**:
  * Registro de la persona natural o jurídica, razón social, documento de identidad/RUT/RIF, correo, teléfonos de contacto y límite de collares contratados.
* **Trazado del HATO MAESTRO (Perímetro Legal de Seguridad)**:
  * El Hato constituye la **frontera exterior inviolable**. Su escape dispara alarmas críticas a propietarios y autoridades.
  * **Modo IA (Planos PDF)**: Carga de levantamientos topográficos o planos catastrales; el modelo multimodal extrae vértices y genera el polígono georreferenciado.
  * **Modo Satelital**: Editor poligonal vectorial sobre capas satelitales de alta resolución.
  * **Modo GPS en Terreno**: El técnico activa *"Grabar Lindero"* y recorre el perímetro en vehículo rústico o motocicleta; la app almacena los puntos GPS con filtro de precisión (HDOP < 2.0).
* **Parámetros de Seguridad del Hato**:
  * Configuración del ancho de advertencia radial exterior ($t_w$ en metros).
  * Enlace de canales de Telegram, WhatsApp y SMS para avisos de fuga.
* **Control de Autogestión al Cliente**:
  * Habilitación de la bandera `permite_crear_potreros` para permitir que el adquiriente diseñe sus propias divisiones internas.

### 2.2. Suite de Diagnóstico de Hardware en Banco de Pruebas (Hardware Test Suite)
Permite certificar que un collar esté en perfectas condiciones antes de entregarlo a la finca:
* **Diagnóstico GPS/GNSS (NEO-6M / M10)**:
  * Vista visual de satélites en cielo (SNR, Azimut, Elevación de constelaciones GPS, GLONASS, Galileo).
  * Verificación de fijación 3D, latitud, longitud, altitud y cálculo de deriva estática.
* **Diagnóstico de Movimiento e Inercia (IMU MPU-6050)**:
  * Osciloscopio en vivo de los 3 ejes ($X, Y, Z$).
  * Prueba de detección de micro-movimientos (simulación de masticación/rumia) y sacudidas bruscas.
* **Prueba de Estímulo Acústico y Disuasivo**:
  * Activación de tonos controlados en el buzzer pasivo a 2000 Hz y 3000 Hz.
  * Comprobación del corte automático de seguridad de 60 segundos para evitar fatiga animal.
  * Prueba de continuidad y disparo de prueba del pulso electrostático bajo banco con resistencia de carga segura (sin riesgo de arco descontrolado).
* **Prueba de Energía y Carga Solar**:
  * Medición del voltaje de celda en reposo y bajo transmisión celular.
  * Verificación del circuito de carga fotovoltaico (mA generados bajo luz natural o lámpara de banco).
* **Prueba de Conectividad Celular (Módem 4G LTE Cat-M1 / NB-IoT)**:
  * Nivel de señal en decibeles (RSSI/CSQ) y calidad de enlace.
  * Consola para envío de comandos AT directos al módem.

### 2.3. Gestión y Ciclo de Vida de Collares
* **Recepción y Lectura Continua de Lotes**:
  * Escaneo ultrarrápido con la cámara de códigos QR o códigos de barras en las cajas para altas masivas de 50 a 200 collares en un solo paso.
* **Transición de Estados de Stock**:
  * Registro de cambios de estado: `EN_ALMACEN` ➔ `EN_TRANSITO` ➔ `EN_REVISION` ➔ `DE_BAJA`.
  * Generación de orden de despacho y firma digital de entrega al cliente.
* **Flasheo y Mantenimiento OTA vía BLE**:
  * Carga de nuevas versiones de firmware binario directamente vía Bluetooth sin abrir la carcasa hermética IP68.

---

## 🤠 3. APP 2: "CowIA Finca" (Productor, Administrador y Corral)

> **Destinatarios**: Administradores de hacienda, mayordomos, veterinarios, pesadores y vaqueros.  
> **Modo de Enlace**: Offline-First nativo con sincronización automática en la nube vía REST y WebSockets.  
> **Diseño UX**: Interfaz de alto contraste para sol radiante, botones táctiles grandes para uso con dedos sucios o guantes, y alertas por voz/hápticas.

### 3.1. Gestión Dinámica de Potreros (Cercas Virtuales Internas)
* **Creación Libre de Subdivisiones**:
  * El productor puede trazar nuevos potreros de rotación según la temporada climática o necesidad de forraje.
  * Puede hacerlo dibujando en pantalla o caminando a pie por las líneas divisorias con el GPS de su teléfono.
* > [!IMPORTANT]
  > **Restricción de Integridad Geográfica**:
  > La aplicación móvil no permite guardar ningún potrero que sobrepase los límites del Hato maestro fijado por el técnico (`ST_Within(potrero.perimetro, hato.perimetro) = TRUE`). Esto previene conflictos de linderos con fundos vecinos.

### 3.2. Mecanismo de "Abrir" y "Cerrar" Potreros
* **Potrero Cerrado (En Descanso / Recuperación)**:
  * El pasto está en reposo vegetativo, recién fertilizado o sembrado.
  * Si una res entra en este potrero, el collar activa la advertencia y el sistema dispara una notificación: *"⚠️ Infracción de Rotación: 3 animales ingresaron al Potrero 4 (En Descanso)"*.
* **Potrero Abierto (En Pastoreo Activo)**:
  * Forraje disponible; los animales asignados pastan libremente sin alarmas.
* **Modo "Arreo / Cambio de Potrero" (Apertura Temporal de Compuertas)**:
  * Botón táctico en la app: **"Iniciar Traslado de Lote"**.
  * El vaquero selecciona el potrero de origen y el de destino.
  * La cerca virtual intermedia se "abre" durante una ventana temporal configurable (ej. 45 a 60 minutos).
  * Los animales pueden circular por callejones y pasos de servidumbre sin que los collares emitan pitidos molestos ni descargas por falsa alarma.
  * Al completar el arreo, el vaquero presiona **"Finalizar Traslado"**: el potrero anterior se **cierra** para iniciar su descanso y el nuevo queda armado como zona activa.

### 3.3. Manga, Pesaje y Vinculación Rápida (3 Toques)
* **Vinculación Ágil**:
  1. *Toque 1*: Escaneo de arete visual o selección de la res.
  2. *Toque 2*: Escaneo de código QR del collar físico.
  3. *Toque 3*: Asignación a potrero activo y confirmación.
* **Pesaje Rápido en Báscula**:
  * Teclado numérico gigante y botones de incremento (+1, +5, +10, +50 kg).
  * **Conectividad Bluetooth con Básculas Ganaderas**: Lectura automática del peso estabilizado desde indicadores electrónicos (Tru-Test, Gallagher, Iconix).
  * Visualización en vivo de la **Ganancia Diaria de Peso (GDP)** y semáforo zootécnico contra el pesaje anterior.

### 3.4. Brújula Táctica de Rescate ("Buscar Res")
* Permite localizar reses extraviadas o fugadas **incluso en zonas sin cobertura de internet**:
  * La app toma la última coordenada GPS transmitida por el collar.
  * Utiliza el GPS y compás magnético del smartphone del vaquero.
  * Presenta un dial de brújula con aguja dinámica y contador de distancia en metros en tiempo real: *"Rumbo 118° SE — A 310 metros de tu posición"*.

### 3.5. Sanidad, Reproducción y Salud IMU
* **Vacunación por Potrero**: Posibilidad de seleccionar un potrero completo y registrar la vacunación de todos los animales presentes en un único formulario.
* **Alertas de Celo y Letargo**: Aviso temprano de vacas en celo (picos de actividad detectados por el MPU-6050) y animales con caída de rumia (sospecha de enfermedad).
* **Maternidad y Partos**: Cuenta regresiva de 283 días de gestación y alta automática de crías con vinculación al árbol genealógico.

### 3.6. Motor Offline-First con Base de Datos SQLite Local (`drift`)
* Todas las transacciones (pesajes, vinculaciones, aperturas de potreros) se guardan instantáneamente en la base de datos local del móvil.
* Indicador visual de transacciones pendientes en cola.
* Sincronización automática en segundo plano al detectar cobertura 4G o Wi-Fi en la casa de la hacienda.

---

## 🛸 4. MÓDULO NUEVO: Aforo y Evaluación de Pasturas con Dron (UAV)

### 4.1. El Problema Agronómico y la Oportunidad
En el manejo de pastoreo rotacional intensivo (Voisin, PRV, Pastoreo Holístico), el mayor cuello de botella del productor es estimar a simple vista:
1. **¿Cuánto pasto hay disponible realmente?** (Biomasa en kg de Materia Seca por hectárea - $\text{kg MS/ha}$).
2. **¿Cuándo está listo el potrero para que entren los animales?** (Punto Óptimo de Reposo).
3. **¿Cuántos días faltan para que un potrero en descanso se recupere?**

Meter animales a un potrero antes de tiempo degrada las reservas de la raíz y merma la producción; meterlos tarde lignifica el pasto, perdiendo valor nutricional y proteína.

```
       Dron Sobrevolando Potreros
             [ 🛸 UAV ]
                 │
                 ▼ Captura Fotogramétrica Georreferenciada
       ┌────────────────────────────────────────────────────────┐
       │   Cámara RGB (Drones comerciales: DJI Mini/Air/Mavic)  │
       │   Cámara Multiespectral (NDVI / NDRE - Opcional)       │
       └─────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼ Carga en CowIA
       ┌────────────────────────────────────────────────────────┐
       │             PROCESAMIENTO ESPACIAL POSTGIS             │
       │   1. Mapeo del Ortomosaico contra polígono de potrero. │
       │   2. Cálculo de Índice de Vigor Vegetativo (VARI/NDVI) │
       │   3. Estimación de Altura Media y Cobertura (%)        │
       │   4. Cálculo de Biomasa Disponible (kg MS/ha)          │
       └─────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼ Salida para el Productor
       ┌────────────────────────────────────────────────────────┐
       │         ESTADO DEL POTRERO EN "COWIA FINCA"            │
       │   🟢 POTRERO 2: ¡LISTO! (2.800 kg MS/ha - Entrar hoy)  │
       │   🟡 POTRERO 5: En Crecimiento (Faltan 8 días)         │
       │   🔴 POTRERO 1: Pastoreado (Faltan 24 días de descanso)│
       └────────────────────────────────────────────────────────┘
```

---

### 4.2. Sensores y Metodología de Captura

#### Opción A: Drones Comerciales Estándar con Cámara RGB (Alta Accesibilidad)
* Funciona con drones convencionales accesibles en el mercado (DJI Mini 3/4, Mavic, Air).
* Utiliza el índice **VARI** (*Visible Atmospherically Resistant Index*):
  $$\text{VARI} = \frac{\text{Verde} - \text{Rojo}}{\text{Verde} + \text{Rojo} - \text{Azul}}$$
* Evalúa con precisión el vigor del cloroplasto, la densidad de follaje verde y la proporción de suelo descubierto / malezas.

#### Opción B: Drones con Cámara Multiespectral (Alta Precisión Agronómica)
* Utiliza sensores con banda de infrarrojo cercano (NIR) y borde rojo (RedEdge).
* Calcula el índice **NDVI** (*Normalized Difference Vegetation Index*):
  $$\text{NDVI} = \frac{\text{NIR} - \text{Rojo}}{\text{NIR} + \text{Rojo}}$$
* Proporciona una correlación directa con el contenido hídrico y la masa foliar del forraje.

---

### 4.3. Algoritmo de Decisión: Estimación de Días Restantes de Descanso

El motor calcula la fecha óptima de entrada mediante el siguiente modelo:

1. **Aforo de Biomasa Actual ($B_{\text{actual}}$)**:
   A partir del índice vegetativo y la altura estimada por fotogrametría (DSM - Modelo Digital de Superficie):
   $$B_{\text{actual}} = f(\text{Índice}, \text{Altura}) \quad [\text{kg MS/ha}]$$

2. **Biomasa Óptima de Entrada ($B_{\text{objetivo}}$)**:
   Parámetro configurado según la variedad forrajera (ej. Guinea Mombasa: ~2.800 kg MS/ha; Brachiaria Brizantha: ~2.400 kg MS/ha; Humidicola: ~1.800 kg MS/ha).

3. **Tasa de Crecimiento Diario de la Finca ($T_c$)**:
   Calculada históricamente entre vuelos sucesivos del dron o estimada según época de lluvias/sequía (ej. 60 kg MS/ha/día en lluvia; 20 kg MS/ha/día en sequía).

4. **Días Restantes para Pastoreo ($D_{\text{espera}}$)**:
   $$D_{\text{espera}} = \max\left(0, \frac{B_{\text{objetivo}} - B_{\text{actual}}}{T_c}\right)$$

---

### 4.4. Cómo lo Visualiza el Productor en "CowIA Finca"

1. **Capa Satelital con Semáforo de Potreros**:
   * Al activar el filtro *"Capa de Pastos (Dron)"*, cada potrero se ilumina en un color intuitivo:
     * 🟢 **Verde Esmeralda**: **Listo para Pastoreo** (Punto Óptimo alcanzado). Muestra: *"Entrada sugerida: HOY. Carga sugerida: 45 novillos por 3 días"*.
     * 🟡 **Amarillo Ámbar**: **En Crecimiento Vegetativo**. Muestra: *"Descanso en curso: Esperar 7 días más para alcanzar masa crítica"*.
     * 🔴 **Rojo Coral**: **Descanso Obligatorio**. Muestra: *"Pasto recién salido o estresado: Prohibido ingresar animales por los próximos 22 días"*.
     * ⚪ **Gris**: *Sin datos de aforo en los últimos 30 días*.

2. **Recomendador Inteligente de Secuencia de Rotación**:
   * En lugar de que el mayordomo adivine a dónde mover el ganado mañana, la app le sugiere:  
     *"El Potrero 4 alcanzó su Punto Óptimo de Reposo (2.750 kg MS/ha). Se recomienda mover el Lote de Ceba desde el Potrero 2 hacia el Potrero 4"*.

3. **Ficha Detallada del Potrero**:
   * Histograma de biomasa por hectárea.
   * Porcentaje de cobertura útil de pasto vs. porcentaje de manchones de malezas o suelo desnudo.

---

## 🗄️ 5. Diseño de Datos y Nuevas Tablas en Base de Datos

Para soportar estas funcionalidades sin alterar la compatibilidad existente, se introducen las siguientes estructuras:

### 5.1. Actualización de la Tabla `potreros`
```sql
ALTER TABLE potreros
ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'ABIERTO', -- 'ABIERTO', 'EN_DESCANSO', 'MANTENIMIENTO'
ADD COLUMN IF NOT EXISTS dias_descanso_recomendados INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS fecha_ultimo_pastoreo DATE,
ADD COLUMN IF NOT EXISTS fecha_estimada_reapertura DATE,
ADD COLUMN IF NOT EXISTS biomasa_actual_kg_ms NUMERIC(8,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS modo_arreo_activo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fin_modo_arreo TIMESTAMP WITH TIME ZONE;
```

### 5.2. Nueva Tabla: `vuelos_dron_pasturas`
Registra los sobrevuelos realizados en la finca:
```sql
CREATE TABLE IF NOT EXISTS vuelos_dron_pasturas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    hato_id INTEGER NOT NULL REFERENCES hatos(id) ON DELETE CASCADE,
    fecha_vuelo DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_camara VARCHAR(30) DEFAULT 'RGB', -- 'RGB', 'MULTIESPECTRAL'
    modelo_dron VARCHAR(80),
    archivo_ortomosaico_url TEXT,
    indice_evaluado VARCHAR(20) DEFAULT 'VARI', -- 'VARI', 'NDVI', 'NDRE'
    tasa_crecimiento_estimada_kg_dia NUMERIC(6,2) DEFAULT 50.00,
    observaciones TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.3. Nueva Tabla: `evaluaciones_potrero_dron`
Detalle de aforo resultante por cada potrero individual tras el vuelo:
```sql
CREATE TABLE IF NOT EXISTS evaluaciones_potrero_dron (
    id SERIAL PRIMARY KEY,
    vuelo_id INTEGER NOT NULL REFERENCES vuelos_dron_pasturas(id) ON DELETE CASCADE,
    potrero_id INTEGER NOT NULL REFERENCES potreros(id) ON DELETE CASCADE,
    indice_promedio NUMERIC(4,3),
    altura_promedio_cm NUMERIC(5,1),
    biomasa_estimada_kg_ms_ha NUMERIC(8,2),
    porcentaje_cobertura_util NUMERIC(5,2),
    estado_sugerido VARCHAR(30), -- 'LISTO_PASTOREO', 'EN_RECUPERACION', 'SOBREPASTOREADO'
    dias_espera_calculados INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 6. Cronograma de Implementación Sugerido

| Fase | Componente | Alcance Clave |
| :--- | :--- | :--- |
| **Fase 1** | **Backend Espacial** | Migración SQL (`potreros.estado`, tablas de dron) y endpoints REST para abrir/cerrar potreros y modo arreo. |
| **Fase 2** | **CowIA Ops (Flutter)** | Módulo de creación de Hatos, test de hardware BLE/GPS/IMU y gestión de inventario masivo. |
| **Fase 3** | **CowIA Finca (Flutter)** | Módulo de manga/pesaje Bluetooth, dibujo de potreros (`ST_Within`), apertura/cierre y brújula de rescate. |
| **Fase 4** | **Pipeline Dron (IA / GIS)** | Procesador de ortomosaicos GeoTIFF/RGB, cálculo de índice VARI/NDVI y visualización del semáforo en el mapa. |

---

Este documento queda incorporado en la carpeta de documentación oficial del proyecto (`docs/`) como guía de referencia para los próximos desarrollos en Flutter y analítica de teledetección.
