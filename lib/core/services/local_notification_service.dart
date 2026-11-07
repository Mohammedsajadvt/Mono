import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:url_launcher/url_launcher.dart';

class LocalNotificationService {
  static final LocalNotificationService _instance =
      LocalNotificationService._internal();
  factory LocalNotificationService() => _instance;
  LocalNotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      const AndroidInitializationSettings androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');

      const InitializationSettings settings = InitializationSettings(
        android: androidSettings,
      );

      await _plugin.initialize(
        settings,
        onDidReceiveNotificationResponse:
            (NotificationResponse response) async {
          final payload = response.payload;
          if (payload != null && payload.trim().isNotEmpty) {
            final uri = Uri.tryParse(payload.trim());
            if (uri != null) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          }
        },
      );

      // Create high-priority channel on Android
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'mono_system_channel',
        'Mono Alerts & Updates',
        description:
            'Shows notification bar alerts for Mono finance, updates and reminders',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );

      final androidImpl = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

      if (androidImpl != null) {
        await androidImpl.createNotificationChannel(channel);
        await androidImpl.requestNotificationsPermission();
      }

      _isInitialized = true;
    } catch (e) {
      debugPrint('[LocalNotificationService] Initialization error: $e');
    }
  }

  Future<void> showNotification({
    int id = 0,
    required String title,
    required String body,
    String? payload,
  }) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      const AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
        'mono_system_channel',
        'Mono Alerts & Updates',
        channelDescription:
            'Shows notification bar alerts for Mono finance, updates and reminders',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
      );

      const NotificationDetails details = NotificationDetails(
        android: androidDetails,
      );

      await _plugin.show(
        id,
        title,
        body,
        details,
        payload: payload ?? 'https://mono-nbt6.onrender.com/api/app/download',
      );
    } catch (e) {
      debugPrint('[LocalNotificationService] Show error: $e');
    }
  }
}

