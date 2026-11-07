const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { loadReleaseConfig, saveReleaseConfig } = require('./appController');
const { sendOtpEmail } = require('../config/email');
const { broadcastFirebaseAppUpdate } = require('../config/firebase');
const { sendOneSignalPush, DEFAULT_ONESIGNAL_APP_ID } = require('../config/onesignal');
const {
  validateEmail,
  validatePassword,
  validateUsername,
  validateName,
  validateOtp,
  validateId,
} = require('../utils/validators');

// Auto-initialize admin tables if not present
let tablesInitialized = false;
const ensureAdminTables = async () => {
  if (tablesInitialized) return;
  try {
    // 1. Ensure admin_users table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(80) NOT NULL UNIQUE,
        email VARCHAR(150) NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin_users_email (email),
        INDEX idx_admin_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Add email column if table existed without it (TiDB Cloud compliant 2-step migration)
    try {
      const [emailCol] = await pool.query("SHOW COLUMNS FROM admin_users LIKE 'email'");
      if (emailCol.length === 0) {
        await pool.query("ALTER TABLE admin_users ADD COLUMN email VARCHAR(150) NULL");
        try {
          await pool.query("ALTER TABLE admin_users ADD UNIQUE INDEX idx_admin_users_email (email)");
        } catch (idxErr) {
          console.warn('[ensureAdminTables] Unique index idx_admin_users_email note:', idxErr.message);
        }
        console.log('[ensureAdminTables] Successfully added email column to admin_users.');
      }
    } catch (colErr) {
      console.warn('[ensureAdminTables] email column check:', colErr.message);
    }

    // 3. Ensure password_resets table exists for OTP verification
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_password_resets_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    tablesInitialized = true;
  } catch (err) {
    console.warn('[ensureAdminTables] Table auto-init warning:', err.message);
  }
};

// Helper to issue JWT for admin
const generateAdminToken = (admin) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Server security misconfiguration: JWT_SECRET missing.');
  }
  return jwt.sign(
    {
      id: admin.id,
      role: 'admin',
      username: admin.username,
      email: admin.email || 'admin@mono.app',
    },
    secret,
    { expiresIn: '24h' }
  );
};

// POST /api/admin/register (Admin Signup)
const adminRegister = async (req, res) => {
  try {
    await ensureAdminTables();
    const { username, email, password } = req.body;

    const userVal = validateUsername(username);
    if (!userVal.valid) {
      return res.status(400).json({
        success: false,
        message: userVal.error,
      });
    }

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({
        success: false,
        message: emailVal.error,
      });
    }

    const passVal = validatePassword(password);
    if (!passVal.valid) {
      return res.status(400).json({
        success: false,
        message: passVal.error,
      });
    }

    const cleanUsername = userVal.sanitized;
    const cleanEmail = emailVal.sanitized;
    const cleanPassword = passVal.sanitized;

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM admin_users WHERE LOWER(username) = ? LIMIT 1',
      [cleanUsername.toLowerCase()]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An administrator with this username already exists.',
      });
    }

    // Check if email already exists
    const [existingEmails] = await pool.execute(
      'SELECT id FROM admin_users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );
    if (existingEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An administrator with this email address already exists.',
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(cleanPassword, salt);

    // Insert new administrator
    const [result] = await pool.execute(
      'INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [cleanUsername, cleanEmail, passwordHash, 'admin']
    );

    const newAdmin = {
      id: result.insertId,
      username: cleanUsername,
      email: cleanEmail,
      role: 'admin',
    };

    const token = generateAdminToken(newAdmin);

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      token,
      admin: newAdmin,
    });
  } catch (error) {
    console.error('[adminRegister] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while registering admin account.',
    });
  }
};

