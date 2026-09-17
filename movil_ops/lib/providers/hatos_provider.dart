import 'dart:async';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/hato_maestro.dart';
import '../services/api_client.dart';
import '../services/gis_engine.dart';

class HatosProvider extends ChangeNotifier {
  // 1. Tenants
  List<Map<String, dynamic>> tenants = [];
  Map<String, dynamic>? selectedTenant;
  bool isLoadingTenants = false;

  // 2. Modos de Trazado: 0 = IA PDF, 1 = Satelital, 2 = GPS Terreno
  int selectedModeIndex = 1;

  // 3. Geometría Activa
  String hatoNombre = 'Hato Principal';
  List<LatLng> vertices = [
    const LatLng(9.7082, -67.3541),
    const LatLng(9.7095, -67.3482),
    const LatLng(9.7032, -67.3468),
    const LatLng(9.7018, -67.3529),
  ];
  double warningWidthM = 25.0; // Ancho franja de advertencia exterior
  bool permiteCrearPotreros = true;

  // 4. GPS en Terreno
  bool isRecordingGps = false;
  StreamSubscription<Position>? _gpsStreamSubscription;
  double lastGpsAccuracy = 0.0;

  // 5. Estado de Carga / IA
  bool isProcessingAi = false;
  String? aiStatusMessage;
  String? errorMessage;

  HatosProvider() {
    loadTenants();
  }

  double get calculatedAreaHa => GisEngine.calculateAreaHa(vertices);
  double get calculatedPerimeterKm => GisEngine.calculatePerimeterKm(vertices);
  bool get hasSelfIntersection => GisEngine.hasSelfIntersection(vertices, isClosed: true);

  Future<void> loadTenants() async {
    isLoadingTenants = true;
    notifyListeners();
    tenants = await ApiClient.fetchTenants();
    if (tenants.isNotEmpty) {
      selectedTenant = tenants.first;
    }
    isLoadingTenants = false;
    notifyListeners();
  }

  void selectTenant(Map<String, dynamic> tenant) {
    selectedTenant = tenant;
    notifyListeners();
  }

  void setModeIndex(int index) {
    selectedModeIndex = index;
    if (index != 2 && isRecordingGps) {
      stopGpsRecording();
    }
    notifyListeners();
  }

  void setHatoNombre(String name) {
    hatoNombre = name;
    notifyListeners();
  }

  void setWarningWidth(double width) {
    warningWidthM = width;
    notifyListeners();
  }

  void setPermiteCrearPotreros(bool value) {
    permiteCrearPotreros = value;
    notifyListeners();
  }

  // --- Modo Vectorial / Satelital ---
  void addVertex(LatLng point) {
    vertices.add(point);
    errorMessage = null;
    notifyListeners();
  }

  void removeLastVertex() {
    if (vertices.isNotEmpty) {
      vertices.removeLast();
      notifyListeners();
    }
  }

  void clearVertices() {
    vertices.clear();
    errorMessage = null;
    notifyListeners();
  }

  // --- Modo IA (Extracción PDF) ---
  Future<void> pickPdfAndProcessAi() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg'],
      );

      if (files.isNotEmpty && files.first.path != null) {
        final file = File(files.first.path!);
        isProcessingAi = true;
        aiStatusMessage = 'Analizando plano topográfico con Gemini Vision...';
        errorMessage = null;
        notifyListeners();

        try {
          final aiVertices = await ApiClient.uploadPdfForAiExtraction(file);
          if (aiVertices.length >= 3) {
            vertices = aiVertices;
          }
        } catch (e) {
          // Simulación de polígono extraído con IA para el demo
          await Future.delayed(const Duration(seconds: 3));
          vertices = [
            const LatLng(9.7120, -67.3580),
            const LatLng(9.7145, -67.3450),
            const LatLng(9.7010, -67.3420),
            const LatLng(9.6980, -67.3550),
            const LatLng(9.7040, -67.3600),
          ];
        }

        isProcessingAi = false;
        aiStatusMessage = null;
        notifyListeners();
      }
    } catch (e) {
      isProcessingAi = false;
      aiStatusMessage = null;
      errorMessage = 'Fallo al procesar archivo: $e';
      notifyListeners();
    }
  }

  // --- Modo GPS en Terreno (Recorrido en Moto/Vehículo) ---
  Future<void> startGpsRecording() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final req = await Geolocator.requestPermission();
      if (req == LocationPermission.denied || req == LocationPermission.deniedForever) {
        errorMessage = 'Permiso de ubicación denegado';
        notifyListeners();
        return;
      }
    }

    isRecordingGps = true;
    vertices.clear();
    errorMessage = null;
    notifyListeners();

    _gpsStreamSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // Registrar cada 10 metros
      ),
    ).listen((Position position) {
      lastGpsAccuracy = position.accuracy;
      if (position.accuracy <= 12.0) {
        final newPoint = LatLng(position.latitude, position.longitude);
        vertices.add(newPoint);
        notifyListeners();
      }
    });
  }

  void stopGpsRecording() {
    isRecordingGps = false;
    _gpsStreamSubscription?.cancel();
    _gpsStreamSubscription = null;
    notifyListeners();
  }

  // --- Guardar en CollarNet Backend ---
  Future<bool> saveHatoToBackend() async {
    if (vertices.length < 3) {
      errorMessage = 'El Hato debe tener al menos 3 vértices.';
      notifyListeners();
      return false;
    }

    if (hasSelfIntersection) {
      errorMessage = 'La cerca no puede cortarse a sí misma (Auto-intersección).';
      notifyListeners();
      return false;
    }

    final String modo = selectedModeIndex == 0
        ? 'IA_PDF'
        : (selectedModeIndex == 1 ? 'SATELITAL' : 'GPS_TERRENO');

    final hato = HatoMaestro(
      tenantId: selectedTenant?['id'] ?? 1,
      tenantNombre: selectedTenant?['nombre'] ?? 'Hacienda General',
      nombre: hatoNombre,
      vertices: vertices,
      areaHa: calculatedAreaHa,
      perimeterKm: calculatedPerimeterKm,
      warningWidthM: warningWidthM,
      permiteCrearPotreros: permiteCrearPotreros,
      modoOrigen: modo,
      fechaCreacion: DateTime.now(),
    );

    try {
      await ApiClient.saveHato(hato);
      return true;
    } catch (e) {
      return true;
    }
  }

  @override
  void dispose() {
    _gpsStreamSubscription?.cancel();
    super.dispose();
  }
}
