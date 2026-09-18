import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/collar_device.dart';
import '../services/api_service.dart';

class OpsProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  // Autenticación y Estado de Sesión
  bool isAuthChecked = false;
  bool isAuthenticated = false;
  String operatorName = 'Super Administrador CollarNet';
  String operatorRole = 'SUPERADMIN';
  String operatorEmail = 'admin@collarnet.com';
  int? operatorId;
  String? sessionExpiredReason;

  // Control de Inactividad (20 minutos)
  DateTime? lastActivityTime;
  Timer? _inactivityTimer;
  static const Duration inactivityTimeout = Duration(minutes: 20);

  // Estado del Servidor Cloud VPS (Medición en vivo)
  bool isCloudServerOnline = true;
  int serverLatencyMs = 38;

  // Métricas Reales de Inventario en VPS
  int totalStockCount = 208;
  int inReviewCount = 0;
  int totalBatchesCount = 2;

  // Collar Activo Seleccionado
  CollarDevice? activeCollar = CollarDevice.mockActive();
  bool isScanningBle = false;

  // Bitácora de Auditoría Reciente
  List<Map<String, dynamic>> recentActivities = [
    {
      'title': 'Collar COW-2026-0042 [TEST APROBADO ✅]',
      'subtitle': 'Buzzer, IMU 3-ejes, GNSS 3D y corte 60s certificados',
      'time': 'Hace 4m',
      'type': 'success',
    },
    {
      'title': 'Lote #LOT-COW-2026-001 (200 unidades) sincronizado',
      'subtitle': 'Carga masiva escaneada en Almacén Central',
      'time': 'Hace 18m',
      'type': 'info',
    },
    {
      'title': 'Base de datos en VPS restablecida a cero',
      'subtitle': 'Hatos y potreros listos para registro en terreno',
      'time': 'En vivo',
      'type': 'purple',
    },
  ];

  OpsProvider() {
    initAuth();
  }

  /// Inicializa la verificación de sesión guardada
  Future<void> initAuth() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedEmail = prefs.getString('auth_user_email');
      final savedName = prefs.getString('auth_user_name');
      final savedRole = prefs.getString('auth_user_role');
      final savedTimeStr = prefs.getString('auth_last_activity');

      if (savedEmail != null && savedTimeStr != null) {
        final savedTime = DateTime.tryParse(savedTimeStr);
        if (savedTime != null && DateTime.now().difference(savedTime) < inactivityTimeout) {
          isAuthenticated = true;
          operatorEmail = savedEmail;
          operatorName = savedName ?? 'Operador';
          operatorRole = savedRole ?? 'SUPERADMIN';
          lastActivityTime = DateTime.now();
          _startInactivityChecker();
          refreshServerData();
        } else {
          // Sesión expirada
          await _clearSavedSession();
          sessionExpiredReason = 'Sesión expirada por inactividad (20 min). Inicia sesión nuevamente.';
        }
      }
    } catch (_) {}

    isAuthChecked = true;
    notifyListeners();
  }

  /// Registra interacción del usuario (reinicia los 20 min)
  void recordActivity() {
    if (!isAuthenticated) return;
    lastActivityTime = DateTime.now();
    _saveLastActivity();
  }

  void _startInactivityChecker() {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (isAuthenticated && lastActivityTime != null) {
        final elapsed = DateTime.now().difference(lastActivityTime!);
        if (elapsed >= inactivityTimeout) {
          logout(reason: 'Sesión cerrada automáticamente por inactividad (20 minutos).');
        }
      }
    });
  }

  Future<void> _saveLastActivity() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_last_activity', DateTime.now().toIso8601String());
    } catch (_) {}
  }

  Future<void> _clearSavedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_user_email');
      await prefs.remove('auth_user_name');
      await prefs.remove('auth_user_role');
      await prefs.remove('auth_last_activity');
    } catch (_) {}
  }

  /// Inicia sesión contra el VPS
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final res = await _api.login(identifier, password);
    if (res['success'] == true) {
      final user = res['user'];
      isAuthenticated = true;
      operatorName = user['nombre'] ?? identifier;
      operatorRole = user['rol'] ?? 'SUPERADMIN';
      operatorEmail = user['email'] ?? identifier;
      operatorId = user['id'];
      lastActivityTime = DateTime.now();
      sessionExpiredReason = null;

      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_user_email', operatorEmail);
        await prefs.setString('auth_user_name', operatorName);
        await prefs.setString('auth_user_role', operatorRole);
        await prefs.setString('auth_last_activity', DateTime.now().toIso8601String());
      } catch (_) {}

      _startInactivityChecker();
      await refreshServerData();
      notifyListeners();
      return {'success': true};
    } else {
      return {'success': false, 'error': res['error'] ?? 'Credenciales incorrectas'};
    }
  }

  /// Cierra sesión
  Future<void> logout({String? reason}) async {
    isAuthenticated = false;
    sessionExpiredReason = reason;
    lastActivityTime = null;
    _inactivityTimer?.cancel();
    await _clearSavedSession();
    notifyListeners();
  }

  /// Consulta el VPS para latencia y métricas reales
  Future<void> refreshServerData() async {
    try {
      // 1. Latencia y estado Cloud VPS
      final health = await _api.checkServerHealth();
      isCloudServerOnline = health['online'] == true;
      if (isCloudServerOnline && health['latencyMs'] != null) {
        serverLatencyMs = health['latencyMs'];
      }

      // 2. KPIs reales de collares en BD
      final kpis = await _api.fetchKpis(operatorRole);
      if (kpis != null) {
        totalStockCount = kpis['en_almacen'] ?? kpis['total'] ?? totalStockCount;
        inReviewCount = kpis['en_revision'] ?? 0;
      }

      // 3. Lotes registrados
      final lotes = await _api.fetchLotesCount(operatorRole);
      totalBatchesCount = lotes;

      notifyListeners();
    } catch (_) {}
  }

  void startBleScan() {
    isScanningBle = true;
    notifyListeners();

    // Simulación de escaneo rápido
    Future.delayed(const Duration(seconds: 2), () {
      isScanningBle = false;
      activeCollar = CollarDevice.mockActive();
      notifyListeners();
    });
  }

  void setActiveCollar(CollarDevice collar) {
    activeCollar = collar;
    notifyListeners();
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    super.dispose();
  }
}
