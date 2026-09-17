import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:agrogis_flutter/models/hato.dart';
import 'package:agrogis_flutter/services/gis_service.dart';

void main() {
  group('GISService - Cálculo de Área y Perímetro', () {
    test('Calcula área de un polígono cuadrangular (~100m x 100m = ~1 ha)', () {
      // 100m aproximado cerca del ecuador (lat: 0.0009°, lng: 0.0009°)
      final vertices = [
        const LatLng(4.0000, -73.0000),
        const LatLng(4.0000, -73.0010),
        const LatLng(4.0010, -73.0010),
        const LatLng(4.0010, -73.0000),
      ];

      final areaHa = GISService.calculateGeodesicAreaHa(vertices);
      final areaM2 = GISService.calculateGeodesicAreaM2(vertices);
      final perimeter = GISService.calculateGeodesicPerimeterM(vertices);

      expect(areaHa, greaterThan(1.0));
      expect(areaHa, lessThan(2.0));
      expect(areaM2, equals(areaHa * 10000.0));
      expect(perimeter, greaterThan(400.0));
    });
  });

  group('GISService - Regla 1: Sin auto-intersecciones', () {
    test('Detecta auto-intersección en forma de reloj de arena / lazo en 8', () {
      // Polígono cruzado
      final crossedPolygon = [
        const LatLng(4.0, -73.0),
        const LatLng(4.002, -73.002),
        const LatLng(4.0, -73.002),
        const LatLng(4.002, -73.0),
      ];

      final result = GISService.validatePolygonCompletion(
        vertices: crossedPolygon,
        isHato: true,
        existingHatos: [],
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('Auto-intersección'));
      expect(result.conflictPoint, isNotNull);
    });
  });

  group('GISService - Regla 2 y 5: Hatos independientes y colindancias', () {
    final hato1 = Hato(
      id: 'h1',
      nombre: 'Hato La Esperanza',
      areaHa: 10.0,
      perimeterM: 1200.0,
      vertices: [
        const LatLng(4.000, -73.000),
        const LatLng(4.000, -73.010),
        const LatLng(4.010, -73.010),
        const LatLng(4.010, -73.000),
      ],
    );

    test('Permite colindancia exacta (borde compartido) sin error', () {
      // Hato 2 comparte el lindero oeste de Hato 1 (x = -73.010)
      final colindante = [
        const LatLng(4.000, -73.010),
        const LatLng(4.000, -73.020),
        const LatLng(4.010, -73.020),
        const LatLng(4.010, -73.010),
      ];

      final result = GISService.validatePolygonCompletion(
        vertices: colindante,
        isHato: true,
        existingHatos: [hato1],
      );

      expect(result.isValid, isTrue);
    });

    test('Rechaza solapamiento e invasión entre Hatos', () {
      // Hato que invade el interior de Hato 1
      final invasor = [
        const LatLng(4.005, -73.005),
        const LatLng(4.005, -73.015),
        const LatLng(4.015, -73.015),
        const LatLng(4.015, -73.005),
      ];

      final result = GISService.validatePolygonCompletion(
        vertices: invasor,
        isHato: true,
        existingHatos: [hato1],
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('Hato'));
    });
  });

  group('GISService - Regla 3 y 7: Contención de Potreros y Concavidades (25/50/75%)', () {
    // Hato en forma de herradura cóncava
    final hatoHerradura = Hato(
      id: 'h_concavo',
      nombre: 'Hato La Herradura',
      areaHa: 20.0,
      perimeterM: 2000.0,
      vertices: [
        const LatLng(4.00, -73.00),
        const LatLng(4.00, -73.03),
        const LatLng(4.03, -73.03),
        const LatLng(4.03, -73.02),
        const LatLng(4.01, -73.02),
        const LatLng(4.01, -73.01),
        const LatLng(4.03, -73.01),
        const LatLng(4.03, -73.00),
      ],
    );

    test('Rechaza Potrero que cruza la concavidad exterior (evaluador 25/50/75%)', () {
      // Potrero cuyos vértices tocan el hato pero su cerca atraviesa la bahía exterior
      final potreroInvasor = [
        const LatLng(4.025, -73.025), // En el brazo izquierdo
        const LatLng(4.025, -73.005), // En el brazo derecho (cruza el hueco exterior)
        const LatLng(4.005, -73.005),
        const LatLng(4.005, -73.025),
      ];

      final result = GISService.validatePolygonCompletion(
        vertices: potreroInvasor,
        isHato: false,
        existingHatos: [hatoHerradura],
        parentHato: hatoHerradura,
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('concavidad'));
    });
  });

  group('GISService - Regla 6: Efecto Isla (Envolvimiento)', () {
    final hatoChico = Hato(
      id: 'h_small',
      nombre: 'Hato Chico',
      areaHa: 2.0,
      perimeterM: 400.0,
      vertices: [
        const LatLng(4.01, -73.01),
        const LatLng(4.01, -73.02),
        const LatLng(4.02, -73.02),
        const LatLng(4.02, -73.01),
      ],
    );

    test('Detecta cuando un polígono nuevo encierra completamente a otro sin compartir vértices', () {
      final hatoGigante = [
        const LatLng(4.00, -73.00),
        const LatLng(4.00, -73.03),
        const LatLng(4.03, -73.03),
        const LatLng(4.03, -73.00),
      ];

      final result = GISService.validatePolygonCompletion(
        vertices: hatoGigante,
        isHato: true,
        existingHatos: [hatoChico],
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('Efecto Isla'));
    });
  });
}
