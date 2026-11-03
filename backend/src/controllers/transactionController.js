const pool = require('../config/db');

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit } = req.query;

    let query = `
      SELECT t.id, t.user_id, t.category_id, t.title, t.type, t.amount, 
             DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
             t.invoice_url, t.notes, t.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND (t.status = 'active' OR t.status IS NULL)
    `;
    const params = [userId];

    if (type && (type === 'income' || type === 'expense')) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    query += ' ORDER BY t.transaction_date DESC, t.id DESC';

    if (limit && parseInt(limit, 10) > 0) {
      query += ` LIMIT ${parseInt(limit, 10)}`;
    }

    const [transactions] = await pool.execute(query, params);

    return res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('[TransactionController.getTransactions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions.',
    });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, category_id, category, amount, type, transaction_date, invoice_url, notes } = req.body;

    if (!title || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Title and amount are required.',
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number.',
      });
    }

    const txType = (type && type.toLowerCase() === 'income') ? 'income' : 'expense';
    const txDate = transaction_date || new Date().toISOString().slice(0, 10);

    // If category_id not provided but category name provided, try to find matching category
    let resolvedCategoryId = category_id || null;
    if (!resolvedCategoryId && category) {
      const [cats] = await pool.execute(
        'SELECT id FROM categories WHERE name = ? AND (user_id IS NULL OR user_id = ?) LIMIT 1',
        [category, userId]
      );
      if (cats.length > 0) {
        resolvedCategoryId = cats[0].id;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO transactions (user_id, category_id, title, type, amount, transaction_date, invoice_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, resolvedCategoryId, title, txType, numericAmount, txDate, invoice_url || null, notes || null]
    );

    const [newRows] = await pool.execute(
      `SELECT t.id, t.user_id, t.category_id, t.title, t.type, t.amount, 
              DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
              t.invoice_url, t.notes, t.created_at,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Transaction saved successfully.',
      transaction: newRows[0],
    });
  } catch (error) {
    console.error('[TransactionController.createTransaction] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record transaction.',
    });
  }
};

// GET /api/transactions/dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Calculate totals
    const [totals] = await pool.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions 
       WHERE user_id = ? AND (status = 'active' OR status IS NULL)`,
      [userId]
    );

    const totalIncome = parseFloat(totals[0].total_income || 0);
    const totalExpense = parseFloat(totals[0].total_expense || 0);
    const totalBalance = totalIncome - totalExpense;

    // 2. Fetch Recent Transactions
    const [recentTransactions] = await pool.execute(
      `SELECT t.id, t.user_id, t.category_id, t.title, t.type, t.amount, 
              DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND (t.status = 'active' OR t.status IS NULL)
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT 5`,
      [userId]
    );

    // 3. Fetch Top Spendings
    const [topSpendings] = await pool.execute(
      `SELECT t.id, t.title, t.amount, 
              DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND (t.status = 'active' OR t.status IS NULL)
       ORDER BY t.amount DESC
       LIMIT 5`,
      [userId]
    );

    // 4. Fetch Send Again Contacts
    const [sendAgainContacts] = await pool.execute(
      'SELECT id, name, avatar_url FROM send_again_contacts WHERE user_id = ? AND (status = \'active\' OR status IS NULL) ORDER BY id ASC LIMIT 10',
      [userId]
    );

    return res.json({
      success: true,
      data: {
        totalBalance,
        totalIncome,
        totalExpense,
        recentTransactions,
        topSpendings,
        sendAgainContacts,
      },
    });
  } catch (error) {
    console.error('[TransactionController.getDashboard] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data.',
    });
  }
};

