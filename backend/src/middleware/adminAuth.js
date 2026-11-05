const jwt = require('jsonwebtoken');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'monoadmin2026';

const verifyAdminToken = (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey && adminKey === ADMIN_PASSWORD) {
      req.admin = { role: 'admin', authType: 'key' };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Admin authorization required. Please provide a valid admin token.',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server security misconfiguration: JWT_SECRET missing.',
      });
    }

    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Requires administrator privileges.',
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin session. Please log in again.',
    });
  }
};

module.exports = {
  verifyAdminToken,
  ADMIN_PASSWORD,
};

