# Guía Práctica de Fabricación: EasyEDA y JLCPCB (Paso a Paso)
## Cómo Convertir este Diseño en Placas Reales Ensambladas por Robots

Esta guía explica el flujo exacto de trabajo para abrir **EasyEDA**, colocar los componentes usando la lista de materiales (**BOM**) provista y ordenar la fabricación automatizada (**SMT Assembly**) en **JLCPCB**.

---

## 1. ¿Por qué EasyEDA + JLCPCB?

* **EasyEDA** es el editor de circuitos oficial de JLCPCB. Es 100% gratuito y funciona directamente en tu navegador (sin instalar nada) en:
  👉 [https://easyeda.com](https://easyeda.com)
* La gran ventaja es que **todos los componentes de nuestra lista BOM ya tienen su modelo 3D, huella (footprint) y símbolo listos**. Solo buscas el código LCSC (ej: `C2913200`) y lo arrastras a la pantalla.

---

## 2. Paso a Paso: Creación del Proyecto en EasyEDA

### Paso 1: Crear el Proyecto
1. Ingresa a [easyeda.com/editor](https://easyeda.com/editor) e inicia sesión con una cuenta gratuita.
2. Haz clic en **File > New > Project**.
3. Nómbralo: `CollarNet_Halter_V2`.

### Paso 2: Crear los dos Esquemáticos
Crea dos páginas esquemáticas dentro del proyecto:
1. **Página 1: `CollarNet_Logica_RF` (Cápsula Izquierda)**:
   - Abre la pestaña **Librería** (*Library*) a la izquierda (o presiona la tecla `Shift + B`).
   - En la barra de búsqueda, selecciona la pestaña **LCSC** y pega directamente los códigos de parte de nuestro archivo `04_LISTA_MATERIALES_BOM_LCSC.csv`:
     - ESP32-S3-WROOM-1: Buscar `C2913200` y hacer clic en *Place*.
     - SIM7670SA Módem: Buscar `C2892994`.
     - Regulador Buck SY8089: Buscar `C143798`.
     - Cargador Solar CN3791: Buscar `C141124`.
     - Acelerómetro SC7A20: Buscar `C392477`.
     - Conector USB-C: Buscar `C2765186`.
     - Porta Nano-SIM: Buscar `C2838382`.
     - Conectores Antena IPEX: Buscar `C14877`.
   - Conecta los pines usando la herramienta **Wire (W)** siguiendo las tablas del documento `02_ESQUEMATICO_CAPSULA_IZQUIERDA_LOGICA.md`.

2. **Página 2: `CollarNet_Potencia_Descarga` (Cápsula Derecha)**:
   - Coloca los componentes de potencia y estímulo:
     - Buzzer Piezoeléctrico: `C2904128`
     - Driver MOSFET AO3400A: `C20917`
     - Optoacoplador EL817C: `C4999`
     - Tiristor SCR MCR100-6: `C14486`
     - Temporizador Watchdog 74LVC1G123: `C176766`
     - Terminales de conexión a la batería 21700 y a los 2 electrodos M4.
   - Conecta las redes siguiendo el documento `03_ESQUEMATICO_CAPSULA_DERECHA_POTENCIA.md`.

---

## 3. Conversión a Placa Física (PCB Layout)

1. En el menú superior de EasyEDA, haz clic en **Design > Convert Schematic to PCB**.
2. **Dimensiones de la Placa Lógica (Izquierda)**:
   - Dibuja el contorno exterior (*BoardOutline*) como un rectángulo con esquinas redondeadas (radio 3 mm) de **60.0 mm × 32.0 mm**.
   - Coloca 4 agujeros para tornillos M2.5 en las esquinas.
   - Coloca la antena GNSS y el conector USB-C orientados hacia los bordes accesibles de la cápsula 3D.
3. **Dimensiones de la Placa de Potencia (Derecha)**:
   - Dibuja el contorno de **32.0 mm × 26.0 mm** (al lado del compartimento de la celda 21700).
   - Coloca los dos pads de alta tensión para los electrodos M4 en el borde inferior.
4. **Ruteo Automático o Manual**:
   - Para las pistas de antena RF (LTE y GNSS), mantén un ancho que dé 50 Ohms (la calculadora de EasyEDA lo hace automático).
   - Para la pista de alimentación `VBAT` hacia el módem, usa un ancho generoso (mínimo 1.0 mm a 1.5 mm) para evitar caídas de tensión durante ráfagas de transmisión.

---

## 4. Pedido y Fabricación en JLCPCB (Robots SMT)

1. En EasyEDA, haz clic en **Fabrication > One-key PCB / SMT Order**.
2. Te abrirá directamente la página de **JLCPCB** con tu diseño cargado.
3. Configuración recomendada:
   - **Layers**: 2 Layers.
   - **Dimensions**: Automático.
   - **PCB Qty**: 5, 10 o 50 placas.
   - **Surface Finish**: HASL with lead (económico) o ENIG-Gold (recomendado para ambientes húmedos de campo ganadero).
   - **SMT Assembly**: Selecciona **Enable SMT Assembly** (ensamblaje por robots).
4. El sistema verificará automáticamente el archivo BOM y colocará todos los chips.
5. Selecciona el método de envío (DHL / FedEx express para 3 a 5 días) y paga.
6. En aproximadamente 7 a 9 días laborales recibirás las placas ensambladas en tu taller.
