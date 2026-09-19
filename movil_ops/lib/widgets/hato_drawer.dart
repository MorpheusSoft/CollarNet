import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/hato.dart';
import '../models/potrero.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';
import '../services/storage_service.dart';

class HatoDrawer extends StatefulWidget {
  final Function(Hato) onZoomToHato;
  final Function(Potrero, Hato) onZoomToPotrero;

  const HatoDrawer({
    Key? key,
    required this.onZoomToHato,
    required this.onZoomToPotrero,
  }) : super(key: key);

  @override
  State<HatoDrawer> createState() => _HatoDrawerState();
}

class _HatoDrawerState extends State<HatoDrawer> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final agroProvider = context.watch<AgroProvider>();
    final drawingProvider = context.watch<DrawingProvider>();
    final hatos = agroProvider.hatos;

    final filteredHatos = hatos.where((h) {
      if (_searchQuery.isEmpty) return true;
      final query = _searchQuery.toLowerCase();
      final matchHato = h.nombre.toLowerCase().contains(query);
      final matchPotrero = h.potreros.any((p) => p.nombre.toLowerCase().contains(query));
      return matchHato || matchPotrero;
    }).toList();

    final double totalHectares = hatos.fold(0.0, (sum, h) => sum + h.areaHa);
    final int totalPotreros = hatos.fold(0, (sum, h) => sum + h.potreros.length);

    return Drawer(
      backgroundColor: const Color(0xFF0B132B),
      child: SafeArea(
        child: Column(
          children: [
            // Cabecera Principal
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                        ),
                        child: const Icon(Icons.terrain_rounded, color: Color(0xFF10B981), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'AgroGIS Pro',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              'Catastro & Topología Agrícola',
                              style: TextStyle(color: Colors.grey[400], fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.sync_rounded, color: Color(0xFF10B981)),
                        tooltip: 'Sincronizar con Servidor Central',
                        onPressed: () async {
                          await agroProvider.reloadFromApi();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('🔄 Geocercas sincronizadas con el servidor'),
                                backgroundColor: Color(0xFF10B981),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.grey),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Resumen Global de Hectáreas
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _StatColumn(
                          label: 'TOTAL HATOS',
                          value: '${hatos.length}',
                          color: const Color(0xFF60A5FA),
                        ),
                        Container(height: 30, width: 1, color: Colors.grey[800]),
                        _StatColumn(
                          label: 'POTREROS',
                          value: '$totalPotreros',
                          color: const Color(0xFFFBBF24),
                        ),
                        Container(height: 30, width: 1, color: Colors.grey[800]),
                        _StatColumn(
                          label: 'ÁREA TOTAL',
                          value: '${totalHectares.toStringAsFixed(1)} ha',
                          color: const Color(0xFF34D399),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Botón Registrar Nuevo Hato
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 4,
                      ),
                      icon: const Icon(Icons.add_circle_outline_rounded, size: 18, color: Colors.black),
                      label: const Text(
                        'Registrar Nuevo Hato',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      onPressed: drawingProvider.isDrawing
                          ? null
                          : () {
                              Navigator.of(context).pop();
                              drawingProvider.startDrawingHato(agroProvider.hatos);
                            },
                    ),
                  ),
                ],
              ),
            ),

            // Barra de Búsqueda
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  hintText: 'Buscar hato o potrero...',
                  hintStyle: TextStyle(color: Colors.grey[500], fontSize: 13),
                  prefixIcon: const Icon(Icons.search_rounded, color: Colors.grey, size: 16),
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),

            // Lista de Hatos y Potreros (Jerarquía)
            Expanded(
              child: filteredHatos.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.map_outlined, size: 40, color: Colors.grey[700]),
                          const SizedBox(height: 10),
                          Text(
                            'No hay predios registrados',
                            style: TextStyle(color: Colors.grey[500], fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      itemCount: filteredHatos.length,
                      itemBuilder: (context, index) {
                        final hato = filteredHatos[index];
                        return _HatoTreeCard(
                          hato: hato,
                          onZoomToHato: () {
                            Navigator.of(context).pop();
                            widget.onZoomToHato(hato);
                          },
                          onZoomToPotrero: (p) {
                            Navigator.of(context).pop();
                            widget.onZoomToPotrero(p, hato);
                          },
                          onAddPotrero: () {
                            Navigator.of(context).pop();
                            drawingProvider.startDrawingPotrero(hato.id, agroProvider.hatos);
                          },
                          onDeleteHato: () => _confirmDeleteHato(context, hato, agroProvider),
                          onDeletePotrero: (p) =>
                              _confirmDeletePotrero(context, hato, p, agroProvider),
                        );
                      },
                    ),
            ),

            // Pie de Página con Exportar GeoJSON
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                border: Border(top: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white70,
                        side: const BorderSide(color: Color(0xFF334155)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.download_rounded, size: 16),
                      label: const Text('Exportar GeoJSON', style: TextStyle(fontSize: 12)),
                      onPressed: () => _showGeoJSONDialog(context, agroProvider.hatos),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showOccupiedWarningDialog(BuildContext context, String title, String reason) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.gpp_bad_rounded, color: Color(0xFFF59E0B), size: 28),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          reason,
          style: const TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Entendido', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteHato(BuildContext context, Hato hato, AgroProvider provider) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('¿Eliminar Hato?', style: TextStyle(color: Colors.white)),
        content: Text(
          'Se eliminará "${hato.nombre}" junto con sus ${hato.potreros.length} potreros asociados.',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final res = await provider.deleteHato(hato.id);
              if (!res.canDelete && context.mounted) {
                _showOccupiedWarningDialog(
                  context,
                  'No se puede eliminar Hato',
                  res.reason ?? 'El hato contiene animales activos asignados o presentes dentro de sus linderos. Reubique el ganado antes de eliminar.',
                );
              }
            },
            child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmDeletePotrero(
      BuildContext context, Hato hato, Potrero potrero, AgroProvider provider) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('¿Eliminar Potrero?', style: TextStyle(color: Colors.white)),
        content: Text(
          'Se eliminará "${potrero.nombre}" (${potrero.areaHa.toStringAsFixed(2)} ha) del hato "${hato.nombre}".',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final res = await provider.deletePotrero(hato.id, potrero.id);
              if (!res.canDelete && context.mounted) {
                _showOccupiedWarningDialog(
                  context,
                  'No se puede eliminar Potrero',
                  res.reason ?? 'El potrero contiene animales activos asignados o presentes dentro de su cerca. Reubique el ganado antes de eliminar.',
                );
              }
            },
            child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showGeoJSONDialog(BuildContext context, List<Hato> hatos) {
    final geojson = StorageService.exportToGeoJSON(hatos);
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Row(
          children: [
            Icon(Icons.code_rounded, color: Color(0xFF10B981), size: 20),
            SizedBox(width: 8),
            Text('GeoJSON Exportado', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: SizedBox(
          width: 500,
          child: SingleChildScrollView(
            child: SelectableText(
              geojson,
              style: const TextStyle(
                color: Color(0xFF6EE7B7),
                fontFamily: 'monospace',
                fontSize: 11,
              ),
            ),
          ),
        ),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.content_copy_rounded, size: 16),
            label: const Text('Copiar al portapapeles'),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: geojson));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('GeoJSON copiado con éxito')),
              );
              Navigator.of(context).pop();
            },
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}

