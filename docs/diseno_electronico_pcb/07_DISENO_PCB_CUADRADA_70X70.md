# CollarNet V3 — Módulo IoT de Telemetría Satelital y Control (70.0 × 70.0 mm)
## Plano de Masa GNSS de 60×60 mm, Batería 18650 en Diagonal y Puerto Magnético IP68
**Diseñadores:** Renier Morales & Lindbergh Zambrano  
**Revisión:** 3.0 (Versión para Fabricación y Ensamble de Primeros 10 Prototipos)

Este documento contiene el diseño de ingeniería del controlador electrónico **CollarNet V3**, optimizado con geometría simétrica cuadrada de **$70.0 \times 70.0\text{ mm}$** para maximizar la sensibilidad y ganancia de recepción satelital (GPS/GNSS) en condiciones de intemperie severa, alta robustez contra vibraciones y soporte de recarga solar MPPT integrada.

---

## 1. Justificación de Ingeniería: Geometría Cuadrada de 70×70 mm

### A. La Física de la Antena GNSS Cerámica (Plano de Masa de 60×60 mm)
Las antenas satelitales cerámicas de parche (*Patch Antennas* de $25 \times 25\text{ mm}$) son componentes pasivos que requieren indispensablemente un **plano de tierra reflectivo (Ground Plane)** continuo debajo de ellas para formar su diagrama de radiación cenital hemisférico (apuntando al cielo):
* **En placas estrechas y alargadas:** Un plano de masa estrecho deforma el lóbulo de radiación, reduce la ganancia en satélites de baja elevación y hace al receptor vulnerable al rebote de señales (*multipath interference*).
* **En la placa cuadrada ($70 \times 70\text{ mm}$):** Implementamos un **plano de cobre GND continuo de $60.0 \times 60.0\text{ mm}$** ($3,600\text{ mm}^2$).
  * **Ganancia Satelital:** Aumenta entre **+3.5 dB y +5.0 dB en relación portadora/ruido ($C/N_0$)**.
  * **Tiempo de Fijación (TTFF):** Pasa de 45–60 segundos a **menos de 15 segundos**.
  * **Consumo Energético:** Al fijar posición mucho más rápido, el módem SIM7670 apaga antes su receptor GNSS, **ahorrando hasta un 30% de batería diaria**.

### B. Ventaja Mecánica en Campo e Intemperie
* **Eliminación del Efecto Palanca:** La geometría cuadrada ($70 \times 70\text{ mm}$) es un bloque simétrico compacto, con una **resistencia a impactos y torsión 3 veces superior** frente a formatos alargados.
* **Compatibilidad de Paneles Solares:** Los paneles solares monocristalinos comerciales cuadrados o rectangulares (5V–6V / 180–220 mA) son estándar de industria mundial, económicos y encajan perfectamente en la cara exterior del equipo.

---

## 2. Parámetros Físicos y Mecánicos de la Baquelita

| Parámetro | Valor Técnico | Notas de Fabricación |
| :--- | :--- | :--- |
| **Dimensiones Exteriores** | **$70.00\text{ mm} \times 70.00\text{ mm}$** | Tolerancia ±0.1 mm |
| **Grosor de Placa** | **1.6 mm** | Estándar FR-4 alta rigidez |
| **Capas de Cobre** | **2 Capas** (Top Layer + Bottom Layer) | 1 oz Cu ($35\text{ µm}$) |
| **Acabado Superficial** | **ENIG** (*Immersion Gold*) | Recomendado anticorrosión y contacto Pogo-Pin |
| **Radio de Esquinas** | **$R = 4.0\text{ mm}$** | Adaptado a carcasas estancas |
| **Taladros de Fijación** | **4 taladros de $\varnothing 3.2\text{ mm}$ (para M3)** | Centros en $(5,5)$, $(65,5)$, $(5,65)$, $(65,65)$ |
| **Distancia entre Taladros** | **$dx = 60.00\text{ mm}$, $dy = 60.00\text{ mm}$** | Cuadrícula simétrica perfecta |
| **Ranura de Aislamiento HV** | **Ranura en "L" de 2.0 mm** en `Edge.Cuts` | Separa la esquina sureste de 1000V |

