import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/hato_maestro.dart';

class ApiClient {
  // Servidor backend local CollarNet
  static const String defaultBaseUrl = 'http://192.168.86.21:3500/api';

  static Future<String> getBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      var savedUrl = prefs.getString('custom_server_url');
      if (savedUrl == null || savedUrl.contains('cowai.net') || savedUrl.contains('192.168.86.23') || savedUrl.contains('192.168.86.30') || savedUrl.isEmpty) {
        savedUrl = defaultBaseUrl;
        await prefs.setString('custom_server_url', defaultBaseUrl);
      }
      final clean = savedUrl.trim();
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean.endsWith('/api') ? clean : (clean.endsWith('/') ? '${clean}api' : '$clean/api');
      }
      if (clean.contains('cowai.net') || (!clean.contains(':') && !RegExp(r'^\d+\.\d+\.\d+\.\d+').hasMatch(clean))) {
        return 'https://$clean/api';
      }
      return 'http://$clean/api';
    } catch (_) {
      return defaultBaseUrl;
    }
  }

  /// Obtiene la lista de Tenants / Adquirientes registrados en CollarNet
  static Future<List<Map<String, dynamic>>> fetchTenants() async {
    final baseUrl = await getBaseUrl();
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/tenants'))
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((t) => {
          'id': t['id'],
          'nombre': t['nombre'] ?? 'Hacienda sin nombre',
          'documento': t['documento_identidad'] ?? 'S/D',
          'collaresContratados': t['limite_collares'] ?? 50,
        }).toList();
      }
    } catch (e) {
      // Fallback a lista offline por defecto para demostración
    }
    return [
      {'id': 1, 'nombre': 'Hacienda Santa María (Demo)', 'documento': 'J-4029104', 'collaresContratados': 100},
      {'id': 2, 'nombre': 'Fundo El Porvenir', 'documento': 'V-1849201', 'collaresContratados': 50},
      {'id': 3, 'nombre': 'Agropecuaria La Esperanza', 'documento': 'J-5019283', 'collaresContratados': 200},
    ];
  }

  /// Guarda un nuevo Hato Maestro en PostgreSQL/PostGIS de CollarNet
  static Future<HatoMaestro> saveHato(HatoMaestro hato) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/geocercas/hato'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(hato.toJson()),
    ).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      final serverId = data['id'] is int ? data['id'] : int.tryParse(data['id'].toString());
      return hato.copyWith(id: serverId);
    } else {
      throw Exception('Fallo al guardar Hato Maestro: ${response.body}');
    }
  }

  /// Sube un plano PDF al endpoint de IA (Gemini) de CollarNet para extraer linderos
  static Future<List<LatLng>> uploadPdfForAiExtraction(File pdfFile) async {
    final baseUrl = await getBaseUrl();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/geocercas/crear-ia'));
    request.files.add(await http.MultipartFile.fromPath('pdfFile', pdfFile.path));

    final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      final verticesRaw = data['data']['vertices'] as List;
      return verticesRaw.map((v) => LatLng(v[0] as double, v[1] as double)).toList();
    } else {
      throw Exception('Error en análisis IA: ${response.body}');
    }
  }
}
