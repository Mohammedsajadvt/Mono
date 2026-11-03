import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary palette (Teal / Sage)
  static const Color primary = Color(0xFF438883);
  static const Color primaryLight = Color(0xFF63B5AF);
  static const Color primaryDark = Color(0xFF2F7E79);
  static const Color primaryDeep = Color(0xFF1B5C58);

  // Backgrounds
  static const Color background = Color(0xFFFFFFFF);
  static const Color heroBackground = Color(0xFFEEF8F7);
  static const Color heroArcStroke = Color(0xFFD6ECE8);
  static const Color surface = Color(0xFFF9FAFB);

  // Typography Colors
  static const Color textHeadline = Color(0xFF29756F);
  static const Color textDark = Color(0xFF1E293B);
  static const Color textBody = Color(0xFF444444);
  static const Color textMuted = Color(0xFF666666);
  static const Color textLight = Color(0xFF888888);
  static const Color textWhite = Color(0xFFFFFFFF);

  // UI Elements & Shadows
  static const Color buttonShadow = Color(0x59438883);
  static const Color cardShadow = Color(0x14000000);
  static const Color divider = Color(0xFFE5E7EB);

  // Gradients
  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF5DACA6),
      Color(0xFF438883),
    ],
  );

  static const LinearGradient buttonGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF5DA8A3),
      Color(0xFF438883),
    ],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFFEEF8F7),
      Color(0xFFE3F3F1),
    ],
  );
}

