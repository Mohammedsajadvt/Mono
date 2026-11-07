const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');

// Public route: check latest app version & push update
router.get('/version', appController.getAppVersion);
router.get('/download', appController.downloadApk);

module.exports = router;

