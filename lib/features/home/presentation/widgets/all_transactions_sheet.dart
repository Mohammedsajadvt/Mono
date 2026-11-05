import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';

class AllTransactionsSheet extends StatefulWidget {
  const AllTransactionsSheet({super.key});

  @override
  State<AllTransactionsSheet> createState() => _AllTransactionsSheetState();
}

class _AllTransactionsSheetState extends State<AllTransactionsSheet> {
  final ScrollController _scrollController = ScrollController();
  final List<TransactionModel> _transactions = [];
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalCount = 0;
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String _selectedType = 'all'; // 'all', 'expense', 'income'

  @override
  void initState() {
    super.initState();
    _fetchTransactions(page: 1, reset: true);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoading &&
        !_isLoadingMore &&
        _currentPage < _totalPages) {
      _fetchTransactions(page: _currentPage + 1, reset: false);
    }
  }

  Future<void> _fetchTransactions({required int page, required bool reset}) async {
    if (reset) {
      setState(() {
        _isLoading = true;
        _currentPage = 1;
      });
    } else {
      setState(() {
        _isLoadingMore = true;
      });
    }

    try {
      final client = ApiClient(secureStorage: SecureStorageService());
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': 15,
      };
      if (_selectedType != 'all') {
        queryParams['type'] = _selectedType;
      }

      final res = await client.dio.get('/transactions', queryParameters: queryParams);
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

        final pagination = res.data['pagination'] as Map<String, dynamic>? ?? {};

        if (mounted) {
          setState(() {
            if (reset) {
              _transactions.clear();
            }
            _transactions.addAll(newItems);
            _currentPage = page;
            _totalPages = pagination['totalPages'] ?? 1;
            _totalCount = pagination['total'] ?? _transactions.length;
            _isLoading = false;
            _isLoadingMore = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    }
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

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Container(
      height: size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.receipt_long_rounded,
                      color: AppColors.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'All Transactions',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF222222),
                        ),
                      ),
                      Text(
                        '$_totalCount total records • Page $_currentPage of $_totalPages',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF666666),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, size: 22),
                  color: Colors.grey.shade600,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Filter Chips (All, Expense, Income)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                _buildFilterChip('All', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip('Expenses', 'expense'),
                const SizedBox(width: 8),
                _buildFilterChip('Income', 'income'),
              ],
            ),
          ),
          const Divider(height: 24),

          // Transactions List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : _transactions.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inbox_outlined,
                                size: 48, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text(
                              'No transactions found',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF444444),
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () =>
                            _fetchTransactions(page: 1, reset: true),
                        child: ListView.separated(
                          controller: _scrollController,
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                          itemCount: _transactions.length +
                              (_currentPage < _totalPages ? 1 : 0),
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            if (index == _transactions.length) {
                              return Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: _isLoadingMore
                                      ? const SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            color: AppColors.primary,
                                          ),
                                        )
                                      : const SizedBox.shrink(),
                                ),
                              );
                            }

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
                                color: const Color(0xFFF9FAFB),
                                borderRadius: BorderRadius.circular(16),
                                border:
                                    Border.all(color: Colors.grey.shade200),
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
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${item.category} • ${DateFormat('dd MMM yyyy').format(item.date)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            color: const Color(0xFF6B7280),
                                          ),
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
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedType == value;
    return InkWell(
      onTap: () {
        if (_selectedType != value) {
          setState(() {
            _selectedType = value;
          });
          _fetchTransactions(page: 1, reset: true);
        }
      },
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF4B5563),
          ),
        ),
      ),
    );
  }
}
