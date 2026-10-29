# Arquitectura Oficial del Hardware: Opción 2 Monolítica (All-in-One)
## Collar Inteligente Ganadero CowAI / CollarNet V2

A partir de esta revisión técnica, el proyecto adopta de forma oficial y definitiva la **Opción 2: Integrado Monolítico Todo-en-Uno (110.60 × 33.10 mm)** como la arquitectura de hardware de producción.

---

## 1. Justificación de la Arquitectura Monolítica

La arquitectura monolítica unifica toda la electrónica del collar en una **única tarjeta de circuito impreso (PCBA)**, eliminando por completo el arnés dorsal de interconexión y reduciendo drásticamente los costos de ensamble y fallas mecánicas en campo.

```
══════════════════════════════════════════════════════════════════════════════════════════════════
               PLACA MONOLÍTICA COWAI V2 (ALL-IN-ONE) — 110.60 × 33.10 mm
══════════════════════════════════════════════════════════════════════════════════════════════════

CARA SUPERIOR (TOP LAYER):
 [USB-C] ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐   ||   ┌──────┐ ┌──────┐
 ──[J1]──┤   ESP32-S3   │ │  SIM7670SA   │ │CN3791 MPPT││ BUZZER ├───||───┤BOBINA│ │ TIR. │ ──[EL1]
         │ WROOM-1-N16R8│ │ (4G LTE+GPS) │ │ + SY8089 ││  95dB  │   ||   │ 1000V│ │ TYN  │ ──[EL2]
         └──────────────┘ └──────────────┘ └──────────┘ └────────┘   ||   └──────┘ └──────┘
 <────────────── SECTOR LÓGICA & RADIOFRECUENCIA (85 mm) ─────────────>   [RANURA   <── SECTOR HV ──>
                                                                          FRESADA       (22 mm)
                                                                          2.0 mm]

CARA INFERIOR (BOTTOM LAYER):
           ┌──────────────────────────────────────────────────────────┐
           │        BASE PORTAPILAS KEYSTONE 1042 / 1048 SMT          │    [Slot Nano-SIM]   [JST Solar]
           │         (Celda Li-Ion 18650 / 21700 suspendida)          │    ──────[J2]──────    ───[J3]───
           └──────────────────────────────────────────────────────────┘
```

### Ventajas de Ingeniería sobre el diseño modular:
1. **Cero Cables de Arnés Dorsal**: Todo el conexionado (alimentación, buzzer, carga solar y pulso de choque) ocurre a través de pistas de cobre internas de baja impedancia. Se elimina el mazo de cables pasantes que cruzaba el cuello.
2. **Menor Costo de Fabricación**: Se manda a producir y ensamblar una sola PCB en JLCPCB en lugar de dos placas separadas, abaratando la orden SMT a **~$21 USD por collar**.
3. **Compatibilidad Mecánica 100%**: Encaja directamente sobre los 4 postes con orificios de tornillos M2.5 de la caja ganadera [`caja_3d/caja_lilygo_t7670x.scad`](file:///home/lzambrano/Desarrollo/CollarNet/caja_3d/caja_lilygo_t7670x.scad) (`hole_dx = 27.75 mm`, `hole_dy = 105.55 mm`).
4. **Seguridad y Aislamiento de 1000V**: Una **ranura pasante fresada de 2.0 mm en la placa** crea una barrera física de aire con distancia de fuga (*creepage*) superior a 8 mm entre el sector de alta tensión y la lógica del microcontrolador.

---

## 2. Especificaciones Mecánicas y Dimensionales

* **Longitud Total**: **110.60 mm**
* **Ancho Total**: **33.10 mm**
* **Grosor del Sustrato**: **1.6 mm** (FR-4 estándar, 2 capas, 1 oz de cobre)
* **Taladros de Montaje**: 4 orificios metalizados de Ø2.6 mm para tornillos M2.5 con pads de refuerzo de Ø5.0 mm.
  - Distancia entre centros a lo largo (`dy`): **105.55 mm**
  - Distancia entre centros a lo ancho (`dx`): **27.75 mm**
* **Aislamiento Galvánico**: Ranura pasante de **2.0 mm × 28.0 mm** ubicada en $X = 85.0\text{ mm}$ que divide la placa en:
  - **Sector 1 (Lógica y RF)**: Longitud 85.0 mm.
  - **Sector 2 (Alta Tensión / Descarga)**: Longitud 22.0 mm.

---

## 3. Distribución por Capas (Double-Sided SMT)

### Cara Superior (Top Layer - Componentes Principales):
* **Microcontrolador**: Espressif ESP32-S3-WROOM-1-N16R8 (16MB Flash, 8MB PSRAM, USB nativo).
* **Módem Celular & Satelital**: SIMCom SIM7670SA (4G LTE Cat-1 + GNSS) con conectores IPEX u.FL para antena GNSS cerámica y antena 4G LTE.
* **Cargador Solar MPPT**: Consonance CN3791 (SSOP-10) con P-MOSFET AO3401A, diodos Schottky SS34 e inductor de 10 µH.
* **Regulador Buck**: Silergy SY8089 (3.3V / 2.0A) con inductor blindado de 2.2 µH.
* **Acelerómetro I2C**: Silan SC7A20 (ultra-bajo consumo: 6 µA en reposo).
* **Buzzer Acústico**: Zumbador piezoeléctrico de 95dB (4000 Hz) con N-MOSFET AO3400A.
* **Etapa de Descarga Cerca Virtual**: Optoacoplador EL817C, temporizador de seguridad de 1000 ms, oscilador flyback elevador, condensador CDI 1000V/0.1µF, tiristor TYN1225RG (1200V) y terminales pasantes M4.

### Cara Inferior (Bottom Layer - Energía y Conectividad):
* **Base Portapilas Keystone**: Clips metálicos SMD/PTH (Keystone 1042 / 1048) soldados para alojar firmemente una celda cilíndrica Li-Ion **18650 (65 mm)** o **21700 (70 mm)**.
* **BMS Integrado 1S**: Controlador DW01A-G + MOSFET dual FS8205A soldados junto a los bornes de la celda.
* **Ranura Nano-SIM**: Zócalo Push-Pull de 6 pines bajo perfil (`J2`) con filtro ESD.
* **Conector Solar JST**: Conector de 2 pines (JST-PH 2.0 mm) para conectar los paneles solares de la tapa.
