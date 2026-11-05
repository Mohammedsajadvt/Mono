import 'package:equatable/equatable.dart';
import '../models/receipt_model.dart';

abstract class ReceiptState extends Equatable {
  const ReceiptState();

  @override
  List<Object?> get props => [];
}

class ReceiptScannerInitial extends ReceiptState {}

class ReceiptScanning extends ReceiptState {
  final double progress;
  final String statusMessage;

  const ReceiptScanning({
    this.progress = 0.0,
    this.statusMessage = 'Uploading receipt image...',
  });

  @override
  List<Object?> get props => [progress, statusMessage];
}

class ReceiptScanSuccess extends ReceiptState {
  final ReceiptModel receipt;
  final bool isDuplicate;

  const ReceiptScanSuccess({
    required this.receipt,
    this.isDuplicate = false,
  });

  @override
  List<Object?> get props => [receipt, isDuplicate];
}

class ReceiptConfirming extends ReceiptState {
  final ReceiptModel receipt;

  const ReceiptConfirming(this.receipt);

  @override
  List<Object?> get props => [receipt];
}

class ReceiptConfirmedSuccess extends ReceiptState {
  final ReceiptModel receipt;
  final Map<String, dynamic> transactionData;

  const ReceiptConfirmedSuccess({
    required this.receipt,
    required this.transactionData,
  });

  @override
  List<Object?> get props => [receipt, transactionData];
}

class ReceiptScannerError extends ReceiptState {
  final String message;

  const ReceiptScannerError(this.message);

  @override
  List<Object?> get props => [message];
}
