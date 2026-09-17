import 'package:latlong2/latlong.dart';

class GPSData {
  final LatLng position;
  final double accuracy; // En metros
  final double? altitude;
  final double? speed;
  final double? heading;
  final DateTime timestamp;

  GPSData({
    required this.position,
    required this.accuracy,
    this.altitude,
    this.speed,
    this.heading,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  String get accuracyLabel {
    if (accuracy <= 3) {
      return '±${accuracy.toStringAsFixed(1)} m (Excelente)';
    } else if (accuracy <= 8) {
      return '±${accuracy.toStringAsFixed(1)} m (Buena)';
    } else if (accuracy <= 15) {
      return '±${accuracy.toStringAsFixed(1)} m (Moderada)';
    } else {
      return '±${accuracy.toStringAsFixed(0)} m (Baja)';
    }
  }
}
