# Collar Inteligente Ganadero CowAI / CollarNet V2 (Estilo Halter)

Diseño ergonómico y modular para monitoreo satelital, geocercas virtuales y pastoreo inteligente de ganado bovino, inspirado en la arquitectura dorsal de referencia en la industria (**Halter**).

---

## 1. Visión General y Arquitectura

A diferencia de las cajas tradicionales que cuelgan bajo el cuello del animal, este diseño sitúa el equipo en la **cruz dorsal del cuello** mediante un **puente anatómico central** y **dos cápsulas laterales simétricas** inclinadas a ~32°.

### Ventajas de Ingeniería:
1. **Doble Captación Solar Continua**: Con dos paneles fotovoltaicos monocristalinos angulados (uno a babor y otro a estribor), el collar aprovecha el sol naciente de la mañana (Este), el sol poniente de la tarde (Oeste) y la radiación cenital de mediodía, asegurando autonomía infinita los 365 días del año.
2. **Recepción Satelital GNSS / GPS Ininterrumpida**: La antena GPS apunta perpendicularmente a la bóveda celeste. Al estar en el lomo dorsal, la cabeza o el cuerpo de la vaca nunca apantallan la señal, incluso cuando baja la cabeza a pastar.
3. **Protección Total contra Golpes y Lodo**: Queda fuera de la zona de impacto contra comederos de cemento, árboles y bebederos, manteniéndose libre de sumersión en fango cuando el animal se echa a rumiar.
4. **Distribución Simétrica de Masa**:
   - **Cápsula Izquierda**: Módulo de procesamiento y telecomunicaciones (LILYGO T-A7670X-S3 + Antena GNSS + Barra LED de estado frontal).
   - **Cápsula Derecha**: Módulo de almacenamiento y potencia (Batería 21700-3P de 15.000 mAh + Módulo de carga solar MPPT + Buzzer acústico de 95dB).
5. **Principio de Contrapeso Inferior**: La cincha ganadera rodea el cuello hasta la garganta/papada donde se coloca una **hebilla pesada o plomada de contrapeso**. La gravedad garantiza que el puente dorsal permanezca siempre arriba de forma estable y no gire con los movimientos de la cabeza.

---

## 2. Especificaciones de Componentes Reales Integrados

| Componente | Especificación / Modelo | Ubicación |
| :--- | :--- | :--- |
| **Batería Li-Ion** | Celda Li-Ion 21700 (3.7V / 5000 mAh) con protección BMS 1S (DW01A + FS8205) | Cápsula Derecha |
| **Paneles Solares (2x)** | Monocristalinos Epoxi `RY9-414` de 55 × 60 × 2.2 mm | Tapa Izquierda y Tapa Derecha |
| **Placa Lógica y RF** | PCB a Medida CowAI V2 (ESP32-S3 + SIM7670SA 4G LTE/GNSS + SC7A20) | Cápsula Izquierda |
| **Antena GNSS** | Parche cerámico activo/pasivo 25.5 × 25.5 × 8.2 mm (apuntando al cielo) | Cuna sobreelevada Cápsula Izquierda |
| **Cargador Solar MPPT** | Circuito integrado MPPT CN3791 para paneles de 6V | Integrado en PCB Cápsula Izquierda |
| **Alerta Acústica** | Zumbador piezoeléctrico pasivo Ø12.4 × 8.0 mm (95 dB @ 4000 Hz) | Cámara acústica Cápsula Derecha |
| **Estímulo Cerca Virtual** | Generador de pulso capacitivo CDI (800V-1000V / 0.05-0.1J) + Watchdog 1s | Cápsula Derecha |
| **Electrodos de Cuello** | 2x Pernos redondeados de acero inoxidable M4 (calidad marina 316) con O-rings | Base inferior Cápsula Derecha |
| **Visor de Estado** | Barra difusora vertical acrílico / PETG translúcido | Hombro frontal Cápsula Izquierda |
| **Cincha Ganadera** | Paso universal de **52 mm** (admite correa de 38 mm a 50 mm) | Túnel continuo bajo ambas cápsulas |

---

## 3. Arquitectura Híbrida Snap-Fit: Cunas Envolventes TPU + Cápsulas ASA (100% Sin Tornillos en el Lomo)

Para resolver el equilibrio entre **máxima comodidad y seguridad animal** y **rigidez estructural e impermeabilidad**, el collar utiliza una arquitectura híbrida de dos materiales con un sistema de ensamble por encastre elástico y click (*Snap-Fit*), **eliminando al 100% cualquier tornillo metálico en contacto con el animal**:

