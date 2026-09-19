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

  AgroProvider() {
    _initData();
  }

  Future<void> _initData() async {
    _isLoading = true;
    notifyListeners();
    _hatos = await StorageService.loadHatos();
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
    } catch (e) {
      debugPrint('Error recargando desde API: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sincronización completa bidireccional (sube locales pendientes y descarga remotos)
  Future<Map<String, int>> syncBidirectional({int? tenantId}) async {
    _isLoading = true;
    notifyListeners();
    int uploadedHatos = 0;
    int uploadedPotreros = 0;

    try {
      // 1. Subir Hatos locales que no tengan ID numérico del servidor (ID empieza con 'hato_')
      for (int i = 0; i < _hatos.length; i++) {
        final h = _hatos[i];
        if (h.id.startsWith('hato_') || int.tryParse(h.id) == null) {
          try {
            final savedHato = await _apiService.saveHato(h, tenantId: tenantId ?? 1);
            if (!savedHato.id.startsWith('hato_')) {
              uploadedHatos++;
              final updatedPotreros = h.potreros.map((p) => p.copyWith(hatoId: savedHato.id)).toList();
              _hatos[i] = savedHato.copyWith(potreros: updatedPotreros);
            }
          } catch (e) {
            debugPrint('Error subiendo hato local: $e');
          }
        }
      }

      // 2. Subir Potreros locales que no tengan ID numérico del servidor (ID empieza con 'pot_')
      for (int i = 0; i < _hatos.length; i++) {
        final h = _hatos[i];
        final List<Potrero> updatedPotList = [];
        for (final p in h.potreros) {
          if (p.id.startsWith('pot_') || int.tryParse(p.id) == null) {
            try {
              final savedPot = await _apiService.savePotrero(p.copyWith(hatoId: h.id));
              if (!savedPot.id.startsWith('pot_')) {
                uploadedPotreros++;
                updatedPotList.add(savedPot);
                continue;
              }
            } catch (e) {
              debugPrint('Error subiendo potrero local: $e');
            }
          }
          updatedPotList.add(p);
        }
        _hatos[i] = h.copyWith(potreros: updatedPotList);
      }

      // 3. Descargar consolidado fresco del backend
      final remoteHatos = await _apiService.fetchHatos();
      if (remoteHatos.isNotEmpty) {
        _hatos = remoteHatos;
      }
      await StorageService.cacheLocally(_hatos);
    } catch (e) {
      debugPrint('Error en syncBidirectional: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }

    return {
      'uploadedHatos': uploadedHatos,
      'uploadedPotreros': uploadedPotreros,
      'totalHatos': _hatos.length,
    };
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
  // CRUD DE HATOS Y POTREROS (Sincronizado con API)
  // ==========================================

  Future<Hato> addHato(Hato hato, {int? tenantId}) async {
    // Evitar duplicados por id o por nombre y superficie idéntica
    final isDuplicate = _hatos.any(
      (h) => h.id == hato.id || (h.nombre == hato.nombre && (h.areaHa - hato.areaHa).abs() < 0.001),
    );
    if (isDuplicate) {
      debugPrint('Aviso: Hato duplicado detectado, omitiendo inserción múltiple.');
      return hato;
    }

    Hato toSave = hato;
    try {
      toSave = await _apiService.saveHato(hato, tenantId: tenantId);
    } catch (e) {
      debugPrint('Aviso: No se pudo guardar hato en API (guardando localmente): $e');
    }

    _hatos.add(toSave);
    _selectedHato = toSave;
    await StorageService.cacheLocally(_hatos);
    notifyListeners();
    return toSave;
  }

  Future<void> updateHato(Hato updatedHato) async {
    final index = _hatos.indexWhere((h) => h.id == updatedHato.id);
    if (index != -1) {
      try {
        await _apiService.saveHato(updatedHato);
      } catch (e) {
        debugPrint('Aviso: Error actualizando hato en API: $e');
      }
      _hatos[index] = updatedHato;
      if (_selectedHato?.id == updatedHato.id) {
        _selectedHato = updatedHato;
      }
      await StorageService.cacheLocally(_hatos);
      notifyListeners();
    }
  }

  /// Comprueba si un Hato puede eliminarse (sin animales asignados ni adentro por GPS)
  Future<DeletionCheckResult> canDeleteHato(String hatoId) async {
    final hato = _hatos.where((h) => h.id == hatoId).firstOrNull;
    final hatoName = hato?.nombre ?? 'Hato';

    final monitoreo = await _apiService.fetchMonitoreo();
    final Set<String> assigned = {};
    final Set<String> gpsInside = {};
    final Set<String> allAretes = {};

    final potreroIds = hato?.potreros.map((p) => p.id).toSet() ?? {};
    final potreroNames = hato?.potreros.map((p) => p.nombre).toSet() ?? {};

    for (final a in monitoreo) {
      final arete = a['areteVisual'] ?? a['arete_visual'] ?? a['id']?.toString() ?? 'Animal';
      final hId = a['hatoId']?.toString() ?? a['hato_id']?.toString();
      final pId = a['potreroId']?.toString() ?? a['potrero_id']?.toString();
      final pName = a['potreroNombre'] ?? a['potrero_nombre'];

      final bool isAssigned = (hId == hatoId || (hato != null && hId == hato.id)) ||
                             potreroIds.contains(pId) ||
                             potreroNames.contains(pName);

      bool isInsideGps = false;
      final lat = (a['latitud'] != null) ? double.tryParse(a['latitud'].toString()) : null;
      final lon = (a['longitud'] != null) ? double.tryParse(a['longitud'].toString()) : null;

      if (lat != null && lon != null && hato != null) {
        if (hato.vertices.length >= 3 && GISService.isPointInPolygonOrBoundary(LatLng(lat, lon), hato.vertices)) {
          isInsideGps = true;
        } else {
          for (final pot in hato.potreros) {
            if (pot.vertices.length >= 3 && GISService.isPointInPolygonOrBoundary(LatLng(lat, lon), pot.vertices)) {
              isInsideGps = true;
              break;
            }
          }
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
        reason: 'No se puede eliminar "$hatoName" porque contiene ${allAretes.length} animal(es) activo(s) ($aretesStr). Debe reubicar o desvincular el ganado antes de eliminar.',
        totalAnimals: allAretes.length,
        assignedCount: assigned.length,
        gpsCount: gpsInside.length,
        animalAretes: allAretes.toList(),
      );
    }

    return DeletionCheckResult(canDelete: true);
  }

  /// Comprueba si un Potrero puede eliminarse (sin animales asignados ni adentro por GPS)
  Future<DeletionCheckResult> canDeletePotrero(String hatoId, String potreroId) async {
    final hato = _hatos.where((h) => h.id == hatoId).firstOrNull;
    final potrero = hato?.potreros.where((p) => p.id == potreroId).firstOrNull;
    final potName = potrero?.nombre ?? 'Potrero';

    final monitoreo = await _apiService.fetchMonitoreo();
    final Set<String> assigned = {};
    final Set<String> gpsInside = {};
    final Set<String> allAretes = {};

    for (final a in monitoreo) {
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

  Future<DeletionCheckResult> deleteHato(String hatoId) async {
    final check = await canDeleteHato(hatoId);
    if (!check.canDelete) {
      return check;
    }

    try {
      await _apiService.deleteHato(hatoId);
      _hatos.removeWhere((h) => h.id == hatoId);
      if (_selectedHato?.id == hatoId) {
        _selectedHato = null;
        _selectedPotrero = null;
      }
      await StorageService.cacheLocally(_hatos);
      notifyListeners();
      return DeletionCheckResult(canDelete: true);
    } catch (e) {
      final msg = e.toString().replaceAll('Exception: ', '');
      return DeletionCheckResult(canDelete: false, reason: msg);
    }
  }

  Future<Potrero> addPotreroToHato(String hatoId, Potrero potrero) async {
    final index = _hatos.indexWhere((h) => h.id == hatoId);
    if (index == -1) throw Exception('Hato padre no encontrado');

    final hato = _hatos[index];

    // Evitar duplicados por id o por nombre y superficie idéntica
    final isDuplicate = hato.potreros.any(
      (p) => p.id == potrero.id || (p.nombre == potrero.nombre && (p.areaHa - potrero.areaHa).abs() < 0.001),
    );
    if (isDuplicate) {
      debugPrint('Aviso: Potrero duplicado detectado, omitiendo inserción múltiple.');
      return potrero;
    }

    Potrero toSave = potrero;
    try {
      toSave = await _apiService.savePotrero(potrero);
    } catch (e) {
      debugPrint('Aviso: No se pudo guardar potrero en API (guardando localmente): $e');
    }

    final updatedPotreros = List<Potrero>.from(hato.potreros)..add(toSave);
    _hatos[index] = hato.copyWith(potreros: updatedPotreros);
    _selectedHato = _hatos[index];
    _selectedPotrero = toSave;
    await StorageService.cacheLocally(_hatos);
    notifyListeners();
    return toSave;
  }

  Future<DeletionCheckResult> deletePotrero(String hatoId, String potreroId) async {
    final check = await canDeletePotrero(hatoId, potreroId);
    if (!check.canDelete) {
      return check;
    }

    try {
      await _apiService.deletePotrero(potreroId);
      final index = _hatos.indexWhere((h) => h.id == hatoId);
      if (index != -1) {
        final hato = _hatos[index];
        final updatedPotreros = List<Potrero>.from(hato.potreros)
          ..removeWhere((p) => p.id == potreroId);
        _hatos[index] = hato.copyWith(potreros: updatedPotreros);
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
  // SISTEMA DE ALERTAS TOPOLÓGICAS VISUALES
  // ==========================================

  void showTopologyAlert(String message, {LatLng? conflictPoint, List<LatLng>? offendingSegment}) {
    _alertTimer?.cancel();
    _activeAlert = TopologyAlert(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      message: message,
      conflictPoint: conflictPoint,
      offendingSegment: offendingSegment,
    );
    notifyListeners();

    // Auto-eliminar la alerta visual exactamente después de 5 segundos
    _alertTimer = Timer(const Duration(seconds: 5), () {
      _activeAlert = null;
      notifyListeners();
    });
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
