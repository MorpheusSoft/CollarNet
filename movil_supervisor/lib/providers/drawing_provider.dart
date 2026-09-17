import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../services/gis_service.dart';
import 'agro_provider.dart';

enum DrawingType { hato, potrero }

class DrawingProvider extends ChangeNotifier {
  bool _isDrawing = false;
  bool get isDrawing => _isDrawing;

  DrawingType? _drawingType;
  DrawingType? get drawingType => _drawingType;

  String? _parentHatoId;
  String? get parentHatoId => _parentHatoId;

  List<LatLng> _draftVertices = [];
  List<LatLng> get draftVertices => List.unmodifiable(_draftVertices);

  // Modo Borrador Selectivo (Eraser Mode)
  bool _isEraserMode = false;
  bool get isEraserMode => _isEraserMode;

  List<LatLng> _backupVertices = [];
  List<LatLng> get backupVertices => List.unmodifiable(_backupVertices);

  // Puntos de Snap interactivos activos
  List<LatLng> _activeSnapPoints = [];
  List<LatLng> get activeSnapPoints => _activeSnapPoints;

  // Métricas en tiempo real
  double get currentAreaHa => GISService.calculateGeodesicAreaHa(_draftVertices);
  double get currentAreaM2 => GISService.calculateGeodesicAreaM2(_draftVertices);
  double get currentPerimeterM => GISService.calculateGeodesicPerimeterM(_draftVertices, isClosed: false);
  int get vertexCount => _draftVertices.length;

  // ==========================================
  // INICIO Y CONTROL DE TRAZADO
  // ==========================================

  void startDrawingHato(List<Hato> existingHatos) {
    _isDrawing = true;
    _drawingType = DrawingType.hato;
    _parentHatoId = null;
    _draftVertices = [];
    _isEraserMode = false;
    _backupVertices = [];
    _activeSnapPoints = GISService.collectAllSnapPoints(existingHatos);
    notifyListeners();
  }

  void startDrawingPotrero(String hatoId, List<Hato> existingHatos) {
    _isDrawing = true;
    _drawingType = DrawingType.potrero;
    _parentHatoId = hatoId;
    _draftVertices = [];
    _isEraserMode = false;
    _backupVertices = [];
    _activeSnapPoints = GISService.collectAllSnapPoints(existingHatos);
    notifyListeners();
  }

  void cancelDrawing() {
    _isDrawing = false;
    _drawingType = null;
    _parentHatoId = null;
    _draftVertices = [];
    _isEraserMode = false;
    _backupVertices = [];
    _activeSnapPoints = [];
    notifyListeners();
  }

  // ==========================================
  // AGREGADO DE VÉRTICES Y SNAPPING
  // ==========================================

  /// Intenta agregar un nuevo vértice aplicando snapping y validación topológica
  bool addVertex(LatLng rawPoint, AgroProvider agroProvider) {
    if (!_isDrawing || _isEraserMode) return false;

    // 1. Aplicar Snapping con tolerancia
    final LatLng snappedPoint = GISService.applySnapping(rawPoint, _activeSnapPoints);

    // Evitar agregar el mismo punto duplicado consecutivo
    if (_draftVertices.isNotEmpty && GISService.arePointsEqual(_draftVertices.last, snappedPoint)) {
      return false;
    }

    // 2. Obtener contexto de Hatos y Potreros
    final bool isHato = _drawingType == DrawingType.hato;
    final existingHatos = agroProvider.hatos;
    Hato? parentHato;
    List<Potrero>? siblingPotreros;

    if (!isHato && _parentHatoId != null) {
      try {
        parentHato = existingHatos.firstWhere((h) => h.id == _parentHatoId);
        siblingPotreros = parentHato.potreros;
      } catch (_) {}
    }

    // 3. Validación topológica estricta del nuevo tramo
    final validation = GISService.validateNewVertex(
      currentVertices: _draftVertices,
      newVertex: snappedPoint,
      isHato: isHato,
      existingHatos: existingHatos,
      parentHato: parentHato,
      siblingPotreros: siblingPotreros,
    );

    if (!validation.isValid) {
      // Disparar sistema de alerta visual en el mapa
      agroProvider.showTopologyAlert(
        validation.errorMessage ?? 'Error de validación topológica',
        conflictPoint: validation.conflictPoint,
        offendingSegment: validation.offendingSegment,
      );
      return false;
    }

    // 4. Agregar vértice y actualizar métricas
    _draftVertices.add(snappedPoint);
    notifyListeners();
    return true;
  }

  /// Deshacer último punto ingresado
  void undoLastVertex() {
    if (_draftVertices.isNotEmpty && !_isEraserMode) {
      _draftVertices.removeLast();
      notifyListeners();
    }
  }

  // ==========================================
  // MODO BORRADOR SELECTIVO (ERASER MODE)
  // ==========================================

  void enterEraserMode() {
    if (!_isDrawing || _draftVertices.isEmpty) return;
    _isEraserMode = true;
    // Guardar copia de seguridad temporal
    _backupVertices = List<LatLng>.from(_draftVertices);
    notifyListeners();
  }

  void removeVertexAt(int index) {
    if (!_isEraserMode) return;
    if (index >= 0 && index < _draftVertices.length) {
      _draftVertices.removeAt(index);
      notifyListeners();
    }
  }

  void saveEraserChanges() {
    _isEraserMode = false;
    _backupVertices = [];
    notifyListeners();
  }

  void discardEraserChanges() {
    _draftVertices = List<LatLng>.from(_backupVertices);
    _isEraserMode = false;
    _backupVertices = [];
    notifyListeners();
  }

  // ==========================================
  // FINALIZACIÓN Y GUARDADO DE POLÍGONO
  // ==========================================

  TopologyValidationResult validateFinalPolygon(AgroProvider agroProvider) {
    if (_draftVertices.length < 3) {
      return TopologyValidationResult.invalid(
        message: 'Se requieren mínimo 3 vértices para formar un polígono agrícola cerrado.',
      );
    }

    final bool isHato = _drawingType == DrawingType.hato;
    final existingHatos = agroProvider.hatos;
    Hato? parentHato;
    List<Potrero>? siblingPotreros;

    if (!isHato && _parentHatoId != null) {
      try {
        parentHato = existingHatos.firstWhere((h) => h.id == _parentHatoId);
        siblingPotreros = parentHato.potreros;
      } catch (_) {}
    }

    return GISService.validatePolygonCompletion(
      vertices: _draftVertices,
      isHato: isHato,
      existingHatos: existingHatos,
      parentHato: parentHato,
      siblingPotreros: siblingPotreros,
    );
  }
}
