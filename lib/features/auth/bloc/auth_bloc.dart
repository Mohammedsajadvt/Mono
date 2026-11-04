import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';
import 'package:mono_app/features/auth/models/user_model.dart';
import 'package:mono_app/features/auth/bloc/auth_event.dart';
import 'package:mono_app/features/auth/bloc/auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final SecureStorageService secureStorage;
  final ApiClient? apiClient;

  AuthBloc({
    required this.secureStorage,
    this.apiClient,
  }) : super(AuthInitial()) {
    on<CheckAuthStatus>(_onCheckAuthStatus);
    on<LoginRequested>(_onLoginRequested);
    on<SignupRequested>(_onSignupRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<UpdateProfileAvatar>(_onUpdateProfileAvatar);
  }

  ApiClient get _client => apiClient ?? ApiClient(secureStorage: secureStorage);

  Future<void> _onCheckAuthStatus(
    CheckAuthStatus event,
    Emitter<AuthState> emit,
  ) async {
    final token = await secureStorage.getAccessToken();
    final cachedUser = await secureStorage.getCachedUser();

    if (token != null && token.isNotEmpty) {
      // If we have cached user, immediately emit Authenticated so splash doesn't block
      if (cachedUser != null) {
        emit(Authenticated(cachedUser));
      }

      try {
        final response = await _client.dio.get('/auth/me');
        if (response.statusCode == 200 && response.data['user'] != null) {
          final u = response.data['user'];
          final freshUser = UserModel(
            id: u['id'].toString(),
            name: u['name'] ?? cachedUser?.name ?? 'User',
            email: u['email'] ?? cachedUser?.email ?? '',
            username:
                '@${(u['name'] ?? cachedUser?.name ?? 'user').toString().toLowerCase().replaceAll(RegExp(r'\s+'), '_')}',
            avatarUrl: cachedUser?.avatarUrl ??
                u['avatar_url'] ??
                'assets/images/avatar_clean.png',
          );
          await secureStorage.saveUserData(
            id: freshUser.id,
            name: freshUser.name,
            email: freshUser.email,
            avatarUrl: freshUser.avatarUrl,
          );
          emit(Authenticated(freshUser));
          return;
        }
      } on DioException catch (dioErr) {
        // Only invalidate session if server explicitly returned 401 Unauthorized
        if (dioErr.response?.statusCode == 401) {
          await secureStorage.clearAll();
          emit(Unauthenticated());
          return;
        }
        // If network issue or server cold-starting, stay authenticated with cached session!
        if (cachedUser != null) {
          emit(Authenticated(cachedUser));
          return;
        }
      } catch (_) {
        if (cachedUser != null) {
          emit(Authenticated(cachedUser));
          return;
        }
      }

      // If token exists and no 401 was returned, stay authenticated
      if (cachedUser != null) {
        emit(Authenticated(cachedUser));
        return;
      }
    }

    emit(Unauthenticated());
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    if (event.email.trim().isEmpty || event.password.trim().isEmpty) {
      emit(const AuthFailure('Please enter both email and password'));
      return;
    }

    if (!event.email.contains('@')) {
      emit(const AuthFailure('Please enter a valid email address'));
      return;
    }

    final cachedAvatar = await secureStorage.getUserAvatar();

    try {
      final response = await _client.dio.post('/auth/login', data: {
        'email': event.email.trim(),
        'password': event.password.trim(),
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final token = response.data['token'];
        final userData = response.data['user'];

        await secureStorage.saveTokens(
          accessToken: token,
          refreshToken: token,
        );
        await secureStorage.saveUserData(
          id: userData['id'].toString(),
          name: userData['name'] ?? 'User',
          email: userData['email'] ?? event.email.trim(),
          avatarUrl: cachedAvatar ?? userData['avatar_url'],
        );

        final user = UserModel(
          id: userData['id'].toString(),
          name: userData['name'] ?? 'User',
          email: userData['email'] ?? event.email.trim(),
          username:
              '@${(userData['name'] ?? 'user').toString().toLowerCase().replaceAll(RegExp(r'\s+'), '_')}',
          avatarUrl: cachedAvatar ??
              userData['avatar_url'] ??
              'assets/images/avatar_clean.png',
        );

        emit(Authenticated(user));
        return;
      } else {
        emit(AuthFailure(
            response.data['message']?.toString() ?? 'Login failed'));
      }
    } catch (e) {
      if (e is DioException &&
          e.response?.data != null &&
          e.response?.data is Map &&
          e.response?.data['message'] != null) {
        emit(AuthFailure(e.response!.data['message'].toString()));
      } else {
        emit(const AuthFailure(
            'Unable to connect to server. Please try again.'));
      }
    }
  }

  Future<void> _onSignupRequested(
    SignupRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());

    if (event.name.trim().isEmpty) {
      emit(const AuthFailure('Please enter your full name'));
      return;
    }

    if (event.email.trim().isEmpty || !event.email.contains('@')) {
      emit(const AuthFailure('Please enter a valid email address'));
      return;
    }

    if (event.password.length < 6) {
      emit(const AuthFailure('Password must be at least 6 characters'));
      return;
    }

    final cachedAvatar = await secureStorage.getUserAvatar();

    try {
      final response = await _client.dio.post('/auth/register', data: {
        'name': event.name.trim(),
        'email': event.email.trim(),
        'password': event.password.trim(),
      });

      if (response.statusCode == 201 && response.data['success'] == true) {
        final token = response.data['token'];
        final userData = response.data['user'];

        await secureStorage.saveTokens(
          accessToken: token,
          refreshToken: token,
        );
        await secureStorage.saveUserData(
          id: userData['id'].toString(),
          name: userData['name'] ?? event.name.trim(),
          email: userData['email'] ?? event.email.trim(),
          avatarUrl: cachedAvatar,
        );

        final user = UserModel(
          id: userData['id'].toString(),
          name: userData['name'] ?? event.name.trim(),
          email: userData['email'] ?? event.email.trim(),
          username:
              '@${(userData['name'] ?? event.name.trim()).toString().toLowerCase().replaceAll(RegExp(r'\s+'), '_')}',
          avatarUrl: cachedAvatar ?? 'assets/images/avatar_clean.png',
        );

        emit(Authenticated(user));
        return;
      } else {
        emit(AuthFailure(
            response.data['message']?.toString() ?? 'Sign up failed'));
      }
    } catch (e) {
      if (e is DioException &&
          e.response?.data != null &&
          e.response?.data is Map &&
          e.response?.data['message'] != null) {
        emit(AuthFailure(e.response!.data['message'].toString()));
      } else {
        emit(const AuthFailure(
            'Registration failed. Please check details and try again.'));
      }
    }
  }

  Future<void> _onUpdateProfileAvatar(
    UpdateProfileAvatar event,
    Emitter<AuthState> emit,
  ) async {
    await secureStorage.saveUserAvatar(event.avatarUrl);

    if (state is Authenticated) {
      final updatedUser =
          (state as Authenticated).user.copyWith(avatarUrl: event.avatarUrl);
      emit(Authenticated(updatedUser));

      try {
        await _client.dio.put('/auth/profile', data: {
          'avatar_url': event.avatarUrl,
        });
      } catch (_) {}
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    await secureStorage.clearAll();
    emit(Unauthenticated());
  }
}
