import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/hato.dart';
import '../providers/agro_provider.dart';
import '../providers/drawing_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'hato_drawing_screen.dart';

class HatosScreen extends StatefulWidget {
  const HatosScreen({super.key});

  @override
  State<HatosScreen> createState() => _HatosScreenState();
}

class _HatosScreenState extends State<HatosScreen> {
  final ApiService _apiService = ApiService();
  String _searchQuery = '';

  List<Map<String, dynamic>> _tenants = [
    {'id': 1, 'nombre': 'Hacienda Santa Inés (Demo)'},
    {'id': 2, 'nombre': 'Fundo El Roble (Guárico)'},
    {'id': 3, 'nombre': 'Ganadería San Pedro'},
  ];
  Map<String, dynamic>? _selectedTenant;
  Map<String, dynamic>? _selectedAdquiriente;

  int _getTenantId(Map<String, dynamic> tenant) {
    final raw = tenant['id'];
    return raw is int ? raw : int.tryParse(raw?.toString() ?? '1') ?? 1;
  }

  List<Hato> _getHatosForTenant(Map<String, dynamic> tenant, List<Hato> allHatos) {
    final tId = _getTenantId(tenant);
    return allHatos.where((h) => h.tenantId == tId || (tId == 1 && h.tenantId == null)).toList();
  }

  @override
  void initState() {
    super.initState();
    _selectedTenant = _tenants.first;
    _loadTenants();
  }

  Future<void> _loadTenants() async {
    try {
      final tenants = await _apiService.fetchTenants();
      if (tenants.isNotEmpty && mounted) {
        setState(() {
          _tenants = tenants;
          _selectedTenant = tenants.first;
        });
      }
    } catch (_) {}
  }

