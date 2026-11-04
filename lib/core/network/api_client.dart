import 'package:dio/dio.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';

class ApiClient {
  final Dio dio;
  final SecureStorageService secureStorage;

  static const String productionBaseUrl = 'https://mono-nbt6.onrender.com/api';

  static String get defaultBaseUrl {
    // Use the live production Render backend with TiDB Cloud
    return productionBaseUrl;
  }

  ApiClient({
    required this.secureStorage,
    String? baseUrl,
  }) : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? defaultBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 10),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            await secureStorage.clearAll();
          }
          return handler.next(error);
        },
      ),
    );
  }
}
