import 'package:flutter/material.dart';
import 'package:mono_app/core/constants/app_colors.dart';

class CurvedHeaderPainter extends CustomPainter {
  final Color? color;
  final Gradient? gradient;
  final bool showCircles;

  CurvedHeaderPainter({
    this.color,
    this.gradient,
    this.showCircles = true,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint();

    if (gradient != null) {
      paint.shader = gradient!.createShader(rect);
    } else {
      paint.color = color ?? AppColors.primary;
    }

    final path = Path()
      ..lineTo(0, size.height - 30)
      ..quadraticBezierTo(
        size.width * 0.5,
        size.height + 25,
        size.width,
        size.height - 30,
      )
      ..lineTo(size.width, 0)
      ..close();

    canvas.drawPath(path, paint);

    if (showCircles) {
      final circlePaint = Paint()
        ..color = Colors.white.withOpacity(0.08)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2;

      // Top circles
      final center1 = Offset(size.width * 0.25, size.height * 0.35);
      canvas.drawCircle(center1, 90, circlePaint);
      canvas.drawCircle(center1, 140, circlePaint);

      final center2 = Offset(size.width * 0.8, size.height * 0.2);
      canvas.drawCircle(center2, 60, circlePaint);
      canvas.drawCircle(center2, 110, circlePaint);
      canvas.drawCircle(center2, 160, circlePaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

