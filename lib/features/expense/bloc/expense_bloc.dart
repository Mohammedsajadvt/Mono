import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/features/categories/models/category_model.dart';
import 'package:mono_app/features/expense/models/contact_model.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';

class ExpenseBloc extends Bloc<ExpenseEvent, ExpenseState> {
  final ApiClient? apiClient;

  ExpenseBloc({this.apiClient}) : super(ExpenseInitial()) {
    on<LoadExpensesEvent>(_onLoadExpenses);
    on<AddExpenseEvent>(_onAddExpense);
    on<ChangeStatisticPeriodEvent>(_onChangeStatisticPeriod);
    on<ChangeStatisticTypeEvent>(_onChangeStatisticType);
    on<AddCategoryEvent>(_onAddCategory);
    on<DeleteCategoryEvent>(_onDeleteCategory);
  }

  static IconData iconFromName(String? iconName) {
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
        return Icons.category_outlined;
    }
  }

  static Color colorFromHex(String? hexString) {
    if (hexString == null || hexString.isEmpty) return const Color(0xFF438883);
    final buffer = StringBuffer();
    if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
    buffer.write(hexString.replaceFirst('#', ''));
    return Color(int.tryParse(buffer.toString(), radix: 16) ?? 0xFF438883);
  }

  Future<void> _onLoadExpenses(
    LoadExpensesEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    emit(ExpenseLoading());

    if (apiClient != null) {
      try {
        // 1. Dynamically fetch categories from MySQL API
        List<CategoryModel> loadedCategories = [];
        try {
          final catRes = await apiClient!.dio.get('/categories');
          if (catRes.statusCode == 200 && catRes.data['categories'] is List) {
            final list = catRes.data['categories'] as List;
            loadedCategories = list
                .map((item) {
                  return CategoryModel(
                    id: item['id'].toString(),
                    name: item['name'] ?? '',
                    icon: iconFromName(item['icon']?.toString()),
                    color: colorFromHex(item['color']?.toString()),
                    status: item['status']?.toString() ?? 'active',
                    type: item['type']?.toString() ?? 'both',
                  );
                })
                .where((cat) => cat.isActive)
                .toList();
          }
        } catch (e) {
          debugPrint('[ExpenseBloc] Categories fetch error: $e');
        }

        // 2. Dynamically fetch dashboard data (Totals, Recent Transactions, Contacts, Top Spendings)
        final dashRes = await apiClient!.dio.get('/transactions/dashboard');
        if (dashRes.statusCode == 200 && dashRes.data['data'] != null) {
          final d = dashRes.data['data'];

          // Transactions
          final rawTx = d['recentTransactions'] as List? ?? [];
          final txList = rawTx.map((t) {
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
              date:
                  DateTime.tryParse(t['transaction_date']?.toString() ?? '') ??
                      DateTime.now(),
              iconName: t['category_icon'] ?? 'coffee_rounded',
            );
          }).toList();

          // Send Again Contacts
          final rawContacts = d['sendAgainContacts'] as List? ?? [];
          final contactList = rawContacts
              .map((c) => ContactModel.fromJson(c as Map<String, dynamic>))
              .toList();

          // Top Spendings
          final rawTop = d['topSpendings'] as List? ?? [];
          final topList = rawTop.map((t) {
            return TransactionModel(
              id: t['id'].toString(),
              title: t['title'] ?? '',
              category: t['category_name'] ?? t['title'] ?? '',
              amount: (t['amount'] is num)
                  ? (t['amount'] as num).toDouble()
                  : (double.tryParse(t['amount']?.toString() ?? '') ?? 0.0),
              type: TransactionType.expense,
              date:
                  DateTime.tryParse(t['transaction_date']?.toString() ?? '') ??
                      DateTime.now(),
              iconName: t['category_icon'] ?? 'coffee_rounded',
            );
          }).toList();

          final balance = (d['totalBalance'] is num)
              ? (d['totalBalance'] as num).toDouble()
              : (double.tryParse(d['totalBalance']?.toString() ?? '') ?? 0.0);
          final income = (d['totalIncome'] is num)
              ? (d['totalIncome'] as num).toDouble()
              : (double.tryParse(d['totalIncome']?.toString() ?? '') ?? 0.0);
          final expense = (d['totalExpense'] is num)
              ? (d['totalExpense'] as num).toDouble()
              : (double.tryParse(d['totalExpense']?.toString() ?? '') ?? 0.0);

          emit(ExpenseLoaded(
            totalBalance: balance,
            totalIncome: income,
            totalExpense: expense,
            transactions: txList,
            categories: loadedCategories,
            sendAgainContacts: contactList,
            topSpendings: topList.isNotEmpty
                ? topList
                : txList.where((t) => !t.isIncome).toList(),
          ));
          return;
        }
      } catch (e) {
        debugPrint('[ExpenseBloc] Live API dashboard error: $e');
        emit(ExpenseError('Failed to fetch data: $e'));
        return;
      }
    }

    // Default clean state for isolated unit tests
    emit(const ExpenseLoaded(
      totalBalance: 0.0,
      totalIncome: 0.0,
      totalExpense: 0.0,
      transactions: [],
      categories: [],
      sendAgainContacts: [],
      topSpendings: [],
    ));
  }

  Future<void> _onAddExpense(
    AddExpenseEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    if (state is ExpenseLoaded) {
      final current = state as ExpenseLoaded;
      final updatedList = [event.transaction, ...current.transactions];

      double newIncome = current.totalIncome;
      double newExpense = current.totalExpense;
      double newBalance = current.totalBalance;

      if (event.transaction.isIncome) {
        newIncome += event.transaction.amount;
        newBalance += event.transaction.amount;
      } else {
        newExpense += event.transaction.amount;
        newBalance -= event.transaction.amount;
      }

      emit(current.copyWith(
        totalBalance: newBalance,
        totalIncome: newIncome,
        totalExpense: newExpense,
        transactions: updatedList,
      ));

      if (apiClient != null) {
        try {
          await apiClient!.dio.post('/transactions', data: {
            'title': event.transaction.title,
            'category': event.transaction.category,
            'amount': event.transaction.amount,
            'type': event.transaction.isIncome ? 'income' : 'expense',
            'transaction_date':
                event.transaction.date.toIso8601String().substring(0, 10),
          });
          // Re-fetch clean aggregated totals from MySQL
          add(LoadExpensesEvent());
        } catch (e) {
          debugPrint('[ExpenseBloc] Save transaction API error: $e');
        }
      }
    }
  }

  Future<void> _onChangeStatisticPeriod(
    ChangeStatisticPeriodEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    if (state is ExpenseLoaded) {
      final current = state as ExpenseLoaded;
      emit(current.copyWith(selectedPeriod: event.period));

      if (apiClient != null) {
        try {
          final res = await apiClient!.dio.get(
            '/transactions/statistics',
            queryParameters: {
              'period': event.period,
              'type': current.selectedStatType == TransactionType.income
                  ? 'income'
                  : 'expense',
            },
          );
          if (res.statusCode == 200 && res.data['topSpendings'] is List) {
            final raw = res.data['topSpendings'] as List;
            final top = raw.map((t) {
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
                date: DateTime.tryParse(
                        t['transaction_date']?.toString() ?? '') ??
                    DateTime.now(),
                iconName: t['category_icon'] ?? 'coffee_rounded',
              );
            }).toList();
            emit(current.copyWith(
              selectedPeriod: event.period,
              topSpendings: top,
            ));
          }
        } catch (_) {}
      }
    }
  }

  Future<void> _onChangeStatisticType(
    ChangeStatisticTypeEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    if (state is ExpenseLoaded) {
      final current = state as ExpenseLoaded;
      emit(current.copyWith(selectedStatType: event.type));

      if (apiClient != null) {
        try {
          final res = await apiClient!.dio.get(
            '/transactions/statistics',
            queryParameters: {
              'period': current.selectedPeriod,
              'type':
                  event.type == TransactionType.income ? 'income' : 'expense',
            },
          );
          if (res.statusCode == 200 && res.data['topSpendings'] is List) {
            final raw = res.data['topSpendings'] as List;
            final top = raw.map((t) {
              return TransactionModel(
                id: t['id'].toString(),
                title: t['title'] ?? '',
                category: t['category_name'] ?? t['title'] ?? '',
                amount: (t['amount'] is num)
                    ? (t['amount'] as num).toDouble()
                    : (double.tryParse(t['amount']?.toString() ?? '') ?? 0.0),
                type: event.type,
                date: DateTime.tryParse(
                        t['transaction_date']?.toString() ?? '') ??
                    DateTime.now(),
                iconName: t['category_icon'] ?? 'coffee_rounded',
              );
            }).toList();
            emit(current.copyWith(
              selectedStatType: event.type,
              topSpendings: top,
            ));
          }
        } catch (_) {}
      }
    }
  }

  Future<void> _onAddCategory(
    AddCategoryEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    if (state is ExpenseLoaded) {
      final current = state as ExpenseLoaded;
      final updatedCategories = [...current.categories, event.category];
      emit(current.copyWith(categories: updatedCategories));

      if (apiClient != null) {
        try {
          await apiClient!.dio.post('/categories', data: {
            'name': event.category.name,
            'icon': 'movie_outlined',
            'color':
                '#${event.category.color.value.toRadixString(16).substring(2)}',
          });
          add(LoadExpensesEvent());
        } catch (_) {}
      }
    }
  }

  Future<void> _onDeleteCategory(
    DeleteCategoryEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    if (state is ExpenseLoaded) {
      final current = state as ExpenseLoaded;
      final updatedCategories = current.categories
          .where((cat) => cat.id != event.categoryId)
          .toList();
      emit(current.copyWith(categories: updatedCategories));

      if (apiClient != null) {
        try {
          await apiClient!.dio.delete('/categories/${event.categoryId}');
          add(LoadExpensesEvent());
        } catch (_) {}
      }
    }
  }
}
