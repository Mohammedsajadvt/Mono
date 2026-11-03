import 'package:dio/dio.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';

class AiService {
  final ApiClient _apiClient;

  AiService({ApiClient? apiClient})
      : _apiClient = apiClient ??
            ApiClient(secureStorage: SecureStorageService());

  Future<Map<String, dynamic>> sendQuery(String query) async {
    try {
      final response = await _apiClient.dio.post(
        '/ai/chat',
        data: {'query': query},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data;
      }
      return {
        'success': false,
        'reply': response.data['message'] ?? 'Could not process query.',
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'reply': e.response?.data?['message'] ??
            'AI Assistant is currently offline. Please ensure your backend is running.',
      };
    } catch (e) {
      return {
        'success': false,
        'reply': 'An unexpected error occurred: $e',
      };
    }
  }

  Future<List<Map<String, dynamic>>> fetchInsights() async {
    try {
      final response = await _apiClient.dio.get('/ai/insights');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List list = response.data['insights'] ?? [];
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> parseVoiceOrText(String text) async {
    try {
      final response = await _apiClient.dio.post(
        '/ai/parse-voice',
        data: {'text': text},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['parsed']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> scanReceipt(String sampleType) async {
    try {
      final response = await _apiClient.dio.post(
        '/ai/scan-receipt',
        data: {'sampleType': sampleType},
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        return Map<String, dynamic>.from(response.data['receipt']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

