# Guía Operativa: Configuración de Collares y Vinculación en Campo (CollarNet)

Este documento describe el procedimiento operativo estándar (SOP) para aprovisionar collares nuevos y asociarlos a los animales en el campo.

---

## 📱 PARTE 1: Configuración de un Collar Nuevo (En Taller / Oficina)

Antes de llevar los dispositivos al campo, se debe realizar la preparación técnica del hardware:

### 1. Programación del Firmware Base
- Se flashea el código C++ (`CollarNet.ino`) en la placa ESP32 con la dirección del servidor MQTT (`mqtt://86.48.23.195:1883`) y el prefijo de tópico.

### 2. Instalación de la Tarjeta SIM Celular
- Insertar la tarjeta SIM con plan de datos M2M activo en el módem celular (SIM800L / SIM7000).

### 3. Registro del Dispositivo en la Plataforma Web
- Acceder a la app **CollarNet** -> Pestaña **"Altas y Registros"** -> **"Registrar Collar Físico"**.
- Ingresar:
  - **ID Hardware / MAC:** Identificador único marcado físicamente en la carcasa (ej: `COLLAR-005`).
  - **Número SIM:** Número de la tarjeta celular.
  - **Versión de Firmware:** Versión cargada (ej: `1.0.0`).
  - **Fecha de Instalación:** Fecha de inicio de operaciones.
- Al guardar, el collar queda registrado en la base de datos como **HABILITADO** y listo para emparejamiento.

---

## 🐂 PARTE 2: Vinculación en Campo (En la Manga / Corral con el Ganado)

Cuando los animales están en el cepo/manga para pesaje o vacunación:

### 1. Colocación Física del Dispositivo
- El operador ajusta la correa del collar `COLLAR-005` en el cuello del animal con arete visual `A-102`.

### 2. Asociación desde el Celular o Tablet
- El vaquero/administrador abre la aplicación web **CollarNet** desde su dispositivo móvil.
- Va a **"Registrar Res (Ganado)"** o editar la ficha del animal:
  - **Arete Visual:** `A-102`
  - **Raza / Categoría / Sexo:** Nelore / Toro / Macho.
  - **Collar:** Selecciona `COLLAR-005` de la lista desplegable.
  - **Potrero Inicial:** Selecciona la pastura a la que será liberado (ej: `Potrero A1`).
- Presiona **"Vincular Animal"**.

### 3. Sincronización Automática de Geocerca (MQTT)
- Al presionar *"Vincular"* (o *"Sincronizar Cerca Virtual"*):
  1. El servidor lee los límites espaciales del Hato y del Potrero A1 (incluyendo el margen de advertencia en metros `t_w`).
  2. El servidor envía la trama MQTT al collar a través de la red celular.
  3. **Respuesta del Collar:** El ESP32 guarda los límites en su memoria interna y emite un **tono/beep de confirmación** indicando que ya está armado y calculando límites de seguridad.

### 4. Liberación
- Se libera al animal al potrero. El mapa satelital comenzará a mostrar su icono en **🟢 SEGURO**.
