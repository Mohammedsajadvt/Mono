import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/routes/app_routes.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';
import 'package:mono_app/features/statistics/presentation/widgets/export_statement_sheet.dart';

class StatisticsScreen extends StatelessWidget {
  const StatisticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new,
              color: Color(0xFF222222), size: 18),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Text(
          'Statistics',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF222222),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_download_outlined,
                color: AppColors.primary, size: 24),
            tooltip: 'Export Statement (CSV / PDF)',
            onPressed: () {
              ExportStatementSheet.show(context);
            },
          ),
          IconButton(
            icon: const Icon(Icons.auto_awesome,
                color: AppColors.primary, size: 22),
            tooltip: 'AI Financial Assistant',
            onPressed: () {
              Navigator.of(context).pushNamed(AppRoutes.aiAssistant);
            },
          ),
        ],
      ),
      body: BlocBuilder<ExpenseBloc, ExpenseState>(
        builder: (context, state) {
          String currentPeriod = 'Day';
          TransactionType currentType = TransactionType.expense;
          List<TransactionModel> topItems = [];

          if (state is ExpenseLoaded) {
            currentPeriod = state.selectedPeriod;
            currentType = state.selectedStatType;
            topItems = state.topSpendings;
          }

          final periods = ['Day', 'Week', 'Month', 'Year'];
          final isExpense = currentType == TransactionType.expense;

          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),

                  // Dynamic Period Filter Tabs
                  Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF4F6F6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: periods.map((p) {
                        final isSelected = p == currentPeriod;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () {
                              context
                                  .read<ExpenseBloc>()
                                  .add(ChangeStatisticPeriodEvent(p));
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primary
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  p,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.w500,
                                    color: isSelected
                                        ? Colors.white
                                        : const Color(0xFF666666),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Dynamic Type Dropdown (Expense / Income)
                  Align(
                    alignment: Alignment.centerRight,
                    child: PopupMenuButton<TransactionType>(
                      initialValue: currentType,
                      onSelected: (type) {
                        context
                            .read<ExpenseBloc>()
                            .add(ChangeStatisticTypeEvent(type));
                      },
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: TransactionType.expense,
                          child: Text('Expense'),
                        ),
                        const PopupMenuItem(
                          value: TransactionType.income,
                          child: Text('Income'),
                        ),
                      ],
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              isExpense ? 'Expense' : 'Income',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF444444),
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: Color(0xFF444444),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Interactive Spline Chart
                  SizedBox(
                    height: 190,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _StatisticsChartPainter(
                        isIncome: !isExpense,
                      ),
                    ),
                  ),

                  // Month / Timeline Labels
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
                        .map((m) {
                      final isMay = m == 'May';
                      return Text(
                        m,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: isMay ? FontWeight.w700 : FontWeight.w500,
                          color: isMay
                              ? AppColors.primary
                              : const Color(0xFFAAAAAA),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 18),

                  // Indian & Global Financial Statement Export Banner
                  GestureDetector(
                    onTap: () => ExportStatementSheet.show(context),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: const Color(0xFF86EFAC), width: 1.2),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: const Color(0xFF16A34A).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.file_download_outlined,
                                color: Color(0xFF16A34A), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Export Statement',
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF166534),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF16A34A),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        'CSV / PDF',
                                        style: GoogleFonts.inter(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  'Weekly, Monthly & Yearly • 🇮🇳 INR (₹)',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: const Color(0xFF15803D),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios_rounded,
                              color: Color(0xFF16A34A), size: 13),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Top Spending / Earnings Dynamic Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isExpense ? 'Top Spending' : 'Top Earnings',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF222222),
                        ),
                      ),
                      const SizedBox(width: 40),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Dynamic Transaction List from MySQL API
                  if (topItems.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.bar_chart_rounded,
                                size: 36, color: Colors.grey.shade400),
                            const SizedBox(height: 8),
                            Text(
                              'No ${isExpense ? 'spending' : 'earnings'} recorded for this period',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF444444),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...topItems.asMap().entries.map((entry) {
                      final index = entry.key;
                      final item = entry.value;
                      final isHighlighted = index == 0;
                      return _buildDynamicSpendingTile(
                        item: item,
                        isHighlighted: isHighlighted,
                      );
                    }),

                  const SizedBox(
                      height: 90), // Bottom padding for navigation bar
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDynamicSpendingTile({
    required TransactionModel item,
    required bool isHighlighted,
  }) {
    IconData icon = Icons.receipt_long_rounded;
    Color iconBg = const Color(0xFFF4F6F6);
    Color iconColor = AppColors.primary;

    final tLower = item.title.toLowerCase();
    final cLower = item.category.toLowerCase();

    if (tLower.contains('starbucks') ||
        cLower.contains('coffee') ||
        cLower.contains('food')) {
      icon = Icons.coffee_rounded;
      iconBg = const Color(0xFFE8F5E9);
      iconColor = const Color(0xFF00704A);
    } else if (tLower.contains('transfer') || cLower.contains('transfer')) {
      icon = Icons.swap_horiz_rounded;
      iconBg = const Color(0xFFEDE7F6);
      iconColor = const Color(0xFF5E35B1);
    } else if (tLower.contains('youtube') ||
        cLower.contains('movie') ||
        cLower.contains('entertain')) {
      icon = Icons.play_circle_fill_rounded;
      iconBg = const Color(0xFFFFEBEE);
      iconColor = const Color(0xFFC62828);
    } else if (tLower.contains('upwork') ||
        cLower.contains('freelance') ||
        cLower.contains('work')) {
      icon = Icons.work_outline_rounded;
      iconBg = const Color(0xFFE8F5E9);
      iconColor = const Color(0xFF2E7D32);
    } else if (tLower.contains('paypal') || cLower.contains('payment')) {
      icon = Icons.payment_rounded;
      iconBg = const Color(0xFFE3F2FD);
      iconColor = const Color(0xFF1565C0);
    } else if (cLower.contains('grocer') || cLower.contains('shopping')) {
      icon = Icons.shopping_bag_outlined;
      iconBg = const Color(0xFFFFF3E0);
      iconColor = const Color(0xFFE65100);
    } else if (cLower.contains('music') || tLower.contains('spotify')) {
      icon = Icons.music_note_rounded;
      iconBg = const Color(0xFFE8F5E9);
      iconColor = const Color(0xFF1DB954);
    }

    final formattedDate = DateFormat('MMM d, yyyy').format(item.date);

    if (isHighlighted) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.35),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    formattedDate,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                ],
              ),
            ),
            Text(
              item.formattedAmount,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFFDFDFD),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF222222),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  formattedDate,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: const Color(0xFF888888),
                  ),
                ),
              ],
            ),
          ),
          Text(
            item.formattedAmount,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: item.isIncome
                  ? const Color(0xFF25A969)
                  : const Color(0xFFF95B51),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatisticsChartPainter extends CustomPainter {
  final bool isIncome;

  _StatisticsChartPainter({this.isIncome = false});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final points = [
      Offset(w * 0.04, h * 0.8),
      Offset(w * 0.18, h * 0.65),
      Offset(w * 0.38, h * 0.58),
      Offset(w * 0.58, h * 0.38),
      Offset(w * 0.78, h * 0.65),
      Offset(w * 0.96, h * 0.55),
    ];

    final path = Path()..moveTo(points[0].dx, points[0].dy);
    for (int i = 0; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      final cx = (p0.dx + p1.dx) / 2;
      path.cubicTo(cx, p0.dy, cx, p1.dy, p1.dx, p1.dy);
    }

    final fillPath = Path.from(path)
      ..lineTo(points.last.dx, h)
      ..lineTo(points.first.dx, h)
      ..close();

    final primaryCol =
        isIncome ? const Color(0xFF25A969) : const Color(0xFF438883);

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          primaryCol.withOpacity(0.25),
          primaryCol.withOpacity(0.01),
        ],
      ).createShader(Rect.fromLTWH(0, 0, w, h));

    canvas.drawPath(fillPath, fillPaint);

    final strokePaint = Paint()
      ..color = primaryCol
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(path, strokePaint);

    final highlightPoint = points[2];
    final dashPaint = Paint()
      ..color = primaryCol.withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    double startY = highlightPoint.dy;
    while (startY < h) {
      canvas.drawLine(
        Offset(highlightPoint.dx, startY),
        Offset(highlightPoint.dx, (startY + 4).clamp(0, h)),
        dashPaint,
      );
      startY += 8;
    }

    final outerCircle = Paint()
      ..color = primaryCol.withOpacity(0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(highlightPoint, 10, outerCircle);

    final innerCircle = Paint()
      ..color = primaryCol
      ..style = PaintingStyle.fill;
    canvas.drawCircle(highlightPoint, 5, innerCircle);

    const badgeWidth = 64.0;
    const badgeHeight = 30.0;
    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(highlightPoint.dx - 12, highlightPoint.dy - 32),
        width: badgeWidth,
        height: badgeHeight,
      ),
      const Radius.circular(8),
    );

    final badgePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    final badgeBorder = Paint()
      ..color = primaryCol.withOpacity(0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    canvas.drawRRect(badgeRect, badgePaint);
    canvas.drawRRect(badgeRect, badgeBorder);

    final textSpan = TextSpan(
      text: isIncome ? '+₹1,406' : '₹1,230',
      style: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: primaryCol,
      ),
    );
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(
      canvas,
      Offset(
        highlightPoint.dx - 12 - textPainter.width / 2,
        highlightPoint.dy - 32 - textPainter.height / 2,
      ),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
