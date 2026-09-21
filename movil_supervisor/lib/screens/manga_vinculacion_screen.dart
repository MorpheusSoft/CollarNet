import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';

class MangaVinculacionScreen extends StatefulWidget {
  const MangaVinculacionScreen({Key? key}) : super(key: key);

  @override
  State<MangaVinculacionScreen> createState() => _MangaVinculacionScreenState();
}

class _MangaVinculacionScreenState extends State<MangaVinculacionScreen> {
  int _pasoActual = 1;

  String? _areteSeleccionado;
  String? _collarQR;
  String? _potreroDestino;

  final TextEditingController _areteManualController = TextEditingController();
  final TextEditingController _collarManualController = TextEditingController();

  @override
  void dispose() {
    _areteManualController.dispose();
    _collarManualController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();

    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      appBar: AppBar(
        title: const Text('Manga & Vinculación (3T)'),
      ),
      body: Column(
        children: [
          // Barra de Pasos Visual
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            color: FincaTheme.bgCard,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStepIndicator(1, '1. Arete Res', _pasoActual >= 1, _areteSeleccionado != null),
                const Icon(Icons.chevron_right, color: FincaTheme.textMuted),
                _buildStepIndicator(2, '2. Collar / QR', _pasoActual >= 2, _collarQR != null),
                const Icon(Icons.chevron_right, color: FincaTheme.textMuted),
                _buildStepIndicator(3, '3. Potrero', _pasoActual >= 3, _potreroDestino != null),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_pasoActual == 1) _buildPaso1SeleccionarArete(fincaState),
                  if (_pasoActual == 2) _buildPaso2EscanearCollar(fincaState),
                  if (_pasoActual == 3) _buildPaso3AsignarPotrero(fincaState),
                ],
              ),
            ),
          ),

          // Barra Inferior de Acción
          _buildBottomActionButtons(fincaState),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(int paso, String titulo, bool isActive, bool isDone) {
    return Column(
      children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: isDone
              ? FincaTheme.primaryGreen
              : (isActive ? FincaTheme.accentGreenLight : FincaTheme.borderCard),
          child: isDone
              ? const Icon(Icons.check, size: 18, color: Colors.white)
              : Text(
                  '$paso',
                  style: TextStyle(
                    color: isActive ? Colors.black : FincaTheme.textMuted,
                    fontWeight: FontWeight.bold,
                  ),
                ),
        ),
        const SizedBox(height: 4),
        Text(
          titulo,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive ? FincaTheme.textLight : FincaTheme.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildPaso1SeleccionarArete(FincaStateProvider fincaState) {
    // Filtrar animales registrados sin collar asignado
    final animalesSinCollar = fincaState.animales.where((a) {
      final col = a['collarId'] ?? a['collar_id'];
      return col == null || col == 'SIN_COLLAR' || col.toString().isEmpty;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'TOQUE 1: IDENTIFICACIÓN DEL ANIMAL EN MANGA',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: FincaTheme.accentGreenLight,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 14),

        // Campo de ingreso manual directo
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FincaTheme.bgCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: FincaTheme.primaryGreen.withOpacity(0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Escribir Arete Visual / Código:',
                style: TextStyle(color: FincaTheme.textLight, fontSize: 13, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _areteManualController,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Ej. V-001, TORO-05, A-102...',
                        hintStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 13),
                        filled: true,
                        fillColor: FincaTheme.bgDark,
                        prefixIcon: const Icon(Icons.tag, color: FincaTheme.accentGreenLight),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      onSubmitted: (val) {
                        if (val.trim().isNotEmpty) {
                          setState(() {
                            _areteSeleccionado = val.trim().toUpperCase();
                            _pasoActual = 2;
                          });
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: FincaTheme.primaryGreen,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {
                      if (_areteManualController.text.trim().isNotEmpty) {
                        setState(() {
                          _areteSeleccionado = _areteManualController.text.trim().toUpperCase();
                          _pasoActual = 2;
                        });
                      }
                    },
                    child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            ],
          ),
        ),

        if (animalesSinCollar.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Text(
            'O SELECCIONE DE ANIMALES REGISTRADOS SIN COLLAR:',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: FincaTheme.textMuted,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 10),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: animalesSinCollar.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final a = animalesSinCollar[index];
              final arete = a['areteVisual'] ?? a['arete_visual'] ?? a['arete'] ?? 'A-${a['id']}';
              final isSelected = _areteSeleccionado == arete;

              return InkWell(
                onTap: () {
                  setState(() {
                    _areteSeleccionado = arete;
                    _areteManualController.text = arete;
                    _pasoActual = 2;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected ? FincaTheme.primaryGreen.withOpacity(0.2) : FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? FincaTheme.primaryGreen : FincaTheme.borderCard,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: FincaTheme.primaryGreen.withOpacity(0.15),
                        child: const Icon(Icons.pets, color: FincaTheme.primaryGreen, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Arete: $arete',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: FincaTheme.textLight,
                              ),
                            ),
                            Text(
                              '${a['categoria'] ?? 'Bovino'} • ${a['raza'] ?? 'Mestizo'}',
                              style: const TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.touch_app, color: FincaTheme.accentGreenLight, size: 20),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ],
    );
  }

  Widget _buildPaso2EscanearCollar(FincaStateProvider fincaState) {
    final collaresStock = fincaState.collaresDisponibles;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'TOQUE 2: ESCANEAR O DIGITAR COLLAR',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: FincaTheme.accentGreenLight,
              ),
            ),
            TextButton.icon(
              onPressed: () => setState(() => _pasoActual = 1),
              icon: const Icon(Icons.edit, size: 14, color: FincaTheme.textMuted),
              label: Text('Arete: $_areteSeleccionado', style: const TextStyle(color: FincaTheme.textMuted)),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Campo para escribir ID del collar manualmente
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FincaTheme.bgCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: FincaTheme.infoBlue.withOpacity(0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Código o ID del Collar:',
                style: TextStyle(color: FincaTheme.textLight, fontSize: 13, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _collarManualController,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Ej. COL-0001, COW-0042...',
                        hintStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 13),
                        filled: true,
                        fillColor: FincaTheme.bgDark,
                        prefixIcon: const Icon(Icons.sensors, color: FincaTheme.infoBlue),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      onSubmitted: (val) {
                        if (val.trim().isNotEmpty) {
                          setState(() {
                            _collarQR = val.trim().toUpperCase();
                            _pasoActual = 3;
                          });
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: FincaTheme.infoBlue,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {
                      if (_collarManualController.text.trim().isNotEmpty) {
                        setState(() {
                          _collarQR = _collarManualController.text.trim().toUpperCase();
                          _pasoActual = 3;
                        });
                      }
                    },
                    child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Botón Cámara de Escaneo
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: FincaTheme.bgCardElevated,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: FincaTheme.infoBlue.withOpacity(0.3)),
          ),
          child: Column(
            children: [
              const Icon(Icons.qr_code_scanner, size: 48, color: FincaTheme.infoBlue),
              const SizedBox(height: 10),
              const Text(
                'Escanear Código QR con la Cámara',
                style: TextStyle(color: FincaTheme.textLight, fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Apunte al código QR grabado en la carcasa solar',
                style: TextStyle(color: FincaTheme.textMuted, fontSize: 12),
              ),
              if (collaresStock.isNotEmpty) ...[
                const SizedBox(height: 14),
                const Text(
                  'Collares disponibles en stock:',
                  style: TextStyle(color: FincaTheme.textLight, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: collaresStock.map((col) {
                    final isColSelected = _collarQR == col;
                    return ChoiceChip(
                      label: Text(col),
                      selected: isColSelected,
                      selectedColor: FincaTheme.infoBlue,
                      backgroundColor: FincaTheme.bgCard,
                      labelStyle: TextStyle(
                        color: isColSelected ? Colors.black : FincaTheme.textLight,
                        fontWeight: FontWeight.bold,
                      ),
                      onSelected: (val) {
                        setState(() {
                          _collarQR = val ? col : null;
                          _collarManualController.text = val ? col : '';
                          if (val) _pasoActual = 3;
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPaso3AsignarPotrero(FincaStateProvider fincaState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'TOQUE 3: ASIGNAR AL POTRERO DE DESTINO',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: FincaTheme.accentGreenLight,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: FincaTheme.warningAmber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: FincaTheme.warningAmber.withOpacity(0.5)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.agriculture, size: 14, color: FincaTheme.warningAmber),
                  const SizedBox(width: 4),
                  Text(
                    fincaState.hatoNombre,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: FincaTheme.warningAmber,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (fincaState.potrerosRotacion.isEmpty)
          InkWell(
            onTap: () {
              setState(() => _potreroDestino = 'Potrero Principal (${fincaState.hatoNombre})');
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _potreroDestino != null ? FincaTheme.primaryGreen.withOpacity(0.2) : FincaTheme.bgCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _potreroDestino != null ? FincaTheme.primaryGreen : FincaTheme.borderCard,
                  width: _potreroDestino != null ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.fence, color: FincaTheme.accentGreenLight, size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Potrero Principal (${fincaState.hatoNombre})',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: FincaTheme.textLight,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Potrero inicial del hato para inicio de pastoreo',
                          style: TextStyle(fontSize: 11, color: FincaTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  if (_potreroDestino != null)
                    const Icon(Icons.check, color: FincaTheme.primaryGreen),
                ],
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: fincaState.potrerosRotacion.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final p = fincaState.potrerosRotacion[index];
              final isSelected = _potreroDestino == p['nombre'];
              final isAbierto = p['estado'] == 'ABIERTO';

              return InkWell(
                onTap: () {
                  setState(() => _potreroDestino = p['nombre']);
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected ? FincaTheme.primaryGreen.withOpacity(0.2) : FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? FincaTheme.primaryGreen : FincaTheme.borderCard,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isAbierto ? Icons.check_circle : Icons.pause_circle_outline,
                        color: isAbierto ? FincaTheme.primaryGreen : Colors.blueGrey,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p['nombre'],
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              color: FincaTheme.textLight,
                            ),
                          ),
                          Text(
                            '${p['estado']} • ${p['animales']} reses actuales',
                            style: const TextStyle(fontSize: 12, color: FincaTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check, color: FincaTheme.primaryGreen)
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildBottomActionButtons(FincaStateProvider fincaState) {
    final bool canConfirm = _areteSeleccionado != null && _collarQR != null && (_potreroDestino != null || fincaState.potrerosRotacion.isEmpty);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: FincaTheme.bgCardElevated,
        border: Border(top: BorderSide(color: FincaTheme.borderCard)),
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: canConfirm ? FincaTheme.primaryGreen : Colors.grey.shade800,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            onPressed: canConfirm
                ? () async {
                    final defaultPotName = 'Potrero Principal (${fincaState.hatoNombre})';
                    final String effectivePotNombre = _potreroDestino ?? (fincaState.potrerosRotacion.isNotEmpty ? fincaState.potrerosRotacion.first['nombre'] : defaultPotName);
                    final potreroObj = fincaState.potrerosRotacion.firstWhere(
                      (p) => p['nombre'] == effectivePotNombre,
                      orElse: () => {'id': 'pot-${fincaState.hatoId}-1', 'nombre': effectivePotNombre},
                    );
                    
                    final ok = await fincaState.vincularCollarAnimal(
                      areteVisual: _areteSeleccionado!,
                      collarId: _collarQR!,
                      potreroId: potreroObj['id']?.toString(),
                      potreroNombre: effectivePotNombre,
                      hatoId: fincaState.hatoId,
                      hatoNombre: fincaState.hatoNombre,
                    );

                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            ok
                                ? '✅ Vinculación Exitosa: $_areteSeleccionado vinculado a $_collarQR y sincronizado en Web'
                                : '⚠️ Vinculado localmente. Se sincronizará al detectar conexión.',
                          ),
                          backgroundColor: ok ? FincaTheme.primaryGreen : FincaTheme.warningAmber,
                        ),
                      );
                      Navigator.pop(context);
                    }
                  }
                : null,
            icon: const Icon(Icons.link),
            label: Text(
              canConfirm ? 'CONFIRMAR VINCULACIÓN (3 TOQUES)' : 'COMPLETE LOS 3 PASOS',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ),
        ),
      ),
    );
  }
}
