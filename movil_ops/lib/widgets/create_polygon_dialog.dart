import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';
import '../services/gis_service.dart';

class CreatePolygonDialog extends StatefulWidget {
  const CreatePolygonDialog({Key? key}) : super(key: key);

  @override
  State<CreatePolygonDialog> createState() => _CreatePolygonDialogState();
}

class _CreatePolygonDialogState extends State<CreatePolygonDialog> {
  late TextEditingController _nameController;
  late TextEditingController _notesController;
  late TextEditingController _warningController;
  Color _selectedColor = const Color(0xFF10B981);
  bool _isSaving = false;
  bool _permiteCrearPotreros = true;

  final List<Color> _colorPalette = [
    const Color(0xFF10B981), // Esmeralda
    const Color(0xFF3B82F6), // Azul
    const Color(0xFF06B6D4), // Cyan
    const Color(0xFFF59E0B), // Ámbar
    const Color(0xFF8B5CF6), // Violeta
    const Color(0xFFEC4899), // Rosa
  ];

  @override
  void initState() {
    super.initState();
    final drawing = context.read<DrawingProvider>();
    final isHato = drawing.drawingType == DrawingType.hato;
    final defaultName = isHato
        ? 'Hato ${DateTime.now().day}/${DateTime.now().month} #${drawing.vertexCount}'
        : 'Potrero Lote ${DateTime.now().minute}';
    _nameController = TextEditingController(text: defaultName);
    _notesController = TextEditingController();
    _warningController = TextEditingController(text: '25');
    _selectedColor = isHato ? const Color(0xFF3B82F6) : const Color(0xFF10B981);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _notesController.dispose();
    _warningController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drawing = context.watch<DrawingProvider>();
    final agro = context.read<AgroProvider>();
    final isHato = drawing.drawingType == DrawingType.hato;

    final areaHa = drawing.currentAreaHa;
    final areaM2 = drawing.currentAreaM2;
    final perimeterM = GISService.calculateGeodesicPerimeterM(drawing.draftVertices, isClosed: true);

    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(
          color: isHato ? const Color(0xFF3B82F6) : const Color(0xFF10B981),
          width: 1.5,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 450),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Título
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (isHato ? const Color(0xFF3B82F6) : const Color(0xFF10B981)).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isHato ? Icons.layers_outlined : Icons.grid_view_rounded,
                      color: isHato ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isHato ? 'Registrar Hato Agrícola' : 'Registrar Potrero',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          'Cierre topológico completado con éxito',
                          style: TextStyle(color: Colors.grey[400], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Resumen Geodésico
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _InfoBadge(
                      label: 'ÁREA FINAL',
                      value: '${areaHa.toStringAsFixed(2)} ha',
                      sub: '${areaM2.toStringAsFixed(0)} m²',
                      color: const Color(0xFF34D399),
                    ),
                    Container(height: 35, width: 1, color: Colors.grey[800]),
                    _InfoBadge(
                      label: 'PERÍMETRO',
                      value: '${perimeterM.toStringAsFixed(1)} m',
                      sub: '${drawing.vertexCount} vértices',
                      color: const Color(0xFF60A5FA),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Campo Nombre
              const Text(
                'NOMBRE O IDENTIFICADOR',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  hintText: 'Ej. Hato La Esperanza',
                  hintStyle: TextStyle(color: Colors.grey[600]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.label_outline_rounded, color: Colors.grey, size: 18),
                ),
              ),

              const SizedBox(height: 16),

              // Selector de Color
              const Text(
                'COLOR EN MAPA',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: _colorPalette.map((col) {
                  final isSel = _selectedColor == col;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedColor = col),
                    child: Container(
                      margin: const EdgeInsets.only(right: 10),
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: col,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSel ? Colors.white : Colors.transparent,
                          width: 2.5,
                        ),
                        boxShadow: isSel
                            ? [
                                BoxShadow(
                                  color: col.withOpacity(0.6),
                                  blurRadius: 8,
                                  spreadRadius: 1,
                                )
                              ]
                            : [],
                      ),
                      child: isSel
                          ? const Icon(Icons.check_rounded, size: 16, color: Colors.black)
                          : null,
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 16),

              // Notas / Observaciones
              const Text(
                'NOTAS / TIPO DE PASTO / USO',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _notesController,
                maxLines: 2,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  hintText: 'Ej. Pastura Guinea Mombasa, cerca eléctrica norte...',
                  hintStyle: TextStyle(color: Colors.grey[600]),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),

              if (isHato) ...[
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'DISTANCIA DE ALARMA INTERIOR',
                      style: TextStyle(
                        color: Color(0xFFF59E0B),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Alarma Animal',
                        style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Distancia interior antes de la cerca donde el collar sonará para evitar que el animal se acerque al límite.',
                  style: TextStyle(color: Colors.grey, fontSize: 11),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _warningController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    hintText: 'Ej. 25',
                    suffixText: 'metros',
                    suffixStyle: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w700, fontSize: 12),
                    prefixIcon: const Icon(Icons.notification_important_outlined, color: Color(0xFFF59E0B), size: 18),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        'Permitir al productor autogestionar potreros',
                        style: TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                    Switch(
                      value: _permiteCrearPotreros,
                      activeColor: const Color(0xFF10B981),
                      onChanged: (v) => setState(() => _permiteCrearPotreros = v),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 24),

              // Botones de Acción
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Volver al Trazado', style: TextStyle(color: Colors.grey)),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isSaving ? Colors.grey[700] : const Color(0xFF10B981),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.save_rounded, size: 18, color: Colors.black),
                    label: Text(
                      _isSaving ? 'Guardando en Servidor...' : 'Guardar Terreno',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: _isSaving ? Colors.white : Colors.black,
                      ),
                    ),
                    onPressed: _isSaving ? null : () async {
                      final name = _nameController.text.trim().isNotEmpty
                          ? _nameController.text.trim()
                          : (isHato ? 'Hato Sin Nombre' : 'Potrero Sin Nombre');

                      setState(() => _isSaving = true);

                      try {
                        if (isHato) {
                          final parsedWarning = double.tryParse(_warningController.text.trim()) ?? 25.0;
                          final newHato = Hato(
                            id: 'hato_${DateTime.now().millisecondsSinceEpoch}',
                            nombre: name,
                            areaHa: areaHa,
                            perimeterM: perimeterM,
                            vertices: List<LatLng>.from(drawing.draftVertices),
                            color: _selectedColor,
                            notas: _notesController.text.trim().isNotEmpty
                                ? _notesController.text.trim()
                                : null,
                            warningWidthM: parsedWarning,
                            permiteCrearPotreros: _permiteCrearPotreros,
                          );
                          await agro.addHato(newHato);
                        } else {
                          final parentId = drawing.parentHatoId;
                          if (parentId != null) {
                            final newPotrero = Potrero(
                              id: 'pot_${DateTime.now().millisecondsSinceEpoch}',
                              nombre: name,
                              hatoId: parentId,
                              areaHa: areaHa,
                              perimeterM: perimeterM,
                              vertices: List<LatLng>.from(drawing.draftVertices),
                              color: _selectedColor,
                              notas: _notesController.text.trim().isNotEmpty
                                  ? _notesController.text.trim()
                                  : null,
                            );
                            await agro.addPotreroToHato(parentId, newPotrero);
                          }
                        }

                        drawing.cancelDrawing();
                        if (context.mounted) {
                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isHato ? '✅ Hato "$name" guardado con éxito' : '✅ Potrero "$name" guardado con éxito'),
                              backgroundColor: const Color(0xFF10B981),
                              duration: const Duration(seconds: 3),
                            ),
                          );
                        }
                      } catch (err) {
                        if (context.mounted) {
                          setState(() => _isSaving = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('⚠️ Error al guardar: $err'),
                              backgroundColor: const Color(0xFFEF4444),
                              duration: const Duration(seconds: 4),
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final Color color;

  const _InfoBadge({
    required this.label,
    required this.value,
    required this.sub,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[400],
            fontSize: 10,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          sub,
          style: TextStyle(
            color: Colors.grey[500],
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
