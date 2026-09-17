import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:movil_ops/models/hato.dart';
import 'package:movil_ops/models/potrero.dart';
import 'package:movil_ops/services/gis_service.dart';

void main() {
  group('GISService - Validación de Primer Vértice (validateNewVertex)', () {
    // Definimos un Hato existente rectangular: (0,0) a (10,10)
    final existingHato = Hato(
      id: 'hato_1',
      nombre: 'Hato La Ceiba',
      areaHa: 100.0,
      perimeterM: 4000.0,
      vertices: [
        const LatLng(0.0, 0.0),
        const LatLng(0.0, 10.0),
        const LatLng(10.0, 10.0),
        const LatLng(10.0, 0.0),
      ],
      potreros: [
        // Potrero interno A en el cuadrante (1,1) a (4,4)
        Potrero(
          id: 'pot_A',
          nombre: 'Potrero A',
          hatoId: 'hato_1',
          areaHa: 9.0,
          perimeterM: 1200.0,
          vertices: [
            const LatLng(1.0, 1.0),
            const LatLng(1.0, 4.0),
            const LatLng(4.0, 4.0),
            const LatLng(4.0, 1.0),
          ],
        ),
      ],
    );

    test('Crear HATO: Rechaza primer vértice dentro de un Hato existente', () {
      final pointInsideHato = const LatLng(5.0, 5.0);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointInsideHato,
        isHato: true,
        existingHatos: [existingHato],
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('El punto inicial cae dentro del interior del Hato "Hato La Ceiba"'));
      expect(result.conflictPoint, equals(pointInsideHato));
    });

    test('Crear HATO: Rechaza primer vértice dentro de un Potrero de otro Hato', () {
      final pointInsidePotrero = const LatLng(2.0, 2.0);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointInsidePotrero,
        isHato: true,
        existingHatos: [existingHato],
      );

      expect(result.isValid, isFalse);
      expect(result.conflictPoint, equals(pointInsidePotrero));
    });

    test('Crear HATO: Acepta primer vértice fuera de cualquier Hato existente', () {
      final pointOutside = const LatLng(15.0, 15.0);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointOutside,
        isHato: true,
        existingHatos: [existingHato],
      );

      expect(result.isValid, isTrue);
      expect(result.errorMessage, isNull);
    });

    test('Crear HATO: Acepta primer vértice sobre el lindero compartido de un Hato (Snapping)', () {
      final pointOnBoundary = const LatLng(0.0, 5.0);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointOnBoundary,
        isHato: true,
        existingHatos: [existingHato],
      );

      expect(result.isValid, isTrue);
    });

    test('Crear POTRERO: Rechaza primer vértice fuera de los límites del Hato padre', () {
      final pointOutsideParent = const LatLng(15.0, 15.0);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointOutsideParent,
        isHato: false,
        existingHatos: [existingHato],
        parentHato: existingHato,
        siblingPotreros: existingHato.potreros,
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('debe estar dentro de los límites del Hato "Hato La Ceiba"'));
      expect(result.conflictPoint, equals(pointOutsideParent));
    });

    test('Crear POTRERO: Rechaza primer vértice dentro del interior de un Potrero hermano existente', () {
      final pointInsidePotreroA = const LatLng(2.5, 2.5);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointInsidePotreroA,
        isHato: false,
        existingHatos: [existingHato],
        parentHato: existingHato,
        siblingPotreros: existingHato.potreros,
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('cae en el interior del Potrero "Potrero A"'));
      expect(result.conflictPoint, equals(pointInsidePotreroA));
    });

    test('Crear POTRERO: Acepta primer vértice en zona libre del Hato padre', () {
      final pointInFreeZone = const LatLng(7.0, 7.0);
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointInFreeZone,
        isHato: false,
        existingHatos: [existingHato],
        parentHato: existingHato,
        siblingPotreros: existingHato.potreros,
      );

      expect(result.isValid, isTrue);
    });

    test('Crear POTRERO: Acepta primer vértice sobre la cerca compartida de Potrero hermano (Snapping)', () {
      final pointOnPotreroBoundary = const LatLng(4.0, 2.0); // En el borde este de Potrero A
      final result = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: pointOnPotreroBoundary,
        isHato: false,
        existingHatos: [existingHato],
        parentHato: existingHato,
        siblingPotreros: existingHato.potreros,
      );

      expect(result.isValid, isTrue);
    });
  });

  group('GISService - Validación de tramos subsecuentes', () {
    final existingHato = Hato(
      id: 'hato_1',
      nombre: 'Hato La Ceiba',
      areaHa: 100.0,
      perimeterM: 4000.0,
      vertices: [
        const LatLng(0.0, 0.0),
        const LatLng(0.0, 10.0),
        const LatLng(10.0, 10.0),
        const LatLng(10.0, 0.0),
      ],
      potreros: [
        Potrero(
          id: 'pot_A',
          nombre: 'Potrero A',
          hatoId: 'hato_1',
          areaHa: 9.0,
          perimeterM: 1200.0,
          vertices: [
            const LatLng(1.0, 1.0),
            const LatLng(1.0, 4.0),
            const LatLng(4.0, 4.0),
            const LatLng(4.0, 1.0),
          ],
        ),
      ],
    );

    test('Rechaza nuevo tramo que corta una línea ya trazada (Auto-intersección)', () {
      final currentVertices = [
        const LatLng(20.0, 20.0),
        const LatLng(20.0, 30.0),
        const LatLng(30.0, 30.0),
      ];
      // Cruzar diagonalmente cortando el tramo (20,20)-(20,30)
      final crossingPoint = const LatLng(19.0, 25.0);

      final result = GISService.validateNewVertex(
        currentVertices: currentVertices,
        newVertex: crossingPoint,
        isHato: true,
        existingHatos: [existingHato],
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('corta una línea ya trazada'));
    });

    test('Crear POTRERO: Rechaza nuevo tramo que corta la cerca de un potrero vecino', () {
      final currentVertices = [
        const LatLng(0.5, 2.5),
      ];
      // Intentar trazar cruzando Potrero A hacia (5.0, 2.5)
      final crossingPoint = const LatLng(5.0, 2.5);

      final result = GISService.validateNewVertex(
        currentVertices: currentVertices,
        newVertex: crossingPoint,
        isHato: false,
        existingHatos: [existingHato],
        parentHato: existingHato,
        siblingPotreros: existingHato.potreros,
      );

      expect(result.isValid, isFalse);
      expect(result.errorMessage, contains('corta la cerca del Potrero vecino "Potrero A"'));
    });
  });

  group('GISService - Imán a Linderos (Edge Snapping) y Múltiples Potreros', () {
    // Hato de 1000m x 1000m aproximadamente en coordenadas decimales:
    // (9.7000, -67.3500) a (9.7100, -67.3400)
    final parentHato = Hato(
      id: 'hato_norte',
      nombre: 'Hato Norte',
      areaHa: 100.0,
      perimeterM: 4000.0,
      vertices: [
        const LatLng(9.7000, -67.3500), // Suroeste
        const LatLng(9.7100, -67.3500), // Noroeste
        const LatLng(9.7100, -67.3400), // Noreste
        const LatLng(9.7000, -67.3400), // Sureste
      ],
      potreros: [],
    );

    test('projectPointToSegment proyecta correctamente sobre una lindera recta', () {
      final a = const LatLng(9.7100, -67.3500);
      final b = const LatLng(9.7100, -67.3400);

      // Punto tocado ligeramente afuera al norte (9.7101, -67.3450)
      final rawTouch = const LatLng(9.7101, -67.3450);
      final proj = GISService.projectPointToSegment(rawTouch, a, b);

      // La latitud proyectada debe ser exactamente 9.7100 y longitud -67.3450
      expect(proj.latitude, closeTo(9.7100, 1e-7));
      expect(proj.longitude, closeTo(-67.3450, 1e-7));
    });

    test('applyEdgeSnapping ajusta punto tocado cerca de la lindera exterior', () {
      // Tocado a ~11 metros al norte del lindero norte del hato
      final nearLinderaPoint = const LatLng(9.7101, -67.3460);

      final snapped = GISService.applyEdgeSnapping(
        nearLinderaPoint,
        [parentHato.vertices],
        25.0, // 25 metros de tolerancia
      );

      // Debe haber sido proyectado a la lindera norte (latitud 9.7100)
      expect(snapped.latitude, closeTo(9.7100, 1e-7));
      expect(snapped.longitude, closeTo(-67.3460, 1e-7));
    });

    test('Escenario 3 Potreros: Potrero 1, 2 y 3 comparten la misma lindera norte del Hato padre', () {
      // 1. Potrero 1: Ocupa el tercio izquierdo (longitud -67.3500 a -67.3467)
      final potrero1 = Potrero(
        id: 'pot_1',
        nombre: 'Potrero 1',
        hatoId: 'hato_norte',
        areaHa: 33.3,
        perimeterM: 2000.0,
        vertices: [
          const LatLng(9.7000, -67.3500),
          const LatLng(9.7100, -67.3500), // Esquina NO Hato
          const LatLng(9.7100, -67.3467), // Vértice sobre la lindera norte
          const LatLng(9.7000, -67.3467), // Vértice sobre la lindera sur
        ],
      );

      // Actualizamos Hato con Potrero 1
      final hatoConPot1 = parentHato.copyWith(potreros: [potrero1]);
      final snapPointsPot1 = GISService.collectAllSnapPoints([hatoConPot1]);

      // 2. Trazar Potrero 2: Tocar cerca del vértice compartido en la lindera norte (9.7100, -67.3467)
      final touchNearSharedBorder = const LatLng(9.71005, -67.34668);

      final snappedStartPot2 = GISService.applyComprehensiveSnapping(
        rawPoint: touchNearSharedBorder,
        vertexSnapPoints: snapPointsPot1,
        isHato: false,
        existingHatos: [hatoConPot1],
        parentHato: hatoConPot1,
        siblingPotreros: hatoConPot1.potreros,
      );

      // Debe haber hecho snap exacto al vértice de Potrero 1 sobre la lindera
      expect(snappedStartPot2.latitude, closeTo(9.7100, 1e-6));
      expect(snappedStartPot2.longitude, closeTo(-67.3467, 1e-4));

      // Validar que el primer vértice de Potrero 2 es 100% válido sobre la cerca compartida
      final val1 = GISService.validateNewVertex(
        currentVertices: [],
        newVertex: snappedStartPot2,
        isHato: false,
        existingHatos: [hatoConPot1],
        parentHato: hatoConPot1,
        siblingPotreros: hatoConPot1.potreros,
      );
      expect(val1.isValid, isTrue);

      // Tocar en el tercio siguiente sobre la lindera norte (nuevo vértice para Potrero 2 y 3)
      final touchSecondDivision = const LatLng(9.71008, -67.3433);
      final snappedSecondDivision = GISService.applyComprehensiveSnapping(
        rawPoint: touchSecondDivision,
        vertexSnapPoints: snapPointsPot1,
        isHato: false,
        existingHatos: [hatoConPot1],
        parentHato: hatoConPot1,
        siblingPotreros: hatoConPot1.potreros,
      );

      // Debe haber hecho Edge Snap a la lindera norte del Hato padre
      expect(snappedSecondDivision.latitude, closeTo(9.7100, 1e-7));

      final val2 = GISService.validateNewVertex(
        currentVertices: [snappedStartPot2],
        newVertex: snappedSecondDivision,
        isHato: false,
        existingHatos: [hatoConPot1],
        parentHato: hatoConPot1,
        siblingPotreros: hatoConPot1.potreros,
      );
      expect(val2.isValid, isTrue);
    });
  });
}
