import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

class CategoryModel extends Equatable {
  final String id;
  final String name;
  final IconData icon;
  final Color color;
  final String status;
  final String type; // 'expense', 'income', 'both'

  const CategoryModel({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    this.status = 'active',
    this.type = 'both',
  });

  bool get isActive => status == 'active';
  bool get isIncome => type == 'income' || type == 'both';
  bool get isExpense => type == 'expense' || type == 'both';

  CategoryModel copyWith({
    String? id,
    String? name,
    IconData? icon,
    Color? color,
    String? status,
    String? type,
  }) {
    return CategoryModel(
      id: id ?? this.id,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      status: status ?? this.status,
      type: type ?? this.type,
    );
  }

  @override
  List<Object?> get props => [id, name, icon.codePoint, color.value, status, type];
}
