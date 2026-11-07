import 'package:dio/dio.dart';
import 'package:mono_app/core/network/api_client.dart';

class NotificationItem {
  final int id;
  final String title;
  final String message;
  final String? url;
  final String type;
  final DateTime createdAt;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    this.url,
    this.type = 'broadcast',
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      url: json['url']?.toString(),
      type: json['type']?.toString() ?? 'broadcast',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class NotificationService {
  final Dio dio;

  NotificationService({Dio? dioClient})
      : dio = dioClient ??
            Dio(
              BaseOptions(
                baseUrl: ApiClient.defaultBaseUrl,
                connectTimeout: const Duration(seconds: 8),
                receiveTimeout: const Duration(seconds: 8),
              ),
            );

  Future<List<NotificationItem>> getNotifications() async {
    try {
      final response = await dio.get('/notifications');
      if (response.statusCode == 200 && response.data != null) {
        final list = response.data['notifications'] as List? ?? [];
        return list
            .map((item) =>
                NotificationItem.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }

  Future<NotificationItem?> getLatestNotification() async {
    try {
      final response = await dio.get('/notifications/latest');
      if (response.statusCode == 200 &&
          response.data != null &&
          response.data['notification'] != null) {
        return NotificationItem.fromJson(
            response.data['notification'] as Map<String, dynamic>);
      }
    } catch (_) {}
    return null;
  }
}

