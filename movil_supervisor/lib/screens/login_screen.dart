import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/finca_state_provider.dart';
import '../theme/finca_theme.dart';
import 'finca_main_menu_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _userCtrl = TextEditingController();
  final TextEditingController _passCtrl = TextEditingController();
  final TextEditingController _serverIpCtrl = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _rememberMe = false;
  String? _errorMessage;
  bool _showAdvancedConfig = false;
  bool _isServerOnline = false;
  String _serverStatus = 'Verificando...';

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  Future<void> _testServerConnection() async {
    final health = await context.read<FincaStateProvider>().checkServerHealth();
    if (mounted) {
      setState(() {
        _isServerOnline = health['online'] == true;
        _serverStatus = _isServerOnline
            ? '🟢 Conectado (${health['latencyMs']}ms)'
            : '🔴 Desconectado / Offline';
      });
    }
  }

  Future<void> _loadSavedCredentials() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final remember = prefs.getBool('finca_remember_me') ?? false;
      final savedUser = prefs.getString('finca_saved_user') ?? '';
      
      if (mounted) {
        setState(() {
          _rememberMe = remember;
          if (remember && savedUser.isNotEmpty) {
            _userCtrl.text = savedUser;
          }
        });
      }

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          final state = context.read<FincaStateProvider>();
          _serverIpCtrl.text = state.serverIp;
          _testServerConnection();
        }
      });
    } catch (_) {}
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
        _errorMessage = 'Por favor ingresa tu usuario o correo y contraseña.';
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
      // Guardar o limpiar preferencia de "Recordar mis datos"
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('finca_remember_me', _rememberMe);
        if (_rememberMe) {
          await prefs.setString('finca_saved_user', user);
        } else {
          await prefs.remove('finca_saved_user');
        }
      } catch (_) {}

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

  void _fillAndLogin(String user, String pass) {
    setState(() {
      _userCtrl.text = user;
      _passCtrl.text = pass;
      _errorMessage = null;
    });
    _handleLogin();
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
                      const SizedBox(height: 10),

                      // Switch / Checkbox Recordar mis datos
                      InkWell(
                        onTap: () => setState(() => _rememberMe = !_rememberMe),
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 22,
                                height: 22,
                                child: Checkbox(
                                  value: _rememberMe,
                                  activeColor: FincaTheme.primaryGreen,
                                  checkColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  side: const BorderSide(color: FincaTheme.textMuted, width: 1.5),
                                  onChanged: (val) => setState(() => _rememberMe = val ?? false),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Recordar mis datos',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: FincaTheme.textLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
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

                // 3. Accesos Rápidos de 1-Toque (Demostración / Offline)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: FincaTheme.borderCard),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.flash_on_rounded, color: FincaTheme.accentGreenLight, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'ACCESO RÁPIDO DIRECTO (1-TOQUE)',
                            style: TextStyle(
                              color: FincaTheme.accentGreenLight,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ActionChip(
                            avatar: const Icon(Icons.person, size: 16, color: Colors.black),
                            label: const Text('David (Supervisor)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black)),
                            backgroundColor: FincaTheme.primaryGreen,
                            onPressed: () => _fillAndLogin('david', '12345678'),
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.manage_accounts, size: 16, color: FincaTheme.accentGreenLight),
                            label: const Text('Gerente Finca', style: TextStyle(fontSize: 12, color: FincaTheme.textLight)),
                            backgroundColor: FincaTheme.bgCardElevated,
                            side: const BorderSide(color: FincaTheme.borderCard),
                            onPressed: () => _fillAndLogin('finca', 'finca123'),
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.admin_panel_settings, size: 16, color: FincaTheme.warningAmber),
                            label: const Text('Admin General', style: TextStyle(fontSize: 12, color: FincaTheme.textLight)),
                            backgroundColor: FincaTheme.bgCardElevated,
                            side: const BorderSide(color: FincaTheme.borderCard),
                            onPressed: () => _fillAndLogin('admin', 'admin123'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 4. Configuración de Servidor IP (Desplegable y Preset Directo)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: FincaTheme.bgCard,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _isServerOnline ? FincaTheme.primaryGreen.withOpacity(0.5) : FincaTheme.warningAmber.withOpacity(0.5),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _isServerOnline ? Icons.check_circle : Icons.error_outline,
                                color: _isServerOnline ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                _serverStatus,
                                style: TextStyle(
                                  color: _isServerOnline ? FincaTheme.accentGreenLight : FincaTheme.warningAmber,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          InkWell(
                            onTap: () => setState(() => _showAdvancedConfig = !_showAdvancedConfig),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              child: Row(
                                children: [
                                  Text(
                                    _showAdvancedConfig ? 'Ocultar' : 'Cambiar IP',
                                    style: const TextStyle(color: FincaTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                  Icon(
                                    _showAdvancedConfig ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                    color: FincaTheme.textMuted,
                                    size: 16,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_showAdvancedConfig) ...[
                        const SizedBox(height: 10),
                        const Divider(color: FincaTheme.borderCard, height: 1),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _serverIpCtrl,
                          style: const TextStyle(color: FincaTheme.textLight, fontSize: 13),
                          decoration: InputDecoration(
                            labelText: 'IP / Host Servidor',
                            labelStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 12),
                            hintText: 'www.cowai.net',
                            hintStyle: const TextStyle(color: FincaTheme.textMuted, fontSize: 12),
                            prefixIcon: const Icon(Icons.dns_rounded, color: FincaTheme.accentGreenLight, size: 18),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.refresh, color: FincaTheme.accentGreenLight, size: 18),
                              onPressed: () async {
                                if (_serverIpCtrl.text.trim().isNotEmpty) {
                                  await context.read<FincaStateProvider>().updateServerIp(_serverIpCtrl.text.trim());
                                }
                                _testServerConnection();
                              },
                            ),
                            filled: true,
                            fillColor: FincaTheme.bgCardElevated,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: FincaTheme.borderCard),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          onSubmitted: (val) async {
                            if (val.trim().isNotEmpty) {
                              await context.read<FincaStateProvider>().updateServerIp(val.trim());
                            }
                            _testServerConnection();
                          },
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const Text('Presets: ', style: TextStyle(color: FincaTheme.textMuted, fontSize: 11)),
                            ActionChip(
                              label: const Text('Nube CowIA', style: TextStyle(fontSize: 10, color: FincaTheme.accentGreenLight, fontWeight: FontWeight.bold)),
                              backgroundColor: FincaTheme.bgCardElevated,
                              padding: EdgeInsets.zero,
                              onPressed: () async {
                                _serverIpCtrl.text = 'www.cowai.net';
                                await context.read<FincaStateProvider>().updateServerIp('www.cowai.net');
                                _testServerConnection();
                              },
                            ),
                            ActionChip(
                              label: const Text('Wi-Fi (86.243)', style: TextStyle(fontSize: 10, color: FincaTheme.primaryGreen, fontWeight: FontWeight.bold)),
                              backgroundColor: FincaTheme.bgCardElevated,
                              padding: EdgeInsets.zero,
                              onPressed: () async {
                                _serverIpCtrl.text = '192.168.86.243:3500';
                                await context.read<FincaStateProvider>().updateServerIp('192.168.86.243:3500');
                                _testServerConnection();
                              },
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

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
