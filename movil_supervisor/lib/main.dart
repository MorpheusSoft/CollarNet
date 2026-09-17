import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/agro_provider.dart';
import 'providers/drawing_provider.dart';
import 'providers/finca_state_provider.dart';
import 'screens/finca_main_menu_screen.dart';
import 'screens/login_screen.dart';
import 'theme/finca_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Estilo de barra de estado de alto contraste
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF04120C),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const CowIAFincaApp());
}

class CowIAFincaApp extends StatelessWidget {
  const CowIAFincaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => FincaStateProvider()),
        ChangeNotifierProvider(create: (_) => AgroProvider()),
        ChangeNotifierProvider(create: (_) => DrawingProvider()),
      ],
      child: MaterialApp(
        title: 'CowIA Finca - Gestión Ganadera',
        debugShowCheckedModeBanner: false,
        themeMode: ThemeMode.dark,
        theme: FincaTheme.themeData,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final fincaState = context.watch<FincaStateProvider>();

    if (!fincaState.isAuthLoaded) {
      return const Scaffold(
        backgroundColor: FincaTheme.bgDark,
        body: Center(
          child: CircularProgressIndicator(
            color: FincaTheme.primaryGreen,
          ),
        ),
      );
    }

    if (fincaState.isAuthenticated) {
      return const FincaMainMenuScreen();
    }

    return const LoginScreen();
  }
}

