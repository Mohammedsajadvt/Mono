import 'package:equatable/equatable.dart';

enum TransactionType { income, expense }

class TransactionModel extends Equatable {
  final String id;
  final String title;
  final String category;
  final double amount;
  final TransactionType type;
  final DateTime date;
  final String? iconName;
  final String? invoicePath;

  const TransactionModel({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    required this.type,
    required this.date,
    this.iconName,
    this.invoicePath,
  });

  bool get isIncome => type == TransactionType.income;

  String get formattedAmount {
    final prefix = isIncome ? '+ ₹ ' : '- ₹ ';
    return '$prefix${amount.toStringAsFixed(2)}';
  }

  @override
  List<Object?> get props => [id, title, category, amount, type, date, iconName, invoicePath];
}