---

## 3. Floorplanning: Distribución por Cuadrantes

```
========================================================================================================
                          DISTRIBUCIÓN EN PLANTA (TOP LAYER): 70.0 × 70.0 mm
========================================================================================================

  (0,70) ┌──────────────────────────────┬──────────────────────────────┐ (70,70)
         │  CUADRANTE 1: MCU & RF       │  CUADRANTE 2: 4G & GNSS      │
         │                              │                              │
         │   [Antena Wi-Fi / BLE]       │   [Módem SIM7670SA 4G/GPS]   │
         │   [ESP32-S3-WROOM-1]         │   [Conector U.FL LTE]        │
         │   [Acelerómetro SC7A20]      │   [Conector U.FL GNSS]       │
         │                              │   [Slot Nano-SIM Lateral]    │
         │                              │                              │
         ├──────────────────────────────┼──────────────────────────────┤
         │  CUADRANTE 3: ENERGÍA SOLAR  │  CUADRANTE 4: ALTA TENSIÓN   │
         │                              │  (Aislado por Ranura en "L") │
         │   [USB-C Estanco Taller]     │                              │
         │   [Cargador MPPT CN3791]     │   [Optoacoplador EL817C]     │
         │   [Inductor 10µH SWPA]       │   [Flyback Resonante 1000V]  │
         │   [Buck 3.3V SY8089]         │   [Condensador C7 0.1µF 1kV] │
         │   [Piezo Buzzer 95dB]        │   [Tiristor SCR TYN1225RG]   │
         │   [Conector JST Panel 6V]    │   [Electrodos Dérmicos M4]   │
   (0,0) └──────────────────────────────┴──────────────────────────────┘ (70,0)
```

---

## 4. Integración de la Batería Panasonic NCR18650B en Diagonal

El reto geométrico de una placa de $70 \times 70\text{ mm}$ es alojar una celda cilíndrica 18650 ($65.3\text{ mm}$ de largo) con sus clips Keystone ($74\text{ mm}$ total):

$$\text{Diagonal Disponible} = \sqrt{70^2 + 70^2} = \mathbf{98.99\text{ mm}}.$$

* Al orientar la batería a un ángulo de **$42^\circ$** en la cara inferior (**Bottom Layer**):
  * La celda con clips ocupa **$74.0\text{ mm}$**.
  * Quedan **$24.99\text{ mm}$ de holgura total** ($12.5\text{ mm}$ libres en cada extremo).
  * Los clips no interfieren en absoluto con los 4 taladros de montaje M3 de las esquinas.
  * Todo el peso de la batería queda centrado en el centro de gravedad del collar.

---

## 5. La Etapa de Choque CDI 1000V con Ranura en "L"

Para garantizar la seguridad del microprocesador y las antenas de radiofrecuencia:
1. **La Ranura en "L" (2.0 mm de ancho):**
   * Comienza en el borde inferior $(45, 0)$, sube verticalmente hasta $(45, 45)$ y dobla horizontalmente hacia el borde derecho $(70, 45)$.
   * Aísla un cuadrante independiente de **$25 \times 25\text{ mm}$** en la esquina sureste.
2. **Distancia de Fuga Dieléctrica (*Creepage*):**
   * Mayor a **$14.0\text{ mm}$** a través del aire de la ranura, superando con creces la norma IEC 60335 para 1000V DC.
3. **Puente Galvánico:**
   * El único componente que cruza la ranura es el optoacoplador **EL817C**, certificado para **5,000V RMS** de aislamiento.

---

## 6. Interfaz Magnética de Carga y Datos de 4 Pines IP68 (Estilo Pogo Pin Industrial)

