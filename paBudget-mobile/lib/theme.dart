import 'package:flutter/material.dart';

/// Design tokens — mirrors paBudget-web/src/app/globals.css
class Tokens {
  static const background = Color(0xFFFBF9F4);
  static const surface = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF1C1B18);
  static const muted = Color(0xFF6B675F);
  static const border = Color(0xFFE6E1D6);
  static const brand = Color(0xFF1F7A4D);
  static const brandDark = Color(0xFF165C3A);
  static const brandSoft = Color(0xFFE3F3EA);
  static const accent = Color(0xFFE8A317);
  static const danger = Color(0xFFC0392B);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: Tokens.brand,
    primary: Tokens.brand,
    surface: Tokens.surface,
    error: Tokens.danger,
  );
  final radius = BorderRadius.circular(14);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Tokens.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: Tokens.background,
      foregroundColor: Tokens.foreground,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Tokens.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Tokens.border)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Tokens.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Tokens.border)),
      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Tokens.border)),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Tokens.brand, width: 1.6)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: radius),
        side: const BorderSide(color: Tokens.border),
        foregroundColor: Tokens.foreground,
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Tokens.surface,
      selectedColor: Tokens.brandSoft,
      side: const BorderSide(color: Tokens.border),
      shape: const StadiumBorder(),
      labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Tokens.surface,
      indicatorColor: Tokens.brandSoft,
    ),
  );
}
