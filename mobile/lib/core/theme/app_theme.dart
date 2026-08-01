import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData light() => _theme(Brightness.light);
  static ThemeData dark() => _theme(Brightness.dark);

  static ThemeData _theme(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF0AA6B5),
      brightness: brightness,
    );
    final brandScheme = scheme.copyWith(
      primary: const Color(0xFF0AA6B5),
      secondary: const Color(0xFF1D8A5F),
      primaryContainer: const Color(0xFFE6F8F9),
      secondaryContainer: const Color(0xFFE9F7EE),
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: brandScheme,
      scaffoldBackgroundColor: brightness == Brightness.dark ? const Color(0xFF101014) : const Color(0xFFF6F6F9),
      cardTheme: CardThemeData(
        color: brightness == Brightness.dark ? const Color(0xFF18181E) : const Color(0xFFFFFFFF),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: brightness == Brightness.dark ? const Color(0xFF101014) : const Color(0xFFF6F6F9),
        foregroundColor: brightness == Brightness.dark ? const Color(0xFFF8F7FB) : const Color(0xFF1B1B22),
        elevation: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
