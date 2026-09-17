import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';

class PesajeScreen extends StatefulWidget {
  const PesajeScreen({Key? key}) : super(key: key);

  @override
  State<PesajeScreen> createState() => _PesajeScreenState();
}

class _PesajeScreenState extends State<PesajeScreen> {
  String _pesoStr = '425.0';
  String _areteActual = 'V-042';
  double _pesoAnterior = 398.0;
  int _diasTranscurridos = 35;

  double get _pesoActual => double.tryParse(_pesoStr) ?? 0.0;
  double get _gdpKgDia {
    if (_diasTranscurridos <= 0) return 0.0;
    return (_pesoActual - _pesoAnterior) / _diasTranscurridos;
  }

  void _agregarDigito(String d) {
    setState(() {
      if (_pesoStr == '0' || _pesoStr == '0.0') {
        _pesoStr = d;
      } else {
        _pesoStr += d;
      }
    });
  }

  void _borrarDigito() {
    setState(() {
      if (_pesoStr.isNotEmpty) {
        _pesoStr = _pesoStr.substring(0, _pesoStr.length - 1);
        if (_pesoStr.isEmpty) _pesoStr = '0';
      }
    });
  }

  void _sumarKilos(double kg) {
    setState(() {
      final actual = double.tryParse(_pesoStr) ?? 0.0;
      _pesoStr = (actual + kg).toStringAsFixed(1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();
    final gdp = _gdpKgDia;
    final isGdpPositiva = gdp >= 0;

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Pesaje & Ganancia de Peso'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Selector de Arete Actual
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ANIMAL EN BÁSCULA', style: TextStyle(fontSize: 11, color: FincaTheme.textMuted)),
                      const SizedBox(height: 2),
                      Text(
                        'Arete: $_areteActual',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: FincaTheme.textLight),
                      ),
                    ],
                  ),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: FincaTheme.accentGreenLight,
                      side: const BorderSide(color: FincaTheme.accentGreenLight),
                    ),
                    onPressed: () => _mostrarDialogoSeleccionarAnimal(context, fincaState),
                    icon: const Icon(Icons.swap_horiz, size: 18),
                    label: const Text('Cambiar'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Display Gigante de Kilos
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              decoration: BoxDecoration(
                color: FincaTheme.bgCardElevated,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: FincaTheme.primaryGreen, width: 2),
              ),
              child: Column(
                children: [
                  const Text('PESO REGISTRADO EN BÁSCULA', style: TextStyle(fontSize: 12, color: FincaTheme.textMuted)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        _pesoStr,
                        style: const TextStyle(
                          fontSize: 54,
                          fontWeight: FontWeight.bold,
                          color: FincaTheme.accentGreenLight,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'KG',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: FincaTheme.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Semáforo GDP
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isGdpPositiva
                          ? FincaTheme.primaryGreen.withOpacity(0.2)
                          : FincaTheme.errorCrimson.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isGdpPositiva ? FincaTheme.primaryGreen : FincaTheme.errorCrimson,
                      ),
                    ),
                    child: Text(
                      'GDP: ${isGdpPositiva ? '+' : ''}${(gdp * 1000).toStringAsFixed(0)} g/día  (Pesaje anterior: ${_pesoAnterior.toStringAsFixed(1)} kg)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: isGdpPositiva ? FincaTheme.accentGreenLight : FincaTheme.errorCrimson,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Botones de Incremento Rápido
            Row(
              children: [
                _buildQuickSumButton('+1 kg', 1.0),
                const SizedBox(width: 8),
                _buildQuickSumButton('+5 kg', 5.0),
                const SizedBox(width: 8),
                _buildQuickSumButton('+10 kg', 10.0),
                const SizedBox(width: 8),
                _buildQuickSumButton('+50 kg', 50.0),
              ],
            ),
            const SizedBox(height: 16),

            // Teclado Numérico Gigante
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: FincaTheme.borderCard),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      _buildKey('1'),
                      _buildKey('2'),
                      _buildKey('3'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildKey('4'),
                      _buildKey('5'),
                      _buildKey('6'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildKey('7'),
                      _buildKey('8'),
                      _buildKey('9'),
                    ],
                  ),
                  Row(
                    children: [
                      _buildKey('.'),
                      _buildKey('0'),
                      Expanded(
                        child: Container(
                          margin: const EdgeInsets.all(4),
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: FincaTheme.bgDark,
                              foregroundColor: FincaTheme.errorCrimson,
                              padding: EdgeInsets.zero,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: _borrarDigito,
                            child: const Icon(Icons.backspace_outlined, size: 24),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Botón Guardar Pesaje
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: FincaTheme.primaryGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: () async {
                  final pesoVal = double.tryParse(_pesoStr) ?? 0.0;
                  if (pesoVal <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Ingrese un peso válido')),
                    );
                    return;
                  }

                  final ok = await fincaState.registrarPesaje(
                    areteVisual: _areteActual,
                    peso: pesoVal,
                  );

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          ok
                              ? '✅ Pesaje guardado: $_areteActual con ${pesoVal.toStringAsFixed(1)} kg sincronizado con la Web'
                              : '⚠️ Pesaje guardado localmente (se sincronizará con la Web).',
                        ),
                        backgroundColor: ok ? FincaTheme.primaryGreen : FincaTheme.warningAmber,
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.save),
                label: const Text('GUARDAR PESAJE & SINCRONIZAR', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _mostrarDialogoSeleccionarAnimal(BuildContext context, FincaStateProvider state) {
    showModalBottomSheet(
      context: context,
      backgroundColor: FincaTheme.bgCardElevated,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Seleccionar Res en Báscula',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: FincaTheme.textLight),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.separated(
                  itemCount: state.animales.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, idx) {
                    final a = state.animales[idx];
                    return ListTile(
                      tileColor: FincaTheme.bgDark,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      leading: const CircleAvatar(
                        backgroundColor: FincaTheme.bgCard,
                        child: Icon(Icons.pets, color: FincaTheme.accentGreenLight, size: 20),
                      ),
                      title: Text('Arete ${a['areteVisual']}', style: const TextStyle(color: FincaTheme.textLight, fontWeight: FontWeight.bold)),
                      subtitle: Text('${a['raza']} • Último peso: ${a['ultimoPeso']} kg', style: const TextStyle(color: FincaTheme.textMuted, fontSize: 12)),
                      onTap: () {
                        setState(() {
                          _areteActual = a['areteVisual'];
                          _pesoAnterior = (a['ultimoPeso'] as num).toDouble();
                        });
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildQuickSumButton(String label, double val) {
    return Expanded(
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: FincaTheme.accentGreenLight,
          side: const BorderSide(color: FincaTheme.borderCard),
          backgroundColor: FincaTheme.bgCard,
          padding: const EdgeInsets.symmetric(vertical: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onPressed: () => _sumarKilos(val),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      ),
    );
  }

  Widget _buildKey(String val) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.all(4),
        height: 52,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: FincaTheme.bgCardElevated,
            foregroundColor: FincaTheme.textLight,
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () => _agregarDigito(val),
          child: Text(val, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
}
