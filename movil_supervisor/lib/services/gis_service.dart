import 'dart:math' as math;
import 'package:latlong2/latlong.dart';
import '../models/hato.dart';
import '../models/potrero.dart';

/// Resultado de una validación topológica
class TopologyValidationResult {
  final bool isValid;
  final String? errorMessage;
  final LatLng? conflictPoint;
  final List<LatLng>? offendingSegment;

  const TopologyValidationResult({
    required this.isValid,
    this.errorMessage,
    this.conflictPoint,
    this.offendingSegment,
  });

  factory TopologyValidationResult.valid() {
    return const TopologyValidationResult(isValid: true);
  }

  factory TopologyValidationResult.invalid({
    required String message,
    LatLng? conflictPoint,
    List<LatLng>? offendingSegment,
  }) {
    return TopologyValidationResult(
      isValid: false,
      errorMessage: message,
      conflictPoint: conflictPoint,
      offendingSegment: offendingSegment,
    );
  }
}

/// Motor de Geometría Computacional y Topología Vectorial Pura (WGS84)
class GISService {
  static const double earthRadiusWGS84 = 6378137.0; // Metros
  static const double epsilon = 1e-9;
  static const double snappingToleranceDegrees = 0.00015; // ~15 metros para imanes

  // ==========================================
  // 1. CÁLCULO DE ÁREA Y PERÍMETRO (WGS84)
  // ==========================================

  /// Calcula el área geodésica sobre el elipsoide WGS84 (aproximación esférica de alta precisión)
  /// Retorna el área en Hectáreas (ha)
  static double calculateGeodesicAreaHa(List<LatLng> vertices) {
    if (vertices.length < 3) return 0.0;

    double total = 0.0;
    final int n = vertices.length;

    for (int i = 0; i < n; i++) {
      final p1 = vertices[i];
      final p2 = vertices[(i + 1) % n];

      final double lambda1 = _degToRad(p1.longitude);
      final double phi1 = _degToRad(p1.latitude);
      final double lambda2 = _degToRad(p2.longitude);
      final double phi2 = _degToRad(p2.latitude);

      // Integral esférica de área
      total += (lambda2 - lambda1) * (2.0 + math.sin(phi1) + math.sin(phi2));
    }

    final double areaM2 = (total * earthRadiusWGS84 * earthRadiusWGS84 / 2.0).abs();
    return areaM2 / 10000.0; // 1 ha = 10,000 m²
  }

  /// Retorna el área en metros cuadrados (m²)
  static double calculateGeodesicAreaM2(List<LatLng> vertices) {
    return calculateGeodesicAreaHa(vertices) * 10000.0;
  }

  /// Calcula el perímetro geodésico en metros mediante la fórmula de Haversine
  static double calculateGeodesicPerimeterM(List<LatLng> vertices, {bool isClosed = true}) {
    if (vertices.length < 2) return 0.0;
    double perimeter = 0.0;
    final int count = isClosed ? vertices.length : vertices.length - 1;

    for (int i = 0; i < count; i++) {
      final p1 = vertices[i];
      final p2 = vertices[(i + 1) % vertices.length];
      perimeter += calculateDistanceM(p1, p2);
    }
    return perimeter;
  }

