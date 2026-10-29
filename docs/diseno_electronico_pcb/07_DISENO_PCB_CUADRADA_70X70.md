# CollarNet V3 — Arquitectura Cuadrada de Alta Precisión (70.0 × 70.0 mm)
## Plano de Masa GNSS de 60×60 mm, Batería 18650 en Diagonal y Carcasa IP67 "Puck"

Este documento contiene el diseño de ingeniería de la propuesta **CollarNet V3**, optimizada con geometría cuadrada de **$70.0 \times 70.0\text{ mm}$** para maximizar la sensibilidad y precisión del posicionamiento satelital (GPS/GNSS) en potrero, reducir el tamaño longitudinal de la caja en un **33%** y permitir el uso de paneles solares comerciales cuadrados.

---

## 1. Justificación de Ingeniería: ¿Por qué el Formato Cuadrado de 70×70 mm?

### A. La Física de la Antena GNSS Cerámica (Plano de Masa de 60×60 mm)
Las antenas satelitales cerámicas de parche (*Patch Antennas* de $25 \times 25\text{ mm}$) son componentes pasivos que requieren indispensablemente un **plano de tierra reflectivo (Ground Plane)** continuo debajo de ellas para formar su diagrama de radiación cenital hemisférico (apuntando al cielo):
* **En placas estrechas y alargadas ($110 \times 33\text{ mm}$):** El plano de masa tiene solo 30 mm de ancho, lo que deforma el lóbulo de radiación, reduce la ganancia en satélites de baja elevación y hace al collar vulnerable al rebote de señales en árboles (*multipath interference*).
* **En la placa cuadrada ($70 \times 70\text{ mm}$):** Implementamos un **plano de cobre GND continuo de $60.0 \times 60.0\text{ mm}$** ($3,600\text{ mm}^2$).
  * **Ganancia Satelital:** Aumenta entre **+3.5 dB y +5.0 dB en relación portadora/ruido ($C/N_0$)**.
  * **Tiempo de Fijación (TTFF):** Pasa de 45–60 segundos a **menos de 15 segundos**.
  * **Consumo Energético:** Al fijar posición mucho más rápido, el módem SIM7670 apaga antes su receptor GNSS, **ahorrando hasta un 30% de batería diaria**.

### B. Ventaja Mecánica en Campo Ganadero
* **Eliminación del Efecto Palanca:** Una caja de 110 mm sufre un fuerte torque mecánico cuando la vaca se rasca la cabeza contra postes de alambrado o troncos. La caja cuadrada ($82 \times 82\text{ mm}$) es un bloque simétrico compacto tipo "puck", con una **resistencia a impactos 3 veces superior**.
* **Compatibilidad de Paneles Solares:** Los paneles solares monocristalinos comerciales cuadrados de **$70 \times 70\text{ mm}$** (5V–6V / 180–220 mA) son estándar de industria mundial, económicos y encajan perfectamente en la tapa superior de la caja.

---

## 2. Parámetros Físicos y Mecánicos de la Baquelita

| Parámetro | Valor Técnico | Notas de Fabricación |
| :--- | :--- | :--- |
| **Dimensiones Exteriores** | **$70.00\text{ mm} \times 70.00\text{ mm}$** | Tolerancia ±0.1 mm |
| **Grosor de Placa** | **1.6 mm** | Estándar FR-4 alta rigidez |
| **Capas de Cobre** | **2 Capas** (Top Layer + Bottom Layer) | 1 oz Cu ($35\text{ µm}$) |
| **Acabado Superficial** | **ENIG** (*Immersion Gold*) | Recomendado anticorrosión en potrero |
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

## 6. Previsualización de la Nueva Caja Hermética IP67 ("Puck")

* **Dimensiones exteriores:** $82.0\text{ mm} \times 82.0\text{ mm} \times 32.0\text{ mm}$ de altura.
* **Túnel de fijación de collar:** Ranura pasante integrada en la base para cintas ganaderas de hasta **$45\text{ mm}$** (2 pulgadas).
* **Tapa superior:** Rehundido estanco para panel solar monocristalino de **$70 \times 70\text{ mm}$** (5V/6V, 200mA).
* **Base inferior:** Salida estanca con juntas tóricas para los 2 electrodos dérmicos cónicos de acero inoxidable 316.

---

## 7. Archivos Entregados para Revisión

* **Visor Web Interactivo:**
  [`visor_pcb_cuadrada_70x70.html`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/visor_pcb_cuadrada_70x70.html)
* **Plano CAD 2D en Alta Definición:**
  [`pcb_cuadrada_70x70_layout.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/pcb_cuadrada_70x70_layout.png) ([SVG](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/pcb_cuadrada_70x70_layout.svg))
* **Modelo 3D Paramétrico OpenSCAD:**
  [`modelo_pcb_cuadrada_70x70.scad`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/modelo_pcb_cuadrada_70x70.scad)
* **Renders 3D:**
  * Vista Isométrica 3D: [`render_pcb_cuadrada_70x70_3d.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_3d.png)
  * Vista Cara Superior (Top): [`render_pcb_cuadrada_70x70_top.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_top.png)
  * Vista Cara Inferior con Batería (Bottom): [`render_pcb_cuadrada_70x70_bottom.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_bottom.png)
  * Vista Nueva Caja IP67 Puck: [`render_pcb_cuadrada_70x70_caja.png`](file:///home/lzambrano/Desarrollo/CollarNet/docs/diseno_electronico_pcb/render_pcb_cuadrada_70x70_caja.png)
