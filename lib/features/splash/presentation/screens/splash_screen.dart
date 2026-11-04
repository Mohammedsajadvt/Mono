import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/constants/app_typography.dart';
import 'package:mono_app/core/routes/app_routes.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';
import 'package:mono_app/features/auth/bloc/auth_bloc.dart';
import 'package:mono_app/features/auth/bloc/auth_state.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _scaleAnimation;
  bool _hasNavigated = false;
  Timer? _fallbackTimer;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _scaleAnimation = Tween<double>(begin: 0.92, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutBack,
      ),
    );

    _controller.forward();

    // Check token and decide destination after minimum 1800ms branding
    _determineNextScreen();
  }

  Future<void> _determineNextScreen() async {
    await Future.delayed(const Duration(milliseconds: 1800));
    if (!mounted || _hasNavigated) return;

    final authState = context.read<AuthBloc>().state;
    if (authState is Authenticated) {
      _navigate(AppRoutes.mainNav);
      return;
    }

    // Safety check directly against secure local storage
    final storage = SecureStorageService();
    final token = await storage.getAccessToken();

    if (token != null && token.isNotEmpty) {
      _navigate(AppRoutes.mainNav);
      return;
    }

    _navigate(AppRoutes.onboarding);
  }

  void _navigate(String routeName) {
    if (_hasNavigated || !mounted) return;
    _hasNavigated = true;
    _fallbackTimer?.cancel();
    Navigator.of(context).pushReplacementNamed(routeName);
  }

  @override
  void dispose() {
    _fallbackTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Light status bar icons for dark/gradient background
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: AppColors.primary,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );

    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (_hasNavigated) return;
        if (state is Authenticated) {
          _navigate(AppRoutes.mainNav);
        } else if (state is Unauthenticated) {
          _navigate(AppRoutes.onboarding);
        }
      },
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: AppColors.splashGradient,
          ),
          child: Center(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Text(
                  'mono',
                  style: AppTypography.splashLogo,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
