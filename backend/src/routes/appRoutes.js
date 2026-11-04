const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');

// Public route: check latest app version & push update
router.get('/version', appController.getAppVersion);

module.exports = router;