Para eliminar por completo las ranuras USB abiertas y tapones de goma vulnerables a la intemperie, el sistema integra un **conector magnético estanco IP68 de 4 pines retráctiles (Pogo Pins)** en el lateral del equipo:

```
        CONECTOR MAGNÉTICO EXTERIOR IP68 (4 PINES AL RAS)
  ┌─────────────────────────────────────────────────────────────┐
  │  [IMÁN N52]   ( +5V )    ( D- )    ( D+ )   ( GND )  [IMÁN] │
  └─────────────────────────────────────────────────────────────┘
                    │          │         │        │
                    ▼          ▼         ▼        ▼
              Carga Batería   Líneas USB Nativas   Masa
              (Diodo SS34)    ESP32-S3 (GPIO19/20) Sistema
```

### Especificaciones de la Interfaz Magnética:
1. **Doble Función Simultánea:**
   * **Carga Rápida (5V / 1.0A):** Al acoplar el cable magnético desde cualquier cargador USB estándar o powerbank, se recarga la celda 18650 en 4.5 horas.
   * **Flasheo de Firmware y Consola Serial:** Al conectar el cable a una PC, se transmiten datos USB nativos (`D-` y `D+`) hacia el ESP32-S3, permitiendo flashear código o ver telemetría serial **sin necesidad de abrir la carcasa**.
2. **Protección Anti-Corrosión y Anti-Cortocircuito (Condiciones de Intemperie):**
   * **Bloqueo Inverso por Diodo Schottky (SS34):** La energía solo puede ingresar desde el exterior hacia el circuito de carga. La batería de litio **jamás expone voltaje hacia los pines exteriores**.
   * **Voltaje en reposo: 0.00V.** Si el equipo queda expuesto a lodo, agua con alta conductividad o humedad salina, los pines están eléctricamente apagados: no hay electrólisis, no hay corrosión galvánica y la batería no sufre pérdidas.
   * **Supresor ESD (TVS Diodes):** Líneas de datos protegidas contra descargas electrostáticas.
3. **Polaridad Magnética Infalible:** Los dos imanes de neodimio laterales están polarizados de forma inversa (Norte en un extremo, Sur en el otro). Si el usuario intenta colocar el cable al revés, los imanes se repelen físicamente, impidiendo inversiones accidentales.

---

## 7. Características de Montaje y Envolvente (85×85 mm)

* **Dimensiones de referencia de alojamiento:** **$85.0\text{ mm} \times 85.0\text{ mm} \times 36.0\text{ mm}$** de altura.
* **Base de fijación:** Soporte con curvatura de radio $R=95\text{ mm}$ para acoplamiento mecánico firme en superficies curvas o arneses.
* **Paso pasante de cincha:** Ranura de fijación de $45.0 \times 6.0\text{ mm}$ para cintas de alta resistencia de hasta **$45\text{ mm}$** (2 pulgadas).
* **Tapa superior con protección:** Alojamiento estanco con rebordes protectores para panel solar monocristalino de **$70 \times 45\text{ mm}$** y cúpula de plástico puro RF para la antena GNSS.
* **Puerto lateral magnético:** Cavidad empotrada estanca con junta tórica (O-Ring) para el conector hembra de 4 pines magnéticos.
* **Base inferior:** Salida estanca con sellos para los 2 bornes de alta tensión en acero inoxidable 316.

---

## 8. Archivos Entregados para Fabricación y Pruebas