// GET /api/transactions/statistics
const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period, type } = req.query; // period: Day, Week, Month, Year; type: expense, income

    const statType = (type && type.toLowerCase() === 'income') ? 'income' : 'expense';

    // Top spendings for this period
    const [topSpendings] = await pool.execute(
      `SELECT t.id, t.title, t.amount, 
              DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = ? AND (t.status = 'active' OR t.status IS NULL)
       ORDER BY t.amount DESC
       LIMIT 5`,
      [userId, statType]
    );

    // Dynamically calculate chart curve from user's actual MySQL transactions
    let chartPoints = [];
    if (period === 'Day') {
      const [points] = await pool.execute(
        `SELECT DATE_FORMAT(transaction_date, '%a') as label, COALESCE(SUM(amount), 0) as amount
         FROM transactions 
         WHERE user_id = ? AND type = ? AND (status = 'active' OR status IS NULL)
           AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY transaction_date
         ORDER BY transaction_date ASC`,
        [userId, statType]
      );
      chartPoints = points.map(p => ({ label: p.label, amount: parseFloat(p.amount) }));
    } else if (period === 'Week') {
      const [points] = await pool.execute(
        `SELECT CONCAT('W', WEEK(transaction_date)) as label, COALESCE(SUM(amount), 0) as amount
         FROM transactions 
         WHERE user_id = ? AND type = ? AND (status = 'active' OR status IS NULL)
           AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
         GROUP BY WEEK(transaction_date)
         ORDER BY MIN(transaction_date) ASC`,
        [userId, statType]
      );
      chartPoints = points.map(p => ({ label: p.label, amount: parseFloat(p.amount) }));
    } else if (period === 'Year') {
      const [points] = await pool.execute(
        `SELECT DATE_FORMAT(transaction_date, '%Y') as label, COALESCE(SUM(amount), 0) as amount
         FROM transactions 
         WHERE user_id = ? AND type = ? AND (status = 'active' OR status IS NULL)
         GROUP BY YEAR(transaction_date)
         ORDER BY transaction_date ASC
         LIMIT 5`,
        [userId, statType]
      );
      chartPoints = points.map(p => ({ label: p.label, amount: parseFloat(p.amount) }));
    } else {
      // Month (default): Group by Month over the last 6 months
      const [points] = await pool.execute(
        `SELECT DATE_FORMAT(transaction_date, '%b') as label, COALESCE(SUM(amount), 0) as amount
         FROM transactions 
         WHERE user_id = ? AND type = ? AND (status = 'active' OR status IS NULL)
           AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(transaction_date, '%Y-%m'), DATE_FORMAT(transaction_date, '%b')
         ORDER BY MIN(transaction_date) ASC`,
        [userId, statType]
      );
      chartPoints = points.map(p => ({ label: p.label, amount: parseFloat(p.amount) }));
    }

    if (chartPoints.length === 0) {
      // Clean fallback showing 0 activity when user has no transactions yet
      chartPoints = [{ label: 'Current', amount: 0.0 }];
    }

    return res.json({
      success: true,
      period: period || 'Month',
      type: statType,
      chartPoints,
      topSpendings,
    });
  } catch (error) {
    console.error('[TransactionController.getStatistics] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics.',
    });
  }
};

