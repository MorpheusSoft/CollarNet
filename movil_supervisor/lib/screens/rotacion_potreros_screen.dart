import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';
import 'arreo_traslado_screen.dart';
import 'map_screen.dart';

class RotacionPotrerosScreen extends StatelessWidget {
  const RotacionPotrerosScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Rotación & Potreros'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: FincaTheme.accentGreenLight),
            onPressed: () => fincaState.syncData(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner de Estado del Hato
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: FincaTheme.bgCardElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: FincaTheme.primaryGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.sync_alt, color: FincaTheme.primaryGreen, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          fincaState.hatoNombre,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: FincaTheme.textLight,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${fincaState.potrerosActivos} Abiertos  •  ${fincaState.potrerosDescanso} en Descanso',
                          style: const TextStyle(
                            fontSize: 13,
                            color: FincaTheme.accentGreenLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Card de Modo Arreo / Traslado Activo
            if (fincaState.modoArreoActivo) ...[
              InkWell(
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
                    color: FincaTheme.warningAmber.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: FincaTheme.warningAmber, width: 2),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.alarm_on, color: FincaTheme.warningAmber, size: 26),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'MODO ARREO EN CURSO',
                              style: TextStyle(
                                color: FincaTheme.warningAmber,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: FincaTheme.warningAmber,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'ACTIVO',
                              style: TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Callejón abierto desde ${fincaState.potreroOrigenArreo} hacia ${fincaState.potreroDestinoArreo}. Toca para gestionar.',
                        style: const TextStyle(color: FincaTheme.textLight, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Botón para Iniciar Nuevo Arreo si no está activo
            if (!fincaState.modoArreoActivo) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: FincaTheme.warningAmber,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ArreoTrasladoScreen()),
                    );
                  },
                  icon: const Icon(Icons.directions_walk, color: Colors.black),
                  label: const Text(
                    'INICIAR TRASLADO DE LOTE (ARREO)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Botón Trazar / Crear Nuevo Potrero (Controlado por Permiso Técnico)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: fincaState.permiteCrearPotreros
                        ? FincaTheme.primaryGreen
                        : FincaTheme.textMuted.withValues(alpha: 0.5),
                    width: 1.5,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  if (!fincaState.permiteCrearPotreros) {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: FincaTheme.bgCardElevated,
                        title: const Row(
                          children: [
                            Icon(Icons.lock, color: FincaTheme.warningAmber),
                            SizedBox(width: 8),
                            Text('Función Restringida', style: TextStyle(color: FincaTheme.textLight, fontSize: 16)),
                          ],
                        ),
                        content: const Text(
                          'La creación y trazado de nuevos potreros no está habilitada para esta finca o requiere activación en la App del Técnico.',
                          style: TextStyle(color: FincaTheme.textMuted),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Entendido', style: TextStyle(color: FincaTheme.accentGreenLight)),
                          ),
                        ],
                      ),
                    );
                    return;
                  }
                  // Abrir Módulo 1 (Mapa) para trazar el potrero
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MapScreen()),
                  );
                },
                icon: Icon(
                  fincaState.permiteCrearPotreros ? Icons.add_location_alt : Icons.lock_outline,
                  color: fincaState.permiteCrearPotreros ? FincaTheme.accentGreenLight : FincaTheme.textMuted,
                  size: 20,
                ),
                label: Text(
                  fincaState.permiteCrearPotreros
                      ? 'TRAZAR NUEVO POTRERO EN EL MAPA'
                      : 'TRAZAR POTRERO (SIN PERMISO TÉCNICO)',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: fincaState.permiteCrearPotreros ? FincaTheme.textLight : FincaTheme.textMuted,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'CONTROL DE COMPUERTAS Y ROTACIÓN',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: FincaTheme.textMuted,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),

            // Lista de Potreros
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: fincaState.potrerosRotacion.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final p = fincaState.potrerosRotacion[index];
                final isAbierto = p['estado'] == 'ABIERTO';

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isAbierto ? FincaTheme.primaryGreen : FincaTheme.borderCard,
                      width: isAbierto ? 1.5 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              p['nombre'],
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: FincaTheme.textLight,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isAbierto
                                  ? FincaTheme.primaryGreen.withOpacity(0.2)
                                  : Colors.blueGrey.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isAbierto ? FincaTheme.primaryGreen : Colors.blueGrey,
                              ),
                            ),
                            child: Text(
                              isAbierto ? 'PASTOREO ACTIVO' : 'EN DESCANSO',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isAbierto ? FincaTheme.accentGreenLight : Colors.blueGrey.shade200,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _buildMiniBadge(Icons.pets, '${p['animales']} reses', FincaTheme.textLight),
                          const SizedBox(width: 12),
                          _buildMiniBadge(
                            Icons.calendar_today,
                            isAbierto ? '${p['diasOcupacion']} días pastoreo' : '${p['diasDescanso']} días descanso',
                            FincaTheme.textMuted,
                          ),
                          const SizedBox(width: 12),
                          _buildMiniBadge(Icons.eco, p['calidadPasto'], FincaTheme.accentGreenLight),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Divider(color: FincaTheme.borderCard, height: 1),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isAbierto ? 'Cerrar para permitir recuperación' : 'Abrir compuerta para pastoreo',
                            style: const TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                          ),
                          Switch(
                            value: isAbierto,
                            activeColor: FincaTheme.primaryGreen,
                            onChanged: (_) => fincaState.toggleEstadoPotrero(p['id']),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildMiniBadge(IconData icon, String text, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: color)),
      ],
    );
  }

  void _mostrarDialogoIniciarArreo(BuildContext context, FincaStateProvider state) {
    String origen = state.potrerosRotacion.first['nombre'];
    String destino = state.potrerosRotacion.last['nombre'];

    showModalBottomSheet(
      context: context,
      backgroundColor: FincaTheme.bgCardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setStateDialog) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.directions_walk, color: FincaTheme.warningAmber, size: 28),
                      SizedBox(width: 10),
                      Text(
                        'Iniciar Traslado de Lote (Arreo)',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: FincaTheme.textLight,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Se desactivarán temporalmente las alertas de choque y buzzer en el callejón de paso.',
                    style: TextStyle(fontSize: 13, color: FincaTheme.textMuted),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: origen,
                    dropdownColor: FincaTheme.bgCard,
                    decoration: const InputDecoration(
                      labelText: 'Potrero Origen (De donde salen)',
                      border: OutlineInputBorder(),
                    ),
                    items: state.potrerosRotacion.map<DropdownMenuItem<String>>((p) {
                      return DropdownMenuItem<String>(
                        value: p['nombre'] as String,
                        child: Text(p['nombre'] as String),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setStateDialog(() => origen = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: destino,
                    dropdownColor: FincaTheme.bgCard,
                    decoration: const InputDecoration(
                      labelText: 'Potrero Destino (A donde entran)',
                      border: OutlineInputBorder(),
                    ),
                    items: state.potrerosRotacion.map<DropdownMenuItem<String>>((p) {
                      return DropdownMenuItem<String>(
                        value: p['nombre'] as String,
                        child: Text(p['nombre'] as String),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setStateDialog(() => destino = val);
                    },
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FincaTheme.warningAmber,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        state.startModoArreo(origen: origen, destino: destino);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Modo Arreo activado: Callejón abierto hasta finalizar.'),
                            backgroundColor: FincaTheme.warningAmber,
                          ),
                        );
                      },
                      child: const Text('ACTIVAR MODO ARREO AHORA', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