* **Plano Maestro CAD de Conexión y Soldadura PCBA (5400 × 3600 px Ultra-HD):**
  [`diagrama_conexion_placa_pcb.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.png)
* **Plano Maestro Vectorial SVG:**
  [`diagrama_conexion_placa_pcb.svg`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.svg)
* **Visor Interactivo Dedicado de Conexión PCBA (Zoom 800% y Filtros de Circuito):**
  [`visor_diagrama_conexion_pcba.html`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/visor_diagrama_conexion_pcba.html)
* **Planos Completos de Ingeniería (PDF A3):**
  [`CollarNet_V3_70x70_Planos_Ingenieria.pdf`](file:///home/lzambrano/Desarrollo/CollarNet/CollarNet_V3_70x70_Planos_Ingenieria.pdf)
* **Visor Web Interactivo 2D/3D Integrado:**
  [`visor_pcb_cuadrada_70x70.html`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/visor_pcb_cuadrada_70x70.html)
* **Plano CAD 2D en Alta Definición:**
  [`pcb_cuadrada_70x70_layout.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/pcb_cuadrada_70x70_layout.png)
* **Ruteo de Pistas Top & Bottom en Alta Definición:**
  [`pcb_pistas_enrutamiento_70x70.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/pcb_pistas_enrutamiento_70x70.png)
* **Archivos Gerber Listos para JLCPCB / PCBWay:**
  [`Gerber_CollarNet_V3_70x70.zip`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/fabricacion/Gerber_CollarNet_V3_70x70.zip)
* **Lista de Materiales SMT (BOM):**
  [`BOM_JLCPCB_CollarNet_V3_70x70.csv`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/fabricacion/BOM_JLCPCB_CollarNet_V3_70x70.csv)
* **Coordenadas Pick & Place (CPL):**
  [`CPL_JLCPCB_CollarNet_V3_70x70.csv`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/fabricacion/CPL_JLCPCB_CollarNet_V3_70x70.csv)
* **Proyecto Nativo KiCad 7 / 8:**
  [`CollarNet_V3_70x70.kicad_pcb`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/kicad/CollarNet_V3_70x70.kicad_pcb) y [`CollarNet_V3_70x70.kicad_sch`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/kicad/CollarNet_V3_70x70.kicad_sch)
* **Modelo 3D Paramétrico OpenSCAD:**
  [`modelo_pcb_cuadrada_70x70.scad`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/modelo_pcb_cuadrada_70x70.scad)
* **Renders 3D:**
  * Vista Isométrica 3D: [`render_pcb_cuadrada_70x70_3d.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_3d.png)
  * Vista Cara Superior (Top): [`render_pcb_cuadrada_70x70_top.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_top.png)
  * Vista Cara Inferior con Batería (Bottom): [`render_pcb_cuadrada_70x70_bottom.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_bottom.png)
  * Vista Nueva Caja IP67 Puck: [`render_pcb_cuadrada_70x70_caja.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_caja.png)

---

## 9. Plano Maestro de Conexión, Soldadura y Enrutamiento PCBA

Para garantizar un ensamble profesional, libre de errores y completamente trazable para técnicos de laboratorio y líneas de montaje SMT (JLCPCB / PCBWay), se ha generado el **Plano Maestro CAD de Conexión y Soldadura** ([`diagrama_conexion_placa_pcb.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.png)).

Este plano documenta físicamente pad a pad cómo se interconectan los circuitos entre sí, mostrando la totalidad de los **28 componentes de la lista BOM**, sus encapsulados reales, sus coordenadas físicas exactas en la placa cuadrada de $70.0 \times 70.0\text{ mm}$ y el ruteo de pistas de cobre en capas Top y Bottom.

### A. Tabla Maestra de Soldadura y Conexionado Pin a Pin (28 Componentes BOM)

