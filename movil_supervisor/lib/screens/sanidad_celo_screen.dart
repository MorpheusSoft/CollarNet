import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';

class SanidadCeloScreen extends StatefulWidget {
  const SanidadCeloScreen({Key? key}) : super(key: key);

  @override
  State<SanidadCeloScreen> createState() => _SanidadCeloScreenState();
}

class _SanidadCeloScreenState extends State<SanidadCeloScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _alertasSalud = [
    {
      'arete': 'V-042',
      'tipo': 'CELO DETECTADO',
      'icono': Icons.favorite,
      'color': FincaTheme.errorCrimson,
      'hora': 'Hoy 05:40 AM',
      'detalle': 'Pico de actividad motriz (+180% sobre media basal). Ventana de inseminación óptima: Próximas 12 horas.',
      'collar': 'COL-0014',
    },
    {
      'arete': 'V-019',
      'tipo': 'BAJA RUMIA / SOSPECHA DE FIEBRE',
      'icono': Icons.warning_amber,
      'color': FincaTheme.warningAmber,
      'hora': 'Ayer 11:20 PM',
      'detalle': 'Caída de masticación del 62%. Posible malestar o timpanismo en potrero 2.',
      'collar': 'COL-0003',
    },
    {
      'arete': 'N-011',
      'tipo': 'PARTO INMINENTE (DÍA 281)',
      'icono': Icons.child_care,
      'color': FincaTheme.purpleSanidad,
      'hora': 'Faltan 2 días',
      'detalle': 'Preñez con Toro Senepol T-015. Monitorear en potrero de maternidad.',
      'collar': 'COL-0022',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Sanidad, Celo & Partos'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: FincaTheme.primaryGreen,
          labelColor: FincaTheme.accentGreenLight,
          unselectedLabelColor: FincaTheme.textMuted,
          tabs: const [
            Tab(icon: Icon(Icons.notifications_active), text: 'Alertas IA'),
            Tab(icon: Icon(Icons.vaccines), text: 'Vacunación Masiva'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTabAlertas(),
          _buildTabVacunacion(fincaState),
        ],
      ),
    );
  }

  Widget _buildTabAlertas() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _alertasSalud.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final alert = _alertasSalud[index];
        final Color col = alert['color'] as Color;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FincaTheme.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: col.withOpacity(0.5), width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: col.withOpacity(0.15),
                    child: Icon(alert['icono'] as IconData, color: col, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          alert['tipo'] as String,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: col),
                        ),
                        Text(
                          'Arete ${alert['arete']} • ${alert['collar']} • ${alert['hora']}',
                          style: const TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                alert['detalle'] as String,
                style: const TextStyle(fontSize: 13, color: FincaTheme.textLight, height: 1.3),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: FincaTheme.textLight,
                      side: const BorderSide(color: FincaTheme.borderCard),
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Acción registrada para res ${alert['arete']}')),
                      );
                    },
                    child: const Text('Atender Alerta'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTabVacunacion(FincaStateProvider fincaState) {
    String potreroSeleccionado = fincaState.potrerosRotacion.first['nombre'];
    String vacunaSeleccionada = 'Fiebre Aftosa + Rabia (Ciclo I)';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'REGISTRO DE VACUNACIÓN POR POTRERO COMPLETO',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: FincaTheme.accentGreenLight),
          ),
          const SizedBox(height: 6),
          const Text(
            'Permite aplicar el tratamiento en lote a todas las reses presentes en el potrero.',
            style: TextStyle(fontSize: 13, color: FincaTheme.textMuted),
          ),
          const SizedBox(height: 16),

          DropdownButtonFormField<String>(
            value: potreroSeleccionado,
            dropdownColor: FincaTheme.bgCardElevated,
            decoration: const InputDecoration(
              labelText: 'Seleccionar Potrero a Tratar',
              border: OutlineInputBorder(),
            ),
            items: fincaState.potrerosRotacion.map<DropdownMenuItem<String>>((p) {
              return DropdownMenuItem<String>(
                value: p['nombre'] as String,
                child: Text('${p['nombre']} (${p['animales']} reses)'),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => potreroSeleccionado = val);
            },
          ),
          const SizedBox(height: 16),

          DropdownButtonFormField<String>(
            value: vacunaSeleccionada,
            dropdownColor: FincaTheme.bgCardElevated,
            decoration: const InputDecoration(
              labelText: 'Tipo de Biológico / Vacuna',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'Fiebre Aftosa + Rabia (Ciclo I)', child: Text('Fiebre Aftosa + Rabia (Ciclo I)')),
              DropdownMenuItem(value: 'Brucelosis B19 / RB51 (Hembras)', child: Text('Brucelosis B19 / RB51 (Hembras)')),
              DropdownMenuItem(value: 'Clostridiosis (Mancha/Gangrena 8 Vías)', child: Text('Clostridiosis (8 Vías)')),
              DropdownMenuItem(value: 'Desparasitante Ivermectina 3.15%', child: Text('Desparasitante Ivermectina 3.15%')),
            ],
            onChanged: (val) {
              if (val != null) setState(() => vacunaSeleccionada = val);
            },
          ),
          const SizedBox(height: 16),

          const TextField(
            decoration: InputDecoration(
              labelText: 'Dosis por Animal (ej. 2 ml subcutánea)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),

          const TextField(
            decoration: InputDecoration(
              labelText: 'Lote del Laboratorio / Vencimiento',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: FincaTheme.purpleSanidad,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: () async {
                final ok = await fincaState.registrarVacunacionLote(
                  potreroNombre: potreroSeleccionado,
                  medicamentoNombre: vacunaSeleccionada,
                  dosis: '2 ml subcutánea',
                  lote: 'L-2026-V1',
                );

                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        ok
                            ? '✅ Vacunación registrada para $potreroSeleccionado ($vacunaSeleccionada) y sincronizada en Web'
                            : '⚠️ Vacunación guardada localmente (se sincronizará en segundo plano).',
                      ),
                      backgroundColor: ok ? FincaTheme.purpleSanidad : FincaTheme.warningAmber,
                    ),
                  );
                }
              },
              icon: const Icon(Icons.check_circle),
              label: const Text('REGISTRAR SANIDAD EN LOTE & SINCRONIZAR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }
}
