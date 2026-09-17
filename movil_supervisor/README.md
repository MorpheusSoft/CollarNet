# AgroGIS - Aplicación Flutter (Mobile & Web PWA) para Medición y Catastro Agrícola

Sistema de Información Geográfica (GIS) y Catastro Rural para delimitar, medir y gestionar terrenos agropecuarios (**Hatos y Potreros**) con alta precisión WGS84, sensor GPS en tiempo real, snapping geométrico, modo borrador selectivo y validación de reglas topológicas estrictas sin dependencias externas pesadas.

---

## 🌾 Características Principales

1. **Estructura Jerárquica de Terrenos**:
   - `Hato` (Polígono Padre): Id, nombre, área en hectáreas ($ha$), perímetro ($m$), vértices geodésicos y arreglo de potreros.
   - `Potrero` (Polígono Hijo): Id, nombre, hatoId, área ($ha$), perímetro ($m$), vértices geodésicos y metadata de uso/pastura.
2. **Sensor GPS Continuo**:
   - Monitoreo en vivo con `Geolocator` y precisión en metros ($\pm X\text{ m}$).
   - Botón flotante para centrar la cámara en el GPS del usuario.
   - Botón "Marcar Vértice GPS" durante el trazado para capturar puntos en campo.
3. **Modo de Trazado & HUD en Tiempo Real**:
   - Cálculo instantáneo de área ($ha$ y $m^2$), perímetro y conteo de vértices a medida que se agregan puntos.
   - Opciones para deshacer último punto (`Undo`) y cerrar polígono.
4. **Sistema de Imanes (Snapping)**:
   - Los vértices de todos los polígonos existentes se visualizan como puntos amarillos interactivos con icono de imán.
   - Al tocar un imán o hacer clic en sus inmediaciones, el nuevo vértice toma **exactamente** la coordenada existente, eliminando huecos o microporos topológicos.
5. **Modo Borrador Selectivo (Eraser Mode)**:
   - Al activar "Seleccionar Vértice a Borrar", se bloquea la adición de nuevos puntos.
   - Los vértices del borrador actual se amplían y se tiñen de rojo interactivo.
   - Al tocar cualquier vértice rojo se elimina de forma inmediata.
   - Crea un respaldo automático al ingresar y ofrece los botones:
     - `✅ Guardar Cambios`
     - `❌ Desechar (Restaurar copia)`
6. **Reglas Topológicas Estrictas (Motor Vectorial Puro en Dart `gis_service.dart`)**:
   - **Regla 1: Sin auto-intersecciones** (polígonos en 8 o auto-cruzados rechazados).
   - **Regla 2: Hatos independientes** (no se solapan ni cruzan).
   - **Regla 3: Contención 100% de Potreros** (el potrero no puede salirse de su hato padre).
   - **Regla 4: Potreros independientes** (los potreros hermanos no se solapan).
   - **Regla 5: Colindancias permitidas** (bordes y vértices compartidos válidos sin falsos positivos de solapamiento).
   - **Regla 6: Efecto Isla / Envolvimiento** (previene que un polígono encierre completamente a otro sin compartir linderos).
   - **Regla 7: Cruce de líneas cóncavas** (evaluador en las muestras al $25\%$, $50\%$ y $75\%$ del tramo).
7. **Alertas Visuales en el Mapa**:
   - Polilínea roja destacada sobre el segmento infractor.
   - Marcador circular rojo pulsante sobre el punto de conflicto.
   - Banner/Tooltip flotante con la explicación exacta de la regla violada.
   - Auto-eliminación a los 5 segundos vía temporizador.
8. **Capas y Exportación**:
   - Mosaicos satelitales HD (Esri World Imagery), OpenStreetMap y Modo Oscuro.
   - Exportación completa a formato GeoJSON estándar.

---

## 🚀 Cómo Ejecutar el Proyecto

### Requisitos
- Flutter SDK 3.0+ instalado.

### Comandos

```bash
# 1. Navegar al directorio del proyecto
cd C:\Users\dzambrano\.gemini\antigravity-ide\scratch\agrogis_flutter

# 2. Instalar dependencias
flutter pub get

# 3. Ejecutar pruebas unitarias de geometría y topología
flutter test test/gis_service_test.dart

# 4. Ejecutar en Web (PWA) o Móvil (Android/iOS)
flutter run -d chrome     # Para Web PWA
flutter run -d android    # Para dispositivo Android
```

---

## 📁 Estructura del Código

```
agrogis_flutter/
├── pubspec.yaml
├── web/
│   ├── index.html
│   └── manifest.json
├── test/
│   └── gis_service_test.dart       # Pruebas unitarias de las 7 reglas topológicas
└── lib/
    ├── main.dart                   # Entry point con tema oscuro Material 3
    ├── models/
    │   ├── hato.dart               # Modelo Hato (Padre)
    │   ├── potrero.dart            # Modelo Potrero (Hijo)
    │   ├── topology_alert.dart     # Modelo de Alerta Topológica
    │   └── gps_data.dart           # Modelo de Telemetría GPS
    ├── services/
    │   ├── gis_service.dart        # Motor vectorial puro WGS84
    │   ├── gps_service.dart        # Sensor GPS y Geolocator
    │   └── storage_service.dart    # Persistencia local y exportación GeoJSON
    ├── providers/
    │   ├── agro_provider.dart      # Estado de predios y alertas
    │   └── drawing_provider.dart   # Estado de dibujo, snapping y borrador
    ├── screens/
    │   └── map_screen.dart         # Pantalla principal con capas Leaflet/FlutterMap
    └── widgets/
        ├── drawing_hud.dart        # HUD con métricas en tiempo real
        ├── eraser_hud.dart         # HUD de modo borrador selectivo
        ├── hato_drawer.dart        # Inventario jerárquico lateral
        ├── topology_alert_banner.dart # Banner de infracción topológica
        ├── gps_floating_controls.dart # Controles de precisión y centrado GPS
        └── create_polygon_dialog.dart # Diálogo de guardado y metadatos
```
