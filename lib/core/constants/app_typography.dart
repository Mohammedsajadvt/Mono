import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mono_app/core/constants/app_colors.dart';

class AppTypography {
  AppTypography._();

  // Splash Screen "mono" logo style
  static TextStyle splashLogo = GoogleFonts.inter(
    fontSize: 50,
    fontWeight: FontWeight.w700,
    color: AppColors.textWhite,
    letterSpacing: -1.2,
  );

  // Onboarding Main Heading: "Spend Smarter\nSave More"
  static TextStyle onboardingHeadline = GoogleFonts.inter(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    color: AppColors.textHeadline,
    height: 1.25,
    letterSpacing: -0.5,
  );

  // Pill CTA Button
  static TextStyle buttonText = GoogleFonts.inter(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textWhite,
    letterSpacing: 0.2,
  );

  // Link Text: "Already Have Account?"
  static TextStyle footerQuestion = GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textBody,
  );

  // Link Text: "Log In"
  static TextStyle footerLink = GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.primary,
  );
}

