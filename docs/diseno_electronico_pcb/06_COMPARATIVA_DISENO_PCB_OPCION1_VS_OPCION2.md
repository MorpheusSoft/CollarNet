# Comparativa y Diseño de PCB: Opción 1 (Modular 2 Diagramas) vs Opción 2 (Monolítica Integrada con Base de Batería)
## Sistema CollarNet / CowAI V2 — Collar Inteligente Ganadero con Cerca Virtual

Este documento describe en profundidad los dos enfoques de diseño y distribución física de circuito impreso (PCB) para el collar ganadero CowAI, optimizando el espacio al milímetro para soportar microcontrolador, conectividad 4G LTE Cat-1 + GNSS satelital, recarga solar MPPT, zumbador acústico de 95 dB, y sistema de descarga electrostática disuasoria (CDI) con aislamiento de seguridad.

---

## 0. Confirmación del Enfoque Solicitado

| Parámetro | **Opción 1: Arquitectura Modular (2 Diagramas)** | **Opción 2: Monolítica All-In-One (Con Portapilas Integrado)** |
| :--- | :--- | :--- |
| **Concepto Central** | Componentes divididos en 2 diagramas: (1) Externo / Cableado periférico y (2) Circuito PCB interno, detallando su interconexión exacta. | Placa única alargada que integra **absolutamente todo**, incluyendo la base/clips porta-batería soldados en la misma PCB. |
| **Factor de Forma PCB** | **2 Placas**: Lógica (60.0 × 32.0 mm) + Potencia/Descarga (32.0 × 26.0 mm). | **1 Sola Placa**: **110.6 × 33.1 mm** con slot de aislamiento fresado de 2.0 mm (4 taladros M2.5 en dx=27.75mm, dy=105.55mm). |
| **Soporte de Batería** | Pack de celda 21700 alojado en cápsula derecha con conector JST. | Base/clips de batería 18650 / 21700 (Keystone 1042/1048) soldados en cara BOTTOM (aprovecha 24.5 mm libres en caja 3D). |
| **Arnés de Cables** | Mazo flexible de 5 hilos de baja tensión (< 4.2V) por el puente dorsal (J5 en Lógica ↔ J6 en Potencia). | **Cero arnés entre placas**. Solo cables cortos de panel solar exterior y electrodos. |
| **Aislamiento de Choque (HV)**| Físico total: el circuito de alta tensión está en otra cápsula a 15 cm de distancia. | Ranura pasante fresada (*Milling Isolation Slot*) de 2.0 mm en la misma placa con optoacoplador 5kV y watchdog 1000ms. |
| **Carcasa 3D Asociada** | `diseno_halter_v2`: Arquitectura dorsal anatómica de 2 cápsulas (Halter V2). | `caja_3d/caja_lilygo_t7670x.scad`: Carcasa unificada IP67 con túnel de correa de 38 mm y altura de postes de 24.5 mm. |

---

## 1. OPCIÓN 1: Arquitectura Modular (Componentes Separados en 2 Diagramas)

La **Opción 1** divide el sistema en dos representaciones de ingeniería complementarias:
1. **Diagrama 1A (Diagrama de Componentes Externos)**: Todo lo que se encuentra fuera de las placas de circuito (sensores, antenas, paneles solares, batería, zumbador, electrodos dérmicos, arnés de interconexión).
2. **Diagrama 1B (Diagrama de Circuitos Internos de PCB)**: Los circuitos integrados, componentes pasivos, microcontrolador ESP32-S3, módem SIM7670SA, cargador MPPT, driver de potencia, watchdog y circuito de descarga CDI.
3. **Matriz de Conexión Punto a Punto**: Mapeo exacto entre el exterior y el circuito impreso.

