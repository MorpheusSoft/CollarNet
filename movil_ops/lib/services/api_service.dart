import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/collar_inventario.dart';
import '../models/hato.dart';
import '../models/potrero.dart';

class ApiService {
  // IP local / VPS de producción (Cloud VPS)
  static const String defaultBaseUrl = 'https://www.cowai.net/api';

  static Future<String> getBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('custom_server_url') ?? defaultBaseUrl;
    } catch (_) {
      return defaultBaseUrl;
    }
  }

  static Future<void> setCustomBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('custom_server_url', url);
  }

  /// Autentica al usuario en el VPS
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': identifier.trim(),
          'password': password.trim(),
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Credenciales inválidas'};
      }
    } catch (e) {
      return {'success': false, 'error': 'No se pudo conectar al servidor ($e)'};
    }
  }

  /// Verifica conectividad y latencia al VPS
  Future<Map<String, dynamic>> checkServerHealth() async {
    final baseUrl = await getBaseUrl();
    final sw = Stopwatch()..start();
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/collares/kpis'), headers: {'x-user-role': 'SUPERADMIN'})
          .timeout(const Duration(seconds: 5));
      sw.stop();
      if (response.statusCode == 200) {
        return {'online': true, 'latencyMs': sw.elapsedMilliseconds};
      }
    } catch (_) {}
    return {'online': false, 'latencyMs': 0};
  }

  /// Obtiene los KPIs de inventario reales del VPS
  Future<Map<String, dynamic>?> fetchKpis(String userRole) async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/collares/kpis'), headers: {'x-user-role': userRole})
          .timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  /// Obtiene el conteo de lotes registrados
  Future<int> fetchLotesCount(String userRole) async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/collares/lotes'), headers: {'x-user-role': userRole})
          .timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        return list.length;
      }
    } catch (_) {}
    return 0;
  }

  Future<List<Hato>> fetchHatos() async {
    final baseUrl = await getBaseUrl();
    try {
      // 1. Obtener los Hatos
      final hatosResponse = await http.get(Uri.parse('$baseUrl/geocercas/hatos')).timeout(const Duration(seconds: 10));
      if (hatosResponse.statusCode != 200) {
        throw Exception('Error al cargar hatos');
      }
      
      final List<dynamic> hatosJson = jsonDecode(hatosResponse.body);
      
      // 2. Obtener los Potreros
      final potrerosResponse = await http.get(Uri.parse('$baseUrl/geocercas/potreros')).timeout(const Duration(seconds: 10));
      if (potrerosResponse.statusCode != 200) {
        throw Exception('Error al cargar potreros');
      }
      
      final List<dynamic> potrerosJson = jsonDecode(potrerosResponse.body);
      
      // 3. Procesar y vincular
      final List<Hato> hatosList = [];
      
      for (var hJson in hatosJson) {
        final geoJson = jsonDecode(hJson['geojson'] as String);
        final coordinates = (geoJson['coordinates'] as List).first as List;
        
        final List<Map<String, dynamic>> vertices = coordinates.map((coord) {
          // GeoJSON es [lon, lat], nosotros necesitamos {lat, lng}
          return {'lat': coord[1], 'lng': coord[0]};
        }).toList();

        // Eliminar el último vértice si es idéntico al primero (cierre de anillo de GeoJSON)
        if (vertices.isNotEmpty && 
            vertices.first['lat'] == vertices.last['lat'] && 
            vertices.first['lng'] == vertices.last['lng']) {
          vertices.removeLast();
        }

        final hatoMap = {
          'id': hJson['id'].toString(),
          'nombre': hJson['nombre'],
          'tenantId': hJson['tenant_id'] ?? hJson['tenantId'],
          'areaHa': 0.0, // El área se recalculará en la app o se debe mandar desde el backend
          'perimeterM': 0.0,
          'vertices': vertices,
          'potreros': []
        };
        
        final hato = Hato.fromJson(hatoMap);
        hatosList.add(hato);
      }
      
      // Vincular potreros a sus respectivos Hatos
      for (var pJson in potrerosJson) {
        final geoJson = jsonDecode(pJson['geojson'] as String);
        final coordinates = (geoJson['coordinates'] as List).first as List;
        
        final List<Map<String, dynamic>> vertices = coordinates.map((coord) {
          return {'lat': coord[1], 'lng': coord[0]};
        }).toList();

        if (vertices.isNotEmpty && 
            vertices.first['lat'] == vertices.last['lat'] && 
            vertices.first['lng'] == vertices.last['lng']) {
          vertices.removeLast();
        }

        final potreroMap = {
          'id': pJson['id'].toString(),
          'hatoId': pJson['hato_id'].toString(),
          'nombre': pJson['nombre'],
          'areaHa': 0.0,
          'perimeterM': 0.0,
          'vertices': vertices,
        };
        
        final potrero = Potrero.fromJson(potreroMap);
        
        // Buscar el hato padre
        try {
          final parent = hatosList.firstWhere((h) => h.id == potrero.hatoId);
          parent.potreros.add(potrero);
        } catch (e) {
          // Hato padre no encontrado, ignorar
        }
      }
      
      return hatosList;
    } catch (e) {
      print('ApiService Error fetchHatos: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchTenants() async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/tenants'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) {
          return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (_) {}

    // Fallback con opciones estándar de finca
    return [
      {'id': 1, 'nombre': 'Hacienda Santa Inés (Demo)'},
      {'id': 2, 'nombre': 'Fundo El Roble (Guárico)'},
      {'id': 3, 'nombre': 'Ganadería San Pedro'},
    ];
  }

  Future<Hato> saveHato(Hato hato, {int? tenantId}) async {
    final baseUrl = await getBaseUrl();
    try {
      final numId = int.tryParse(hato.id);
      final response = await http.post(
        Uri.parse('$baseUrl/geocercas/hato'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'id': numId,
          'tenantId': tenantId ?? 1,
          'nombre': hato.nombre,
          'vertices': hato.vertices.map((v) => [v.latitude, v.longitude]).toList(),
        }),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final serverId = data['id'] != null ? data['id'].toString() : hato.id;
        debugPrint('✅ Hato guardado exitosamente en servidor: id=$serverId');
        return hato.copyWith(id: serverId);
      } else {
        debugPrint('⚠️ Error HTTP guardando hato (${response.statusCode}): ${response.body}');
      }
    } catch (e) {
      debugPrint('Aviso: Guardado remoto error ($e), guardando localmente.');
    }
    return hato;
  }

  Future<Potrero> savePotrero(Potrero potrero) async {
    final baseUrl = await getBaseUrl();
    int? parentHatoId = int.tryParse(potrero.hatoId);
    if (parentHatoId == null) {
      final digits = potrero.hatoId.replaceAll(RegExp(r'\D'), '');
      if (digits.isNotEmpty && digits.length <= 9) {
        parentHatoId = int.tryParse(digits);
      }
    }

    try {
      int? numId = int.tryParse(potrero.id);
      if (numId == null) {
        final digits = potrero.id.replaceAll(RegExp(r'\D'), '');
        if (digits.isNotEmpty && digits.length <= 9) {
          numId = int.tryParse(digits);
        }
      }

      final response = await http.post(
        Uri.parse('$baseUrl/geocercas/potrero'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'id': numId,
          'hatoId': parentHatoId ?? 1,
          'nombre': potrero.nombre,
          'capacidad': 10,
          'vertices': potrero.vertices.map((v) => [v.latitude, v.longitude]).toList(),
        }),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final serverId = data['id'] != null ? data['id'].toString() : potrero.id;
        debugPrint('✅ Potrero guardado exitosamente en servidor: id=$serverId');
        return potrero.copyWith(id: serverId, hatoId: parentHatoId?.toString() ?? potrero.hatoId);
      } else {
        debugPrint('⚠️ Error HTTP guardando potrero (${response.statusCode}): ${response.body}');
      }
    } catch (e) {
      debugPrint('Aviso: Guardado remoto error ($e), guardando localmente.');
    }
    return potrero;
  }

  Future<void> deleteHato(String hatoId) async {
    final baseUrl = await getBaseUrl();
    int? numId = int.tryParse(hatoId);
    if (numId == null) {
      final digits = hatoId.replaceAll(RegExp(r'\D'), '');
      if (digits.isNotEmpty && digits.length <= 9) {
        numId = int.tryParse(digits);
      }
    }
    if (numId != null) {
      final response = await http.delete(
        Uri.parse('$baseUrl/geocercas/hato/$numId'),
      ).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) {
        throw Exception('Fallo al eliminar hato: ${response.body}');
      }
    }
  }

  Future<void> deletePotrero(String potreroId) async {
    final baseUrl = await getBaseUrl();
    int? numId = int.tryParse(potreroId);
    if (numId == null) {
      final digits = potreroId.replaceAll(RegExp(r'\D'), '');
      if (digits.isNotEmpty && digits.length <= 9) {
        numId = int.tryParse(digits);
      }
    }
    if (numId != null) {
      final response = await http.delete(
        Uri.parse('$baseUrl/geocercas/potrero/$numId'),
      ).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) {
        throw Exception('Fallo al eliminar potrero: ${response.body}');
      }
    }
  }

  // ==========================================
  // INVENTARIO Y RECEPCIÓN DE LOTES DE COLLARES
  // ==========================================

  /// Consulta el inventario completo de collares desde la base de datos
  Future<List<CollarInventario>> fetchCollaresInventario({
    String? search,
    String? estado,
    int? loteId,
    int? tenantId,
  }) async {
    final baseUrl = await getBaseUrl();
    try {
      final queryParams = <String, String>{
        'userRole': 'SUPERADMIN',
      };
      if (search != null && search.trim().isNotEmpty) {
        queryParams['search'] = search.trim();
      }
      if (estado != null && estado != 'TODOS') {
        queryParams['estado'] = estado;
      }
      if (loteId != null) {
        queryParams['loteId'] = loteId.toString();
      }
      if (tenantId != null) {
        queryParams['tenantId'] = tenantId.toString();
      }

      final uri = Uri.parse('$baseUrl/collares/inventario').replace(queryParameters: queryParams);
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPERADMIN',
        },
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => CollarInventario.fromJson(Map<String, dynamic>.from(json as Map))).toList();
      }
    } catch (e) {
      debugPrint('ApiService fetchCollaresInventario fallback: $e');
    }

    // Fallback con datos locales si la red está en modo offline
    return _getFallbackInventario(search: search, estado: estado);
  }

  /// Consulta todos los lotes de hardware registrados
  Future<List<LoteHardware>> fetchLotesCollares() async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/collares/lotes'),
        headers: {'x-user-role': 'SUPERADMIN'},
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => LoteHardware.fromJson(Map<String, dynamic>.from(json as Map))).toList();
      }
    } catch (e) {
      debugPrint('ApiService fetchLotesCollares fallback: $e');
    }

    return [
      const LoteHardware(
        id: 1,
        codigoLote: 'L-2026-08',
        proveedor: 'Shenzhen IoT Tech Co.',
        cantidadTotal: 50,
        versionHardware: 'HW-v2.0',
        versionFirmwareInicial: '1.0.0',
        tenantNombre: 'Almacén Central',
        collaresRegistrados: 50,
        collaresEnAlmacen: 45,
        collaresEnRevision: 5,
      ),
      const LoteHardware(
        id: 2,
        codigoLote: 'L-2026-09',
        proveedor: 'CowIA Hardware Lab',
        cantidadTotal: 100,
        versionHardware: 'HW-v2.1',
        versionFirmwareInicial: '1.2.0',
        tenantNombre: 'Hacienda Santa Inés',
        collaresRegistrados: 20,
        collaresEnAlmacen: 20,
      ),
    ];
  }

  /// Consulta las métricas cuantitativas consolidadas del inventario
  Future<Map<String, int>> fetchCollaresKpis() async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/collares/kpis'),
        headers: {'x-user-role': 'SUPERADMIN'},
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return data.map((k, v) => MapEntry(k, int.tryParse(v.toString()) ?? 0));
      }
    } catch (_) {}

    return {
      'total': 50,
      'en_almacen': 45,
      'activos': 0,
      'en_revision': 5,
      'desactivados': 0,
      'bateria_baja': 0,
    };
  }

  /// Registra un lote de collares en la base de datos (POST /api/collares/lotes)
  Future<Map<String, dynamic>> registrarLoteCollares({
    required String codigoLote,
    required String proveedor,
    DateTime? fechaRecepcion,
    String? versionHardware,
    String? versionFirmwareInicial,
    int? tenantId,
    String? ubicacionAlmacen,
    String? notas,
    required List<ScannedCollarDraft> collares,
  }) async {
    final baseUrl = await getBaseUrl();
    final payload = {
      'userRole': 'SUPERADMIN',
      'codigoLote': codigoLote.trim().toUpperCase(),
      'proveedor': proveedor.trim(),
      'fechaRecepcion': fechaRecepcion?.toIso8601String().substring(0, 10),
      'versionHardware': versionHardware ?? 'HW-v2.0',
      'versionFirmwareInicial': versionFirmwareInicial ?? '1.0.0',
      'tenantId': tenantId,
      'ubicacionAlmacen': ubicacionAlmacen ?? 'Almacén Central CowIA',
      'notas': notas,
      'modo': 'lista',
      'items': collares.map((c) => {
        'id': c.id.trim().toUpperCase(),
        'imei': c.imei.trim(),
        'numeroSim': c.numeroSim.trim(),
        'numeroSerie': c.numeroSerie?.trim(),
      }).toList(),
    };

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/collares/lotes'),
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPERADMIN',
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        final err = jsonDecode(response.body);
        throw Exception(err['error'] ?? 'Fallo al registrar lote en el servidor.');
      }
    } catch (e) {
      debugPrint('Error registrando lote en API: $e');
      rethrow;
    }
  }

  /// Actualiza el estado operativo de un collar (PATCH /api/collares/:id/estado)
  Future<CollarInventario?> actualizarEstadoCollar({
    required String collarId,
    required String nuevoEstado,
    required String motivo,
  }) async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/collares/$collarId/estado'),
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPERADMIN',
        },
        body: jsonEncode({
          'userRole': 'SUPERADMIN',
          'nuevoEstado': nuevoEstado,
          'motivo': motivo,
        }),
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['collar'] != null) {
          return CollarInventario.fromJson(Map<String, dynamic>.from(data['collar'] as Map));
        }
      }
    } catch (e) {
      debugPrint('Error actualizando estado en API: $e');
      rethrow;
    }
    return null;
  }

  /// Obtiene la bitácora de auditoría e historial de un collar
  Future<List<CollarHistorial>> fetchCollarHistorial(String collarId) async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/collares/$collarId/historial'),
        headers: {'x-user-role': 'SUPERADMIN'},
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => CollarHistorial.fromJson(Map<String, dynamic>.from(json as Map))).toList();
      }
    } catch (_) {}
    return [];
  }

  List<CollarInventario> _getFallbackInventario({String? search, String? estado}) {
    final list = [
      CollarInventario(
        id: 'COW-2026-0048',
        numeroSim: '+584129990048',
        imei: '864920048192031',
        numeroSerie: 'SN-L2026-08-0048',
        estado: 'EN_ALMACEN',
        loteCodigo: 'L-2026-08',
        loteProveedor: 'Shenzhen IoT Tech',
        ubicacionAlmacen: 'Almacén Central CowIA',
        nivelBateria: 95,
        senalCelular: 5,
        versionFirmware: '1.2.0',
        ultimaConexion: DateTime.now().subtract(const Duration(minutes: 12)),
      ),
      CollarInventario(
        id: 'COW-2026-0047',
        numeroSim: '+584129990047',
        imei: '864920047192030',
        numeroSerie: 'SN-L2026-08-0047',
        estado: 'EN_ALMACEN',
        loteCodigo: 'L-2026-08',
        loteProveedor: 'Shenzhen IoT Tech',
        ubicacionAlmacen: 'Almacén Central CowIA',
        nivelBateria: 89,
        senalCelular: 4,
        versionFirmware: '1.2.0',
        ultimaConexion: DateTime.now().subtract(const Duration(minutes: 25)),
      ),
      CollarInventario(
        id: 'COW-2026-0046',
        numeroSim: '+584129990046',
        imei: '864920046192029',
        numeroSerie: 'SN-L2026-08-0046',
        estado: 'EN_REVISION',
        motivoEstado: 'Falla en antena GNSS reportada',
        loteCodigo: 'L-2026-08',
        loteProveedor: 'Shenzhen IoT Tech',
        ubicacionAlmacen: 'Taller de Diagnóstico',
        nivelBateria: 42,
        senalCelular: 2,
        versionFirmware: '1.1.0',
        ultimaConexion: DateTime.now().subtract(const Duration(hours: 3)),
      ),
      CollarInventario(
        id: 'collar_test_001',
        numeroSim: '+584129990001',
        imei: '860123456789001',
        numeroSerie: 'SN-TEST-001',
        estado: 'ACTIVO',
        tenantNombre: 'Hacienda Santa Inés',
        animalArete: 'NEL-042',
        animalRaza: 'Nelore',
        animalCategoria: 'Novillo',
        potreroNombre: 'Potrero A1 - Pastura Norte',
        hatoNombre: 'Hato La Esperanza',
        nivelBateria: 94,
        senalCelular: 4,
        versionFirmware: '1.2.0',
        ultimaConexion: DateTime.now().subtract(const Duration(minutes: 3)),
      ),
    ];

    return list.where((c) {
      if (estado != null && estado != 'TODOS' && c.estado != estado) return false;
      if (search != null && search.trim().isNotEmpty) {
        final q = search.trim().toLowerCase();
        final matchId = c.id.toLowerCase().contains(q);
        final matchImei = (c.imei ?? '').toLowerCase().contains(q);
        final matchSim = c.numeroSim.toLowerCase().contains(q);
        final matchArete = (c.animalArete ?? '').toLowerCase().contains(q);
        if (!matchId && !matchImei && !matchSim && !matchArete) return false;
      }
      return true;
    }).toList();
  }
}
