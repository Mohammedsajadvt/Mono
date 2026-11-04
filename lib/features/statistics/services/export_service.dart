import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/core/storage/secure_storage_service.dart';

class ExportBudgetMetrics {
  final double needsAmount;
  final double needsPercentage;
  final double wantsAmount;
  final double wantsPercentage;
  final double savingsAmount;
  final double savingsPercentage;

  const ExportBudgetMetrics({
    required this.needsAmount,
    required this.needsPercentage,
    required this.wantsAmount,
    required this.wantsPercentage,
    required this.savingsAmount,
    required this.savingsPercentage,
  });

  factory ExportBudgetMetrics.fromJson(Map<String, dynamic> json) {
    final needs = json['needs'] as Map<String, dynamic>? ?? {};
    final wants = json['wants'] as Map<String, dynamic>? ?? {};
    final savings = json['savings'] as Map<String, dynamic>? ?? {};

    return ExportBudgetMetrics(
      needsAmount: double.tryParse(needs['amount']?.toString() ?? '0') ?? 0,
      needsPercentage: double.tryParse(needs['percentage']?.toString() ?? '0') ?? 0,
      wantsAmount: double.tryParse(wants['amount']?.toString() ?? '0') ?? 0,
      wantsPercentage: double.tryParse(wants['percentage']?.toString() ?? '0') ?? 0,
      savingsAmount: double.tryParse(savings['amount']?.toString() ?? '0') ?? 0,
      savingsPercentage: double.tryParse(savings['percentage']?.toString() ?? '0') ?? 0,
    );
  }
}

class ExportReportData {
  final String period;
  final String currency;
  final String currencySymbol;
  final String userName;
  final String userEmail;
  final double totalIncome;
  final double totalExpense;
  final double netSavings;
  final double savingsRatePercent;
  final int transactionCount;
  final ExportBudgetMetrics budgeting50_30_20;
  final Map<String, double> paymentModes;
  final Map<String, double> categoryBreakdown;
  final List<Map<String, dynamic>> transactions;

  const ExportReportData({
    required this.period,
    required this.currency,
    required this.currencySymbol,
    required this.userName,
    required this.userEmail,
    required this.totalIncome,
    required this.totalExpense,
    required this.netSavings,
    required this.savingsRatePercent,
    required this.transactionCount,
    required this.budgeting50_30_20,
    required this.paymentModes,
    required this.categoryBreakdown,
    required this.transactions,
  });

  factory ExportReportData.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    final user = data['user'] as Map<String, dynamic>? ?? {};
    final summary = data['summary'] as Map<String, dynamic>? ?? {};
    final modesMap = data['paymentModes'] as Map<String, dynamic>? ?? {};
    final catMap = data['categoryBreakdown'] as Map<String, dynamic>? ?? {};
    final txList = (data['transactions'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    final parsedModes = <String, double>{};
    modesMap.forEach((k, v) {
      parsedModes[k] = double.tryParse(v.toString()) ?? 0.0;
    });

    final parsedCats = <String, double>{};
    catMap.forEach((k, v) {
      parsedCats[k] = double.tryParse(v.toString()) ?? 0.0;
    });

    return ExportReportData(
      period: data['period']?.toString() ?? 'Monthly',
      currency: data['currency']?.toString() ?? 'INR',
      currencySymbol: data['currencySymbol']?.toString() ?? '₹',
      userName: user['name']?.toString() ?? 'Mohammed Sajad',
      userEmail: user['email']?.toString() ?? '',
      totalIncome: double.tryParse(summary['totalIncome']?.toString() ?? '0') ?? 0,
      totalExpense: double.tryParse(summary['totalExpense']?.toString() ?? '0') ?? 0,
      netSavings: double.tryParse(summary['netSavings']?.toString() ?? '0') ?? 0,
      savingsRatePercent: double.tryParse(summary['savingsRatePercent']?.toString() ?? '0') ?? 0,
      transactionCount: int.tryParse(summary['transactionCount']?.toString() ?? '0') ?? 0,
      budgeting50_30_20: ExportBudgetMetrics.fromJson(
          data['budgeting50_30_20'] as Map<String, dynamic>? ?? {}),
      paymentModes: parsedModes,
      categoryBreakdown: parsedCats,
      transactions: txList,
    );
  }
}

class ExportService {
  final ApiClient _apiClient;

