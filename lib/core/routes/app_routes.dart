import 'package:flutter/material.dart';
import 'package:mono_app/features/splash/presentation/screens/splash_screen.dart';
import 'package:mono_app/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:mono_app/features/auth/presentation/screens/login_screen.dart';
import 'package:mono_app/features/auth/presentation/screens/signup_screen.dart';
import 'package:mono_app/features/main_nav/presentation/screens/main_navigation_screen.dart';
import 'package:mono_app/features/add_expense/presentation/screens/add_expense_screen.dart';
import 'package:mono_app/features/ai_assistant/presentation/screens/ai_assistant_screen.dart';

class AppRoutes {
  AppRoutes._();

  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String signup = '/signup';
  static const String mainNav = '/main';
  static const String home = '/home';
  static const String addExpense = '/add-expense';
  static const String aiAssistant = '/ai-assistant';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return _fadeRoute(const SplashScreen(), settings);
      case onboarding:
        return _fadeRoute(const OnboardingScreen(), settings);
      case login:
        return _slideRoute(const LoginScreen(), settings);
      case register:
      case signup:
        return _slideRoute(const SignupScreen(), settings);
      case mainNav:
      case home:
        return _fadeRoute(const MainNavigationScreen(), settings);
      case addExpense:
        return MaterialPageRoute(
          builder: (context) => const AddExpenseScreen(),
          fullscreenDialog: true,
          settings: settings,
        );
      case aiAssistant:
        return MaterialPageRoute(
          builder: (context) => const AiAssistantScreen(),
          settings: settings,
        );
      default:
        return _fadeRoute(const SplashScreen(), settings);
    }
  }

  static PageRouteBuilder _fadeRoute(Widget page, RouteSettings settings) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: CurvedAnimation(
            parent: animation,
            curve: Curves.easeInOut,
          ),
          child: child,
        );
      },
      transitionDuration: const Duration(milliseconds: 400),
    );
  }

  static PageRouteBuilder _slideRoute(Widget page, RouteSettings settings) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final offset = Tween<Offset>(
          begin: const Offset(1, 0),
          end: Offset.zero,
        ).animate(CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        ));
        return SlideTransition(
          position: offset,
          child: child,
        );
      },
      transitionDuration: const Duration(milliseconds: 350),
    );
  }
}
