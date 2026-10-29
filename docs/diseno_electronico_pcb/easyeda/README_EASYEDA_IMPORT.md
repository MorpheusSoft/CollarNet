# Guía Oficial: Importación en EasyEDA y Fabricación Automatizada en JLCPCB

Este directorio contiene los archivos listos para fabricación del hardware **CollarNet V2** (Arquitectura Oficial Monolítica All-In-One 110.60 × 33.10 mm).

---

## 1. Importación Directa en EasyEDA (100% Nativo y Gratuito)

EasyEDA (tanto la versión Standard como la versión Pro) admite la importación nativa con 1 solo clic de proyectos KiCad 7 y 8:

1. Abre en tu navegador web: 👉 **[https://easyeda.com/editor](https://easyeda.com/editor)**
2. Inicia sesión con tu cuenta gratuita de EasyEDA / JLCPCB.
3. En el menú superior izquierdo, selecciona:
   **File (Archivo) > Import (Importar) > KiCad...**
4. Selecciona los archivos ubicados en la carpeta `kicad/`:
   - `docs/diseno_electronico_pcb/kicad/CollarNet_V2.kicad_sch` (Esquemático completo con simbología electrónica oficial, números de pin y netlist).
   - `docs/diseno_electronico_pcb/kicad/CollarNet_V2.kicad_pcb` (Layout de circuito impreso con contorno de 110.60 × 33.10 mm, ranura fresada de 2.0 mm, pistas ruteadas y huellas SMD/PTH).
5. El editor abrirá inmediatamente el diseño 100% editable, con todas las pistas, pads y netlist conectados.

---

## 2. Pedido de Fabricación Rápido en JLCPCB (One-Key SMT Assembly)

Para enviar a fabricar la placa y ensamblarla con robots SMT sin necesidad de abrir ningún software:

1. Ingresa a: 👉 **[https://jlcpcb.com/quote](https://jlcpcb.com/quote)**
2. Haz clic en **"Add Gerber file"** y sube el archivo comprimido:
   📁 **`docs/diseno_electronico_pcb/fabricacion/Gerber_CollarNet_V2.zip`**
3. El visor automático de JLCPCB detectará inmediatamente:
   - **Dimensiones**: 110.60 × 33.10 mm.
   - **Capas**: 2 Layers.
   - **Grosor PCB**: 1.6 mm.
   - **Ranura Fresada**: Detectada en capa Edge.Cuts (2.0 mm de ancho, aislamiento 5kV).
4. Configuración recomendada para campo ganadero:
   - **PCB Color**: Verde (Green) o Negro Mate (Matte Black).
   - **Surface Finish**: **ENIG** (*Electroless Nickel Immersion Gold* — recomendado contra la corrosión por orina y humedad).
5. Activa la opción **"SMT Assembly"**:
   - Sube el archivo BOM: **`BOM_JLCPCB_CollarNet_V2.csv`**
   - Sube el archivo CPL Pick & Place: **`CPL_JLCPCB_CollarNet_V2.csv`**
6. Los robots de colocación superficial montarán automáticamente el microcontrolador ESP32-S3, el módem 4G SIM7670SA, el sensor acelerómetro SC7A20, el regulador Buck SY8089, el cargador MPPT CN3791 y la etapa de control del disuasor CDI.

---

## 3. Resumen de Archivos Entregados

| Archivo | Descripción | Uso Principal |
| :--- | :--- | :--- |
| `Gerber_CollarNet_V2.zip` | Paquete Gerber RS-274X + Taladros Excellon | Fabricación de PCB en cualquier fabricante mundial |
| `BOM_JLCPCB_CollarNet_V2.csv` | Lista de materiales con códigos LCSC oficiales | Compra automática de partes y montaje SMT |
| `CPL_JLCPCB_CollarNet_V2.csv` | Coordenadas X/Y de centroide y rotación de componentes | Guiado de los robots Pick & Place en línea de montaje |
| `../kicad/CollarNet_V2.kicad_sch` | Esquemático KiCad 7/8 nativo | Edición e importación en EasyEDA / KiCad |
| `../kicad/CollarNet_V2.kicad_pcb` | Layout PCB KiCad 7/8 nativo | Edición de pistas y diseño en EasyEDA / KiCad |
| `CollarNet_V2_Planos_Esquematico_y_PCB.pdf` | Planos de ingeniería en 4 láminas A3 de alta resolución (Monolítica AIO) | Revisión técnica de laboratorio, impresión y archivo |