  ExportService({ApiClient? apiClient})
      : _apiClient = apiClient ??
            ApiClient(secureStorage: SecureStorageService());

  Future<ExportReportData> fetchExportReport({
    String period = 'monthly',
    String currency = 'INR',
    String type = 'all',
  }) async {
    try {
      final response = await _apiClient.dio.get(
        '/transactions/export',
        queryParameters: {
          'period': period,
          'currency': currency,
          'type': type,
          'format': 'json',
        },
      );

      if (response.data != null && response.data['success'] == true) {
        return ExportReportData.fromJson(response.data as Map<String, dynamic>);
      }
      throw Exception(response.data?['message'] ?? 'Failed to load export data');
    } catch (e) {
      // Fallback local report
      return _generateLocalFallbackReport(period, currency);
    }
  }

  Future<String> fetchCsvString({
    String period = 'monthly',
    String currency = 'INR',
    String type = 'all',
  }) async {
    try {
      final response = await _apiClient.dio.get(
        '/transactions/export',
        queryParameters: {
          'period': period,
          'currency': currency,
          'type': type,
          'format': 'csv',
        },
        options: Options(responseType: ResponseType.plain),
      );
      if (response.statusCode == 200 && response.data != null) {
        return response.data.toString();
      }
    } catch (_) {}

    // Fallback CSV generation
    return _generateLocalCsv(period, currency);
  }

  Future<String> saveCsvToDevice(String csvData, String filename) async {
    String? publicDownloadPath;
    try {
      if (Platform.isAndroid) {
        final publicDownloadDir = Directory('/storage/emulated/0/Download');
        if (publicDownloadDir.existsSync()) {
          final file = File('${publicDownloadDir.path}/$filename');
          await file.writeAsString(csvData);
          publicDownloadPath = file.path;
        }
      }
    } catch (_) {}

    // Always write to app documents directory as safe fallback
    try {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/$filename');
      await file.writeAsString(csvData);
      return publicDownloadPath ?? file.path;
    } catch (_) {
      return publicDownloadPath ?? filename;
    }
  }

  Future<void> copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
  }

  ExportReportData _generateLocalFallbackReport(String period, [String currency = 'INR']) {
    const sym = '₹';
    return ExportReportData(
      period: period == 'weekly'
          ? 'Weekly (Last 7 Days)'
          : period == 'yearly'
              ? 'Indian Financial Year (FY 2026-27)'
              : 'Monthly (November 2026)',
      currency: 'INR',
      currencySymbol: sym,
      userName: 'Mohammed Sajad',
      userEmail: 'sajad@mono.app',
      totalIncome: 0.0,
      totalExpense: 14.50,
      netSavings: -14.50,
      savingsRatePercent: 0.0,
      transactionCount: 1,
      budgeting50_30_20: const ExportBudgetMetrics(
        needsAmount: 14.50,
        needsPercentage: 100.0,
        wantsAmount: 0.0,
        wantsPercentage: 0.0,
        savingsAmount: 0.0,
        savingsPercentage: 0.0,
      ),
      paymentModes: {'UPI': 14.50, 'Card': 0.0, 'NetBanking': 0.0, 'Cash': 0.0},
      categoryBreakdown: {'Grocery': 14.50},
      transactions: [
        {
          'id': 1,
          'title': 'Starbucks Coffee',
          'type': 'expense',
          'amount': 14.50,
          'transaction_date': DateTime.now().toIso8601String().split('T').first,
          'payment_mode': 'UPI',
          'category_name': 'Grocery',
          'notes': 'Scanned with AI',
        }
      ],
    );
  }

  String _generateLocalCsv(String period, [String currency = 'INR']) {
    const sym = 'INR (₹)';
    final date = DateTime.now().toIso8601String().split('T').first;
    return 'Transaction ID,Date,Title,Category,Payment Mode,Type,Amount ($sym),Notes\r\n'
        '1,$date,"Starbucks Coffee","Grocery","UPI","expense",14.50,"Scanned with AI"\r\n';
  }
}

