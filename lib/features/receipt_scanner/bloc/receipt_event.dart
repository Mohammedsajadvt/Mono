import 'dart:io';
import 'package:equatable/equatable.dart';
import '../models/receipt_model.dart';

abstract class ReceiptEvent extends Equatable {
  const ReceiptEvent();

  @override
  List<Object?> get props => [];
}

class ScanReceiptImageEvent extends ReceiptEvent {
  final File imageFile;

  const ScanReceiptImageEvent(this.imageFile);

  @override
  List<Object?> get props => [imageFile];
}

class ConfirmReceiptEvent extends ReceiptEvent {
  final int receiptId;
  final String merchant;
  final double totalAmount;
  final DateTime receiptDate;
  final int? categoryId;
  final String? category;
  final String? paymentMethod;
  final String? notes;

  const ConfirmReceiptEvent({
    required this.receiptId,
    required this.merchant,
    required this.totalAmount,
    required this.receiptDate,
    this.categoryId,
    this.category,
    this.paymentMethod,
    this.notes,
  });

  @override
  List<Object?> get props => [
        receiptId,
        merchant,
        totalAmount,
        receiptDate,
        categoryId,
        category,
        paymentMethod,
        notes,
      ];
}

class UpdateReceiptDraftEvent extends ReceiptEvent {
  final ReceiptModel receipt;

  const UpdateReceiptDraftEvent(this.receipt);

  @override
  List<Object?> get props => [receipt];
}

class DiscardReceiptEvent extends ReceiptEvent {
  final int receiptId;

  const DiscardReceiptEvent(this.receiptId);

  @override
  List<Object?> get props => [receiptId];
}

class ResetReceiptScannerEvent extends ReceiptEvent {}
