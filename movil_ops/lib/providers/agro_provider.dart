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

  AgroProvider() {
    _initData();
  }

  Future<void> _initData() async {
    _isLoading = true;
    notifyListeners();
    _hatos = await StorageService.loadHatos();
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

  Future<void> deleteHato(String hatoId) async {
    try {
      await _apiService.deleteHato(hatoId);
    } catch (e) {
      debugPrint('Aviso: Error eliminando hato en API: $e');
    }
    _hatos.removeWhere((h) => h.id == hatoId);
    if (_selectedHato?.id == hatoId) {
      _selectedHato = null;
      _selectedPotrero = null;
    }
    await StorageService.cacheLocally(_hatos);
    notifyListeners();
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

  Future<void> deletePotrero(String hatoId, String potreroId) async {
    try {
      await _apiService.deletePotrero(potreroId);
    } catch (e) {
      debugPrint('Aviso: Error eliminando potrero en API: $e');
    }
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
    super.dispose();
  }
}
