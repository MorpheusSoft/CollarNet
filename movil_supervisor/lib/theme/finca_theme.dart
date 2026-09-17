import 'package:flutter/material.dart';

class FincaTheme {
  // Paleta Cromática de Alto Contraste para Campo / Sol Directo
  static const Color bgDark = Color(0xFF04120C);
  static const Color bgCard = Color(0xFF0A2218);
  static const Color bgCardElevated = Color(0xFF103325);
  static const Color borderCard = Color(0xFF1B4D39);

  // Acentos de Estado
  static const Color primaryGreen = Color(0xFF10B981);
  static const Color accentGreenLight = Color(0xFF34D399);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color errorCrimson = Color(0xFFEF4444);
  static const Color infoBlue = Color(0xFF38BDF8);
  static const Color purpleSanidad = Color(0xFFA855F7);

  // Textos
  static const Color textLight = Color(0xFFF0FDF4);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textSub = Color(0xFF6EE7B7);

  static ThemeData get themeData {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgDark,
      colorScheme: const ColorScheme.dark(
        primary: primaryGreen,
        secondary: accentGreenLight,
        surface: bgCard,
        error: errorCrimson,
        onPrimary: Colors.white,
        onSurface: textLight,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: bgCard,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: textLight),
        titleTextStyle: TextStyle(
          color: textLight,
          fontSize: 18,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderCard, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryGreen,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
