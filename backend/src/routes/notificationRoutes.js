const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Public Mobile App Endpoint: Get all active notifications
 * GET /api/notifications
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, message, url, type, status, created_at FROM notifications ORDER BY id DESC LIMIT 50'
    );
    return res.json({
      success: true,
      notifications: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error('[Notifications API] Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications list.',
      notifications: [],
    });
  }
});

/**
 * Public Mobile App Endpoint: Get latest notification for banner & update checker
 * GET /api/notifications/latest
 */
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, message, url, type, status, created_at FROM notifications ORDER BY id DESC LIMIT 1'
    );
    return res.json({
      success: true,
      notification: rows[0] || null,
    });
  } catch (err) {
    console.error('[Notifications API] Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load latest notification.',
      notification: null,
    });
  }
});

module.exports = router;

