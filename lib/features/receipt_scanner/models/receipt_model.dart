import 'package:equatable/equatable.dart';
import 'receipt_item_model.dart';

class ReceiptModel extends Equatable {
  final int id;
  final String merchant;
  final DateTime receiptDate;
  final double totalAmount;
  final String currency;
  final double taxAmount;
  final double discount;
  final String? paymentMethod;
  final String? suggestedCategory;
  final int? categoryId;
  final double confidence;
  final List<ReceiptItemModel> items;
  final String? imageUrl;
  final String status;
  final int? transactionId;
  final bool isDuplicate;

  const ReceiptModel({
    required this.id,
    required this.merchant,
    required this.receiptDate,
    required this.totalAmount,
    this.currency = 'INR',
    this.taxAmount = 0.0,
    this.discount = 0.0,
    this.paymentMethod,
    this.suggestedCategory,
    this.categoryId,
    this.confidence = 0.90,
    this.items = const [],
    this.imageUrl,
    this.status = 'pending',
    this.transactionId,
    this.isDuplicate = false,
  });

  factory ReceiptModel.fromJson(Map<String, dynamic> json) {
    List<ReceiptItemModel> parsedItems = [];
    if (json['items'] is List) {
      parsedItems = (json['items'] as List)
          .map((item) => ReceiptItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    DateTime parsedDate;
    try {
      if (json['receiptDate'] != null) {
        parsedDate = DateTime.parse(json['receiptDate'].toString());
      } else if (json['receipt_date'] != null) {
        parsedDate = DateTime.parse(json['receipt_date'].toString());
      } else {
        parsedDate = DateTime.now();
      }
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return ReceiptModel(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      merchant: json['merchant']?.toString() ?? 'Receipt Expense',
      receiptDate: parsedDate,
      totalAmount: double.tryParse(json['totalAmount']?.toString() ?? json['total_amount']?.toString() ?? '') ?? 0.0,
      currency: json['currency']?.toString() ?? 'INR',
      taxAmount: double.tryParse(json['taxAmount']?.toString() ?? json['tax_amount']?.toString() ?? '') ?? 0.0,
      discount: double.tryParse(json['discount']?.toString() ?? '') ?? 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? json['payment_method']?.toString(),
      suggestedCategory: json['suggestedCategory']?.toString() ?? json['suggested_category']?.toString(),
      categoryId: int.tryParse(json['categoryId']?.toString() ?? json['category_id']?.toString() ?? ''),
      confidence: double.tryParse(json['confidence']?.toString() ?? '') ?? 0.90,
      items: parsedItems,
      imageUrl: json['imageUrl']?.toString() ?? json['image_url']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      transactionId: int.tryParse(json['transactionId']?.toString() ?? json['transaction_id']?.toString() ?? ''),
      isDuplicate: json['isDuplicate'] == true,
    );
  }

  ReceiptModel copyWith({
    int? id,
    String? merchant,
    DateTime? receiptDate,
    double? totalAmount,
    String? currency,
    double? taxAmount,
    double? discount,
    String? paymentMethod,
    String? suggestedCategory,
    int? categoryId,
    double? confidence,
    List<ReceiptItemModel>? items,
    String? imageUrl,
    String? status,
    int? transactionId,
    bool? isDuplicate,
  }) {
    return ReceiptModel(
      id: id ?? this.id,
      merchant: merchant ?? this.merchant,
      receiptDate: receiptDate ?? this.receiptDate,
      totalAmount: totalAmount ?? this.totalAmount,
      currency: currency ?? this.currency,
      taxAmount: taxAmount ?? this.taxAmount,
      discount: discount ?? this.discount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      suggestedCategory: suggestedCategory ?? this.suggestedCategory,
      categoryId: categoryId ?? this.categoryId,
      confidence: confidence ?? this.confidence,
      items: items ?? this.items,
      imageUrl: imageUrl ?? this.imageUrl,
      status: status ?? this.status,
      transactionId: transactionId ?? this.transactionId,
      isDuplicate: isDuplicate ?? this.isDuplicate,
    );
  }

  @override
  List<Object?> get props => [
        id,
        merchant,
        receiptDate,
        totalAmount,
        currency,
        taxAmount,
        discount,
        paymentMethod,
        suggestedCategory,
        categoryId,
        confidence,
        items,
        imageUrl,
        status,
        transactionId,
        isDuplicate,
      ];
}
