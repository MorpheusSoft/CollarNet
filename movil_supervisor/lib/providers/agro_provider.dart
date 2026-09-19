import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../models/topology_alert.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../services/gis_service.dart';

class DeletionCheckResult {
  final bool canDelete;
  final String? reason;
  final int totalAnimals;
  final int assignedCount;
  final int gpsCount;
  final List<String> animalAretes;

  DeletionCheckResult({
    required this.canDelete,
    this.reason,
    this.totalAnimals = 0,
    this.assignedCount = 0,
    this.gpsCount = 0,
    this.animalAretes = const [],
  });
}

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
  Timer? _autoSyncTimer;

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
    _startAutoSync();
  }

  void _startAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _silentAutoSync();
    });
  }

  /// Sincronización periódica silenciosa en segundo plano (cada 4s)
  Future<void> _silentAutoSync() async {
    try {
      final remoteHatos = await _apiService.fetchHatos();
      if (remoteHatos.isNotEmpty) {
        if (_hasHatosChanged(_hatos, remoteHatos)) {
          _hatos = remoteHatos;
          if (_selectedHato != null) {
            final match = _hatos.where((h) => h.id == _selectedHato!.id).firstOrNull;
            _selectedHato = match ?? _selectedHato;
          }
          await StorageService.cacheLocally(_hatos);
          notifyListeners();
        }
      }
      await fetchAnimalesMonitoreo();
    } catch (_) {}
  }

  bool _hasHatosChanged(List<Hato> current, List<Hato> incoming) {
    if (current.length != incoming.length) return true;
    for (int i = 0; i < current.length; i++) {
      final c = current[i];
      final inc = incoming[i];
      if (c.id != inc.id ||
          c.nombre != inc.nombre ||
          c.potreros.length != inc.potreros.length ||
          c.vertices.length != inc.vertices.length) {
        return true;
      }
    }
    return false;
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

  /// Comprueba si un Potrero puede eliminarse (sin animales asignados ni adentro por GPS)
  DeletionCheckResult canDeletePotrero(String hatoId, String potreroId) {
    final hato = _hatos.where((h) => h.id == hatoId).firstOrNull;
    final potrero = hato?.potreros.where((p) => p.id == potreroId).firstOrNull;
    final potName = potrero?.nombre ?? 'Potrero';

    final Set<String> assigned = {};
    final Set<String> gpsInside = {};
    final Set<String> allAretes = {};

    for (final a in _animalesMonitoreo) {
      final arete = a['areteVisual'] ?? a['arete_visual'] ?? a['id']?.toString() ?? 'Animal';
      final pId = a['potreroId']?.toString() ?? a['potrero_id']?.toString();
      final pName = a['potreroNombre'] ?? a['potrero_nombre'];

      final bool isAssigned = (pId == potreroId || (potrero != null && (pId == potrero.id || pName == potrero.nombre)));

      bool isInsideGps = false;
      final lat = (a['latitud'] != null) ? double.tryParse(a['latitud'].toString()) : null;
      final lon = (a['longitud'] != null) ? double.tryParse(a['longitud'].toString()) : null;

      if (lat != null && lon != null && potrero != null && potrero.vertices.length >= 3) {
        if (GISService.isPointInPolygonOrBoundary(LatLng(lat, lon), potrero.vertices)) {
          isInsideGps = true;
        }
      }

      if (isAssigned || isInsideGps) {
        allAretes.add(arete.toString());
        if (isAssigned) assigned.add(arete.toString());
        if (isInsideGps) gpsInside.add(arete.toString());
      }
    }

    if (allAretes.isNotEmpty) {
      final aretesStr = allAretes.take(4).join(', ') + (allAretes.length > 4 ? '...' : '');
      return DeletionCheckResult(
        canDelete: false,
        reason: 'No se puede eliminar "$potName" porque contiene ${allAretes.length} animal(es) activo(s) ($aretesStr). Debe reubicar o desvincular el ganado antes de eliminar.',
        totalAnimals: allAretes.length,
        assignedCount: assigned.length,
        gpsCount: gpsInside.length,
        animalAretes: allAretes.toList(),
      );
    }

    return DeletionCheckResult(canDelete: true);
  }

  Future<DeletionCheckResult> deletePotrero(String hatoId, String potreroId) async {
    final check = canDeletePotrero(hatoId, potreroId);
    if (!check.canDelete) {
      return check;
    }

    try {
      await _apiService.deletePotrero(potreroId);
      final hatoIndex = _hatos.indexWhere((h) => h.id == hatoId);
      if (hatoIndex != -1) {
        _hatos[hatoIndex].potreros.removeWhere((p) => p.id == potreroId);
        if (_selectedPotrero?.id == potreroId) {
          _selectedPotrero = null;
        }
        await StorageService.cacheLocally(_hatos);
        notifyListeners();
      }
      return DeletionCheckResult(canDelete: true);
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      return DeletionCheckResult(canDelete: false, reason: msg);
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
    _autoSyncTimer?.cancel();
    super.dispose();
  }
}
