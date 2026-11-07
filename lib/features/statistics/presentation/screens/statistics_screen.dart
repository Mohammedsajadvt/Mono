import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/routes/app_routes.dart';
import 'package:mono_app/core/widgets/shimmer_loading.dart';
import 'package:mono_app/features/add_expense/presentation/screens/add_expense_screen.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';
import 'package:mono_app/features/statistics/models/chart_point.dart';
import 'package:mono_app/features/statistics/presentation/widgets/export_statement_sheet.dart';

class StatisticsScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;

  const StatisticsScreen({super.key, this.onBackToHome});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  DateTime _selectedMonth = DateTime.now();

  @override
  void initState() {
    super.initState();
    // Preload current month statistics
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<ExpenseBloc>().add(
              ChangeStatisticPeriodEvent(
                'Month',
                month: _selectedMonth.month,
                year: _selectedMonth.year,
              ),
            );
      }
    });
  }

  List<String> _getDefaultLabels(String period) {
    final now = DateTime.now();
    if (period == 'Day') {
      return List.generate(7, (i) {
        final d = now.subtract(Duration(days: 6 - i));
        return DateFormat('E').format(d);
      });
    } else if (period == 'Week') {
      return ['W1', 'W2', 'W3', 'W4'];
    } else if (period == 'Year') {
      return List.generate(5, (i) => '${now.year - 4 + i}');
    } else {
      // Month
      return ['1-7', '8-14', '15-21', '22-28', '29+'];
    }
  }

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
            if (widget.onBackToHome != null) {
              widget.onBackToHome!();
            } else if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              Navigator.of(context).pushReplacementNamed(AppRoutes.home);
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
          if (state is ExpenseLoading) {
            return const StatisticsShimmer();
          }

          String currentPeriod = 'Month';
          TransactionType currentType = TransactionType.expense;
          List<TransactionModel> topItems = [];
          List<ChartPoint> chartPoints = [];

          if (state is ExpenseLoaded) {
            currentPeriod = state.selectedPeriod;
            currentType = state.selectedStatType;
            topItems = state.topSpendings;
            chartPoints = state.chartPoints;
          }

          final periods = ['Day', 'Week', 'Month', 'Year'];
          final isExpense = currentType == TransactionType.expense;

          // Compute labels for bottom X-axis
          final displayLabels = chartPoints.isNotEmpty
              ? chartPoints.map((p) => p.label).toList()
              : _getDefaultLabels(currentPeriod);

          // Find peak index in chartPoints
          int peakIndex = -1;
          double maxVal = 0.0;
          for (int i = 0; i < chartPoints.length; i++) {
            if (chartPoints[i].amount > maxVal) {
              maxVal = chartPoints[i].amount;
              peakIndex = i;
            }
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              context.read<ExpenseBloc>().add(LoadExpensesEvent());
              await Future.delayed(const Duration(milliseconds: 600));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
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
                              if (p == 'Month') {
                                context.read<ExpenseBloc>().add(
                                      ChangeStatisticPeriodEvent(
                                        'Month',
                                        month: _selectedMonth.month,
                                        year: _selectedMonth.year,
                                      ),
                                    );
                              } else {
                                context
                                    .read<ExpenseBloc>()
                                    .add(ChangeStatisticPeriodEvent(p));
                              }
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

                  // Monthly Movement Navigator (Previous / Next Month)
                  if (currentPeriod == 'Month') ...[
                    const SizedBox(height: 12),
                    Builder(
                      builder: (context) {
                        final now = DateTime.now();
                        final bool isCurrentOrFutureMonth =
                            _selectedMonth.year > now.year ||
                                (_selectedMonth.year == now.year &&
                                    _selectedMonth.month >= now.month);

                        return Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFA),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2EBEA)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                icon: const Icon(
                                    Icons.arrow_back_ios_new_rounded,
                                    size: 16),
                                color: AppColors.primary,
                                tooltip: 'Previous Month',
                                onPressed: () {
                                  setState(() {
                                    _selectedMonth = DateTime(
                                      _selectedMonth.year,
                                      _selectedMonth.month - 1,
                                      1,
                                    );
                                  });
                                  context.read<ExpenseBloc>().add(
                                        ChangeStatisticPeriodEvent(
                                          'Month',
                                          month: _selectedMonth.month,
                                          year: _selectedMonth.year,
                                        ),
                                      );
                                },
                              ),
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedMonth = DateTime.now();
                                  });
                                  context.read<ExpenseBloc>().add(
                                        ChangeStatisticPeriodEvent(
                                          'Month',
                                          month: _selectedMonth.month,
                                          year: _selectedMonth.year,
                                        ),
                                      );
                                },
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.calendar_month_outlined,
                                        size: 17, color: AppColors.primary),
                                    const SizedBox(width: 6),
                                    Text(
                                      DateFormat('MMMM yyyy')
                                          .format(_selectedMonth),
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF1E2929),
                                      ),
                                    ),
                                    if (_selectedMonth.month != now.month ||
                                        _selectedMonth.year != now.year) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary
                                              .withOpacity(0.12),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          'Current',
                                          style: GoogleFonts.inter(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                    Icons.arrow_forward_ios_rounded,
                                    size: 16),
                                color: isCurrentOrFutureMonth
                                    ? Colors.grey.shade300
                                    : AppColors.primary,
                                tooltip: isCurrentOrFutureMonth
                                    ? 'Reached Current Month'
                                    : 'Next Month',
                                onPressed: isCurrentOrFutureMonth
                                    ? null
                                    : () {
                                        setState(() {
                                          _selectedMonth = DateTime(
                                            _selectedMonth.year,
                                            _selectedMonth.month + 1,
                                            1,
                                          );
                                        });
                                        context.read<ExpenseBloc>().add(
                                              ChangeStatisticPeriodEvent(
                                                'Month',
                                                month: _selectedMonth.month,
                                                year: _selectedMonth.year,
                                              ),
                                            );
                                      },
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],

                  const SizedBox(height: 16),

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

                  // Interactive Dynamic Spline Chart
                  SizedBox(
                    height: 190,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _StatisticsChartPainter(
                        isIncome: !isExpense,
                        chartPoints: chartPoints,
                      ),
                    ),
                  ),

                  // Dynamic Timeline Labels
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: displayLabels.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final label = entry.value;
                      final isHighlight = peakIndex >= 0
                          ? idx == peakIndex
                          : (idx == displayLabels.length - 1);
                      return Text(
                        label,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight:
                              isHighlight ? FontWeight.w700 : FontWeight.w500,
                          color: isHighlight
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
                      IconButton(
                        icon: const Icon(Icons.swap_vert,
                            color: Color(0xFF666666)),
                        onPressed: () {},
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // List of Top Spendings or Earnings
                  if (topItems.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(28),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAFAFA),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.bar_chart_rounded,
                              size: 36, color: Colors.grey.shade400),
                          const SizedBox(height: 10),
                          Text(
                            isExpense
                                ? 'No spending recorded for this period'
                                : 'No earnings recorded for this period',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF666666),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ...topItems.map((item) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildTopItemCard(context, item),
                      );
                    }),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        );
      },
    ),
  );
}

  Widget _buildTopItemCard(BuildContext context, TransactionModel item) {
    IconData getCategoryIcon(String? iconName) {
      switch (iconName) {
        case 'movie_outlined':
          return Icons.movie_outlined;
        case 'coffee_rounded':
          return Icons.coffee_rounded;
        case 'shopping_bag_outlined':
          return Icons.shopping_bag_outlined;
        case 'swap_horiz_rounded':
          return Icons.swap_horiz_rounded;
        case 'payment_rounded':
          return Icons.payment_rounded;
        case 'play_circle_fill':
          return Icons.play_circle_fill;
        case 'music_note_rounded':
          return Icons.music_note_rounded;
        case 'bolt_rounded':
          return Icons.bolt_rounded;
        case 'fitness_center_rounded':
          return Icons.fitness_center_rounded;
        case 'restaurant_rounded':
          return Icons.restaurant_rounded;
        default:
          return Icons.category_rounded;
      }
    }

    return GestureDetector(
      onTap: () => _showTransactionActions(context, item),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEEEEEE)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: item.isIncome
                    ? const Color(0xFF25A969).withOpacity(0.12)
                    : const Color(0xFFF95B51).withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                getCategoryIcon(item.iconName),
                color: item.isIncome
                    ? const Color(0xFF25A969)
                    : const Color(0xFFF95B51),
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    softWrap: true,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF222222),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    DateFormat('MMM d, yyyy').format(item.date),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: const Color(0xFFAAAAAA),
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
      ),
    );
  }

  void _showTransactionActions(BuildContext context, TransactionModel item) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.edit_rounded,
                      color: AppColors.primary, size: 22),
                ),
                title: Text('Edit Transaction',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                subtitle: Text('Change title, amount, category or date',
                    style: GoogleFonts.inter(fontSize: 12)),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          AddExpenseScreen(initialTransaction: item),
                      fullscreenDialog: true,
                    ),
                  );
                  if (context.mounted) {
                    context.read<ExpenseBloc>().add(LoadExpensesEvent());
                  }
                },
              ),
              const Divider(height: 12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.delete_outline_rounded,
                      color: Color(0xFFDC2626), size: 22),
                ),
                title: Text('Delete Transaction',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFDC2626))),
                subtitle: Text('Permanently remove this transaction',
                    style: GoogleFonts.inter(fontSize: 12)),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _confirmDeleteTransaction(context, item);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDeleteTransaction(BuildContext context, TransactionModel item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete_outline_rounded,
                      color: Color(0xFFE53935), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Delete Transaction',
                        style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF222222),
                        ),
                      ),
                      Text(
                        'This will permanently remove this record',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF888888),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFEEEEEE)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF222222),
                          ),
                          softWrap: true,
                        ),
                        Text(
                          item.category,
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
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF555555),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(sheetCtx).pop();
                      context
                          .read<ExpenseBloc>()
                          .add(DeleteTransactionEvent(item.id));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Transaction "${item.title}" deleted'),
                          backgroundColor: const Color(0xFFE53935),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE53935),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Delete',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatisticsChartPainter extends CustomPainter {
  final bool isIncome;
  final List<ChartPoint> chartPoints;

  _StatisticsChartPainter({
    this.isIncome = false,
    this.chartPoints = const [],
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final primaryCol =
        isIncome ? const Color(0xFF25A969) : const Color(0xFF438883);

    // Filter points that have non-zero amounts
    final hasActivity = chartPoints.any((p) => p.amount > 0);

    if (!hasActivity || chartPoints.isEmpty) {
      // Clean zero baseline when no activity is recorded
      final baseY = h * 0.80;
      final basePaint = Paint()
        ..color = primaryCol.withOpacity(0.25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;

      // Draw subtle dashed zero baseline
      double startX = 16.0;
      while (startX < w - 16.0) {
        canvas.drawLine(
          Offset(startX, baseY),
          Offset(math.min(startX + 6, w - 16.0), baseY),
          basePaint,
        );
        startX += 10.0;
      }

      // Draw light gradient under baseline
      final zeroFill = Path()
        ..moveTo(16, baseY)
        ..lineTo(w - 16, baseY)
        ..lineTo(w - 16, h)
        ..lineTo(16, h)
        ..close();

      final fillPaint = Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            primaryCol.withOpacity(0.06),
            primaryCol.withOpacity(0.00),
          ],
        ).createShader(Rect.fromLTWH(0, 0, w, h));
      canvas.drawPath(zeroFill, fillPaint);

      // Badge in center showing ₹0.00
      final badgeCenter = Offset(w / 2, baseY - 36);
      const badgeW = 76.0;
      const badgeH = 28.0;
      final badgeRect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: badgeCenter, width: badgeW, height: badgeH),
        const Radius.circular(8),
      );

      final badgeBg = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      final badgeBorder = Paint()
        ..color = primaryCol.withOpacity(0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;

      canvas.drawRRect(badgeRect, badgeBg);
      canvas.drawRRect(badgeRect, badgeBorder);

      final textSpan = TextSpan(
        text: '₹0.00',
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
          badgeCenter.dx - textPainter.width / 2,
          badgeCenter.dy - textPainter.height / 2,
        ),
      );
      return;
    }

    // Dynamic curve rendering based on user's real transactions
    final n = chartPoints.length;
    final double maxAmt =
        chartPoints.map((p) => p.amount).reduce(math.max);
    final double effectiveMax = maxAmt > 0 ? maxAmt : 1.0;

    const double padX = 20.0;
    final double availableW = w - (2 * padX);
    final List<Offset> points = [];

    int peakIndex = 0;
    double highestAmount = 0.0;

    for (int i = 0; i < n; i++) {
      final amt = chartPoints[i].amount;
      if (amt >= highestAmount) {
        highestAmount = amt;
        peakIndex = i;
      }
      final double x = padX + (i / (n > 1 ? (n - 1) : 1)) * availableW;
      final double normalized = (amt / effectiveMax);
      // Normalized Y: 0 -> h * 0.82; max -> h * 0.28
      final double y = (h * 0.82) - (normalized * (h * 0.54));
      points.add(Offset(x, y));
    }

    if (points.length == 1) {
      points.insert(0, Offset(padX, h * 0.82));
      points.add(Offset(w - padX, h * 0.82));
    }

    // Build cubic spline
    final path = Path()..moveTo(points[0].dx, points[0].dy);
    for (int i = 0; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      final cx = (p0.dx + p1.dx) / 2;
      path.cubicTo(cx, p0.dy, cx, p1.dy, p1.dx, p1.dy);
    }

    // Fill area below curve
    final fillPath = Path.from(path)
      ..lineTo(points.last.dx, h)
      ..lineTo(points.first.dx, h)
      ..close();

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

    // Stroke curve
    final strokePaint = Paint()
      ..color = primaryCol
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(path, strokePaint);

    // Highlight peak point
    final peakPoint = points[peakIndex];

    // Vertical dashed drop line
    final dashPaint = Paint()
      ..color = primaryCol.withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    double startY = peakPoint.dy;
    while (startY < h * 0.82) {
      canvas.drawLine(
        Offset(peakPoint.dx, startY),
        Offset(peakPoint.dx, math.min(startY + 4, h * 0.82)),
        dashPaint,
      );
      startY += 8;
    }

    // Glow Circles
    final outerCircle = Paint()
      ..color = primaryCol.withOpacity(0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(peakPoint, 10, outerCircle);

    final innerCircle = Paint()
      ..color = primaryCol
      ..style = PaintingStyle.fill;
    canvas.drawCircle(peakPoint, 5, innerCircle);

    // Floating Dynamic Badge
    final formattedPeak = highestAmount >= 1000
        ? NumberFormat.currency(
            symbol: isIncome ? '+₹' : '₹',
            decimalDigits: highestAmount % 1 == 0 ? 0 : 2,
            locale: 'en_IN',
          ).format(highestAmount)
        : (isIncome
            ? '+₹${highestAmount.toStringAsFixed(highestAmount % 1 == 0 ? 0 : 2)}'
            : '₹${highestAmount.toStringAsFixed(highestAmount % 1 == 0 ? 0 : 2)}');

    final textSpan = TextSpan(
      text: formattedPeak,
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

    final badgeWidth = math.max(64.0, textPainter.width + 16.0);
    const badgeHeight = 30.0;
    final badgeCenterX =
        peakPoint.dx.clamp(badgeWidth / 2 + 8, w - badgeWidth / 2 - 8);
    final badgeCenterY = math.max(20.0, peakPoint.dy - 28);

    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(badgeCenterX, badgeCenterY),
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

    textPainter.paint(
      canvas,
      Offset(
        badgeCenterX - textPainter.width / 2,
        badgeCenterY - textPainter.height / 2,
      ),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