  void _onAgregarHato() async {
    if (_tenants.isEmpty) {
      await _loadTenants();
    }
    if (!mounted) return;
    if (_selectedAdquiriente != null) {
      final tId = _getTenantId(_selectedAdquiriente!);
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => HatoDrawingScreen(
            drawingType: DrawingType.hato,
            tenantId: tId,
            tenantNombre: _selectedAdquiriente!['nombre'] as String?,
          ),
        ),
      );
    } else {
      _showSelectAdquirienteModal();
    }
  }

  void _showSelectAdquirienteModal() {
    String filterText = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(color: AppTheme.cardBorder),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filtered = _tenants.where((t) {
              if (filterText.isEmpty) return true;
              final q = filterText.toLowerCase();
              final name = (t['nombre'] ?? '').toString().toLowerCase();
              final rif = (t['rif_identificacion'] ?? '').toString().toLowerCase();
              final dir = (t['direccion'] ?? '').toString().toLowerCase();
              return name.contains(q) || rif.contains(q) || dir.contains(q);
            }).toList();

            return SafeArea(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle de arrastre
                    Center(
                      child: Container(
                        width: 42,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),

                    // Encabezado
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(7),
                                    decoration: BoxDecoration(
                                      color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.domain_rounded, color: AppTheme.emeraldGreen, size: 20),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'SELECCIONA EL ADQUIRIENTE',
                                      style: GoogleFonts.outfit(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.emeraldGreen,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Elige a qué adquiriente/finca registrada le pertenecerá este nuevo Hato Maestro:',
                                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 20),
                          onPressed: () => Navigator.pop(sheetCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Barra de búsqueda rápida
                    TextField(
                      onChanged: (v) => setSheetState(() => filterText = v),
                      style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppTheme.surfaceLight,
                        isDense: true,
                        hintText: 'Buscar por nombre, RIF o ubicación...',
                        hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 11),
                        prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted, size: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppTheme.cardBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppTheme.cardBorder),
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Subtítulo con contador
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'ADQUIRIENTES REGISTRADOS (${filtered.length})',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textMuted,
                            letterSpacing: 0.5,
                          ),
                        ),
                        InkWell(
                          onTap: () async {
                            await _loadTenants();
                            setSheetState(() {});
                          },
                          child: Row(
                            children: [
                              const Icon(Icons.refresh_rounded, size: 14, color: AppTheme.primaryCyan),
                              const SizedBox(width: 4),
                              Text(
                                'Actualizar lista',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primaryCyan,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Lista de Opciones
                    Flexible(
                      child: filtered.isEmpty
                          ? Container(
                              padding: const EdgeInsets.symmetric(vertical: 24),
                              alignment: Alignment.center,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.search_off_rounded, size: 36, color: AppTheme.textMuted),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No se encontraron adquirientes',
                                    style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.textSecondary),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              itemCount: filtered.length,
                              separatorBuilder: (_, index) => const SizedBox(height: 8),
                              itemBuilder: (context, idx) {
                                final tenant = filtered[idx];
                                final isSelected = _selectedTenant?['id'] == tenant['id'];
                                final nombre = tenant['nombre'] ?? 'Sin Nombre';
                                final rif = tenant['rif_identificacion'] ?? '';
                                final dir = tenant['direccion'] ?? '';

                                return InkWell(
                                  onTap: () {
                                    setState(() {
                                      _selectedTenant = tenant;
                                    });
                                    Navigator.pop(sheetCtx);

                                    // Navegar a diseñar el Hato Maestro
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => HatoDrawingScreen(
                                          drawingType: DrawingType.hato,
                                          tenantId: tenant['id'] as int? ?? 1,
                                          tenantNombre: nombre,
                                        ),
                                      ),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(14),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppTheme.emeraldGreen.withValues(alpha: 0.10)
                                          : AppTheme.surfaceLight,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isSelected ? AppTheme.emeraldGreen : AppTheme.cardBorder,
                                        width: isSelected ? 1.5 : 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 40,
                                          height: 40,
                                          decoration: BoxDecoration(
                                            color: isSelected
                                                ? AppTheme.emeraldGreen.withValues(alpha: 0.25)
                                                : AppTheme.primaryCyan.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(
                                              color: isSelected
                                                  ? AppTheme.emeraldGreen
                                                  : AppTheme.primaryCyan.withValues(alpha: 0.3),
                                            ),
                                          ),
                                          child: Center(
                                            child: Icon(
                                              Icons.business_rounded,
                                              color: isSelected ? AppTheme.emeraldGreen : AppTheme.primaryCyan,
                                              size: 20,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      nombre,
                                                      style: GoogleFonts.outfit(
                                                        fontSize: 14,
                                                        fontWeight: FontWeight.w700,
                                                        color: AppTheme.textPrimary,
                                                      ),
                                                    ),
                                                  ),
                                                  if (isSelected)
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: AppTheme.emeraldGreen.withValues(alpha: 0.2),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: Text(
                                                        'SELECCIONADO',
                                                        style: GoogleFonts.inter(
                                                          fontSize: 8,
                                                          fontWeight: FontWeight.w800,
                                                          color: AppTheme.emeraldGreen,
                                                        ),
                                                      ),
                                                    ),
                                                ],
                                              ),
                                              const SizedBox(height: 2),
                                              Row(
                                                children: [
                                                  if (rif.toString().isNotEmpty) ...[
                                                    Text(
                                                      'RIF: $rif',
                                                      style: GoogleFonts.inter(
                                                        fontSize: 11,
                                                        color: AppTheme.textSecondary,
                                                        fontWeight: FontWeight.w500,
                                                      ),
                                                    ),
                                                    if (dir.toString().isNotEmpty)
                                                      Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                                                  ],
                                                  if (dir.toString().isNotEmpty)
                                                    Expanded(
                                                      child: Text(
                                                        dir,
                                                        style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Icon(
                                          isSelected ? Icons.check_circle_rounded : Icons.arrow_forward_ios_rounded,
                                          size: isSelected ? 18 : 14,
                                          color: isSelected ? AppTheme.emeraldGreen : AppTheme.textMuted,
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
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

  void _onAgregarPotrero(List<Hato> allHatos) async {
    if (_tenants.isEmpty) {
      await _loadTenants();
    }
    if (!mounted) return;
    Map<String, dynamic>? chosenTenant;
    int currentStep = 1; // 1 = Elegir Adquiriente, 2 = Elegir Hato del Adquiriente
    String filterText = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(color: AppTheme.cardBorder),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filteredTenants = _tenants.where((t) {
              if (filterText.isEmpty) return true;
              final q = filterText.toLowerCase();
              final name = (t['nombre'] ?? '').toString().toLowerCase();
              final rif = (t['rif_identificacion'] ?? '').toString().toLowerCase();
              final dir = (t['direccion'] ?? '').toString().toLowerCase();
              return name.contains(q) || rif.contains(q) || dir.contains(q);
            }).toList();

            List<Hato> tenantHatos = [];
            if (chosenTenant != null) {
              final rawId = chosenTenant!['id'];
              final tId = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '1') ?? 1;
              tenantHatos = allHatos.where((h) => h.tenantId == tId || (tId == 1 && h.tenantId == null)).toList();
            }

            return SafeArea(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle superior
                    Center(
                      child: Container(
                        width: 42,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),

                    // ==========================================
                    // PASO 1: SELECCIONAR ADQUIRIENTE REGISTRADO
                    // ==========================================
                    if (currentStep == 1) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(7),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(Icons.domain_rounded, color: AppTheme.primaryCyan, size: 20),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'AGREGAR POTRERO: PASO 1/2',
                                        style: GoogleFonts.outfit(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.primaryCyan,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Selecciona el adquiriente para ver los hatos registrados donde se trazará el potrero:',
                                  style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 20),
                            onPressed: () => Navigator.pop(sheetCtx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Buscador
                      TextField(
                        onChanged: (v) => setSheetState(() => filterText = v),
                        style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: AppTheme.surfaceLight,
                          isDense: true,
                          hintText: 'Buscar adquiriente por nombre, RIF o ubicación...',
                          hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 11),
                          prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted, size: 18),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.cardBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.cardBorder),
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Subtítulo
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'ADQUIRIENTES DISPONIBLES (${filteredTenants.length})',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textMuted,
                              letterSpacing: 0.5,
                            ),
                          ),
                          InkWell(
                            onTap: () async {
                              await _loadTenants();
                              setSheetState(() {});
                            },
                            child: Row(
                              children: [
                                const Icon(Icons.refresh_rounded, size: 14, color: AppTheme.primaryCyan),
                                const SizedBox(width: 4),
                                Text(
                                  'Actualizar',
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.primaryCyan,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Lista de Adquirientes
                      Flexible(
                        child: filteredTenants.isEmpty
                            ? Container(
                                padding: const EdgeInsets.symmetric(vertical: 24),
                                alignment: Alignment.center,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.search_off_rounded, size: 36, color: AppTheme.textMuted),
                                    const SizedBox(height: 8),
                                    Text(
                                      'No se encontraron adquirientes',
                                      style: GoogleFonts.outfit(fontSize: 13, color: AppTheme.textSecondary),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                itemCount: filteredTenants.length,
                                separatorBuilder: (_, index) => const SizedBox(height: 8),
                                itemBuilder: (context, idx) {
                                  final tenant = filteredTenants[idx];
                                  final rawTId = tenant['id'];
                                  final tId = rawTId is int ? rawTId : int.tryParse(rawTId?.toString() ?? '1') ?? 1;
                                  final countHatos = allHatos.where((h) => h.tenantId == tId || (tId == 1 && h.tenantId == null)).length;
                                  final nombre = tenant['nombre'] ?? 'Sin Nombre';
                                  final rif = tenant['rif_identificacion'] ?? '';
                                  final dir = tenant['direccion'] ?? '';

                                  return InkWell(
                                    onTap: () {
                                      setSheetState(() {
                                        chosenTenant = tenant;
                                        currentStep = 2;
                                        filterText = '';
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(14),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      decoration: BoxDecoration(
                                        color: AppTheme.surfaceLight,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(color: AppTheme.cardBorder),
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 40,
                                            height: 40,
                                            decoration: BoxDecoration(
                                              color: AppTheme.primaryCyan.withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(color: AppTheme.primaryCyan.withValues(alpha: 0.3)),
                                            ),
                                            child: const Center(
                                              child: Icon(Icons.domain_rounded, color: AppTheme.primaryCyan, size: 20),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  nombre,
                                                  style: GoogleFonts.outfit(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.w700,
                                                    color: AppTheme.textPrimary,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Row(
                                                  children: [
                                                    if (rif.toString().isNotEmpty) ...[
                                                      Text(
                                                        'RIF: $rif',
                                                        style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                                                      ),
                                                      Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                                                    ],
                                                    Text(
                                                      countHatos == 0 ? 'Sin hatos aún' : '$countHatos ${countHatos == 1 ? "hato" : "hatos"}',
                                                      style: GoogleFonts.inter(
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.w700,
                                                        color: countHatos > 0 ? AppTheme.emeraldGreen : AppTheme.warningAmber,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                if (dir.toString().isNotEmpty)
                                                  Text(
                                                    dir,
                                                    style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                              ],
                                            ),
                                          ),
                                          const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.primaryCyan),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ]

                    // ==========================================
                    // PASO 2: SELECCIONAR HATO DE ESE ADQUIRIENTE
                    // ==========================================
                    else ...[
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_ios_rounded, color: AppTheme.primaryCyan, size: 18),
                            onPressed: () {
                              setSheetState(() {
                                currentStep = 1;
                                chosenTenant = null;
                              });
                            },
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'HATOS DE: ${(chosenTenant?["nombre"] ?? "").toString().toUpperCase()}',
                                  style: GoogleFonts.outfit(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.primaryCyan,
                                    letterSpacing: 0.5,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  'Paso 2/2: Selecciona el Hato donde se trazará el potrero:',
                                  style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 20),
                            onPressed: () => Navigator.pop(sheetCtx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Caso A: El Adquiriente seleccionado no tiene hatos
                      if (tenantHatos.isEmpty) ...[
                        Container(
                          padding: const EdgeInsets.all(22),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceLight,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.4)),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.terrain_rounded, size: 44, color: AppTheme.warningAmber),
                              const SizedBox(height: 12),
                              Text(
                                'Este adquiriente no tiene Hatos aún',
                                style: GoogleFonts.outfit(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Para crear un potrero interno primero debes trazar el Hato Maestro (lindero exterior legal) para ${chosenTenant?["nombre"] ?? "este productor"}.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary),
                              ),
                              const SizedBox(height: 18),
                              ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.pop(sheetCtx);
                                  setState(() {
                                    _selectedTenant = chosenTenant;
                                  });
                                  final chosenId = chosenTenant?['id'];
                                  final tId = chosenId is int ? chosenId : int.tryParse(chosenId?.toString() ?? '1') ?? 1;
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => HatoDrawingScreen(
                                        drawingType: DrawingType.hato,
                                        tenantId: tId,
                                        tenantNombre: chosenTenant?['nombre'] as String?,
                                      ),
                                    ),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.warningAmber,
                                  foregroundColor: Colors.black,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                ),
                                icon: const Icon(Icons.add, size: 16),
                                label: Text(
                                  'Crear Hato Maestro para ${chosenTenant?["nombre"] ?? ""}',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        // Caso B: Lista de Hatos de ese Adquiriente
                        Flexible(
                          child: ListView.separated(
                            shrinkWrap: true,
                            itemCount: tenantHatos.length,
                            separatorBuilder: (_, index) => const SizedBox(height: 8),
                            itemBuilder: (context, idx) {
                              final hato = tenantHatos[idx];
                              final nextLetter = String.fromCharCode(65 + hato.potreros.length);

                              return InkWell(
                                onTap: () {
                                  Navigator.pop(sheetCtx);
                                  setState(() {
                                    _selectedTenant = chosenTenant;
                                  });
                                  final chosenId = chosenTenant?['id'];
                                  final tId = chosenId is int ? chosenId : int.tryParse(chosenId?.toString() ?? '1') ?? 1;
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => HatoDrawingScreen(
                                        drawingType: DrawingType.potrero,
                                        parentHato: hato,
                                        tenantId: tId,
                                        tenantNombre: chosenTenant?['nombre'] as String?,
                                      ),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.surfaceLight,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: AppTheme.cardBorder),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: AppTheme.warningAmber.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.4)),
                                        ),
                                        child: const Center(
                                          child: Icon(Icons.terrain, color: AppTheme.warningAmber, size: 20),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              hato.nombre,
                                              style: GoogleFonts.outfit(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700,
                                                color: AppTheme.textPrimary,
                                              ),
                                            ),
                                            Text(
                                              '${hato.areaHa.toStringAsFixed(1)} Ha • ${hato.potreros.length} potreros (Siguiente: Potrero $nextLetter)',
                                              style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.primaryCyan),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  @override
  Widget build(BuildContext context) {
    final agro = context.watch<AgroProvider>();
    final hatos = agro.hatos;

    final double totalHectares = hatos.fold(0.0, (sum, h) => sum + h.areaHa);
    final int totalPotreros = hatos.fold(0, (sum, h) => sum + h.potreros.length);

    List<Hato> tenantHatos = [];
    double adquirienteHa = 0.0;
    int adquirientePotreros = 0;
    List<Hato> filteredTenantHatos = [];

    if (_selectedAdquiriente != null) {
      tenantHatos = _getHatosForTenant(_selectedAdquiriente!, hatos);
      adquirienteHa = tenantHatos.fold(0.0, (sum, h) => sum + h.areaHa);
      adquirientePotreros = tenantHatos.fold(0, (sum, h) => sum + h.potreros.length);

      filteredTenantHatos = tenantHatos.where((h) {
        if (_searchQuery.isEmpty) return true;
        final q = _searchQuery.toLowerCase();
        final matchHato = h.nombre.toLowerCase().contains(q);
        final matchPotrero = h.potreros.any((p) => p.nombre.toLowerCase().contains(q));
        return matchHato || matchPotrero;
      }).toList();
    }

    final filteredTenants = _tenants.where((t) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (t['nombre'] ?? '').toString().toLowerCase();
      final rif = (t['rif_identificacion'] ?? t['documento'] ?? '').toString().toLowerCase();
      final dir = (t['direccion'] ?? '').toString().toLowerCase();
      final tHatos = _getHatosForTenant(t, hatos);
      final hasMatchingHato = tHatos.any((h) =>
          h.nombre.toLowerCase().contains(q) ||
          h.potreros.any((p) => p.nombre.toLowerCase().contains(q)));
      return name.contains(q) || rif.contains(q) || dir.contains(q) || hasMatchingHato;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () {
            if (_selectedAdquiriente != null) {
              setState(() {
                _selectedAdquiriente = null;
                _searchQuery = '';
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'HATOS MAESTROS & POTREROS',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppTheme.primaryCyan,
                letterSpacing: 0.6,
              ),
            ),
            Text(
              _selectedAdquiriente != null
                  ? 'Adquiriente: ${_selectedAdquiriente!['nombre']}'
                  : 'Directorio de Adquirientes (${_tenants.length})',
              style: GoogleFonts.inter(
                fontSize: 10,
                color: _selectedAdquiriente != null ? AppTheme.emeraldGreen : AppTheme.textMuted,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded, color: AppTheme.emeraldGreen),
            tooltip: 'Sincronizar Geocercas',
            onPressed: () async {
              final activeTenantId = _selectedAdquiriente != null
                  ? _getTenantId(_selectedAdquiriente!)
                  : (_selectedTenant != null ? _getTenantId(_selectedTenant!) : 1);
              final result = await agro.syncBidirectional(tenantId: activeTenantId);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppTheme.emeraldGreen,
                    content: Text(
                      '🔄 Sincronización exitosa:\n• Hatos sincronizados: ${result['uploadedHatos']}\n• Potreros sincronizados: ${result['uploadedPotreros']}\n• Total hatos en servidor: ${result['totalHatos']}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                    ),
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ==========================================
              // 1. DOS BOTONES PRINCIPALES DE ACCIÓN
              // ==========================================
              Row(
                children: [
                  // Botón 1: Agregar Hato
                  Expanded(
                    child: _buildMainActionButton(
                      title: 'Agregar Hato',
                      subtitle: _selectedAdquiriente != null
                          ? 'Para ${_selectedAdquiriente!["nombre"]}'
                          : 'Lindero Legal Exterior',
                      icon: Icons.terrain_rounded,
                      color: AppTheme.warningAmber,
                      onTap: _onAgregarHato,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Botón 2: Agregar Potrero
                  Expanded(
                    child: _buildMainActionButton(
                      title: 'Agregar Potrero',
                      subtitle: _selectedAdquiriente != null
                          ? 'En este Adquiriente'
                          : 'División Interna',
                      icon: Icons.grid_view_rounded,
                      color: AppTheme.primaryCyan,
                      onTap: () => _onAgregarPotrero(hatos),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // ==========================================
              // 2. RESUMEN DE SUPERFICIE
              // ==========================================
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatCol(
                      'SUPERFICIE',
                      _selectedAdquiriente != null
                          ? '${adquirienteHa.toStringAsFixed(1)} Ha'
                          : '${totalHectares.toStringAsFixed(1)} Ha',
                      AppTheme.emeraldGreen,
                    ),
                    Container(width: 1, height: 30, color: AppTheme.cardBorder),
                    if (_selectedAdquiriente == null) ...[
                      _buildStatCol('ADQUIRIENTES', '${_tenants.length}', AppTheme.emeraldGreen),
                      Container(width: 1, height: 30, color: AppTheme.cardBorder),
                    ],
                    _buildStatCol(
                      'HATOS',
                      _selectedAdquiriente != null ? '${tenantHatos.length}' : '${hatos.length}',
                      AppTheme.warningAmber,
                    ),
                    Container(width: 1, height: 30, color: AppTheme.cardBorder),
                    _buildStatCol(
                      'POTREROS',
                      _selectedAdquiriente != null ? '$adquirientePotreros' : '$totalPotreros',
                      AppTheme.primaryCyan,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // ==========================================
              // 3. VISTA JERÁRQUICA: ADQUIRIENTES O HATOS
              // ==========================================
              if (_selectedAdquiriente == null) ...[
                // --- NIVEL 1: LISTADO DE ADQUIRIENTES REGISTRADOS ---
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'ADQUIRIENTES REGISTRADOS',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textSecondary,
                        letterSpacing: 0.6,
                      ),
                    ),
                    Text(
                      '${filteredTenants.length} disponibles',
                      style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Selecciona un adquiriente para ver sus hatos y potreros asociados:',
                  style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 10),

                // Buscador de Adquirientes
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppTheme.surface,
                    hintText: 'Buscar adquiriente por nombre, RIF o ubicación...',
                    hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 12),
                    prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted, size: 18),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.cardBorder),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
                const SizedBox(height: 14),

                if (filteredTenants.isEmpty)
                  _buildEmptyTenantsState()
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredTenants.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final tenant = filteredTenants[idx];
                      return _buildAdquirienteCard(tenant, hatos, agro);
                    },
                  ),
              ] else ...[
                // --- NIVEL 2: BREADCRUMB & HATOS DEL ADQUIRIENTE SELECCIONADO ---
                _buildBreadcrumbBar(),
                const SizedBox(height: 12),
                _buildSelectedAdquirienteHeader(_selectedAdquiriente!, tenantHatos),
                const SizedBox(height: 16),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'HATOS DE ESTE ADQUIRIENTE (${tenantHatos.length})',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textSecondary,
                        letterSpacing: 0.6,
                      ),
                    ),
                    Text(
                      'Toca un hato para ver sus potreros',
                      style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Buscador de Hatos dentro del Adquiriente
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppTheme.surface,
                    hintText: 'Buscar hato o potrero (A, B, C...)...',
                    hintStyle: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 12),
                    prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted, size: 18),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.cardBorder),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
                const SizedBox(height: 14),

                if (filteredTenantHatos.isEmpty)
                  _buildEmptyHatosStateForTenant(_selectedAdquiriente!)
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredTenantHatos.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 12),
                    itemBuilder: (context, idx) {
                      final hato = filteredTenantHatos[idx];
                      return _buildHatoCard(hato, agro, _selectedAdquiriente!);
                    },
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBreadcrumbBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () => setState(() {
              _selectedAdquiriente = null;
              _searchQuery = '';
            }),
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              child: Row(
                children: [
                  const Icon(Icons.arrow_back_ios_new_rounded, size: 12, color: AppTheme.primaryCyan),
                  const SizedBox(width: 4),
                  Text(
                    'Adquirientes',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primaryCyan),
                  ),
                ],
              ),
            ),
          ),
          const Icon(Icons.chevron_right_rounded, size: 16, color: AppTheme.textMuted),
          Expanded(
            child: Text(
              _selectedAdquiriente!['nombre']?.toString() ?? '',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedAdquirienteHeader(Map<String, dynamic> tenant, List<Hato> tenantHatos) {
    final totalPotreros = tenantHatos.fold(0, (sum, h) => sum + h.potreros.length);
    final totalHa = tenantHatos.fold(0.0, (sum, h) => sum + h.areaHa);
    final nombre = tenant['nombre']?.toString() ?? 'Sin Nombre';
    final rif = tenant['rif_identificacion']?.toString() ?? tenant['documento']?.toString() ?? '';
    final dir = tenant['direccion']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.emeraldGreen.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.emeraldGreen.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppTheme.emeraldGreen.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.emeraldGreen.withValues(alpha: 0.4)),
                ),
                child: const Center(
                  child: Icon(Icons.domain_rounded, color: AppTheme.emeraldGreen, size: 20),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      nombre,
                      style: GoogleFonts.outfit(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    if (rif.isNotEmpty || dir.isNotEmpty)
                      Text(
                        '${rif.isNotEmpty ? "RIF: $rif" : ""}${rif.isNotEmpty && dir.isNotEmpty ? " • " : ""}$dir',
                        style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildPillBadge(
                icon: Icons.terrain_rounded,
                text: '${tenantHatos.length} Hatos',
                color: AppTheme.warningAmber,
              ),
              const SizedBox(width: 6),
              _buildPillBadge(
                icon: Icons.grid_view_rounded,
                text: '$totalPotreros Potreros',
                color: AppTheme.primaryCyan,
              ),
              const SizedBox(width: 6),
              _buildPillBadge(
                icon: Icons.square_foot_rounded,
                text: '${totalHa.toStringAsFixed(1)} Ha',
                color: AppTheme.emeraldGreen,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAdquirienteCard(Map<String, dynamic> tenant, List<Hato> allHatos, AgroProvider agro) {
    final tenantHatos = _getHatosForTenant(tenant, allHatos);
    final totalPotreros = tenantHatos.fold(0, (sum, h) => sum + h.potreros.length);
    final totalHa = tenantHatos.fold(0.0, (sum, h) => sum + h.areaHa);
    final nombre = tenant['nombre']?.toString() ?? 'Sin Nombre';
    final rif = tenant['rif_identificacion']?.toString() ?? tenant['documento']?.toString() ?? '';
    final dir = tenant['direccion']?.toString() ?? '';

    return InkWell(
      onTap: () {
        setState(() {
          _selectedAdquiriente = tenant;
          _selectedTenant = tenant;
          _searchQuery = '';
        });
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.cardBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.emeraldGreen.withValues(alpha: 0.3)),
                  ),
                  child: const Center(
                    child: Icon(Icons.business_rounded, color: AppTheme.emeraldGreen, size: 22),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        nombre,
                        style: GoogleFonts.outfit(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (rif.isNotEmpty) ...[
                            Text(
                              'RIF: $rif',
                              style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                            ),
                            if (dir.isNotEmpty)
                              const Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                          ],
                          if (dir.isNotEmpty)
                            Expanded(
                              child: Text(
                                dir,
                                style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppTheme.emeraldGreen),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(color: AppTheme.cardBorder, height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    _buildPillBadge(
                      icon: Icons.terrain_rounded,
                      text: '${tenantHatos.length} ${tenantHatos.length == 1 ? "Hato" : "Hatos"}',
                      color: tenantHatos.isNotEmpty ? AppTheme.warningAmber : AppTheme.textMuted,
                    ),
                    const SizedBox(width: 6),
                    _buildPillBadge(
                      icon: Icons.grid_view_rounded,
                      text: '$totalPotreros ${totalPotreros == 1 ? "Potrero" : "Potreros"}',
                      color: totalPotreros > 0 ? AppTheme.primaryCyan : AppTheme.textMuted,
                    ),
                    const SizedBox(width: 6),
                    _buildPillBadge(
                      icon: Icons.square_foot_rounded,
                      text: '${totalHa.toStringAsFixed(1)} Ha',
                      color: totalHa > 0 ? AppTheme.emeraldGreen : AppTheme.textMuted,
                    ),
                  ],
                ),
                Text(
                  'Ver Hatos ›',
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.emeraldGreen),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPillBadge({required IconData icon, required String text, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildMainActionButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withValues(alpha: 0.5), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.12),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.18),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.outfit(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCol(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w800, color: color),
        ),
      ],
    );
  }

  Widget _buildEmptyTenantsState() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.domain_disabled_rounded, size: 48, color: AppTheme.textMuted),
            const SizedBox(height: 12),
            Text(
              'No se encontraron adquirientes',
              style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              'Los adquirientes se registran en el portal web administrativo.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: () => _loadTenants(),
              icon: const Icon(Icons.refresh_rounded, size: 16, color: AppTheme.primaryCyan),
              label: Text('Actualizar lista', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.primaryCyan)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyHatosStateForTenant(Map<String, dynamic> tenant) {
    final tId = _getTenantId(tenant);
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.4)),
      ),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.terrain_outlined, size: 48, color: AppTheme.warningAmber),
            const SizedBox(height: 12),
            Text(
              'Sin hatos registrados aún',
              style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              'Este adquiriente no tiene hatos maestros creados. Traza el lindero legal exterior para comenzar.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => HatoDrawingScreen(
                      drawingType: DrawingType.hato,
                      tenantId: tId,
                      tenantNombre: tenant['nombre'] as String?,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.warningAmber,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              icon: const Icon(Icons.add, size: 16),
              label: Text(
                'Crear Hato Maestro para ${tenant["nombre"] ?? ""}',
                style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHatoCard(Hato hato, AgroProvider agro, Map<String, dynamic> tenant) {
    final tId = _getTenantId(tenant);
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: true,
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          leading: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.warningAmber.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.4)),
            ),
            child: const Center(
              child: Icon(Icons.terrain, color: AppTheme.warningAmber, size: 18),
            ),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  hato.nombre,
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${hato.areaHa.toStringAsFixed(1)} Ha',
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.emeraldGreen),
                ),
              ),
            ],
          ),
          subtitle: Text(
            '${hato.potreros.length} potreros | Alarma: ${hato.warningWidthM.toInt()} m | ${hato.vertices.length} vértices',
            style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textSecondary),
          ),
          children: [
            const Divider(color: AppTheme.cardBorder, height: 1),

            // Lista de Potreros Hijos (NIVEL 3)
            if (hato.potreros.isEmpty)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 16, color: AppTheme.textMuted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Sin potreros internos aún. Presiona "+ Añadir Potrero" para crearlos.',
                        style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ),
                  ],
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Column(
                  children: hato.potreros.map((potrero) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.cardBorder),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: AppTheme.primaryCyan.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                potrero.nombre.replaceAll('Potrero ', '').trim(),
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.primaryCyan,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  potrero.nombre,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                if (potrero.notas != null && potrero.notas!.isNotEmpty)
                                  Text(
                                    potrero.notas!,
                                    style: GoogleFonts.inter(fontSize: 10, color: AppTheme.textMuted),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            '${potrero.areaHa.toStringAsFixed(2)} Ha',
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.emeraldGreen,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 16, color: AppTheme.dangerRed),
                            tooltip: 'Eliminar Potrero',
                            onPressed: () async {
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  backgroundColor: AppTheme.surface,
                                  title: Text('¿Eliminar ${potrero.nombre}?', style: GoogleFonts.outfit(color: AppTheme.textPrimary)),
                                  content: Text('Esta acción eliminará el potrero del hato.', style: GoogleFonts.inter(color: AppTheme.textSecondary)),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.dangerRed),
                                      onPressed: () => Navigator.pop(ctx, true),
                                      child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
                                    ),
                                  ],
                                ),
                              );
                              if (confirm == true) {
                                await agro.deletePotrero(hato.id, potrero.id);
                              }
                            },
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),

            // Barra de Botones Inferior del Hato
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => HatoDrawingScreen(
                            drawingType: DrawingType.potrero,
                            parentHato: hato,
                            tenantId: tId,
                            tenantNombre: tenant['nombre'] as String?,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add, size: 14, color: AppTheme.primaryCyan),
                    label: Text(
                      '+ Añadir Potrero',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primaryCyan),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_sweep_outlined, size: 18, color: AppTheme.textMuted),
                    tooltip: 'Eliminar Hato',
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: AppTheme.surface,
                          title: Text('¿Eliminar "${hato.nombre}"?', style: GoogleFonts.outfit(color: AppTheme.textPrimary)),
                          content: Text('Se eliminarán también todos los potreros asociados a este hato.', style: GoogleFonts.inter(color: AppTheme.textSecondary)),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.dangerRed),
                              onPressed: () => Navigator.pop(ctx, true),
                              child: const Text('Eliminar Todo', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await agro.deleteHato(hato.id);
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