```
========================================================================================================================
                                    DIAGRAMA 1A: COMPONENTES EXTERNOS Y PERIFÉRICOS
========================================================================================================================

                 [PANEL SOLAR IZQUIERDO]                                      [PANEL SOLAR DERECHO]
                    (6.0V / 120mA Epoxi)                                         (6.0V / 120mA Epoxi)
                             │                                                            │
                             │ (Par AWG26)                                                │ (Par AWG26)
                             ▼                                                            ▼
                 ┌───────────────────────┐                                    ┌───────────────────────┐
                 │ CÁPSULA IZQUIERDA     │       ARNÉS PUENTE DORSAL          │ CÁPSULA DERECHA       │
                 │ (LÓGICA Y TELEMETRÍA) │ ══════════════════════════════════ │ (POTENCIA Y DESCARGA) │
                 └───────────────────────┘    5 Hilos AWG24/26 en TPU Ø8mm    └───────────────────────┘
                     ▲       ▲       ▲                                            ▲       ▲       ▲
                     │       │       │                                            │       │       │
    ┌────────────────┴─┐   ┌─┴─────┐ └─────────────────┐               ┌──────────┴──┐    │       └──────────┐
    │                  │   │       │                   │               │             │    │                  │
[ANTENA GPS PARCHE]    │ [NANO-SIM]│       [CONECTOR USB-C ESTANCO] [CELDA 21700]    │ [BUZZER 95dB]   [2x ELECTRODOS]
 (25x25mm Cerámica     │ (Chip 4G  │        (Pasamuros Taller IP67)  (5000 mAh Li-Ion│  (Acústico 4kHz   (Inox 316 M4
 con cable coaxial     │  Digitel) │                                 con cables      │  puerto estanco   contacto dérmico
 IPEX al cielo)        │           │                                 soldados)       │  al exterior)     en el cuello)
                       │           │                                                 │
            [ANTENA 4G LTE FPC]    │                                      [SEGURO WATCHDOG 1S]
             (Flexible adhesiva    │                                       (Hardware Monoestable
              adherida a la caja)  │                                        anti-bloqueo micro)
```

### 1.1. Detalle del Diagrama 1A: Componentes Externos

| Componente Externo | Modelo / Especificación | Ubicación Física en el Collar | Interfaz hacia la PCB |
| :--- | :--- | :--- | :--- |
| **Panel Solar Izquierdo** | RY9-414 (6.0V / 120mA, 55×60 mm monocristalino) | Cara inclinada superior de Cápsula Izquierda | Conector JST-PH 2.0 mm (2 pines: `SOLAR_IZQ_POS`, `GND`) |
| **Panel Solar Derecho** | RY9-414 (6.0V / 120mA, 55×60 mm monocristalino) | Cara inclinada superior de Cápsula Derecha | Hacia Arnés Dorsal (`SOLAR_DER_IN`) |
| **Antena GNSS Satelital** | Cerámica pasiva/activa 25×25×4 mm (GPS/GLO/GAL) | Alojamiento superior en tapa apuntando al cénit | Latiguillo coaxial RG-1.13 de 50 mm con conector u.FL / IPEX |
| **Antena Celular 4G LTE**| FPC Adhesiva 110×20 mm multibanda (B2/B4/B7/B28) | Adherida en la pared interna longitudinal | Latiguillo coaxial de 50 mm con conector u.FL / IPEX |
| **Pack de Batería** | Celda Li-Ion 21700 3.7V / 5000 mAh (Samsung/BAK) | Cuna en Cápsula Derecha (equilibrio de peso) | Conector JST-XH 2.54 mm hacia Placa Potencia |
| **Zumbador Acústico** | Piezoeléctrico Ø12.4×8.0 mm (95 dB SPL @ 10cm, 4kHz) | Rejilla acústica estanca en Cápsula Derecha | Terminales soldados a Placa de Potencia |
| **Electrodos de Choque** | 2x Pernos M4 de Acero Inoxidable 316 semiesféricos | Cara inferior en contacto con la piel del animal | Pernos M4 roscados directamente a pads de salida de alta tensión |
| **Conector USB-C** | Tipo C 16 pines con junta de silicona IP67 | Lateral protegido con tapón roscado estanco | Flex o conector de borde directo en Placa Lógica |

---

