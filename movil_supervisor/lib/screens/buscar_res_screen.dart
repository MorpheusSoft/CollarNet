import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';

class BuscarResScreen extends StatefulWidget {
  const BuscarResScreen({Key? key}) : super(key: key);

  @override
  State<BuscarResScreen> createState() => _BuscarResScreenState();
}

class _BuscarResScreenState extends State<BuscarResScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  String? _resSeleccionada;
  double _distanciaMetros = 285.0;
  double _rumboGrados = 124.0; // Grados hacia el animal
  String _cardinal = 'SE';
  double _nivelBateriaCollar = 84.0;
  String _ultimaUbicacion = 'Hace 2 min (GPS 3D Fix)';

  final List<Map<String, dynamic>> _resesDefault = [
    {
      'nombre': 'V-042 (Collar COL-0014)',
      'distancia': 285.0,
      'rumbo': 124.0,
      'cardinal': 'SE',
      'bateria': 84.0,
      'ultimaVez': 'Hace 2 min',
      'estado': 'PASTANDO_NORMAL'
    },
    {
      'nombre': 'T-015 (Collar COL-0008)',
      'distancia': 640.0,
      'rumbo': 310.0,
      'cardinal': 'NW',
      'bateria': 92.0,
      'ultimaVez': 'Hace 5 min',
      'estado': 'CERCA_LINDERO'
    },
    {
      'nombre': 'V-019 (Collar COL-0003)',
      'distancia': 120.0,
      'rumbo': 45.0,
      'cardinal': 'NE',
      'bateria': 78.0,
      'ultimaVez': 'Hace 1 min',
      'estado': 'EN_CORRAL'
    },
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _obtenerListaReses(FincaStateProvider state) {
    if (state.animales.isEmpty) return _resesDefault;

    return state.animales.map((a) {
      final arete = a['areteVisual'] ?? 'Res';
      final collar = a['collarId'] ?? 'S/C';
      final bat = ((a['bateria'] ?? 90) as num).toDouble();
      final lat = (a['latitud'] ?? 8.5385) as double;
      final lng = (a['longitud'] ?? -70.3580) as double;

      // Calcular distancia simulada consistente
      final seed = arete.hashCode;
      final dist = 80.0 + (seed.abs() % 450);
      final rumbo = (seed.abs() % 360).toDouble();
      final cardinales = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
      final card = cardinales[((rumbo / 45).round()) % 8];

      return {
        'nombre': '$arete ($collar)',
        'distancia': dist,
        'rumbo': rumbo,
        'cardinal': card,
        'bateria': bat,
        'ultimaVez': 'En vivo (GPS Fix)',
        'estado': a['potreroNombre'] ?? 'Potrero Principal',
      };
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();
    final listaReses = _obtenerListaReses(fincaState);

    if (_resSeleccionada == null || !listaReses.any((r) => r['nombre'] == _resSeleccionada)) {
      if (listaReses.isNotEmpty) {
        final primero = listaReses.first;
        _resSeleccionada = primero['nombre'] as String;
        _distanciaMetros = primero['distancia'] as double;
        _rumboGrados = primero['rumbo'] as double;
        _cardinal = primero['cardinal'] as String;
        _nivelBateriaCollar = primero['bateria'] as double;
        _ultimaUbicacion = primero['ultimaVez'] as String;
      }
    }

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Brújula "Buscar Res"'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Selector de Animal a Rescatar / Ubicar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _resSeleccionada,
                  isExpanded: true,
                  dropdownColor: FincaTheme.bgCardElevated,
                  icon: const Icon(Icons.arrow_drop_down, color: FincaTheme.accentGreenLight),
                  items: listaReses.map((r) {
                    return DropdownMenuItem<String>(
                      value: r['nombre'] as String,
                      child: Text(
                        '🎯 ${r['nombre']}',
                        style: const TextStyle(
                          color: FincaTheme.textLight,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      final item = listaReses.firstWhere((e) => e['nombre'] == val);
                      setState(() {
                        _resSeleccionada = val;
                        _distanciaMetros = item['distancia'] as double;
                        _rumboGrados = item['rumbo'] as double;
                        _cardinal = item['cardinal'] as String;
                        _nivelBateriaCollar = item['bateria'] as double;
                        _ultimaUbicacion = item['ultimaVez'] as String;
                      });
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Brújula Táctica y Aguja Direccional
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: FincaTheme.bgCardElevated,
                shape: BoxShape.circle,
                border: Border.all(color: FincaTheme.primaryGreen.withOpacity(0.4), width: 3),
                boxShadow: [
                  BoxShadow(
                    color: FincaTheme.primaryGreen.withOpacity(0.1),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: SizedBox(
                height: 240,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Anillo de puntos cardinales
                    const Positioned(top: 0, child: Text('N', style: TextStyle(color: FincaTheme.errorCrimson, fontWeight: FontWeight.bold, fontSize: 16))),
                    const Positioned(bottom: 0, child: Text('S', style: TextStyle(color: FincaTheme.textMuted, fontWeight: FontWeight.bold, fontSize: 16))),
                    const Positioned(left: 0, child: Text('O', style: TextStyle(color: FincaTheme.textMuted, fontWeight: FontWeight.bold, fontSize: 16))),
                    const Positioned(right: 0, child: Text('E', style: TextStyle(color: FincaTheme.textMuted, fontWeight: FontWeight.bold, fontSize: 16))),

                    // Aguja Táctica Girada hacia el animal
                    Transform.rotate(
                      angle: _rumboGrados * (pi / 180),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 8,
                            height: 70,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [FincaTheme.errorCrimson, FincaTheme.warningAmber],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: [
                                BoxShadow(
                                  color: FincaTheme.errorCrimson.withOpacity(0.5),
                                  blurRadius: 10,
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 18,
                            height: 18,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          ),
                          Container(
                            width: 4,
                            height: 40,
                            color: FincaTheme.textMuted.withOpacity(0.5),
                          ),
                        ],
                      ),
                    ),

                    // Icono de vaca animado en el centro o rumbo
                    Positioned(
                      bottom: 40,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.6),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${_rumboGrados.toStringAsFixed(0)}° $_cardinal',
                          style: const TextStyle(color: FincaTheme.accentGreenLight, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Gran Contador de Distancia
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Column(
                children: [
                  const Text('DISTANCIA ESTIMADA A PIE / CABALLO', style: TextStyle(fontSize: 12, color: FincaTheme.textMuted)),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        _distanciaMetros.toStringAsFixed(0),
                        style: const TextStyle(
                          fontSize: 46,
                          fontWeight: FontWeight.bold,
                          color: FincaTheme.accentGreenLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'METROS',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: FincaTheme.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Rumbo ${_rumboGrados.toStringAsFixed(0)}° $_cardinal • $_ultimaUbicacion',
                    style: const TextStyle(fontSize: 13, color: FincaTheme.textLight),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Estado del Collar (Batería y Señal)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.battery_charging_full, color: FincaTheme.accentGreenLight, size: 20),
                      const SizedBox(width: 6),
                      Text('Batería: ${_nivelBateriaCollar.toInt()}%', style: const TextStyle(color: FincaTheme.textLight)),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.gps_fixed, color: FincaTheme.infoBlue, size: 20),
                      const SizedBox(width: 6),
                      const Text('GPS: Fix 3D', style: TextStyle(color: FincaTheme.textLight)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Botón Sonar Collar para Rescate Auditivo
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: FincaTheme.warningAmber,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🔔 Comando enviado vía Satélite/Celular: Sonando Buzzer en el collar...'),
                      backgroundColor: FincaTheme.warningAmber,
                    ),
                  );
                },
                icon: const Icon(Icons.volume_up, color: Colors.black),
                label: const Text(
                  'ACTIVAR PITIDO EN COLLAR (BUZZER)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
