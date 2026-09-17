import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';
import 'finca_main_menu_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _userCtrl = TextEditingController(text: 'david');
  final TextEditingController _passCtrl = TextEditingController(text: '12345678');
  final TextEditingController _serverIpCtrl = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;
  bool _showAdvancedConfig = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = context.read<FincaStateProvider>();
      _serverIpCtrl.text = state.serverIp;
    });
  }

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    _serverIpCtrl.dispose();
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

    final state = context.read<FincaStateProvider>();

    // Actualizar IP de servidor si fue modificada
    if (_serverIpCtrl.text.trim().isNotEmpty && _serverIpCtrl.text.trim() != state.serverIp) {
      await state.updateServerIp(_serverIpCtrl.text.trim());
    }

    final res = await state.login(user, pass);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: FincaTheme.primaryGreen,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Row(
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '¡Bienvenido, ${state.currentUserName}!',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 2),
        ),
      );

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const FincaMainMenuScreen()),
      );
    } else {
      setState(() {
        _errorMessage = res['error'] ?? 'Error de autenticación. Verifica tus credenciales.';
      });
    }
  }

  void _fillDemoCredentials() {
    setState(() {
      _userCtrl.text = 'david';
      _passCtrl.text = '12345678';
      _errorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FincaTheme.bgDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Logo & Identidad CowIA Supervisor
                Center(
                  child: Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          FincaTheme.primaryGreen.withOpacity(0.3),
                          FincaTheme.bgCard,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: FincaTheme.primaryGreen.withOpacity(0.6),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: FincaTheme.primaryGreen.withOpacity(0.2),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.agriculture_rounded,
                      color: FincaTheme.accentGreenLight,
                      size: 44,
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                const Text(
                  'CowIA Finca',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: FincaTheme.textLight,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Gestión Ganadera & Monitoreo de Campo',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: FincaTheme.textMuted,
                  ),
                ),
                const SizedBox(height: 28),

                // 2. Tarjeta Principal de Login
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: FincaTheme.borderCard),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.4),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'INICIAR SESIÓN',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: FincaTheme.accentGreenLight,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Campo Usuario / Email
                      const Text(
                        'Usuario o Correo Electrónico',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: FincaTheme.textLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _userCtrl,
                        style: const TextStyle(color: FincaTheme.textLight, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'ej. david o usuario@finca.com',
                          hintStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 13),
                          prefixIcon: const Icon(Icons.person_outline_rounded, color: FincaTheme.accentGreenLight, size: 20),
                          filled: true,
                          fillColor: FincaTheme.bgCardElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FincaTheme.borderCard),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FincaTheme.borderCard),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FincaTheme.primaryGreen, width: 1.5),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Campo Contraseña
                      const Text(
                        'Contraseña',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: FincaTheme.textLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passCtrl,
                        obscureText: _obscurePassword,
                        style: const TextStyle(color: FincaTheme.textLight, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          hintStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 13),
                          prefixIcon: const Icon(Icons.lock_outline_rounded, color: FincaTheme.accentGreenLight, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: FincaTheme.textMuted,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          filled: true,
                          fillColor: FincaTheme.bgCardElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FincaTheme.borderCard),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FincaTheme.borderCard),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FincaTheme.primaryGreen, width: 1.5),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        onSubmitted: (_) => _handleLogin(),
                      ),
                      const SizedBox(height: 12),

                      // Mensaje de Error
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: FincaTheme.errorCrimson.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: FincaTheme.errorCrimson.withOpacity(0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: FincaTheme.errorCrimson, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(color: FincaTheme.errorCrimson, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Botón Iniciar Sesión
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: FincaTheme.primaryGreen,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 4,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.login_rounded, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'INGRESAR AL SISTEMA',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 3. Chip de Credenciales de Prueba Rápida
                InkWell(
                  onTap: _fillDemoCredentials,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: FincaTheme.primaryGreen.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: FincaTheme.primaryGreen.withOpacity(0.25)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: FincaTheme.primaryGreen.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.flash_on_rounded, color: FincaTheme.accentGreenLight, size: 16),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Credenciales de Prueba',
                                style: TextStyle(
                                  color: FincaTheme.textLight,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                'Usuario: david | Clave: 12345678',
                                style: TextStyle(
                                  color: FincaTheme.accentGreenLight,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Text(
                          'Rellenar',
                          style: TextStyle(
                            color: FincaTheme.accentGreenLight,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // 4. Configuración de Servidor IP (Opcional / Desplegable)
                TextButton.icon(
                  onPressed: () => setState(() => _showAdvancedConfig = !_showAdvancedConfig),
                  icon: Icon(
                    _showAdvancedConfig ? Icons.keyboard_arrow_up : Icons.tune_rounded,
                    color: FincaTheme.textMuted,
                    size: 16,
                  ),
                  label: Text(
                    _showAdvancedConfig ? 'Ocultar conexión de servidor' : 'Configurar IP / Servidor',
                    style: const TextStyle(color: FincaTheme.textMuted, fontSize: 12),
                  ),
                ),

                if (_showAdvancedConfig) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: FincaTheme.bgCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: FincaTheme.borderCard),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Dirección del Servidor Backend',
                          style: TextStyle(fontSize: 11, color: FincaTheme.textMuted, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _serverIpCtrl,
                          style: const TextStyle(color: FincaTheme.textLight, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: '192.168.86.30:3500',
                            hintStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 12),
                            prefixIcon: const Icon(Icons.dns_rounded, color: FincaTheme.accentGreenLight, size: 18),
                            filled: true,
                            fillColor: FincaTheme.bgCardElevated,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: FincaTheme.borderCard),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                // 5. Nota Informativa
                const Text(
                  'Nota: Los usuarios, roles y permisos de acceso son creados y gestionados centralmente desde la plataforma web CollarNet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    color: FincaTheme.textMuted,
                    height: 1.4,
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
