import 'package:equatable/equatable.dart';

class ChartPoint extends Equatable {
  final String label;
  final double amount;

  const ChartPoint({
    required this.label,
    required this.amount,
  });

  factory ChartPoint.fromJson(Map<String, dynamic> json) {
    return ChartPoint(
      label: json['label']?.toString() ?? '',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : (double.tryParse(json['amount']?.toString() ?? '') ?? 0.0),
    );
  }

  Map<String, dynamic> toJson() => {
        'label': label,
        'amount': amount,
      };

  @override
  List<Object?> get props => [label, amount];
}

