import 'dart:io';
import 'package:flutter/material.dart';

class MonoAvatarImage extends StatelessWidget {
  final String? avatarUrl;
  final double? width;
  final double? height;
  final BoxFit fit;

  const MonoAvatarImage({
    super.key,
    this.avatarUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    final url = avatarUrl?.trim();

    if (url == null || url.isEmpty || url == 'assets/images/avatar_clean.png') {
      return Image.asset(
        'assets/images/avatar_clean.png',
        width: width,
        height: height,
        fit: fit,
      );
    }

    if (url.startsWith('assets/')) {
      return Image.asset(
        url,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => Image.asset(
          'assets/images/avatar_clean.png',
          width: width,
          height: height,
          fit: fit,
        ),
      );
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => Image.asset(
          'assets/images/avatar_clean.png',
          width: width,
          height: height,
          fit: fit,
        ),
      );
    }

    // Local file from image_picker
    try {
      final file = File(url);
      if (file.existsSync()) {
        return Image.file(
          file,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, __, ___) => Image.asset(
            'assets/images/avatar_clean.png',
            width: width,
            height: height,
            fit: fit,
          ),
        );
      }
    } catch (_) {}

    return Image.asset(
      'assets/images/avatar_clean.png',
      width: width,
      height: height,
      fit: fit,
    );
  }
}

