import 'package:equatable/equatable.dart';
import 'package:mono_app/features/categories/models/category_model.dart';
import 'package:mono_app/features/expense/models/contact_model.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';

abstract class ExpenseState extends Equatable {
  const ExpenseState();

  @override
  List<Object?> get props => [];
}

class ExpenseInitial extends ExpenseState {}

class ExpenseLoading extends ExpenseState {}

class ExpenseLoaded extends ExpenseState {
  final double totalBalance;
  final double totalIncome;
  final double totalExpense;
  final List<TransactionModel> transactions;
  final List<CategoryModel> categories;
  final List<ContactModel> sendAgainContacts;
  final List<TransactionModel> topSpendings;
  final String selectedPeriod;
  final TransactionType selectedStatType;

  const ExpenseLoaded({
    required this.totalBalance,
    required this.totalIncome,
    required this.totalExpense,
    required this.transactions,
    this.categories = const [],
    this.sendAgainContacts = const [],
    this.topSpendings = const [],
    this.selectedPeriod = 'Day',
    this.selectedStatType = TransactionType.expense,
  });

  ExpenseLoaded copyWith({
    double? totalBalance,
    double? totalIncome,
    double? totalExpense,
    List<TransactionModel>? transactions,
    List<CategoryModel>? categories,
    List<ContactModel>? sendAgainContacts,
    List<TransactionModel>? topSpendings,
    String? selectedPeriod,
    TransactionType? selectedStatType,
  }) {
    return ExpenseLoaded(
      totalBalance: totalBalance ?? this.totalBalance,
      totalIncome: totalIncome ?? this.totalIncome,
      totalExpense: totalExpense ?? this.totalExpense,
      transactions: transactions ?? this.transactions,
      categories: categories ?? this.categories,
      sendAgainContacts: sendAgainContacts ?? this.sendAgainContacts,
      topSpendings: topSpendings ?? this.topSpendings,
      selectedPeriod: selectedPeriod ?? this.selectedPeriod,
      selectedStatType: selectedStatType ?? this.selectedStatType,
    );
  }

  @override
  List<Object?> get props => [
        totalBalance,
        totalIncome,
        totalExpense,
        transactions,
        categories,
        sendAgainContacts,
        topSpendings,
        selectedPeriod,
        selectedStatType,
      ];
}

class ExpenseError extends ExpenseState {
  final String message;

  const ExpenseError(this.message);

  @override
  List<Object?> get props => [message];
}
