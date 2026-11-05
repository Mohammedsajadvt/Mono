import 'package:equatable/equatable.dart';
import 'package:mono_app/features/categories/models/category_model.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';

abstract class ExpenseEvent extends Equatable {
  const ExpenseEvent();

  @override
  List<Object?> get props => [];
}

class LoadExpensesEvent extends ExpenseEvent {}

class AddExpenseEvent extends ExpenseEvent {
  final TransactionModel transaction;

  const AddExpenseEvent(this.transaction);

  @override
  List<Object?> get props => [transaction];
}

class ChangeStatisticPeriodEvent extends ExpenseEvent {
  final String period; // 'Day', 'Week', 'Month', 'Year'

  const ChangeStatisticPeriodEvent(this.period);

  @override
  List<Object?> get props => [period];
}

class ChangeStatisticTypeEvent extends ExpenseEvent {
  final TransactionType type;

  const ChangeStatisticTypeEvent(this.type);

  @override
  List<Object?> get props => [type];
}

class AddCategoryEvent extends ExpenseEvent {
  final CategoryModel category;

  const AddCategoryEvent(this.category);

  @override
  List<Object?> get props => [category];
}

class DeleteCategoryEvent extends ExpenseEvent {
  final String categoryId;

  const DeleteCategoryEvent(this.categoryId);

  @override
  List<Object?> get props => [categoryId];
}

class UpdateCategoryEvent extends ExpenseEvent {
  final CategoryModel category;

  const UpdateCategoryEvent(this.category);

  @override
  List<Object?> get props => [category];
}

class UpdateTransactionEvent extends ExpenseEvent {
  final TransactionModel transaction;

  const UpdateTransactionEvent(this.transaction);

  @override
  List<Object?> get props => [transaction];
}

class DeleteTransactionEvent extends ExpenseEvent {
  final String transactionId;

  const DeleteTransactionEvent(this.transactionId);

  @override
  List<Object?> get props => [transactionId];
}

class ResetExpenseEvent extends ExpenseEvent {}