// POST /api/admin/login
const adminLogin = async (req, res) => {
  try {
    await ensureAdminTables();
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Administrator username or email address is required.',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required to access Mono Admin.',
      });
    }

    const identifier = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Verify against TiDB database admin_users table (by username OR email)
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, role FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials. Please check your username/email and password.',
      });
    }

    const adminRecord = rows[0];
    const isMatch = await bcrypt.compare(cleanPassword, adminRecord.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials. Please check your username/email and password.',
      });
    }

    const token = generateAdminToken({
      id: adminRecord.id,
      username: adminRecord.username,
      email: adminRecord.email,
    });

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      token,
      admin: {
        id: adminRecord.id,
        username: adminRecord.username,
        email: adminRecord.email,
        role: 'admin',
        authMethod: 'database',
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

// POST /api/admin/forgot-password (Send real dynamic 6-digit OTP via email)
const adminForgotPassword = async (req, res) => {
  try {
    await ensureAdminTables();
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered admin email address or username.',
      });
    }

    const cleanInput = email.trim().toLowerCase();

    // Find admin by email or username
    const [admins] = await pool.execute(
      'SELECT id, username, email FROM admin_users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1',
      [cleanInput, cleanInput]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registered admin account found with that email address or username.',
      });
    }

    const admin = admins[0];
    const targetEmail = (admin.email || cleanInput).toLowerCase();

    const emailCheck = validateEmail(targetEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Admin account has no valid email on file. Please contact system owner.',
      });
    }

    // Generate dynamic 6-digit OTP confirmation code (never static!)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate existing reset codes for this email
    await pool.execute('DELETE FROM password_resets WHERE email = ?', [targetEmail]);

    // Save dynamic OTP to password_resets with 15-minute expiration
    await pool.execute(
      'INSERT INTO password_resets (email, otp_code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [targetEmail, otpCode]
    );

    // Send real email via Firebase Auth / Nodemailer using sendOtpEmail
    const emailResult = await sendOtpEmail(targetEmail, otpCode, admin.username || 'Administrator');

    if (!emailResult.sent) {
      console.error(`[adminForgotPassword] Email delivery failed for ${targetEmail}:`, emailResult.error);
      const isConfigError = emailResult.error === 'CONFIGURATION_NOT_FOUND';
      const userMessage = isConfigError
        ? `Firebase Authentication is not activated in project 'mono-f7e35' yet. Please visit https://console.firebase.google.com/project/mono-f7e35/authentication, click 'Get started', and enable 'Email/Password' under Sign-in method.`
        : `Could not deliver password reset email to ${targetEmail}. Please ensure Firebase Authentication is enabled or email service is active.`;

      return res.status(502).json({
        success: false,
        message: userMessage,
        error: emailResult.error,
      });
    }

    // High security: Never expose OTP code in HTTP response
    return res.json({
      success: true,
      message: `A verification code has been dispatched to ${targetEmail}. Please check your Gmail inbox.`,
      email: targetEmail,
    });
  } catch (error) {
    console.error('[adminForgotPassword] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request. ' + (error.message || ''),
    });
  }
};

// POST /api/admin/reset-password (Verify dynamic OTP & update password)
const adminResetPassword = async (req, res) => {
  try {
    await ensureAdminTables();
    const { email, code, newPassword } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({
        success: false,
        message: emailVal.error,
      });
    }

    const otpVal = validateOtp(code);
    if (!otpVal.valid) {
      return res.status(400).json({
        success: false,
        message: otpVal.error,
      });
    }

    const passVal = validatePassword(newPassword, 'New password');
    if (!passVal.valid) {
      return res.status(400).json({
        success: false,
        message: passVal.error,
      });
    }

    const cleanEmail = emailVal.sanitized;
    const cleanCode = otpVal.sanitized;

    // Verify confirmation code from database
    const [resets] = await pool.execute(
      'SELECT id FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [cleanEmail, cleanCode]
    );

    if (resets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please check your email or request a new code.',
      });
    }

    // Find admin user
    const [admins] = await pool.execute(
      'SELECT id FROM admin_users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No admin account found for this email address.',
      });
    }

    // Hash new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passVal.sanitized, salt);

    // Update password in admin_users
    await pool.execute(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [passwordHash, admins[0].id]
    );

    // Delete used OTP
    await pool.execute('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);

    return res.json({
      success: true,
      message: 'Admin password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[adminResetPassword] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. ' + (error.message || ''),
    });
  }
};