1. **Puente Dorsal con Bolsillo y Click Elástico (TPU 95A)**:
   - Se imprime en TPU 95A flexible (resistente a desgarros, intemperie y absorción de energía de impactos).
   - Sus extremos se prolongan en dos **cunas / bolsillos envolventes tipo funda de celular de 35 mm de profundidad** con paredes amortiguadoras de 2.5 mm de espesor.
   - **Labio perimetral de retención elástica**: El borde superior abraza y sujeta el contorno del case, impidiendo que se levante.
   - **Dientes de traba laterales en cuña (*Snap-Fit Wedge*)**: Paredes interiores con cuñas inclinadas que permiten una inserción suave hacia el fondo y hacen tope recto de 90° para bloquear la extracción accidental.
   - **Muesca de desenganche manual (*Thumb Release*)**: Pequeño rebaje ergonómico para liberar el click con la uña o el pulgar cuando se desee desarmar en taller.
   - **Base 100% Lisa y Ergonómica**: La cara inferior que apoya sobre el cuello del animal es continua, redondeada y carece por completo de tornillos metálicos o aristas vivas, eliminando cualquier riesgo de rozaduras o úlceras.

2. **Cápsulas Laterales con Muescas de Click (*Snap-Fit Detents*) (ASA rígido)**:
   - Se imprimen en ASA (máxima rigidez dimensional, resistencia a la intemperie UV y sellado estanco indeformable).
   - El frontal de cada base posee una **lengüeta macho escalonada de 35 mm** que desliza dentro de la funda de TPU.
   - Cada lateral de la lengüeta cuenta con un **canal / bolsillo de click de 10×8×1.8 mm** donde embonan con un chasquido sonoro y seguro los dientes de traba del TPU al empujar la caja hasta el fondo.
   - La cincha ganadera atraviesa continuamente tanto la cuna de TPU como la cápsula de ASA por su túnel de 52 mm, sirviendo como tensor de anclaje indeformable contra tirones.

3. **Cierre Clamshell Snap-Fit IP67 (Cero Tornillos en las Tapas)**:
   - Se eliminaron todos los tornillos M3 superiores. La tapa y la base se unen mediante **7 clips perimetrales tipo cantilever en cuña** que cierran con un "CLICK" sonoro y firme.
   - **Sellado Laberíntico en U**: La base cuenta con una ranura en U perimetral y la tapa con una lengüeta de compresión que presiona la junta elástica de TPU/silicona entre un 20% y 28%, asegurando hermeticidad IP67 contra inmersión y lodo.
   - **Envoltura Externa TPU**: Al colocar la caja dentro del forro de TPU del puente, las paredes elásticas cubren los clips impidiendo que se flexionen hacia afuera (*seguro de interbloqueo*).

---

## 4. Lista de Archivos STL Generados

Todos los archivos han sido generados y validados paramétricamente desde `collar_halter_v2.scad`:

| Archivo STL | Material Recomendado | Peso | Función / Descripción |
| :--- | :--- | :--- | :--- |
| `puente_dorsal_cowai.stl` | **TPU 95A** (Grafito / Oscuro) | 2.4 MB | Puente dorsal ergonómico con doble cuna envolvente de 35 mm, dientes de click y base lisa. |
| `puente_texto_cowai.stl` | **PLA / PETG / TPU** (Blanco / Contraste) | 1.0 MB | Inserto 3D del logotipo `COWAI` + ondas RF + subtítulo para ensamble multi-color en OrcaSlicer. |
| `capsula_izquierda_base_lilygo.stl` | **ASA** (Naranja de Alta Visibilidad) | 270 KB | Chasis para LILYGO T-A7670X-S3, parche GNSS, canal laberíntico en U y ventanas de click. |
| `capsula_izquierda_tapa_solar.stl` | **ASA** (Naranja de Alta Visibilidad) | 188 KB | Tapa con cuna solar enrasada, ranura LED, lengüeta compresora y 7 clips snap-fit. |
| `capsula_derecha_base_bateria_21700.stl` | **ASA** (Naranja de Alta Visibilidad) | 231 KB | Chasis para pack 21700-3P, módulo MPPT, buzzer, canal en U y ventanas de click. |
| `capsula_derecha_tapa_solar.stl` | **ASA** (Naranja de Alta Visibilidad) | 184 KB | Tapa con cuna solar enrasada, lengüeta compresora y 7 clips snap-fit. |
| `junta_estanca_tpu_ip67.stl` | **TPU 85A** (Naranja o Negro) | 48 KB | Cordón perimetral elástico de sección 2.0×2.0 mm para sellado estanco IP67. |
| `collar_halter_v2_completo_ensamble.stl` | Visualización | 3.6 MB | Modelo 3D de referencia con el collar ensamblado completo (100% sin tornillos). |

---

## 5. Instrucciones para OrcaSlicer y Bambu Lab P1S

