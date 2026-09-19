import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class FincaStateProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _isOnline = true;
  bool _isLoading = false;
  bool _authLoaded = false;
  String _serverIp = '192.168.86.21:3500';

  // Información del Usuario Autenticado (Web / Central)
  Map<String, dynamic>? _currentUser;

  // Información del Hato Activo
  int _hatoId = 1;
  String _hatoNombre = 'Hacienda La Esperanza';
  List<Map<String, dynamic>> _hatosDisponibles = [];

  // Métricas del Dashboard
  int _totalAnimales = 45;
  int _potrerosActivos = 2;
  int _potrerosDescanso = 3;
  double _gdpPromedioKg = 0.650;

  // Estado del Modo Arreo / Traslado
  bool _modoArreoActivo = false;
  int _arreoSegundosRestantes = 0;
  String _potreroOrigenArreo = 'Potrero 1';
  String _potreroDestinoArreo = 'Potrero 2';
  Timer? _arreoTimer;
  Timer? _autoSyncTimer;

  // Listas Sincronizadas
  List<Map<String, dynamic>> _potrerosRotacion = [
    {
      'id': '1',
      'nombre': 'Potrero Norte 1',
      'estado': 'ABIERTO',
      'animales': 25,
      'diasOcupacion': 4,
      'diasDescanso': 0,
      'capacidad': 50,
      'calidadPasto': 'Excelente (2.8k kg/ha)',
    },
    {
      'id': '2',
      'nombre': 'Potrero Sur 2',
      'estado': 'DESCANSO',
      'animales': 0,
      'diasOcupacion': 0,
      'diasDescanso': 18,
      'capacidad': 40,
      'calidadPasto': 'En Recuperación (1.9k kg/ha)',
    },
    {
      'id': '3',
      'nombre': 'Potrero Este 3',
      'estado': 'ABIERTO',
      'animales': 20,
      'diasOcupacion': 2,
      'diasDescanso': 0,
      'capacidad': 45,
      'calidadPasto': 'Óptima (3.1k kg/ha)',
    },
    {
      'id': '4',
      'nombre': 'Potrero Maternidad',
      'estado': 'DESCANSO',
      'animales': 0,
      'diasOcupacion': 0,
      'diasDescanso': 30,
      'capacidad': 20,
      'calidadPasto': 'Lista para Pastoreo',
    },
  ];

  List<Map<String, dynamic>> _animales = [
    {'id': 999, 'areteVisual': 'V-999 (EXTRAVIADA 100m)', 'collarId': 'COL-0999', 'raza': 'Brahman Mestizo', 'categoria': 'Vaca Extraviada', 'potreroNombre': 'FUERA DE LINDERO (100m)', 'latitud': 8.5395, 'longitud': -70.3570, 'bateria': 76, 'ultimoPeso': 485.0, 'estadoAlerta': 'EXTRAVIADA'},
    {'id': 1, 'areteVisual': 'V-042', 'collarId': 'COL-0014', 'raza': 'Brahman', 'categoria': 'Vaca', 'potreroNombre': 'Potrero Norte 1', 'latitud': 8.5385, 'longitud': -70.3580, 'bateria': 92, 'ultimoPeso': 460.0},
    {'id': 2, 'areteVisual': 'N-019', 'collarId': 'COL-0003', 'raza': 'Nelore', 'categoria': 'Novillo', 'potreroNombre': 'Potrero Norte 1', 'latitud': 8.5390, 'longitud': -70.3575, 'bateria': 85, 'ultimoPeso': 395.0},
    {'id': 3, 'areteVisual': 'G-108', 'collarId': 'COL-0022', 'raza': 'Guzerá', 'categoria': 'Toro', 'potreroNombre': 'Potrero Este 3', 'latitud': 8.5375, 'longitud': -70.3590, 'bateria': 98, 'ultimoPeso': 720.0},
  ];

  List<String> _collaresDisponibles = ['COL-0010', 'COL-0011', 'COL-0012', 'COL-0015', 'COL-0020'];

  List<Map<String, dynamic>> _alertas = [
    {
      'arete': 'V-999',
      'tipo': '🚨 FUERA DE CERCA (EXTRAVIADA 100m)',
      'hora': 'Hace 2 min',
      'detalle': 'Animal fuera de potrero. Activar brújula táctica (Módulo 5) para búsqueda y rescate.',
      'collar': 'COL-0999',
    },
    {
      'arete': 'V-042',
      'tipo': 'CELO DETECTADO',
      'hora': 'Hoy 05:40 AM',
      'detalle': 'Pico de actividad motriz (+180% sobre media basal). Ventana de inseminación: Próximas 12h.',
      'collar': 'COL-0014',
    },
    {
      'arete': 'V-019',
      'tipo': 'BAJA RUMIA / SOSPECHA DE FIEBRE',
      'hora': 'Ayer 11:20 PM',
      'detalle': 'Caída de masticación del 62%. Posible malestar o timpanismo.',
      'collar': 'COL-0003',
    },
  ];

  // Getters
  bool get isOnline => _isOnline;
  bool get isLoading => _isLoading;
  bool get isAuthLoaded => _authLoaded;
  bool get isAuthenticated => _currentUser != null;
  Map<String, dynamic>? get currentUser => _currentUser;
  String get currentUserName => _currentUser?['nombre'] ?? 'David Zambrano';
  String get currentUserEmail => _currentUser?['email'] ?? 'david@collarnet.com';
  String get currentUserRole => _currentUser?['rol'] ?? 'ADMIN_FINCA';
  String get currentUserTenant => _currentUser?['tenantNombre'] ?? 'Hacienda Santa Inés';
  bool get permiteCrearPotreros => _currentUser?['permiteCrearPotreros'] == true || _currentUser?['rol'] == 'SUPERADMIN' || _currentUser?['rol'] == 'ADMIN_FINCA';

  String get serverIp => _serverIp;
  int get hatoId => _hatoId;
  String get hatoNombre => _hatoNombre;
  List<Map<String, dynamic>> get hatosDisponibles => _hatosDisponibles;

  int get totalAnimales => _totalAnimales;
  int get potrerosActivos => _potrerosActivos;
  int get potrerosDescanso => _potrerosDescanso;
  int get alertasActivas => _alertas.length;
  double get gdpPromedioKg => _gdpPromedioKg;

  bool get modoArreoActivo => _modoArreoActivo;
  int get arreoSegundosRestantes => _arreoSegundosRestantes;
  String get potreroOrigenArreo => _potreroOrigenArreo;
  String get potreroDestinoArreo => _potreroDestinoArreo;
  List<Map<String, dynamic>> get potrerosRotacion => _potrerosRotacion;
  List<Map<String, dynamic>> get animales => _animales;
  List<String> get collaresDisponibles => _collaresDisponibles;
  List<Map<String, dynamic>> get alertas => _alertas;

  String get arreoTiempoFormateado {
    final minutos = (_arreoSegundosRestantes / 60).floor();
    final segundos = _arreoSegundosRestantes % 60;
    return '${minutos.toString().padLeft(2, '0')}:${segundos.toString().padLeft(2, '0')}';
  }

  FincaStateProvider() {
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _serverIp = prefs.getString('finca_server_ip') ?? '192.168.86.21:3500';
      if (_serverIp.contains('cowai.net') || _serverIp.contains('192.168.86.23') || _serverIp.contains('192.168.86.30') || _serverIp.isEmpty) {
        _serverIp = '192.168.86.21:3500';
        await prefs.setString('finca_server_ip', '192.168.86.21:3500');
      }
      _hatoId = prefs.getInt('finca_selected_hato_id') ?? 1;
      _hatoNombre = prefs.getString('finca_selected_hato_nombre') ?? 'Hacienda La Esperanza';
      
      final userJson = prefs.getString('finca_user_session');
      if (userJson != null && userJson.isNotEmpty) {
        try {
          _currentUser = jsonDecode(userJson) as Map<String, dynamic>;
        } catch (_) {}
      }
      _authLoaded = true;
      notifyListeners();
      await syncData();
      _startAutoSync();
    } catch (_) {
      _authLoaded = true;
      notifyListeners();
      _startAutoSync();
    }
  }

  void _startAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_authLoaded && !_isLoading) {
        syncData(silent: true);
      }
    });
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _apiService.login(identifier, password);
      if (res['success'] == true && res['user'] != null) {
        _currentUser = Map<String, dynamic>.from(res['user'] as Map);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('finca_user_session', jsonEncode(_currentUser));
        
        if (_currentUser!['fincaAsignada'] != null && _currentUser!['fincaAsignada'].toString().isNotEmpty) {
          _hatoNombre = _currentUser!['fincaAsignada'].toString();
        } else if (_currentUser!['tenantNombre'] != null && _currentUser!['tenantNombre'].toString().isNotEmpty) {
          _hatoNombre = _currentUser!['tenantNombre'].toString();
        }

        _isLoading = false;
        notifyListeners();
        await syncData();
        return {'success': true, 'message': res['message'] ?? 'Bienvenido al sistema'};
      } else {
        _isLoading = false;
        notifyListeners();
        return {'success': false, 'error': res['error'] ?? 'Credenciales inválidas'};
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'error': 'Error de conexión: $e'};
    }
  }

  Future<void> logout() async {
    _currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('finca_user_session');
    } catch (_) {}
    notifyListeners();
  }

  Future<void> updateServerIp(String newIp) async {
    _serverIp = newIp.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('finca_server_ip', _serverIp);
    notifyListeners();
    await syncData();
  }

  void _recalcularMetricasPotreros() {
    int activos = 0;
    int descanso = 0;
    int animales = 0;
    for (var p in _potrerosRotacion) {
      if (p['estado'] == 'ABIERTO') {
        activos++;
        animales += (p['animales'] as int? ?? 0);
      } else {
        descanso++;
      }
    }
    _potrerosActivos = activos;
    _potrerosDescanso = descanso;
    if (animales > 0) {
      _totalAnimales = animales;
    }
  }

  // Sincronización Bidireccional Completa con Backend
  Future<void> syncData({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      notifyListeners();
    }

    try {
      // 1. Obtener la lista de Hatos asignados al Tenant / Adquiriente (Hacienda Santa Inés = 1)
      final tenantId = _currentUser?['tenantId'] as int? ?? 1;
      try {
        final hatos = await _apiService.fetchHatos(tenantId: tenantId);
        if (hatos.isNotEmpty) {
          _hatosDisponibles = hatos.asMap().entries.map((entry) {
            final idx = entry.key + 1;
            final h = entry.value;
            int parsedId = int.tryParse(h.id) ?? 0;
            if (parsedId == 0) {
              final match = RegExp(r'\d+').firstMatch(h.id);
              parsedId = match != null ? (int.tryParse(match.group(0)!) ?? idx) : idx;
            }
            return {
              'id': parsedId,
              'nombre': h.nombre,
              'potrerosCount': h.potreros.length,
              'areaHa': h.areaHa,
            };
          }).toList();

          // Buscar el hato actual en la lista disponible o seleccionar el primero de la hacienda
          final matchingIndex = _hatosDisponibles.indexWhere((h) => h['id'] == _hatoId || h['id'].toString() == _hatoId.toString());
          if (matchingIndex >= 0) {
            _hatoNombre = _hatosDisponibles[matchingIndex]['nombre'] as String;
          } else if (_hatosDisponibles.isNotEmpty) {
            _hatoId = _hatosDisponibles.first['id'] as int;
            _hatoNombre = _hatosDisponibles.first['nombre'] as String;
          }
        }
      } catch (e) {
        debugPrint('Aviso: No se pudo actualizar lista de hatos: $e');
      }

      // 2. Obtener resumen de métricas, potreros y animales del Hato activo
      final resumen = await _apiService.fetchFincaResumen(_hatoId);
      if (resumen != null) {
        _isOnline = true;

        if (resumen['hato'] != null) {
          final h = resumen['hato'];
          if (h['nombre'] != null && h['nombre'].toString().isNotEmpty && h['nombre'] != 'Hato Principal') {
            _hatoNombre = h['nombre'];
          }
          _totalAnimales = h['totalAnimales'] ?? _totalAnimales;
          _potrerosActivos = h['potrerosActivos'] ?? _potrerosActivos;
          _potrerosDescanso = h['potrerosDescanso'] ?? _potrerosDescanso;
          _gdpPromedioKg = (h['gdpPromedioKg'] != null) ? (h['gdpPromedioKg'] as num).toDouble() : _gdpPromedioKg;
        }

        if (resumen['potreros'] != null) {
          _potrerosRotacion = List<Map<String, dynamic>>.from(resumen['potreros']);
          _recalcularMetricasPotreros();
        }

        if (resumen['animales'] != null) {
          _animales = List<Map<String, dynamic>>.from(resumen['animales']);
        }

        if (resumen['collaresDisponibles'] != null && (resumen['collaresDisponibles'] as List).isNotEmpty) {
          _collaresDisponibles = List<String>.from(resumen['collaresDisponibles']);
        }

        if (resumen['alertas'] != null) {
          _alertas = List<Map<String, dynamic>>.from(resumen['alertas']);
        }
      } else {
        _isOnline = false;
      }
    } catch (_) {
      _isOnline = false;
    } finally {
      if (!silent) {
        _isLoading = false;
      }
      notifyListeners();
    }
  }

  Future<void> selectHato(int id, String nombre) async {
    _hatoId = id;
    _hatoNombre = nombre;
    _potrerosRotacion = [];
    _animales = [];
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('finca_selected_hato_id', id);
      await prefs.setString('finca_selected_hato_nombre', nombre);
    } catch (_) {}
    await syncData();
  }

  // 1. Vinculación Rápida Manga (3 Toques)
  Future<bool> vincularCollarAnimal({
    required String areteVisual,
    required String collarId,
    String? potreroId,
    String? potreroNombre,
    int? hatoId,
    String? hatoNombre,
    String? raza,
    String? categoria,
    String? sexo,
  }) async {
    final cleanArete = areteVisual.trim().toUpperCase();
    final cleanCollar = collarId.trim();
    final effectiveHatoId = hatoId ?? _hatoId;
    final effectiveHatoNombre = hatoNombre ?? _hatoNombre;

    // Actualizar estado local inmediatamente (optimistic UI)
    final existingIdx = _animales.findIndex((a) => a['areteVisual'] == cleanArete);
    if (existingIdx >= 0) {
      _animales[existingIdx]['collarId'] = cleanCollar;
      _animales[existingIdx]['hatoId'] = effectiveHatoId;
      _animales[existingIdx]['hatoNombre'] = effectiveHatoNombre;
      if (potreroNombre != null) _animales[existingIdx]['potreroNombre'] = potreroNombre;
    } else {
      _animales.add({
        'id': _animales.length + 1,
        'areteVisual': cleanArete,
        'collarId': cleanCollar,
        'raza': raza ?? 'Brahman',
        'categoria': categoria ?? 'Novillo',
        'potreroNombre': potreroNombre ?? 'Potrero 1',
        'hatoId': effectiveHatoId,
        'hatoNombre': effectiveHatoNombre,
        'latitud': 8.5385,
        'longitud': -70.3580,
        'bateria': 95,
        'ultimoPeso': 380.0,
      });
      _totalAnimales = _animales.length;
    }

    _collaresDisponibles.remove(cleanCollar);
    notifyListeners();

    // Enviar a la base de datos central en backend con Hato explícito
    final ok = await _apiService.vincularRapido(
      areteVisual: cleanArete,
      collarId: cleanCollar,
      potreroId: potreroId,
      potreroNombre: potreroNombre,
      hatoId: effectiveHatoId,
      hatoNombre: effectiveHatoNombre,
      raza: raza,
      categoria: categoria,
      sexo: sexo,
    );

    if (ok) {
      syncData();
    }
    return ok;
  }

  // 2. Registrar Pesaje en Báscula
  Future<bool> registrarPesaje({
    required String areteVisual,
    required double peso,
    int? animalId,
  }) async {
    final cleanArete = areteVisual.trim().toUpperCase();

    // Actualizar localmente
    final idx = _animales.findIndex((a) => a['areteVisual'] == cleanArete);
    if (idx >= 0) {
      _animales[idx]['ultimoPeso'] = peso;
      notifyListeners();
    }

    // Enviar a backend
    final ok = await _apiService.registrarPesaje(
      areteVisual: cleanArete,
      peso: peso,
      animalId: animalId,
    );

    return ok;
  }

  // 3. Registrar Vacunación Masiva por Potrero
  Future<bool> registrarVacunacionLote({
    required String potreroNombre,
    String? potreroId,
    required String medicamentoNombre,
    String? dosis,
    String? lote,
  }) async {
    final ok = await _apiService.registrarVacunacionLote(
      potreroNombre: potreroNombre,
      potreroId: potreroId,
      medicamentoNombre: medicamentoNombre,
      dosis: dosis,
      lote: lote,
    );

    return ok;
  }

  // 4. Activar Modo Arreo
  void startModoArreo({
    required String origen,
    required String destino,
    int duracionMinutos = 45,
  }) {
    _modoArreoActivo = true;
    _potreroOrigenArreo = origen;
    _potreroDestinoArreo = destino;
    _arreoSegundosRestantes = duracionMinutos * 60;

    _arreoTimer?.cancel();
    _arreoTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_arreoSegundosRestantes > 0) {
        _arreoSegundosRestantes--;
        notifyListeners();
      } else {
        stopModoArreo();
      }
    });

    notifyListeners();

    // Notificar al backend en segundo plano
    _apiService.notificarArreo(
      origen: origen,
      destino: destino,
      duracionMinutos: duracionMinutos,
      activo: true,
    );
  }

  // Extender tiempo de arreo
  void extenderArreo(int minutosAdicionales) {
    if (_modoArreoActivo) {
      _arreoSegundosRestantes += minutosAdicionales * 60;
      notifyListeners();
    }
  }

  // Finalizar Modo Arreo y actualizar potreros automáticamente
  void stopModoArreo({bool actualizarEstadosPotreros = true}) {
    _modoArreoActivo = false;
    _arreoTimer?.cancel();
    _arreoTimer = null;
    _arreoSegundosRestantes = 0;

    if (actualizarEstadosPotreros && _potreroOrigenArreo.isNotEmpty && _potreroDestinoArreo.isNotEmpty) {
      // 1. Cerrar potrero de origen
      final idxOrig = _potrerosRotacion.findIndex((p) => p['nombre'] == _potreroOrigenArreo);
      int animalesTrasladados = 0;
      if (idxOrig != -1) {
        animalesTrasladados = (_potrerosRotacion[idxOrig]['animales'] as int? ?? 0);
        _potrerosRotacion[idxOrig]['estado'] = 'DESCANSO';
        _potrerosRotacion[idxOrig]['animales'] = 0;
        _potrerosRotacion[idxOrig]['diasDescanso'] = 1;
        _potrerosRotacion[idxOrig]['diasOcupacion'] = 0;
      }

      // 2. Abrir potrero de destino
      final idxDest = _potrerosRotacion.findIndex((p) => p['nombre'] == _potreroDestinoArreo);
      if (idxDest != -1) {
        _potrerosRotacion[idxDest]['estado'] = 'ABIERTO';
        _potrerosRotacion[idxDest]['animales'] = animalesTrasladados > 0 ? animalesTrasladados : 45;
        _potrerosRotacion[idxDest]['diasOcupacion'] = 1;
        _potrerosRotacion[idxDest]['diasDescanso'] = 0;
      }

      _recalcularMetricasPotreros();
    }

    notifyListeners();

    // Notificar finalización al backend
    _apiService.notificarArreo(
      origen: _potreroOrigenArreo,
      destino: _potreroDestinoArreo,
      duracionMinutos: 0,
      activo: false,
    );
  }

  // Cambiar estado de potrero (ABIERTO / DESCANSO)
  void toggleEstadoPotrero(String potreroId) {
    final idx = _potrerosRotacion.findIndex((p) => p['id'] == potreroId);
    if (idx != -1) {
      final actual = _potrerosRotacion[idx]['estado'];
      final nuevoEstado = (actual == 'ABIERTO') ? 'DESCANSO' : 'ABIERTO';

      if (nuevoEstado == 'DESCANSO') {
        _potrerosRotacion[idx]['estado'] = 'DESCANSO';
        _potrerosRotacion[idx]['animales'] = 0;
        _potrerosRotacion[idx]['diasDescanso'] = 1;
        _potrerosRotacion[idx]['diasOcupacion'] = 0;
      } else {
        _potrerosRotacion[idx]['estado'] = 'ABIERTO';
        _potrerosRotacion[idx]['diasOcupacion'] = 1;
        _potrerosRotacion[idx]['diasDescanso'] = 0;
      }
      _recalcularMetricasPotreros();
      notifyListeners();

      // Enviar actualización a backend en segundo plano
      _apiService.actualizarEstadoPotrero(potreroId, nuevoEstado);
    }
  }

  @override
  void dispose() {
    _autoSyncTimer?.cancel();
    _arreoTimer?.cancel();
    super.dispose();
  }
}

extension ListExtensions<T> on List<T> {
  int findIndex(bool Function(T element) test) {
    for (int i = 0; i < length; i++) {
      if (test(this[i])) return i;
    }
    return -1;
  }
}
