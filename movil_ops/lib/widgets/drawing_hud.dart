import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';
import 'create_polygon_dialog.dart';

class DrawingHUD extends StatelessWidget {
  const DrawingHUD({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final drawingProvider = context.watch<DrawingProvider>();
    final agroProvider = context.watch<AgroProvider>();

    if (!drawingProvider.isDrawing || drawingProvider.isEraserMode) {
      return const SizedBox.shrink();
    }

    final isHato = drawingProvider.drawingType == DrawingType.hato;
    final title = isHato ? 'Trazando Nuevo Hato' : 'Trazando Nuevo Potrero';
    final count = drawingProvider.vertexCount;
    final areaHa = drawingProvider.currentAreaHa;
    final areaM2 = drawingProvider.currentAreaM2;
    final perim = drawingProvider.currentPerimeterM;

    return Positioned(
      bottom: 24,
      left: 16,
      right: 16,
      child: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A).withOpacity(0.94),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isHato ? const Color(0xFF3B82F6) : const Color(0xFF10B981),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Encabezado
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: isHato
                          ? const Color(0xFF3B82F6).withOpacity(0.2)
                          : const Color(0xFF10B981).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isHato ? Icons.layers_outlined : Icons.grid_view_rounded,
                      color: isHato ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'Toca el mapa o usa el botón GPS para marcar vértices',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  // Botón Cancelar
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.grey, size: 20),
                    onPressed: () => drawingProvider.cancelDrawing(),
                    tooltip: 'Cancelar trazado',
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Métricas en Vivo (Área, Perímetro, Vértices)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _MetricItem(
                      label: 'ÁREA',
                      value: '${areaHa.toStringAsFixed(2)} ha',
                      subvalue: '${areaM2.toStringAsFixed(0)} m²',
                      icon: Icons.aspect_ratio_rounded,
                      color: const Color(0xFF34D399),
                    ),
                    Container(height: 30, width: 1, color: Colors.grey[800]),
                    _MetricItem(
                      label: 'PERÍMETRO',
                      value: '${perim.toStringAsFixed(1)} m',
                      subvalue: 'Linderos',
                      icon: Icons.linear_scale_rounded,
                      color: const Color(0xFF60A5FA),
                    ),
                    Container(height: 30, width: 1, color: Colors.grey[800]),
                    _MetricItem(
                      label: 'VÉRTICES',
                      value: '$count pts',
                      subvalue: count >= 3 ? 'Listo para cerrar' : 'Mín. 3',
                      icon: Icons.location_on_rounded,
                      color: count >= 3 ? const Color(0xFFFBBF24) : Colors.grey[400]!,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Barra de Acciones
              Row(
                children: [
                  // Deshacer punto (Undo)
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF334155),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.undo_rounded, size: 16),
                    label: const Text('Deshacer', style: TextStyle(fontSize: 12)),
                    onPressed: count > 0 ? () => drawingProvider.undoLastVertex() : null,
                  ),

                  const SizedBox(width: 8),

                  // Botón Modo Borrador Selectivo
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFF87171),
                        side: const BorderSide(color: Color(0xFFEF4444)),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.cleaning_services_rounded, size: 16),
                      label: const Text(
                        'Borrar Vértice',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onPressed: count > 0 ? () => drawingProvider.enterEraserMode() : null,
                    ),
                  ),

                  const SizedBox(width: 8),

                  // Botón Cerrar y Guardar Polígono
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.check_circle_rounded, size: 16, color: Colors.black),
                    label: const Text(
                      'Cerrar',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    onPressed: count >= 3
                        ? () {
                            final val = drawingProvider.validateFinalPolygon(agroProvider);
                            if (!val.isValid) {
                              agroProvider.showTopologyAlert(
                                val.errorMessage ?? 'Error topológico al cerrar',
                                conflictPoint: val.conflictPoint,
                                offendingSegment: val.offendingSegment,
                              );
                            } else {
                              showDialog(
                                context: context,
                                barrierDismissible: false,
                                builder: (_) => const CreatePolygonDialog(),
                              );
                            }
                          }
                        : null,
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

class _MetricItem extends StatelessWidget {
  final String label;
  final String value;
  final String subvalue;
  final IconData icon;
  final Color color;

  const _MetricItem({
    required this.label,
    required this.value,
    required this.subvalue,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          subvalue,
          style: TextStyle(
            color: Colors.grey[500],
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}
