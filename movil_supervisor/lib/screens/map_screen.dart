import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../models/gps_data.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';
import '../services/gis_service.dart';
import '../services/gps_service.dart';
import '../widgets/drawing_hud.dart';
import '../widgets/eraser_hud.dart';
import '../widgets/gps_floating_controls.dart';
import '../widgets/hato_drawer.dart';
import '../widgets/topology_alert_banner.dart';
import '../theme/finca_theme.dart';
import 'buscar_res_screen.dart';

enum MapTileType { satellite, osm, dark }

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  final GPSService _gpsService = GPSService();
  GPSData? _currentGPS;
  MapTileType _currentTileType = MapTileType.satellite;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  Timer? _telemetryTimer;

  @override
  void initState() {
    super.initState();
    _initGPS();
    _initTelemetryPolling();
  }

  void _initTelemetryPolling() {
    _telemetryTimer?.cancel();
    _telemetryTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted) {
        context.read<AgroProvider>().fetchAnimalesMonitoreo();
      }
    });
  }

  Future<void> _initGPS() async {
    // Iniciar sensor GPS con seguimiento continuo
    await _gpsService.startTracking();
    _gpsService.gpsStream.listen((gps) {
      if (mounted) {
        setState(() {
          _currentGPS = gps;
        });
      }
    });

    // Centrar mapa inicialmente si hay datos o GPS
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final agro = context.read<AgroProvider>();
      if (agro.hatos.isNotEmpty && agro.hatos.first.vertices.isNotEmpty) {
        _mapController.move(agro.hatos.first.vertices.first, 15.5);
      } else if (_gpsService.lastKnownGPS != null) {
        _mapController.move(_gpsService.lastKnownGPS!.position, 16.0);
      }
    });
  }

  @override
  void dispose() {
    _telemetryTimer?.cancel();
    _gpsService.dispose();
    super.dispose();
  }

  void _centerOnGPS() {
    if (_currentGPS != null) {
      _mapController.move(_currentGPS!.position, 16.5);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Obteniendo señal GPS...')),
      );
    }
  }

  void _zoomToHato(Hato hato) {
    if (hato.vertices.isNotEmpty) {
      final center = GISService.getPolygonInteriorPoint(hato.vertices);
      _mapController.move(center, 16.0);
      context.read<AgroProvider>().selectHato(hato);
    }
  }

  void _zoomToPotrero(Potrero potrero, Hato hato) {
    if (potrero.vertices.isNotEmpty) {
      final center = GISService.getPolygonInteriorPoint(potrero.vertices);
      _mapController.move(center, 17.0);
      context.read<AgroProvider>().selectPotrero(potrero, parentHato: hato);
    }
  }

  String _getTileUrl() {
    switch (_currentTileType) {
      case MapTileType.satellite:
        // Esri World Imagery Satelital
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case MapTileType.osm:
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      case MapTileType.dark:
        return 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png';
    }
  }

  @override
  Widget build(BuildContext context) {
    final agroProvider = context.watch<AgroProvider>();
    final drawingProvider = context.watch<DrawingProvider>();

    return Scaffold(
      key: _scaffoldKey,
      drawer: HatoDrawer(
        onZoomToHato: _zoomToHato,
        onZoomToPotrero: _zoomToPotrero,
      ),
      body: Stack(
        children: [
          // ==========================================
          // 1. MAPA LEAFLET / FLUTTER_MAP
          // ==========================================
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: GPSService.defaultFarmLocation,
              initialZoom: 15.5,
              onTap: (tapPosition, point) {
                if (drawingProvider.isDrawing && !drawingProvider.isEraserMode) {
                  final candidates = drawingProvider.getNearbyCandidates(point, agroProvider);
                  if (candidates.isEmpty) {
                    drawingProvider.addExactVertex(point, agroProvider, isSnapped: false);
                  } else {
                    _showSnapChoiceBottomSheet(point, candidates, drawingProvider, agroProvider);
                  }
                }
              },
            ),
            children: [
              // Capa de Mosaicos Base (Tiles)
              TileLayer(
                urlTemplate: _getTileUrl(),
                userAgentPackageName: 'com.agrogis.app',
                maxZoom: 19,
              ),

              // ==========================================
              // 2. CAPA DE POLÍGONOS DE HATOS Y POTREROS
              // ==========================================
              PolygonLayer(
                polygons: [
                  // Hatos (Polígonos Padre)
                  ...agroProvider.hatos.map((hato) {
                    final isSelected = agroProvider.selectedHato?.id == hato.id;
                    return Polygon(
                      points: hato.vertices,
                      color: hato.color.withOpacity(isSelected ? 0.25 : 0.12),
                      borderColor: hato.color,
                      borderStrokeWidth: isSelected ? 3.5 : 2.0,
                      isFilled: true,
                    );
                  }),

                  // Potreros (Polígonos Hijo)
                  ...agroProvider.hatos.expand((hato) => hato.potreros).map((potrero) {
                    final isSelected = agroProvider.selectedPotrero?.id == potrero.id;
                    return Polygon(
                      points: potrero.vertices,
                      color: potrero.color.withOpacity(isSelected ? 0.35 : 0.20),
                      borderColor: potrero.color,
                      borderStrokeWidth: isSelected ? 3.0 : 1.8,
                      isFilled: true,
                    );
                  }),

                  // Polígono en Trazado Actual
                  if (drawingProvider.isDrawing && drawingProvider.draftVertices.length >= 3)
                    Polygon(
                      points: drawingProvider.draftVertices,
                      color: const Color(0xFF10B981).withOpacity(0.25),
                      borderColor: Colors.transparent,
                      isFilled: true,
                    ),
                ],
              ),

              // Líneas de cerca / Polilíneas
              PolylineLayer(
                polylines: [
                  // Polilínea del borrador en curso
                  if (drawingProvider.isDrawing && drawingProvider.draftVertices.length >= 2)
                    Polyline(
                      points: drawingProvider.draftVertices,
                      color: drawingProvider.isEraserMode
                          ? const Color(0xFFEF4444)
                          : const Color(0xFF34D399),
                      strokeWidth: 3.0,
                    ),

                  // ==========================================
                  // 3. CAPA DE ALERTA TOPOLÓGICA (Línea Roja Punteada)
                  // ==========================================
                  if (agroProvider.activeAlert?.offendingSegment != null &&
                      agroProvider.activeAlert!.offendingSegment!.length >= 2)
                    Polyline(
                      points: agroProvider.activeAlert!.offendingSegment!,
                      color: const Color(0xFFEF4444),
                      strokeWidth: 4.5,
                    ),
                ],
              ),

              // ==========================================
              // 4. CAPA DE SNAPPING (IMANES AMARILLOS)
              // ==========================================
              if (drawingProvider.isDrawing && !drawingProvider.isEraserMode)
                MarkerLayer(
                  markers: drawingProvider.activeSnapPoints.map((pt) {
                    return Marker(
                      point: pt,
                      width: 24,
                      height: 24,
                      child: GestureDetector(
                        onTap: () {
                          drawingProvider.addVertex(pt, agroProvider);
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFFBBF24),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.black, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFFBBF24).withOpacity(0.6),
                                blurRadius: 8,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(Icons.flare_rounded, size: 12, color: Colors.black),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),

              // Marcadores de Vértices del Borrador Normal
              if (drawingProvider.isDrawing && !drawingProvider.isEraserMode)
                MarkerLayer(
                  markers: drawingProvider.draftVertices.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final pt = entry.value;
                    return Marker(
                      point: pt,
                      width: 18,
                      height: 18,
                      child: Container(
                        decoration: BoxDecoration(
                          color: idx == 0
                              ? const Color(0xFF10B981)
                              : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF0F172A), width: 2),
                        ),
                        child: Center(
                          child: Text(
                            '${idx + 1}',
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),

              // ==========================================
              // 5. CAPA DE MODO BORRADOR SELECTIVO (ROJOS GRANDES)
              // ==========================================
              if (drawingProvider.isDrawing && drawingProvider.isEraserMode)
                MarkerLayer(
                  markers: drawingProvider.draftVertices.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final pt = entry.value;
                    return Marker(
                      point: pt,
                      width: 36,
                      height: 36,
                      child: GestureDetector(
                        onTap: () {
                          drawingProvider.removeVertexAt(idx);
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFEF4444).withOpacity(0.7),
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(Icons.close_rounded, size: 18, color: Colors.white),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),

              // ==========================================
              // 6. MARCADOR DE CONFLICTO TOPOLÓGICO
              // ==========================================
              if (agroProvider.activeAlert?.conflictPoint != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: agroProvider.activeAlert!.conflictPoint!,
                      width: 40,
                      height: 40,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.8),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2.5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEF4444).withOpacity(0.9),
                              blurRadius: 16,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(Icons.warning_amber_rounded, size: 22, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),

              // ==========================================
              // 7. CAPA DE MONITOREO EN VIVO DE GANADO (RESES CON COLLAR)
              // ==========================================
              if (agroProvider.animalesMonitoreo.isNotEmpty)
                MarkerLayer(
                  markers: agroProvider.animalesMonitoreo.map((animal) {
                    final lat = double.tryParse(animal['latitud']?.toString() ?? '') ?? 0.0;
                    final lng = double.tryParse(animal['longitud']?.toString() ?? '') ?? 0.0;
                    if (lat == 0.0 || lng == 0.0) return null;

                    final arete = animal['arete_visual']?.toString() ?? 'Res';
                    final estadoCerca = animal['estado_cerca']?.toString() ?? 'DENTRO';
                    final estadoAlerta = animal['estado_alerta']?.toString() ?? 'NORMAL';

                    Color badgeColor = const Color(0xFF10B981);
                    if (estadoCerca == 'FUERA') {
                      badgeColor = const Color(0xFFEF4444);
                    } else if (estadoCerca == 'ADVERTENCIA' || estadoAlerta != 'NORMAL') {
                      badgeColor = const Color(0xFFF59E0B);
                    }

                    return Marker(
                      point: LatLng(lat, lng),
                      width: 90,
                      height: 52,
                      child: GestureDetector(
                        onTap: () => _mostrarFichaAnimal(context, animal),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A).withOpacity(0.92),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: badgeColor, width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: badgeColor.withOpacity(0.4),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.pets, size: 10, color: badgeColor),
                                  const SizedBox(width: 3),
                                  Text(
                                    arete,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.location_pin, color: badgeColor, size: 24),
                          ],
                        ),
                      ),
                    );
                  }).whereType<Marker>().toList(),
                ),

              // ==========================================
              // 8. CAPA DE UBICACIÓN GPS DEL USUARIO
              // ==========================================
              if (_currentGPS != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _currentGPS!.position,
                      width: 28,
                      height: 28,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withOpacity(0.3),
                              shape: BoxShape.circle,
                            ),
                          ),
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black45,
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // ==========================================
          // 9. BARRA SUPERIOR FLOTANTE
          // ==========================================
          Positioned(
            top: 16,
            left: 16,
            child: SafeArea(
              child: Row(
                children: [
                  // Botón Volver al Menú Principal
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withOpacity(0.92),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF34D399), size: 20),
                      tooltip: 'Volver al Menú',
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),

                  const SizedBox(width: 8),

                  // Botón Abrir Menú / Inventario
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A).withOpacity(0.92),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Color(0xFF334155)),
                      ),
                      elevation: 4,
                    ),
                    icon: const Icon(Icons.menu_rounded, size: 18, color: Color(0xFF10B981)),
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Predios', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${agroProvider.hatos.length}',
                            style: const TextStyle(
                              color: Color(0xFF34D399),
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    onPressed: () => _scaffoldKey.currentState?.openDrawer(),
                  ),

                  const SizedBox(width: 8),

                  // Badge de Reses en Monitoreo
                  if (agroProvider.animalesMonitoreo.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A).withOpacity(0.92),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.pets, size: 14, color: Color(0xFF34D399)),
                          const SizedBox(width: 5),
                          Text(
                            '${agroProvider.animalesMonitoreo.length} Reses',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(width: 8),

                  // Selector de Capa de Mapa
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withOpacity(0.92),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: PopupMenuButton<MapTileType>(
                      icon: const Icon(Icons.layers_outlined, color: Colors.white70, size: 18),
                      tooltip: 'Tipo de Mapa',
                      color: const Color(0xFF1E293B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      onSelected: (type) => setState(() => _currentTileType = type),
                      itemBuilder: (_) => [
                        const PopupMenuItem(
                          value: MapTileType.satellite,
                          child: Row(
                            children: [
                              Icon(Icons.public_rounded, color: Color(0xFF60A5FA), size: 16),
                              SizedBox(width: 8),
                              Text('Satelital HD', style: TextStyle(color: Colors.white)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: MapTileType.osm,
                          child: Row(
                            children: [
                              Icon(Icons.map_outlined, color: Color(0xFF34D399), size: 16),
                              SizedBox(width: 8),
                              Text('OpenStreetMap', style: TextStyle(color: Colors.white)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: MapTileType.dark,
                          child: Row(
                            children: [
                              Icon(Icons.dark_mode_outlined, color: Color(0xFFFBBF24), size: 16),
                              SizedBox(width: 8),
                              Text('Modo Oscuro', style: TextStyle(color: Colors.white)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ==========================================
          // 10. CONTROLES FLOTANTES GPS
          // ==========================================
          GPSFloatingControls(
            currentGPS: _currentGPS,
            onCenterGPS: _centerOnGPS,
          ),

          // ==========================================
          // 11. ALERTAS TOPOLÓGICAS VISUALES (5s BANNER)
          // ==========================================
          const TopologyAlertBanner(),

          // ==========================================
          // 12. HUD DE TRAZADO
          // ==========================================
          const DrawingHUD(),

          // ==========================================
          // 13. HUD DE MODO BORRADOR SELECTIVO
          // ==========================================
          const EraserHUD(),
        ],
      ),
    );
  }

  // Ficha Rápida del Animal al tocarlo en el Mapa
  void _mostrarFichaAnimal(BuildContext context, Map<String, dynamic> animal) {
    final arete = animal['arete_visual']?.toString() ?? 'Res';
    final collar = animal['collar_id']?.toString() ?? 'S/N';
    final categoria = animal['categoria']?.toString() ?? 'Ganado Bovino';
    final raza = animal['raza']?.toString() ?? 'Mestizo';
    final peso = animal['peso_actual']?.toString() ?? '380';
    final potrero = animal['potrero_nombre']?.toString() ?? 'Potrero 1';
    final estadoCerca = animal['estado_cerca']?.toString() ?? 'DENTRO';
    final bateria = animal['nivel_bateria']?.toString() ?? '85';

    Color estadoColor = const Color(0xFF10B981);
    String estadoTexto = 'Pastando dentro del potrero';
    if (estadoCerca == 'FUERA') {
      estadoColor = const Color(0xFFEF4444);
      estadoTexto = '⚠️ FUERA DE CERCA (Posible fuga)';
    } else if (estadoCerca == 'ADVERTENCIA') {
      estadoColor = const Color(0xFFF59E0B);
      estadoTexto = '⚠️ En zona de advertencia perimetral';
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: estadoColor.withOpacity(0.2),
                        child: Icon(Icons.pets, color: estadoColor),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Arete: $arete',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '$categoria • $raza',
                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: estadoColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: estadoColor),
                    ),
                    child: Text(
                      estadoCerca,
                      style: TextStyle(
                        color: estadoColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Datos Técnicos
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Potrero Asignado:', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text(potrero, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Collar IoT:', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text('COL-$collar  (🔋 $bateria%)', style: const TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Último Peso:', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text('$peso kg', style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                estadoTexto,
                style: TextStyle(color: estadoColor, fontSize: 13, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),

              // Botón Localizar con Brújula Táctica
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const BuscarResScreen()),
                    );
                  },
                  icon: const Icon(Icons.explore, color: Colors.black),
                  label: const Text('GUIARME CON BRÚJULA HACIA ESTA RES', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSnapChoiceBottomSheet(
    LatLng rawPoint,
    List<SnapCandidate> candidates,
    DrawingProvider drawing,
    AgroProvider agro,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: FincaTheme.bgCardElevated,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        side: BorderSide(color: FincaTheme.borderCard),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: FincaTheme.accentGreenLight.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.join_inner_rounded, color: FincaTheme.accentGreenLight, size: 22),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PROXIMIDAD DETECTADA',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: FincaTheme.accentGreenLight,
                                letterSpacing: 0.8,
                              ),
                            ),
                            Text(
                              '¿Deseas unir el punto o colocarlo libre?',
                              style: TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: FincaTheme.textMuted, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Opción 1: Mantener posición exacta tocada
                InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    drawing.addExactVertex(rawPoint, agro, isSnapped: false);
                  },
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: FincaTheme.bgCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: FincaTheme.borderCard),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white10,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.my_location_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '📍 Mantener posición exacta tocada',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: FincaTheme.textLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Coloca el vértice libremente sin unir a otros elementos',
                                style: TextStyle(fontSize: 11, color: FincaTheme.textMuted),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: FincaTheme.textMuted, size: 20),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 14),
                Text(
                  'O SELECCIONA EL VÉRTICE / LINDERO AL QUE DESEAS UNIRTE:',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: FincaTheme.textMuted),
                ),
                const SizedBox(height: 8),

                // Lista de Candidatos (a <= 1 metro)
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: candidates.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final c = candidates[index];
                      IconData iconData = Icons.adjust_rounded;
                      Color iconColor = FincaTheme.warningAmber;

                      if (c.type == SnapCandidateType.draftVertex) {
                        iconData = Icons.trip_origin_rounded;
                        iconColor = FincaTheme.primaryGreen;
                      } else if (c.type == SnapCandidateType.edgeSegment) {
                        iconData = Icons.polyline_rounded;
                        iconColor = FincaTheme.infoBlue;
                      }

                      return InkWell(
                        onTap: () {
                          Navigator.pop(ctx);
                          drawing.addExactVertex(c.point, agro, isSnapped: true);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: iconColor.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: iconColor.withOpacity(0.35)),
                          ),
                          child: Row(
                            children: [
                              Icon(iconData, color: iconColor, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '🧲 ${c.title}',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: FincaTheme.textLight,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      c.subtitle,
                                      style: TextStyle(fontSize: 11, color: iconColor),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: iconColor.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Unir',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: iconColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }
}
