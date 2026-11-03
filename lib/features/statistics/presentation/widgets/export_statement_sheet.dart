import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/features/statistics/services/export_service.dart';

class ExportStatementSheet extends StatefulWidget {
  const ExportStatementSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ExportStatementSheet(),
    );
  }

  @override
  State<ExportStatementSheet> createState() => _ExportStatementSheetState();
}

class _ExportStatementSheetState extends State<ExportStatementSheet> {
  final ExportService _exportService = ExportService();

  String _selectedPeriod = 'monthly'; // weekly, monthly, yearly, all
  String _selectedFormat = 'csv'; // csv, pdf
  final String _selectedCurrency = 'INR';
  final String _selectedType = 'all'; // all, expense, income
  bool _isLoading = false;

  final periods = [
    {'id': 'monthly', 'label': 'Monthly', 'desc': 'Current Month'},
    {'id': 'weekly', 'label': 'Weekly', 'desc': 'Last 7 Days'},
    {'id': 'yearly', 'label': 'Yearly', 'desc': 'Indian FY 26-27'},
    {'id': 'all', 'label': 'All Time', 'desc': 'Complete Record'},
  ];

  Future<void> _handleDownloadCsv() async {
    setState(() => _isLoading = true);
    try {
      final csvData = await _exportService.fetchCsvString(
        period: _selectedPeriod,
        currency: _selectedCurrency,
        type: _selectedType,
      );

      final filename =
          'mono_${_selectedPeriod}_statement_${DateTime.now().millisecondsSinceEpoch}.csv';
      final path = await _exportService.saveCsvToDevice(csvData, filename);

      if (!mounted) return;
      Navigator.of(context).pop();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '📁 CSV Statement Saved Successfully!',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                'Saved at: $path',
                style: GoogleFonts.inter(
                    fontSize: 11, color: Colors.white.withOpacity(0.9)),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 5),
          action: SnackBarAction(
            label: 'COPY CSV',
            textColor: Colors.amberAccent,
            onPressed: () {
              _exportService.copyToClipboard(csvData);
            },
          ),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Export error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handlePreviewStatement() async {
    setState(() => _isLoading = true);
    try {
      final report = await _exportService.fetchExportReport(
        period: _selectedPeriod,
        currency: _selectedCurrency,
        type: _selectedType,
      );

      if (!mounted) return;
      _showStatementPreviewDialog(report);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load statement: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showStatementPreviewDialog(ExportReportData report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (dialogCtx) => DraggableScrollableSheet(
        initialChildSize: 0.90,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
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
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.picture_as_pdf_rounded,
                              color: AppColors.primary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Financial Statement Preview',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF222222),
                              ),
                            ),
                            Text(
                              report.period,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: const Color(0xFF666666),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: Color(0xFF666666)),
                      onPressed: () => Navigator.of(dialogCtx).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Official Statement Header Box
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: AppColors.splashGradient,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'MONO STATEMENT',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white.withOpacity(0.9),
                                  letterSpacing: 1.2,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '🇮🇳 Indian System (₹ INR)',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            report.userName,
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            report.userEmail,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.85),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildStatementStat(
                                    'Inflow',
                                    '${report.currencySymbol}${report.totalIncome.toStringAsFixed(2)}',
                                    Colors.greenAccent),
                                _buildStatementStat(
                                    'Outflow',
                                    '${report.currencySymbol}${report.totalExpense.toStringAsFixed(2)}',
                                    Colors.orangeAccent),
                                _buildStatementStat(
                                    'Net Savings',
                                    '${report.currencySymbol}${report.netSavings.toStringAsFixed(2)}',
                                    Colors.white),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Indian Budgeting Style: 50/30/20 Rule Analysis
                    Text(
                      '50 / 30 / 20 BUDGETING STYLE ANALYSIS',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF666666),
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          _buildBudgetProgressRow(
                            label: 'Needs (Groceries, Bills, EMI, Fuel)',
                            amount:
                                '${report.currencySymbol}${report.budgeting50_30_20.needsAmount.toStringAsFixed(2)}',
                            percentage:
                                report.budgeting50_30_20.needsPercentage,
                            targetPercentage: 50.0,
                            color: const Color(0xFF0284C7),
                          ),
                          const SizedBox(height: 12),
                          _buildBudgetProgressRow(
                            label: 'Wants (Dining, Entertainment, Shopping)',
                            amount:
                                '${report.currencySymbol}${report.budgeting50_30_20.wantsAmount.toStringAsFixed(2)}',
                            percentage:
                                report.budgeting50_30_20.wantsPercentage,
                            targetPercentage: 30.0,
                            color: const Color(0xFFF59E0B),
                          ),
                          const SizedBox(height: 12),
                          _buildBudgetProgressRow(
                            label: 'Savings & SIP (Investments, Emergency)',
                            amount:
                                '${report.currencySymbol}${report.budgeting50_30_20.savingsAmount.toStringAsFixed(2)}',
                            percentage:
                                report.budgeting50_30_20.savingsPercentage,
                            targetPercentage: 20.0,
                            color: const Color(0xFF10B981),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Indian Payment Mode Distribution (UPI, NetBanking, Cards, Cash)
                    Text(
                      'INDIAN PAYMENT MODES DISTRIBUTION',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF666666),
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildModeChip(
                              'UPI (GPay/PhonePe)',
                              '${report.currencySymbol}${report.paymentModes['UPI']?.toStringAsFixed(2) ?? '0.00'}',
                              Icons.qr_code_2_rounded,
                              const Color(0xFF4F46E5)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildModeChip(
                              'Cards',
                              '${report.currencySymbol}${report.paymentModes['Card']?.toStringAsFixed(2) ?? '0.00'}',
                              Icons.credit_card_rounded,
                              const Color(0xFF0D9488)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildModeChip(
                              'Cash',
                              '${report.currencySymbol}${report.paymentModes['Cash']?.toStringAsFixed(2) ?? '0.00'}',
                              Icons.money_rounded,
                              const Color(0xFF16A34A)),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Itemized Transactions Table Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'ITEMIZED TRANSACTIONS (${report.transactionCount})',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF666666),
                            letterSpacing: 0.6,
                          ),
                        ),
                        Text(
                          'Amount',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF666666),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (report.transactions.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: Text(
                            'No transactions recorded in this period.',
                            style: GoogleFonts.inter(color: Colors.grey),
                          ),
                        ),
                      )
                    else
                      ...report.transactions.map((tx) {
                        final isExp = tx['type'] == 'expense';
                        final amt = double.tryParse(tx['amount']?.toString() ?? '0') ?? 0;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 34,
                                height: 34,
                                decoration: BoxDecoration(
                                  color: isExp
                                      ? Colors.red.withOpacity(0.1)
                                      : Colors.green.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  isExp
                                      ? Icons.arrow_outward_rounded
                                      : Icons.arrow_downward_rounded,
                                  color: isExp ? Colors.red : Colors.green,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      tx['title']?.toString() ?? 'Expense',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: const Color(0xFF222222),
                                      ),
                                    ),
                                    Text(
                                      '${tx['transaction_date']} • ${tx['category_name']} • ${tx['payment_mode'] ?? 'UPI'}',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        color: const Color(0xFF888888),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '${isExp ? '-' : '+'} ${report.currencySymbol}${amt.toStringAsFixed(2)}',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: isExp
                                      ? const Color(0xFFF95B51)
                                      : const Color(0xFF25A969),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                  ],
                ),
              ),

