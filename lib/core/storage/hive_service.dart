import 'package:hive_flutter/hive_flutter.dart';

class HiveService {
  HiveService._();

  static const String expenseBoxName = 'mono_expenses';
  static const String categoryBoxName = 'mono_categories';
  static const String userBoxName = 'mono_user_settings';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(expenseBoxName);
    await Hive.openBox(categoryBoxName);
    await Hive.openBox(userBoxName);
  }

  static Box get expenseBox => Hive.box(expenseBoxName);
  static Box get categoryBox => Hive.box(categoryBoxName);
  static Box get userBox => Hive.box(userBoxName);
}