  /// Distancia geodésica Haversine entre dos puntos en metros
  static double calculateDistanceM(LatLng p1, LatLng p2) {
    final double phi1 = _degToRad(p1.latitude);
    final double phi2 = _degToRad(p2.latitude);
    final double deltaPhi = _degToRad(p2.latitude - p1.latitude);
    final double deltaLambda = _degToRad(p2.longitude - p1.longitude);

    final double a = math.sin(deltaPhi / 2.0) * math.sin(deltaPhi / 2.0) +
        math.cos(phi1) * math.cos(phi2) * math.sin(deltaLambda / 2.0) * math.sin(deltaLambda / 2.0);

    final double c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a));
    return earthRadiusWGS84 * c;
  }

  static double _degToRad(double degrees) => degrees * math.pi / 180.0;

  // ==========================================
  // 2. GEOMETRÍA VECTORIAL Y PRODUCTO CRUZ
  // ==========================================

  /// Orientación de 3 puntos: 0 = colineal, 1 = horario, 2 = antihorario
  static int _orientation(LatLng p, LatLng q, LatLng r) {
    final double val = (q.latitude - p.latitude) * (r.longitude - q.longitude) -
        (q.longitude - p.longitude) * (r.latitude - q.latitude);

    if (val.abs() < epsilon) return 0; // Colineal
    return (val > 0) ? 1 : 2;
  }

  /// Verifica si el punto q se encuentra sobre el segmento pr (asumiendo colinealidad)
  static bool _onSegment(LatLng p, LatLng q, LatLng r) {
    return q.longitude <= math.max(p.longitude, r.longitude) + epsilon &&
        q.longitude >= math.min(p.longitude, r.longitude) - epsilon &&
        q.latitude <= math.max(p.latitude, r.latitude) + epsilon &&
        q.latitude >= math.min(p.latitude, r.latitude) - epsilon;
  }

  /// Son dos puntos prácticamente idénticos (tolerancia micrométrica)
  static bool arePointsEqual(LatLng a, LatLng b, [double tol = 1e-7]) {
    return (a.latitude - b.latitude).abs() <= tol && (a.longitude - b.longitude).abs() <= tol;
  }

  /// Determina si dos segmentos se cruzan estrictamente (intersección propia interior)
  /// Retorna false si solo comparten un punto extremo o son colindantes
  static bool doSegmentsIntersectProperly(LatLng p1, LatLng q1, LatLng p2, LatLng q2) {
    // Si comparten un extremo, no es cruce propio (es unión de vértice)
    if (arePointsEqual(p1, p2) ||
        arePointsEqual(p1, q2) ||
        arePointsEqual(q1, p2) ||
        arePointsEqual(q1, q2)) {
      return false;
    }

    final int o1 = _orientation(p1, q1, p2);
    final int o2 = _orientation(p1, q1, q2);
    final int o3 = _orientation(p2, q2, p1);
    final int o4 = _orientation(p2, q2, q1);

    // Caso general de cruce en X
    if (o1 != o2 && o3 != o4 && o1 != 0 && o2 != 0 && o3 != 0 && o4 != 0) {
      return true;
    }

    // Casos colineales parciales interiores
    if (o1 == 0 && _onSegment(p1, p2, q1) && !arePointsEqual(p2, p1) && !arePointsEqual(p2, q1)) return true;
    if (o2 == 0 && _onSegment(p1, q2, q1) && !arePointsEqual(q2, p1) && !arePointsEqual(q2, q1)) return true;
    if (o3 == 0 && _onSegment(p2, p1, q2) && !arePointsEqual(p1, p2) && !arePointsEqual(p1, q2)) return true;
    if (o4 == 0 && _onSegment(p2, q1, q2) && !arePointsEqual(q1, p2) && !arePointsEqual(q1, q2)) return true;

    return false;
  }

  /// Calcula el punto exacto de intersección entre dos segmentos de línea
  static LatLng? getIntersectionPoint(LatLng p1, LatLng p2, LatLng p3, LatLng p4) {
    final double x1 = p1.longitude, y1 = p1.latitude;
    final double x2 = p2.longitude, y2 = p2.latitude;
    final double x3 = p3.longitude, y3 = p3.latitude;
    final double x4 = p4.longitude, y4 = p4.latitude;

    final double denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom.abs() < epsilon) return null;

    final double t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    final double u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= -epsilon && t <= 1.0 + epsilon && u >= -epsilon && u <= 1.0 + epsilon) {
      final double ix = x1 + t * (x2 - x1);
      final double iy = y1 + t * (y2 - y1);
      return LatLng(iy, ix);
    }
    return null;
  }

  // ==========================================
  // 3. POINT IN POLYGON & BOUNDARY CHECK
  // ==========================================

  /// Determina si un punto está dentro de un polígono (Ray Casting) o sobre su borde
  static bool isPointInPolygonOrBoundary(LatLng point, List<LatLng> polygon) {
    if (polygon.length < 3) return false;

    // Primero revisar si está exactamente en un vértice o sobre un borde
    if (isPointOnPolygonBoundary(point, polygon)) {
      return true;
    }

    bool inside = false;
    final int n = polygon.length;
    final double x = point.longitude;
    final double y = point.latitude;

    for (int i = 0, j = n - 1; i < n; j = i++) {
      final double xi = polygon[i].longitude, yi = polygon[i].latitude;
      final double xj = polygon[j].longitude, yj = polygon[j].latitude;

      final bool intersect = ((yi > y) != (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi + epsilon) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /// Verifica si un punto está sobre el perímetro o un vértice del polígono
  static bool isPointOnPolygonBoundary(LatLng point, List<LatLng> polygon, [double tol = 1e-6]) {
    final int n = polygon.length;
    for (int i = 0; i < n; i++) {
      final p1 = polygon[i];
      final p2 = polygon[(i + 1) % n];

      if (arePointsEqual(point, p1, tol) || arePointsEqual(point, p2, tol)) {
        return true;
      }

      final int ori = _orientation(p1, point, p2);
      if (ori == 0 && _onSegment(p1, point, p2)) {
        return true;
      }
    }
    return false;
  }

  /// Retorna un punto de muestra interior garantizado para un polígono (centroide o muestra triangular)
  static LatLng getPolygonInteriorPoint(List<LatLng> polygon) {
    if (polygon.length < 3) return polygon.first;

    // Probar primero el centroide
    double sumLat = 0.0, sumLng = 0.0;
    for (final v in polygon) {
      sumLat += v.latitude;
      sumLng += v.longitude;
    }
    final centroid = LatLng(sumLat / polygon.length, sumLng / polygon.length);
    if (isPointInPolygonOrBoundary(centroid, polygon) && !isPointOnPolygonBoundary(centroid, polygon)) {
      return centroid;
    }

    // Probar puntos medios de diagonales interiores
    for (int i = 0; i < polygon.length; i++) {
      for (int j = i + 2; j < polygon.length; j++) {
        if (i == 0 && j == polygon.length - 1) continue;
        final mid = LatLng(
          (polygon[i].latitude + polygon[j].latitude) / 2.0,
          (polygon[i].longitude + polygon[j].longitude) / 2.0,
        );
        if (isPointInPolygonOrBoundary(mid, polygon) && !isPointOnPolygonBoundary(mid, polygon)) {
          return mid;
        }
      }
    }

    return centroid;
  }

  // ==========================================
  // 4. EVALUADOR DE CONCAVIDADES (25%, 50%, 75%)
  // ==========================================

  /// Obtiene los puntos de interpolación al 25%, 50% y 75% de un segmento
  static List<LatLng> getSegmentSamplePoints(LatLng p1, LatLng p2) {
    return [
      LatLng(p1.latitude + 0.25 * (p2.latitude - p1.latitude), p1.longitude + 0.25 * (p2.longitude - p1.longitude)),
      LatLng(p1.latitude + 0.50 * (p2.latitude - p1.latitude), p1.longitude + 0.50 * (p2.longitude - p1.longitude)),
      LatLng(p1.latitude + 0.75 * (p2.latitude - p1.latitude), p1.longitude + 0.75 * (p2.longitude - p1.longitude)),
    ];
  }

  /// Verifica si un segmento sale de un polígono cóncavo (evaluando 25%, 50%, 75%)
  static bool doesSegmentStayInsidePolygon(LatLng p1, LatLng p2, List<LatLng> polygon) {
    final samples = getSegmentSamplePoints(p1, p2);
    for (final sample in samples) {
      if (!isPointInPolygonOrBoundary(sample, polygon)) {
        return false;
      }
    }
    return true;
  }

  // ==========================================
  // 5. VALIDACIONES TOPOLÓGICAS ESTRICTAS
  // ==========================================

  /// Validación 1: Sin auto-intersecciones en el trazado
  static TopologyValidationResult validateSelfIntersection(List<LatLng> vertices, {bool isClosed = false}) {
    if (vertices.length < 4) return TopologyValidationResult.valid();

    final int numSegments = isClosed ? vertices.length : vertices.length - 1;

    for (int i = 0; i < numSegments; i++) {
      final p1 = vertices[i];
      final p2 = vertices[(i + 1) % vertices.length];

      for (int j = i + 1; j < numSegments; j++) {
        // Ignorar segmentos adyacentes
        if (j == i + 1) continue;
        if (isClosed && i == 0 && j == vertices.length - 1) continue;

        final q1 = vertices[j];
        final q2 = vertices[(j + 1) % vertices.length];

        if (doSegmentsIntersectProperly(p1, p2, q1, q2)) {
          final conflict = getIntersectionPoint(p1, p2, q1, q2) ?? p2;
          return TopologyValidationResult.invalid(
            message: 'Auto-intersección detectada: La cerca se cruza a sí misma.',
            conflictPoint: conflict,
            offendingSegment: [p1, p2],
          );
        }
      }
    }

    return TopologyValidationResult.valid();
  }

  /// Validación al agregar un nuevo punto interactivo
  static TopologyValidationResult validateNewVertex({
    required List<LatLng> currentVertices,
    required LatLng newVertex,
    required bool isHato,
    required List<Hato> existingHatos,
    Hato? parentHato,
    List<Potrero>? siblingPotreros,
  }) {
    if (currentVertices.isEmpty) {
      // Si es potrero, el primer vértice debe estar dentro del hato
      if (!isHato && parentHato != null) {
        if (!isPointInPolygonOrBoundary(newVertex, parentHato.vertices)) {
          return TopologyValidationResult.invalid(
            message: 'El vértice inicial debe estar dentro de los límites del Hato "${parentHato.nombre}".',
            conflictPoint: newVertex,
          );
        }
      }
      return TopologyValidationResult.valid();
    }

    final LatLng lastVertex = currentVertices.last;
    final List<LatLng> newSegment = [lastVertex, newVertex];

    // 1. Auto-intersección con segmentos anteriores
    if (currentVertices.length >= 2) {
      for (int i = 0; i < currentVertices.length - 2; i++) {
        final p1 = currentVertices[i];
        final p2 = currentVertices[i + 1];

        if (doSegmentsIntersectProperly(lastVertex, newVertex, p1, p2)) {
          final conflict = getIntersectionPoint(lastVertex, newVertex, p1, p2) ?? newVertex;
          return TopologyValidationResult.invalid(
            message: 'El nuevo tramo corta una línea ya trazada del polígono actual.',
            conflictPoint: conflict,
            offendingSegment: newSegment,
          );
        }
      }
    }

    // 2. Si es HATO: No debe cruzar ni invadir otros Hatos existentes
    if (isHato) {
      for (final otherHato in existingHatos) {
        // Cruce de bordes
        for (int i = 0; i < otherHato.vertices.length; i++) {
          final p1 = otherHato.vertices[i];
          final p2 = otherHato.vertices[(i + 1) % otherHato.vertices.length];

          if (doSegmentsIntersectProperly(lastVertex, newVertex, p1, p2)) {
            final conflict = getIntersectionPoint(lastVertex, newVertex, p1, p2) ?? newVertex;
            return TopologyValidationResult.invalid(
              message: 'El tramo invade el límite del Hato "${otherHato.nombre}".',
              conflictPoint: conflict,
              offendingSegment: newSegment,
            );
          }
        }

        // Vértice nuevo no debe caer dentro del interior de otro Hato
        if (isPointInPolygonOrBoundary(newVertex, otherHato.vertices) &&
            !isPointOnPolygonBoundary(newVertex, otherHato.vertices)) {
          return TopologyValidationResult.invalid(
            message: 'El punto cae dentro del interior del Hato "${otherHato.nombre}".',
            conflictPoint: newVertex,
            offendingSegment: newSegment,
          );
        }
      }
    }

    // 3. Si es POTRERO: Debe mantenerse 100% dentro del Hato padre
    if (!isHato && parentHato != null) {
      if (!isPointInPolygonOrBoundary(newVertex, parentHato.vertices)) {
        return TopologyValidationResult.invalid(
          message: 'El vértice sobrepasa los límites del Hato padre "${parentHato.nombre}".',
          conflictPoint: newVertex,
          offendingSegment: newSegment,
        );
      }

      // Probar concavidades al 25%, 50%, 75%
      final samples = getSegmentSamplePoints(lastVertex, newVertex);
      for (final sample in samples) {
        if (!isPointInPolygonOrBoundary(sample, parentHato.vertices)) {
          return TopologyValidationResult.invalid(
            message: 'El tramo se sale del Hato "${parentHato.nombre}" en una concavidad exterior.',
            conflictPoint: sample,
            offendingSegment: newSegment,
          );
        }
      }

      // No cruzar el perímetro del Hato
      for (int i = 0; i < parentHato.vertices.length; i++) {
        final p1 = parentHato.vertices[i];
        final p2 = parentHato.vertices[(i + 1) % parentHato.vertices.length];
        if (doSegmentsIntersectProperly(lastVertex, newVertex, p1, p2)) {
          final conflict = getIntersectionPoint(lastVertex, newVertex, p1, p2) ?? newVertex;
          return TopologyValidationResult.invalid(
            message: 'El tramo corta el perímetro exterior del Hato "${parentHato.nombre}".',
            conflictPoint: conflict,
            offendingSegment: newSegment,
          );
        }
      }

      // 4. No cruzar ni solapar Potreros hermanos
      if (siblingPotreros != null) {
        for (final sib in siblingPotreros) {
          for (int i = 0; i < sib.vertices.length; i++) {
            final p1 = sib.vertices[i];
            final p2 = sib.vertices[(i + 1) % sib.vertices.length];
            if (doSegmentsIntersectProperly(lastVertex, newVertex, p1, p2)) {
              final conflict = getIntersectionPoint(lastVertex, newVertex, p1, p2) ?? newVertex;
              return TopologyValidationResult.invalid(
                message: 'El tramo corta la cerca del Potrero vecino "${sib.nombre}".',
                conflictPoint: conflict,
                offendingSegment: newSegment,
              );
            }
          }

          if (isPointInPolygonOrBoundary(newVertex, sib.vertices) &&
              !isPointOnPolygonBoundary(newVertex, sib.vertices)) {
            return TopologyValidationResult.invalid(
              message: 'El punto cae en el interior del Potrero "${sib.nombre}".',
              conflictPoint: newVertex,
              offendingSegment: newSegment,
            );
          }
        }
      }
    }

    return TopologyValidationResult.valid();
  }

  /// Validación completa final al CERRAR el polígono
  static TopologyValidationResult validatePolygonCompletion({
    required List<LatLng> vertices,
    required bool isHato,
    required List<Hato> existingHatos,
    Hato? parentHato,
    List<Potrero>? siblingPotreros,
  }) {
    if (vertices.length < 3) {
      return TopologyValidationResult.invalid(
        message: 'Un polígono debe tener al menos 3 vértices para ser cerrado.',
      );
    }

    // 1. Validar auto-intersección de polígono cerrado
    final selfCheck = validateSelfIntersection(vertices, isClosed: true);
    if (!selfCheck.isValid) return selfCheck;

    // 2. Si es HATO
    if (isHato) {
      for (final otherHato in existingHatos) {
        // Cruce de segmentos con otros Hatos
        for (int i = 0; i < vertices.length; i++) {
          final v1 = vertices[i];
          final v2 = vertices[(i + 1) % vertices.length];

          for (int j = 0; j < otherHato.vertices.length; j++) {
            final o1 = otherHato.vertices[j];
            final o2 = otherHato.vertices[(j + 1) % otherHato.vertices.length];

            if (doSegmentsIntersectProperly(v1, v2, o1, o2)) {
              final conflict = getIntersectionPoint(v1, v2, o1, o2) ?? v1;
              return TopologyValidationResult.invalid(
                message: 'El límite del Hato corta el perímetro de "${otherHato.nombre}".',
                conflictPoint: conflict,
                offendingSegment: [v1, v2],
              );
            }
          }
        }

        // Efecto Isla / Envolvimiento (Regla 6): El nuevo Hato envuelve al existente
        bool allOtherInside = true;
        int sharedVertices = 0;
        for (final ov in otherHato.vertices) {
          if (!isPointInPolygonOrBoundary(ov, vertices)) {
            allOtherInside = false;
            break;
          }
          if (isPointOnPolygonBoundary(ov, vertices)) {
            sharedVertices++;
          }
        }
        if (allOtherInside && sharedVertices < otherHato.vertices.length) {
          return TopologyValidationResult.invalid(
            message: 'Efecto Isla: El nuevo Hato encierra completamente al Hato "${otherHato.nombre}".',
            conflictPoint: otherHato.vertices.first,
          );
        }

        // Caso inverso: El Hato existente envuelve al nuevo
        final interiorPoint = getPolygonInteriorPoint(vertices);
        if (isPointInPolygonOrBoundary(interiorPoint, otherHato.vertices) &&
            !isPointOnPolygonBoundary(interiorPoint, otherHato.vertices)) {
          return TopologyValidationResult.invalid(
            message: 'El nuevo Hato se encuentra dentro del área de "${otherHato.nombre}".',
            conflictPoint: interiorPoint,
          );
        }
      }
    }

    // 3. Si es POTRERO
    if (!isHato && parentHato != null) {
      // Todos los vértices dentro del hato
      for (final v in vertices) {
        if (!isPointInPolygonOrBoundary(v, parentHato.vertices)) {
          return TopologyValidationResult.invalid(
            message: 'El Potrero sobresale de los límites del Hato "${parentHato.nombre}".',
            conflictPoint: v,
          );
        }
      }

      // Validar todas las muestras al 25%, 50%, 75% en todos los tramos
      for (int i = 0; i < vertices.length; i++) {
        final v1 = vertices[i];
        final v2 = vertices[(i + 1) % vertices.length];
        final samples = getSegmentSamplePoints(v1, v2);

        for (final sample in samples) {
          if (!isPointInPolygonOrBoundary(sample, parentHato.vertices)) {
            return TopologyValidationResult.invalid(
              message: 'El tramo cerrado sale del Hato "${parentHato.nombre}" en una concavidad exterior.',
              conflictPoint: sample,
              offendingSegment: [v1, v2],
            );
          }
        }

        // Cruce con perímetro del Hato
        for (int j = 0; j < parentHato.vertices.length; j++) {
          final h1 = parentHato.vertices[j];
          final h2 = parentHato.vertices[(j + 1) % parentHato.vertices.length];
          if (doSegmentsIntersectProperly(v1, v2, h1, h2)) {
            final conflict = getIntersectionPoint(v1, v2, h1, h2) ?? v1;
            return TopologyValidationResult.invalid(
              message: 'La cerca del Potrero corta el perímetro exterior del Hato "${parentHato.nombre}".',
              conflictPoint: conflict,
              offendingSegment: [v1, v2],
            );
          }
        }
      }

      // Validar no solapamiento con potreros hermanos
      if (siblingPotreros != null) {
        for (final sib in siblingPotreros) {
          // Cruce de cercas
          for (int i = 0; i < vertices.length; i++) {
            final v1 = vertices[i];
            final v2 = vertices[(i + 1) % vertices.length];

            for (int j = 0; j < sib.vertices.length; j++) {
              final s1 = sib.vertices[j];
              final s2 = sib.vertices[(j + 1) % sib.vertices.length];

              if (doSegmentsIntersectProperly(v1, v2, s1, s2)) {
                final conflict = getIntersectionPoint(v1, v2, s1, s2) ?? v1;
                return TopologyValidationResult.invalid(
                  message: 'La cerca del Potrero corta los linderos del Potrero "${sib.nombre}".',
                  conflictPoint: conflict,
                  offendingSegment: [v1, v2],
                );
              }
            }
          }

          // Solapamiento interior
          final interior = getPolygonInteriorPoint(vertices);
          if (isPointInPolygonOrBoundary(interior, sib.vertices) &&
              !isPointOnPolygonBoundary(interior, sib.vertices)) {
            return TopologyValidationResult.invalid(
              message: 'El área del nuevo Potrero se solapa con el Potrero "${sib.nombre}".',
              conflictPoint: interior,
            );
          }

          // Efecto Isla entre potreros
          final sibInterior = getPolygonInteriorPoint(sib.vertices);
          if (isPointInPolygonOrBoundary(sibInterior, vertices) &&
              !isPointOnPolygonBoundary(sibInterior, vertices)) {
            return TopologyValidationResult.invalid(
              message: 'Efecto Isla: El Potrero encierra por completo al Potrero "${sib.nombre}".',
              conflictPoint: sibInterior,
            );
          }
        }
      }
    }

    return TopologyValidationResult.valid();
  }

  // ==========================================
  // 6. SISTEMA DE SNAPPING (IMANES)
  // ==========================================

  /// Encuentra todos los vértices existentes de todos los Hatos y Potreros para el sistema de imanes
  static List<LatLng> collectAllSnapPoints(List<Hato> hatos, {String? excludeHatoId, String? excludePotreroId}) {
    final List<LatLng> points = [];

    for (final hato in hatos) {
      if (hato.id != excludeHatoId) {
        points.addAll(hato.vertices);
      }
      for (final potrero in hato.potreros) {
        if (potrero.id != excludePotreroId) {
          points.addAll(potrero.vertices);
        }
      }
    }

    return points;
  }

  /// Aplica snapping si el punto tocado está cerca de un vértice existente
  static LatLng applySnapping(LatLng target, List<LatLng> snapPoints, [double tolDegrees = snappingToleranceDegrees]) {
    LatLng closest = target;
    double minDistance = double.infinity;

    for (final sp in snapPoints) {
      final double dist = math.sqrt(
        math.pow(sp.latitude - target.latitude, 2) + math.pow(sp.longitude - target.longitude, 2),
      );

      if (dist < tolDegrees && dist < minDistance) {
        minDistance = dist;
        closest = sp;
      }
    }

    return closest;
  }
}
