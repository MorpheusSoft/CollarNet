# Guía de Revisión e Impresión 3D — Placa de Potencia (Cápsula Derecha)
**Proyecto:** CollarNet V2 / CowAI  
**Pieza:** Baquelita de Potencia Bicolor (`24.0 × 48.0 × 1.60 mm`)

---

## 1. Archivos Incluidos en este Paquete

1. **`placa_potencia_3d.html`** *(Abrir con doble clic en cualquier navegador: Chrome, Edge, Safari)*
   - Simulador CAD 3D interactivo. Permite rotar 360°, activar **Rayos X**, hacer **Despiece 3D**, ver la **Cara Inferior de soldadura** y comprobar el **encaje dentro de la Cápsula Derecha** junto a la batería 21700-3P y el Buzzer.
2. **Archivos STL para Impresión Bicolor (Bambu Studio / OrcaSlicer):**
   - `baquelita_potencia_24x48_base_petg_gris.stl` ➡️ **Color 1 (PETG Gris o Blanco):** Placa base plana de `1.60 mm` de espesor.
   - `baquelita_potencia_24x48_cunas_petg_verde.stl` ➡️ **Color 2 (PETG Verde):** Rieles escalonados superiores para el módulo TP4056 + etiquetas de pines sobresalidas `0.40 mm` en la cara inferior.
   - *(Opcional Monocolor)* `baquelita_potencia_24x48_completa.stl` ➡️ Pieza unificada en un solo archivo STL si se desea imprimir en un solo color.
3. **Modelos 3D de Referencia (`.glb`):**
   - `SIMULACION_CAPSULA_DERECHA_CON_BATERIA_Y_PLACA.glb` ➡️ Ensamble 3D completo dentro de la cápsula derecha (se puede abrir en el Visor 3D de Windows o en https://gltf-viewer.donmccurdy.com/).

---

## 2. Checklist de Verificación (Lo que debe revisar antes de imprimir)

Antes de mandar a imprimir, verificar con un pie de rey (vernier) o en el laminador (Bambu Studio) estas **5 medidas críticas**:

- [ ] **1. Dimensiones exteriores de la placa:** Exactamente **`24.00 mm` (ancho) × `48.00 mm` (largo) × `1.60 mm` (espesor de la base plana)**.
- [ ] **2. Encaje en las 4 espigas de la Cápsula Derecha:**
  - 4 huecos cuadrados en las esquinas de **`3.15 × 3.15 mm`** (entran con holgura de `+0.375 mm` por lado en las espigas cuadradas de `2.40 × 2.40 mm` de la cápsula).
  - Distancia entre centros: **`DX = 15.00 mm`** (`X = ±7.50 mm`) y **`DY = 39.00 mm`** (`Y = ±19.50 mm`).
- [ ] **3. Encaje del Módulo Cargador Azul `HW-373 V1.2.1 (TP4056 USB-C)`:**
  - El módulo mide **`17.15 × 25.70 mm`**.
  - Las cunas verdes tienen un hombro interno a `Z = 3.20 mm` donde apoya la placa del TP4056 y paredes laterales separadas a **`17.40 mm`** (`X = ±8.70 mm`) para sujetarlo sin juego con el puerto **USB-C mirando hacia arriba (`+Y`)**.
- [ ] **4. Los 8 Orificios Pasantes para Soldar Pines (`1.60 × 1.60 mm`):**
  - **2 arriba (`IN+`, `IN-`):** En `Y = +12.60 mm`, `X = ±7.13 mm` (entrada de los 2 paneles solares en paralelo).
  - **4 al centro-abajo (`O+`, `B+`, `B-`, `O-`):** En `Y = -9.91 mm`, `X = ±7.13 mm` (`OUT+`/`OUT-`) y `X = ±3.72 mm` (`B+`/`B-` para batería LMT 21700-3P).
  - **2 abajo (`BZ+`, `BZ-`):** En `Y = -17.50 mm`, `X = ±3.20 mm` (conexión hacia el Buzzer piezoeléctrico de Ø12 mm).
- [ ] **5. Cara Inferior Plana + Letras Sobresalidas:**
  - La base gris es **100% plana** (sin ventanas hundidas) y las etiquetas verdes (`IN+`, `IN-`, `O+`, `B+`, `B-`, `O-`, `BZ+`, `BZ-`) sobresalen **`0.40 mm` hacia afuera** en la cara de abajo para guiar la soldadura.

---

## 3. Parámetros de Impresión Recomendados (Bambu Lab P1S / X1C / A1)

1. **Cómo cargar el archivo Bicolor en Bambu Studio:**
   - Seleccionar **ambos archivos a la vez** (`baquelita_potencia_24x48_base_petg_gris.stl` y `baquelita_potencia_24x48_cunas_petg_verde.stl`) y arrastrarlos juntos a la cama de impresión.
   - Cuando Bambu Studio pregunte: *"¿Cargar estos archivos como un único objeto con múltiples partes?"*, hacer clic en **SÍ (Yes)**. Así ambos colores quedan alineados al milímetro automáticamente.
2. **Material:** **PETG** (soporta mejor la temperatura al soldar los pines y el calor exterior en campo que el PLA).
3. **Boquilla y Altura de Capa:**
   - Boquilla: **`0.4 mm`**
   - Altura de capa: **`0.20 mm`**
   - Generador de paredes: **Arachne (Activado)** para que las letras inferiores de `0.40 mm` de trazo salgan nítidas.
4. **Relleno (Infill):** **100% Rectilíneo** (al ser una placa fina de `1.6 mm`, con 100% queda rígida como una PCB real).
5. **Soportes:** **NO** (0% soportes; las letras inferiores de `0.40 mm` son de 2 capas y el puente es inmediato).