```
========================================================================================================================
                                    DIAGRAMA 1B: CIRCUITOS INTERNOS DE AMBAS PLACAS
========================================================================================================================

  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ PLACA 1: LÓGICA Y TELECOMUNICACIONES (CÁPSULA IZQUIERDA: 60.0 x 32.0 mm)                                       │
  │                                                                                                                 │
  │  [USB-C J1] ──► Diodos TVS ────► [ESP32-S3-WROOM-1 U1] ◄────── UART1 (IO17/18) ─────► [SIM7670SA-MNGV U2]      │
  │                     │            - Xtensa LX7 240MHz                                  - Módem 4G Cat-1          │
  │                     │            - 16MB Flash, 8MB PSRAM                              - GNSS integrado          │
  │  [SOLAR_IZQ] ──► Diodo SS34 ┐    - Geocercas Ray-Casting                              - Antena IPEX LTE & GPS   │
  │                             ├──► [Cargador MPPT CN3791 U4]                             ▲                        │
  │  [SOLAR_DER] ──► Diodo SS34 ┘    - Seguimiento Pmax 6.0V                               │                        │
  │  (desde J5 pin 5)                - Corriente carga 1.2A                                │                        │
  │                                         │                                              │ VBAT_PWR               │
  │  [VBAT_PWR] (desde J5 pin 1) ───────────┴───────┬──────────────────────────────────────┼──► [2x Tantalio 220µF] │
  │                                                 ▼                                                               │
  │                                    [Regulador Buck SY8089 U5]                                                   │
  │                                    - Entrada: 3.4V - 4.2V                                                       │
  │                                    - Salida: +3.3V_SYS (2.0A)                                                   │
  │                                         │                                                                       │
  │                                         ├──► ESP32-S3 VDD33                                                     │
  │                                         └──► [Acelerómetro SC7A20 U3] (I2C: IO8/IO9, 6µA)                       │
  │                                                                                                                 │
  │  CONECTOR J5 DE ARNÉS DORSAL (HACIA CÁPSULA DERECHA):                                                           │
  │  • Pin 1: VBAT_PWR   (Entrada de alimentación desde Placa Potencia)                                             │
  │  • Pin 2: GND_SYS    (Retorno común de masa)                                                            │
  │  • Pin 3: BUZZER_PWM (Salida ESP32 GPIO 5 hacia MOSFET de audio)                                                │
  │  • Pin 4: IMPULSE_TRIG (Salida ESP32 GPIO 4 hacia Optoacoplador)                                               │
  │  • Pin 5: SOLAR_DER  (Entrada de panel solar derecho hacia MPPT)                                                │
  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                 │   │   │   │   │
                                                 │   │   │   │   │  (Arnés Puente Dorsal: 5 Hilos AWG 24/26)
                                                 ▼   ▼   ▼   ▼   ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ PLACA 2: POTENCIA, AUDIO Y DESCARGA (CÁPSULA DERECHA: 32.0 x 26.0 mm)                                          │
  │                                                                                                                 │
  │  CONECTOR J6 DE ARNÉS DORSAL (DESDE CÁPSULA IZQUIERDA):                                                         │
  │  • Pin 1: VBAT_PWR ◄── [BMS DW01A + FS8205A] ◄── [Fusible PPTC 3A] ◄── [BATERÍA 21700]                         │
  │  • Pin 2: GND_SYS  (Masa común del sistema)                                                                     │
  │  • Pin 3: BUZZER_PWM ────► Gate MOSFET AO3400A Q1 ─────────┬──► [Buzzer Piezo 95dB BZ1]                        │
  │                                                            │    (con diodo flyback 1N4148W)                     │
  │  • Pin 4: IMPULSE_TRIG ──► [Optoacoplador EL817C U8]       │                                                    │
  │                                  │ (Aislamiento Galvánico 5kV)                                                  │
  │                                  ▼                                                                              │
  │                       [Watchdog 1000ms 74LVC1G123 U9]                                                           │
  │                                  │ (Corte estricto hardware)                                                    │
  │                                  ▼                                                                              │
  │                       [Oscilador Elevador Flyback DC-HV] ◄─┘                                                    │
  │                                  │ (3.7V ──► 800V - 1000V DC)                                                   │
  │                                  ▼                                                                              │
  │                       [Condensador CDI 0.1µF / 1000V CBB21 C7] (Energía: 0.05 Joules)                           │
  │                                  │                                                                              │
  │                       [Disparo SCR Tiristor TYN1225 / MCR100 TH1]                                               │
  │                                  │                                                                              │
  │                       [Resistencia Limitadora 220Ω / 2W R_LIM]                                                  │
  │                                  │                                                                              │
  │                                  ▼                                                                              │
  │                       [2x BORNES ELECTRODOS M4 INOX 316] ──► Contacto con la piel cervical del vacuno          │
  │                                                                                                                 │
  │  • Pin 5: SOLAR_DER ◄──── [Conector Panel Solar Derecho JST] (Enviado a MPPT izquierdo)                         │
  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2. Tabla de Interconexión Entre el Circuito y los Componentes Externos

| Pin / Hilo | Señal / Red | Origen | Destino | Calibre | Tipo de Señal / Protección |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **H1** | `VBAT_PWR` | Placa Potencia (J6 pin 1) | Placa Lógica (J5 pin 1) | AWG 24 | 3.4V a 4.2V / Corriente máx 2.5A (fusible PPTC 3A) |
| **H2** | `GND_SYS` | Masa Placa Derecha (J6 pin 2)| Masa Placa Izquierda (J5 pin 2)| AWG 24 | 0.0V (Retorno común de potencia y señales) |
| **H3** | `BUZZER_PWM` | ESP32 GPIO 5 (J5 pin 3) | MOSFET AO3400A (J6 pin 3) | AWG 26 | Señal PWM 3.3V (0 a 4000 Hz, corriente < 2 mA) |
| **H4** | `IMPULSE_TRIG`| ESP32 GPIO 4 (J5 pin 4) | Optoacoplador U8 (J6 pin 4)| AWG 26 | Pulso lógico 3.3V activo alto (corriente 5 mA) |
| **H5** | `SOLAR_DER_IN`| Panel Solar Der (J6 pin 5) | Diodo D2 MPPT (J5 pin 5) | AWG 26 | Tensión continua 5.5V a 6.5V / 120 mA máx |
| **Ext-1**| `GPS_RF_50R` | Módulo SIM7670SA | Antena Cerámica 25×25 mm | Coaxial RG-1.13 | RF 1575.42 MHz / 50 Ohms coplanar |
| **Ext-2**| `LTE_RF_50R` | Módulo SIM7670SA | Antena Adhesiva FPC | Coaxial RG-1.13 | RF 700-2600 MHz / 50 Ohms coplanar |
| **Ext-3**| `HV_PULSE_OUT`| SCR Tiristor / R 220Ω | Electrodo Inox Cuello (+) | Perno M4 | Pulso de 800V a 1000V / 0.05J / Duración < 1ms |
| **Ext-4**| `HV_RETURN` | Masa de Choque (HV_GND)| Electrodo Inox Cuello (-) | Perno M4 | Retorno local de descarga (aislado de GND_SYS) |

---

## 2. OPCIÓN 2: Placa Única Monolítica Todo en Uno (All-In-One con Portapilas Integrado)

La **Opción 2** fusiona todos los subsistemas en un único circuito impreso continuo de alta densidad con dimensiones exactas de **110.6 × 33.1 mm**, integrando la base o clips para la batería 18650 o 21700 directamente sobre la cara inferior (*Bottom Layer*) de la PCB.

### 2.1. Ajuste Dimensional Crítico con la Carcasa 3D (`caja_lilygo_t7670x.scad`)
En la carcasa unificada `caja_lilygo_t7670x.scad`, los 4 postes de montaje están parametrizados estrictamente con:
* `pcb_l = 110.6 mm`
* `pcb_w = 33.1 mm`
* `hole_dy = 105.55 mm` (separación longitudinal de tornillos M2.5)
* `hole_dx = 27.75 mm` (separación transversal de tornillos M2.5)
* `standoff_h = 24.5 mm` (altura libre bajo la PCB)

**Por qué una placa de 108 mm rompería mecánicamente**: Con `hole_dy = 105.55 mm`, en una placa de 108.0 mm el centro del orificio quedaría a solo `(108.0 - 105.55)/2 = 1.225 mm` del borde. Al taladrar un orificio de Ø2.5 mm (radio 1.25 mm), la broca rebasaría el borde exterior en 0.025 mm, partiendo la placa. Con las dimensiones normalizadas de **110.6 × 33.1 mm**, el margen de cobre y fibra FR4 en el borde es de **1.275 mm longitudinal** y **1.425 mm transversal**, garantizando integridad mecánica total.

```
========================================================================================================================
             DIAGRAMA PLANTA PCB OPCIÓN 2: MONOLÍTICA INTEGRADA (110.6 x 33.1 mm) — CARA SUPERIOR (TOP)
