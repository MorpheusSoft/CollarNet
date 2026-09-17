import 'package:flutter/material.dart';
import '../models/collar_inventario.dart';
import '../services/api_service.dart';

class InventoryProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  // ==========================================
  // 1. ESTADO DE RECEPCIÓN DE LOTE (PESTAÑA 1)
  // ==========================================
  String _batchNumber = 'L-2026-09';
  String get batchNumber => _batchNumber;

  String _proveedor = 'Shenzhen IoT Tech Co.';
  String get proveedor => _proveedor;

  int _targetCount = 50;
  int get targetCount => _targetCount;

  int? _selectedTenantId;
  int? get selectedTenantId => _selectedTenantId;

  String _ubicacionAlmacen = 'Almacén Central CowIA';
  String get ubicacionAlmacen => _ubicacionAlmacen;

  DateTime _fechaRecepcion = DateTime.now();
  DateTime get fechaRecepcion => _fechaRecepcion;

  String _versionHardware = 'HW-v2.0';
  String get versionHardware => _versionHardware;

  String _versionFirmware = '1.0.0';
  String get versionFirmware => _versionFirmware;

  String _notasLote = '';
  String get notasLote => _notasLote;

  List<Map<String, dynamic>> _tenants = [];
  List<Map<String, dynamic>> get tenants => _tenants;

  List<ScannedCollarDraft> _scannedCollares = [];
  List<ScannedCollarDraft> get scannedCollares => List.unmodifiable(_scannedCollares);

  bool _isSavingBatch = false;
  bool get isSavingBatch => _isSavingBatch;

  // ==========================================
  // 2. ESTADO DE CONSULTA DE INVENTARIO (PESTAÑA 2)
  // ==========================================
  List<CollarInventario> _collaresInventario = [];
  List<CollarInventario> get collaresInventario => _collaresInventario;

  List<LoteHardware> _lotes = [];
  List<LoteHardware> get lotes => _lotes;

  Map<String, int> _kpis = {};
  Map<String, int> get kpis => _kpis;

  bool _isLoadingInventario = false;
  bool get isLoadingInventario => _isLoadingInventario;

  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  String _selectedEstadoFilter = 'TODOS';
  String get selectedEstadoFilter => _selectedEstadoFilter;

  int? _selectedLoteFilter;
  int? get selectedLoteFilter => _selectedLoteFilter;

  CollarInventario? _selectedCollar;
  CollarInventario? get selectedCollar => _selectedCollar;

  List<CollarHistorial> _selectedCollarHistorial = [];
  List<CollarHistorial> get selectedCollarHistorial => _selectedCollarHistorial;

  bool _isLoadingHistorial = false;
  bool get isLoadingHistorial => _isLoadingHistorial;

  InventoryProvider() {
    _initInitialData();
  }

  Future<void> _initInitialData() async {
    // Semilla inicial de collares escaneados para visualización inmediata
    if (_scannedCollares.isEmpty) {
      _scannedCollares = [
        ScannedCollarDraft(
          id: 'COW-2026-0048',
          imei: '864920048192031',
          numeroSim: '+584129990048',
          numeroSerie: 'SN-L2026-09-0048',
          status: 'EN_ALMACEN',
          scanTime: DateTime.now().subtract(const Duration(minutes: 5)),
        ),
        ScannedCollarDraft(
          id: 'COW-2026-0047',
          imei: '864920047192030',
          numeroSim: '+584129990047',
          numeroSerie: 'SN-L2026-09-0047',
          status: 'EN_ALMACEN',
          scanTime: DateTime.now().subtract(const Duration(minutes: 6)),
        ),
        ScannedCollarDraft(
          id: 'COW-2026-0046',
          imei: '864920046192029',
          numeroSim: '+584129990046',
          numeroSerie: 'SN-L2026-09-0046',
          status: 'EN_ALMACEN',
          scanTime: DateTime.now().subtract(const Duration(minutes: 7)),
        ),
      ];
    }
    try {
      _tenants = await _apiService.fetchTenants();
    } catch (_) {}
    await loadInventario();
  }

  // ==========================================
  // OPERACIONES DE RECEPCIÓN DE LOTE
  // ==========================================

  void configureBatch({
    required String batchNumber,
    required String proveedor,
    required int targetCount,
    String? ubicacionAlmacen,
    DateTime? fechaRecepcion,
    int? tenantId,
    String? versionHardware,
    String? versionFirmware,
    String? notas,
  }) {
    _batchNumber = batchNumber.trim().toUpperCase();
    _proveedor = proveedor.trim();
    _targetCount = targetCount;
    if (ubicacionAlmacen != null && ubicacionAlmacen.trim().isNotEmpty) {
      _ubicacionAlmacen = ubicacionAlmacen.trim();
    }
    if (fechaRecepcion != null) {
      _fechaRecepcion = fechaRecepcion;
    }
    _selectedTenantId = tenantId;
    if (versionHardware != null) _versionHardware = versionHardware;
    if (versionFirmware != null) _versionFirmware = versionFirmware;
    if (notas != null) _notasLote = notas;
    notifyListeners();
  }

  /// Intenta agregar un collar escaneado por QR o código
  /// Retorna un mapa con { 'success': bool, 'message': String, 'isDuplicate': bool }
  Map<String, dynamic> addScannedCollar({
    required String rawCode,
    String? imei,
    String? sim,
    String? serie,
  }) {
    final cleanCode = rawCode.trim().toUpperCase();
    if (cleanCode.isEmpty) {
      return {'success': false, 'message': 'El código no puede estar vacío', 'isDuplicate': false};
    }

    // 1. Verificar si ya fue escaneado en esta misma sesión de lote
    final isAlreadyScanned = _scannedCollares.any(
      (c) => c.id == cleanCode || (imei != null && c.imei == imei.trim()),
    );
    if (isAlreadyScanned) {
      return {
        'success': false,
        'message': 'El collar "$cleanCode" ya fue escaneado en este lote.',
        'isDuplicate': true
      };
    }

    // 2. Extraer o autogenerar identificadores complementarios si vienen en texto simple
    final calculatedImei = imei?.trim().isNotEmpty == true
        ? imei!.trim()
        : (cleanCode.length >= 15 && RegExp(r'^\d+$').hasMatch(cleanCode)
            ? cleanCode
            : '8649200${cleanCode.replaceAll(RegExp(r'\D'), '').padLeft(6, '0')}');

    final calculatedSim = sim?.trim().isNotEmpty == true
        ? sim!.trim()
        : '+58412${cleanCode.replaceAll(RegExp(r'\D'), '').padLeft(7, '0')}';

    final calculatedSerie = serie?.trim().isNotEmpty == true
        ? serie!.trim()
        : 'SN-$_batchNumber-${cleanCode.replaceAll(RegExp(r'\D'), '').padLeft(4, '0')}';

    final draft = ScannedCollarDraft(
      id: cleanCode,
      imei: calculatedImei,
      numeroSim: calculatedSim,
      numeroSerie: calculatedSerie,
      status: 'EN_ALMACEN',
      scanTime: DateTime.now(),
    );

    _scannedCollares.insert(0, draft);
    notifyListeners();

    return {
      'success': true,
      'message': 'Collar "$cleanCode" escaneado y validado.',
      'collar': draft,
      'isDuplicate': false
    };
  }

  void removeScannedCollarAt(int index) {
    if (index >= 0 && index < _scannedCollares.length) {
      _scannedCollares.removeAt(index);
      notifyListeners();
    }
  }

  void clearBatchDraft() {
    _scannedCollares.clear();
    notifyListeners();
  }

  /// Simula el escaneo continuo de un nuevo collar
  ScannedCollarDraft simulateQuickScan() {
    final nextNum = _scannedCollares.length + 49;
    final newId = 'COW-2026-00$nextNum';
    final newImei = '8649200${nextNum}192099';
    final newSim = '+5841299900$nextNum';
    final newSerie = 'SN-$_batchNumber-00$nextNum';

    final draft = ScannedCollarDraft(
      id: newId,
      imei: newImei,
      numeroSim: newSim,
      numeroSerie: newSerie,
      status: 'EN_ALMACEN',
      scanTime: DateTime.now(),
    );

    _scannedCollares.insert(0, draft);
    notifyListeners();
    return draft;
  }

  void startNewBatch({
    required String batchNumber,
    required String proveedor,
    required int targetCount,
    required String ubicacionAlmacen,
    DateTime? fechaRecepcion,
    int? tenantId,
    String? versionHardware,
    String? versionFirmware,
    String? notas,
  }) {
    _scannedCollares.clear();
    configureBatch(
      batchNumber: batchNumber,
      proveedor: proveedor,
      targetCount: targetCount,
      ubicacionAlmacen: ubicacionAlmacen,
      fechaRecepcion: fechaRecepcion ?? DateTime.now(),
      tenantId: tenantId,
      versionHardware: versionHardware ?? 'HW-v2.0',
      versionFirmware: versionFirmware ?? '1.0.0',
      notas: notas ?? '',
    );
  }

  /// Sincroniza y persiste el lote completo en la base de datos de CollarNet
  Future<Map<String, dynamic>> finalizeBatchAndSync() async {
    if (_scannedCollares.isEmpty) {
      throw Exception('No hay collares escaneados para guardar en el lote.');
    }

    _isSavingBatch = true;
    notifyListeners();

    try {
      final result = await _apiService.registrarLoteCollares(
        codigoLote: _batchNumber,
        proveedor: _proveedor,
        fechaRecepcion: _fechaRecepcion,
        versionHardware: _versionHardware,
        versionFirmwareInicial: _versionFirmware,
        tenantId: _selectedTenantId,
        ubicacionAlmacen: _ubicacionAlmacen,
        notas: _notasLote.isNotEmpty ? _notasLote : null,
        collares: _scannedCollares,
      );

      // Recargar inventario para reflejar los nuevos collares
      await loadInventario();

      _isSavingBatch = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isSavingBatch = false;
      notifyListeners();
      rethrow;
    }
  }

  // ==========================================
  // OPERACIONES DE CONSULTA DE INVENTARIO
  // ==========================================

  Future<void> loadInventario() async {
    _isLoadingInventario = true;
    notifyListeners();

    try {
      final futures = await Future.wait([
        _apiService.fetchCollaresInventario(
          search: _searchQuery,
          estado: _selectedEstadoFilter,
          loteId: _selectedLoteFilter,
        ),
        _apiService.fetchLotesCollares(),
        _apiService.fetchCollaresKpis(),
      ]);

      _collaresInventario = futures[0] as List<CollarInventario>;
      _lotes = futures[1] as List<LoteHardware>;
      _kpis = futures[2] as Map<String, int>;
    } catch (e) {
      debugPrint('Error cargando inventario en provider: $e');
    } finally {
      _isLoadingInventario = false;
      notifyListeners();
    }
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    loadInventario();
  }

  void setEstadoFilter(String estado) {
    _selectedEstadoFilter = estado;
    loadInventario();
  }

  void setLoteFilter(int? loteId) {
    _selectedLoteFilter = loteId;
    loadInventario();
  }

  void selectCollar(CollarInventario? collar) {
    _selectedCollar = collar;
    _selectedCollarHistorial = [];
    notifyListeners();
    if (collar != null) {
      loadHistorialForCollar(collar.id);
    }
  }

  Future<void> loadHistorialForCollar(String collarId) async {
    _isLoadingHistorial = true;
    notifyListeners();
    try {
      _selectedCollarHistorial = await _apiService.fetchCollarHistorial(collarId);
    } catch (_) {}
    _isLoadingHistorial = false;
    notifyListeners();
  }

  Future<void> updateCollarEstado(String collarId, String nuevoEstado, String motivo) async {
    try {
      final updated = await _apiService.actualizarEstadoCollar(
        collarId: collarId,
        nuevoEstado: nuevoEstado,
        motivo: motivo,
      );
      if (updated != null) {
        final index = _collaresInventario.indexWhere((c) => c.id == collarId);
        if (index != -1) {
          _collaresInventario[index] = updated;
        }
        if (_selectedCollar?.id == collarId) {
          _selectedCollar = updated;
        }
        await loadHistorialForCollar(collarId);
        await _apiService.fetchCollaresKpis().then((k) {
          _kpis = k;
        });
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error en updateCollarEstado: $e');
      rethrow;
    }
  }
}