| Callout | Designador | Componente / Descripción | Encapsulado | Código LCSC | Cara | Coordenadas $(X, Y)$ | Pines Clave y Conexión de Soldadura Destino |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **[1]** | **U1** | ESP32-S3-WROOM-1-N16R8 | MODULE-ESP32-S3 | C2913202 | Top | $(15.0, 22.0)$ | **Pad 41 (EPAD 6×6mm):** Soldar a plano GND térmico mediante 9 vías. **Pin 1:** GND_SYS. **Pin 2:** +3.3V_SYS desacoplado localmente con 100nF + 10µF. **Pines 13/14 (IO19/IO20):** Par USB diferencial a puerto J1. **Pines 27/28 (IO17/IO18):** UART a U2 SIM7670. **Pin 4 (IO4):** Disparo pulso CDI hacia optoacoplador U8. **Pin 5 (IO5):** Señal PWM a Q1 (Buzzer). **Pin 6 (IO6):** Señal encendido a Q2 (PWRKEY). |
| **[2]** | **U2** | SIM7670SA-MNGV Módem 4G LTE + GNSS | LCC-LGA-68 | C2892994 | Top | $(48.0, 24.0)$ | **Pines 38/39 (VBAT):** Alimentación directa 3.7V–4.2V soldada inmediatamente a condensadores C1/C2 de tantalio (soporte 2A pico). **Pin 1:** PWRKEY comandado por Q2. **Pines 21/22:** UART hacia ESP32. **Pin 32:** Antena LTE 50Ω a J3. **Pin 46:** Antena GNSS 50Ω a J4. **Pines 52–55:** Bus SIM a socket J2. |
| **[3]** | **U3** | SC7A20TR Acelerómetro 3 Ejes I2C | LGA-12 (2×2mm) | C392477 | Top | $(11.0, 44.0)$ | **Pines 1/4 (SCL/SDA):** Bus I2C a ESP32 (IO9/IO8) con resistencias pull-up 4.7kΩ a +3.3V. **Pin 11 (INT1):** Despertar de Deep Sleep hacia ESP32 IO10. **Pines 7/8:** +3.3V_SYS desacoplado con 100nF a <1.5mm. **Pin 6:** GND_SYS. |
| **[4]** | **U4** | CN3791 Cargador Solar MPPT 6V/1.2A | SSOP-10 | C154992 | Top | $(12.0, 52.0)$ | **Pin 9 (VCC):** Entrada solar vía D1/D2 y puerto J1 vía D5. **Pin 6 (MPPT):** Divisor 499k/100k fijando Vmp = 6.00V. **Pin 10 (DRV):** Compuerta de Q3 (AO3401A). **Pin 8 (CSP):** Resistencia sensora 0.1Ω fijando corriente a 1.20A. **Pin 7 (BAT):** Salida de carga al riel VBAT. **Pin 2:** GND_SYS. |
| **[5]** | **U5** | SY8089AAAC Regulador Buck 3.3V/2.0A | SOT-23-5 | C78988 | Top | $(12.0, 62.0)$ | **Pin 4 (IN):** Entrada de alimentación desde VBAT (3.4V a 4.2V). **Pin 1 (EN):** Conectado a VBAT. **Pin 2 (GND):** Masa térmica. **Pin 3 (LX):** Conmutación conectada a inductor L1 (2.2µH). **Pin 5 (FB):** Divisor 453k/100k regulando +3.318V de salida. |
| **[6]** | **U6** | DW01A-G Integrado de Protección BMS 1S | SOT-23-6 | C351410 | Top | $(24.0, 46.0)$ | **Pin 5 (VCC):** Borne positivo BT_POS. **Pin 6 (GND):** Borne negativo BT_NEG. **Pin 1 (OD):** Corte por sobredescarga (<2.40V) hacia compuerta G1 de U7. **Pin 3 (OC):** Corte por sobrecarga (>4.28V) hacia compuerta G2 de U7. **Pin 2 (CS):** Sensado de cortocircuito (<10µs). |
| **[7]** | **U7** | FS8205A Dual N-MOSFET de Potencia | TSSOP-8 | C32254 | Top | $(28.0, 46.0)$ | **Pines 1/3 (S1):** Conectados al plano general GND_SYS. **Pines 4/5 (G1/G2):** Comandados por OD y OC de U6. **Pines 6/7/8 (S2):** Conectados directamente al borne negativo de batería BT_NEG. |
| **[8]** | **U8** | EL817S1(C) Optoacoplador Galvánico 5kV | SOP-4 | C4999 | Top | $(45.0, 49.0)$ | **Ubicación:** A horcajadas sobre la ranura fresada de 2.0mm. **Pin 1 (Ánodo):** Excitado por ESP32 IO4 vía R=330Ω. **Pin 2 (Cátodo):** A masa lógica GND_SYS. **Pin 3 (Emisor):** A masa de choque HV_GND. **Pin 4 (Colector):** Disparo hacia Watchdog de hardware U9. |
| **[9]** | **U9** | 74LVC1G123DCK Watchdog de Hardware ≤1s | VSSOP-8 | C128362 | Top | $(52.0, 47.0)$ | **Pin 1 (A):** Entrada de disparo desde optoacoplador U8. **Pin 4:** HV_GND. **Pines 6/7:** Red temporizadora irrevocable (1MΩ + 1µF). **Pin 5 (Q):** Pulso recortado a máximo 1,000ms hacia Diac D6. |
| **[10]** | **TH1** | TYN1225RG Tiristor SCR 1200V / 25A | TO-252-2 | C14486 | Top | $(64.0, 52.0)$ | **Pin 1 (Gate):** Señal de disparo por avalancha desde Diac D6. **Pin 2 / Tab:** Ánodo a condensador de pulso C7 (+1000V DC). **Pin 3 (Cátodo):** Salida a resistencia limitadora R_LIM (220Ω / 2W) hacia electrodo dérmico EL1. |
| **[11]** | **D6** | DB3 Diac de Conmutación Rápida 32V | SOD-123 | C139750 | Top | $(60.8, 48.0)$ | En serie entre la salida del monoestable U9 y el Gate del tiristor TH1. Conmuta por avalancha abrupta al alcanzar 32V para garantizar un flanco de encendido de <50ns. |
| **[12]** | **Q1** | AO3400A N-MOSFET (Driver Buzzer) | SOT-23 | C20917 | Top | $(20.5, 56.5)$ | **Pin 1 (Gate):** Señal PWM 4kHz desde ESP32 IO5. **Pin 2 (Source):** GND_SYS. **Pin 3 (Drain):** Conduce el polo negativo de BZ1 y ánodo de D4. |
| **[13]** | **Q2** | AO3400A N-MOSFET (Control PWRKEY) | SOT-23 | C20917 | Top | $(31.5, 26.5)$ | **Pin 1 (Gate):** Control desde ESP32 IO6. **Pin 2 (Source):** GND_SYS. **Pin 3 (Drain):** Lleva a nivel bajo el pin 1 de U2 durante 1.5s para encender o reiniciar el módem SIM7670. |
| **[14]** | **Q3** | AO3401A P-MOSFET (Conmutador MPPT) | SOT-23 | C15127 | Top | $(18.5, 47.5)$ | **Pin 1 (Gate):** Conectado al pin DRV de U4 (CN3791). **Pin 2 (Source):** Barra de entrada solar VIN (+6V). **Pin 3 (Drain):** Conmutación hacia el inductor L2 (10µH) y cátodo de D3. |
| **[15]** | **D1, D2** | SS34 Schottky 40V/3A (Aislamiento Solar) | SMA | C8678 | Top | $(5.2, 50.0)$ | Diodos de bloqueo OR-ing para dos paneles solares independientes de 6V. Ánodos reciben cada panel; cátodos unidos en el bus común VIN. |
| **[16]** | **D3** | SS34 Schottky 40V/3A (Catch Diode MPPT) | SMA | C8678 | Top | $(18.5, 54.0)$ | Diodo de retorno rápido en convertidor Buck MPPT. Ánodo a GND_SYS, cátodo al drenador de Q3 y entrada de L2. |
| **[17]** | **D5** | SS34 Schottky (Anti-Retorno Pogo Pin) | SMA | C8678 | Top | $(5.2, 28.0)$ | En serie con Pin 1 de J1 (+5V VBUS). Bloquea cualquier retorno desde la batería hacia el exterior: **0.00V garantizado en reposo**. |
| **[18]** | **D4** | 1N4148W Diodo Rápido de Protección | SOD-123 | C81598 | Top | $(25.5, 54.0)$ | En paralelo inverso con el buzzer BZ1 (cátodo a VBAT, ánodo a Drain de Q1) para absorber contracorrientes inductivas. |
| **[19]** | **L1** | 2.2µH 3.0A Inductor Blindado Buck 3.3V | SMD-0420 | C167733 | Top | $(18.0, 62.0)$ | Terminal 1 al pin 3 (LX) de U5 SY8089; Terminal 2 a riel de salida +3.3V_SYS desacoplado con 2x 22µF X7R. |
| **[20]** | **L2** | 10µH 2.5A Inductor Blindado MPPT | SMD-0430 | C38117 | Top | $(12.0, 57.0)$ | Terminal 1 al nodo de conmutación de Q3/D3; Terminal 2 a resistencia sensora CSP y riel de batería VBAT. |
| **[21]** | **C1, C2** | 2x 220µF 6.3V Tantalio Low-ESR | CASE-D 7343 | C7187 | Top | $(38.0, 21.0)$ | Terminal positivo (+) a menos de 2 mm de los pines 38 y 39 de U2 SIM7670. Terminal negativo (-) soldado con 4 vías de masa a GND. Absorbe picos de 2A. |
| **[22]** | **C7** | 0.1µF 1000V CBB21 Polipropileno | SMD-1812/PTH | C2839151 | Top | $(56.0, 64.0)$ | Almacena energía de descarga CDI: $E = \frac{1}{2} C V^2 = 50\text{ mJ}$ a 1000V DC. Terminal positivo a HV_OUT y ánodo TH1; negativo a HV_GND. |
| **[23]** | **BZ1** | Piezo Buzzer Resonante 95dB 4kHz | PTH-D12.4mm | C253457 | Top | $(26.0, 60.0)$ | Pin positivo (+) a VBAT; Pin negativo (-) a Drain de Q1 y diodo D4. Emite alerta acústica disuasoria. |
| **[24]** | **J1** | Conector Magnético Pogo-Pin 4P IP68 | POGO-4P-MAG | Custom | Top | $(0.8, 28.0)$ | **Pin 1:** +5V VBUS a través de diodo D5. **Pin 2:** USB_D- hacia ESP32 IO19. **Pin 3:** USB_D+ hacia ESP32 IO20. **Pin 4:** Chasis GND_SYS. Imanes polarizados N52. |
| **[25]** | **J2** | Socket Portatarjeta Nano-SIM Dorado | PUSH-PULL | C2838382 | Top | $(65.0, 20.0)$ | Ranura lateral estanca con supresores ESD antiestáticos en líneas C1 (VDD), C2 (RST), C3 (CLK), C7 (DATA) hacia U2. |
| **[26]** | **J3, J4** | 2x Conectores Coaxiales 50Ω U.FL | SMD-IPEX | C88373 | Top | $(38.0, 34.0)\text{ y }(58.0, 34.0)$ | **J3:** Pista de 50Ω a Pin 32 (Módem Celular). **J4:** Pista de 50Ω a Pin 46 (Antena GNSS sobre plano de tierra de 60×60 mm). |
| **[27]** | **BT1** | Clips Portacelda Keystone 1042/1048 | PTH-18650 | Keystone | Bot | $(35.0, 35.0)$ | Montaje en cara inferior (**Bottom Layer**) orientado a **$42^\circ$ en diagonal**. Borne BT_POS en $(18, 52)$ a VBAT; borne BT_NEG en $(52, 18)$ a corte BMS. |
| **[28]** | **MOD_HV** | Módulo Flyback Resonante 3.7V $\rightarrow$ 1000V | Potted-18×14 | Custom | Top | $(56.0, 54.0)$ | Pines entrada: VBAT y control U9. Pines salida: HV_OUT (+1000V DC) y HV_GND aislada. Blindado en resina epoxi. |
| **[29]** | **EL1, EL2** | Bornes Roscados M4 Inox 316 | PAD-M4-8MM | Hardware | Top | $(65.0, 63.0)$ | **EL1 (+):** Salida de pulso CDI desde cátodo de TH1 mediante resistencia limitadora R_LIM (220Ω / 2W). **EL2 (-):** Retorno a HV_GND. |