              // Bottom Actions: Copy CSV / Save
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final csv = await _exportService.fetchCsvString(
                            period: _selectedPeriod,
                            currency: _selectedCurrency,
                            type: _selectedType,
                          );
                          await _exportService.copyToClipboard(csv);
                          if (!dialogCtx.mounted) return;
                          ScaffoldMessenger.of(dialogCtx).showSnackBar(
                            const SnackBar(
                              content: Text('📋 CSV data copied to clipboard!'),
                              backgroundColor: AppColors.primary,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        },
                        icon: const Icon(Icons.copy_rounded, size: 16),
                        label: Text(
                          'Copy CSV',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(dialogCtx).pop();
                          _handleDownloadCsv();
                        },
                        icon: const Icon(Icons.download_rounded, size: 18),
                        label: Text(
                          'Save CSV',
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
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

  Widget _buildStatementStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            color: Colors.white.withOpacity(0.8),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 13,
            color: color,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildBudgetProgressRow({
    required String label,
    required String amount,
    required double percentage,
    required double targetPercentage,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF333333),
                ),
              ),
            ),
            Text(
              '$amount (${percentage.toStringAsFixed(0)}% / target ${targetPercentage.toStringAsFixed(0)}%)',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (percentage / 100).clamp(0.0, 1.0),
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildModeChip(
      String label, String amount, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            amount,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF222222),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.file_download_outlined,
                    color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Export Statement & Reports',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF222222),
                      ),
                    ),
                    Text(
                      'Tailored for Indian & Global Budgeting',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF777777),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 1. Time Period Filter (Monthly, Weekly, Yearly, All)
          Text(
            'SELECT FILTER PERIOD',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF888888),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: periods.map((p) {
              final isSel = p['id'] == _selectedPeriod;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _selectedPeriod = p['id']!),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: isSel
                          ? AppColors.primary
                          : const Color(0xFFF4F6F6),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSel
                            ? AppColors.primary
                            : Colors.grey.shade300,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          p['label']!,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSel ? Colors.white : const Color(0xFF444444),
                          ),
                        ),
                        Text(
                          p['desc']!,
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            color: isSel
                                ? Colors.white.withOpacity(0.85)
                                : const Color(0xFF888888),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 18),

          // 2. Financial System & Currency
          Text(
            'FINANCIAL SYSTEM & CURRENCY',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF888888),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFA5D6A7)),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF2E7D32),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text('₹',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Indian Financial System (INR)',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF1B5E20),
                        ),
                      ),
                      Text(
                        '₹ Indian Rupee • UPI Breakdown • FY 2026-27',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: const Color(0xFF388E3C),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.check_circle_rounded,
                    color: Color(0xFF2E7D32), size: 20),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // 3. Export Format (CSV / PDF)
          Text(
            'EXPORT FORMAT',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF888888),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildFormatTile(
                  title: 'CSV Spreadsheet',
                  subtitle: 'Excel, Sheets, Tally (.csv)',
                  icon: Icons.table_chart_rounded,
                  isSelected: _selectedFormat == 'csv',
                  onTap: () => setState(() => _selectedFormat = 'csv'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildFormatTile(
                  title: 'PDF Statement',
                  subtitle: 'Printable Statement (.pdf)',
                  icon: Icons.picture_as_pdf_rounded,
                  isSelected: _selectedFormat == 'pdf',
                  onTap: () => setState(() => _selectedFormat = 'pdf'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // CTA Action Buttons
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _handlePreviewStatement,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(
                          color: AppColors.primary, width: 1.5),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      'Preview Report',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _handleDownloadCsv,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      _selectedFormat == 'csv' ? 'Export CSV' : 'Generate PDF',
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
    );
  }


  Widget _buildFormatTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.08)
              : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon,
                color: isSelected ? AppColors.primary : const Color(0xFF666666),
                size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isSelected
                          ? AppColors.primary
                          : const Color(0xFF222222),
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      color: const Color(0xFF777777),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
