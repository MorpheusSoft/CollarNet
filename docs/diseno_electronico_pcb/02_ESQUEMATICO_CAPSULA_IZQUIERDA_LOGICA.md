# Diseño Esquemático: Placa Lógica y Telecomunicaciones (Cápsula Izquierda)
## Factor de Forma: 60.0 × 32.0 mm (2 Capas FR4, 1.6 mm)

Esta placa alberga toda la inteligencia computacional, el enlace de telemetría celular 4G LTE, el receptor satelital GNSS, la gestión de recarga solar y los sensores inerciales.

---

## 1. Diagrama de Bloques y Conexiones Principales

```
 [VBUS USB-C] ──┐
                ├──► [Selector Diodo Schottky] ──► [Cargador MPPT CN3791] ◄── [Paneles Solares (Izq + Der)]
 [VBAT Batería] ┘                                           │
        │                                                   ▼
        │                                           [Línea VBAT 3.7V]
        │                                                   │
        ├──► [Filtro Tantalio 2x 220µF] ────────────────────┼──► [SIM7670SA VBAT (Picos 2A LTE)]
        │                                                   │
        └──► [Regulador Buck DC-DC SY8089 (3.3V / 2A)] ◄────┘
                     │
                     ├──► ESP32-S3-WROOM-1 (3.3V)
                     ├──► Acelerómetro SC7A20 (3.3V)
                     └──► Divisores de tensión ADC
```

---

## 2. Bloque 1: Microcontrolador Espressif ESP32-S3-WROOM-1-N8

### Conexiones de Pines:
| Pin Módulo | Nombre de Red | Conexión / Destino | Descripción |
| :---: | :--- | :--- | :--- |
| **1** | `GND` | Plano de Masa (GND) | Retorno de tierra |
| **2** | `3V3` | Salida Buck SY8089 | Alimentación principal 3.3V (filtrada con 10µF + 100nF) |
| **3** | `EN` | Circuito RC Reset | Resistencia Pull-Up 10k a 3.3V + Condensador 1µF a GND |
| **4** | `IO4` | `IMPULSE_TRIG` | Señal lógica hacia optoacoplador en Cápsula Derecha |
| **5** | `IO5` | `BUZZER_PWM` | Frecuencia de audio LEDC a 4000 Hz hacia Cápsula Derecha |
| **6** | `IO6` | Libre / Testpad | Propósito general / Expansión |
| **7** | `IO7` | Libre / Testpad | Propósito general / Expansión |
| **8** | `IO15` | Libre / Testpad | Propósito general |
| **9** | `IO16` | Libre / Testpad | Propósito general |
| **10** | `IO17` | `MODEM_TXD` | Conectado a RXD del módem SIM7670SA |
| **11** | `IO18` | `MODEM_RXD` | Conectado a TXD del módem SIM7670SA |
| **12** | `IO8` | `I2C_SDA` | Bus I2C datos (Pull-Up 4.7k a 3.3V) para SC7A20 |
| **13** | `IO9` | `I2C_SCL` | Bus I2C reloj (Pull-Up 4.7k a 3.3V) para SC7A20 |
| **14** | `IO1` | `VBAT_SENSE` | Divisor resistivo 100k / 100k a pin ADC para leer batería |
| **15** | `IO2` | `STATUS_LED` | Resistencia 1k a LED SMD Azul (indicador de estado) |
| **16** | `IO3` | `SOLAR_SENSE`| Divisor resistivo 100k / 47k a pin ADC para radiación solar |
| **17** | `IO19` | `USB_D_N` | USB D- nativo hacia conector USB-C (Pin A7/B7) |
| **18** | `IO20` | `USB_D_P` | USB D+ nativo hacia conector USB-C (Pin A6/B6) |
| **19** | `IO21` | `MODEM_PWRKEY`| Control de encendido módem vía transistor NPN |
| **20** | `IO0` | `BOOT_SW` | Botón táctil a GND con Pull-Up interna |

---

## 3. Bloque 2: Módem Celular 4G LTE y GNSS (SIMCom SIM7670SA)

* **Alimentación VBAT**: Se conecta directamente a la línea `VBAT` de la batería (rango admitido: 3.4V a 4.3V).
* **Desacople Crítico**: Dos condensadores de tantalio de baja ESR de **220 µF / 6.3V** en paralelo con cerámicos de **100 nF**, situados a menos de 5 mm de los pines `VBAT` del módulo para absorber picos de corriente de 2A en transmisión LTE.
* **Interfaz SIM**:
  - `SIM_VDD`, `SIM_CLK`, `SIM_DATA`, `SIM_RST` conectados directamente a la ranura Nano-SIM 6P con filtro ESD (diodos TVS ESD9B5.0ST5G).
* **RF & Antenas**:
  - Pin `MAIN_ANT`: Pista de 50 Ohms de impedancia controlada (coplanar waveguide) hacia conector **IPEX/u.FL hembra** para antena FPC 4G LTE adhesiva.
  - Pin `GNSS_ANT`: Pista de 50 Ohms con choque de inducción e inyector de polarización de antena activa hacia conector **IPEX/u.FL hembra** para antena de parche cerámico 25×25 mm.

---

## 4. Bloque 3: Gestión de Carga Solar MPPT (Consonance CN3791)

* **Configuración de Tensión de Panel**: Ajustado para paneles de silicio monocristalino de **6.0V nominales** (como los 2 paneles RY9-414 del collar).
* **Corriente de Carga**: Fijada mediante resistencia sensora \(R_{CS} = 0.1\,\Omega\) para una corriente máxima de:
  $$I_{CHG} = \frac{120\text{ mV}}{R_{CS}} = 1.2\text{ A}$$
* **Diodos de Aislamiento**: Cada panel solar (izquierdo y derecho) se conecta mediante un diodo Schottky **SS34** (40V / 3A, \(V_F < 0.35\text{V}\)), evitando que si una vaca se echa de lado y tapa un panel, este absorba la energía del panel iluminado.

---

## 5. Bloque 4: Regulador Buck Step-Down 3.3V (Silergy SY8089)

* **Topología**: Conversor reductor síncrono a 1.5 MHz en encapsulado SOT-23-5.
* **Tensión de Salida**: 3.3V con divisor resistivo:
  $$V_{OUT} = 0.6\text{ V} \times \left(1 + \frac{R_1}{R_2}\right) = 0.6 \times \left(1 + \frac{453\text{ k}\Omega}{100\text{ k}\Omega}\right) = 3.318\text{ V}$$
* **Inductor de Potencia**: 2.2 µH / 3.0A blindado (Shielded Power Inductor SMD 0420).
* **Capacitancia de Salida**: 2x 22 µF cerámicos X5R 0805 en paralelo.

---

## 6. Bloque 5: Acelerómetro I2C (Silan SC7A20)

* **Reemplazo del MPU-6050**: El sensor SC7A20 es compatible pin a pin y por registros con el LIS3DH.
* **Consumo**: Solo **6 µA** en modo detección de movimiento a 10 Hz (frente a 3800 µA del MPU-6050).
* **Pines I2C**:
  - `SDA` conectado a ESP32 GPIO 8.
  - `SCL` conectado a ESP32 GPIO 9.
  - `INT1` conectado a ESP32 GPIO 10 (permite despertar al ESP32 por interrupción hardware cuando la vaca camina tras el reposo).
