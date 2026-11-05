const jwt = require('jsonwebtoken');

/**
 * Admin Authentication Middleware
 * Strictly requires a cryptographically valid JWT with role: 'admin'.
 * Backdoor bypass headers and fallback demo passwords have been removed.
 */
const verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Admin authorization required. Please sign in to access the administrator console.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Admin authorization token is missing.',
      });
    }

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
      message: 'Invalid or expired administrator session. Please log in again.',
    });
  }
};

module.exports = {
  verifyAdminToken,
};
