import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../models/gps_data.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';
import '../services/gis_service.dart';
import '../services/gps_service.dart';
import '../theme/app_theme.dart';
import '../widgets/topology_alert_banner.dart';

enum CreationMethod {
  satelliteMap,  // 1. A través del mapa del satélite
  gpsWaypoints,  // 2. Guardando puntos de ubicación (GPS)
  gpsRoute,      // 3. Por ruta del perímetro (GPS Tracking vehicular)
}

enum MapTileType { satellite, osm, dark }

class HatoDrawingScreen extends StatefulWidget {
  final DrawingType drawingType;
  final Hato? parentHato; // Solo para cuando drawingType == DrawingType.potrero
  final int? tenantId;
  final String? tenantNombre;

  const HatoDrawingScreen({
    super.key,
    required this.drawingType,
    this.parentHato,
    this.tenantId,
    this.tenantNombre,
  });

  @override
  State<HatoDrawingScreen> createState() => _HatoDrawingScreenState();
}

class _HatoDrawingScreenState extends State<HatoDrawingScreen> {
  final MapController _mapController = MapController();
  final GPSService _gpsService = GPSService();

  GPSData? _currentGPS;
  MapTileType _currentTileType = MapTileType.satellite;
  CreationMethod _currentMethod = CreationMethod.satelliteMap;

  // Estado para Modo GPS Tracking continuo
  bool _isRecordingRoute = false;
  StreamSubscription<Position>? _routeStreamSub;
  double _lastGpsAccuracy = 0.0;

