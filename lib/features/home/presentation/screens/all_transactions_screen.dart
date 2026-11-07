import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';
import 'package:mono_app/core/widgets/custom_date_range_dialog.dart';
import 'package:mono_app/core/widgets/shimmer_loading.dart';
import 'package:mono_app/features/add_expense/presentation/screens/add_expense_screen.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';

class AllTransactionsScreen extends StatefulWidget {
  const AllTransactionsScreen({super.key});

  @override
  State<AllTransactionsScreen> createState() => _AllTransactionsScreenState();
}

class _AllTransactionsScreenState extends State<AllTransactionsScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<TransactionModel> _transactions = [];
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalCount = 0;
  bool _isLoading = false;
  String _selectedType = 'all'; // 'all', 'expense', 'income'
  DateTimeRange? _selectedDateRange;
  String _dateLabel = 'All Dates';

  @override
  void initState() {
    super.initState();
    _fetchTransactions(page: 1, reset: true);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToTop() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _applyDateFilter(DateTimeRange? range, String label) {
    setState(() {
      _selectedDateRange = range;
      _dateLabel = label;
    });
    _fetchTransactions(page: 1, reset: true);
  }

  void _showCalendarFilterSheet() {
    final now = DateTime.now();
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Filter by Date / Period',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF222222),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(bCtx).pop(),
                    icon: const Icon(Icons.close, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ListTile(
                leading: const Icon(Icons.calendar_today_outlined,
                    color: AppColors.primary),
                title: Text('All Dates (Clear Filter)',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.of(bCtx).pop();
                  _applyDateFilter(null, 'All Dates');
                },
              ),
              ListTile(
                leading:
                    const Icon(Icons.today_rounded, color: AppColors.primary),
                title: Text('Today',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.of(bCtx).pop();
                  final today = DateTime(now.year, now.month, now.day);
                  _applyDateFilter(
                      DateTimeRange(start: today, end: today), 'Today');
                },
              ),
              ListTile(
                leading: const Icon(Icons.date_range_rounded,
                    color: AppColors.primary),
                title: Text('This Week',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.of(bCtx).pop();
                  final startOfWeek =
                      now.subtract(Duration(days: now.weekday - 1));
                  _applyDateFilter(
                    DateTimeRange(
                      start: DateTime(
                          startOfWeek.year, startOfWeek.month, startOfWeek.day),
                      end: DateTime(now.year, now.month, now.day),
                    ),
                    'This Week',
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.calendar_month_rounded,
                    color: AppColors.primary),
                title: Text('This Month',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.of(bCtx).pop();
                  _applyDateFilter(
                    DateTimeRange(
                      start: DateTime(now.year, now.month, 1),
                      end: DateTime(now.year, now.month, now.day),
                    ),
                    DateFormat('MMMM yyyy').format(now),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit_calendar_rounded,
                    color: AppColors.primary),
                title: Text('Custom Date Range...',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                onTap: () async {
                  Navigator.of(bCtx).pop();
                  final picked = await showCustomDateRangeDialog(
                    context,
                    initialRange: _selectedDateRange,
                  );
                  if (picked != null) {
                    final label =
                        '${DateFormat('d MMM').format(picked.start)} - ${DateFormat('d MMM').format(picked.end)}';
                    _applyDateFilter(picked, label);
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _fetchTransactions({required int page, required bool reset}) async {
    setState(() {
      _isLoading = true;
      if (reset) {
        _currentPage = page;
      }
    });

    try {
      final client = ApiClient(secureStorage: SecureStorageService());
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': 15,
      };
      if (_selectedType != 'all') {
        queryParams['type'] = _selectedType;
      }
      if (_selectedDateRange != null) {
        queryParams['startDate'] =
            DateFormat('yyyy-MM-dd').format(_selectedDateRange!.start);
        queryParams['endDate'] =
            DateFormat('yyyy-MM-dd').format(_selectedDateRange!.end);
      }

      final res =
          await client.dio.get('/transactions', queryParameters: queryParams);
      if (res.statusCode == 200 && res.data['transactions'] is List) {
        final list = res.data['transactions'] as List;
        final newItems = list.map((t) {
          return TransactionModel(
            id: t['id'].toString(),
            title: t['title'] ?? '',
            category: t['category_name'] ?? t['title'] ?? '',
            amount: (t['amount'] is num)
                ? (t['amount'] as num).toDouble()
                : (double.tryParse(t['amount']?.toString() ?? '') ?? 0.0),
            type: t['type'] == 'income'
                ? TransactionType.income
                : TransactionType.expense,
            date: DateTime.tryParse(t['transaction_date']?.toString() ?? '') ??
                DateTime.now(),
            iconName: t['category_icon'] ?? 'coffee_rounded',
          );
        }).toList();

        final pagination =
            res.data['pagination'] as Map<String, dynamic>? ?? {};

        if (mounted) {
          setState(() {
            _transactions.clear();
            _transactions.addAll(newItems);
            _currentPage = page;
            _totalPages = (pagination['totalPages'] as num?)?.toInt() ?? 1;
            if (_totalPages < 1) _totalPages = 1;
            _totalCount = (pagination['total'] as num?)?.toInt() ?? _transactions.length;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _editTransaction(
      BuildContext context, TransactionModel item) async {
    final expenseBloc = context.read<ExpenseBloc>();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AddExpenseScreen(initialTransaction: item),
        fullscreenDialog: true,
      ),
    );
    if (!mounted) return;
    _fetchTransactions(page: _currentPage, reset: true);
    expenseBloc.add(LoadExpensesEvent());
  }

  void _confirmDelete(BuildContext context, TransactionModel item) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Color(0xFFFEE2E2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.delete_outline_rounded,
                  color: Color(0xFFEF4444), size: 24),
            ),
            const SizedBox(width: 12),
            Text(
              'Delete Record',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF1F2937),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete "${item.title}" (₹${item.amount.toStringAsFixed(2)})?',
          style: GoogleFonts.inter(
            fontSize: 14,
            color: const Color(0xFF4B5563),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(
              'Cancel',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              context.read<ExpenseBloc>().add(DeleteTransactionEvent(item.id));
              setState(() {
                _transactions.removeWhere((t) => t.id == item.id);
                _totalCount = (_totalCount - 1).clamp(0, 999999);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Transaction deleted successfully'),
                  backgroundColor: Color(0xFF16A34A),
                  behavior: SnackBarBehavior.floating,
                ),
              );
              // If current page became empty and page > 1, step back
              if (_transactions.isEmpty && _currentPage > 1) {
                _fetchTransactions(page: _currentPage - 1, reset: true);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Delete',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showJumpToPageDialog() {
    if (_totalPages <= 1) return;
    int selected = _currentPage;
    showDialog(
      context: context,
      builder: (dCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Jump to Page',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_totalPages, (i) {
              final pageNum = i + 1;
              final isCur = pageNum == selected;
              return ChoiceChip(
                label: Text('Page $pageNum'),
                selected: isCur,
                selectedColor: AppColors.primary,
                labelStyle: GoogleFonts.inter(
                  color: isCur ? Colors.white : const Color(0xFF1F2937),
                  fontWeight: isCur ? FontWeight.w700 : FontWeight.w500,
                ),
                onSelected: (_) {
                  Navigator.of(dCtx).pop();
                  if (pageNum != _currentPage) {
                    _fetchTransactions(page: pageNum, reset: true);
                    _scrollToTop();
                  }
                },
              );
            }),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dCtx).pop(),
            child: Text('Close', style: GoogleFonts.inter(color: Colors.grey)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Color(0xFF1E293B), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'All Transactions',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
            Text(
              '$_totalCount records • Page $_currentPage of $_totalPages',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF64748B),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh_rounded,
                color: AppColors.primary, size: 22),
            onPressed: _isLoading
                ? null
                : () => _fetchTransactions(page: _currentPage, reset: true),
          ),
          const SizedBox(width: 6),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: const Color(0xFFE2E8F0),
            height: 1,
          ),
        ),
      ),
      body: Column(
        children: [
          // Filter Chips (All, Expense, Income) + Calendar Filter
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                _buildFilterChip('All', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip('Expenses', 'expense'),
                const SizedBox(width: 8),
                _buildFilterChip('Income', 'income'),
                const Spacer(),
                GestureDetector(
                  onTap: _showCalendarFilterSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: _selectedDateRange != null
                          ? AppColors.primary
                          : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _selectedDateRange != null
                            ? AppColors.primary
                            : const Color(0xFFCBD5E1),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.calendar_month_rounded,
                          size: 15,
                          color: _selectedDateRange != null
                              ? Colors.white
                              : const Color(0xFF475569),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _dateLabel,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _selectedDateRange != null
                                ? Colors.white
                                : const Color(0xFF475569),
                          ),
                        ),
                        if (_selectedDateRange != null) ...[
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () => _applyDateFilter(null, 'All Dates'),
                            child: const Icon(
                              Icons.close,
                              size: 14,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Transactions List
          Expanded(
            child: _isLoading
                ? const TransactionListShimmer(
                    count: 8,
                    padding: EdgeInsets.fromLTRB(20, 16, 20, 16),
                  )
                : _transactions.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF1F5F9),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.receipt_long_rounded,
                                  size: 36,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No transactions found',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF1E293B),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _selectedType != 'all' || _selectedDateRange != null
                                    ? 'Try adjusting your type or date filter.'
                                    : 'Log an expense or income to get started.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              if (_selectedType != 'all' ||
                                  _selectedDateRange != null) ...[
                                const SizedBox(height: 16),
                                OutlinedButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      _selectedType = 'all';
                                      _selectedDateRange = null;
                                      _dateLabel = 'All Dates';
                                    });
                                    _fetchTransactions(page: 1, reset: true);
                                  },
                                  icon: const Icon(Icons.filter_alt_off_rounded,
                                      size: 16),
                                  label: const Text('Reset Filters'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.primary,
                                    side: const BorderSide(
                                        color: AppColors.primary),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () =>
                            _fetchTransactions(page: _currentPage, reset: true),
                        child: ListView.separated(
                          controller: _scrollController,
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                          itemCount: _transactions.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final item = _transactions[index];
                            final isIncome =
                                item.type == TransactionType.income;
                            final amountFormatted = NumberFormat.currency(
                              locale: 'en_IN',
                              symbol: '₹ ',
                              decimalDigits: 2,
                            ).format(item.amount);

                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border:
                                    Border.all(color: const Color(0xFFE2E8F0)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.02),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: isIncome
                                          ? const Color(0xFFECFDF5)
                                          : const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      isIncome
                                          ? Icons.arrow_downward_rounded
                                          : Icons.arrow_upward_rounded,
                                      color: isIncome
                                          ? const Color(0xFF10B981)
                                          : const Color(0xFFEF4444),
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.title,
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: const Color(0xFF1F2937),
                                          ),
                                          softWrap: true,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${item.category} • ${DateFormat('dd MMM yyyy').format(item.date)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            color: const Color(0xFF6B7280),
                                          ),
                                          softWrap: true,
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '${isIncome ? '+' : '-'} $amountFormatted',
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: isIncome
                                              ? const Color(0xFF10B981)
                                              : const Color(0xFFEF4444),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined,
                                        size: 19, color: AppColors.primary),
                                    onPressed: () =>
                                        _editTransaction(context, item),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                  const SizedBox(width: 6),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline_rounded,
                                        size: 20, color: Color(0xFFEF4444)),
                                    onPressed: () =>
                                        _confirmDelete(context, item),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: const Border(
              top: BorderSide(color: Color(0xFFE2E8F0)),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                offset: const Offset(0, -3),
                blurRadius: 8,
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Previous Page
              ElevatedButton.icon(
                onPressed: (_currentPage > 1 && !_isLoading)
                    ? () {
                        _fetchTransactions(page: _currentPage - 1, reset: true);
                        _scrollToTop();
                      }
                    : null,
                icon: const Icon(Icons.arrow_back_rounded, size: 16),
                label: Text(
                  'Previous',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  backgroundColor: const Color(0xFFF1F5F9),
                  disabledForegroundColor: Colors.grey.shade400,
                  disabledBackgroundColor: const Color(0xFFF8FAFC),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              // Page Indicator Pill
              GestureDetector(
                onTap: _showJumpToPageDialog,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Page $_currentPage of $_totalPages',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                      if (_totalPages > 1) ...[
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.unfold_more_rounded,
                          size: 14,
                          color: AppColors.primary,
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Next Page
              ElevatedButton(
                onPressed: (_currentPage < _totalPages && !_isLoading)
                    ? () {
                        _fetchTransactions(page: _currentPage + 1, reset: true);
                        _scrollToTop();
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  foregroundColor: Colors.white,
                  backgroundColor: AppColors.primary,
                  disabledForegroundColor: Colors.grey.shade400,
                  disabledBackgroundColor: const Color(0xFFE2E8F0),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Next',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: (_currentPage < _totalPages && !_isLoading)
                            ? Colors.white
                            : Colors.grey.shade400,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: (_currentPage < _totalPages && !_isLoading)
                          ? Colors.white
                          : Colors.grey.shade400,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedType == value;
    return GestureDetector(
      onTap: () {
        if (_selectedType != value) {
          setState(() {
            _selectedType = value;
          });
          _fetchTransactions(page: 1, reset: true);
        }
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
