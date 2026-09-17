import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class OtaScreen extends StatefulWidget {
  const OtaScreen({super.key});

  @override
  State<OtaScreen> createState() => _OtaScreenState();
}

class _OtaScreenState extends State<OtaScreen> {
  String selectedFirmwareVersion = 'CollarNet_v1.2.4_Production.bin';
  bool isUploadingOta = false;
  double otaProgress = 0.0;
  Timer? _otaTimer;

  final List<String> serialLogs = [
    '[00:01.02] BLE GATT Characteristic MTU set to 512 bytes',
    '[00:01.15] OTA Partition "app0" ready (Size: 1,482,912 bytes)',
    '[00:01.32] Handshake ACK received from ESP32-D0WD-V3',
    '[00:01.45] Starting BLE block transmission (Block Size: 512B)',
    '[00:02.10] Block 142/2896 transmitted [CRC-32 OK]',
    '[00:03.20] Block 512/2896 transmitted [CRC-32 OK]',
  ];

  void _startOtaUpload() {
    setState(() {
      isUploadingOta = true;
      otaProgress = 0.0;
    });

    _otaTimer = Timer.periodic(const Duration(milliseconds: 150), (timer) {
      if (otaProgress < 1.0) {
        setState(() {
          otaProgress += 0.03;
          if ((otaProgress * 100).toInt() % 15 == 0) {
            serialLogs.add(
              '[${DateTime.now().minute}:${DateTime.now().second}.${DateTime.now().millisecond}] Block ${((otaProgress * 2896).toInt())}/2896 transmitted [CRC-32 OK]',
            );
          }
        });
      } else {
        timer.cancel();
        setState(() {
          isUploadingOta = false;
          otaProgress = 1.0;
          serialLogs.add('[DONE] Firmware Flashed Successfully! ESP32 Rebooting...');
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.emeraldGreen,
            content: Text('✅ Firmware actualizado exitosamente por Bluetooth BLE.'),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: Text(
          'MANTENIMIENTO & FLASHEO BLE OTA',
          style: GoogleFonts.outfit(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: AppTheme.accentPurple,
            letterSpacing: 0.6,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Tarjeta de Firmware Seleccionado
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'BINARIO DE FIRMWARE OFICIAL',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.accentPurple.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'v1.2.4',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.accentPurple,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    selectedFirmwareVersion,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Compilación C++ oficial con algoritmos de Cerca Virtual y Ray-Casting',
                    style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 2. Indicador Circular de Progreso OTA
            Container(
              padding: const EdgeInsets.all(20),
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 130,
                        height: 130,
                        child: CircularProgressIndicator(
                          value: isUploadingOta ? otaProgress : (otaProgress == 1.0 ? 1.0 : 0.0),
                          strokeWidth: 8,
                          backgroundColor: AppTheme.surfaceLight,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accentPurple),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isUploadingOta ? Icons.bluetooth_audio : Icons.bolt,
                            color: AppTheme.accentPurple,
                            size: 32,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${(otaProgress * 100).toInt()}%',
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    isUploadingOta ? 'Transmitiendo binario por BLE...' : 'Listo para iniciar actualización inalámbrica',
                    style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      onPressed: isUploadingOta ? null : _startOtaUpload,
                      icon: const Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 18),
                      label: Text(
                        isUploadingOta ? 'FLASHEANDO DISPOSITIVO...' : 'INICIAR FLASHEO BLE OTA',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentPurple,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 3. Consola de Logs Seriales
            Container(
              padding: const EdgeInsets.all(14),
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF070D1D),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'TERMINAL DE LOGS SERIAL / DEBUG',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryCyan,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const Icon(Icons.circle, color: AppTheme.emeraldGreen, size: 8),
                    ],
                  ),
                  const Divider(color: AppTheme.cardBorder, height: 16),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: serialLogs.length,
                    itemBuilder: (context, index) {
                      final log = serialLogs[index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text(
                          log,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            color: log.contains('OK') || log.contains('DONE')
                                ? AppTheme.emeraldGreen
                                : AppTheme.textSecondary,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _otaTimer?.cancel();
    super.dispose();
  }
}
