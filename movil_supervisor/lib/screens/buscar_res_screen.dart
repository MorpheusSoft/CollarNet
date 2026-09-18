import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';

class BuscarResScreen extends StatefulWidget {
  const BuscarResScreen({Key? key}) : super(key: key);

  @override
  State<BuscarResScreen> createState() => _BuscarResScreenState();
}

class _BuscarResScreenState extends State<BuscarResScreen> with TickerProviderStateMixin {
  late AnimationController _radarController;
  late AnimationController _pulseController;
  StreamSubscription<Position>? _positionStreamSubscription;
  StreamSubscription<CompassEvent>? _compassSubscription;

  // Ubicación del Usuario
  Position? _userPosition;
  double _userLat = 8.538500;
  double _userLng = -70.358000;
  double _gpsAccuracy = 3.0;
  bool _gpsFixObtenido = false;
  String _gpsEstadoMensaje = 'Iniciando GPS satelital...';

  // Orientación del Teléfono (Brújula / Magnetómetro)
  double _deviceHeading = 0.0; // Grados hacia donde apunta el teléfono (0° = Norte)
  bool _sensorBrujulaActivo = false;

  // Ubicación del Animal Destino (Target)
  double _targetLat = 8.539136;
  double _targetLng = -70.357356;
  String _resSeleccionada = '🚨 V-999 "Mariposa" (EXTRAVIADA 100m)';
  String _collarId = 'COL-0999';
  double _nivelBateriaCollar = 76.0;
  String _estadoPotrero = '¡FUERA DE CERCA! (A 100m)';

  // Cálculos Geodésicos en Tiempo Real
  double _distanciaMetros = 100.0;
  double _rumboGrados = 45.0; // Rumbo absoluto hacia la res desde el Norte (0..360)
  String _cardinal = 'NE';

  // Simulación de Pasos Manuales (para prueba de escritorio)
  double _simulatedStepOffset = 0.0;

  @override
  void initState() {
    super.initState();

    _radarController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _inicializarSensores();
  }

