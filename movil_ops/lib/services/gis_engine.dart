import 'dart:math' as math;
import 'package:latlong2/latlong.dart';

class GisEngine {
  static const double earthRadiusWGS84 = 6378137.0; // Metros
  static const double epsilon = 1e-9;

  /// Calcula el área geodésica sobre el elipsoide WGS84 en Hectáreas (Ha)
  static double calculateAreaHa(List<LatLng> vertices) {
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

      total += (lambda2 - lambda1) * (2.0 + math.sin(phi1) + math.sin(phi2));
    }

    final double areaM2 = (total * earthRadiusWGS84 * earthRadiusWGS84 / 2.0).abs();
    return areaM2 / 10000.0; // 1 Ha = 10,000 m²
  }

  /// Calcula el perímetro geodésico en kilómetros (km)
  static double calculatePerimeterKm(List<LatLng> vertices, {bool isClosed = true}) {
    if (vertices.length < 2) return 0.0;
    double perimeterM = 0.0;
    final int count = isClosed ? vertices.length : vertices.length - 1;

    for (int i = 0; i < count; i++) {
      final p1 = vertices[i];
      final p2 = vertices[(i + 1) % vertices.length];
      perimeterM += calculateDistanceM(p1, p2);
    }
    return perimeterM / 1000.0;
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

  /// Verifica si dos segmentos se cortan (Auto-intersección de polígono)
  static bool hasSelfIntersection(List<LatLng> vertices, {bool isClosed = false}) {
    if (vertices.length < 4) return false;

    final int numSegments = isClosed ? vertices.length : vertices.length - 1;

    for (int i = 0; i < numSegments; i++) {
      final p1 = vertices[i];
      final p2 = vertices[(i + 1) % vertices.length];

      for (int j = i + 1; j < numSegments; j++) {
        if (j == i + 1) continue;
        if (isClosed && i == 0 && j == vertices.length - 1) continue;

        final q1 = vertices[j];
        final q2 = vertices[(j + 1) % vertices.length];

        if (_doSegmentsIntersect(p1, p2, q1, q2)) {
          return true;
        }
      }
    }
    return false;
  }

  static bool _doSegmentsIntersect(LatLng p1, LatLng q1, LatLng p2, LatLng q2) {
    final int o1 = _orientation(p1, q1, p2);
    final int o2 = _orientation(p1, q1, q2);
    final int o3 = _orientation(p2, q2, p1);
    final int o4 = _orientation(p2, q2, q1);

    if (o1 != o2 && o3 != o4 && o1 != 0 && o2 != 0 && o3 != 0 && o4 != 0) {
      return true;
    }
    return false;
  }

  static int _orientation(LatLng p, LatLng q, LatLng r) {
    final double val = (q.latitude - p.latitude) * (r.longitude - q.longitude) -
        (q.longitude - p.longitude) * (r.latitude - q.latitude);
    if (val.abs() < epsilon) return 0;
    return (val > 0) ? 1 : 2;
  }

  static double _degToRad(double degrees) => degrees * math.pi / 180.0;
}
