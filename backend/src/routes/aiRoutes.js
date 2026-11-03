const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/auth');

// Protected AI routes (requires authenticated user to access real transaction history)
router.use(verifyToken);

router.post('/chat', aiController.handleChat);
router.get('/insights', aiController.getInsights);
router.post('/parse-voice', aiController.parseVoiceOrText);
router.post('/scan-receipt', aiController.scanReceipt);

module.exports = router;