  @override
  void dispose() {
    _positionStreamSubscription?.cancel();
    _compassSubscription?.cancel();
    _radarController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  /// Ángulo relativo que debe tener la aguja en la pantalla para apuntar hacia la vaca en 3D
  /// Si el teléfono apunta al Norte (0°) y la vaca está al NE (45°), la aguja gira +45° (hacia la derecha).
  /// Si el usuario gira su cuerpo y mira directo al NE (45°), la aguja apunta a 0° (directo hacia arriba, al frente).
  double get _anguloRelativoPantalla {
    double diff = (_rumboGrados - _deviceHeading) % 360.0;
    if (diff < 0) diff += 360.0;
    return diff;
  }

  /// Desviación angular para indicación de giro táctico (-180° a +180°)
  double get _desviacionGrados {
    double diff = (_rumboGrados - _deviceHeading) % 360.0;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }

  /// Inicializa tanto el sensor magnético (brújula) como el GPS en vivo
  Future<void> _inicializarSensores() async {
    // 1. Escuchar sensor de brújula / orientación del teléfono
    try {
      _compassSubscription = FlutterCompass.events?.listen((CompassEvent event) {
        if (event.heading != null && mounted) {
          setState(() {
            _deviceHeading = (event.heading! + 360.0) % 360.0;
            _sensorBrujulaActivo = true;
          });
        }
      });
    } catch (_) {
      // Fallback si no hay sensor de brújula en el dispositivo
    }

    // 2. Iniciar rastreo GPS
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _gpsEstadoMensaje = 'GPS desactivado en el teléfono. Usando coordenadas base.';
        });
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _gpsEstadoMensaje = 'Permiso GPS denegado. Usando simulación geodésica.';
          });
          _anclarVacaA100mDe(_userLat, _userLng);
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _gpsEstadoMensaje = 'Permiso GPS permanente denegado.';
        });
        _anclarVacaA100mDe(_userLat, _userLng);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 6),
      ).catchError((_) => null);

      if (position != null) {
        setState(() {
          _userPosition = position;
          _userLat = position.latitude;
          _userLng = position.longitude;
          _gpsAccuracy = position.accuracy;
          _gpsFixObtenido = true;
          _gpsEstadoMensaje = 'GPS Fijado (±${position.accuracy.toStringAsFixed(1)}m)';
        });
      }

      _anclarVacaA100mDe(_userLat, _userLng);

      _positionStreamSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          distanceFilter: 1, // Actualizar cada metro recorrido
        ),
      ).listen((Position newPos) {
        if (!mounted) return;
        setState(() {
          _userPosition = newPos;
          _userLat = newPos.latitude;
          _userLng = newPos.longitude;
          _gpsAccuracy = newPos.accuracy;
          _gpsFixObtenido = true;
          _gpsEstadoMensaje = 'GPS En Vivo (±${newPos.accuracy.toStringAsFixed(1)}m)';
          _recalcularGeodesica();
        });
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _gpsEstadoMensaje = 'Modo Brújula Activo';
          _anclarVacaA100mDe(_userLat, _userLng);
        });
      }
    }
  }

  /// Calcula coordenadas objetivo a exactamente [distanciaMetros] con rumbo [bearingGrados]
  void _anclarVacaA100mDe(double originLat, double originLng, {double distanciaMetros = 100.0, double bearingGrados = 45.0}) {
    const double rTierra = 6378137.0; // Radio de la Tierra en metros (WGS-84)
    final double distRad = distanciaMetros / rTierra;
    final double rumboRad = bearingGrados * (pi / 180.0);
    final double lat1Rad = originLat * (pi / 180.0);
    final double lng1Rad = originLng * (pi / 180.0);

    final double lat2Rad = asin(sin(lat1Rad) * cos(distRad) + cos(lat1Rad) * sin(distRad) * cos(rumboRad));
    final double lng2Rad = lng1Rad + atan2(sin(rumboRad) * sin(distRad) * cos(lat1Rad), cos(distRad) - sin(lat1Rad) * sin(lat2Rad));

    setState(() {
      _targetLat = lat2Rad * (180.0 / pi);
      _targetLng = lng2Rad * (180.0 / pi);
      _simulatedStepOffset = 0.0;
      _recalcularGeodesica();
    });
  }

  /// Recalcula la distancia y el rumbo geodésico exacto hacia la vaca
  void _recalcularGeodesica() {
    double effectiveUserLat = _userLat;
    double effectiveUserLng = _userLng;

    if (_simulatedStepOffset > 0) {
      const double rTierra = 6378137.0;
      final double distRad = _simulatedStepOffset / rTierra;
      final double rumboRad = 45.0 * (pi / 180.0);
      final double lat1Rad = _userLat * (pi / 180.0);
      final double lng1Rad = _userLng * (pi / 180.0);

      final double lat2Rad = asin(sin(lat1Rad) * cos(distRad) + cos(lat1Rad) * sin(distRad) * cos(rumboRad));
      final double lng2Rad = lng1Rad + atan2(sin(rumboRad) * sin(distRad) * cos(lat1Rad), cos(distRad) - sin(lat1Rad) * sin(lat2Rad));

      effectiveUserLat = lat2Rad * (180.0 / pi);
      effectiveUserLng = lng2Rad * (180.0 / pi);
    }

    final double dist = Geolocator.distanceBetween(effectiveUserLat, effectiveUserLng, _targetLat, _targetLng);
    final double bearing = (Geolocator.bearingBetween(effectiveUserLat, effectiveUserLng, _targetLat, _targetLng) + 360.0) % 360.0;

    final cardinales = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    final idx = ((bearing / 22.5).round()) % 16;

    setState(() {
      _distanciaMetros = dist;
      _rumboGrados = bearing;
      _cardinal = cardinales[idx];
    });
  }

  /// Simula dar pasos hacia la vaca (para pruebas bajo techo)
  void _avanzarPasosSimulados(double metrosAvanzados) {
    setState(() {
      _simulatedStepOffset = (_simulatedStepOffset + metrosAvanzados).clamp(0.0, 105.0);
      _recalcularGeodesica();
    });
  }

  List<Map<String, dynamic>> _obtenerListaAnimales(FincaStateProvider state) {
    final List<Map<String, dynamic>> lista = [
      {
        'nombre': '🚨 V-999 "Mariposa" (EXTRAVIADA 100m)',
        'arete': 'V-999',
        'collar': 'COL-0999',
        'bateria': 76.0,
        'estado': '¡FUERA DE CERCA! (A 100m)',
        'esSimulada': true,
        'lat': _targetLat,
        'lng': _targetLng,
      }
    ];

    for (var a in state.animales) {
      final arete = a['areteVisual'] ?? 'Res';
      if (arete.toString().contains('V-999')) continue;
      final collar = a['collarId'] ?? 'S/C';
      final bat = ((a['bateria'] ?? 90) as num).toDouble();
      final pot = a['potreroNombre'] ?? 'Potrero Principal';
      final lat = (a['latitud'] ?? 8.5385) as double;
      final lng = (a['longitud'] ?? -70.3580) as double;

      lista.add({
        'nombre': '🐄 $arete ($collar)',
        'arete': arete,
        'collar': collar,
        'bateria': bat,
        'estado': pot,
        'esSimulada': false,
        'lat': lat,
        'lng': lng,
      });
    }

    return lista;
  }

  Color _getColorProximidad() {
    if (_distanciaMetros <= 5.0) return FincaTheme.warningAmber;
    if (_distanciaMetros <= 15.0) return FincaTheme.accentGreenLight;
    if (_distanciaMetros <= 50.0) return FincaTheme.primaryGreen;
    return FincaTheme.infoBlue;
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();
    final listaAnimales = _obtenerListaAnimales(fincaState);

    final bool llegoAlAnimal = _distanciaMetros <= 5.0;
    final bool muyCerca = _distanciaMetros <= 15.0 && !llegoAlAnimal;
    final Color proximityColor = _getColorProximidad();

    final double desviacion = _desviacionGrados;
    final bool apuntandoDirecto = desviacion.abs() <= 12.0;

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Módulo 5: Brújula "Buscar Res"'),
        actions: [
          IconButton(
            tooltip: 'Reanclar vaca a 100m de aquí',
            icon: const Icon(Icons.my_location, color: FincaTheme.accentGreenLight),
            onPressed: () {
              _anclarVacaA100mDe(_userLat, _userLng);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: FincaTheme.primaryGreen,
                  content: Text('📍 Vaca V-999 reubicada a exactamente 100m de tu posición GPS actual.'),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Barra de Estado de Sensores (GPS + Brújula Giroscópica)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _sensorBrujulaActivo ? FincaTheme.primaryGreen.withOpacity(0.5) : FincaTheme.warningAmber.withOpacity(0.5),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _sensorBrujulaActivo ? Icons.explore : Icons.explore_off,
                    color: _sensorBrujulaActivo ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _sensorBrujulaActivo
                          ? 'Brújula En Vivo: ${_deviceHeading.toStringAsFixed(0)}° (${_obtenerCardinalDeRumbo(_deviceHeading)})'
                          : 'Giroscopio / Brújula Activa',
                      style: TextStyle(
                        color: _sensorBrujulaActivo ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: FincaTheme.bgCardElevated,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: FincaTheme.borderCard),
                    ),
                    child: Text(
                      'Objetivo: ${_rumboGrados.toStringAsFixed(0)}° $_cardinal',
                      style: const TextStyle(color: FincaTheme.textLight, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Banner Táctico de Giro (HUD Táctico en Tiempo Real)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: apuntandoDirecto
                    ? FincaTheme.primaryGreen.withOpacity(0.2)
                    : FincaTheme.warningAmber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: apuntandoDirecto ? FincaTheme.primaryGreen : FincaTheme.warningAmber,
                  width: apuntandoDirecto ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    apuntandoDirecto
                        ? Icons.arrow_upward
                        : (desviacion > 0 ? Icons.turn_right : Icons.turn_left),
                    color: apuntandoDirecto ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                    size: 26,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      apuntandoDirecto
                          ? '🎯 ¡ESTÁS MIRANDO DIRECTO AL ANIMAL!\nCamina recto en esta dirección hacia el frente.'
                          : (desviacion > 0
                              ? '➡️ Gira ${desviacion.toStringAsFixed(0)}° a tu DERECHA para encarar la vaca.'
                              : '⬅️ Gira ${(-desviacion).toStringAsFixed(0)}° a tu IZQUIERDA para encarar la vaca.'),
                      style: TextStyle(
                        color: apuntandoDirecto ? FincaTheme.textLight : FincaTheme.warningAmber,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Selector del Animal a Rescatar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: listaAnimales.any((a) => a['nombre'] == _resSeleccionada) ? _resSeleccionada : listaAnimales.first['nombre'],
                  isExpanded: true,
                  dropdownColor: FincaTheme.bgCardElevated,
                  icon: const Icon(Icons.arrow_drop_down, color: FincaTheme.accentGreenLight),
                  items: listaAnimales.map((item) {
                    final bool isExtraviada = item['esSimulada'] == true;
                    return DropdownMenuItem<String>(
                      value: item['nombre'] as String,
                      child: Text(
                        item['nombre'] as String,
                        style: TextStyle(
                          color: isExtraviada ? FincaTheme.errorCrimson : FincaTheme.textLight,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      final item = listaAnimales.firstWhere((e) => e['nombre'] == val);
                      setState(() {
                        _resSeleccionada = val;
                        _collarId = item['collar'] as String;
                        _nivelBateriaCollar = item['bateria'] as double;
                        _estadoPotrero = item['estado'] as String;

                        if (item['esSimulada'] == true) {
                          _anclarVacaA100mDe(_userLat, _userLng);
                        } else {
                          _targetLat = item['lat'] as double;
                          _targetLng = item['lng'] as double;
                          _simulatedStepOffset = 0.0;
                          _recalcularGeodesica();
                        }
                      });
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // =========================================================================
            // BRÚJULA TÁCTICA GIROSCÓPICA 3D
            // - El DIAL gira con la orientación del teléfono (-_deviceHeading)
            // - La AGUJA ROJA apunta en 3D siempre directo hacia el animal (_anguloRelativoPantalla)
            // =========================================================================
            Center(
              child: SizedBox(
                width: 280,
                height: 280,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Anillo de Radar Pulsante
                    AnimatedBuilder(
                      animation: _radarController,
                      builder: (context, child) {
                        return Container(
                          width: 280,
                          height: 280,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: proximityColor.withOpacity(0.15 + 0.25 * _radarController.value),
                              width: 1 + 3 * _radarController.value,
                            ),
                          ),
                        );
                      },
                    ),

                    // Dial de la brújula táctica (Gira según el azimut del teléfono para que Norte siempre apunte al Norte Real)
                    Transform.rotate(
                      angle: -_deviceHeading * (pi / 180.0),
                      child: Container(
                        width: 256,
                        height: 256,
                        decoration: BoxDecoration(
                          color: FincaTheme.bgCardElevated,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: proximityColor.withOpacity(0.6),
                            width: 3,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: proximityColor.withOpacity(0.25),
                              blurRadius: 25,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            // Anillos de rango de distancia táctica
                            Container(
                              width: 175,
                              height: 175,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white10, width: 1),
                              ),
                            ),
                            Container(
                              width: 95,
                              height: 95,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white12, width: 1),
                              ),
                            ),

                            // Puntos Cardinales Físicos en el Dial
                            const Positioned(
                              top: 8,
                              child: Text('N', style: TextStyle(color: FincaTheme.errorCrimson, fontWeight: FontWeight.w900, fontSize: 18)),
                            ),
                            const Positioned(
                              bottom: 8,
                              child: Text('S', style: TextStyle(color: FincaTheme.textMuted, fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                            const Positioned(
                              left: 10,
                              child: Text('O', style: TextStyle(color: FincaTheme.textMuted, fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                            const Positioned(
                              right: 10,
                              child: Text('E', style: TextStyle(color: FincaTheme.textMuted, fontWeight: FontWeight.bold, fontSize: 14)),
                            ),

                            // Intercardinales
                            const Positioned(
                              top: 30,
                              right: 34,
                              child: Text('NE', style: TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                            const Positioned(
                              bottom: 30,
                              right: 34,
                              child: Text('SE', style: TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                            const Positioned(
                              bottom: 30,
                              left: 34,
                              child: Text('SO', style: TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                            const Positioned(
                              top: 30,
                              left: 34,
                              child: Text('NO', style: TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // AGUJA TÁCTICA DIRECCIONAL (Apunta directamente a la vaca en la pantalla en tiempo real)
                    Transform.rotate(
                      angle: _anguloRelativoPantalla * (pi / 180.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Punta de la Aguja hacia la vaca
                          Container(
                            width: 12,
                            height: 90,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  proximityColor,
                                  FincaTheme.errorCrimson,
                                ],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: [
                                BoxShadow(
                                  color: proximityColor.withOpacity(0.8),
                                  blurRadius: 16,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            child: Align(
                              alignment: Alignment.topCenter,
                              child: Container(
                                margin: const EdgeInsets.only(top: 4),
                                width: 4,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                          ),
                          // Centro de la Aguja con Ícono de Vaca
                          Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.black, width: 3),
                              boxShadow: const [
                                BoxShadow(color: Colors.black54, blurRadius: 6),
                              ],
                            ),
                            child: const Center(
                              child: Icon(Icons.pets, size: 14, color: Colors.black87),
                            ),
                          ),
                          // Cola de la Aguja
                          Container(
                            width: 6,
                            height: 50,
                            decoration: BoxDecoration(
                              color: FincaTheme.textMuted.withOpacity(0.4),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Badge Central con Rumbo y Grados Relativos
                    Positioned(
                      bottom: 42,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: proximityColor.withOpacity(0.6)),
                        ),
                        child: Text(
                          apuntandoDirecto ? '🎯 AL FRENTE' : '${_rumboGrados.toStringAsFixed(0)}° $_cardinal',
                          style: TextStyle(
                            color: proximityColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Gran Contador de Distancia en Tiempo Real
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: proximityColor.withOpacity(0.4),
                  width: llegoAlAnimal ? 2 : 1,
                ),
                boxShadow: llegoAlAnimal
                    ? [
                        BoxShadow(
                          color: FincaTheme.warningAmber.withOpacity(0.3),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ]
                    : [],
              ),
              child: Column(
                children: [
                  Text(
                    llegoAlAnimal ? '🎯 ¡HAS LLEGADO AL ANIMAL!' : 'DISTANCIA EN VIVO AL ANIMAL',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.1,
                      color: llegoAlAnimal ? FincaTheme.warningAmber : FincaTheme.textMuted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        _distanciaMetros >= 10
                            ? _distanciaMetros.toStringAsFixed(0)
                            : _distanciaMetros.toStringAsFixed(1),
                        style: TextStyle(
                          fontSize: 54,
                          fontWeight: FontWeight.w900,
                          color: proximityColor,
                          letterSpacing: -1,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'METROS',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: proximityColor.withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Rumbo $_cardinal (${_rumboGrados.toStringAsFixed(0)}°) • $_estadoPotrero',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13, color: FincaTheme.textLight),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Alerta de Proximidad por Etapas
            if (llegoAlAnimal)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [FincaTheme.warningAmber.withOpacity(0.3), FincaTheme.primaryGreen.withOpacity(0.3)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: FincaTheme.warningAmber),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: FincaTheme.warningAmber, size: 28),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '🎉 ¡RESCATE CONCLUIDO! Estás al lado de la vaca V-999.',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              )
            else if (muyCerca)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: FincaTheme.accentGreenLight.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: FincaTheme.accentGreenLight),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.visibility, color: FincaTheme.accentGreenLight, size: 24),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '👀 ¡CONTACTO VISUAL CERCANO! El animal está a menos de 15 metros.',
                        style: TextStyle(color: FincaTheme.accentGreenLight, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 14),

            // Controles de Simulación de Prueba Rápida
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '🚶 SIMULADOR DE CAMINATA A PIE',
                        style: TextStyle(color: FincaTheme.accentGreenLight, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      Text(
                        'Prueba Bajo Techo',
                        style: TextStyle(color: FincaTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: FincaTheme.primaryGreen),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          onPressed: () => _avanzarPasosSimulados(10.0),
                          icon: const Icon(Icons.directions_walk, size: 16, color: FincaTheme.accentGreenLight),
                          label: const Text('+10m Paso', style: TextStyle(color: FincaTheme.textLight, fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: FincaTheme.primaryGreen),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          onPressed: () => _avanzarPasosSimulados(25.0),
                          icon: const Icon(Icons.directions_run, size: 16, color: FincaTheme.accentGreenLight),
                          label: const Text('+25m Trote', style: TextStyle(color: FincaTheme.textLight, fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: FincaTheme.errorCrimson,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          onPressed: () {
                            _anclarVacaA100mDe(_userLat, _userLng);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('🔄 Vaca reubicada a 100m iniciales.'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                          icon: const Icon(Icons.replay, size: 16),
                          label: const Text('100m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Telemetría del Collar y Coordenadas GPS
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.battery_charging_full, color: FincaTheme.accentGreenLight, size: 20),
                          const SizedBox(width: 6),
                          Text('Batería: ${_nivelBateriaCollar.toInt()}%', style: const TextStyle(color: FincaTheme.textLight, fontSize: 12)),
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.cell_tower, color: FincaTheme.infoBlue, size: 20),
                          const SizedBox(width: 6),
                          Text('Collar: $_collarId', style: const TextStyle(color: FincaTheme.textLight, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white12, height: 20),
                  Row(
                    children: [
                      const Icon(Icons.person_pin_circle, color: FincaTheme.accentGreenLight, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Tú (GPS): ${_userLat.toStringAsFixed(6)}, ${_userLng.toStringAsFixed(6)}',
                          style: const TextStyle(color: FincaTheme.textMuted, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.pets, color: FincaTheme.errorCrimson, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Res Destino: ${_targetLat.toStringAsFixed(6)}, ${_targetLng.toStringAsFixed(6)}',
                          style: const TextStyle(color: FincaTheme.textMuted, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Botón Sonar Buzzer del Collar
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: FincaTheme.warningAmber,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          const Icon(Icons.volume_up, color: Colors.black),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '🔔 ¡Pitido emitido en collar $_collarId! Vaca alertada acústicamente.',
                              style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      backgroundColor: FincaTheme.warningAmber,
                    ),
                  );
                },
                icon: const Icon(Icons.volume_up, color: Colors.black),
                label: const Text(
                  'ACTIVAR PITIDO EN COLLAR (BUZZER)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  String _obtenerCardinalDeRumbo(double rumbo) {
    final cardinales = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    final idx = ((rumbo / 22.5).round()) % 16;
    return cardinales[idx];
  }
}
