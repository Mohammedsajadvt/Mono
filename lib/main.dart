import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/core/routes/app_routes.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';
import 'package:mono_app/core/theme/app_theme.dart';
import 'package:mono_app/features/auth/bloc/auth_bloc.dart';
import 'package:mono_app/features/auth/bloc/auth_event.dart';
import 'package:mono_app/features/auth/bloc/auth_state.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/receipt_scanner/bloc/receipt_bloc.dart';
import 'package:onesignal_flutter/onesignal_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize OneSignal Push Notifications for all users
  try {
    OneSignal.Debug.setLogLevel(OSLogLevel.none);
    OneSignal.initialize('16a3ff7b-91c2-4b03-9c56-409c5fee91b6');
    OneSignal.Notifications.requestPermission(true);
  } catch (e) {
    debugPrint('[OneSignal] Initialization error: $e');
  }

  runApp(const MonoApp());
}

class MonoApp extends StatelessWidget {
  final SecureStorageService? secureStorage;
  final ApiClient? apiClient;

  const MonoApp({
    super.key,
    this.secureStorage,
    this.apiClient,
  });

  @override
  Widget build(BuildContext context) {
    final storage = secureStorage ?? SecureStorageService();
    final client = apiClient ?? ApiClient(secureStorage: storage);

    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) =>
              AuthBloc(secureStorage: storage, apiClient: client)
                ..add(CheckAuthStatus()),
        ),
        BlocProvider<ExpenseBloc>(
          create: (context) =>
              ExpenseBloc(apiClient: client)..add(LoadExpensesEvent()),
        ),
        BlocProvider<ReceiptBloc>(
          create: (context) => ReceiptBloc(apiClient: client),
        ),
      ],
      child: BlocListener<AuthBloc, AuthState>(
        listener: (context, authState) {
          if (authState is Authenticated) {
            // Strictly fetch fresh data for this specific authenticated user
            context.read<ExpenseBloc>().add(LoadExpensesEvent());
          } else if (authState is Unauthenticated) {
            // Wipe all in-memory data on logout to ensure 100% user data isolation
            context.read<ExpenseBloc>().add(ResetExpenseEvent());
          }
        },
        child: MaterialApp(
          title: 'Mono - Income & Expense Tracker',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          initialRoute: AppRoutes.splash,
          onGenerateRoute: AppRoutes.onGenerateRoute,
        ),
      ),
    );
  }
}
