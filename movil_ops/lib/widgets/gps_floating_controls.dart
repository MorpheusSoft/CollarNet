import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/gps_data.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';

class GPSFloatingControls extends StatelessWidget {
  final GPSData? currentGPS;
  final VoidCallback onCenterGPS;

  const GPSFloatingControls({
    Key? key,
    required this.currentGPS,
    required this.onCenterGPS,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final drawingProvider = context.watch<DrawingProvider>();
    final agroProvider = context.watch<AgroProvider>();
    final bool isDrawing = drawingProvider.isDrawing && !drawingProvider.isEraserMode;

    return Positioned(
      top: 60,
      right: 16,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            // Pill de Precisión GPS en Metros
            if (currentGPS != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withOpacity(0.9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: currentGPS!.accuracy <= 5
                        ? const Color(0xFF10B981)
                        : const Color(0xFFFBBF24),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: currentGPS!.accuracy <= 5
                            ? const Color(0xFF10B981)
                            : const Color(0xFFFBBF24),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'GPS ${currentGPS!.accuracyLabel}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

            // Botón Centrar en mi GPS
            FloatingActionButton.small(
              heroTag: 'fab_center_gps',
              backgroundColor: const Color(0xFF1E293B),
              foregroundColor: const Color(0xFF10B981),
              elevation: 4,
              onPressed: onCenterGPS,
              tooltip: 'Centrar en mi GPS',
              child: const Icon(Icons.my_location_rounded, size: 20),
            ),

            // Botón Flotante "Marcar Ubicación GPS" durante el trazado
            if (isDrawing && currentGPS != null) ...[
              const SizedBox(height: 12),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF047857),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  elevation: 6,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  shadowColor: const Color(0xFF10B981).withOpacity(0.5),
                ),
                icon: const Icon(Icons.location_on_rounded, size: 18, color: Color(0xFF34D399)),
                label: const Text(
                  'Marcar Vértice GPS',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                ),
                onPressed: () {
                  final pos = currentGPS!.position;
                  drawingProvider.addVertex(pos, agroProvider);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