========================================================================================================================

  ┌──────┬────────────────────────────────────────────────────────────────┬───────────────────────────┬────────┐
  │ M2.5 │ SECTOR 1: PROCESAMIENTO, RF Y CARGA SOLAR (0 a 70 mm)          │ SECTOR 2: AUDIO Y CONTROL │ SECTOR │
  │ (○)  │                                                                │           (70 a 84 mm)    │ 3: HV  │
  ├──────┘                                                                └───────────────────────────┤ (26mm) │
  │ [USB-C] ┌─────────────┐   ┌──────────────┐   ┌───────┐  ┌───────────┐  ┌─────────────────────────┐ │        │
  │  (J1)   │ ESP32-S3    │   │ SIM7670SA    │   │SC7A20 │  │ BUZZER    │  │ [Optoacoplador EL817C]  │ │ 2.0 mm │ (○) M2.5
  │         │ WROOM-1     │   │ 4G LTE/GNSS  │   │(IMU)  │  │ PIEZO     │  │ (Cruza la barrera 5kV)  │ │ RANURA │ ┌────┐
  │ [BOOT]  │ Dual-Core   │   │ Cat-1 + GPS  │   │ 6µA   │  │ 95dB SPL  │  └─────────────────────────┘ │ FRESADA│ │EL1 │
  │ [RESET] │ 240 MHz     │   │              │   └───────┘  │ (Ø12.4mm) │                              │ CREEP. │ │(M4)│
  │         │ 16MB/8MB    │   │ [uFL]  [uFL] │              └───────────┘  ┌──────────┐┌───────────┐   │ > 8 mm │ └────┘
  │         │             │   │ GPS    LTE   │                             │74LVC1G123││ Mini      │   │        │
  │         └─────────────┘   └──────────────┘                             │ Watchdog ││ Bobina    │   │        │ ┌────┐
  │                                                                        │ 1000 ms  ││ Flyback HV│   │ [SCR]  │ │EL2 │
  │         ┌──────────┐┌───────────┐                                      └──────────┘└───────────┘   │ [CBB]  │ │(M4)│
  │         │ Buck 3V3 ││MPPT CN3791│                                                                  │ [220Ω] │ └────┘
  ├──────┐  │ SY8089   ││ 6.0V /1.2A│                                                                  │        │ (○) M2.5
  │ M2.5 │  └──────────┘└───────────┘                                                                  ├────────┴────────┤
  │ (○)  │ <─────────── ZONA DE MUY BAJA TENSIÓN (3.3V / 3.7V) ───────────>                            │ ZONA 1000V DC   │
  └──────┴─────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────┘

