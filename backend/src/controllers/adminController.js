const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { loadReleaseConfig, saveReleaseConfig } = require('./appController');
const { ADMIN_PASSWORD } = require('../middleware/adminAuth');

// POST /api/admin/login
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to access Mono Admin.',
      });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator password.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server security misconfiguration: JWT_SECRET missing.',
      });
    }

    const token = jwt.sign(
      {
        role: 'admin',
        username: username || 'Mono Administrator',
      },
      secret,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      token,
      admin: {
        username: username || 'Mono Administrator',
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('[adminLogin] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during admin login.',
    });
  }
};

// GET /api/admin/overview
const getOverview = async (req, res) => {
  try {
    // 1. High-level metric counts
    const [[userCount]] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const [[txCount]] = await pool.execute('SELECT COUNT(*) as total FROM transactions');
    const [[incomeSum]] = await pool.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'"
    );
    const [[expenseSum]] = await pool.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'"
    );

    // Today's activity
    const [[todayUsers]] = await pool.execute(
      'SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()'
    );
    const [[todayTx]] = await pool.execute(
      'SELECT COUNT(*) as total FROM transactions WHERE DATE(transaction_date) = CURDATE()'
    );

    // 2. Recent transactions with user details
    const [recentTransactions] = await pool.execute(`
      SELECT 
        t.id, t.user_id, t.title, t.type, t.amount, t.transaction_date, 
        t.payment_mode, t.currency, t.notes,
        u.name as user_name, u.email as user_email,
        c.name as category_title, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT 8
    `);

    // 3. Recent registered users
    const [recentUsers] = await pool.execute(`
      SELECT id, name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 6
    `);

    // 4. Top spending categories across all users
    const [topCategories] = await pool.execute(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.icon, 'category') as icon,
        COALESCE(c.color, '#438883') as color,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense'
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total_amount DESC
      LIMIT 5
    `);

    // 5. Monthly Trend (last 6 months)
    const [monthlyTrend] = await pool.execute(`
      SELECT 
        DATE_FORMAT(transaction_date, '%b %Y') as month_label,
        DATE_FORMAT(transaction_date, '%Y-%m') as sort_key,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY sort_key, month_label
      ORDER BY sort_key ASC
    `);

    // 6. System health information
    const uptimeSeconds = process.uptime();
    const memUsage = process.memoryUsage();

    return res.json({
      success: true,
      stats: {
        totalUsers: Number(userCount.total) || 0,
        totalTransactions: Number(txCount.total) || 0,
        totalIncome: Number(incomeSum.total) || 0,
        totalExpense: Number(expenseSum.total) || 0,
        todayNewUsers: Number(todayUsers.total) || 0,
        todayTransactions: Number(todayTx.total) || 0,
      },
      recentTransactions,
      recentUsers,
      topCategories,
      monthlyTrend,
      system: {
        status: 'Operational',
        database: 'TiDB Cloud (MySQL)',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(uptimeSeconds),
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[getOverview] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate admin overview data.',
      error: error.message,
    });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const [[countResult]] = await pool.execute(countQuery, params);
    const total = Number(countResult.total) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const dataQuery = `
      SELECT 
        u.id, u.name, u.email, u.created_at,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [users] = await pool.execute(dataQuery, params);

    return res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[getUsers] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users list.',
    });
  }
};

// GET /api/admin/users/:id
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [[user]] = await pool.execute(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const [transactions] = await pool.execute(`
      SELECT 
        t.id, t.title, t.type, t.amount, t.transaction_date, t.payment_mode, t.notes,
        c.name as category_title, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC
      LIMIT 20
    `, [id]);

    const [categories] = await pool.execute(
      'SELECT id, name as title, type, icon, color FROM categories WHERE user_id = ? OR user_id IS NULL',
      [id]
    );

    return res.json({
      success: true,
      user,
      transactions,
      categories,
    });
  } catch (error) {
    console.error('[getUserDetails] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details.',
    });
  }
};

// GET /api/admin/transactions
const getTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const type = req.query.type ? req.query.type.trim().toLowerCase() : '';
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    const conditions = [];
    const params = [];

    if (type && (type === 'income' || type === 'expense')) {
      conditions.push('t.type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('(LOWER(t.title) LIKE ? OR LOWER(t.notes) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
    `;
    const [[countResult]] = await pool.execute(countQuery, params);
    const total = Number(countResult.total) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const dataQuery = `
      SELECT 
        t.id, t.user_id, t.title, t.type, t.amount, t.transaction_date, 
        t.payment_mode, t.currency, t.notes,
        u.name as user_name, u.email as user_email,
        c.name as category_title, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [transactions] = await pool.execute(dataQuery, params);

    return res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[getTransactions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions.',
    });
  }
};

// GET /api/admin/categories
const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.id, c.name as title, c.type, c.icon, c.color,
        COUNT(t.id) as usage_count,
        COALESCE(SUM(t.amount), 0) as total_volume
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id, c.name, c.type, c.icon, c.color
      ORDER BY usage_count DESC, total_volume DESC
    `);

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('[getCategories] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories analytics.',
    });
  }
};

// GET /api/admin/app-config
const getAppConfig = async (req, res) => {
  try {
    const config = loadReleaseConfig();
    return res.json({
      success: true,
      config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load app release config.',
    });
  }
};

// POST /api/admin/app-config
const updateAppConfig = async (req, res) => {
  try {
    const {
      latestVersion,
      buildNumber,
      downloadUrl,
      guestUrl,
      accountUrl,
      driveUrl,
      releaseNotes,
      forceUpdate,
    } = req.body;

    const updated = saveReleaseConfig({
      latestVersion: latestVersion || '1.0.2',
      buildNumber: parseInt(buildNumber) || 3,
      downloadUrl: downloadUrl || 'https://betadrop.app/i/fCW2Qm',
      guestUrl: guestUrl || 'https://betadrop.app/i/fCW2Qm',
      accountUrl: accountUrl || 'https://betadrop.app/i/qQhg9L',
      driveUrl: driveUrl || '',
      releaseNotes: releaseNotes || '',
      forceUpdate: forceUpdate === true,
    });

    return res.json({
      success: true,
      message: 'App release configuration updated successfully! Devices checking for updates will now receive these values immediately.',
      config: updated,
    });
  } catch (error) {
    console.error('[updateAppConfig] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update app release configuration.',
    });
  }
};

module.exports = {
  adminLogin,
  getOverview,
  getUsers,
  getUserDetails,
  getTransactions,
  getCategories,
  getAppConfig,
  updateAppConfig,
};