// GET /api/transactions/export
// Query params: period (weekly, monthly, yearly, all), format (csv, json), currency (INR, USD), type (all, expense, income)
const exportTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly', format = 'json', currency = 'INR', type = 'all' } = req.query;

    let dateCondition = '';
    const now = new Date();
    let periodLabel = '';

    if (period === 'weekly') {
      dateCondition = 'AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      periodLabel = 'Weekly (Last 7 Days)';
    } else if (period === 'yearly') {
      // Indian Financial Year: April 1 to March 31
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const fyEndYear = fyStartYear + 1;
      dateCondition = `AND t.transaction_date >= '${fyStartYear}-04-01' AND t.transaction_date <= '${fyEndYear}-03-31'`;
      periodLabel = `Indian Financial Year (FY ${fyStartYear}-${fyEndYear.toString().slice(-2)})`;
    } else if (period === 'monthly') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      dateCondition = `AND t.transaction_date >= '${year}-${month}-01'`;
      const monthName = now.toLocaleString('default', { month: 'long' });
      periodLabel = `Monthly (${monthName} ${year})`;
    } else {
      periodLabel = 'All Time';
    }

    let typeCondition = '';
    if (type === 'expense' || type === 'income') {
      typeCondition = `AND t.type = '${type}'`;
    }

    const query = `
      SELECT t.id, t.title, t.type, t.amount, 
             DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
             COALESCE(t.payment_mode, 'UPI') as payment_mode,
             COALESCE(t.currency, ?) as currency,
             t.notes,
             COALESCE(c.name, 'General') as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND (t.status = 'active' OR t.status IS NULL) ${dateCondition} ${typeCondition}
      ORDER BY t.transaction_date DESC, t.id DESC
    `;

    const [transactions] = await pool.execute(query, [currency, userId]);

    // Calculate Indian Financial Metrics & 50/30/20 Budgeting Rule
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};
    const paymentModeTotals = { UPI: 0, Card: 0, NetBanking: 0, Cash: 0, Other: 0 };

    // 50/30/20 Rule: Needs (50%), Wants (30%), Savings (20%)
    const needsCategories = ['grocery', 'bills', 'utilities', 'hospital', 'medical', 'emi', 'loans', 'rent', 'fuel', 'petrol'];
    const wantsCategories = ['entertainment', 'netflix', 'spotify', 'starbucks', 'dining', 'shopping', 'youtube', 'travel'];
    const savingsCategories = ['savings', 'investment', 'sip', 'mutual fund', 'deposit'];

    let needsAmount = 0;
    let wantsAmount = 0;
    let savingsAmount = 0;

    transactions.forEach(t => {
      const amt = parseFloat(t.amount);
      const catLower = (t.category_name || '').toLowerCase();
      const mode = (t.payment_mode || 'UPI');

      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryTotals[t.category_name] = (categoryTotals[t.category_name] || 0) + amt;

        // Payment mode breakdown
        if (mode.includes('UPI') || mode.includes('Paytm') || mode.includes('GPay') || mode.includes('PhonePe')) {
          paymentModeTotals.UPI += amt;
        } else if (mode.includes('Card') || mode.includes('Debit') || mode.includes('Credit')) {
          paymentModeTotals.Card += amt;
        } else if (mode.includes('Net') || mode.includes('IMPS') || mode.includes('NEFT')) {
          paymentModeTotals.NetBanking += amt;
        } else if (mode.includes('Cash')) {
          paymentModeTotals.Cash += amt;
        } else {
          paymentModeTotals.Other += amt;
        }

        // 50/30/20 classification
        if (needsCategories.some(n => catLower.includes(n))) {
          needsAmount += amt;
        } else if (wantsCategories.some(w => catLower.includes(w))) {
          wantsAmount += amt;
        } else if (savingsCategories.some(s => catLower.includes(s))) {
          savingsAmount += amt;
        } else {
          needsAmount += amt; // default to essential
        }
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

    if (format === 'csv') {
      const currSymbol = currency === 'INR' ? 'INR (₹)' : 'USD ($)';
      let csv = `Transaction ID,Date,Title,Category,Payment Mode,Type,Amount (${currSymbol}),Notes\r\n`;
      transactions.forEach(t => {
        const cleanTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
        const cleanCat = `"${(t.category_name || '').replace(/"/g, '""')}"`;
        const cleanNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
        csv += `${t.id},${t.transaction_date},${cleanTitle},${cleanCat},${t.payment_mode},${t.type},${t.amount},${cleanNotes}\r\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="mono_${period}_statement.csv"`);
      return res.status(200).send(csv);
    }

    return res.json({
      success: true,
      data: {
        period: periodLabel,
        currency,
        currencySymbol: currency === 'INR' ? '₹' : '$',
        user: {
          name: req.user.name,
          email: req.user.email,
        },
        summary: {
          totalIncome: totalIncome.toFixed(2),
          totalExpense: totalExpense.toFixed(2),
          netSavings: netSavings.toFixed(2),
          savingsRatePercent: savingsRate,
          transactionCount: transactions.length,
        },
        budgeting50_30_20: {
          needs: {
            amount: needsAmount.toFixed(2),
            percentage: totalExpense > 0 ? ((needsAmount / totalExpense) * 100).toFixed(1) : '0.0',
            targetPercentage: '50.0',
          },
          wants: {
            amount: wantsAmount.toFixed(2),
            percentage: totalExpense > 0 ? ((wantsAmount / totalExpense) * 100).toFixed(1) : '0.0',
            targetPercentage: '30.0',
          },
          savings: {
            amount: savingsAmount.toFixed(2),
            percentage: totalExpense > 0 ? ((savingsAmount / totalExpense) * 100).toFixed(1) : '0.0',
            targetPercentage: '20.0',
          },
        },
        paymentModes: paymentModeTotals,
        categoryBreakdown: categoryTotals,
        transactions,
      },
    });
  } catch (error) {
    console.error('[TransactionController.exportTransactions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export transactions.',
    });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const txId = req.params.id;

    // Soft delete: Mark status as 'inactive'
    const [result] = await pool.execute(
      `UPDATE transactions 
       SET status = 'inactive' 
       WHERE id = ? AND user_id = ?`,
      [txId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Transaction status set to inactive. Hidden from app.',
    });
  } catch (error) {
    console.error('[TransactionController.deleteTransaction] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete transaction.',
    });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  getDashboard,
  getStatistics,
  exportTransactions,
  deleteTransaction,
};