========================================================================================================================
             DIAGRAMA PLANTA PCB OPCIÓN 2: MONOLÍTICA INTEGRADA (110.6 x 33.1 mm) — CARA INFERIOR (BOTTOM)
========================================================================================================================

  ┌──────┬────────────────────────────────────────────────────────────────────────────────────────────┬────────┐
  │ M2.5 │ SECTOR DE BATERÍA INTEGRADA (CLIPS KEYSTONE 1042 / 1048 SOLDADOS A LA PCB)                 │ M2.5(○)│
  │ (○)  │ APROVECHA LA CAVIDAD DE 24.5 mm DE LOS SEPARADORES EN caja_lilygo_t7670x.scad              │        │
  ├──────┘                                                                                            └────────┤
  │                                                                                                            │
  │  ┌───────────┐      [CLIP NEGATIVO] ════════════════════════════════════ [CLIP POSITIVO]                   │ ┌────┐
  │  │ NANO-SIM  │        (GND Power)       CELDA LI-ION 18650 / 21700          (+VBAT)                        │ │EL1 │
  │  │ Push-Pull │                           3.7V / 3500 - 5000 mAh                                            │ │(M4)│
  │  │ Ultra-Low │      ┌─────────────┐   (Longitud 65-70mm / Diámetro 18-21mm) ┌─────────────┐                │ └────┘
  │  │ (1.3 mm)  │      │ Keystone    │ ─────────────────────────────────────── │ Keystone    │                │
  │  └───────────┘      │ 1042 / 1048 │                                         │ 1042 / 1048 │                │ ┌────┐
  │                     └─────────────┘                                         └─────────────┘                │ │EL2 │
  │  ┌───────────┐      ┌─────────────┐                                                                        │ │(M4)│
  │  │ JST SOLAR │      │ 2x Tantalio │                                                                        │ └────┘
  │  │ (PH 2.0)  │      │ 220µF (VBAT)│                                                                        │ (○)    │
  ├──────┐              └─────────────┘                                                                        ├────────┤
  │ M2.5 │                                                                                                     │ M2.5(○)│
  └──────┴─────────────────────────────────────────────────────────────────────────────────────────────────────┴────────┘
