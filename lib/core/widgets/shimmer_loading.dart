import 'dart:io';
import 'package:flutter/material.dart';

/// Reusable Shimmer container that sweeps an animated gradient across child widgets
class ShimmerLoading extends StatefulWidget {
  final Widget child;
  final bool isLoading;
  final Color baseColor;
  final Color highlightColor;
  final Duration duration;

  const ShimmerLoading({
    super.key,
    required this.child,
    this.isLoading = true,
    this.baseColor = const Color(0xFFE4E9E8),
    this.highlightColor = const Color(0xFFF7FAF9),
    this.duration = const Duration(milliseconds: 1400),
  });

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    if (!Platform.environment.containsKey('FLUTTER_TEST')) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoading) return widget.child;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final double value = _controller.value;
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: [
                (value - 0.35).clamp(0.0, 1.0),
                value.clamp(0.0, 1.0),
                (value + 0.35).clamp(0.0, 1.0),
              ],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// A basic block container for shimmer skeleton layouts
class ShimmerBox extends StatelessWidget {
  final double? width;
  final double height;
  final BorderRadius? borderRadius;
  final BoxShape shape;
  final Color color;

  const ShimmerBox({
    super.key,
    this.width,
    required this.height,
    this.borderRadius,
    this.shape = BoxShape.rectangle,
    this.color = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color,
        shape: shape,
        borderRadius: shape == BoxShape.circle
            ? null
            : (borderRadius ?? BorderRadius.circular(8)),
      ),
    );
  }
}

/// Shimmer skeleton for individual transaction list tile
class TransactionTileShimmer extends StatelessWidget {
  const TransactionTileShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEEEEEE)),
      ),
      child: const Row(
        children: [
          ShimmerBox(
            width: 48,
            height: 48,
            shape: BoxShape.circle,
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerBox(width: 130, height: 14),
                SizedBox(height: 8),
                ShimmerBox(width: 75, height: 10),
              ],
            ),
          ),
          SizedBox(width: 12),
          ShimmerBox(width: 65, height: 16),
        ],
      ),
    );
  }
}

/// Shimmer skeleton for a vertical list of transactions
class TransactionListShimmer extends StatelessWidget {
  final int count;
  final EdgeInsetsGeometry padding;

  const TransactionListShimmer({
    super.key,
    this.count = 5,
    this.padding = const EdgeInsets.symmetric(horizontal: 24),
  });

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: padding,
        itemCount: count,
        itemBuilder: (_, __) => const TransactionTileShimmer(),
      ),
    );
  }
}

/// Shimmer skeleton for Balance Card on HomeScreen
class BalanceCardShimmer extends StatelessWidget {
  const BalanceCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF2F7E79),
            Color(0xFF205B57),
          ],
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: const ShimmerLoading(
        baseColor: Color(0xFF236561),
        highlightColor: Color(0xFF388F88),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ShimmerBox(width: 100, height: 13, color: Colors.white),
                ShimmerBox(
                    width: 20,
                    height: 20,
                    shape: BoxShape.circle,
                    color: Colors.white),
              ],
            ),
            SizedBox(height: 10),
            ShimmerBox(width: 160, height: 28, color: Colors.white),
            SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ShimmerBox(width: 60, height: 11, color: Colors.white),
                    SizedBox(height: 6),
                    ShimmerBox(width: 90, height: 16, color: Colors.white),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    ShimmerBox(width: 60, height: 11, color: Colors.white),
                    SizedBox(height: 6),
                    ShimmerBox(width: 90, height: 16, color: Colors.white),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Shimmer skeleton for Categories Grid on CategoriesScreen
class CategoriesGridShimmer extends StatelessWidget {
  final int count;

  const CategoriesGridShimmer({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.35,
          crossAxisSpacing: 14,
          mainAxisSpacing: 14,
        ),
        itemCount: count,
        itemBuilder: (_, __) => Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF7F9F9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFEEEEEE)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ShimmerBox(width: 40, height: 40, shape: BoxShape.circle),
                  ShimmerBox(width: 16, height: 16, shape: BoxShape.circle),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(width: 80, height: 13),
                  SizedBox(height: 4),
                  ShimmerBox(width: 45, height: 10),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shimmer skeleton for Statistics Screen (chart + top spending)
class StatisticsShimmer extends StatelessWidget {
  const StatisticsShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Period selector shimmer
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(
                4,
                (_) => const ShimmerBox(width: 70, height: 36),
              ),
            ),
            const SizedBox(height: 24),
            // Chart card shimmer
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFFF7F9F9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFEEEEEE)),
              ),
            ),
            const SizedBox(height: 28),
            // Top spending title shimmer
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ShimmerBox(width: 120, height: 16),
                ShimmerBox(width: 24, height: 24, shape: BoxShape.circle),
              ],
            ),
            const SizedBox(height: 16),
            const TransactionTileShimmer(),
            const TransactionTileShimmer(),
            const TransactionTileShimmer(),
          ],
        ),
      ),
    );
  }
}
