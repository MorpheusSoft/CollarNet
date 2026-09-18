import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/ops_provider.dart';
import '../services/api_service.dart';
import '../services/update_service.dart';
import '../theme/app_theme.dart';
import 'main_menu_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _userCtrl = TextEditingController(text: 'admin@collarnet.com');
  final TextEditingController _passCtrl = TextEditingController(text: 'admin123');
  final TextEditingController _serverCtrl = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;
  bool _showServerConfig = false;
  String _serverStatus = 'Verificando...';
  bool _isServerOk = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentServer();
  }

  Future<void> _loadCurrentServer() async {
    final url = await ApiService.getBaseUrl();
    if (mounted) {
      setState(() {
        _serverCtrl.text = url;
      });
      _testServerConnection();
    }
  }

  Future<void> _testServerConnection() async {
    final health = await ApiService().checkServerHealth();
    if (mounted) {
      setState(() {
        _isServerOk = health['online'] == true;
        _serverStatus = _isServerOk
            ? 'Cloud VPS Activo (${health['latencyMs']}ms)'
            : 'Sin conexión al VPS';
      });
      if (_isServerOk) {
        UpdateService().checkForUpdates(context, manual: false);
      }
    }
  }

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    _serverCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final user = _userCtrl.text.trim();
    final pass = _passCtrl.text.trim();

    if (user.isEmpty || pass.isEmpty) {
      setState(() {
        _errorMessage = 'Por favor ingresa usuario y contraseña.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final ops = context.read<OpsProvider>();

    // Actualizar URL personalizada si se modificó
    if (_serverCtrl.text.trim().isNotEmpty) {
      await ApiService.setCustomBaseUrl(_serverCtrl.text.trim());
    }

    final res = await ops.login(user, pass);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (res['success'] == true) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainMenuScreen()),
      );
    } else {
      setState(() {
        _errorMessage = res['error'] ?? 'Error de autenticación. Verifica tus credenciales.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ops = context.watch<OpsProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // 1. Logo / Ícono CowIA
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppTheme.primaryGradient,
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryCyan.withValues(alpha: 0.35),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(Icons.satellite_alt_rounded, color: Colors.white, size: 40),
                  ),
                ),
                const SizedBox(height: 18),

                // 2. Títulos
                Text(
                  'CowIA Ops',
                  style: GoogleFonts.outfit(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Suite Técnica de Despliegue & Telemetría',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),

                // Indicador de Conexión VPS
                InkWell(
                  onTap: () {
                    setState(() => _showServerConfig = !_showServerConfig);
                    _testServerConnection();
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _isServerOk
                          ? AppTheme.emeraldGreen.withValues(alpha: 0.12)
                          : AppTheme.dangerRed.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _isServerOk
                            ? AppTheme.emeraldGreen.withValues(alpha: 0.4)
                            : AppTheme.dangerRed.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isServerOk ? AppTheme.emeraldGreen : AppTheme.dangerRed,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _serverStatus,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _isServerOk ? AppTheme.emeraldGreen : AppTheme.dangerRed,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          _showServerConfig ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                          size: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Banner de sesión expirada por inactividad
                if (ops.sessionExpiredReason != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.warningAmber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.warningAmber.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_off_outlined, color: AppTheme.warningAmber, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            ops.sessionExpiredReason!,
                            style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Tarjeta de Formulario
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Configuración opcional de servidor
                      if (_showServerConfig) ...[
                        Text(
                          'DIRECCIÓN SERVIDOR (VPS)',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryCyan,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _serverCtrl,
                          style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textPrimary),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: AppTheme.surfaceLight,
                            prefixIcon: const Icon(Icons.cloud_outlined, color: AppTheme.primaryCyan, size: 18),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.refresh, size: 18, color: AppTheme.textSecondary),
                              onPressed: _testServerConnection,
                            ),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Campo Usuario / Email
                      Text(
                        'USUARIO O CORREO',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _userCtrl,
                        keyboardType: TextInputType.emailAddress,
                        style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'admin@collarnet.com',
                          hintStyle: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
                          filled: true,
                          fillColor: AppTheme.surfaceLight,
                          prefixIcon: const Icon(Icons.person_outline, color: AppTheme.primaryCyan, size: 20),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Campo Contraseña
                      Text(
                        'CONTRASEÑA',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textSecondary,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passCtrl,
                        obscureText: _obscurePassword,
                        style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textPrimary),
                        onSubmitted: (_) => _handleLogin(),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          hintStyle: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
                          filled: true,
                          fillColor: AppTheme.surfaceLight,
                          prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.primaryCyan, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: AppTheme.textMuted,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Mensaje de Error
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.dangerRed.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppTheme.dangerRed.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: AppTheme.dangerRed, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: GoogleFonts.inter(fontSize: 12, color: AppTheme.dangerRed),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Botón Ingresar
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryCyan,
                            foregroundColor: Colors.black,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.login_rounded, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'INGRESAR A SUITE TÉCNICA',
                                      style: GoogleFonts.outfit(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Nota de seguridad y temporizador
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.shield_outlined, size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      'Cierre automático tras 20 min de inactividad',
                      style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () => UpdateService().checkForUpdates(context, manual: true),
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.system_update_rounded, size: 14, color: AppTheme.primaryCyan),
                        const SizedBox(width: 6),
                        Text(
                          'Buscar Actualizaciones OTA',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppTheme.primaryCyan,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
