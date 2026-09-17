import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/ops_provider.dart';
import '../theme/app_theme.dart';

class BleQuickScanCard extends StatelessWidget {
  final VoidCallback onTap;

  const BleQuickScanCard({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final ops = context.watch<OpsProvider>();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: AppTheme.scanActionGradient,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: ops.isScanningBle
                ? AppTheme.primaryCyan
                : AppTheme.primaryCyan.withValues(alpha: 0.4),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primaryCyan.withValues(alpha: ops.isScanningBle ? 0.25 : 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                border: Border.all(color: AppTheme.primaryCyan, width: 1.5),
              ),
              child: Center(
                child: ops.isScanningBle
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryCyan),
                        ),
                      )
                    : const Icon(
                        Icons.bluetooth_searching,
                        color: AppTheme.primaryCyan,
                        size: 28,
                      ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'ESCANEAR COLLAR CERCANO',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryCyan,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.emeraldGreen.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'BLE',
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.emeraldGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ops.isScanningBle
                        ? 'Buscando dispositivos Bluetooth...'
                        : (ops.activeCollar != null
                            ? 'Conectado a ${ops.activeCollar!.id} (RSSI: ${ops.activeCollar!.rssi} dBm)'
                            : 'Detecta y vincula collares a menos de 5 metros'),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppTheme.primaryCyan,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