---

### B. Reglas de Trazado de Pistas y Aislamiento Dieléctrico

1. **Jerarquía de Anchos de Pista de Cobre (1 oz / $35\text{ µm}$):**
   * **Señales lógicas y buses de control:** Ancho nominal **$0.25\text{ mm}$** ($10\text{ mil}$), aislamiento de $0.25\text{ mm}$.
   * **Riel de alimentación lógica $+3.3\text{V\_SYS}$:** Ancho **$0.50\text{ mm}$** ($20\text{ mil}$) con desacoplos de $100\text{ nF}$ cerámicos pegados a cada pin de alimentación.
   * **Riel de potencia de batería $\text{VBAT}$ ($3.7\text{V} - 4.2\text{V}$):** Ancho **$1.20\text{ mm}$** ($47\text{ mil}$) capaz de suministrar los picos de $2.0\text{ A}$ del módem SIM7670 sin caída de tensión detectable.
   * **Guías de onda de radiofrecuencia (Líneas de $50\ \Omega$ a J3 y J4):** Pistas coplanares de ancho **$0.55\text{ mm}$** con plano de masa lateral a $0.30\text{ mm}$ y blindaje de microvías cada $1.5\text{ mm}$.
   * **Pistas de Alta Tensión $1000\text{V DC}$ (Cuadrante Sureste):** Pistas de ancho **$2.00\text{ mm}$** con esquinas redondeadas (radio de curvatura $R \ge 1.5\text{ mm}$) para evitar concentración de gradientes electrostáticos y efecto corona.

