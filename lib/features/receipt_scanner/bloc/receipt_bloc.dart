import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mono_app/core/network/api_client.dart';
import '../models/receipt_model.dart';
import 'receipt_event.dart';
import 'receipt_state.dart';

class ReceiptBloc extends Bloc<ReceiptEvent, ReceiptState> {
  final ApiClient apiClient;

  ReceiptBloc({required this.apiClient}) : super(ReceiptScannerInitial()) {
    on<ScanReceiptImageEvent>(_onScanReceiptImage);
    on<ConfirmReceiptEvent>(_onConfirmReceipt);
    on<UpdateReceiptDraftEvent>(_onUpdateReceiptDraft);
    on<DiscardReceiptEvent>(_onDiscardReceipt);
    on<ResetReceiptScannerEvent>(_onResetReceiptScanner);
  }

  void _onResetReceiptScanner(
    ResetReceiptScannerEvent event,
    Emitter<ReceiptState> emit,
  ) {
    emit(ReceiptScannerInitial());
  }

  void _onUpdateReceiptDraft(
    UpdateReceiptDraftEvent event,
    Emitter<ReceiptState> emit,
  ) {
    emit(ReceiptScanSuccess(receipt: event.receipt));
  }

  Future<void> _onScanReceiptImage(
    ScanReceiptImageEvent event,
    Emitter<ReceiptState> emit,
  ) async {
    try {
      emit(const ReceiptScanning(
        progress: 0.1,
        statusMessage: 'Preparing and optimizing bill image...',
      ));

      final file = event.imageFile;
      if (!await file.exists()) {
        emit(const ReceiptScannerError('Selected receipt file does not exist.'));
        return;
      }

      final fileName = file.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        'receipt': await MultipartFile.fromFile(
          file.path,
          filename: fileName,
        ),
      });

      emit(const ReceiptScanning(
        progress: 0.4,
        statusMessage: 'Uploading bill to Mono AI Engine...',
      ));

      final response = await apiClient.dio.post(
        '/receipts/scan',
        data: formData,
        onSendProgress: (sent, total) {
          if (total > 0) {
            final uploadProgress = (sent / total) * 0.7;
            emit(ReceiptScanning(
              progress: uploadProgress,
              statusMessage: 'Analyzing receipt and reading items...',
            ));
          }
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data['success'] == true && data['receipt'] != null) {
          final receipt = ReceiptModel.fromJson(data['receipt'] as Map<String, dynamic>);
          final isDuplicate = data['isDuplicate'] == true;

          emit(ReceiptScanSuccess(
            receipt: receipt,
            isDuplicate: isDuplicate,
          ));
          return;
        }
      }

      emit(ReceiptScannerError(
        response.data?['message']?.toString() ?? 'Failed to extract receipt information.',
      ));
    } catch (e) {
      debugPrint('[ReceiptBloc] Scan error: $e');
      String errMsg = 'Could not scan receipt. Please verify connection and retry.';
      if (e is DioException) {
        errMsg = e.response?.data?['message']?.toString() ?? e.message ?? errMsg;
      }
      emit(ReceiptScannerError(errMsg));
    }
  }

  Future<void> _onConfirmReceipt(
    ConfirmReceiptEvent event,
    Emitter<ReceiptState> emit,
  ) async {
    if (state is ReceiptScanSuccess) {
      final currentReceipt = (state as ReceiptScanSuccess).receipt;
      emit(ReceiptConfirming(currentReceipt));

      try {
        final payload = {
          'merchant': event.merchant.trim(),
          'total_amount': event.totalAmount,
          'receipt_date': event.receiptDate.toIso8601String().substring(0, 10),
          if (event.categoryId != null) 'category_id': event.categoryId,
          if (event.category != null) 'category': event.category,
          if (event.paymentMethod != null) 'payment_method': event.paymentMethod,
          if (event.notes != null) 'notes': event.notes,
        };

        final response = await apiClient.dio.post(
          '/receipts/${event.receiptId}/confirm',
          data: payload,
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          final data = response.data;
          if (data['success'] == true) {
            final updatedReceipt = currentReceipt.copyWith(
              merchant: event.merchant,
              totalAmount: event.totalAmount,
              receiptDate: event.receiptDate,
              categoryId: event.categoryId,
              suggestedCategory: event.category,
              paymentMethod: event.paymentMethod,
              status: 'confirmed',
              transactionId: data['transaction']?['id'] is int
                  ? data['transaction']['id'] as int
                  : int.tryParse(data['transaction']?['id']?.toString() ?? ''),
            );

            emit(ReceiptConfirmedSuccess(
              receipt: updatedReceipt,
              transactionData: data['transaction'] as Map<String, dynamic>? ?? {},
            ));
            return;
          }
        }

        emit(ReceiptScannerError(
          response.data?['message']?.toString() ?? 'Failed to confirm receipt.',
        ));
      } catch (e) {
        debugPrint('[ReceiptBloc] Confirm error: $e');
        String errMsg = 'Failed to save expense from receipt.';
        if (e is DioException) {
          errMsg = e.response?.data?['message']?.toString() ?? e.message ?? errMsg;
        }
        emit(ReceiptScannerError(errMsg));
      }
    }
  }

  Future<void> _onDiscardReceipt(
    DiscardReceiptEvent event,
    Emitter<ReceiptState> emit,
  ) async {
    try {
      await apiClient.dio.delete('/receipts/${event.receiptId}');
    } catch (e) {
      debugPrint('[ReceiptBloc] Discard error: $e');
    }
    emit(ReceiptScannerInitial());
  }
}
