import 'package:flutter/material.dart';
import 'brand_colors.dart';

/// Design tokens from the paBudget brand kit (see brand_colors.dart), mirroring
/// paBudget-web/src/app/globals.css.
class Tokens {
  static const background = PaBudgetColors.ground;
  static const surface = Color(0xFFFFFFFF);
  static const sunken = Color(0xFFEFECE3);
  static const foreground = PaBudgetColors.ink;
  static const ink2 = Color(0xFF2F3D37);
  static const muted = PaBudgetColors.stone;
  static const faint = Color(0xFF8D9792);
  static const border = Color(0xFFE6E2D6);
  static const brand = PaBudgetColors.emerald;
  static const brandDark = Color(0xFF0A5A41);
  static const brandSoft = Color(0xFFE6F3EC);
  static const forest = PaBudgetColors.forest;
  static const mint = PaBudgetColors.mint;
  static const sand = PaBudgetColors.sand;
  static const accent = PaBudgetColors.copper; // ratings, highlights
  static const danger = PaBudgetColors.overspend; // over budget, errors
  static const shadow = Color(0x2412201B);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: Tokens.brand,
    primary: Tokens.brand,
    surface: Tokens.surface,
    error: Tokens.danger,
  );
  final radius = BorderRadius.circular(12);
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
      margin: EdgeInsets.zero,
      elevation: 1.5,
      shadowColor: Tokens.shadow,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Tokens.sunken,
      hintStyle: const TextStyle(color: Tokens.faint),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Tokens.brand, width: 1.5)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    // Secondary buttons are a tonal fill, not an outline
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 44),
        shape: RoundedRectangleBorder(borderRadius: radius),
        side: BorderSide.none,
        backgroundColor: Tokens.sunken,
        foregroundColor: Tokens.foreground,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Tokens.sunken,
      selectedColor: Tokens.brandSoft,
      side: BorderSide.none,
      shape: const StadiumBorder(),
      labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: Tokens.ink2),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Tokens.surface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: Tokens.brandSoft,
      elevation: 0,
      labelTextStyle: WidgetStatePropertyAll(const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    ),
    dividerTheme: const DividerThemeData(color: Tokens.border, space: 1, thickness: 1),
  );
}