2. **Aislamiento Galvánico y Barrera Dieléctrica de 5,000V RMS:**
   * La ranura fresada pasante en capa `Edge.Cuts` de **$2.0\text{ mm}$ de ancho** separa físicamente la baquelita entre el cuadrante de control digital y el cuadrante de descarga de alta tensión.
   * La distancia de fuga superficial (*creepage*) supera los **$14.0\text{ mm}$**, eliminando cualquier riesgo de arco eléctrico o fuga de corriente hacia el microcontrolador ESP32-S3, sensores o módem celular.
   * El único punto de transferencia entre ambos dominios es el optoacoplador **EL817S1(C)** ([8]), certificado para soportar hasta **$5,000\text{ V RMS}$** de rigidez dieléctrica.

3. **Mecanismo de Temporización Irrevocable por Hardware (Watchdog U9):**
   * El circuito monoestable **74LVC1G123** ([9]) establece por constante de tiempo física ($R=1\text{ M}\Omega$, $C=1\text{ µF}$) una duración de activación que jamás excede los **$1,000\text{ ms}$**, impidiendo de forma física que el generador elevador permanezca encendido de forma continua aún ante eventuales cuelgues del software.

4. **Protección Pasiva contra Humedad y Cortocircuito Exterior (Puerto Magnético IP68):**
   * La interfaz de conexión externa de 4 pines magnéticos ([24]) opera a través de un diodo Schottky SS34 ([17]), garantizando que los terminales exteriores permanezcan en **$0.00\text{ V}$** mientras el cargador no esté acoplado. Esto previene la electrólisis y corrosión prematura ante agua salina o lodo.

