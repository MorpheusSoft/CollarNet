import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/ops_provider.dart';
import '../theme/app_theme.dart';

class HardwareTestScreen extends StatefulWidget {
  const HardwareTestScreen({super.key});

  @override
  State<HardwareTestScreen> createState() => _HardwareTestScreenState();
}

class _HardwareTestScreenState extends State<HardwareTestScreen> with SingleTickerProviderStateMixin {
  // Estado de Actuadores
  bool _isBuzzer2000Active = false;
  bool _isBuzzer3000Active = false;
  bool _isPulseActive = false;
  int _pulseCountdown = 60;
  Timer? _pulseTimer;

  // Animación del Osciloscopio IMU
  late AnimationController _animController;
  final List<double> _imuX = [];
  final List<double> _imuY = [];
  final List<double> _imuZ = [];
  Timer? _imuStreamTimer;
  double _phase = 0.0;

  // Terminal AT
  final List<String> _atLogs = [
    'AT+CPIN? -> +CPIN: READY',
    'AT+CSQ -> +CSQ: 24,99 (Excelente)',
    'AT+CGATT? -> +CGATT: 1 (LTE-M Conectado)',
    'AT+QNWINFO -> "CAT-M1","73404","LTE BAND 4",-88',
    'MQTT CONNECT -> 86.48.23.195:1883 [OK]',
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    // Inicializar puntos del osciloscopio
    for (int i = 0; i < 50; i++) {
      _imuX.add(0.0);
      _imuY.add(0.0);
      _imuZ.add(0.0);
    }

    // Timer de actualización de osciloscopio (simulación de MPU-6050 a 20Hz)
    _imuStreamTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      if (mounted) {
        setState(() {
          _phase += 0.15;
          final rand = math.Random();
          final noiseX = (rand.nextDouble() - 0.5) * 0.4;
          final noiseY = (rand.nextDouble() - 0.5) * 0.3;
          final noiseZ = (rand.nextDouble() - 0.5) * 0.2;

          // Simulación de micro-movimientos de rumia / masticación
          final valX = math.sin(_phase * 1.5) * 1.2 + noiseX;
          final valY = math.cos(_phase * 1.8) * 0.8 + noiseY;
          final valZ = math.sin(_phase * 0.5) * 0.4 + noiseZ;

          _imuX.removeAt(0);
          _imuX.add(valX);
          _imuY.removeAt(0);
          _imuY.add(valY);
          _imuZ.removeAt(0);
          _imuZ.add(valZ);
        });
      }
    });
  }

  void _togglePulseTest() {
    if (_isPulseActive) {
      _pulseTimer?.cancel();
      setState(() {
        _isPulseActive = false;
        _pulseCountdown = 60;
      });
    } else {
      setState(() {
        _isPulseActive = true;
        _pulseCountdown = 60;
      });

      _pulseTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_pulseCountdown > 1) {
          setState(() => _pulseCountdown--);
        } else {
          // Corte automático de seguridad a los 60 segundos
          timer.cancel();
          setState(() {
            _isPulseActive = false;
            _pulseCountdown = 60;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.emeraldGreen,
              content: Text('🛡️ Corte de Seguridad: Pulso desactivado automáticamente a los 60s.'),
            ),
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ops = context.watch<OpsProvider>();
    final collar = ops.activeCollar;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: Text(
          'BANCO DE PRUEBAS DE HARDWARE',
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppTheme.primaryCyan,
            letterSpacing: 0.6,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.terminal, color: AppTheme.primaryCyan),
            tooltip: 'Consola Comandos AT',
            onPressed: () => _showAtTerminalModal(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Cabecera del Collar Conectado BLE
            _buildCollarHeaderCard(collar),
            const SizedBox(height: 14),

            // 2. Osciloscopio IMU en Tiempo Real (MPU-6050)
            _buildImuOscilloscopeCard(),
            const SizedBox(height: 14),

            // 3. Radar GNSS / GPS de Satélites
            _buildGnssRadarCard(collar),
            const SizedBox(height: 14),

            // 4. Panel de Pruebas de Estímulo / Actuadores
            _buildActuatorsTestCard(),
            const SizedBox(height: 14),

            // 5. Telemetría de Energía y Módem 4G
            _buildPowerAndModemCard(collar),
            const SizedBox(height: 20),

            // 6. Botón de Certificación de Control de Calidad
            _buildCertifyButton(context, collar),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildCollarHeaderCard(dynamic collar) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.emeraldGreen,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'BLE CONECTADO',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.emeraldGreen,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                collar?.id ?? 'COW-2026-0042',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                'IMEI: ${collar?.imei ?? "864920042183920"}',
                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
              ),
            ],
          ),
          Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'RSSI: ${collar?.rssi ?? -42} dBm',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primaryCyan,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${collar?.batteryPercent ?? 88}% (${collar?.batteryVoltage ?? 4.12}V)',
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.emeraldGreen,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                  border: Border.all(color: AppTheme.emeraldGreen, width: 2),
                ),
                child: const Center(
                  child: Icon(Icons.battery_charging_full, color: AppTheme.emeraldGreen, size: 22),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildImuOscilloscopeCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.show_chart, color: AppTheme.primaryCyan, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'OSCILOSCOPIO IMU EN VIVO (MPU-6050)',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '50 Hz Live',
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primaryCyan,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Lienzo CustomPaint del Osciloscopio
          Container(
            height: 110,
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF080E20),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.cardBorder.withValues(alpha: 0.5)),
            ),
            child: CustomPaint(
              painter: _OscilloscopePainter(
                xPoints: _imuX,
                yPoints: _imuY,
                zPoints: _imuZ,
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Leyenda de Ejes
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildAxisLegend('Eje X (Cian)', AppTheme.primaryCyan),
              _buildAxisLegend('Eje Y (Verde)', AppTheme.emeraldGreen),
              _buildAxisLegend('Eje Z (Ámbar)', AppTheme.warningAmber),
              Text(
                '🟢 Rumia Normal',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.emeraldGreen,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAxisLegend(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textSecondary),
        ),
      ],
    );
  }

  Widget _buildGnssRadarCard(dynamic collar) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.gps_fixed, color: AppTheme.emeraldGreen, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'RADAR GNSS / GPS (FIJACIÓN 3D)',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'HDOP: ${collar?.hdop ?? 1.1} (Excelente)',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.emeraldGreen,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              // Gráfico Polar Circular del Radar
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF080E20),
                  border: Border.all(color: AppTheme.emeraldGreen.withValues(alpha: 0.4), width: 1.5),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 55,
                      height: 55,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                    ),
                    const Icon(Icons.navigation, color: AppTheme.primaryCyan, size: 20),
                    // Satélites simulados
                    const Positioned(top: 10, left: 24, child: _SatDot(label: '14')),
                    const Positioned(top: 22, right: 18, child: _SatDot(label: '09')),
                    const Positioned(bottom: 14, left: 30, child: _SatDot(label: '22')),
                    const Positioned(bottom: 25, right: 12, child: _SatDot(label: '03')),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${collar?.satellitesLocked ?? 9} Satélites enlazados',
                      style: GoogleFonts.outfit(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Constelaciones: GPS + GLONASS + Galileo',
                      style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Lat: 9°42\'18.4" N | Lng: 67°21\'04.2" W',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryCyan,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActuatorsTestCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.flash_on, color: AppTheme.warningAmber, size: 18),
              const SizedBox(width: 8),
              Text(
                'PRUEBA DE ACTUADORES & ESTÍMULOS',
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Botón Buzzer 2000Hz
              Expanded(
                child: _buildActuatorButton(
                  label: 'Buzzer 2000Hz',
                  subtitle: 'Advertencia',
                  icon: Icons.volume_up,
                  isActive: _isBuzzer2000Active,
                  activeColor: AppTheme.primaryCyan,
                  onTap: () {
                    setState(() => _isBuzzer2000Active = !_isBuzzer2000Active);
                  },
                ),
              ),
              const SizedBox(width: 8),
              // Botón Buzzer 3000Hz
              Expanded(
                child: _buildActuatorButton(
                  label: 'Buzzer 3000Hz',
                  subtitle: 'Peligro',
                  icon: Icons.notification_important,
                  isActive: _isBuzzer3000Active,
                  activeColor: AppTheme.warningAmber,
                  onTap: () {
                    setState(() => _isBuzzer3000Active = !_isBuzzer3000Active);
                  },
                ),
              ),
              const SizedBox(width: 8),
              // Botón Pulso Seguro
              Expanded(
                child: _buildActuatorButton(
                  label: _isPulseActive ? '${_pulseCountdown}s' : 'Pulso Test',
                  subtitle: 'Corte 60s',
                  icon: Icons.bolt,
                  isActive: _isPulseActive,
                  activeColor: AppTheme.dangerRed,
                  onTap: _togglePulseTest,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActuatorButton({
    required String label,
    required String subtitle,
    required IconData icon,
    required bool isActive,
    required Color activeColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? activeColor.withValues(alpha: 0.2) : AppTheme.surfaceLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? activeColor : AppTheme.cardBorder,
            width: isActive ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: isActive ? activeColor : AppTheme.textSecondary),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isActive ? activeColor : AppTheme.textPrimary,
              ),
            ),
            Text(
              subtitle,
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPowerAndModemCard(dynamic collar) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder, width: 1),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.wb_sunny, color: AppTheme.warningAmber, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'Panel Solar',
                      style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '+${collar?.solarCurrentMa ?? 140.0} mA',
                  style: GoogleFonts.outfit(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.warningAmber,
                  ),
                ),
                Text(
                  'Carga fotovoltaica óptima',
                  style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 45, color: AppTheme.cardBorder),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.signal_cellular_alt, color: AppTheme.emeraldGreen, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'Módem 4G LTE-M',
                      style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'CSQ: ${collar?.csqSignal ?? 24}/31',
                  style: GoogleFonts.outfit(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.emeraldGreen,
                  ),
                ),
                Text(
                  'Enlace MQTT Estable',
                  style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCertifyButton(BuildContext context, dynamic collar) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.emeraldGreen,
              content: Row(
                children: [
                  const Icon(Icons.verified, color: Colors.white),
                  const SizedBox(width: 10),
                  Text(
                    '¡Collar ${collar?.id ?? "COW-2026-0042"} CERTIFICADO y listo para campo!',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.emeraldGreen,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 4,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.verified_outlined, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(
              'CERTIFICAR COLLAR (CONTROL DE CALIDAD)',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAtTerminalModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF080E20),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'TERMINAL DE COMANDOS AT (4G MODEM)',
                    style: GoogleFonts.outfit(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.primaryCyan,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 18),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: AppTheme.cardBorder),
              ..._atLogs.map((log) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Text(
                      log,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 11,
                        color: log.contains('OK') || log.contains('READY')
                            ? AppTheme.emeraldGreen
                            : AppTheme.textSecondary,
                      ),
                    ),
                  )),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    _imuStreamTimer?.cancel();
    _pulseTimer?.cancel();
    super.dispose();
  }
}

class _SatDot extends StatelessWidget {
  final String label;
  const _SatDot({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 14,
      height: 14,
      decoration: const BoxDecoration(
        color: AppTheme.emeraldGreen,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          label,
          style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.black),
        ),
      ),
    );
  }
}

class _OscilloscopePainter extends CustomPainter {
  final List<double> xPoints;
  final List<double> yPoints;
  final List<double> zPoints;

  _OscilloscopePainter({
    required this.xPoints,
    required this.yPoints,
    required this.zPoints,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final midY = size.height / 2;
    final stepX = size.width / (xPoints.length - 1);

    // Eje central
    final gridPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..strokeWidth = 1.0;
    canvas.drawLine(Offset(0, midY), Offset(size.width, midY), gridPaint);

    void drawLine(List<double> points, Color color) {
      final paint = Paint()
        ..color = color
        ..strokeWidth = 2.0
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      final path = Path();
      for (int i = 0; i < points.length; i++) {
        final x = i * stepX;
        final y = midY - (points[i] * (size.height / 4));
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(path, paint);
    }

    drawLine(xPoints, AppTheme.primaryCyan);
    drawLine(yPoints, AppTheme.emeraldGreen);
    drawLine(zPoints, AppTheme.warningAmber);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
