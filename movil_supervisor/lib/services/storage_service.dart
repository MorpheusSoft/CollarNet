import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import 'gis_service.dart';
import 'api_service.dart';

class StorageService {
  static const String _storageKey = 'agrogis_hatos_data_v1';
  static final ApiService _apiService = ApiService();

  /// Carga la lista de Hatos desde la API o usa la caché local si falla la red
  static Future<List<Hato>> loadHatos() async {
    try {
      final remoteHatos = await _apiService.fetchHatos();
      if (remoteHatos.isNotEmpty) {
        await cacheLocally(remoteHatos);
        return remoteHatos;
      }
    } catch (e) {
      debugPrint('Aviso: No se pudo conectar a la API, usando caché local: $e');
    }

    // Fallback a SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? jsonString = prefs.getString(_storageKey);
      if (jsonString != null && jsonString.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(jsonString) as List<dynamic>;
        return decoded.map((h) => Hato.fromJson(h as Map<String, dynamic>)).toList();
      }
    } catch (e2) {
      debugPrint('Error en fallback local: $e2');
    }

    return getSampleData();
  }

  /// Guarda la lista de Hatos en la memoria local (SharedPreferences) como caché offline
  static Future<void> cacheLocally(List<Hato> hatos) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = hatos.map((h) => h.toJson()).toList();
      await prefs.setString(_storageKey, jsonEncode(jsonList));
    } catch (e) {
      debugPrint('Error guardando caché local: $e');
    }
  }

  /// Datos iniciales de demostración con polígonos agrícolas reales y colindancias válidas
  static List<Hato> getSampleData() {
    // Coordenadas base en zona agropecuaria (ej. 4.1420, -73.6260)
    // Hato Santa María: Gran polígono madre
    final hato1Vertices = [
      const LatLng(4.1450, -73.6300),
      const LatLng(4.1450, -73.6200),
      const LatLng(4.1370, -73.6200),
      const LatLng(4.1370, -73.6300),
    ];

    // Potrero 1: Norte del Hato (El Rodeo)
    final potrero1Vertices = [
      const LatLng(4.1450, -73.6300),
      const LatLng(4.1450, -73.6200),
      const LatLng(4.1410, -73.6200), // Borde compartido este
      const LatLng(4.1410, -73.6300), // Borde compartido oeste
    ];

    // Potrero 2: Sur del Hato (Las Palmas) - Comparte borde exacto con Potrero 1 en latitud 4.1410
    final potrero2Vertices = [
      const LatLng(4.1410, -73.6300), // Vértice compartido
      const LatLng(4.1410, -73.6200), // Vértice compartido
      const LatLng(4.1370, -73.6200),
      const LatLng(4.1370, -73.6300),
    ];

    final potrero1 = Potrero(
      id: 'pot_1',
      nombre: 'Potrero El Rodeo',
      hatoId: 'hato_1',
      areaHa: GISService.calculateGeodesicAreaHa(potrero1Vertices),
      perimeterM: GISService.calculateGeodesicPerimeterM(potrero1Vertices),
      vertices: potrero1Vertices,
      color: const Color(0xFF10B981), // Esmeralda
      notas: 'Pasto Brachiaria humidicola - Pastoreo rotacional',
    );

    final potrero2 = Potrero(
      id: 'pot_2',
      nombre: 'Potrero Las Palmas',
      hatoId: 'hato_1',
      areaHa: GISService.calculateGeodesicAreaHa(potrero2Vertices),
      perimeterM: GISService.calculateGeodesicPerimeterM(potrero2Vertices),
      vertices: potrero2Vertices,
      color: const Color(0xFF06B6D4), // Cyan
      notas: 'Pasto Mombasa con reservorio de agua sur',
    );

    final hato1 = Hato(
      id: 'hato_1',
      nombre: 'Hato Santa María',
      areaHa: GISService.calculateGeodesicAreaHa(hato1Vertices),
      perimeterM: GISService.calculateGeodesicPerimeterM(hato1Vertices),
      vertices: hato1Vertices,
      potreros: [potrero1, potrero2],
      color: const Color(0xFF3B82F6), // Azul
      notas: 'Predio principal con certificación de buenas prácticas ganaderas',
    );

    return [hato1];
  }

  /// Exporta los datos a formato GeoJSON estándar
  static String exportToGeoJSON(List<Hato> hatos) {
    final List<Map<String, dynamic>> features = [];

    for (final hato in hatos) {
      // Feature de Hato
      features.add({
        'type': 'Feature',
        'properties': {
          'id': hato.id,
          'tipo': 'Hato',
          'nombre': hato.nombre,
          'areaHa': hato.areaHa,
          'perimeterM': hato.perimeterM,
          'potrerosCount': hato.potreros.length,
          'notas': hato.notas,
        },
        'geometry': {
          'type': 'Polygon',
          'coordinates': [
            [
              ...hato.vertices.map((v) => [v.longitude, v.latitude]),
              [hato.vertices.first.longitude, hato.vertices.first.latitude],
            ]
          ],
        },
      });

      // Features de Potreros
      for (final potrero in hato.potreros) {
        features.add({
          'type': 'Feature',
          'properties': {
            'id': potrero.id,
            'tipo': 'Potrero',
            'nombre': potrero.nombre,
            'hatoPadre': hato.nombre,
            'hatoId': hato.id,
            'areaHa': potrero.areaHa,
            'perimeterM': potrero.perimeterM,
            'notas': potrero.notas,
          },
          'geometry': {
            'type': 'Polygon',
            'coordinates': [
              [
                ...potrero.vertices.map((v) => [v.longitude, v.latitude]),
                [potrero.vertices.first.longitude, potrero.vertices.first.latitude],
              ]
            ],
          },
        });
      }
    }

    final geoJsonMap = {
      'type': 'FeatureCollection',
      'features': features,
    };

    return const JsonEncoder.withIndent('  ').convert(geoJsonMap);
  }
}
