# Arquitectura General y Distribución Física del Hardware
## Collar Inteligente Ganadero CowAI / CollarNet V2 (Estilo Halter)

Este documento describe la arquitectura modular de hardware del collar inteligente, diseñado para optimizar costos, maximizar la eficiencia energética con recarga solar continua y aislar completamente la alta tensión del pulso disuasorio de los circuitos de radiofrecuencia y computación.

---

## 1. Justificación de la Distribución en 2 Cápsulas

El collar se basa en una arquitectura anatómica dorsal inspirada en los collares comerciales de pastoreo virtual de referencia en la industria (*Halter*, *Nofence*):

```
                                [LOMO SUPERIOR DE LA RES]
                                     ▲             ▲
                             [Panel Solar Izq] [Panel Solar Der]
                                     │             │
                          ┌──────────┴─────────────┴──────────┐
                          │    Puente Dorsal Anatómico (TPU)  │
                          │      (Canal Pasacables Ø8mm)      │
                          └──────────┬─────────────┬──────────┘
                                     │             │
                          ┌──────────▼────────┐   ┌▼──────────────────┐
                          │ CÁPSULA IZQUIERDA │   │  CÁPSULA DERECHA  │
                          │   (Lógica y RF)   │   │(Potencia y Estímulo│
                          ├───────────────────┤   ├───────────────────┤
                          │ • ESP32-S3        │   │ • Pack Batería    │
                          │ • Módem SIM7670   │   │   21700 (5000mAh) │
                          │ • Antena GNSS     │   │ • Zumbador 95dB   │
                          │   (al cielo)      │   │ • Generador Pulso │
                          │ • Antena FPC LTE  │   │   Descarga (CDI)  │
                          │ • Acelerómetro    │   │ • 2x Electrodos   │
                          │ • Cargador MPPT   │   │   Inox de Cuello  │
                          │ • Puerto USB-C    │   │ • Watchdog 1s     │
                          │ • Slot Nano-SIM   │   │   Hardware        │
                          └───────────────────┘   └───────────────────┘
```

### Ventajas de Ingeniería:
1. **Aislamiento Electromagnético (EMC / EMI)**: Los pulsos de alta tensión (800V - 1200V) generan transitorios inductivos severos. Al estar confinados en la **Cápsula Derecha**, nunca interfieren con el sintonizador de radio del módem 4G LTE ni con el receptor satelital GNSS de la Cápsula Izquierda.
2. **Seguridad Total en el Puente Dorsal**: Solo 5 conductores de señal de muy baja tensión (< 5V) cruzan la parte superior del cuello del animal. La alta tensión se genera localmente en la cápsula derecha y baja directo a la piel del cuello.
3. **Distribución Simétrica de Peso**: La batería 21700 (~70 g) en la derecha equilibra perfectamente el peso de la electrónica de radiofrecuencia y antenas en la izquierda (~65 g).

---

## 2. Arnés de Interconexión del Puente Dorsal

El puente de TPU 95A cuenta con un canal interno estanco de Ø8.0 mm. Los cables que lo atraviesan forman un mazo flexible blindado de 5 conductores (calibre AWG 24 para alimentación y AWG 26 para control):

| Hilo | Etiqueta de Red | Tensión Nominal | Descripción |
| :---: | :--- | :---: | :--- |
| **1** | `VBAT_PWR` | 3.4V – 4.2V | Alimentación positiva desde el polo de la batería Li-Ion 21700 |
| **2** | `GND_SYS` | 0.0V | Retorno común de masa del sistema |
| **3** | `BUZZER_PWM` | 3.3V (0–4000 Hz) | Salida LEDC desde ESP32-S3 GPIO 5 hacia la puerta del MOSFET de audio |
| **4** | `IMPULSE_TRIG`| 3.3V Lógico | Disparo de pulso de descarga desde ESP32-S3 GPIO 4 hacia el optoacoplador |
| **5** | `SOLAR_PANEL_R`| 5.5V – 6.5V | Retorno del panel solar derecho hacia el cargador MPPT central |

---

## 3. Especificaciones del Estímulo Eléctrico (Cerca Virtual)

* **Topología**: Descarga por Condensador de Impulso (CDI - *Capacitive Discharge Impulse*).
* **Tensión Pico**: 800V - 1000V en circuito abierto.
* **Energía por Pulso**: 0.05 a 0.10 Joules. Es una sacudida refleja e incómoda en el cuello, pero inofensiva para la piel y el sistema cardíaco del bovino.
* **Seguro por Hardware**: Temporizador monoestable (RC / 555) que corta la oscilación del transformador tras **1000 milisegundos continuos**, garantizando que el animal nunca quede sometido a estímulo prolongado aun si el microcontrolador llegara a bloquearse.
