const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdminToken } = require('../middleware/adminAuth');

// Public admin authentication endpoints
router.post('/login', adminController.adminLogin);
router.post('/register', adminController.adminRegister);
router.post('/forgot-password', adminController.adminForgotPassword);
router.post('/reset-password', adminController.adminResetPassword);

// Protected admin endpoints
router.get('/overview', verifyAdminToken, adminController.getOverview);
router.get('/profile', verifyAdminToken, adminController.getAdminProfile);
router.put('/profile', verifyAdminToken, adminController.updateAdminProfile);
router.get('/users', verifyAdminToken, adminController.getUsers);
router.get('/users/:id', verifyAdminToken, adminController.getUserDetails);
router.put('/users/:id', verifyAdminToken, adminController.updateUser);
router.get('/transactions', verifyAdminToken, adminController.getTransactions);
router.get('/categories', verifyAdminToken, adminController.getCategories);
router.get('/app-config', verifyAdminToken, adminController.getAppConfig);
router.post('/app-config', verifyAdminToken, adminController.updateAppConfig);
router.post('/broadcast-push-update', verifyAdminToken, adminController.broadcastPushUpdate);
router.post('/send-push-notification', verifyAdminToken, adminController.sendPushNotification);

module.exports = router;

