import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mono_app/features/auth/models/user_model.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                resetOnError: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  static const String _tokenKey = 'mono_jwt_access_token';
  static const String _refreshTokenKey = 'mono_jwt_refresh_token';
  static const String _userIdKey = 'mono_user_id';
  static const String _userNameKey = 'mono_user_name';
  static const String _userEmailKey = 'mono_user_email';
  static const String _avatarKey = 'mono_user_avatar';

  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    try {
      await _storage.write(key: _tokenKey, value: accessToken);
      if (refreshToken != null) {
        await _storage.write(key: _refreshTokenKey, value: refreshToken);
      }
    } catch (_) {}
  }

  Future<void> saveUserData({
    required String id,
    required String name,
    required String email,
    String? avatarUrl,
  }) async {
    try {
      await _storage.write(key: _userIdKey, value: id);
      await _storage.write(key: _userNameKey, value: name);
      await _storage.write(key: _userEmailKey, value: email);
      if (avatarUrl != null) {
        await _storage.write(key: _avatarKey, value: avatarUrl);
      }
    } catch (_) {}
  }

  Future<UserModel?> getCachedUser() async {
    try {
      final id = await _storage.read(key: _userIdKey);
      final email = await _storage.read(key: _userEmailKey);
      final name = await _storage.read(key: _userNameKey);
      final avatar = await _storage.read(key: _avatarKey);

      if (id != null && email != null) {
        return UserModel(
          id: id,
          name: name ?? 'User',
          email: email,
          username:
              '@${(name ?? 'user').toLowerCase().replaceAll(RegExp(r'\s+'), '_')}',
          avatarUrl: avatar ?? 'assets/images/avatar_clean.png',
        );
      }
    } catch (_) {}
    return null;
  }

  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (_) {
      return null;
    }
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveUserId(String userId) async {
    try {
      await _storage.write(key: _userIdKey, value: userId);
    } catch (_) {}
  }

  Future<String?> getUserId() async {
    try {
      return await _storage.read(key: _userIdKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveUserAvatar(String avatarUrl) async {
    try {
      await _storage.write(key: _avatarKey, value: avatarUrl);
    } catch (_) {}
  }

  Future<String?> getUserAvatar() async {
    try {
      return await _storage.read(key: _avatarKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (_) {}
  }
}
