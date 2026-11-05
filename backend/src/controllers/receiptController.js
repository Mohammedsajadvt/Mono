const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { processReceiptImage } = require('../services/aiReceiptService');
const {
  validateAmount,
  validateDate,
  validateId,
  validateString,
} = require('../utils/validators');

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../../public/uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// POST /api/receipts/scan
const scanReceipt = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt image provided. Please capture or upload a bill image.',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Validate mime type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedMimes.includes(mimetype.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported image format. Please upload a JPEG, PNG, or WEBP receipt.',
      });
    }

    // Validate size (max 10MB)
    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image size exceeds the 10MB limit.',
      });
    }

    // Process image through AI extraction & deduplication engine
    const extracted = await processReceiptImage({
      userId,
      imageBuffer: buffer,
      mimeType: mimetype,
      filename: originalname,
    });

    // Save image to static uploads folder
    const ext = path.extname(originalname) || '.jpg';
    const safeFilename = `receipt-${Date.now()}-${extracted.imageHash.slice(0, 8)}${ext}`;
    const filePath = path.join(uploadDir, safeFilename);
    fs.writeFileSync(filePath, buffer);
    const imageUrl = `/uploads/receipts/${safeFilename}`;

    // If duplicate was detected, return existing record
    if (extracted.isDuplicate) {
      return res.json({
        success: true,
        isDuplicate: true,
        message: 'Identical receipt was already scanned previously.',
        receipt: {
          id: extracted.existingReceiptId,
          merchant: extracted.merchant,
          receiptDate: extracted.receiptDate,
          totalAmount: extracted.totalAmount,
          currency: extracted.currency,
          taxAmount: extracted.taxAmount,
          discount: extracted.discount,
          paymentMethod: extracted.paymentMethod,
          suggestedCategory: extracted.suggestedCategory,
          categoryId: extracted.categoryId,
          confidence: extracted.confidence,
          items: extracted.items,
          imageUrl,
          status: extracted.status,
          transactionId: extracted.transactionId,
        },
      });
    }

    // Insert pending receipt into TiDB database
    const [result] = await pool.execute(
      `INSERT INTO receipts (
        user_id, merchant, receipt_date, total_amount, currency, tax_amount, discount,
        payment_method, suggested_category, category_id, image_url, image_hash,
        confidence, raw_items, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        extracted.merchant,
        extracted.receiptDate,
        extracted.totalAmount,
        extracted.currency,
        extracted.taxAmount,
        extracted.discount,
        extracted.paymentMethod,
        extracted.suggestedCategory,
        extracted.categoryId,
        imageUrl,
        extracted.imageHash,
        extracted.confidence,
        JSON.stringify(extracted.items || []),
      ]
    );

    const receiptId = result.insertId;

    return res.status(201).json({
      success: true,
      isDuplicate: false,
      message: 'Receipt scanned and extracted successfully.',
      receipt: {
        id: receiptId,
        merchant: extracted.merchant,
        receiptDate: extracted.receiptDate,
        totalAmount: extracted.totalAmount,
        currency: extracted.currency,
        taxAmount: extracted.taxAmount,
        discount: extracted.discount,
        paymentMethod: extracted.paymentMethod,
        suggestedCategory: extracted.suggestedCategory,
        categoryId: extracted.categoryId,
        confidence: extracted.confidence,
        items: extracted.items,
        imageUrl,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[ReceiptController.scanReceipt] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process receipt image. ' + (error.message || ''),
    });
  }
};

// GET /api/receipts/:id
const getReceiptById = async (req, res) => {
  try {
    const userId = req.user.id;
    const idVal = validateId(req.params.id, 'Receipt ID');
    if (!idVal.valid) {
      return res.status(400).json({ success: false, message: idVal.error });
    }

    const [rows] = await pool.execute(
      `SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM receipts r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.id = ? AND r.user_id = ? LIMIT 1`,
      [idVal.value, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found or unauthorized.',
      });
    }

    const r = rows[0];
    let items = [];
    try {
      items = typeof r.raw_items === 'string' ? JSON.parse(r.raw_items) : (r.raw_items || []);
    } catch (e) {
      items = [];
    }

    return res.json({
      success: true,
      receipt: {
        id: r.id,
        merchant: r.merchant,
        receiptDate: r.receipt_date ? r.receipt_date.toISOString().slice(0, 10) : null,
        totalAmount: parseFloat(r.total_amount) || 0,
        currency: r.currency,
        taxAmount: parseFloat(r.tax_amount) || 0,
        discount: parseFloat(r.discount) || 0,
        paymentMethod: r.payment_method,
        suggestedCategory: r.suggested_category || r.category_name,
        categoryId: r.category_id,
        confidence: parseFloat(r.confidence) || 0.9,
        items,
        imageUrl: r.image_url,
        status: r.status,
        transactionId: r.transaction_id,
        createdAt: r.created_at,
      },
    });
  } catch (error) {
    console.error('[ReceiptController.getReceiptById] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt.',
    });
  }
};

// POST /api/receipts/:id/confirm (Save confirmed expense to transactions)
const confirmReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const idVal = validateId(req.params.id, 'Receipt ID');
    if (!idVal.valid) {
      return res.status(400).json({ success: false, message: idVal.error });
    }
    const receiptId = idVal.value;

    const {
      merchant,
      total_amount,
      receipt_date,
      category_id,
      category,
      payment_method,
      notes,
    } = req.body;

    // 1. Verify receipt existence and ownership
    const [receipts] = await pool.execute(
      'SELECT * FROM receipts WHERE id = ? AND user_id = ? LIMIT 1',
      [receiptId, userId]
    );

    if (receipts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found or unauthorized.',
      });
    }

    const currentReceipt = receipts[0];

    // Idempotency: If already confirmed, return existing transaction
    if (currentReceipt.status === 'confirmed' && currentReceipt.transaction_id) {
      const [tx] = await pool.execute(
        'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
        [currentReceipt.transaction_id, userId]
      );
      return res.json({
        success: true,
        alreadyConfirmed: true,
        message: 'This receipt has already been confirmed and saved.',
        transaction: tx[0] || null,
        receiptId,
      });
    }

    // 2. Validate input fields
    const titleVal = validateString(merchant || currentReceipt.merchant, 'Title / Merchant', 200, true);
    if (!titleVal.valid) {
      return res.status(400).json({ success: false, message: titleVal.error });
    }

    const amountVal = validateAmount(total_amount !== undefined ? total_amount : currentReceipt.total_amount);
    if (!amountVal.valid) {
      return res.status(400).json({ success: false, message: amountVal.error });
    }

    let txDate = currentReceipt.receipt_date ? currentReceipt.receipt_date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (receipt_date) {
      const dateVal = validateDate(receipt_date);
      if (!dateVal.valid) {
        return res.status(400).json({ success: false, message: dateVal.error });
      }
      txDate = dateVal.sanitized;
    }

    // 3. Resolve and validate Category
    let resolvedCategoryId = null;
    if (category_id !== undefined && category_id !== null && category_id !== '') {
      const catIdVal = validateId(category_id, 'Category ID');
      if (catIdVal.valid) {
        resolvedCategoryId = catIdVal.value;
      }
    } else if (category && typeof category === 'string') {
      const [cats] = await pool.execute(
        'SELECT id FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1',
        [category.trim(), userId]
      );
      if (cats.length > 0) {
        resolvedCategoryId = cats[0].id;
      }
    }

    // Fallback to receipt's category_id if still null
    if (!resolvedCategoryId && currentReceipt.category_id) {
      resolvedCategoryId = currentReceipt.category_id;
    }

    // Validate category ownership
    if (resolvedCategoryId) {
      const [catCheck] = await pool.execute(
        'SELECT id FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1',
        [resolvedCategoryId, userId]
      );
      if (catCheck.length === 0) {
        resolvedCategoryId = null; // safe fallback
      }
    }

    const cleanPaymentMode = payment_method || currentReceipt.payment_method || 'UPI';
    const cleanNotes = notes || (currentReceipt.merchant ? `Scanned bill from ${currentReceipt.merchant}` : 'Scanned receipt bill');

    // 4. Create transaction entry
    const [txResult] = await pool.execute(
      `INSERT INTO transactions (
        user_id, category_id, title, type, amount, transaction_date, invoice_url, notes, payment_mode
      ) VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?)`,
      [
        userId,
        resolvedCategoryId,
        titleVal.sanitized,
        amountVal.value,
        txDate,
        currentReceipt.image_url || null,
        cleanNotes,
        cleanPaymentMode,
      ]
    );

    const newTransactionId = txResult.insertId;

    // 5. Update receipt record as confirmed and link transaction
    await pool.execute(
      `UPDATE receipts 
       SET status = 'confirmed', transaction_id = ?, category_id = ?, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [newTransactionId, resolvedCategoryId, receiptId, userId]
    );

    // Fetch created transaction details
    const [newTxRows] = await pool.execute(
      `SELECT t.id, t.user_id, t.category_id, t.title, t.type, t.amount, 
              DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
              t.invoice_url, t.notes, t.payment_mode, t.created_at,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`,
      [newTransactionId, userId]
    );

    return res.status(201).json({
      success: true,
      message: 'Receipt expense successfully confirmed and saved to transactions!',
      receiptId,
      transaction: newTxRows[0],
    });
  } catch (error) {
    console.error('[ReceiptController.confirmReceipt] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm and save receipt expense.',
    });
  }
};

// DELETE /api/receipts/:id (Discard receipt)
const deleteReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const idVal = validateId(req.params.id, 'Receipt ID');
    if (!idVal.valid) {
      return res.status(400).json({ success: false, message: idVal.error });
    }

    const [result] = await pool.execute(
      'DELETE FROM receipts WHERE id = ? AND user_id = ?',
      [idVal.value, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found or unauthorized.',
      });
    }

    return res.json({
      success: true,
      message: 'Receipt discarded successfully.',
    });
  } catch (error) {
    console.error('[ReceiptController.deleteReceipt] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to discard receipt.',
    });
  }
};

module.exports = {
  scanReceipt,
  getReceiptById,
  confirmReceipt,
  deleteReceipt,
};