// GET /api/admin/overview
const getOverview = async (req, res) => {
  try {
    // 1. High-level lifetime metric counts (Preserved and expanded)
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

    // This Month financial metrics (Current month balance, expense & income)
    const [[thisMonthData]] = await pool.execute(`
      SELECT 
        COUNT(*) as tx_count,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE transaction_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND transaction_date < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
    `);

    // Last Month financial metrics (Previous month balance, expense & income)
    const [[lastMonthData]] = await pool.execute(`
      SELECT 
        COUNT(*) as tx_count,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE transaction_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
        AND transaction_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);

    // Month display labels
    const [[monthLabels]] = await pool.execute(`
      SELECT 
        DATE_FORMAT(CURDATE(), '%M %Y') as this_month_label,
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%M %Y') as last_month_label
    `);

    const totalIncome = Number(incomeSum.total) || 0;
    const totalExpense = Number(expenseSum.total) || 0;
    const totalBalance = totalIncome - totalExpense;

    const thisMonthIncome = Number(thisMonthData.income) || 0;
    const thisMonthExpense = Number(thisMonthData.expense) || 0;
    const thisMonthBalance = thisMonthIncome - thisMonthExpense;
    const thisMonthTransactions = Number(thisMonthData.tx_count) || 0;

    const lastMonthIncome = Number(lastMonthData.income) || 0;
    const lastMonthExpense = Number(lastMonthData.expense) || 0;
    const lastMonthBalance = lastMonthIncome - lastMonthExpense;
    const lastMonthTransactions = Number(lastMonthData.tx_count) || 0;

    // Month-over-Month (MoM) Growth & Variance Calculations
    const momExpenseChangePct = lastMonthExpense > 0
      ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 1000) / 10
      : (thisMonthExpense > 0 ? 100 : 0);

    const momIncomeChangePct = lastMonthIncome > 0
      ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 1000) / 10
      : (thisMonthIncome > 0 ? 100 : 0);

    const momBalanceDiff = thisMonthBalance - lastMonthBalance;

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
        // Totals already showing (kept and augmented with net balance)
        totalUsers: Number(userCount.total) || 0,
        totalTransactions: Number(txCount.total) || 0,
        totalIncome,
        totalExpense,
        totalBalance,
        todayNewUsers: Number(todayUsers.total) || 0,
        todayTransactions: Number(todayTx.total) || 0,

        // This Month Detailed Metrics
        thisMonthBalance,
        thisMonthExpense,
        thisMonthIncome,
        thisMonthTransactions,
        thisMonthLabel: monthLabels ? monthLabels.this_month_label : 'This Month',

        // Last Month Detailed Metrics
        lastMonthBalance,
        lastMonthExpense,
        lastMonthIncome,
        lastMonthTransactions,
        lastMonthLabel: monthLabels ? monthLabels.last_month_label : 'Last Month',

        // Month-over-Month Variance
        momExpenseChangePct,
        momIncomeChangePct,
        momBalanceDiff,
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
    const idVal = validateId(req.params.id, 'User ID');
    if (!idVal.valid) {
      return res.status(400).json({
        success: false,
        message: idVal.error,
      });
    }
    const id = idVal.value;

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

// PUT /api/admin/users/:id (Update user auth credentials, name, wrong email, password)
const updateUser = async (req, res) => {
  try {
    const idVal = validateId(req.params.id, 'User ID');
    if (!idVal.valid) {
      return res.status(400).json({ success: false, message: idVal.error });
    }
    const id = idVal.value;

    const { name, email, password } = req.body;

    // Check user exists
    const [[existingUser]] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [id]
    );
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    let cleanName = existingUser.name;
    if (name !== undefined && name !== null) {
      const nameVal = validateName(name);
      if (!nameVal.valid) {
        return res.status(400).json({ success: false, message: nameVal.error });
      }
      cleanName = nameVal.sanitized;
    }

    let cleanEmail = existingUser.email;
    if (email !== undefined && email !== null) {
      const emailVal = validateEmail(email);
      if (!emailVal.valid) {
        return res.status(400).json({ success: false, message: emailVal.error });
      }
      cleanEmail = emailVal.sanitized;

      // Check if another user already has this email
      const [emailConflict] = await pool.execute(
        'SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1',
        [cleanEmail, id]
      );
      if (emailConflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please choose a different email.',
        });
      }
    }

    let passwordHash = null;
    if (password && typeof password === 'string' && password.trim().length > 0) {
      const passVal = validatePassword(password);
      if (!passVal.valid) {
        return res.status(400).json({ success: false, message: passVal.error });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(passVal.sanitized, salt);
    }

    if (passwordHash) {
      await pool.execute(
        'UPDATE users SET name = ?, email = ?, password_hash = ?, updated_at = NOW() WHERE id = ?',
        [cleanName, cleanEmail, passwordHash, id]
      );
    } else {
      await pool.execute(
        'UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
        [cleanName, cleanEmail, id]
      );
    }

    const [[updatedUser]] = await pool.execute(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'User credentials updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('[updateUser] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user credentials.',
    });
  }
};

// GET /api/admin/profile (Get logged-in administrator credentials)
const getAdminProfile = async (req, res) => {
  try {
    await ensureAdminTables();
    const adminId = req.admin.id;
    const [[admin]] = await pool.execute(
      'SELECT id, username, email, role, created_at, updated_at FROM admin_users WHERE id = ?',
      [adminId]
    );
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }
    return res.json({ success: true, admin });
  } catch (error) {
    console.error('[getAdminProfile] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin profile.' });
  }
};

// PUT /api/admin/profile (Update logged-in administrator credentials)
const updateAdminProfile = async (req, res) => {
  try {
    await ensureAdminTables();
    const adminId = req.admin.id;
    const { username, email, password } = req.body;

    const [[currentAdmin]] = await pool.execute(
      'SELECT id, username, email FROM admin_users WHERE id = ?',
      [adminId]
    );
    if (!currentAdmin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    let cleanUsername = currentAdmin.username;
    if (username !== undefined && username !== null) {
      const userVal = validateUsername(username);
      if (!userVal.valid) {
        return res.status(400).json({ success: false, message: userVal.error });
      }
      cleanUsername = userVal.sanitized;

      const [userConflict] = await pool.execute(
        'SELECT id FROM admin_users WHERE LOWER(username) = ? AND id != ? LIMIT 1',
        [cleanUsername.toLowerCase(), adminId]
      );
      if (userConflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'An administrator with this username already exists.',
        });
      }
    }

    let cleanEmail = currentAdmin.email;
    if (email !== undefined && email !== null && email.trim() !== '') {
      const emailVal = validateEmail(email);
      if (!emailVal.valid) {
        return res.status(400).json({ success: false, message: emailVal.error });
      }
      cleanEmail = emailVal.sanitized;

      const [emailConflict] = await pool.execute(
        'SELECT id FROM admin_users WHERE LOWER(email) = ? AND id != ? LIMIT 1',
        [cleanEmail, adminId]
      );
      if (emailConflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'An administrator with this email address already exists.',
        });
      }
    }

    let passwordHash = null;
    if (password && typeof password === 'string' && password.trim().length > 0) {
      const passVal = validatePassword(password);
      if (!passVal.valid) {
        return res.status(400).json({ success: false, message: passVal.error });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(passVal.sanitized, salt);
    }

    if (passwordHash) {
      await pool.execute(
        'UPDATE admin_users SET username = ?, email = ?, password_hash = ?, updated_at = NOW() WHERE id = ?',
        [cleanUsername, cleanEmail, passwordHash, adminId]
      );
    } else {
      await pool.execute(
        'UPDATE admin_users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?',
        [cleanUsername, cleanEmail, adminId]
      );
    }

    const [[updatedAdmin]] = await pool.execute(
      'SELECT id, username, email, role, updated_at FROM admin_users WHERE id = ?',
      [adminId]
    );

    return res.json({
      success: true,
      message: 'Admin credentials updated successfully.',
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error('[updateAdminProfile] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update admin credentials.' });
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const type = req.query.type ? req.query.type.trim().toLowerCase() : '';
    const fetchAll = req.query.all === 'true';

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('LOWER(c.name) LIKE ?');
      params.push(`%${search}%`);
    }

    if (type && (type === 'income' || type === 'expense')) {
      conditions.push('(c.type = ? OR c.type = "both")');
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count matching categories
    const countQuery = `SELECT COUNT(*) as total FROM categories c ${whereClause}`;
    const [[countResult]] = await pool.execute(countQuery, params);
    const total = Number(countResult.total) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    let dataQuery = `
      SELECT 
        c.id, c.name as title, c.type, c.icon, c.color,
        COUNT(t.id) as usage_count,
        COALESCE(SUM(t.amount), 0) as total_volume
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      ${whereClause}
      GROUP BY c.id, c.name, c.type, c.icon, c.color
      ORDER BY usage_count DESC, total_volume DESC, c.name ASC
    `;

    if (!fetchAll) {
      dataQuery += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const [categories] = await pool.execute(dataQuery, params);

    return res.json({
      success: true,
      categories,
      pagination: {
        page: fetchAll ? 1 : page,
        limit: fetchAll ? total : limit,
        total,
        totalPages: fetchAll ? 1 : totalPages,
      },
    });
  } catch (error) {
    console.error('[getCategories] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories analytics.',
      error: error.message,
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

    // Broadcast update notification to all devices via Firebase Cloud Messaging
    const fcmResult = await broadcastFirebaseAppUpdate(updated);

    return res.json({
      success: true,
      message: `App release configuration updated and broadcasted via Firebase! (v${updated.latestVersion})`,
      config: updated,
      fcm: fcmResult,
    });
  } catch (error) {
    console.error('[updateAppConfig] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update app release configuration.',
    });
  }
};

// POST /api/admin/broadcast-push-update
const broadcastPushUpdate = async (req, res) => {
  try {
    const config = loadReleaseConfig();
    const fcmResult = await broadcastFirebaseAppUpdate(config);

    // Also broadcast to OneSignal
    const oneSignalResult = await sendOneSignalPush({
      title: `Mono Update v${config.latestVersion} Available! 🚀`,
      message: `A new version of Mono is now live with enhanced features. Tap to update!`,
      url: config.downloadUrl || undefined,
      apiKey: config.onesignalRestApiKey,
    });

    return res.json({
      success: true,
      message: `Push update notification broadcasted to all devices! (v${config.latestVersion})`,
      config,
      fcm: fcmResult,
      oneSignal: oneSignalResult,
    });
  } catch (error) {
    console.error('[broadcastPushUpdate] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast push update: ' + error.message,
    });
  }
};

// POST /api/admin/send-push-notification
const sendPushNotification = async (req, res) => {
  try {
    const { title, message, url, onesignalRestApiKey } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification title is required.',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification message is required.',
      });
    }

    const config = loadReleaseConfig();
    let apiKey = onesignalRestApiKey || config.onesignalRestApiKey || process.env.ONESIGNAL_REST_API_KEY;

    if (onesignalRestApiKey && onesignalRestApiKey.trim()) {
      saveReleaseConfig({ onesignalRestApiKey: onesignalRestApiKey.trim() });
      apiKey = onesignalRestApiKey.trim();
    }

    const pushResult = await sendOneSignalPush({
      title: title.trim(),
      message: message.trim(),
      url: url ? url.trim() : undefined,
      apiKey,
    });

    if (pushResult.success) {
      return res.json({
        success: true,
        message: pushResult.message || 'Push notification sent to all app devices successfully!',
        recipients: pushResult.recipients,
        id: pushResult.id,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: pushResult.message || 'Failed to send notification via OneSignal.',
        error: pushResult.error,
      });
    }
  } catch (error) {
    console.error('[sendPushNotification] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process push notification request: ' + error.message,
    });
  }
};

module.exports = {
  adminLogin,
  adminRegister,
  adminForgotPassword,
  adminResetPassword,
  getOverview,
  getUsers,
  getUserDetails,
  updateUser,
  getAdminProfile,
  updateAdminProfile,
  getTransactions,
  getCategories,
  getAppConfig,
  updateAppConfig,
  broadcastPushUpdate,
  sendPushNotification,
};