### A. Para imprimir el Puente Dorsal con Logotipo Multi-Color (TPU + Blanco):
1. Abre **OrcaSlicer**.
2. Arrastra `puente_dorsal_cowai.stl` a la placa de impresión.
3. Haz clic derecho sobre el modelo y selecciona **Añadir Parte > Cargar...** (*Add Part > Load...*).
4. Selecciona el archivo `puente_texto_cowai.stl`.
   > [!NOTE]
   > Ambos STL comparten el mismo origen de coordenadas espaciales, por lo que el texto embonará automáticamente en su cajera en bajorrelieve sin necesidad de alineación manual.
5. En la lista de objetos de la izquierda, asigna a la parte principal el filamento **TPU 95A** (ej. Negro o Grafito), y a la parte del texto el filamento blanco o flúor.

### B. Para imprimir las Cápsulas en ASA (Bambu Lab P1S):
1. **Filamento**: ASA (Polymaker PolyLite ASA, Bambu ASA o similar).
2. **Cama de Impresión**: Placa PEI texturizada a 90°C - 100°C con adhesivo (barra de pegamento o Magigoo).
3. **Cámara Cerrada**: Mantén la puerta de cristal y la tapa superior de la P1S cerradas para evitar corrientes de aire y *warping*.
4. **Ventilador de Capa**: 0% a 20% máximo.
5. **Relleno**: 35% - 45% tipo **Giroide** (*Gyroid*) con 5 paredes perimetrales.

---

```
        [CÁPSULA IZQUIERDA: Lógica & RF]                 [CÁPSULA DERECHA: Potencia & Estímulo]
 ┌──────────────────────────────────────────────┐       ┌──────────────────────────────────────┐
 │ • ESP32-S3-WROOM-1 (MCU LittleFS)            │       │ • Celda Li-Ion 21700 (3.7V / 5000mAh)│
 │ • SIM7670SA Módem (4G LTE Cat-1 + GNSS)      │       │ • Protección BMS 1S (DW01A + FS8205) │
 │ • Antena Parche GNSS Cerámica (al cielo)     │       │ • Buzzer Piezoeléctrico 95dB (4000Hz)│
 │ • Antena FPC 4G LTE Adhesiva                 │       │ • Driver MOSFET AO3400A              │
 │ • Acelerómetro SC7A20 I2C (6µA Reposo)       │       │ • Generador de Pulso CDI (800V-1000V)│
 │ • Cargador Solar MPPT CN3791 (Panel 6V)      │       │ • Optoacoplador EL817C + Watchdog 1s │
 │ • Regulador Buck DC-DC SY8089 (3.3V / 2A)    │       │ • 2x Electrodos Inox M4 para cuello  │
 └──────────────────────┬───────────────────────┘       └──────────────────┬───────────────────┘
                        │                                                  │
                        └────────────[ CANAL PUENTE DORSAL Ø8mm ]──────────┘
                                      Arnés de 5 Hilos de Baja Tensión:
                                      1. VBAT (+) [3.4V - 4.2V]
                                      2. GND (-)  [0V Masa Común]
                                      3. BUZZER_CTRL (PWM 4000Hz desde IO5)
                                      4. IMPULSE_TRIG (Pulso 1s desde IO4)
                                      5. SOLAR_DER_IN (Panel Solar Derecho)
```

> [!NOTE]
> La documentación detallada para fabricar las placas en EasyEDA / KiCad y pedir el ensamblaje automatizado SMT en JLCPCB se encuentra en:
> 👉 [`docs/diseno_electronico_pcb/`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/)
> - `01_ARQUITECTURA_Y_DISTRIBUCION.md`: Fundamentos y aislamiento galvánico.
> - `02_ESQUEMATICO_CAPSULA_IZQUIERDA_LOGICA.md`: Esquemático completo de la placa lógica.
> - `03_ESQUEMATICO_CAPSULA_DERECHA_POTENCIA.md`: Esquemático de descarga eléctrica y audio.
> - `04_LISTA_MATERIALES_BOM_LCSC.csv`: Lista de compra y fabricación con números LCSC.
> - `05_GUIA_DISENO_EASYEDA_JLC.md`: Guía paso a paso para mandar a fabricar las placas.

---

## 7. Tornillería y Ensamble Mecánico

- **12x Tornillos M3 × 16 mm de acero inoxidable (A2/A4)**: Cierre estanco de las tapas solares superiores sobre las bases.
- **4x Tornillos M4 × 20 mm de acero inoxidable**: Fijación de seguridad a través de las cunas de TPU hacia las lengüetas de las cápsulas ASA.
- **Sellador**: Cordón fino de silicona neutra o poliuretano (Sikaflex 221) alrededor de los paneles solares para garantizar estanqueidad IP68 en potrero.
