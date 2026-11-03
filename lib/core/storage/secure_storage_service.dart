import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  static const String _tokenKey = 'mono_jwt_access_token';
  static const String _refreshTokenKey = 'mono_jwt_refresh_token';
  static const String _userIdKey = 'mono_user_id';
  static const String _avatarKey = 'mono_user_avatar';

  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _storage.write(key: _tokenKey, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
    }
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  Future<void> saveUserId(String userId) async {
    await _storage.write(key: _userIdKey, value: userId);
  }

  Future<String?> getUserId() async {
    return await _storage.read(key: _userIdKey);
  }

  Future<void> saveUserAvatar(String avatarUrl) async {
    await _storage.write(key: _avatarKey, value: avatarUrl);
  }

  Future<String?> getUserAvatar() async {
    return await _storage.read(key: _avatarKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
