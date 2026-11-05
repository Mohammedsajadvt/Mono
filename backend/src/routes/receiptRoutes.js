const express = require('express');
const multer = require('multer');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { verifyToken } = require('../middleware/auth');

// Multer memory storage configuration (enables in-memory hashing & streaming to AI)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type: Only JPEG, PNG, WEBP, and HEIC images are allowed.'));
    }
  },
});

// Require authenticated user for all receipt endpoints
router.use(verifyToken);

// 1. Scan and extract receipt details
router.post('/scan', upload.single('receipt'), receiptController.scanReceipt);

// 2. Get receipt details by ID
router.get('/:id', receiptController.getReceiptById);

// 3. Confirm receipt and commit transaction
router.post('/:id/confirm', receiptController.confirmReceipt);

// 4. Discard receipt
router.delete('/:id', receiptController.deleteReceipt);

module.exports = router;
