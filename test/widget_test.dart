import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';
import 'package:mono_app/features/auth/bloc/auth_bloc.dart';
import 'package:mono_app/features/auth/presentation/screens/login_screen.dart';
import 'package:mono_app/features/auth/presentation/screens/signup_screen.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/main_nav/presentation/screens/main_navigation_screen.dart';
import 'package:mono_app/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:mono_app/main.dart';

void main() {
  testWidgets('MonoApp displays splash screen with mono logo', (WidgetTester tester) async {
    await tester.pumpWidget(const MonoApp());
    expect(find.text('mono'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 2600));
  });

  testWidgets('OnboardingScreen displays headline, CTA button, and login option', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OnboardingScreen(),
      ),
    );

    expect(find.text('Spend Smarter\nSave More'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);
    expect(find.byType(RichText), findsWidgets);
  });

  testWidgets('LoginScreen displays fields with Enter labels and Log In button', (WidgetTester tester) async {
    final storage = SecureStorageService();
    await tester.pumpWidget(
      BlocProvider<AuthBloc>(
        create: (_) => AuthBloc(secureStorage: storage),
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Welcome Back!'), findsOneWidget);
    expect(find.text('EMAIL ADDRESS'), findsOneWidget);
    expect(find.text('Enter Email'), findsOneWidget);
    expect(find.text('PASSWORD'), findsOneWidget);
    expect(find.text('Enter Password'), findsOneWidget);
    expect(find.text('Log In'), findsOneWidget);
  });

  testWidgets('SignupScreen displays fields with Enter labels and Sign Up button', (WidgetTester tester) async {
    final storage = SecureStorageService();
    await tester.pumpWidget(
      BlocProvider<AuthBloc>(
        create: (_) => AuthBloc(secureStorage: storage),
        child: const MaterialApp(
          home: SignupScreen(),
        ),
      ),
    );

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.text('FULL NAME'), findsOneWidget);
    expect(find.text('Enter Name'), findsOneWidget);
    expect(find.text('EMAIL ADDRESS'), findsOneWidget);
    expect(find.text('Enter Email'), findsOneWidget);
    expect(find.text('PASSWORD'), findsOneWidget);
    expect(find.text('Enter Password'), findsOneWidget);
    expect(find.text('CONFIRM PASSWORD'), findsOneWidget);
    expect(find.text('Enter Confirm Password'), findsOneWidget);
    expect(find.text('Sign Up'), findsOneWidget);
  });

  testWidgets('MainNavigationScreen displays Home, Statistics, FAB, Categories, and Profile (No blank gap)', (WidgetTester tester) async {
    final storage = SecureStorageService();
    await tester.pumpWidget(
      MultiBlocProvider(
        providers: [
          BlocProvider<AuthBloc>(
            create: (_) => AuthBloc(secureStorage: storage),
          ),
          BlocProvider<ExpenseBloc>(
            create: (_) => ExpenseBloc()..add(LoadExpensesEvent()),
          ),
        ],
        child: const MaterialApp(
          home: MainNavigationScreen(),
        ),
      ),
    );

    // Verify Navigation Bar items
    expect(find.byIcon(Icons.home_rounded), findsOneWidget);
    expect(find.byIcon(Icons.bar_chart_rounded), findsOneWidget);
    expect(find.byIcon(Icons.add), findsOneWidget);
    expect(find.byIcon(Icons.grid_view_rounded), findsOneWidget);
    expect(find.byIcon(Icons.person_outline_rounded), findsOneWidget);

    // Verify wallet icon does NOT exist in navigation
    expect(find.byIcon(Icons.account_balance_wallet_outlined), findsNothing);
  });
}
