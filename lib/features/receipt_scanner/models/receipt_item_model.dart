import 'package:equatable/equatable.dart';

class ReceiptItemModel extends Equatable {
  final String name;
  final int quantity;
  final double? price;
  final double amount;

  const ReceiptItemModel({
    required this.name,
    this.quantity = 1,
    this.price,
    required this.amount,
  });

  factory ReceiptItemModel.fromJson(Map<String, dynamic> json) {
    return ReceiptItemModel(
      name: json['name']?.toString() ?? 'Item',
      quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 1,
      price: double.tryParse(json['price']?.toString() ?? ''),
      amount: double.tryParse(json['amount']?.toString() ?? '') ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'quantity': quantity,
      if (price != null) 'price': price,
      'amount': amount,
    };
  }

  ReceiptItemModel copyWith({
    String? name,
    int? quantity,
    double? price,
    double? amount,
  }) {
    return ReceiptItemModel(
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
      amount: amount ?? this.amount,
    );
  }

  @override
  List<Object?> get props => [name, quantity, price, amount];
}
