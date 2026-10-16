# Diseño Esquemático: Placa de Potencia, Audio y Descarga (Cápsula Derecha)
## Factor de Forma: 32.0 × 26.0 mm (2 Capas FR4, 1.6 mm)

Esta placa gestiona la energía primaria desde la celda Li-Ion 21700, la bocina acústica piezoeléctrica de alta presión sonora y el circuito generador de pulso disuasorio electrostático para la cerca virtual ganadera.

---

## 1. Diagrama de Bloques General

```
  [Celda Li-Ion 21700] ──► [BMS / PCM 1S (DW01A + FS8205)] ──► [Línea VBAT] ──► Hacia Arnés Dorsal (Hilo 1)
                                                                    │
           ┌────────────────────────────────────────────────────────┼──────────────────────────────────┐
           │                                                        │                                  │
           ▼                                                        ▼                                  ▼
[Arnés: BUZZER_PWM (Hilo 3)]                               [Cargador/Batería]            [Arnés: IMPULSE_TRIG (Hilo 4)]
           │                                                        │                                  │
           ▼                                                        │                                  ▼
  [Driver MOSFET AO3400A]                                           │                       [Optoacoplador EL817C (5kV)]
           │                                                        │                                  │
           ▼                                                        │                                  ▼
[Buzzer Piezo 95dB 4000Hz]                                          │                     [Watchdog Temporizador 1000ms]
                                                                    │                                  │
                                                                    │                                  ▼
                                                                    └──────────────────────► [Elevador Flyback DC-HV]
                                                                                                       │
                                                                                                       ▼
                                                                                           [Condensador CDI 0.1µF 1kV]
                                                                                                       │
                                                                                                       ▼
                                                                                           [Tiristor SCR MCR100-6]
                                                                                                       │
                                                                                                       ▼
                                                                                           [Resistencia 220Ω / 2W]
                                                                                                       │
                                                                                                       ▼
                                                                                           [2x Electrodos Inox M4]
                                                                                             (Contacto Cuello Res)
```

---

## 2. Bloque 1: Protección de Batería 1S (PCM / BMS)

* **Controlador de Protección**: **DW01A** (SOT-23-6).
  - Tensión de corte por sobrecarga: \(4.28\text{ V} \pm 0.05\text{ V}\).
  - Tensión de corte por sobredescarga: \(2.40\text{ V} \pm 0.10\text{ V}\).
* **Interruptor MOSFET Dual**: **FS8205A** (TSSOP-8, \(R_{DS(on)} < 25\text{ m}\Omega\)).
* **Fusible de Entrada**: Polyswitch reseteable PPTC SMD de 3.0A para protección contra cortocircuito accidental en el arnés dorsal.

---

## 3. Bloque 2: Driver Acústico de Alta Potencia (Buzzer 95 dB)

* **Zumbador**: Piezoeléctrico pasivo de Ø12.4 × 8.0 mm optimizado para 4000 Hz.
* **Transistor Conmutador**: MOSFET N-Channel **AO3400A** (30V / 5.7A, \(R_{DS(on)} = 30\text{ m}\Omega\)).
* **Diodo de Protección (Flyback)**: **1N4148W** o **SS14** en antiparalelo con el buzzer para suprimir el pico inductivo inverso del transductor piezoeléctrico.
* **Resistencia Gate-to-Source**: 100 kΩ a GND para asegurar silencio absoluto si la señal del arnés está flotante o desconectada.
* **Alimentación**: Se alimenta directamente desde `VBAT` (3.7V - 4.2V), lo que permite emitir 95 dB a 10 cm con modulación PWM a 4000 Hz.

---

## 4. Bloque 3: Generador de Descarga Electrostática Disuasoria (Cerca Virtual)

### A. Aislamiento Galvánico
* **Optoacoplador**: **EL817C** (Everlight, encapsulado SMD SOP-4).
* La señal `IMPULSE_TRIG` que viene del ESP32-S3 a través del arnés solo enciende el LED infrarrojo interno del optoacoplador (consumo: 5 mA a 3.3V).
* **Tierra de Alta Tensión Separada**: La tierra del pulso de descarga (`HV_GND`) está aislada galvánicamente de la tierra de señal lógica (`GND_SYS`).

### B. Seguro por Hardware (Watchdog Monoestable de 1 Segundo)
* Un circuito monoestable **74LVC1G123** o **NE555** con constante de tiempo \(R = 1\text{ M}\Omega\), \(C = 1\mu\text{F}\) (\(\tau = 1.1 \times R \times C \approx 1.1\text{ segundos}\)):
  - Tan pronto llega el flanco de subida de `IMPULSE_TRIG`, se activa el oscilador elevador.
  - Al cumplirse **1000 ms**, la salida del monoestable cae a nivel bajo de forma irrevocable hasta que la señal del arnés pase por cero y vuelva a subir.
  - **Resultado**: Aunque el microcontrolador se cuelgue con la señal en nivel alto perpetuo, el hardware corta la corriente al transformador tras 1 segundo.

### C. Generación y Descarga del Pulso Capacitivo (CDI)
1. **Elevador de Tensión**: Un oscilador Hartley/Flyback con mini bobina de ferrita eleva de 3.7V a aproximadamente **800V - 1000V DC**.
2. **Almacenamiento Capacitivo**: Se carga un condensador de polipropileno metalizado de alta tensión de **0.1 µF / 1000V** (CBB21 / SMD 1812).
   $$\text{Energía Almacenada: } E = \frac{1}{2} C V^2 = \frac{1}{2} \times (0.1 \times 10^{-6}\text{ F}) \times (1000\text{ V})^2 = 0.05\text{ Joules}$$
3. **Disparo al Cuello**: El tiristor (SCR) **MCR100-6** (600V - 800V / 0.8A) recibe el pulso de disparo en compuerta y descarga instantáneamente la energía del condensador a través de:
   - Resistencia limitadora de corriente de potencia: **220 Ω / 2W** (anti-quemaduras).
   - Resistencia de sangrado de alta impedancia: **10 MΩ / 1kV** para descargar residuales al apagarse.
4. **Electrodos de Cuello**: 2 pernos de acero inoxidable 316 calidad marina M4, con extremos semiesféricos pulidos, que sobresalen 8 mm por la base inferior sellados con junta tórica (O-ring) de goma EPDM.
