import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../models/topology_alert.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

class AgroProvider extends ChangeNotifier {
  static final ApiService _apiService = ApiService();

  List<Hato> _hatos = [];
  List<Hato> get hatos => _hatos;

  Hato? _selectedHato;
  Hato? get selectedHato => _selectedHato;

  Potrero? _selectedPotrero;
  Potrero? get selectedPotrero => _selectedPotrero;

  LatLng? _focusedLocation;
  LatLng? get focusedLocation => _focusedLocation;

  TopologyAlert? _activeAlert;
  TopologyAlert? get activeAlert => _activeAlert;
  Timer? _alertTimer;

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  // Telemetría en vivo del ganado (Posición de reses)
  List<Map<String, dynamic>> _animalesMonitoreo = [];
  List<Map<String, dynamic>> get animalesMonitoreo => _animalesMonitoreo;

  // Bandera de Permiso otorgada por el Técnico para crear/subdividir potreros
  bool get permiteCrearPotreros =>
      _selectedHato?.permiteCrearPotreros ??
      (_hatos.isNotEmpty ? _hatos.first.permiteCrearPotreros : false);

  AgroProvider() {
    _initData();
  }

  Future<void> _initData() async {
    _isLoading = true;
    notifyListeners();
    _hatos = await StorageService.loadHatos();
    await fetchAnimalesMonitoreo();
    _isLoading = false;
    notifyListeners();
  }

  /// Recarga los datos desde la API central y actualiza el estado
  Future<void> reloadFromApi() async {
    _isLoading = true;
    notifyListeners();
    try {
      final remoteHatos = await _apiService.fetchHatos();
      if (remoteHatos.isNotEmpty) {
        _hatos = remoteHatos;
        await StorageService.cacheLocally(_hatos);
      }
      await fetchAnimalesMonitoreo();
    } catch (e) {
      debugPrint('Error recargando desde API: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Obtiene la ubicación en vivo de todos los animales vinculados con collar
  Future<void> fetchAnimalesMonitoreo() async {
    try {
      final list = await _apiService.fetchMonitoreo(hatoId: _selectedHato?.id);
      if (list.isNotEmpty) {
        _animalesMonitoreo = list;
        notifyListeners();
      }
    } catch (_) {}
  }

  // ==========================================
  // MANEJO DE SELECCIÓN Y ENFOQUE
  // ==========================================

  void selectHato(Hato? hato) {
    _selectedHato = hato;
    _selectedPotrero = null;
    if (hato != null && hato.vertices.isNotEmpty) {
      _focusedLocation = hato.vertices.first;
    }
    fetchAnimalesMonitoreo();
    notifyListeners();
  }

  void selectPotrero(Potrero? potrero, {Hato? parentHato}) {
    _selectedPotrero = potrero;
    if (parentHato != null) {
      _selectedHato = parentHato;
    }
    if (potrero != null && potrero.vertices.isNotEmpty) {
      _focusedLocation = potrero.vertices.first;
    }
    notifyListeners();
  }

  void clearSelection() {
    _selectedHato = null;
    _selectedPotrero = null;
    notifyListeners();
  }

  void setFocusedLocation(LatLng? location) {
    _focusedLocation = location;
    notifyListeners();
  }

  // ==========================================
  // GESTIÓN DE POTREROS (Permitida si el técnico autorizó)
  // ==========================================

  Future<void> addPotreroToHato(String hatoId, Potrero newPotrero) async {
    try {
      final savedPotrero = await _apiService.savePotrero(newPotrero);
      final index = _hatos.indexWhere((h) => h.id == hatoId);
      if (index != -1) {
        _hatos[index].potreros.add(savedPotrero);
        await StorageService.cacheLocally(_hatos);
        notifyListeners();
      }
    } catch (e) {
      // Fallback local
      final index = _hatos.indexWhere((h) => h.id == hatoId);
      if (index != -1) {
        _hatos[index].potreros.add(newPotrero);
        await StorageService.cacheLocally(_hatos);
        notifyListeners();
      }
    }
  }

  Future<void> updatePotrero(String hatoId, Potrero updatedPotrero) async {
    try {
      await _apiService.savePotrero(updatedPotrero);
    } catch (_) {}

    final hatoIndex = _hatos.indexWhere((h) => h.id == hatoId);
    if (hatoIndex != -1) {
      final potreroIndex =
          _hatos[hatoIndex].potreros.indexWhere((p) => p.id == updatedPotrero.id);
      if (potreroIndex != -1) {
        _hatos[hatoIndex].potreros[potreroIndex] = updatedPotrero;
        await StorageService.cacheLocally(_hatos);
        notifyListeners();
      }
    }
  }

  Future<void> deletePotrero(String hatoId, String potreroId) async {
    try {
      await _apiService.deletePotrero(potreroId);
    } catch (_) {}

    final hatoIndex = _hatos.indexWhere((h) => h.id == hatoId);
    if (hatoIndex != -1) {
      _hatos[hatoIndex].potreros.removeWhere((p) => p.id == potreroId);
      if (_selectedPotrero?.id == potreroId) {
        _selectedPotrero = null;
      }
      await StorageService.cacheLocally(_hatos);
      notifyListeners();
    }
  }

  // ==========================================
  // MANEJO DE ALERTAS TOPOLÓGICAS (HUD 5 SEG)
  // ==========================================

  void triggerAlert(TopologyAlert alert) {
    _alertTimer?.cancel();
    _activeAlert = alert;
    notifyListeners();

    _alertTimer = Timer(const Duration(seconds: 5), () {
      _activeAlert = null;
      notifyListeners();
    });
  }

  void showTopologyAlert(String message, {LatLng? conflictPoint, List<LatLng>? offendingSegment}) {
    triggerAlert(TopologyAlert(
      id: 'alert_${DateTime.now().millisecondsSinceEpoch}',
      message: message,
      conflictPoint: conflictPoint,
      offendingSegment: offendingSegment,
    ));
  }

  void dismissAlert() {
    _alertTimer?.cancel();
    _activeAlert = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _alertTimer?.cancel();
    super.dispose();
  }
}
