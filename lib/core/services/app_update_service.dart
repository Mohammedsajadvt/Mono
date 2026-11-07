import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:url_launcher/url_launcher.dart';

class AppUpdateService {
  static const String currentAppVersion = '1.0.2';
  static const int currentBuildNumber = 3;

  static bool _hasPromptedThisSession = false;

  /// Compares semantic versions: returns true if latest > current
  static bool isNewerVersion(String current, String latest) {
    try {
      final currentParts = current.split('.').map((e) => int.tryParse(e) ?? 0).toList();
      final latestParts = latest.split('.').map((e) => int.tryParse(e) ?? 0).toList();

      for (int i = 0; i < 3; i++) {
        final c = i < currentParts.length ? currentParts[i] : 0;
        final l = i < latestParts.length ? latestParts[i] : 0;
        if (l > c) return true;
        if (l < c) return false;
      }
    } catch (_) {}
    return false;
  }

  /// Checks server for latest release build.
  /// If [silent] is true, no dialog or snackbar is shown if app is already up to date.
  static Future<void> checkUpdate(
    BuildContext context, {
    bool silent = false,
  }) async {
    // Avoid network requests during headless widget testing
    if (Platform.environment.containsKey('FLUTTER_TEST')) return;
    if (silent && _hasPromptedThisSession) return;

    if (!silent && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Text(
                'Checking for updates...',
                style: GoogleFonts.inter(fontWeight: FontWeight.w500),
              ),
            ],
          ),
          duration: const Duration(milliseconds: 1200),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }

    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: ApiClient.defaultBaseUrl,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
        ),
      );

      final response = await dio.get('/app/version');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data;
        final latestVersion = data['latestVersion']?.toString() ?? '1.0.0';
        final latestBuild =
            int.tryParse(data['buildNumber']?.toString() ?? '1') ?? 1;
        String downloadUrl = data['downloadUrl']?.toString() ?? '';
        final firebaseStorageUrl =
            data['firebaseStorageUrl']?.toString() ?? '';
        final driveUrl = data['driveUrl']?.toString() ?? '';
        final releaseNotes = data['releaseNotes']?.toString() ??
            'Performance optimizations and latest features.';
        final forceUpdate = data['forceUpdate'] == true;

        // Ensure BetaDrop is NEVER used - fallback to Firebase or direct server APK download
        if (downloadUrl.contains('betadrop.app') || downloadUrl.isEmpty) {
          downloadUrl = firebaseStorageUrl.isNotEmpty
              ? firebaseStorageUrl
              : 'https://mono-nbt6.onrender.com/api/app/download';
        }

        final hasUpdate = isNewerVersion(currentAppVersion, latestVersion) ||
            (latestVersion == currentAppVersion &&
                latestBuild > currentBuildNumber);

        if (!context.mounted) return;

        if (hasUpdate) {
          _hasPromptedThisSession = true;
          _showUpdateDialog(
            context,
            latestVersion: latestVersion,
            downloadUrl: downloadUrl,
            driveUrl: driveUrl,
            releaseNotes: releaseNotes,
            forceUpdate: forceUpdate,
          );
        } else if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded,
                      color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Text(
                    'Mono is up to date (v$currentAppVersion)',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              backgroundColor: AppColors.primary,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
      }
    } catch (_) {
      if (!silent && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Unable to check for updates. Please check connection.',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: Colors.black87,
          ),
        );
      }
    }
  }

  static void _showUpdateDialog(
    BuildContext context, {
    required String latestVersion,
    required String downloadUrl,
    String? driveUrl,
    required String releaseNotes,
    required bool forceUpdate,
  }) {
    showDialog(
      context: context,
      barrierDismissible: !forceUpdate,
      builder: (dialogCtx) => PopScope(
        canPop: !forceUpdate,
        child: AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.rocket_launch_rounded,
                  color: AppColors.primary,
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Update Available! 🚀',
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF222222),
                      ),
                    ),
                    Text(
                      'Version $latestVersion is ready',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF666666),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'A new version of Mono (v$latestVersion) is available with the latest performance and security enhancements.',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF444444),
                    height: 1.4,
                  ),
                ),
                if (releaseNotes.trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      releaseNotes.trim(),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF334155),
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actionsPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          actions: [
            if (!forceUpdate)
              TextButton(
                onPressed: () => Navigator.of(dialogCtx).pop(),
                child: Text(
                  'Later',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade600,
                  ),
                ),
              ),
            if (driveUrl != null && driveUrl.trim().isNotEmpty)
              OutlinedButton.icon(
                onPressed: () =>
                    _launchDownloadUrl(context, dialogCtx, driveUrl),
                icon: const Icon(Icons.cloud_download_outlined, size: 16),
                label: Text(
                  'Google Drive',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ElevatedButton.icon(
              onPressed: () =>
                  _launchDownloadUrl(context, dialogCtx, downloadUrl),
              icon: const Icon(Icons.download_rounded, size: 18),
              label: Text(
                'Update Now',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Future<void> _launchDownloadUrl(
    BuildContext context,
    BuildContext dialogCtx,
    String rawUrl,
  ) async {
    if (Navigator.of(dialogCtx).canPop()) {
      Navigator.of(dialogCtx).pop();
    }

    String cleanUrl = rawUrl.trim();
    // Safety check: Never open BetaDrop - replace with direct APK download
    if (cleanUrl.contains('betadrop.app')) {
      cleanUrl = 'https://mono-nbt6.onrender.com/api/app/download';
    }

    final uri = Uri.parse(cleanUrl);

    try {
      await Clipboard.setData(ClipboardData(text: cleanUrl));
    } catch (_) {}

    bool launched = false;
    try {
      launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
    } catch (_) {}

    if (!launched) {
      try {
        launched = await launchUrl(
          uri,
          mode: LaunchMode.platformDefault,
        );
      } catch (_) {}
    }

    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Download link copied to clipboard: $cleanUrl',
            style: GoogleFonts.inter(),
          ),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
