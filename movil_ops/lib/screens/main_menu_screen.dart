import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/ops_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/ble_quick_scan_card.dart';
import '../widgets/kpi_metric_card.dart';
import '../widgets/module_nav_card.dart';
import '../widgets/recent_activity_card.dart';
import 'hardware_test_screen.dart';
import 'hatos_screen.dart';
import 'lotes_screen.dart';
import 'ota_screen.dart';
import '../services/update_service.dart';

class MainMenuScreen extends StatefulWidget {
  const MainMenuScreen({super.key});

  @override
  State<MainMenuScreen> createState() => _MainMenuScreenState();
}

class _MainMenuScreenState extends State<MainMenuScreen> {
  int _currentBottomNavIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OpsProvider>().refreshServerData();
      UpdateService().checkForUpdates(context, manual: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final ops = context.watch<OpsProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Cabecera del Operador y Estado Cloud VPS
              _buildHeader(ops),
              const SizedBox(height: 18),

              // 2. Fila de KPIs de Stock y Taller
              Row(
                children: [
                  KpiMetricCard(
                    title: 'EN STOCK',
                    value: '${ops.totalStockCount}',
                    subtitle: 'Collares listos',
                    icon: Icons.inventory_2_outlined,
                    accentColor: AppTheme.emeraldGreen,
                  ),
                  const SizedBox(width: 10),
                  KpiMetricCard(
                    title: 'EN REVISIÓN',
                    value: '${ops.inReviewCount}',
                    subtitle: 'Diagnóstico',
                    icon: Icons.biotech_outlined,
                    accentColor: AppTheme.warningAmber,
                  ),
                  const SizedBox(width: 10),
                  KpiMetricCard(
                    title: 'LOTES',
                    value: '${ops.totalBatchesCount}',
                    subtitle: 'Registrados',
                    icon: Icons.receipt_long_outlined,
                    accentColor: AppTheme.primaryCyan,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Tarjeta de Acción Rápida: Escaneo BLE Radar
              BleQuickScanCard(
                onTap: () {
                  ops.startBleScan();
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const HardwareTestScreen()),
                  );
                },
              ),
              const SizedBox(height: 22),

              // 4. Título de Sección de Módulos
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'MÓDULOS DE OPERACIÓN & DESPLIEGUE',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  Text(
                    'CowIA v2.0',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 5. Cuadrícula de Módulos (2x2)
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 0.95,
                children: [
                  ModuleNavCard(
                    title: '1. Banco de Pruebas',
                    description: 'Osciloscopio IMU, radar GNSS, buzzer y pulso 60s.',
                    icon: Icons.speed,
                    accentColor: AppTheme.primaryCyan,
                    actionText: 'Abrir Suite',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const HardwareTestScreen()),
                      );
                    },
                  ),
                  ModuleNavCard(
                    title: '2. Hatos Maestros',
                    description: 'Linderos legales con satélite y GPS en terreno.',
                    icon: Icons.hub,
                    accentColor: AppTheme.emeraldGreen,
                    actionText: 'Diseñar Hato',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const HatosScreen()),
                      );
                    },
                  ),
                  ModuleNavCard(
                    title: '3. Recepción Lotes',
                    description: 'Escáner QR continuo para cajas de 50+ collares.',
                    icon: Icons.qr_code_scanner,
                    accentColor: AppTheme.warningAmber,
                    actionText: 'Escanear QR',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LotesScreen()),
                      );
                    },
                  ),
                  ModuleNavCard(
                    title: '4. Flasheo OTA & Debug',
                    description: 'Carga de firmware binario BLE y consola de comandos AT.',
                    icon: Icons.bolt,
                    accentColor: AppTheme.accentPurple,
                    actionText: 'Abrir Consola',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const OtaScreen()),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 6. Tarjeta de Auditoría y Actividad Reciente
              const RecentActivityCard(),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          border: Border(top: BorderSide(color: AppTheme.cardBorder, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentBottomNavIndex,
          onTap: (index) {
            setState(() => _currentBottomNavIndex = index);
            if (index == 1) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const HardwareTestScreen()),
              );
            } else if (index == 2) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const HatosScreen()),
              );
            } else if (index == 3) {
              _showSettingsDialog(context);
            }
          },
          backgroundColor: AppTheme.surface,
          selectedItemColor: AppTheme.primaryCyan,
          unselectedItemColor: AppTheme.textMuted,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Inicio',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.speed_outlined),
              activeIcon: Icon(Icons.speed),
              label: 'Test Suite',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.hub_outlined),
              activeIcon: Icon(Icons.hub),
              label: 'Hatos',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.tune_outlined),
              activeIcon: Icon(Icons.tune),
              label: 'Ajustes',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(OpsProvider ops) {
    final isOnline = ops.isCloudServerOnline;
    final latency = ops.serverLatencyMs;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppTheme.primaryGradient,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryCyan.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(Icons.person, color: Colors.white, size: 22),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ops.operatorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    Text(
                      ops.operatorRole,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: () {
                ops.refreshServerData();
                _showSettingsDialog(context);
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isOnline
                      ? AppTheme.emeraldGreen.withValues(alpha: 0.12)
                      : AppTheme.dangerRed.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isOnline
                        ? AppTheme.emeraldGreen.withValues(alpha: 0.4)
                        : AppTheme.dangerRed.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isOnline ? AppTheme.emeraldGreen : AppTheme.dangerRed,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isOnline ? 'Cloud VPS (${latency}ms)' : 'Desconectado',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: isOnline ? AppTheme.emeraldGreen : AppTheme.dangerRed,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 2),
            IconButton(
              icon: const Icon(Icons.system_update_rounded, size: 20, color: AppTheme.primaryCyan),
              tooltip: 'Buscar Actualizaciones',
              onPressed: () => UpdateService().checkForUpdates(context, manual: true),
            ),
            IconButton(
              icon: const Icon(Icons.logout_rounded, size: 20, color: AppTheme.textMuted),
              tooltip: 'Cerrar Sesión',
              onPressed: () => _confirmLogout(context),
            ),
          ],
        ),
      ],
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppTheme.cardBorder),
        ),
        title: Text(
          '¿Cerrar Sesión?',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
        ),
        content: Text(
          'Se cerrará tu sesión activa y deberás ingresar usuario y clave nuevamente.',
          style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancelar', style: GoogleFonts.inter(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.dangerRed,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<OpsProvider>().logout();
            },
            child: const Text('Cerrar Sesión'),
          ),
        ],
      ),
    );
  }

  void _showSettingsDialog(BuildContext context) async {
    final currentUrl = await ApiService.getBaseUrl();
    if (!context.mounted) return;
    final controller = TextEditingController(text: currentUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppTheme.cardBorder),
        ),
        title: Row(
          children: [
            const Icon(Icons.settings_ethernet_rounded, color: AppTheme.primaryCyan, size: 24),
            const SizedBox(width: 8),
            Text(
              'Servidor Cloud VPS',
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ingresa la dirección IP y puerto del servidor local o nube (ej: http://192.168.86.21:3500/api):',
              style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppTheme.surfaceLight,
                hintText: 'http://192.168.86.21:3500/api',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.link, color: AppTheme.primaryCyan, size: 20),
              ),
            ),
            const SizedBox(height: 16),
            const Divider(color: AppTheme.cardBorder),
            const SizedBox(height: 10),
            Text(
              'Actualizaciones de Software (OTA):',
              style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.primaryCyan),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.system_update_rounded, color: AppTheme.primaryCyan, size: 18),
                label: Text(
                  'Buscar Actualizaciones Ahora',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primaryCyan,
                  ),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  UpdateService().checkForUpdates(context, manual: true);
                },
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancelar', style: GoogleFonts.inter(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryCyan,
              foregroundColor: Colors.black,
            ),
            onPressed: () async {
              final newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiService.setCustomBaseUrl(newUrl);
                if (ctx.mounted) Navigator.pop(ctx);
                if (context.mounted) {
                  context.read<OpsProvider>().refreshServerData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: AppTheme.emeraldGreen,
                      content: Text('✅ Dirección del servidor actualizada: $newUrl'),
                    ),
                  );
                }
              }
            },
            child: Text('Guardar', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}
