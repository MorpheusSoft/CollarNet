import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';

class ArreoTrasladoScreen extends StatefulWidget {
  const ArreoTrasladoScreen({Key? key}) : super(key: key);

  @override
  State<ArreoTrasladoScreen> createState() => _ArreoTrasladoScreenState();
}

class _ArreoTrasladoScreenState extends State<ArreoTrasladoScreen> {
  String? _selectedOrigen;
  String? _selectedDestino;

  @override
  void initState() {
    super.initState();
    final state = context.read<FincaStateProvider>();
    final abiertos = state.potrerosRotacion.where((p) => p['estado'] == 'ABIERTO').toList();
    final descansos = state.potrerosRotacion.where((p) => p['estado'] == 'DESCANSO').toList();

    if (abiertos.isNotEmpty) {
      _selectedOrigen = abiertos.first['nombre'];
    }
    if (descansos.isNotEmpty) {
      _selectedDestino = descansos.first['nombre'];
    } else if (state.potrerosRotacion.length > 1) {
      _selectedDestino = state.potrerosRotacion[1]['nombre'];
    }
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();
    final bool isActivo = fincaState.modoArreoActivo;

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Modo Arreo (Traslado)'),
        backgroundColor: FincaTheme.bgCard,
        elevation: 0,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isActivo
                  ? FincaTheme.warningAmber.withValues(alpha: 0.2)
                  : FincaTheme.primaryGreen.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isActivo ? FincaTheme.warningAmber : FincaTheme.primaryGreen,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 4,
                  backgroundColor: isActivo ? FincaTheme.warningAmber : FincaTheme.primaryGreen,
                ),
                const SizedBox(width: 6),
                Text(
                  isActivo ? 'EN CURSO' : 'LISTO',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isActivo ? FincaTheme.warningAmber : FincaTheme.accentGreenLight,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: isActivo
            ? _buildActiveArreoView(context, fincaState)
            : _buildSetupArreoView(context, fincaState),
      ),
    );
  }

  // ==========================================
  // VISTA 1: ARREO EN CURSO (CONTROL EN VIVO)
  // ==========================================
  Widget _buildActiveArreoView(BuildContext context, FincaStateProvider state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Tarjeta Alerta de Tránsito
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: FincaTheme.warningAmber.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: FincaTheme.warningAmber, width: 2),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.warning_amber_rounded, color: FincaTheme.warningAmber, size: 28),
                  SizedBox(width: 8),
                  Text(
                    'CALLEJÓN VIRTUAL ABIERTO',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: FincaTheme.warningAmber,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Las alertas de los collares están silenciadas temporalmente para permitir el paso de las reses sin molestias ni descargas.',
                textAlign: TextAlign.center,
                style: TextStyle(color: FincaTheme.textLight, fontSize: 13),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Tarjeta de Estado Activo Permanente (Sin temporizador regresivo)
        Container(
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
          decoration: BoxDecoration(
            color: FincaTheme.bgCardElevated,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: FincaTheme.warningAmber.withValues(alpha: 0.4)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: FincaTheme.warningAmber.withValues(alpha: 0.15),
                  border: Border.all(color: FincaTheme.warningAmber, width: 2),
                ),
                child: const Center(
                  child: Icon(
                    Icons.sync_alt_rounded,
                    color: FincaTheme.warningAmber,
                    size: 34,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'TRASLADO EN PROCESO',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: FincaTheme.textLight,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'El callejón permanecerá abierto de forma continua hasta que confirmes la llegada del lote.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: FincaTheme.textMuted,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Tarjeta de Ruta del Lote
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FincaTheme.bgCard,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: FincaTheme.borderCard),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'RUTA DE TRASLADO DEL LOTE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: FincaTheme.textMuted,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  // Origen
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: FincaTheme.bgDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: FincaTheme.errorCrimson.withValues(alpha: 0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'ORIGEN (A Cerrar)',
                            style: TextStyle(fontSize: 10, color: FincaTheme.errorCrimson, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            state.potreroOrigenArreo.isEmpty ? 'Potrero 1' : state.potreroOrigenArreo,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: FincaTheme.textLight),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Icon(Icons.arrow_forward, color: FincaTheme.warningAmber, size: 24),
                  ),
                  // Destino
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: FincaTheme.bgDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: FincaTheme.primaryGreen.withValues(alpha: 0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'DESTINO (A Abrir)',
                            style: TextStyle(fontSize: 10, color: FincaTheme.accentGreenLight, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            state.potreroDestinoArreo.isEmpty ? 'Potrero 2' : state.potreroDestinoArreo,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: FincaTheme.textLight),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Botón Principal: Finalizar Traslado
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: FincaTheme.primaryGreen,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 4,
          ),
          onPressed: () => _mostrarConfirmacionFinalizar(context, state),
          icon: const Icon(Icons.check_circle, size: 24),
          label: const Text(
            'LOTE INGRESÓ: FINALIZAR TRASLADO',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
          ),
        ),
        const SizedBox(height: 12),

        // Botón Cancelar sin cambios
        TextButton(
          onPressed: () {
            state.stopModoArreo(actualizarEstadosPotreros: false);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Modo Arreo cancelado. Los potreros mantuvieron su estado previo.'),
                backgroundColor: FincaTheme.bgCardElevated,
              ),
            );
          },
          child: const Text(
            'Cancelar traslado sin cambiar estados',
            style: TextStyle(color: FincaTheme.textMuted, fontSize: 13),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // VISTA 2: CONFIGURACIÓN E INICIO DE TRASLADO
  // ==========================================
  Widget _buildSetupArreoView(BuildContext context, FincaStateProvider state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Explicación Táctica
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FincaTheme.bgCard,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: FincaTheme.borderCard),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: FincaTheme.primaryGreen.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.directions_walk, color: FincaTheme.accentGreenLight, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Apertura Rápida de Compuertas',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: FincaTheme.textLight,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Active esta opción justo antes de mover el ganado por los callejones. Las cercas intermedias se desactivan temporalmente.',
                      style: TextStyle(fontSize: 12, color: FincaTheme.textMuted, height: 1.3),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Selección de Origen y Destino
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FincaTheme.bgCard,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: FincaTheme.borderCard),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SELECCIONAR POTREROS DE RUTA',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: FincaTheme.textMuted,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 14),

              // Dropdown Origen
              const Text('Potrero de Origen (donde está el lote):', style: TextStyle(fontSize: 13, color: FincaTheme.textLight)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: FincaTheme.bgDark,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: FincaTheme.borderCard),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedOrigen,
                    dropdownColor: FincaTheme.bgCardElevated,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down, color: FincaTheme.accentGreenLight),
                    items: state.potrerosRotacion.map((p) {
                      final isAbierto = p['estado'] == 'ABIERTO';
                      return DropdownMenuItem<String>(
                        value: p['nombre'],
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(p['nombre'], style: const TextStyle(color: FincaTheme.textLight, fontSize: 14)),
                            Text(
                              isAbierto ? '🟢 Abierto (${p['animales']} reses)' : '⚪ En Descanso',
                              style: TextStyle(
                                fontSize: 11,
                                color: isAbierto ? FincaTheme.accentGreenLight : FincaTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedOrigen = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Dropdown Destino
              const Text('Potrero de Destino (hacia donde se trasladan):', style: TextStyle(fontSize: 13, color: FincaTheme.textLight)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: FincaTheme.bgDark,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: FincaTheme.borderCard),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedDestino,
                    dropdownColor: FincaTheme.bgCardElevated,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down, color: FincaTheme.accentGreenLight),
                    items: state.potrerosRotacion.map((p) {
                      final isAbierto = p['estado'] == 'ABIERTO';
                      return DropdownMenuItem<String>(
                        value: p['nombre'],
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(p['nombre'], style: const TextStyle(color: FincaTheme.textLight, fontSize: 14)),
                            Text(
                              isAbierto ? '🟢 Abierto' : '🌱 En Descanso (${p['calidadPasto']})',
                              style: TextStyle(
                                fontSize: 11,
                                color: isAbierto ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedDestino = val);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Botón Grande Iniciar
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: FincaTheme.warningAmber,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 4,
          ),
          onPressed: () {
            if (_selectedOrigen == null || _selectedDestino == null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Seleccione potrero de origen y destino')),
              );
              return;
            }
            if (_selectedOrigen == _selectedDestino) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('El potrero de destino debe ser diferente al de origen')),
              );
              return;
            }

            state.startModoArreo(
              origen: _selectedOrigen!,
              destino: _selectedDestino!,
            );

            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('🚨 Modo Arreo activado. Callejón virtual abierto.'),
                backgroundColor: FincaTheme.warningAmber,
                duration: Duration(seconds: 3),
              ),
            );
          },
          icon: const Icon(Icons.play_arrow_rounded, size: 28),
          label: const Text(
            'INICIAR TRASLADO (ABRIR CALLEJÓN)',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
          ),
        ),
      ],
    );
  }

  void _mostrarConfirmacionFinalizar(BuildContext context, FincaStateProvider state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: FincaTheme.bgCardElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(Icons.check_circle, color: FincaTheme.primaryGreen, size: 26),
            SizedBox(width: 8),
            Text('Confirmar Llegada', style: TextStyle(color: FincaTheme.textLight, fontSize: 18)),
          ],
        ),
        content: Text(
          '¿El lote de ganado ya ingresó completamente a ${state.potreroDestinoArreo}?\n\nAl confirmar:\n• Se cerrará el callejón.\n• ${state.potreroOrigenArreo} pasará a EN DESCANSO.\n• ${state.potreroDestinoArreo} pasará a PASTOREO ACTIVO.',
          style: const TextStyle(color: FincaTheme.textMuted, fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Aún en camino', style: TextStyle(color: FincaTheme.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: FincaTheme.primaryGreen),
            onPressed: () {
              Navigator.pop(ctx);
              state.stopModoArreo(actualizarEstadosPotreros: true);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('✅ Traslado finalizado. ${state.potreroDestinoArreo} quedó activo.'),
                  backgroundColor: FincaTheme.primaryGreen,
                ),
              );
            },
            child: const Text('Sí, Finalizar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