class _HatoTreeCard extends StatefulWidget {
  final Hato hato;
  final VoidCallback onZoomToHato;
  final Function(Potrero) onZoomToPotrero;
  final VoidCallback onAddPotrero;
  final VoidCallback onDeleteHato;
  final Function(Potrero) onDeletePotrero;

  const _HatoTreeCard({
    required this.hato,
    required this.onZoomToHato,
    required this.onZoomToPotrero,
    required this.onAddPotrero,
    required this.onDeleteHato,
    required this.onDeletePotrero,
  });

  @override
  State<_HatoTreeCard> createState() => _HatoTreeCardState();
}

class _HatoTreeCardState extends State<_HatoTreeCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final hato = widget.hato;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF131D33),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        children: [
          // Barra superior del Hato
          InkWell(
            onTap: widget.onZoomToHato,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: hato.color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hato.nombre,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          '${hato.areaHa.toStringAsFixed(2)} ha  •  ${hato.potreros.length} potreros',
                          style: const TextStyle(
                            color: Color(0xFF34D399),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Botón expandir potreros
                  IconButton(
                    icon: Icon(
                      _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: Colors.grey,
                      size: 18,
                    ),
                    onPressed: () => setState(() => _expanded = !_expanded),
                  ),
                  // Botón eliminar hato
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFF87171), size: 16),
                    onPressed: widget.onDeleteHato,
                  ),
                ],
              ),
            ),
          ),

          // Lista desplegable de Potreros
          if (_expanded) ...[
            const Divider(height: 1, color: Color(0xFF1E293B)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                children: [
                  if (hato.potreros.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Sin potreros internos aún',
                        style: TextStyle(color: Colors.grey[500], fontSize: 12),
                      ),
                    )
                  else
                    ...hato.potreros.map((potrero) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: potrero.color,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: InkWell(
                                onTap: () => widget.onZoomToPotrero(potrero),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      potrero.nombre,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      '${potrero.areaHa.toStringAsFixed(2)} ha (${((potrero.areaHa / hato.areaHa) * 100).toStringAsFixed(1)}%)',
                                      style: TextStyle(
                                        color: Colors.grey[400],
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.grey, size: 14),
                              onPressed: () => widget.onDeletePotrero(potrero),
                            ),
                          ],
                        ),
                      );
                    }).toList(),

                  const SizedBox(height: 6),

                  // Botón + Agregar Potrero
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF34D399),
                        side: BorderSide(color: const Color(0xFF10B981).withOpacity(0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 14),
                      label: const Text('+ Agregar Potrero', style: TextStyle(fontSize: 12)),
                      onPressed: widget.onAddPotrero,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatColumn({
    required this.label,
    required this.value,
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
            fontSize: 9,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}
