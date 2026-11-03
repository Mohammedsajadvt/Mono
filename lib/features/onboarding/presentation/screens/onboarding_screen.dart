import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mono_app/core/constants/app_assets.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/constants/app_typography.dart';
import 'package:mono_app/core/routes/app_routes.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _floatController;
  late final Animation<double> _floatAnimation;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _floatAnimation = Tween<double>(begin: -4.0, end: 4.0).animate(
      CurvedAnimation(
        parent: _floatController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _floatController.dispose();
    super.dispose();
  }

  void _onGetStartedPressed() {
    Navigator.of(context).pushNamed(AppRoutes.register);
  }

  void _onLogInPressed() {
    Navigator.of(context).pushNamed(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          // Top Hero Area with light mint background, concentric circles, and floating 3D character
          Expanded(
            flex: 6,
            child: Container(
              width: double.infinity,
              color: AppColors.heroBackground,
              child: Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  // Layer 1: Concentric Rings & White Slope Divider (behind character)
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _HeroBackgroundPainter(),
                    ),
                  ),

                  // Layer 2: Hero 3D Illustration with floating bobbing animation
                  // Generous bottom padding (48dp) ensures full legs, cuffs, and both shoes are 100% visible and floating above the slope
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 28, 20, 48),
                      child: AnimatedBuilder(
                        animation: _floatAnimation,
                        builder: (context, child) {
                          return Transform.translate(
                            offset: Offset(0, _floatAnimation.value),
                            child: child,
                          );
                        },
                        child: Image.asset(
                          AppAssets.characterImage,
                          fit: BoxFit.contain,
                          alignment: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Content Area (Headings, Button, and Login Link)
          Expanded(
            flex: 4,
            child: Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  const SizedBox(height: 8),

                  // Headline: Spend Smarter \n Save More
                  Text(
                    'Spend Smarter\nSave More',
                    textAlign: TextAlign.center,
                    style: AppTypography.onboardingHeadline,
                  ),

                  // "Get Started" Pill CTA Button
                  SizedBox(
                    width: double.infinity,
                    height: 58,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: AppColors.buttonGradient,
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: const [
                          BoxShadow(
                            color: AppColors.buttonShadow,
                            blurRadius: 18,
                            spreadRadius: 1,
                            offset: Offset(0, 8),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: _onGetStartedPressed,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                        child: Text(
                          'Get Started',
                          style: AppTypography.buttonText,
                        ),
                      ),
                    ),
                  ),

                  // "Already Have Account? Log In"
                  GestureDetector(
                    onTap: _onLogInPressed,
                    behavior: HitTestBehavior.opaque,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: RichText(
                        textAlign: TextAlign.center,
                        text: TextSpan(
                          text: 'Already Have Account? ',
                          style: AppTypography.footerQuestion,
                          children: [
                            TextSpan(
                              text: 'Log In',
                              style: AppTypography.footerLink,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Paints the concentric ripple rings and subtle white hill slope at the bottom of the hero area
class _HeroBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // 1. Concentric circular rings centered behind the character's upper body
    final ringPaint = Paint()
      ..color = const Color(0x8CFFFFFF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final center = Offset(size.width * 0.5, size.height * 0.40);
    final radii = [
      size.width * 0.28,
      size.width * 0.46,
      size.width * 0.64,
      size.width * 0.84,
    ];

    for (final r in radii) {
      canvas.drawCircle(center, r, ringPaint);
    }

    // 2. Subtle white gentle hill slope at the bottom transitioning smoothly into the bottom white card
    final slopePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final slopePath = Path()
      ..moveTo(0, size.height - 24)
      ..lineTo(size.width, size.height - 8)
      ..lineTo(size.width, size.height + 1)
      ..lineTo(0, size.height + 1)
      ..close();

    canvas.drawPath(slopePath, slopePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
