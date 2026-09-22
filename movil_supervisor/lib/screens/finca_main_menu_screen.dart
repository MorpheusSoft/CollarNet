import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';
import 'arreo_traslado_screen.dart';
import 'map_screen.dart';
import 'rotacion_potreros_screen.dart';
import 'manga_vinculacion_screen.dart';
import 'pesaje_screen.dart';
import 'buscar_res_screen.dart';
import 'sanidad_celo_screen.dart';
import 'login_screen.dart';
import '../services/update_service.dart';

class FincaMainMenuScreen extends StatefulWidget {
  const FincaMainMenuScreen({Key? key}) : super(key: key);

  @override
  State<FincaMainMenuScreen> createState() => _FincaMainMenuScreenState();
}

class _FincaMainMenuScreenState extends State<FincaMainMenuScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpdateService().checkForUpdates(context, manual: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      body: SafeArea(
        child: Column(
          children: [
            // 1. Cabecera Principal de la Hacienda y Conexión
            _buildTopHeader(context, fincaState),

            // 2. Contenido Scrolleable
            Expanded(
              child: RefreshIndicator(
                color: FincaTheme.primaryGreen,
                onRefresh: () => fincaState.syncData(),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Barra de Resumen en Vivo
                      _buildMetricsRow(fincaState),
                      const SizedBox(height: 16),

                      // Tarjeta de Modo Arreo / Emergencia
                      _buildArreoTacticalCard(context, fincaState),
                      const SizedBox(height: 20),

                      // Título de la Cuadrícula de Módulos
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'MÓDULOS DE CAMPO & MANGA',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: FincaTheme.textMuted,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            'CowIA Finca v1.0',
                            style: TextStyle(
                              fontSize: 12,
                              color: FincaTheme.accentGreenLight.withOpacity(0.8),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Cuadrícula de 6 Módulos
                      _buildModulesGrid(context),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Header Superior con Selector de Hato y Estado de Conexión
  Widget _buildTopHeader(BuildContext context, FincaStateProvider state) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: FincaTheme.bgCard,
        border: Border(bottom: BorderSide(color: FincaTheme.borderCard)),
      ),
      child: Row(
        children: [
          // Logo / Icono CowIA Finca
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: FincaTheme.primaryGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: FincaTheme.primaryGreen.withOpacity(0.4)),
            ),
            child: const Icon(Icons.agriculture, color: FincaTheme.accentGreenLight, size: 26),
          ),
          const SizedBox(width: 12),

          // Título de Finca / Selector de Hato y Estado
          Expanded(
            child: InkWell(
              onTap: () => _mostrarSelectorHato(context, state),
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            state.hatoNombre,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: FincaTheme.textLight,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.keyboard_arrow_down_rounded, color: FincaTheme.accentGreenLight, size: 20),
                        const SizedBox(width: 6),
                        // Badge Online / Offline
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: state.isOnline
                                ? FincaTheme.primaryGreen.withOpacity(0.2)
                                : FincaTheme.warningAmber.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: state.isOnline ? FincaTheme.primaryGreen : FincaTheme.warningAmber,
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 3.5,
                                backgroundColor: state.isOnline ? FincaTheme.primaryGreen : FincaTheme.warningAmber,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                state.isOnline ? 'EN LÍNEA' : 'OFFLINE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: state.isOnline ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.swap_horiz, size: 12, color: FincaTheme.accentGreenLight),
                        const SizedBox(width: 3),
                        const Text(
                          'Tocar para cambiar hato',
                          style: TextStyle(fontSize: 11, color: FincaTheme.accentGreenLight, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Botón Perfil de Usuario
          InkWell(
            onTap: () => _mostrarPerfilUsuario(context, state),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: FincaTheme.bgCardElevated,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: FincaTheme.primaryGreen.withOpacity(0.25),
                    child: Text(
                      state.currentUserName.isNotEmpty ? state.currentUserName[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: FincaTheme.accentGreenLight),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        state.currentUserName.split(' ').first,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: FincaTheme.textLight),
                      ),
                      Text(
                        state.currentUserRole == 'ADMIN_FINCA' ? 'Supervisor' : state.currentUserRole,
                        style: const TextStyle(fontSize: 9, color: FincaTheme.accentGreenLight),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),

          // Botón Buscar Actualizaciones OTA
          IconButton(
            icon: const Icon(Icons.system_update_rounded, color: FincaTheme.accentGreenLight, size: 22),
            onPressed: () => UpdateService().checkForUpdates(context, manual: true),
            tooltip: 'Buscar Actualizaciones',
          ),

          // Botón Configuración de Servidor
          IconButton(
            icon: const Icon(Icons.settings, color: FincaTheme.textMuted, size: 22),
            onPressed: () => _mostrarConfiguracionIp(context, state),
            tooltip: 'Configuración Servidor',
          ),
        ],
      ),
    );
  }

  // Fila de Métricas del Dashboard
  Widget _buildMetricsRow(FincaStateProvider state) {
    return Row(
      children: [
        _buildMetricCard(
          icon: Icons.pets,
          value: '${state.totalAnimales}',
          label: 'En Monitoreo',
          color: FincaTheme.accentGreenLight,
        ),
        const SizedBox(width: 8),
        _buildMetricCard(
          icon: Icons.fence,
          value: '${state.potrerosActivos} / ${state.potrerosDescanso}',
          label: 'Abiertos / Desc.',
          color: FincaTheme.infoBlue,
        ),
        const SizedBox(width: 8),
        _buildMetricCard(
          icon: Icons.trending_up,
          value: '+${(state.gdpPromedioKg * 1000).toInt()}g',
          label: 'GDP Promedio',
          color: FincaTheme.warningAmber,
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: FincaTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: FincaTheme.borderCard),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(width: 6),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: FincaTheme.textMuted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // Tarjeta Táctica de Modo Arreo
  Widget _buildArreoTacticalCard(BuildContext context, FincaStateProvider state) {
    final bool isActivo = state.modoArreoActivo;

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ArreoTrasladoScreen()),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isActivo
                ? [FincaTheme.warningAmber.withOpacity(0.25), FincaTheme.bgCardElevated]
                : [FincaTheme.bgCardElevated, FincaTheme.bgCard],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActivo ? FincaTheme.warningAmber : FincaTheme.borderCard,
            width: isActivo ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (isActivo ? FincaTheme.warningAmber : FincaTheme.primaryGreen).withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isActivo ? Icons.alarm_on : Icons.directions_walk,
                color: isActivo ? FincaTheme.warningAmber : FincaTheme.accentGreenLight,
                size: 28,
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
                        isActivo ? 'MODO ARREO EN CURSO' : 'MODO ARREO (TRASLADO)',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isActivo ? FincaTheme.warningAmber : FincaTheme.textLight,
                        ),
                      ),
                      if (isActivo) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: FincaTheme.warningAmber,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'ACTIVO',
                            style: TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isActivo
                        ? 'Callejones abiertos sin alarmas. Toque para gestionar.'
                        : 'Abrir compuertas temporalmente para mover ganado.',
                    style: const TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16, color: FincaTheme.textMuted),
          ],
        ),
      ),
    );
  }

  // Cuadrícula de 6 Módulos Principales
  Widget _buildModulesGrid(BuildContext context) {
    final modules = [
      {
        'title': '1. Mapa & Potreros',
        'subtitle': 'Monitoreo en vivo de reses y subdivisión GPS',
        'icon': Icons.map,
        'color': FincaTheme.primaryGreen,
        'badge': 'GPS EN VIVO',
        'screen': const MapScreen(),
      },
      {
        'title': '2. Rotación & Pastos',
        'subtitle': 'Abrir/cerrar potreros y descanso forrajero',
        'icon': Icons.sync_alt,
        'color': FincaTheme.accentGreenLight,
        'badge': 'CONTROL',
        'screen': const RotacionPotrerosScreen(),
      },
      {
        'title': '3. Manga & Vinculación',
        'subtitle': 'Arete + Collar QR + Potrero en 3 toques',
        'icon': Icons.qr_code_scanner,
        'color': FincaTheme.infoBlue,
        'badge': '3 TOQUES',
        'screen': const MangaVinculacionScreen(),
      },
      {
        'title': '4. Pesaje & Ganancia',
        'subtitle': 'Báscula en corral, teclado gigante y GDP',
        'icon': Icons.scale,
        'color': FincaTheme.warningAmber,
        'badge': 'GDP KG',
        'screen': const PesajeScreen(),
      },
      {
        'title': '5. Brújula "Buscar Res"',
        'subtitle': 'Guía táctica con rumbo y distancia sin internet',
        'icon': Icons.explore,
        'color': FincaTheme.errorCrimson,
        'badge': 'RESCATE',
        'screen': const BuscarResScreen(),
      },
      {
        'title': '6. Sanidad & Celo',
        'subtitle': 'Vacunación masiva, alertas de celo y partos',
        'icon': Icons.favorite,
        'color': FincaTheme.purpleSanidad,
        'badge': 'SALUD IA',
        'screen': const SanidadCeloScreen(),
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        mainAxisExtent: 175,
      ),
      itemCount: modules.length,
      itemBuilder: (context, index) {
        final m = modules[index];
        final Color col = m['color'] as Color;

        return InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => m['screen'] as Widget),
            );
          },
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: FincaTheme.bgCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: FincaTheme.borderCard),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: col.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(m['icon'] as IconData, color: col, size: 24),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: col.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        m['badge'] as String,
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: col,
                        ),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  m['title'] as String,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: FincaTheme.textLight,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  m['subtitle'] as String,
                  style: const TextStyle(
                    fontSize: 11,
                    color: FincaTheme.textMuted,
                    height: 1.2,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Diálogo para Cambiar la IP del Servidor
  void _mostrarConfiguracionIp(BuildContext context, FincaStateProvider state) {
    final controller = TextEditingController(text: state.serverIp);

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: FincaTheme.bgCardElevated,
          title: const Row(
            children: [
              Icon(Icons.router, color: FincaTheme.primaryGreen),
              SizedBox(width: 8),
              Text('Servidor Backend', style: TextStyle(color: FincaTheme.textLight, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ingresa la dirección o IP del servidor (ej: www.cowai.net):',
                style: TextStyle(fontSize: 13, color: FincaTheme.textMuted),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                style: const TextStyle(color: FincaTheme.textLight),
                decoration: const InputDecoration(
                  labelText: 'Servidor CowIA',
                  hintText: 'www.cowai.net',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar', style: TextStyle(color: FincaTheme.textMuted)),
            ),
            ElevatedButton(
              onPressed: () {
                state.updateServerIp(controller.text);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Servidor actualizado. Sincronizando...')),
                );
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
  }

  // Modal para Seleccionar el Hato de Trabajo
  void _mostrarSelectorHato(BuildContext context, FincaStateProvider state) {
    showModalBottomSheet(
      context: context,
      backgroundColor: FincaTheme.bgCardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        side: BorderSide(color: FincaTheme.borderCard),
      ),
      builder: (ctx) {
        final hatos = state.hatosDisponibles;

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.terrain_rounded, color: FincaTheme.accentGreenLight, size: 22),
                        SizedBox(width: 8),
                        Text(
                          'CAMBIAR HATO DE TRABAJO',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: FincaTheme.textLight,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: FincaTheme.textMuted, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Selecciona la finca o hato en el que deseas operar los 6 módulos:',
                  style: TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                ),
                const SizedBox(height: 16),

                if (hatos.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: FincaTheme.bgCard,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, color: FincaTheme.warningAmber),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Actualmente en: ${state.hatoNombre}. Toca actualizar para buscar más hatos.',
                            style: const TextStyle(color: FincaTheme.textLight, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: hatos.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, idx) {
                        final h = hatos[idx];
                        final int id = h['id'] as int? ?? (idx + 1);
                        final String nombre = h['nombre'] as String? ?? 'Hato $id';
                        final int potrerosCount = h['potrerosCount'] as int? ?? 0;
                        final double areaHa = (h['areaHa'] != null) ? (h['areaHa'] as num).toDouble() : 0.0;
                        final bool isSelected = id == state.hatoId;

                        return InkWell(
                          onTap: () {
                            state.selectHato(id, nombre);
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: FincaTheme.primaryGreen,
                                content: Text('🌾 Hato activo cambiado a "$nombre"'),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? FincaTheme.primaryGreen.withOpacity(0.15)
                                  : FincaTheme.bgCard,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected
                                    ? FincaTheme.primaryGreen
                                    : FincaTheme.borderCard,
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: (isSelected ? FincaTheme.primaryGreen : FincaTheme.warningAmber).withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    Icons.agriculture_rounded,
                                    color: isSelected ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        nombre,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: isSelected ? FincaTheme.accentGreenLight : FincaTheme.textLight,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '$potrerosCount potreros' + (areaHa > 0 ? ' • ${areaHa.toStringAsFixed(1)} Ha' : ''),
                                        style: const TextStyle(fontSize: 11, color: FincaTheme.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(Icons.check_circle, color: FincaTheme.primaryGreen, size: 20)
                                else
                                  const Icon(Icons.arrow_forward_ios, color: FincaTheme.textMuted, size: 14),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await state.syncData();
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    icon: const Icon(Icons.sync, size: 16, color: FincaTheme.accentGreenLight),
                    label: const Text('Recargar Hatos desde Servidor', style: TextStyle(color: FincaTheme.accentGreenLight)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: FincaTheme.borderCard),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Modal de Perfil de Usuario y Cierre de Sesión
  void _mostrarPerfilUsuario(BuildContext context, FincaStateProvider state) {
    showModalBottomSheet(
      context: context,
      backgroundColor: FincaTheme.bgCardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        side: BorderSide(color: FincaTheme.borderCard),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.account_circle_rounded, color: FincaTheme.accentGreenLight, size: 24),
                        SizedBox(width: 8),
                        Text(
                          'SESIÓN DE USUARIO',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: FincaTheme.textLight,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: FincaTheme.textMuted, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: FincaTheme.borderCard),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: FincaTheme.primaryGreen.withOpacity(0.2),
                        child: const Icon(Icons.person, color: FincaTheme.accentGreenLight, size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              state.currentUserName,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: FincaTheme.textLight,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              state.currentUserEmail,
                              style: const TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: FincaTheme.primaryGreen.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Rol: ${state.currentUserRole} • ${state.currentUserTenant}',
                                style: const TextStyle(fontSize: 10, color: FincaTheme.accentGreenLight, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Botón Buscar Actualizaciones
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      UpdateService().checkForUpdates(context, manual: true);
                    },
                    icon: const Icon(Icons.system_update_rounded, size: 18, color: FincaTheme.accentGreenLight),
                    label: const Text('Buscar Actualizaciones de la App'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: FincaTheme.borderCard),
                      foregroundColor: FincaTheme.accentGreenLight,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Botón Cerrar Sesión
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      await state.logout();
                      if (context.mounted) {
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                    icon: const Icon(Icons.logout_rounded, size: 18, color: Colors.white),
                    label: const Text('Cerrar Sesión'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: FincaTheme.errorCrimson,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