```

### 2.2. Por qué la Batería va en la Cara Inferior (Double-Sided SMT Architecture)
Una celda 18650 mide **65.0 mm** de largo (76.5 mm con el portapilas Keystone 1042). Una celda 21700 mide **70.0 mm** (82.0 mm con Keystone 1048).
En una placa de 110.6 mm, es físicamente imposible colocar la batería en serie longitudinal en la misma cara superior junto al ESP32 (25.5 mm), el módem SIM7670 (24.0 mm) y el circuito de choque (26.0 mm), pues la suma daría más de 160 mm.
Por ello, la Opción 2 implementa **montaje en ambas caras (*Double-Sided SMT*)**:
* **Cara Inferior (Bottom)**: Los clips porta-batería Keystone van soldados en el reverso, descendiendo hacia la cavidad de **24.5 mm de altura libre** que ya existe en la carcasa 3D (`caja_lilygo_t7670x.scad`). También se ubican allí la ranura Nano-SIM push-pull (1.3 mm) y los condensadores de tantalio de 220 µF.
* **Cara Superior (Top)**: Superficie plana continua donde se montan los chips de cómputo, RF, audio y el generador de pulso de alta tensión.

### 2.3. Seguro Crítico de Aislamiento en Placa Única (Milling Isolation Slot)
Para cumplir con las normas de seguridad dieléctrica **IEC 60664-1** y **UL 62368-1**:
* **Ranura Pasante Fresada (Creepage Slot)**: Se efectúa un fresado físico pasante de **2.0 mm de ancho por 23.0 mm de largo** en el contorno mecánico (Capa *Edge.Cuts*).
* Esta ranura elimina el sustrato FR4, forzando a que cualquier arco eléctrico deba viajar por el aire (rigidez dieléctrica: 3 kV/mm), garantizando una distancia de fuga (*creepage*) superior a **8 mm**.
* El único puente físico que cruza esta frontera es el **Optoacoplador EL817C**, cuyas patas 1 y 2 están en el lado de baja tensión (`GND_SYS`, alimentadas a 3.3V desde GPIO 4), y sus patas 3 y 4 se encuentran en el lado de alta tensión (`HV_GND`), con un aislamiento galvánico de **5000 V RMS**.
* **Watchdog Monoestable 74LVC1G123**: Desconecta físicamente la oscilación del transformador flyback tras **1000 milisegundos continuos**, haciendo imposible que una falla de software aplique alta tensión continua al cuello del animal.

---

## 3. Matriz Comparativa de Ingeniería y Optimización de Espacio

| Criterio de Selección | Opción 1: Modular (2 Placas + Arnés) | Opción 2: Monolítica (1 Placa con Portapilas) | Ganador / Recomendación |
| :--- | :--- | :--- | :---: |
| **Área Total de PCB** | Placa Lógica: 19.2 cm² + Placa Potencia: 8.3 cm² = **27.5 cm²** | Placa Única: 11.06 × 3.31 cm = **36.6 cm²** | **Opción 1** (25% menos superficie de circuito impreso) |
| **Volumen de Envolvente 3D** | Dos cápsulas pequeñas de perfil bajo (25 mm alto) a los lados del cuello unidas por correa. | Una sola caja central más alta (36.7 mm alto) para albergar el portapilas de 24.5 mm + electrónica. | **Opción 1** (menor volumen unitario y perfil más ergonómico) |
| **Facilidad de Fabricación SMT** | Requiere fabricar y pedir 2 tipos de PCB diferentes (o un panelizado conjunto). | **1 sola orden de fabricación SMT**. JLCPCB monta todos los chips y el portapilas de una vez. | **Opción 2** (menor costo de orden SMT y menor logística) |
| **Cables y Soldadura Manual** | Requiere soldar manualmente el arnés de 5 hilos entre ambas cápsulas y pasarlo por el TPU. | **Cero cables de interconexión**. Todo viaja por pistas de cobre internas de 4 capas. | **Opción 2** (elimina 10 puntos de soldadura manual de taller) |
| **Robustez Mecánica y Falla de Arnés**| Riesgo de que el arnés dorsal sufra fatiga tras 2 años por flexión continua del cuello o enganches en ramas. | **Inmune a rotura de arnés**: todo el sistema está confinado en un único bloque rígido IP67. | **Opción 2** (máxima durabilidad de campo sin cables móviles) |
| **Aislamiento Electromagnético (EMC)**| **Excelente por física**: 15 cm de separación física en el aire entre el choque y el receptor GPS. | **Bueno pero requiere ranura fresada de 2.0 mm** y plano de masa multicapa para evitar reset del ESP32. | **Opción 1** (cero acoplamiento inductivo) |
| **Equilibrio de Peso en el Animal** | **Perfecto**: Batería en cápsula derecha (70g) balancea lógica y antenas en la izquierda (65g). El collar no gira. | Todo el peso (135g) concentrado en un solo punto ventral o dorsal. Requiere contrapeso en correa. | **Opción 1** (equilibrio anatómico natural) |

---

## 4. Estrategias de Optimización Espacial al Máximo (PCB Layout Design Rules)

Tanto en la Opción 1 como en la Opción 2, para compactar los componentes al límite sin sacrificar la confiabilidad en campo, se aplican las siguientes reglas:

1. **Estandarización de Pasivos a Formato 0402 / 0603**:
   - Resistencias de pull-up, condensadores de desacople de 100 nF y divisores resistivos ADC en encapsulado **SMD 0402** (1.0 × 0.5 mm).
   - Condensadores de filtrado de 10 µF y 22 µF en encapsulado **SMD 0603 / 0805**.
2. **Componentes con Perfil Integrado Combinado**:
   - Uso del módem **SIM7670SA-MNGV** que combina 4G LTE y receptor satelital GNSS multi-constelación en un único módulo LCC/LGA de 24 × 24 mm, eliminando el módulo GPS NEO-6M / NEO-M8N externo y ahorrando 450 mm² de área de PCB.
   - Uso del acelerómetro **SC7A20** en encapsulado LGA-16 (3 × 3 mm), reduciendo el consumo a 6 µA y ocupando 1/4 del espacio del antiguo MPU-6050 (GY-521).
3. **Optimización Vertical con SMT en Ambas Caras (Double-Sided SMT)**:
   - Ubicación de componentes altos (conectores IPEX, inductor apantallado de 10µH, zumbador piezo) en cara TOP.
   - Ubicación de ranura Nano-SIM push-pull (1.3 mm espesor), condensadores de tantalio ultra-planos y clips de batería en cara BOTTOM, aprovechando el espacio libre inferior de los separadores mecánicos (*standoffs* de 24.5 mm).
4. **Diseño de Vías de Conexión de Alta Densidad**:
   - Vías pasantes de Ø0.3 mm agujero con anillo de cobre de Ø0.5 mm (*via-in-pad* con tapado epóxico y acabado ENIG-Gold) para disipación térmica del amplificador de potencia LTE.

---

## 5. Archivos del Paquete Técnico Asociados

* Visualizador interactivo 3D y diagramático: `docs/diseno_electronico_pcb/visor_comparativa_opcion1_opcion2.html`
* Modelo OpenSCAD paramétrico completo (Opciones 1 y 2): `docs/diseno_electronico_pcb/modelo_pcb_3d.scad`
* Renders CAD OpenSCAD de laboratorio:
  - Opción 1 Modular: `docs/diseno_electronico_pcb/render_cad_opcion1_modular.png`
  - Opción 2 Monolítica: `docs/diseno_electronico_pcb/render_cad_opcion2_monolitica.png`
  - Comparativa Directa: `docs/diseno_electronico_pcb/render_cad_comparativa_ambas.png`
* Renders fotorrealistas:
  - Opción 1: `docs/diseno_electronico_pcb/render_pcb_opcion1_modular.jpg`
  - Opción 2: `docs/diseno_electronico_pcb/render_pcb_opcion2_monolitica.jpg`
* Lista de materiales y partes LCSC unificada: `docs/diseno_electronico_pcb/04_LISTA_MATERIALES_BOM_LCSC.csv`
* Carcasa estanca monobloque asociada a Opción 2: `caja_3d/caja_lilygo_t7670x.scad`
* Carcasa modular de 2 cápsulas asociada a Opción 1: `diseno_halter_v2/collar_halter_v2.scad`
