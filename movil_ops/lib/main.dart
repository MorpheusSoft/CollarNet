import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/agro_provider.dart';
import 'providers/drawing_provider.dart';
import 'providers/inventory_provider.dart';
import 'providers/ops_provider.dart';
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
      child: MaterialApp(
        title: 'CowIA Ops — Suite Técnica & Despliegue',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const MainMenuScreen(),
      ),
    );
  }
}
