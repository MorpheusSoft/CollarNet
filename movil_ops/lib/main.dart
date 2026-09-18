import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/agro_provider.dart';
import 'providers/drawing_provider.dart';
import 'providers/inventory_provider.dart';
import 'providers/ops_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_menu_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const CowIAOpsApp());
}

class CowIAOpsApp extends StatelessWidget {
  const CowIAOpsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => OpsProvider()),
        ChangeNotifierProvider(create: (_) => AgroProvider()),
        ChangeNotifierProvider(create: (_) => DrawingProvider()),
        ChangeNotifierProvider(create: (_) => InventoryProvider()),
      ],
      child: const CowIAOpsMaterialApp(),
    );
  }
}

class CowIAOpsMaterialApp extends StatelessWidget {
  const CowIAOpsMaterialApp({super.key});

  @override
  Widget build(BuildContext context) {
    final ops = context.watch<OpsProvider>();

    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => ops.recordActivity(),
      onPointerMove: (_) => ops.recordActivity(),
      child: MaterialApp(
        title: 'CowIA Ops — Suite Técnica & Despliegue',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final ops = context.watch<OpsProvider>();

    if (!ops.isAuthChecked) {
      return const Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryCyan),
        ),
      );
    }

    if (!ops.isAuthenticated) {
      return const LoginScreen();
    }

    return const MainMenuScreen();
  }
}
