const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdminToken } = require('../middleware/adminAuth');

// Public admin login endpoint
router.post('/login', adminController.adminLogin);

// Protected admin endpoints
router.get('/overview', verifyAdminToken, adminController.getOverview);
router.get('/users', verifyAdminToken, adminController.getUsers);
router.get('/users/:id', verifyAdminToken, adminController.getUserDetails);
router.get('/transactions', verifyAdminToken, adminController.getTransactions);
router.get('/categories', verifyAdminToken, adminController.getCategories);
router.get('/app-config', verifyAdminToken, adminController.getAppConfig);
router.post('/app-config', verifyAdminToken, adminController.updateAppConfig);

module.exports = router;

