const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/auth');

// All transaction routes require authentication
router.use(verifyToken);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.get('/dashboard', transactionController.getDashboard);
router.get('/statistics', transactionController.getStatistics);
router.get('/export', transactionController.exportTransactions);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
