import 'package:latlong2/latlong.dart';

class TopologyAlert {
  final String id;
  final String message;
  final LatLng? conflictPoint;
  final List<LatLng>? offendingSegment;
  final DateTime timestamp;

  TopologyAlert({
    required this.id,
    required this.message,
    this.conflictPoint,
    this.offendingSegment,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}
