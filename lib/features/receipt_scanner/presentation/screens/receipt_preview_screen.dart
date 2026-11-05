import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/features/receipt_scanner/bloc/receipt_bloc.dart';
import 'package:mono_app/features/receipt_scanner/bloc/receipt_event.dart';
import 'package:mono_app/features/receipt_scanner/bloc/receipt_state.dart';
import 'receipt_review_screen.dart';

class ReceiptPreviewScreen extends StatefulWidget {
  final File initialImageFile;

  const ReceiptPreviewScreen({
    super.key,
    required this.initialImageFile,
  });

  @override
  State<ReceiptPreviewScreen> createState() => _ReceiptPreviewScreenState();
}

class _ReceiptPreviewScreenState extends State<ReceiptPreviewScreen>
    with SingleTickerProviderStateMixin {
  late File _currentImage;
  int _rotationQuarterTurns = 0;
  final ImagePicker _picker = ImagePicker();
  late AnimationController _scannerAnimCtrl;

  @override
  void initState() {
    super.initState();
    _currentImage = widget.initialImageFile;
    _scannerAnimCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scannerAnimCtrl.dispose();
    super.dispose();
  }

  void _rotateClockwise() {
    setState(() {
      _rotationQuarterTurns = (_rotationQuarterTurns + 1) % 4;
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85, // Optimized compression
      );

      if (picked != null) {
        setState(() {
          _currentImage = File(picked.path);
          _rotationQuarterTurns = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access image: $e')),
        );
      }
    }
  }

  void _startAiScan() {
    context.read<ReceiptBloc>().add(ScanReceiptImageEvent(_currentImage));
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ReceiptBloc, ReceiptState>(
      listener: (context, state) {
        if (state is ReceiptScanSuccess) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (ctx) => ReceiptReviewScreen(
                receipt: state.receipt,
                imageFile: _currentImage,
              ),
            ),
          );
        } else if (state is ReceiptScannerError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFFEF4444),
              content: Row(
                children: [
                  const Icon(Icons.error_outline_rounded,
                      color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      state.message,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              action: SnackBarAction(
                label: 'Retry',
                textColor: Colors.white,
                onPressed: _startAiScan,
              ),
            ),
          );
        }
      },
      builder: (context, state) {
        final isScanning = state is ReceiptScanning;
        final scanningMsg = state is ReceiptScanning
            ? state.statusMessage
            : 'Analyzing receipt and reading items...';
        final progress = state is ReceiptScanning ? state.progress : 0.0;

        return Scaffold(
          backgroundColor: const Color(0xFF0F172A),
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded,
                  color: Colors.white, size: 20),
              onPressed: isScanning ? null : () => Navigator.of(context).pop(),
            ),
            title: Text(
              'Receipt Scanner',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            centerTitle: true,
            actions: [
              if (!isScanning)
                IconButton(
                  tooltip: 'Rotate 90°',
                  icon: const Icon(Icons.rotate_right_rounded,
                      color: Colors.white, size: 24),
                  onPressed: _rotateClockwise,
                ),
            ],
          ),
          body: Stack(
            children: [
              // 1. Interactive Image Viewer with rotation
              Column(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          color: Colors.black26,
                          child: Center(
                            child: InteractiveViewer(
                              minScale: 0.8,
                              maxScale: 3.5,
                              child: RotatedBox(
                                quarterTurns: _rotationQuarterTurns,
                                child: Image.file(
                                  _currentImage,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 2. Action Controls Bar
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 20),
                    decoration: const BoxDecoration(
                      color: Color(0xFF1E293B),
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(28)),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (!isScanning) ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(
                                        color: Colors.white.withOpacity(0.2)),
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  icon: const Icon(Icons.photo_camera_rounded,
                                      color: Colors.white, size: 18),
                                  label: Text(
                                    'Retake',
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  onPressed: () => _pickImage(ImageSource.camera),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(
                                        color: Colors.white.withOpacity(0.2)),
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  icon: const Icon(Icons.photo_library_rounded,
                                      color: Colors.white, size: 18),
                                  label: Text(
                                    'Gallery',
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  onPressed: () =>
                                      _pickImage(ImageSource.gallery),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 4,
                              ),
                              icon: const Icon(Icons.auto_awesome_rounded,
                                  color: Colors.white, size: 20),
                              label: Text(
                                'Scan with Mono AI',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              onPressed: _startAiScan,
                            ),
                          ),
                        ] else ...[
                          // Scanning Indicator
                          Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      AppColors.primary),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      scanningMsg,
                                      style: GoogleFonts.inter(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    LinearProgressIndicator(
                                      value: progress > 0 ? progress : null,
                                      backgroundColor: Colors.white12,
                                      valueColor:
                                          const AlwaysStoppedAnimation<Color>(
                                              AppColors.primary),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),

              // 3. Laser Scanning Overlay Animation
              if (isScanning)
                Positioned.fill(
                  child: IgnorePointer(
                    child: AnimatedBuilder(
                      animation: _scannerAnimCtrl,
                      builder: (context, child) {
                        return CustomPaint(
                          painter: _ScannerLaserPainter(
                            progress: _scannerAnimCtrl.value,
                            laserColor: AppColors.primary,
                          ),
                        );
                      },
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ScannerLaserPainter extends CustomPainter {
  final double progress;
  final Color laserColor;

  _ScannerLaserPainter({
    required this.progress,
    required this.laserColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final y = size.height * 0.15 + (size.height * 0.55 * progress);

    // Glowing laser beam
    final paint = Paint()
      ..shader = LinearGradient(
        colors: [
          laserColor.withOpacity(0.0),
          laserColor.withOpacity(0.9),
          laserColor.withOpacity(0.0),
        ],
      ).createShader(Rect.fromLTWH(0, y - 2, size.width, 4))
      ..strokeWidth = 3;

    canvas.drawLine(Offset(20, y), Offset(size.width - 20, y), paint);

    // Light gradient sweep
    final sweepPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          laserColor.withOpacity(0.18),
          laserColor.withOpacity(0.0),
        ],
      ).createShader(Rect.fromLTWH(20, y - 40, size.width - 40, 40));

    canvas.drawRect(Rect.fromLTWH(20, y - 40, size.width - 40, 40), sweepPaint);
  }

  @override
  bool shouldRepaint(covariant _ScannerLaserPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.laserColor != laserColor;
  }
}
