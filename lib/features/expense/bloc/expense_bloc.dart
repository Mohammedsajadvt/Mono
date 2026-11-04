import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mono_app/core/network/api_client.dart';
import 'package:mono_app/features/categories/models/category_model.dart';
import 'package:mono_app/features/expense/models/contact_model.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';
import 'package:mono_app/features/statistics/models/chart_point.dart';

class ExpenseBloc extends Bloc<ExpenseEvent, ExpenseState> {
  final ApiClient? apiClient;

  ExpenseBloc({this.apiClient}) : super(ExpenseInitial()) {
    on<LoadExpensesEvent>(_onLoadExpenses);
    on<AddExpenseEvent>(_onAddExpense);
    on<ChangeStatisticPeriodEvent>(_onChangeStatisticPeriod);
    on<ChangeStatisticTypeEvent>(_onChangeStatisticType);
    on<AddCategoryEvent>(_onAddCategory);
    on<DeleteCategoryEvent>(_onDeleteCategory);
    on<DeleteTransactionEvent>(_onDeleteTransaction);
  }

  static IconData iconFromName(String? iconName) {
    switch (iconName) {
      case 'movie_outlined':
        return Icons.movie_outlined;
      case 'coffee_rounded':
        return Icons.coffee_rounded;
      case 'shopping_bag_outlined':
        return Icons.shopping_bag_outlined;
      case 'shopping_cart_outlined':
        return Icons.shopping_cart_outlined;
      case 'swap_horiz_rounded':
      case 'sync_alt':
        return Icons.swap_horiz_rounded;
      case 'payment_rounded':
      case 'payment_outlined':
        return Icons.payment_rounded;
      case 'play_circle_fill':
        return Icons.play_circle_fill;
      case 'music_note_rounded':
        return Icons.music_note_rounded;
      case 'bolt_rounded':
      case 'trending_up':
        return Icons.bolt_rounded;
      case 'fitness_center_rounded':
      case 'fitness_center_outlined':
        return Icons.fitness_center_rounded;
      case 'restaurant_rounded':
      case 'restaurant_outlined':
        return Icons.restaurant_rounded;
      case 'directions_car_outlined':
        return Icons.directions_car_outlined;
      case 'work_outline':
        return Icons.work_outline;
      case 'card_giftcard':
        return Icons.card_giftcard;
      case 'laptop_mac':
        return Icons.laptop_mac;
      case 'business_center':
        return Icons.business_center;
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
    // Only emit loading if state is initial or error, to avoid UI flickering
    if (state is! ExpenseLoaded) {
      emit(ExpenseLoading());
    }

    if (apiClient != null) {
      try {
        // 1. Fetch categories strictly for logged in user
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

        // 2. Fetch dashboard data (Totals, Recent Transactions, Contacts, Top Spendings)
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

          // 3. Fetch statistics chart points
          List<ChartPoint> chartPoints = [];
          try {
            final statsRes = await apiClient!.dio.get(
              '/transactions/statistics',
              queryParameters: {'period': 'Month', 'type': 'expense'},
            );
            if (statsRes.statusCode == 200 &&
                statsRes.data['chartPoints'] is List) {
              final rawPoints = statsRes.data['chartPoints'] as List;
              chartPoints = rawPoints
                  .map((p) => ChartPoint.fromJson(p as Map<String, dynamic>))
                  .toList();
            }
          } catch (e) {
            debugPrint('[ExpenseBloc] Initial statistics fetch error: $e');
          }

          emit(ExpenseLoaded(
            totalBalance: balance,
            totalIncome: income,
            totalExpense: expense,
            transactions: txList,
            categories: loadedCategories,
            sendAgainContacts: contactList,
            topSpendings: topList,
            chartPoints: chartPoints,
            selectedPeriod: 'Month',
            selectedStatType: TransactionType.expense,
          ));
          return;
        }
      } catch (e) {
        debugPrint('[ExpenseBloc] Live API dashboard error: $e');
        if (state is! ExpenseLoaded) {
          emit(ExpenseError('Failed to fetch data: $e'));
        }
        return;
      }
    }

    // Default clean state for isolated tests
    emit(const ExpenseLoaded(
      totalBalance: 0.0,
      totalIncome: 0.0,
      totalExpense: 0.0,
      transactions: [],
      categories: [],
      sendAgainContacts: [],
      topSpendings: [],
      chartPoints: [],
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

          // Silently refresh statistics and dashboard without screen blanking
          _refreshStatisticsSilently(emit);
        } catch (e) {
          debugPrint('[ExpenseBloc] Save transaction API error: $e');
        }
      }
    }
  }

  Future<void> _refreshStatisticsSilently(Emitter<ExpenseState> emit) async {
    if (state is! ExpenseLoaded || apiClient == null) return;
    final current = state as ExpenseLoaded;
    try {
      final res = await apiClient!.dio.get(
        '/transactions/statistics',
        queryParameters: {
          'period': current.selectedPeriod,
          'type': current.selectedStatType == TransactionType.income
              ? 'income'
              : 'expense',
        },
      );
      if (res.statusCode == 200) {
        final rawTop = res.data['topSpendings'] as List? ?? [];
        final top = rawTop.map((t) {
          return TransactionModel(
            id: t['id'].toString(),
            title: t['title'] ?? '',
            category: t['category_name'] ?? t['title'] ?? '',
            amount: (t['amount'] is num)
                ? (t['amount'] as num).toDouble()
                : (double.tryParse(t['amount']?.toString() ?? '') ?? 0.0),
            type: current.selectedStatType,
            date: DateTime.tryParse(t['transaction_date']?.toString() ?? '') ??
                DateTime.now(),
            iconName: t['category_icon'] ?? 'coffee_rounded',
          );
        }).toList();

        final rawPoints = res.data['chartPoints'] as List? ?? [];
        final points = rawPoints
            .map((p) => ChartPoint.fromJson(p as Map<String, dynamic>))
            .toList();

        emit(current.copyWith(topSpendings: top, chartPoints: points));
      }
    } catch (_) {}
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
          if (res.statusCode == 200) {
            final raw = res.data['topSpendings'] as List? ?? [];
            final top = raw.map((t) {
              return TransactionModel(
                id: t['id'].toString(),
                title: t['title'] ?? '',
                category: t['category_name'] ?? t['title'] ?? '',
                amount: (t['amount'] is num)
                    ? (t['amount'] as num).toDouble()
                    : (double.tryParse(t['amount']?.toString() ?? '') ?? 0.0),
                type: current.selectedStatType,
                date: DateTime.tryParse(
                        t['transaction_date']?.toString() ?? '') ??
                    DateTime.now(),
                iconName: t['category_icon'] ?? 'coffee_rounded',
              );
            }).toList();

            final rawPoints = res.data['chartPoints'] as List? ?? [];
            final points = rawPoints
                .map((p) => ChartPoint.fromJson(p as Map<String, dynamic>))
                .toList();

            emit(current.copyWith(
              selectedPeriod: event.period,
              topSpendings: top,
              chartPoints: points,
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
          if (res.statusCode == 200) {
            final raw = res.data['topSpendings'] as List? ?? [];
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

            final rawPoints = res.data['chartPoints'] as List? ?? [];
            final points = rawPoints
                .map((p) => ChartPoint.fromJson(p as Map<String, dynamic>))
                .toList();

            emit(current.copyWith(
              selectedStatType: event.type,
              topSpendings: top,
              chartPoints: points,
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
      // Optimistically append category immediately so UI never flashes empty
      final updatedCategories = [...current.categories, event.category];
      emit(current.copyWith(categories: updatedCategories));

      if (apiClient != null) {
        try {
          final res = await apiClient!.dio.post('/categories', data: {
            'name': event.category.name,
            'icon': 'movie_outlined',
            'color':
                '#${event.category.color.value.toRadixString(16).substring(2)}',
            'type': event.category.type,
          });

          if (res.statusCode == 201 && res.data['category'] != null) {
            final catData = res.data['category'];
            final savedCat = CategoryModel(
              id: catData['id'].toString(),
              name: catData['name'] ?? event.category.name,
              icon: iconFromName(catData['icon']?.toString()),
              color: colorFromHex(catData['color']?.toString()),
              status: catData['status']?.toString() ?? 'active',
              type: catData['type']?.toString() ?? 'both',
            );

            // Replace optimistic item with saved item containing server ID
            final finalizedCategories = current.categories
                .where((c) => c.name != event.category.name)
                .toList()
              ..add(savedCat);
            emit(current.copyWith(categories: finalizedCategories));
          }
        } catch (e) {
          debugPrint('[ExpenseBloc] Add category API error: $e');
        }
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
        } catch (e) {
          debugPrint('[ExpenseBloc] Delete category API error: $e');
        }
      }
    }
  }

  Future<void> _onDeleteTransaction(
    DeleteTransactionEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    if (state is ExpenseLoaded) {
      final current = state as ExpenseLoaded;
      final target = current.transactions.firstWhere(
        (t) => t.id == event.transactionId,
        orElse: () => TransactionModel(
          id: '',
          title: '',
          category: '',
          amount: 0,
          type: TransactionType.expense,
          date: DateTime.now(),
        ),
      );

      final updatedList = current.transactions
          .where((t) => t.id != event.transactionId)
          .toList();

      double newIncome = current.totalIncome;
      double newExpense = current.totalExpense;
      double newBalance = current.totalBalance;

      if (target.id.isNotEmpty) {
        if (target.isIncome) {
          newIncome -= target.amount;
          newBalance -= target.amount;
        } else {
          newExpense -= target.amount;
          newBalance += target.amount;
        }
      }

      emit(current.copyWith(
        totalBalance: newBalance,
        totalIncome: newIncome,
        totalExpense: newExpense,
        transactions: updatedList,
      ));

      if (apiClient != null) {
        try {
          await apiClient!.dio.delete('/transactions/${event.transactionId}');
          _refreshStatisticsSilently(emit);
        } catch (e) {
          debugPrint('[ExpenseBloc] Delete transaction API error: $e');
        }
      }
    }
  }
}
