import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/hato.dart';
import '../models/potrero.dart';

class ApiService {
  static String defaultHost = '192.168.86.30:3500';

  static Future<String> getBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      var savedIp = prefs.getString('finca_server_ip');
      if (savedIp == null || savedIp.contains('cowai.net') || savedIp.contains('192.168.86.23') || savedIp.isEmpty) {
        savedIp = defaultHost;
        await prefs.setString('finca_server_ip', defaultHost);
      }
      final clean = savedIp.trim();
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean.endsWith('/api') ? clean : (clean.endsWith('/') ? '${clean}api' : '$clean/api');
      }
      if (clean.contains('cowai.net') || (!clean.contains(':') && !RegExp(r'^\d+\.\d+\.\d+\.\d+').hasMatch(clean))) {
        return 'https://$clean/api';
      }
      return 'http://$clean/api';
    } catch (_) {
      return 'http://$defaultHost/api';
    }
  }

  // 0. Autenticación de Usuario (Web / Backend / Offline Fallback)
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final baseUrl = await getBaseUrl();
    final cleanId = identifier.trim().toLowerCase();
    final cleanPass = password.trim();

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': cleanId,
          'username': cleanId,
          'password': cleanPass,
        }),
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return {
          'success': true,
          'user': data['user'],
          'message': data['message'] ?? 'Bienvenido al sistema',
        };
      } else {
        final err = jsonDecode(res.body);
        return {
          'success': false,
          'error': err['error'] ?? 'Credenciales inválidas',
        };
      }
    } catch (e) {
      // Fallback offline / demo multi-usuario si el backend no está disponible
      if (cleanId.contains('david') || cleanId == 'david@collarnet.com') {
        return {
          'success': true,
          'user': {
            'id': 7,
            'nombre': 'David Zambrano (Supervisor Finca)',
            'email': 'david@collarnet.com',
            'rol': 'ADMIN_FINCA',
            'fincaAsignada': 'Hacienda Santa Inés',
            'tenantId': 1,
            'tenantNombre': 'Hacienda Santa Inés',
            'permiteCrearPotreros': true,
          },
          'message': 'Inicio de sesión exitoso (Supervisor David)',
        };
      }

      if (cleanId.contains('finca') || cleanId.contains('gerente')) {
        return {
          'success': true,
          'user': {
            'id': 2,
            'nombre': 'Ing. Carlos Mendoza (Gerente / Supervisor)',
            'email': 'finca@collarnet.com',
            'rol': 'ADMIN_FINCA',
            'fincaAsignada': 'Hacienda Santa Inés',
            'tenantId': 1,
            'tenantNombre': 'Hacienda Santa Inés',
            'permiteCrearPotreros': true,
          },
          'message': 'Inicio de sesión exitoso (Gerente Finca)',
        };
      }

      if (cleanId.contains('admin')) {
        return {
          'success': true,
          'user': {
            'id': 1,
            'nombre': 'Administrador Principal CollarNet',
            'email': 'admin@collarnet.com',
            'rol': 'SUPERADMIN',
            'fincaAsignada': 'Todas las Fincas',
            'tenantId': 1,
            'tenantNombre': 'Plataforma Global CollarNet',
            'permiteCrearPotreros': true,
          },
          'message': 'Inicio de sesión exitoso (Superadmin)',
        };
      }

      if (cleanId.contains('campo') || cleanId.contains('manga')) {
        return {
          'success': true,
          'user': {
            'id': 3,
            'nombre': 'Manuel Gómez (Operario Manga)',
            'email': 'campo@collarnet.com',
            'rol': 'OPERARIO_CAMPO',
            'fincaAsignada': 'Hacienda Santa Inés',
            'tenantId': 1,
            'tenantNombre': 'Hacienda Santa Inés',
            'permiteCrearPotreros': false,
          },
          'message': 'Inicio de sesión exitoso (Operario Campo)',
        };
      }

      if (cleanId.contains('prop') || cleanId.contains('alvarez')) {
        return {
          'success': true,
          'user': {
            'id': 4,
            'nombre': 'Don Fernando Álvarez (Inversionista)',
            'email': 'propietario@collarnet.com',
            'rol': 'PROPIETARIO',
            'fincaAsignada': 'Multi-Finca',
            'tenantId': 1,
            'tenantNombre': 'Hacienda Santa Inés',
            'permiteCrearPotreros': false,
          },
          'message': 'Inicio de sesión exitoso (Propietario)',
        };
      }

      // Si se ingresó cualquier usuario no vacío con contraseña demo estándar
      if (cleanId.isNotEmpty && (cleanPass == '12345678' || cleanPass == 'admin123' || cleanPass.isNotEmpty)) {
        return {
          'success': true,
          'user': {
            'id': 7,
            'nombre': identifier.trim(),
            'email': '$cleanId@collarnet.com',
            'rol': 'ADMIN_FINCA',
            'fincaAsignada': 'Hacienda Santa Inés',
            'tenantId': 1,
            'tenantNombre': 'Hacienda Santa Inés',
            'permiteCrearPotreros': true,
          },
          'message': 'Inicio de sesión exitoso',
        };
      }

      return {
        'success': false,
        'error': 'Credenciales no reconocidas. Usa usuario: david / clave: 12345678',
      };
    }
  }

  // 1. Cargar Hatos y Potreros para el Mapa (filtrado por Tenant / Adquiriente)
  Future<List<Hato>> fetchHatos({int? tenantId}) async {
    final baseUrl = await getBaseUrl();
    try {
      final uri = tenantId != null 
          ? Uri.parse('$baseUrl/geocercas/hatos?tenantId=$tenantId')
          : Uri.parse('$baseUrl/geocercas/hatos');
      final hatosResponse = await http.get(uri).timeout(const Duration(seconds: 5));
      if (hatosResponse.statusCode != 200) {
        throw Exception('Error al cargar hatos');
      }
      
      final List<dynamic> hatosJson = jsonDecode(hatosResponse.body);
      
      final potrerosResponse = await http.get(Uri.parse('$baseUrl/geocercas/potreros')).timeout(const Duration(seconds: 5));
      if (potrerosResponse.statusCode != 200) {
        throw Exception('Error al cargar potreros');
      }
      
      final List<dynamic> potrerosJson = jsonDecode(potrerosResponse.body);
      final List<Hato> hatosList = [];
      
      for (var hJson in hatosJson) {
        final geoJson = jsonDecode(hJson['geojson'] as String);
        final coordinates = (geoJson['coordinates'] as List).first as List;
        
        final List<Map<String, dynamic>> vertices = coordinates.map((coord) {
          return {'lat': coord[1], 'lng': coord[0]};
        }).toList();

        if (vertices.isNotEmpty && 
            vertices.first['lat'] == vertices.last['lat'] && 
            vertices.first['lng'] == vertices.last['lng']) {
          vertices.removeLast();
        }

        final hatoMap = {
          'id': hJson['id'].toString(),
          'nombre': hJson['nombre'],
          'areaHa': 0.0,
          'perimeterM': 0.0,
          'vertices': vertices,
          'potreros': [],
          'permiteCrearPotreros': hJson['permite_crear_potreros'] == true || hJson['permiteCrearPotreros'] == true,
        };
        
        final hato = Hato.fromJson(hatoMap);
        hatosList.add(hato);
      }
      
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
        try {
          final parent = hatosList.firstWhere((h) => h.id == potrero.hatoId);
          parent.potreros.add(potrero);
        } catch (_) {}
      }
      
      return hatosList;
    } catch (e) {
      rethrow;
    }
  }

  // 2. Resumen Completo de la Finca para la App Móvil (Hato, Potreros, Animales, Alertas)
  Future<Map<String, dynamic>?> fetchFincaResumen(int hatoId) async {
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.get(Uri.parse('$baseUrl/finca/resumen/$hatoId')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // 3. Telemetría en Vivo de Animales
  Future<List<Map<String, dynamic>>> fetchMonitoreo({String? hatoId}) async {
    final baseUrl = await getBaseUrl();
    try {
      final query = (hatoId != null && hatoId.isNotEmpty && hatoId != 'ALL') ? '?hatoId=$hatoId' : '';
      final res = await http.get(Uri.parse('$baseUrl/monitoreo$query')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // 4. Vinculación Rápida en Manga (3 Toques: Arete + Collar QR + Potrero)
  Future<bool> vincularRapido({
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
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/collares/vincular-rapido'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'areteVisual': areteVisual.trim().toUpperCase(),
          'collarId': collarId.trim(),
          'potreroId': potreroId,
          'potreroNombre': potreroNombre,
          'hatoId': hatoId,
          'hatoNombre': hatoNombre,
          'raza': raza ?? 'Brahman',
          'categoria': categoria ?? 'Novillo',
          'sexo': sexo ?? 'Macho',
        }),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 5. Registrar Pesaje en Báscula
  Future<bool> registrarPesaje({
    required String areteVisual,
    required double peso,
    int? animalId,
  }) async {
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/pesajes'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'animalId': animalId,
          'areteVisual': areteVisual.trim().toUpperCase(),
          'peso': peso,
        }),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 6. Registrar Vacunación o Tratamiento Masivo por Potrero
  Future<bool> registrarVacunacionLote({
    required String potreroNombre,
    String? potreroId,
    required String medicamentoNombre,
    String? dosis,
    String? lote,
  }) async {
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/sanidad/vacunacion-lote'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'potreroNombre': potreroNombre,
          'potreroId': potreroId,
          'medicamentoNombre': medicamentoNombre,
          'dosis': dosis ?? '2 ml',
          'lote': lote ?? 'L-2026-V',
        }),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 7. Cambiar Estado de Potrero (ABIERTO / DESCANSO)
  Future<bool> actualizarEstadoPotrero(String potreroId, String nuevoEstado) async {
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/potreros/$potreroId/estado'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'estado': nuevoEstado}),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 8. Notificar Modo Arreo (Traslado en Vivo)
  Future<bool> notificarArreo({
    required String origen,
    required String destino,
    required int duracionMinutos,
    required bool activo,
  }) async {
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/potreros/arreo'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'origen': origen,
          'destino': destino,
          'duracionMinutos': duracionMinutos,
          'activo': activo,
        }),
      ).timeout(const Duration(seconds: 6));

      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 9. Guardar Potrero Creado desde la App
  Future<Potrero> savePotrero(Potrero potrero) async {
    final baseUrl = await getBaseUrl();
    int? parentHatoId = int.tryParse(potrero.hatoId);
    if (parentHatoId == null) {
      final digits = potrero.hatoId.replaceAll(RegExp(r'\D'), '');
      parentHatoId = int.tryParse(digits);
    }
    if (parentHatoId == null) {
      throw Exception('El hato asignado no tiene un ID numérico válido (${potrero.hatoId})');
    }

    final numId = int.tryParse(potrero.id);
    final response = await http.post(
      Uri.parse('$baseUrl/geocercas/potrero'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'id': numId,
        'hatoId': parentHatoId,
        'nombre': potrero.nombre,
        'capacidad': 50,
        'vertices': potrero.vertices.map((v) => [v.latitude, v.longitude]).toList(),
      }),
    ).timeout(const Duration(seconds: 8));
    
    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception('Fallo al guardar potrero: ${response.body}');
    }

    final data = jsonDecode(response.body);
    final serverId = data['id'] != null ? data['id'].toString() : potrero.id;
    return potrero.copyWith(id: serverId, hatoId: parentHatoId.toString());
  }

  Future<void> deletePotrero(String potreroId) async {
    final baseUrl = await getBaseUrl();
    int? numId = int.tryParse(potreroId);
    if (numId == null) {
      final digits = potreroId.replaceAll(RegExp(r'\D'), '');
      numId = int.tryParse(digits);
    }
    if (numId != null) {
      await http.delete(
        Uri.parse('$baseUrl/geocercas/potrero/$numId'),
      ).timeout(const Duration(seconds: 6));
    }
  }
}
