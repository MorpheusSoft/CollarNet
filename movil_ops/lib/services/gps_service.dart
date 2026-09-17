import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/gps_data.dart';

class GPSService {
  StreamSubscription<Position>? _positionSubscription;
  final StreamController<GPSData> _gpsController = StreamController<GPSData>.broadcast();

  Stream<GPSData> get gpsStream => _gpsController.stream;
  GPSData? _lastKnownGPS;
  GPSData? get lastKnownGPS => _lastKnownGPS;

  bool _isTracking = false;
  bool get isTracking => _isTracking;

  // Ubicación por defecto de referencia agropecuaria (ej. Meta, Colombia) si no hay GPS disponible
  static const LatLng defaultFarmLocation = LatLng(4.1420, -73.6260);

  /// Inicia el seguimiento continuo de ubicación
  Future<bool> startTracking() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Servicio de ubicación desactivado');
        _emitFallbackPosition(accuracy: 12.0);
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('Permiso de ubicación denegado por el usuario');
          _emitFallbackPosition(accuracy: 15.0);
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('Permiso de ubicación denegado permanentemente');
        _emitFallbackPosition(accuracy: 20.0);
        return false;
      }

      // Obtener posición inicial inmediata
      try {
        final initialPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.bestForNavigation,
          timeLimit: const Duration(seconds: 5),
        );
        _handleNewPosition(initialPos);
      } catch (e) {
        debugPrint('Error obteniendo posición inicial: $e');
      }

      // Iniciar Stream continuo con configuración de alta precisión
      const locationSettings = LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 1, // Actualizar cada 1 metro
      );

      _positionSubscription?.cancel();
      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position pos) {
          _handleNewPosition(pos);
        },
        onError: (error) {
          debugPrint('Error en stream GPS: $error');
        },
      );

      _isTracking = true;
      return true;
    } catch (e) {
      debugPrint('Excepción al iniciar GPS: $e');
      _emitFallbackPosition(accuracy: 10.0);
      return false;
    }
  }

  void _handleNewPosition(Position pos) {
    final data = GPSData(
      position: LatLng(pos.latitude, pos.longitude),
      accuracy: pos.accuracy,
      altitude: pos.altitude,
      speed: pos.speed,
      heading: pos.heading,
      timestamp: pos.timestamp,
    );
    _lastKnownGPS = data;
    if (!_gpsController.isClosed) {
      _gpsController.add(data);
    }
  }

  void _emitFallbackPosition({double accuracy = 8.5}) {
    final fallback = GPSData(
      position: defaultFarmLocation,
      accuracy: accuracy,
      timestamp: DateTime.now(),
    );
    _lastKnownGPS = fallback;
    if (!_gpsController.isClosed) {
      _gpsController.add(fallback);
    }
  }

  void stopTracking() {
    _positionSubscription?.cancel();
    _isTracking = false;
  }

  void dispose() {
    stopTracking();
    _gpsController.close();
  }
}
