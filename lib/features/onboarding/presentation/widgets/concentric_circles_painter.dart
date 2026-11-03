import 'package:flutter/material.dart';

class ConcentricCirclesPainter extends CustomPainter {
  final double animationValue;

  ConcentricCirclesPainter({this.animationValue = 1.0});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.44);

    final ringPaint = Paint()
      ..color = const Color(0xFF438883).withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    // Radii of the subtle concentric circles
    final radii = [80.0, 130.0, 185.0, 240.0, 300.0, 360.0];

    for (final r in radii) {
      canvas.drawCircle(center, r * (0.98 + 0.02 * animationValue), ringPaint);
    }
  }

  @override
  bool shouldRepaint(covariant ConcentricCirclesPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}