  @override
  void initState() {
    super.initState();
    _initGPS();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startInitialDrawing();
    });
  }

  void _startInitialDrawing() {
    final drawing = context.read<DrawingProvider>();
    final agro = context.read<AgroProvider>();

    if (widget.drawingType == DrawingType.hato) {
      drawing.startDrawingHato(agro.hatos);
    } else if (widget.parentHato != null) {
      drawing.startDrawingPotrero(widget.parentHato!.id, agro.hatos);
      if (widget.parentHato!.vertices.isNotEmpty) {
        final center = GISService.getPolygonInteriorPoint(widget.parentHato!.vertices);
        _mapController.move(center, 16.5);
      }
    }
  }

  Future<void> _initGPS() async {
    await _gpsService.startTracking();
    _gpsService.gpsStream.listen((gps) {
      if (mounted) {
        setState(() => _currentGPS = gps);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.parentHato != null && widget.parentHato!.vertices.isNotEmpty) {
        _mapController.move(widget.parentHato!.vertices.first, 16.5);
      } else if (_gpsService.lastKnownGPS != null) {
        _mapController.move(_gpsService.lastKnownGPS!.position, 16.0);
      }
    });
  }

  @override
  void dispose() {
    _routeStreamSub?.cancel();
    _gpsService.dispose();
    super.dispose();
  }

  void _centerOnGPS() {
    if (_currentGPS != null) {
      _mapController.move(_currentGPS!.position, 17.0);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Buscando señal satelital GPS...'),
          backgroundColor: AppTheme.warningAmber,
        ),
      );
    }
  }

  String _getTileUrl() {
    switch (_currentTileType) {
      case MapTileType.satellite:
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case MapTileType.osm:
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      case MapTileType.dark:
        return 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    }
  }

  // ==========================================
  // MÉTODO 2: GUARDAR PUNTO DE UBICACIÓN ACTUAL (GPS)
  // ==========================================
  Future<void> _captureCurrentLocationVertex() async {
    final drawing = context.read<DrawingProvider>();
    final agro = context.read<AgroProvider>();

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final pt = LatLng(pos.latitude, pos.longitude);
      final added = drawing.addVertex(pt, agro);

      if (added) {
        _mapController.move(pt, 17.0);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.emeraldGreen,
              duration: const Duration(milliseconds: 1500),
              content: Text(
                '📍 Vértice #${drawing.vertexCount} guardado (Precisión: ±${pos.accuracy.toStringAsFixed(1)}m)',
                style: GoogleFonts.inter(fontWeight: FontWeight.w700),
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.dangerRed,
            content: Text('Error obteniendo ubicación GPS: $e'),
          ),
        );
      }
    }
  }

  // ==========================================
  // MÉTODO 4: GRABACIÓN CONTINUA POR RUTA DEL PERÍMETRO
  // ==========================================
  Future<void> _toggleRouteRecording() async {
    if (_isRecordingRoute) {
      _routeStreamSub?.cancel();
      _routeStreamSub = null;
      setState(() => _isRecordingRoute = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.primaryCyan,
            content: Text('Grabación de ruta pausada. Puedes cerrar y confirmar el polígono.'),
          ),
        );
      }
    } else {
      final hasPermission = await Geolocator.checkPermission();
      if (hasPermission == LocationPermission.denied) {
        final req = await Geolocator.requestPermission();
        if (req == LocationPermission.denied || req == LocationPermission.deniedForever) {
          return;
        }
      }

      if (!mounted) return;
      setState(() => _isRecordingRoute = true);

      final drawing = context.read<DrawingProvider>();
      final agro = context.read<AgroProvider>();

      const settings = LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 3, // Cada 3 metros
      );

      _routeStreamSub = Geolocator.getPositionStream(locationSettings: settings).listen((pos) {
        if (!mounted) return;
        setState(() => _lastGpsAccuracy = pos.accuracy);

        final pt = LatLng(pos.latitude, pos.longitude);
        drawing.addVertex(pt, agro);
        _mapController.move(pt, 17.0);
      });
    }
  }

  // ==========================================
  // CONFIRMACIÓN Y GUARDADO FINAL
  // ==========================================
  void _onConfirmAndSave() {
    final drawing = context.read<DrawingProvider>();
    final agro = context.read<AgroProvider>();

    if (drawing.vertexCount < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.dangerRed,
          content: Text('Se requieren al menos 3 vértices para cerrar el área.'),
        ),
      );
      return;
    }

    final validation = drawing.validateFinalPolygon(agro);
    if (!validation.isValid) {
      agro.showTopologyAlert(
        validation.errorMessage ?? 'Error de validación topológica',
        conflictPoint: validation.conflictPoint,
        offendingSegment: validation.offendingSegment,
      );
      return;
    }

    _showNamingAndAttributesDialog();
  }

  void _showNamingAndAttributesDialog() {
    final drawing = context.read<DrawingProvider>();
    final agro = context.read<AgroProvider>();
    final isHato = widget.drawingType == DrawingType.hato;

    // Para Potreros: Nomenclatura automática por letras (A, B, C...)
    final String defaultPotreroLetter = isHato
        ? ''
        : String.fromCharCode(65 + (widget.parentHato?.potreros.length ?? 0));

    final TextEditingController nameCtrl = TextEditingController(
      text: isHato
          ? 'Hato ${DateTime.now().day}/${DateTime.now().month} #${agro.hatos.length + 1}'
          : 'Potrero $defaultPotreroLetter',
    );

    final TextEditingController notesCtrl = TextEditingController();
    final TextEditingController warningDistanceCtrl = TextEditingController(text: '25');
    Color selectedColor = isHato ? AppTheme.warningAmber : AppTheme.primaryCyan;
    bool permiteCrearPotreros = true;

    final double areaHa = drawing.currentAreaHa;
    final double areaM2 = drawing.currentAreaM2;
    final double perimeterM = GISService.calculateGeodesicPerimeterM(drawing.draftVertices, isClosed: true);

    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDlgState) {
            return Dialog(
              backgroundColor: AppTheme.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isHato ? AppTheme.warningAmber : AppTheme.primaryCyan,
                  width: 1.5,
                ),
              ),
              child: Container(
                padding: const EdgeInsets.all(22),
                constraints: const BoxConstraints(maxWidth: 440),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Cabecera del Diálogo
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: (isHato ? AppTheme.warningAmber : AppTheme.primaryCyan).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              isHato ? Icons.terrain_rounded : Icons.grid_view_rounded,
                              color: isHato ? AppTheme.warningAmber : AppTheme.primaryCyan,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isHato ? 'Confirmar y Nombrar Hato' : 'Confirmar Potrero ($defaultPotreroLetter)',
                                  style: GoogleFonts.outfit(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Text(
                                  isHato
                                      ? 'Lindero perimetral exterior cerrado'
                                      : 'Perteneciente a: ${widget.parentHato?.nombre ?? "Hato"}',
                                  style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // Tarjeta de Resumen Geodésico
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.cardBorder),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Column(
                              children: [
                                Text(
                                  'SUPERFICIE',
                                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${areaHa.toStringAsFixed(2)} Ha',
                                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.emeraldGreen),
                                ),
                                Text(
                                  '${areaM2.toStringAsFixed(0)} m²',
                                  style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                            Container(width: 1, height: 35, color: AppTheme.cardBorder),
                            Column(
                              children: [
                                Text(
                                  'PERÍMETRO',
                                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${perimeterM.toStringAsFixed(1)} m',
                                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.primaryCyan),
                                ),
                                Text(
                                  '${drawing.vertexCount} vértices',
                                  style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      if (isHato) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.emeraldGreen.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.emeraldGreen.withValues(alpha: 0.35)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.domain_rounded, color: AppTheme.emeraldGreen, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'ADQUIRIENTE SELECCIONADO',
                                      style: GoogleFonts.inter(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.emeraldGreen,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    Text(
                                      widget.tenantNombre ?? 'Adquiriente #${widget.tenantId ?? 1}',
                                      style: GoogleFonts.outfit(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.surfaceLight,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: AppTheme.cardBorder),
                                ),
                                child: Text(
                                  'ID: ${widget.tenantId ?? 1}',
                                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryCyan.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.primaryCyan.withValues(alpha: 0.35)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.grid_view_rounded, color: AppTheme.primaryCyan, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'ADQUIRIENTE & HATO PADRE',
                                      style: GoogleFonts.inter(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.primaryCyan,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    Text(
                                      '${widget.tenantNombre ?? "Adquiriente"} • ${widget.parentHato?.nombre ?? "Hato"}',
                                      style: GoogleFonts.outfit(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Campo Nombre
                      Text(
                        isHato ? 'NOMBRE DEL HATO MAESTRO' : 'NOMBRE DEL POTRERO (LETRA ASIGNADA)',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: nameCtrl,
                        style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: AppTheme.surfaceLight,
                          hintText: isHato ? 'Ej. Hato La Esperanza' : 'Ej. Potrero A',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          prefixIcon: Icon(
                            isHato ? Icons.label_important_outline : Icons.sort_by_alpha,
                            color: isHato ? AppTheme.warningAmber : AppTheme.primaryCyan,
                            size: 20,
                          ),
                        ),
                      ),

                      if (isHato) ...[
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'DISTANCIA DE ALARMA INTERIOR',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.warningAmber,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.warningAmber.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Alarma Animal',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.warningAmber,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'El collar sonará cuando el animal esté a esta distancia en metros antes de alcanzar el límite del hato para evitar que se escape.',
                          style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: 8),

                        // Campo Numérico Directo para Distancia
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: warningDistanceCtrl,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                style: GoogleFonts.outfit(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.textPrimary,
                                ),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: AppTheme.surfaceLight,
                                  hintText: 'Ej. 25',
                                  suffixText: 'metros',
                                  suffixStyle: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.warningAmber,
                                  ),
                                  prefixIcon: const Icon(
                                    Icons.notification_important_outlined,
                                    color: AppTheme.warningAmber,
                                    size: 20,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide.none,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Chips de sugerencia rápida
                        Row(
                          children: [10, 15, 25, 35, 50].map((dist) {
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: InkWell(
                                onTap: () {
                                  warningDistanceCtrl.text = '$dist';
                                  setDlgState(() {});
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.surfaceLight,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppTheme.cardBorder),
                                  ),
                                  child: Text(
                                    '${dist}m',
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 14),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'Permitir al productor crear potreros',
                                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                              ),
                            ),
                            Switch(
                              value: permiteCrearPotreros,
                              activeThumbColor: AppTheme.emeraldGreen,
                              onChanged: (v) => setDlgState(() => permiteCrearPotreros = v),
                            ),
                          ],
                        ),
                      ],

                      const SizedBox(height: 14),
                      Text(
                        'NOTAS O TIPO DE PASTO',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: notesCtrl,
                        maxLines: 2,
                        style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: AppTheme.surfaceLight,
                          hintText: 'Ej. Pastura Mombasa, cerco eléctrico, relieve plano...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),

                      const SizedBox(height: 22),

                      // Botones Cancelar y Guardar
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: isSaving ? null : () => Navigator.pop(ctx),
                            child: Text(
                              'Ajustar Vértices',
                              style: GoogleFonts.inter(
                                color: isSaving ? AppTheme.textMuted : AppTheme.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isSaving ? AppTheme.surfaceLight : AppTheme.emeraldGreen,
                              foregroundColor: isSaving ? AppTheme.textMuted : Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: isSaving
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.emeraldGreen),
                                  )
                                : const Icon(Icons.cloud_done_rounded, size: 18),
                            label: Text(
                              isSaving ? 'Guardando...' : 'Guardar',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 13),
                            ),
                            onPressed: isSaving
                                ? null
                                : () async {
                                    setDlgState(() => isSaving = true);
                                    final name = nameCtrl.text.trim().isNotEmpty
                                        ? nameCtrl.text.trim()
                                        : (isHato ? 'Hato Principal' : 'Potrero $defaultPotreroLetter');

                                    try {
                                      if (isHato) {
                                        final parsedWarning = double.tryParse(warningDistanceCtrl.text.trim()) ?? 25.0;
                                        final newHato = Hato(
                                          id: 'hato_${DateTime.now().millisecondsSinceEpoch}',
                                          nombre: name,
                                          areaHa: areaHa,
                                          perimeterM: perimeterM,
                                          vertices: List<LatLng>.from(drawing.draftVertices),
                                          color: selectedColor,
                                          notas: notesCtrl.text.trim().isNotEmpty ? notesCtrl.text.trim() : null,
                                          warningWidthM: parsedWarning,
                                          permiteCrearPotreros: permiteCrearPotreros,
                                        );
                                        await agro.addHato(newHato, tenantId: widget.tenantId);
                                      } else if (widget.parentHato != null) {
                                        final newPotrero = Potrero(
                                          id: 'pot_${DateTime.now().millisecondsSinceEpoch}',
                                          nombre: name,
                                          hatoId: widget.parentHato!.id,
                                          areaHa: areaHa,
                                          perimeterM: perimeterM,
                                          vertices: List<LatLng>.from(drawing.draftVertices),
                                          color: selectedColor,
                                          notas: notesCtrl.text.trim().isNotEmpty ? notesCtrl.text.trim() : null,
                                        );
                                        await agro.addPotreroToHato(widget.parentHato!.id, newPotrero);
                                      }

                                      drawing.cancelDrawing();
                                      if (context.mounted) {
                                        Navigator.pop(ctx); // Cierra diálogo
                                        Navigator.pop(context); // Vuelve a pantalla principal de Hatos
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            backgroundColor: AppTheme.emeraldGreen,
                                            content: Row(
                                              children: [
                                                const Icon(Icons.check_circle, color: Colors.white),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Text(
                                                    '✅ "$name" guardado y sincronizado con CollarNet!',
                                                    style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      }
                                    } catch (err) {
                                      setDlgState(() => isSaving = false);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            backgroundColor: AppTheme.dangerRed,
                                            content: Text('Error al guardar: $err'),
                                          ),
                                        );
                                      }
                                    }
                                  },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final agro = context.watch<AgroProvider>();
    final drawing = context.watch<DrawingProvider>();
    final isHato = widget.drawingType == DrawingType.hato;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // ==========================================
          // 1. MAPA SATELITAL
          // ==========================================
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: GPSService.defaultFarmLocation,
              initialZoom: 16.0,
              onTap: (tapPosition, point) {
                if (_currentMethod == CreationMethod.satelliteMap &&
                    drawing.isDrawing &&
                    !drawing.isEraserMode) {
                  final added = drawing.addVertex(point, agro);
                  if (added && drawing.lastPointWasSnapped && mounted) {
                    ScaffoldMessenger.of(context).hideCurrentSnackBar();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: AppTheme.warningAmber,
                        duration: const Duration(milliseconds: 1500),
                        behavior: SnackBarBehavior.floating,
                        margin: const EdgeInsets.only(bottom: 90, left: 24, right: 24),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        content: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.auto_fix_high, color: Colors.black, size: 16),
                            const SizedBox(width: 8),
                            Text(
                              '🧲 Vértice auto-aproximado a la geocerca',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Colors.black, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: _getTileUrl(),
                userAgentPackageName: 'com.cowia.movil_ops',
                maxZoom: 19,
              ),

              // ==========================================
              // 2. CAPAS DE POLÍGONOS GUARDADOS
              // ==========================================
              PolygonLayer(
                polygons: [
                  // Hatos Maestros existentes
                  ...agro.hatos.map((h) {
                    final isParent = widget.parentHato?.id == h.id;
                    return Polygon(
                      points: h.vertices,
                      color: isParent
                          ? AppTheme.warningAmber.withValues(alpha: 0.15)
                          : h.color.withValues(alpha: 0.10),
                      borderColor: isParent ? AppTheme.warningAmber : h.color,
                      borderStrokeWidth: isParent ? 3.0 : 1.8,
                    );
                  }),

                  // Potreros existentes
                  ...agro.hatos.expand((h) => h.potreros).map((p) {
                    return Polygon(
                      points: p.vertices,
                      color: p.color.withValues(alpha: 0.25),
                      borderColor: p.color,
                      borderStrokeWidth: 1.8,
                    );
                  }),

                  // POLÍGONO EN TRAZADO ACTUAL (VISTA PREVIA ÁREA CERRADA)
                  if (drawing.draftVertices.length >= 3)
                    Polygon(
                      points: drawing.draftVertices,
                      color: (isHato ? AppTheme.warningAmber : AppTheme.primaryCyan).withValues(alpha: 0.28),
                      borderColor: isHato ? AppTheme.warningAmber : AppTheme.primaryCyan,
                      borderStrokeWidth: 2.8,
                    ),
                ],
              ),

              // ==========================================
              // 3. LÍNEAS PERIMETRALES Y ALERTAS
              // ==========================================
              PolylineLayer(
                polylines: [
                  if (drawing.draftVertices.length >= 2)
                    Polyline(
                      points: drawing.draftVertices,
                      color: drawing.isEraserMode
                          ? AppTheme.dangerRed
                          : (isHato ? AppTheme.warningAmber : AppTheme.primaryCyan),
                      strokeWidth: 3.2,
                    ),

                  if (agro.activeAlert?.offendingSegment != null &&
                      agro.activeAlert!.offendingSegment!.length >= 2)
                    Polyline(
                      points: agro.activeAlert!.offendingSegment!,
                      color: AppTheme.dangerRed,
                      strokeWidth: 4.5,
                    ),
                ],
              ),

              // ==========================================
              // 4. IMANES DE SNAPPING
              // ==========================================
              if (drawing.isDrawing && !drawing.isEraserMode)
                MarkerLayer(
                  markers: drawing.activeSnapPoints.map((pt) {
                    return Marker(
                      point: pt,
                      width: 22,
                      height: 22,
                      child: GestureDetector(
                        onTap: () => drawing.addVertex(pt, agro),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme.warningAmber,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.black, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.warningAmber.withValues(alpha: 0.6),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: const Icon(Icons.flare, size: 10, color: Colors.black),
                        ),
                      ),
                    );
                  }).toList(),
                ),

              // ==========================================
              // 5. MARCADORES DE VÉRTICES (NÚMEROS)
              // ==========================================
              if (drawing.isDrawing && !drawing.isEraserMode)
                MarkerLayer(
                  markers: drawing.draftVertices.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final pt = entry.value;
                    final isFirst = idx == 0;
                    return Marker(
                      point: pt,
                      width: 20,
                      height: 20,
                      child: Container(
                        decoration: BoxDecoration(
                          color: isFirst ? AppTheme.primaryCyan : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.black87, width: 1.8),
                        ),
                        child: Center(
                          child: Text(
                            '${idx + 1}',
                            style: GoogleFonts.inter(
                              color: isFirst ? Colors.white : Colors.black,
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
              // 6. MODO BORRADOR SELECTIVO (ROJOS)
              // ==========================================
              if (drawing.isDrawing && drawing.isEraserMode)
                MarkerLayer(
                  markers: drawing.draftVertices.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final pt = entry.value;
                    return Marker(
                      point: pt,
                      width: 34,
                      height: 34,
                      child: GestureDetector(
                        onTap: () => drawing.removeVertexAt(idx),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme.dangerRed,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.dangerRed.withValues(alpha: 0.6),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: const Icon(Icons.close, size: 16, color: Colors.white),
                        ),
                      ),
                    );
                  }).toList(),
                ),

              // ==========================================
              // 7. UBICACIÓN GPS ACTUAL
              // ==========================================
              if (_currentGPS != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _currentGPS!.position,
                      width: 24,
                      height: 24,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppTheme.primaryCyan,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: const [
                            BoxShadow(color: Colors.black45, blurRadius: 4),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // ==========================================
          // 8. BARRA SUPERIOR DE MODALIDAD (4 MÉTODOS)
          // ==========================================
          Positioned(
            top: 10,
            left: 14,
            right: 14,
            child: SafeArea(
              child: Column(
                children: [
                  _buildTopBar(isHato),
                  const SizedBox(height: 8),
                  _buildMethodSelector(),
                ],
              ),
            ),
          ),

          // ==========================================
          // 9. HUD FLOTANTE SEGÚN EL MÉTODO ACTIVO
          // ==========================================
          if (_currentMethod == CreationMethod.gpsWaypoints)
            Positioned(
              top: 130,
              left: 14,
              right: 14,
              child: SafeArea(child: _buildGpsWaypointHud(drawing)),
            ),

          if (_currentMethod == CreationMethod.gpsRoute)
            Positioned(
              top: 130,
              left: 14,
              right: 14,
              child: SafeArea(child: _buildGpsRouteHud(drawing)),
            ),

          // ==========================================
          // 10. BOTONES FLOTANTES MAPA (DESHACER / BORRADOR / CENTRAR GPS)
          // ==========================================
          Positioned(
            right: 14,
            bottom: 120,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'center_gps_btn',
                  backgroundColor: AppTheme.surface,
                  foregroundColor: AppTheme.primaryCyan,
                  tooltip: 'Centrar en mi GPS',
                  onPressed: _centerOnGPS,
                  child: const Icon(Icons.my_location),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'undo_vertex_btn',
                  backgroundColor: AppTheme.surface,
                  foregroundColor: AppTheme.textPrimary,
                  tooltip: 'Deshacer Vértice',
                  onPressed: drawing.vertexCount > 0 ? () => drawing.undoLastVertex() : null,
                  child: const Icon(Icons.undo),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'eraser_mode_btn',
                  backgroundColor: drawing.isEraserMode ? AppTheme.dangerRed : AppTheme.surface,
                  foregroundColor: drawing.isEraserMode ? Colors.white : AppTheme.textPrimary,
                  tooltip: 'Modo Borrador',
                  onPressed: drawing.vertexCount > 0
                      ? () {
                          if (drawing.isEraserMode) {
                            drawing.saveEraserChanges();
                          } else {
                            drawing.enterEraserMode();
                          }
                        }
                      : null,
                  child: Icon(drawing.isEraserMode ? Icons.check : Icons.backspace_outlined),
                ),
              ],
            ),
          ),

          // ==========================================
          // 11. BANNER DE ALERTA TOPOLÓGICA
          // ==========================================
          const TopologyAlertBanner(),

          // ==========================================
          // 12. BARRA INFERIOR DE VISTA PREVIA Y CONFIRMAR
          // ==========================================
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildBottomPreviewSheet(drawing, isHato),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // WIDGETS AUXILIARES DE INTERFAZ
  // ==========================================

  Widget _buildTopBar(bool isHato) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close, color: AppTheme.textPrimary, size: 20),
            onPressed: () {
              context.read<DrawingProvider>().cancelDrawing();
              Navigator.pop(context);
            },
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isHato ? 'NUEVO HATO MAESTRO' : 'NUEVO POTRERO',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isHato ? AppTheme.warningAmber : AppTheme.primaryCyan,
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  isHato
                      ? 'Adquiriente: ${widget.tenantNombre ?? "ID #${widget.tenantId ?? 1}"}'
                      : '${widget.tenantNombre ?? "Finca"} • Hato: ${widget.parentHato?.nombre ?? ""}',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: isHato ? AppTheme.emeraldGreen : AppTheme.primaryCyan,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Selector de capa
          PopupMenuButton<MapTileType>(
            icon: const Icon(Icons.layers_outlined, color: AppTheme.textSecondary, size: 20),
            tooltip: 'Tipo de Mapa',
            color: AppTheme.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (type) => setState(() => _currentTileType = type),
            itemBuilder: (_) => [
              PopupMenuItem(
                value: MapTileType.satellite,
                child: Text('Satelital HD', style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 12)),
              ),
              PopupMenuItem(
                value: MapTileType.osm,
                child: Text('OpenStreetMap', style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 12)),
              ),
              PopupMenuItem(
                value: MapTileType.dark,
                child: Text('Modo Oscuro', style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMethodSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Row(
        children: [
          _buildMethodTab(
            method: CreationMethod.satelliteMap,
            label: '1. Satélite',
            icon: Icons.touch_app_outlined,
            color: AppTheme.primaryCyan,
          ),
          _buildMethodTab(
            method: CreationMethod.gpsWaypoints,
            label: '2. Puntos GPS',
            icon: Icons.pin_drop_outlined,
            color: AppTheme.warningAmber,
          ),
          _buildMethodTab(
            method: CreationMethod.gpsRoute,
            label: '3. Ruta GPS',
            icon: Icons.two_wheeler_outlined,
            color: AppTheme.emeraldGreen,
          ),
        ],
      ),
    );
  }

  Widget _buildMethodTab({
    required CreationMethod method,
    required String label,
    required IconData icon,
    required Color color,
  }) {
    final isSel = _currentMethod == method;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentMethod = method),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSel ? color.withValues(alpha: 0.18) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSel ? color : Colors.transparent,
              width: 1.2,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: isSel ? color : AppTheme.textMuted),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
                  color: isSel ? color : AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGpsWaypointHud(DrawingProvider drawing) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_searching_rounded, color: AppTheme.warningAmber, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pararse en el Vértice / Esquina',
                  style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                ),
                Text(
                  'Puntos guardados: ${drawing.vertexCount}',
                  style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: _captureCurrentLocationVertex,
            icon: const Icon(Icons.add_location_alt_rounded, size: 14),
            label: Text('Guardar Punto', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.warningAmber,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGpsRouteHud(DrawingProvider drawing) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.emeraldGreen.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Icon(
            _isRecordingRoute ? Icons.fiber_manual_record : Icons.play_arrow,
            color: _isRecordingRoute ? AppTheme.dangerRed : AppTheme.emeraldGreen,
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isRecordingRoute ? 'Grabando Ruta en Vivo' : 'Recorrido en Terreno (Moto/A pie)',
                  style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                ),
                Text(
                  _isRecordingRoute
                      ? 'Vértices: ${drawing.vertexCount} | Precisión: ±${_lastGpsAccuracy.toStringAsFixed(1)}m'
                      : 'Recorre el perímetro de la cerca',
                  style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _toggleRouteRecording,
            style: ElevatedButton.styleFrom(
              backgroundColor: _isRecordingRoute ? AppTheme.dangerRed : AppTheme.emeraldGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              _isRecordingRoute ? 'Pausar' : 'Iniciar Ruta',
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomPreviewSheet(DrawingProvider drawing, bool isHato) {
    final areaHa = drawing.currentAreaHa;
    final perimeterM = GISService.calculateGeodesicPerimeterM(drawing.draftVertices, isClosed: drawing.vertexCount >= 3);
    final canConfirm = drawing.vertexCount >= 3;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 15, offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Resumen de Área Cerrada
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      canConfirm ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: canConfirm ? AppTheme.emeraldGreen : AppTheme.textMuted,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      canConfirm ? 'Área Cerrada Calculada:' : 'Trazando perímetro (${drawing.vertexCount} pts):',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
                Text(
                  '${areaHa.toStringAsFixed(2)} Ha',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: canConfirm ? AppTheme.emeraldGreen : AppTheme.textMuted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Fila de Métricas Rápidas + Botón Confirmar
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.timeline, size: 14, color: AppTheme.primaryCyan),
                      const SizedBox(width: 4),
                      Text(
                        '${perimeterM.toStringAsFixed(0)} m',
                        style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),

                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: ElevatedButton.icon(
                      onPressed: canConfirm ? _onConfirmAndSave : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isHato ? AppTheme.warningAmber : AppTheme.emeraldGreen,
                        foregroundColor: Colors.black,
                        disabledBackgroundColor: AppTheme.surfaceLight,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.check_circle_outline, size: 18),
                      label: Text(
                        'Confirmar y Guardar',
                        style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
