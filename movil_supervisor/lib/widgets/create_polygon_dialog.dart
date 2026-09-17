import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
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
  Color _selectedColor = const Color(0xFF10B981);
  bool _isSaving = false;

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
    final defaultName = 'Potrero Lote ${DateTime.now().minute}';
    _nameController = TextEditingController(text: defaultName);
    _notesController = TextEditingController();
    _selectedColor = const Color(0xFF10B981);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drawing = context.watch<DrawingProvider>();
    final agro = context.read<AgroProvider>();

    final areaHa = drawing.currentAreaHa;
    final areaM2 = drawing.currentAreaM2;
    final perimeterM = GISService.calculateGeodesicPerimeterM(drawing.draftVertices, isClosed: true);

    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(
          color: Color(0xFF10B981),
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
                      color: const Color(0xFF10B981).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.grid_view_rounded,
                      color: Color(0xFF34D399),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Registrar Nuevo Potrero',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          'Subdivisión interna del Hato',
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
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  hintText: 'Ej. Potrero 4 (Bajo)',
                  hintStyle: TextStyle(color: Colors.grey[600]),
                  prefixIcon: const Icon(Icons.edit_outlined, color: Color(0xFF10B981), size: 18),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Paleta de Color
              const Text(
                'COLOR EN EL MAPA',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: _colorPalette.map((color) {
                  final isSelected = _selectedColor.value == color.value;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedColor = color),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? Colors.white : Colors.transparent,
                          width: 2.5,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: color.withOpacity(0.5),
                                  blurRadius: 8,
                                  spreadRadius: 2,
                                )
                              ]
                            : null,
                      ),
                      child: isSelected
                          ? const Icon(Icons.check, color: Colors.white, size: 18)
                          : null,
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 16),

              // Notas
              const Text(
                'NOTAS / TIPO DE FORRAJE',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _notesController,
                maxLines: 2,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  hintText: 'Ej. Pasto Guinea / Mombaça, capacidad 30 cabezas...',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 13),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Botones Cancelar / Guardar
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
                    child: const Text('Descartar', style: TextStyle(color: Colors.grey)),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 4,
                    ),
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                          )
                        : const Icon(Icons.check_circle_outline_rounded, size: 18, color: Colors.black),
                    label: Text(
                      _isSaving ? 'Guardando...' : 'Guardar Potrero',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: _isSaving ? Colors.white : Colors.black,
                      ),
                    ),
                    onPressed: _isSaving ? null : () async {
                      final name = _nameController.text.trim().isNotEmpty
                          ? _nameController.text.trim()
                          : 'Potrero Sin Nombre';

                      setState(() => _isSaving = true);

                      try {
                        final parentId = drawing.parentHatoId ?? (agro.hatos.isNotEmpty ? agro.hatos.first.id : '1');
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

                        drawing.cancelDrawing();
                        if (context.mounted) {
                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('✅ Potrero "$name" guardado con éxito'),
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
