import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final themeModeProvider = StateNotifierProvider<ThemeController, ThemeMode>((_) => ThemeController());

class ThemeController extends StateNotifier<ThemeMode> {
  ThemeController() : super(ThemeMode.system) {
    _restore();
  }

  static const _key = 'theme_mode';
  final _storage = const FlutterSecureStorage();

  Future<void> _restore() async {
    final saved = await _storage.read(key: _key);
    state = switch (saved) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  Future<void> toggle(Brightness brightness) async {
    final next = brightness == Brightness.dark ? ThemeMode.light : ThemeMode.dark;
    state = next;
    await _storage.write(key: _key, value: next.name);
  }
}

class AppTheme {
  const AppTheme._();

  static ThemeData light() => _theme(Brightness.light);
  static ThemeData dark() => _theme(Brightness.dark);

  static ThemeData _theme(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF55A630),
      brightness: brightness,
    );
    final brandScheme = scheme.copyWith(
      primary: brightness == Brightness.dark ? const Color(0xFF9BE564) : const Color(0xFF3F8F2D),
      secondary: brightness == Brightness.dark ? const Color(0xFFB7E4C7) : const Color(0xFF2D6A4F),
      primaryContainer: brightness == Brightness.dark ? const Color(0xFF245C22) : const Color(0xFFDFF4D5),
      secondaryContainer: brightness == Brightness.dark ? const Color(0xFF214835) : const Color(0xFFDDF3E5),
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: brandScheme,
      scaffoldBackgroundColor: brightness == Brightness.dark ? const Color(0xFF101510) : const Color(0xFFF7FAF4),
      cardTheme: CardThemeData(
        color: brightness == Brightness.dark ? const Color(0xFF182018) : const Color(0xFFFFFFFF),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: brightness == Brightness.dark ? const Color(0xFF101510) : const Color(0xFFF7FAF4),
        foregroundColor: brightness == Brightness.dark ? const Color(0xFFF3F8EE) : const Color(0xFF172015),
        elevation: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
