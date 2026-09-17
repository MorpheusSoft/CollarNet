import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/collar_inventario.dart';
import '../providers/inventory_provider.dart';
import '../theme/app_theme.dart';
import 'hardware_test_screen.dart';

class LotesScreen extends StatefulWidget {
  const LotesScreen({super.key});

  @override
  State<LotesScreen> createState() => _LotesScreenState();
}

class _LotesScreenState extends State<LotesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _manualInputCtrl = TextEditingController();
  final TextEditingController _searchCtrl = TextEditingController();
  final FocusNode _manualFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _manualInputCtrl.dispose();
    _searchCtrl.dispose();
    _manualFocusNode.dispose();
    super.dispose();
  }

  // ==========================================
  // MANEJO DE ESCANEO MANUAL / RÁPIDO
  // ==========================================
  void _onProcessScannedCode(String rawCode) {
    if (rawCode.trim().isEmpty) return;

    final inventory = context.read<InventoryProvider>();
    final result = inventory.addScannedCollar(rawCode: rawCode);

    _manualInputCtrl.clear();
    _manualFocusNode.requestFocus();

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.emeraldGreen,
          duration: const Duration(milliseconds: 1400),
          content: Row(
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                result['message'] as String,
                style: GoogleFonts.inter(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: result['isDuplicate'] == true ? AppTheme.warningAmber : AppTheme.dangerRed,
          duration: const Duration(seconds: 2),
          content: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.black, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  result['message'] as String,
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w800,
                    color: result['isDuplicate'] == true ? Colors.black : Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

  // ==========================================
  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  // ==========================================
  // FINALIZACIÓN Y SINCRONIZACIÓN DEL LOTE
  // ==========================================
  Future<void> _finalizeBatchDialog(InventoryProvider inventory) async {
    if (inventory.scannedCollares.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.dangerRed,
          content: Text('No hay collares escaneados para registrar.'),
        ),
      );
      return;
    }

    final tenantName = inventory.tenants.firstWhere(
      (t) => t['id'] == inventory.selectedTenantId,
      orElse: () => {'nombre': 'Almacén Central (Sin asignar a Finca)'},
    )['nombre'];

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppTheme.warningAmber, width: 1.5),
        ),
        title: Row(
          children: [
            const Icon(Icons.inventory_2_outlined, color: AppTheme.warningAmber),
            const SizedBox(width: 10),
            Text(
              'Finalizar Lote #${inventory.batchNumber}',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '¿Deseas ingresar y persistir ${inventory.scannedCollares.length} collares en la base de datos de CollarNet?',
                style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Column(
                  children: [
                    _buildSummaryRow('Código de Lote:', inventory.batchNumber),
                    _buildSummaryRow('Proveedor:', inventory.proveedor),
                    _buildSummaryRow('Ubicación Física:', inventory.ubicacionAlmacen),
                    _buildSummaryRow('Finca / Destino:', tenantName.toString()),
                    _buildSummaryRow('Fecha de Recepción:', _formatDate(inventory.fechaRecepcion)),
                    _buildSummaryRow('Hardware / FW:', '${inventory.versionHardware} / v${inventory.versionFirmware}'),
                    _buildSummaryRow('Total Collares:', '${inventory.scannedCollares.length} de ${inventory.targetCount} collares'),
                    _buildSummaryRow('Estado Inicial:', 'EN_ALMACEN'),
                    if (inventory.notasLote.isNotEmpty)
                      _buildSummaryRow('Notas:', inventory.notasLote),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Continuar Escaneando', style: GoogleFonts.inter(color: AppTheme.textMuted)),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.warningAmber,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.cloud_upload_outlined, size: 18),
            label: Text('Confirmar & Guardar BD', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await inventory.finalizeBatchAndSync();
        if (mounted) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: AppTheme.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: const BorderSide(color: AppTheme.emeraldGreen, width: 1.5),
              ),
              title: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: AppTheme.emeraldGreen, size: 26),
                  const SizedBox(width: 10),
                  Text(
                    '¡Lote Guardado con Éxito!',
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                  ),
                ],
              ),
              content: Text(
                'El lote #${inventory.batchNumber} (${inventory.scannedCollares.length} collares) ha sido ingresado al inventario central de CollarNet.',
                style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary),
              ),
              actions: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.emeraldGreen,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    _tabController.animateTo(1); // Cambiar a la pestaña de consulta de inventario
                  },
                  child: Text('Ver en Inventario', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          );
        }
      } catch (err) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.dangerRed,
              content: Text('Error guardando lote en servidor: $err'),
            ),
          );
        }
      }
    }
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted)),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // DIÁLOGO GUIADO DE REGISTRO / CONFIGURACIÓN DE LOTE
  // ==========================================
  void _showConfigureBatchDialog(InventoryProvider inventory, {bool isNewBatch = false}) {
    final now = DateTime.now();
    final suggestedBatch = isNewBatch
        ? 'L-${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}'
        : inventory.batchNumber;

    final batchCtrl = TextEditingController(text: suggestedBatch);
    final provCtrl = TextEditingController(text: isNewBatch ? 'Shenzhen IoT Tech Co.' : inventory.proveedor);
    final ubicacionCtrl = TextEditingController(text: isNewBatch ? 'Almacén Central CowIA' : inventory.ubicacionAlmacen);
    final targetCtrl = TextEditingController(text: isNewBatch ? '50' : inventory.targetCount.toString());
    final hwCtrl = TextEditingController(text: isNewBatch ? 'HW-v2.0' : inventory.versionHardware);
    final fwCtrl = TextEditingController(text: isNewBatch ? '1.0.0' : inventory.versionFirmware);
    final notasCtrl = TextEditingController(text: isNewBatch ? '' : inventory.notasLote);

    DateTime selectedDate = isNewBatch ? now : inventory.fechaRecepcion;
    int? selectedTenantId = isNewBatch ? null : inventory.selectedTenantId;

    final providerPresets = [
      'Shenzhen IoT Tech Co.',
      'CowIA Hardware Lab',
      'Nordic Semiconductor',
      'Quectel Wireless',
    ];

    final ubicacionPresets = [
      'Almacén Central CowIA',
      'Estante A-01 (Principal)',
      'Estante B-04 (Repuestos)',
      'Taller de Diagnóstico',
      'Depósito Finca',
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => Dialog(
          backgroundColor: AppTheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppTheme.cardBorder, width: 1.5),
          ),
          child: Container(
            padding: const EdgeInsets.all(20),
            constraints: const BoxConstraints(maxWidth: 480, maxHeight: 680),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cabecera del Diálogo
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.warningAmber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isNewBatch ? Icons.add_business_rounded : Icons.tune_rounded,
                          color: AppTheme.warningAmber,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isNewBatch ? 'Registrar Nuevo Lote de Collares' : 'Configuración del Lote de Hardware',
                              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                            ),
                            Text(
                              'Formulario guiado con preguntas de base de datos',
                              style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // ==============================
                  // SECCIÓN 1: IDENTIFICACIÓN Y ORIGEN
                  // ==============================
                  _buildSectionHeader('1. IDENTIFICACIÓN Y FABRICANTE', Icons.business_rounded),
                  const SizedBox(height: 8),

                  _buildDialogField('CÓDIGO ÚNICO DEL LOTE *', batchCtrl, 'Ej. L-2026-09', Icons.tag),
                  const SizedBox(height: 10),

                  _buildDialogField('PROVEEDOR / FABRICANTE *', provCtrl, 'Ej. Shenzhen IoT Tech Co.', Icons.factory_rounded),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    children: providerPresets.map((p) {
                      return ActionChip(
                        label: Text(p, style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700)),
                        backgroundColor: AppTheme.surfaceLight,
                        side: BorderSide(color: provCtrl.text == p ? AppTheme.warningAmber : AppTheme.cardBorder),
                        padding: EdgeInsets.zero,
                        onPressed: () {
                          setDlgState(() {
                            provCtrl.text = p;
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),

                  // Selector de Fecha de Recepción
                  Text(
                    'FECHA DE RECEPCIÓN / INGRESO *',
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
                  ),
                  const SizedBox(height: 4),
                  InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2035),
                        builder: (context, child) {
                          return Theme(
                            data: ThemeData.dark().copyWith(
                              colorScheme: const ColorScheme.dark(
                                primary: AppTheme.warningAmber,
                                onPrimary: Colors.black,
                                surface: AppTheme.surface,
                                onSurface: AppTheme.textPrimary,
                              ),
                            ),
                            child: child!,
                          );
                        },
                      );
                      if (picked != null) {
                        setDlgState(() => selectedDate = picked);
                      }
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.warningAmber),
                          const SizedBox(width: 8),
                          Text(
                            _formatDate(selectedDate),
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                          ),
                          const Spacer(),
                          Text(
                            'Cambiar Fecha',
                            style: GoogleFonts.inter(fontSize: 10, color: AppTheme.warningAmber, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // ==============================
                  // SECCIÓN 2: UBICACIÓN FÍSICA Y DESTINO
                  // ==============================
                  _buildSectionHeader('2. UBICACIÓN FÍSICA & ASIGNACIÓN', Icons.place_rounded),
                  const SizedBox(height: 8),

                  _buildDialogField('UBICACIÓN FÍSICA / DEPÓSITO *', ubicacionCtrl, 'Ej. Almacén Central CowIA', Icons.location_on_outlined),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    children: ubicacionPresets.map((u) {
                      return ActionChip(
                        label: Text(u, style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700)),
                        backgroundColor: AppTheme.surfaceLight,
                        side: BorderSide(color: ubicacionCtrl.text == u ? AppTheme.primaryCyan : AppTheme.cardBorder),
                        padding: EdgeInsets.zero,
                        onPressed: () {
                          setDlgState(() {
                            ubicacionCtrl.text = u;
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),

                  // Selector de Finca / Tenant Destino
                  Text(
                    'FINCA / DESTINO ASIGNADO',
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.cardBorder),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int?>(
                        value: selectedTenantId,
                        isExpanded: true,
                        dropdownColor: AppTheme.surface,
                        style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.warningAmber),
                        items: [
                          DropdownMenuItem<int?>(
                            value: null,
                            child: Row(
                              children: [
                                const Icon(Icons.storefront_rounded, size: 16, color: AppTheme.textMuted),
                                const SizedBox(width: 8),
                                Text('Almacén Central (Sin asignar a Finca)', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary)),
                              ],
                            ),
                          ),
                          ...inventory.tenants.map((t) {
                            final id = t['id'] is int ? t['id'] as int : int.tryParse(t['id'].toString());
                            return DropdownMenuItem<int?>(
                              value: id,
                              child: Row(
                                children: [
                                  const Icon(Icons.agriculture_rounded, size: 16, color: AppTheme.primaryCyan),
                                  const SizedBox(width: 8),
                                  Text(t['nombre']?.toString() ?? 'Finca #$id', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary)),
                                ],
                              ),
                            );
                          }),
                        ],
                        onChanged: (val) {
                          setDlgState(() => selectedTenantId = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // ==============================
                  // SECCIÓN 3: ESPECIFICACIONES TÉCNICAS & METAS
                  // ==============================
                  _buildSectionHeader('3. ESPECIFICACIONES TÉCNICAS & METAS', Icons.memory_rounded),
                  const SizedBox(height: 8),

                  _buildDialogField('CANTIDAD ESTIMADA / META *', targetCtrl, 'Ej. 50', Icons.calculate_outlined, isNumber: true),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    children: [25, 50, 100, 200].map((count) {
                      return ActionChip(
                        label: Text('$count unidades', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700)),
                        backgroundColor: AppTheme.surfaceLight,
                        side: BorderSide(color: targetCtrl.text == count.toString() ? AppTheme.emeraldGreen : AppTheme.cardBorder),
                        padding: EdgeInsets.zero,
                        onPressed: () {
                          setDlgState(() {
                            targetCtrl.text = count.toString();
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(child: _buildDialogField('VER. HARDWARE', hwCtrl, 'HW-v2.0', Icons.developer_board)),
                      const SizedBox(width: 8),
                      Expanded(child: _buildDialogField('FW INICIAL', fwCtrl, '1.0.0', Icons.system_update_alt)),
                    ],
                  ),
                  const SizedBox(height: 10),

                  _buildDialogField('NOTAS U OBSERVACIONES', notasCtrl, 'Ej. Empaque sellado, guía #9842...', Icons.note_alt_outlined, maxLines: 2),
                  const SizedBox(height: 20),

                  // Botones de Acción
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: Text('Cancelar', style: GoogleFonts.inter(color: AppTheme.textMuted)),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.warningAmber,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: Icon(isNewBatch ? Icons.check_circle_rounded : Icons.save_rounded, size: 18),
                        label: Text(
                          isNewBatch ? 'Iniciar Nuevo Lote' : 'Guardar Parámetros',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w800),
                        ),
                        onPressed: () {
                          final code = batchCtrl.text.trim().isNotEmpty ? batchCtrl.text.trim().toUpperCase() : 'L-2026-09';
                          final prov = provCtrl.text.trim().isNotEmpty ? provCtrl.text.trim() : 'Shenzhen IoT Tech Co.';
                          final ubicacion = ubicacionCtrl.text.trim().isNotEmpty ? ubicacionCtrl.text.trim() : 'Almacén Central CowIA';
                          final target = int.tryParse(targetCtrl.text.trim()) ?? 50;

                          if (isNewBatch) {
                            inventory.startNewBatch(
                              batchNumber: code,
                              proveedor: prov,
                              targetCount: target,
                              ubicacionAlmacen: ubicacion,
                              fechaRecepcion: selectedDate,
                              tenantId: selectedTenantId,
                              versionHardware: hwCtrl.text.trim(),
                              versionFirmware: fwCtrl.text.trim(),
                              notas: notasCtrl.text.trim(),
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: AppTheme.emeraldGreen,
                                content: Text('✨ Nuevo Lote #$code inicializado y listo para escanear.'),
                              ),
                            );
                          } else {
                            inventory.configureBatch(
                              batchNumber: code,
                              proveedor: prov,
                              targetCount: target,
                              ubicacionAlmacen: ubicacion,
                              fechaRecepcion: selectedDate,
                              tenantId: selectedTenantId,
                              versionHardware: hwCtrl.text.trim(),
                              versionFirmware: fwCtrl.text.trim(),
                              notas: notasCtrl.text.trim(),
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                backgroundColor: AppTheme.emeraldGreen,
                                content: Text('Parámetros del lote actualizados.'),
                              ),
                            );
                          }
                          Navigator.pop(ctx);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.warningAmber),
        const SizedBox(width: 6),
        Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: AppTheme.warningAmber,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildDialogField(String label, TextEditingController ctrl, String hint, IconData icon, {bool isNumber = false, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: ctrl,
          maxLines: maxLines,
          keyboardType: isNumber ? TextInputType.number : TextInputType.text,
          style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppTheme.surfaceLight,
            hintText: hint,
            prefixIcon: Icon(icon, size: 16, color: AppTheme.warningAmber),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          ),
        ),
      ],
    );
  }

  Widget _buildLoteInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: AppTheme.warningAmber),
        const SizedBox(width: 6),
        SizedBox(
          width: 110,
          child: Text(label, style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.w600)),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // ==========================================
  // DIÁLOGO DE FICHA TÉCNICA Y DETALLES DEL COLLAR
  // ==========================================
  void _showCollarDetailModal(CollarInventario collar, InventoryProvider inventory) {
    inventory.selectCollar(collar);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(color: AppTheme.cardBorder),
      ),
      builder: (ctx) {
        return Consumer<InventoryProvider>(
          builder: (context, inv, _) {
            final c = inv.selectedCollar ?? collar;
            final isActivo = c.estado == 'ACTIVO';
            final isRevision = c.estado == 'EN_REVISION';

            Color badgeColor = AppTheme.emeraldGreen;
            if (isRevision) badgeColor = AppTheme.warningAmber;
            if (c.estado == 'DE_BAJA') badgeColor = AppTheme.dangerRed;
            if (c.estado == 'DESACTIVADO') badgeColor = AppTheme.textMuted;
            if (isActivo) badgeColor = AppTheme.primaryCyan;

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.88,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle superior
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppTheme.textMuted.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Cabecera del Collar
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: badgeColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(Icons.qr_code_2_rounded, color: badgeColor, size: 28),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  c.id,
                                  style: GoogleFonts.outfit(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Text(
                                  'IMEI: ${c.imei ?? "No asignado"}',
                                  style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: badgeColor.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: badgeColor.withValues(alpha: 0.5)),
                          ),
                          child: Text(
                            c.estado,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: badgeColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Fila de Métricas Rápidas (Batería, Señal, Firmware)
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            'BATERÍA',
                            '${c.nivelBateria ?? 0}%',
                            Icons.battery_charging_full_rounded,
                            (c.nivelBateria ?? 0) > 30 ? AppTheme.emeraldGreen : AppTheme.dangerRed,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildMetricTile(
                            'SEÑAL GSM',
                            '${c.senalCelular ?? 0}/5 barras',
                            Icons.signal_cellular_alt_rounded,
                            AppTheme.primaryCyan,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildMetricTile(
                            'FIRMWARE',
                            'v${c.versionFirmware ?? "1.0.0"}',
                            Icons.memory_rounded,
                            AppTheme.accentPurple,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Tarjeta de Asignación a Ganado / Finca
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceLight,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.pets, size: 16, color: AppTheme.primaryCyan),
                              const SizedBox(width: 6),
                              Text(
                                'VINCULACIÓN PECUARIA & DESTINO',
                                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.primaryCyan),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          _buildDetailRow('Finca / Tenant:', c.tenantNombre ?? 'Almacén Central (Sin asignar)'),
                          _buildDetailRow('Hato Perteneciente:', c.hatoNombre ?? 'N/A'),
                          _buildDetailRow('Potrero Asignado:', c.potreroNombre ?? 'N/A'),
                          _buildDetailRow('Animal Vinculado:', c.animalArete != null ? '${c.animalArete} (${c.animalRaza ?? ""})' : 'Disponible en Stock'),
                          if (c.loteCodigo != null)
                            _buildDetailRow('Lote de Origen:', '#${c.loteCodigo} (${c.loteProveedor ?? ""})'),
                          if (c.ubicacionAlmacen != null)
                            _buildDetailRow('Ubicación Física:', c.ubicacionAlmacen!),
                          if (c.motivoEstado != null)
                            _buildDetailRow('Observación / Motivo:', c.motivoEstado!),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Bitácora de Auditoría Reciente
                    Text(
                      'BITÁCORA DE MOVIMIENTOS & AUDITORÍA',
                      style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 0.5),
                    ),
                    const SizedBox(height: 8),

                    if (inv.isLoadingHistorial)
                      const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                    else if (inv.selectedCollarHistorial.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppTheme.surfaceLight, borderRadius: BorderRadius.circular(10)),
                        child: Center(
                          child: Text('Sin movimientos adicionales registrados.', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted)),
                        ),
                      )
                    else
                      Column(
                        children: inv.selectedCollarHistorial.map((h) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: AppTheme.surfaceLight, borderRadius: BorderRadius.circular(10)),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.history_rounded, size: 16, color: AppTheme.textMuted),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${h.estadoAnterior ?? "REGISTRO"} ➔ ${h.estadoNuevo ?? "EN_ALMACEN"}',
                                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                                      ),
                                      Text(
                                        h.motivo ?? 'Cambio de estado operativo',
                                        style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),

                    const SizedBox(height: 20),

                    // Botones de Acción (Cambiar Estado / Probar en Banco BLE)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppTheme.warningAmber),
                              foregroundColor: AppTheme.warningAmber,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.published_with_changes_rounded, size: 16),
                            label: Text('Cambiar Estado', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 12)),
                            onPressed: () {
                              _showChangeStatusDialog(c, inv);
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryCyan,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.speed, size: 16),
                            label: Text('Banco de Pruebas', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 12)),
                            onPressed: () {
                              Navigator.pop(ctx);
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const HardwareTestScreen()),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMetricTile(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(height: 4),
          Text(title, style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: AppTheme.textMuted)),
          Text(value, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted)),
          ),
          Expanded(
            child: Text(value, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
          ),
        ],
      ),
    );
  }

  void _showChangeStatusDialog(CollarInventario collar, InventoryProvider inventory) {
    String selectedStatus = collar.estado;
    final motivoCtrl = TextEditingController(text: 'Actualización técnica desde aplicativo móvil');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          backgroundColor: AppTheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: AppTheme.warningAmber),
          ),
          title: Text(
            'Actualizar Estado de ${collar.id}',
            style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Selecciona el nuevo estado operativo:', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary)),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: ['EN_ALMACEN', 'ACTIVO', 'EN_REVISION', 'DESACTIVADO', 'DE_BAJA'].map((st) {
                  final isSel = selectedStatus == st;
                  return ChoiceChip(
                    label: Text(st, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800)),
                    selected: isSel,
                    selectedColor: AppTheme.warningAmber.withValues(alpha: 0.3),
                    backgroundColor: AppTheme.surfaceLight,
                    onSelected: (val) {
                      if (val) setDlgState(() => selectedStatus = st);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: motivoCtrl,
                style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppTheme.surfaceLight,
                  labelText: 'Motivo del cambio',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancelar', style: GoogleFonts.inter(color: AppTheme.textMuted)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.warningAmber, foregroundColor: Colors.black),
              onPressed: () async {
                await inventory.updateCollarEstado(collar.id, selectedStatus, motivoCtrl.text.trim());
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: Text('Actualizar', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // CONSTRUCCIÓN PRINCIPAL DE LA PANTALLA
  // ==========================================
  @override
  Widget build(BuildContext context) {
    final inventory = context.watch<InventoryProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '3. RECEPCIÓN DE LOTES & INVENTARIO',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppTheme.warningAmber,
                letterSpacing: 0.6,
              ),
            ),
            Text(
              'Base de Datos PostgreSQL / PostGIS Conectada',
              style: GoogleFonts.inter(fontSize: 10, color: AppTheme.emeraldGreen),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.primaryCyan, size: 20),
            tooltip: 'Sincronizar Inventario',
            onPressed: () => inventory.loadInventario(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.warningAmber,
          indicatorWeight: 3,
          labelColor: AppTheme.warningAmber,
          unselectedLabelColor: AppTheme.textMuted,
          labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800),
          tabs: const [
            Tab(icon: Icon(Icons.qr_code_scanner_rounded, size: 18), text: 'Recepción Lotes'),
            Tab(icon: Icon(Icons.search_rounded, size: 18), text: 'Consultar Inventario'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Pestaña 1: Recepción de Lotes
          _buildRecepcionLotesTab(inventory),

          // Pestaña 2: Consultar Inventario y Ficha Técnica
          _buildConsultarInventarioTab(inventory),
        ],
      ),
    );
  }

  // ==========================================
  // PESTAÑA 1: RECEPCIÓN DE LOTES & ESCÁNER QR
  // ==========================================
  Widget _buildRecepcionLotesTab(InventoryProvider inventory) {
    final totalScanned = inventory.scannedCollares.length;
    final progress = totalScanned / inventory.targetCount;
    final tenantName = inventory.tenants.firstWhere(
      (t) => t['id'] == inventory.selectedTenantId,
      orElse: () => {'nombre': 'Almacén Central (Sin asignar a Finca)'},
    )['nombre'];

    return SingleChildScrollView(
      child: Column(
        children: [
          // 1. Tarjeta de Configuración y Parámetros del Lote
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Fila 1: Título de Lote, Versiones y Acciones
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            'LOTE: #${inventory.batchNumber}',
                            style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.warningAmber.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              inventory.versionHardware,
                              style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.warningAmber),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'v${inventory.versionFirmware}',
                              style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.primaryCyan),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.emeraldGreen,
                              side: const BorderSide(color: AppTheme.emeraldGreen, width: 1.2),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            icon: const Icon(Icons.add_rounded, size: 14),
                            label: Text('Nuevo Lote', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800)),
                            onPressed: () => _showConfigureBatchDialog(inventory, isNewBatch: true),
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: const Icon(Icons.tune_rounded, color: AppTheme.warningAmber, size: 20),
                            tooltip: 'Ajustar Parámetros',
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () => _showConfigureBatchDialog(inventory, isNewBatch: false),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Fila 2: Cuadrícula de Datos Clave (Proveedor, Ubicación, Finca, Fecha)
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.cardBorder.withValues(alpha: 0.5)),
                    ),
                    child: Column(
                      children: [
                        _buildLoteInfoRow(Icons.business_rounded, 'Proveedor:', inventory.proveedor),
                        const SizedBox(height: 4),
                        _buildLoteInfoRow(Icons.place_rounded, 'Ubicación Física:', inventory.ubicacionAlmacen),
                        const SizedBox(height: 4),
                        _buildLoteInfoRow(Icons.agriculture_rounded, 'Destino / Finca:', tenantName.toString()),
                        const SizedBox(height: 4),
                        _buildLoteInfoRow(Icons.calendar_today_rounded, 'Fecha Recepción:', _formatDate(inventory.fechaRecepcion)),
                        if (inventory.notasLote.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          _buildLoteInfoRow(Icons.notes_rounded, 'Notas:', inventory.notasLote),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Visor de Cámara Simulado con Guías Neón
          Container(
            height: 160,
            width: double.infinity,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF060B18),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.6), width: 1.5),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Retícula de escaneo
                Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.warningAmber, width: 2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                Positioned(
                  top: 10,
                  child: Row(
                    children: [
                      const Icon(Icons.sensors, color: AppTheme.warningAmber, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        'APUNTE AL CÓDIGO QR O INGRESE ID',
                        style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.warningAmber),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  bottom: 10,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final draft = inventory.simulateQuickScan();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: AppTheme.emeraldGreen,
                          duration: const Duration(milliseconds: 1200),
                          content: Text('⚡ Collar "${draft.id}" escaneado con éxito.'),
                        ),
                      );
                    },
                    icon: const Icon(Icons.flash_on_rounded, size: 14, color: Colors.black),
                    label: Text(
                      'SIMULAR ESCANEO QR RÁPIDO',
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.black),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.warningAmber,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Campo de Entrada Manual de Código / Lector Láser
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _manualInputCtrl,
                    focusNode: _manualFocusNode,
                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                    onSubmitted: _onProcessScannedCode,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppTheme.surface,
                      hintText: 'Ingresar ID manual o IMEI (ej. COW-2026-0050)',
                      hintStyle: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                      prefixIcon: const Icon(Icons.qr_code_2, color: AppTheme.warningAmber, size: 18),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.add_circle, color: AppTheme.emeraldGreen),
                        onPressed: () => _onProcessScannedCode(_manualInputCtrl.text),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 4. Barra de Progreso del Lote
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'PROGRESO DE RECEPCIÓN',
                        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.textMuted),
                      ),
                      Text(
                        '$totalScanned de ${inventory.targetCount} collares (${(progress * 100).toInt()}%)',
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.emeraldGreen),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: progress.clamp(0.0, 1.0),
                      backgroundColor: AppTheme.surfaceLight,
                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.emeraldGreen),
                      minHeight: 7,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Lista de Collares Escaneados en la Sesión
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'COLLARES ESCANEADOS (${inventory.scannedCollares.length})',
                  style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 0.5),
                ),
                if (inventory.scannedCollares.isNotEmpty)
                  InkWell(
                    onTap: () => inventory.clearBatchDraft(),
                    child: Text('Limpiar Todo', style: GoogleFonts.inter(fontSize: 10, color: AppTheme.dangerRed, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
          ),

          ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: inventory.scannedCollares.length,
            separatorBuilder: (context, index) => const SizedBox(height: 6),
            itemBuilder: (context, index) {
              final item = inventory.scannedCollares[index];
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.qr_code_2, color: AppTheme.warningAmber, size: 20),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.id,
                              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                            ),
                            Text(
                              'IMEI: ${item.imei}',
                              style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.status,
                            style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.emeraldGreen),
                          ),
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          icon: const Icon(Icons.close, size: 16, color: AppTheme.textMuted),
                          onPressed: () => inventory.removeScannedCollarAt(index),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),

          // 6. Botón de Finalización y Sincronización
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: inventory.isSavingBatch ? null : () => _finalizeBatchDialog(inventory),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.warningAmber,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: inventory.isSavingBatch
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Icon(Icons.cloud_upload_rounded, size: 18),
                label: Text(
                  inventory.isSavingBatch ? 'GUARDANDO EN BASE DE DATOS...' : 'FINALIZAR LOTE & SINCRONIZAR',
                  style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // PESTAÑA 2: CONSULTAR INVENTARIO & FICHA TÉCNICA
  // ==========================================
  Widget _buildConsultarInventarioTab(InventoryProvider inventory) {
    return Column(
      children: [
        // 1. Buscador con Escaneo Rápido
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary),
                  onChanged: (val) => inventory.setSearchQuery(val),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppTheme.surface,
                    hintText: 'Buscar por ID, IMEI, SIM o Arete visual...',
                    hintStyle: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                    prefixIcon: const Icon(Icons.search, color: AppTheme.primaryCyan, size: 18),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 16, color: AppTheme.textMuted),
                            onPressed: () {
                              _searchCtrl.clear();
                              inventory.setSearchQuery('');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ),

        // 2. Chips de Filtro por Estado Operativo
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: ['TODOS', 'EN_ALMACEN', 'ACTIVO', 'EN_REVISION', 'DESACTIVADO', 'DE_BAJA'].map((st) {
              final isSel = inventory.selectedEstadoFilter == st;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(st, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700)),
                  selected: isSel,
                  selectedColor: AppTheme.primaryCyan.withValues(alpha: 0.25),
                  backgroundColor: AppTheme.surface,
                  labelStyle: TextStyle(color: isSel ? AppTheme.primaryCyan : AppTheme.textSecondary),
                  side: BorderSide(color: isSel ? AppTheme.primaryCyan : AppTheme.cardBorder),
                  onSelected: (_) => inventory.setEstadoFilter(st),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),

        // 3. Lista de Collares de la Base de Datos
        Expanded(
          child: inventory.isLoadingInventario
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryCyan))
              : inventory.collaresInventario.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.inventory_2_outlined, size: 40, color: AppTheme.textMuted),
                          const SizedBox(height: 8),
                          Text(
                            'No se encontraron collares con los filtros aplicados.',
                            style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      itemCount: inventory.collaresInventario.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final c = inventory.collaresInventario[index];
                        final isActivo = c.estado == 'ACTIVO';
                        final isRevision = c.estado == 'EN_REVISION';

                        Color badgeColor = AppTheme.emeraldGreen;
                        if (isRevision) badgeColor = AppTheme.warningAmber;
                        if (c.estado == 'DE_BAJA') badgeColor = AppTheme.dangerRed;
                        if (c.estado == 'DESACTIVADO') badgeColor = AppTheme.textMuted;
                        if (isActivo) badgeColor = AppTheme.primaryCyan;

                        return InkWell(
                          onTap: () => _showCollarDetailModal(c, inventory),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.cardBorder),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: badgeColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(Icons.sensors_rounded, color: badgeColor, size: 22),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            c.id,
                                            style: GoogleFonts.outfit(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: AppTheme.textPrimary,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: badgeColor.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              c.estado,
                                              style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: badgeColor),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        c.animalArete != null
                                            ? 'Animal: ${c.animalArete} • ${c.tenantNombre ?? "Finca"}'
                                            : 'IMEI: ${c.imei ?? "S/D"} • ${c.ubicacionAlmacen ?? "Almacén Central"}',
                                        style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted, size: 18),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}
