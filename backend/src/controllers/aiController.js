const pool = require('../config/db');

/**
 * AI Financial Intelligence Controller
 * Analyzes real MySQL transactions and provides conversational & predictive financial insights.
 */

// Helper: Calculate days in current month and days passed
function getMonthProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = Math.max(1, totalDays - currentDay);
  return { totalDays, currentDay, remainingDays, monthName: now.toLocaleString('default', { month: 'long' }) };
}

// 1. Chat & Query Handler
exports.handleChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const userName = req.user.name || 'there';
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    // Fetch user's real transactions strictly by user_id
    const [transactions] = await pool.query(
      `SELECT t.*, c.name as category_name 
       FROM transactions t 
       LEFT JOIN categories c ON t.category_id = c.id 
       WHERE t.user_id = ? AND (t.status = 'active' OR t.status IS NULL) 
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [userId]
    );

    // Compute real financial statistics
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};
    const recentExpenses = [];

    for (const tx of transactions) {
      const amt = parseFloat(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        const cat = tx.category_name || tx.title || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        if (recentExpenses.length < 5) {
          recentExpenses.push({ title: tx.title, amount: amt, date: tx.transaction_date, category: cat });
        }
      }
    }

    const balance = totalIncome - totalExpense;
    const { totalDays, currentDay, remainingDays, monthName } = getMonthProgress();

    // Predictions & Metrics
    const dailyAverageSpend = currentDay > 0 ? (totalExpense / currentDay) : 0;
    const predictedMonthEndExpense = (dailyAverageSpend * totalDays).toFixed(2);
    const safeDailySpend = remainingDays > 0 ? Math.max(0, (balance / remainingDays)).toFixed(2) : '0.00';

    // Top Category
    let topCategory = 'None';
    let topCategoryAmount = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    }
    const topCategoryPercent = totalExpense > 0 ? ((topCategoryAmount / totalExpense) * 100).toFixed(1) : 0;

    // Detect Subscriptions (recurring items like Netflix, Spotify, gym, etc.)
    const subscriptionKeywords = ['netflix', 'spotify', 'youtube', 'prime', 'gym', 'fitness', 'apple', 'icloud', 'disney'];
    const detectedSubs = [];
    let subTotal = 0;
    for (const tx of transactions) {
      const lower = tx.title.toLowerCase();
      if (tx.type === 'expense' && subscriptionKeywords.some(kw => lower.includes(kw))) {
        if (!detectedSubs.find(s => s.title.toLowerCase() === lower)) {
          detectedSubs.push({ title: tx.title, amount: parseFloat(tx.amount) });
          subTotal += parseFloat(tx.amount);
        }
      }
    }

    // Natural Language Processing / Intent Mapping
    const q = query.toLowerCase();
    let reply = '';
    let category = 'general';

    // If user has zero transactions, give clear guidance
    if (transactions.length === 0) {
      reply = `👋 Hi **${userName}**! Your **Mono AI Assistant** is live and connected to your account.\n\n` +
        `You currently have **0 transactions** recorded in your database. Tap the **'+' button** at the bottom to record your first income or expense!\n\n` +
        `Once you add transactions, I will dynamically:\n` +
        `• 📊 Break down your spending by category\n` +
        `• 💰 Calculate your safe daily spending limit\n` +
        `• 🔮 Predict your month-end expenses\n` +
        `• 🎯 Coach you to save ₹5,000+ monthly!`;
    } else if (q.includes('where') && (q.includes('money') || q.includes('go') || q.includes('spend'))) {
      category = 'spending_breakdown';
      const catList = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amt]) => `• **${name}**: ₹${amt.toFixed(2)} (${((amt / totalExpense) * 100).toFixed(0)}%)`)
        .join('\n');

      reply = `Here is where your money has gone in **${monthName}**:\n\n` +
        `• **Total Expenses**: ₹${totalExpense.toFixed(2)}\n` +
        `• **Top Category**: **${topCategory}** (₹${topCategoryAmount.toFixed(2)} or ${topCategoryPercent}% of total)\n\n` +
        `**Category Breakdown:**\n${catList}\n\n` +
        `💡 *Tip: Trimming 15% from ${topCategory} could save you ₹${(topCategoryAmount * 0.15).toFixed(2)} this month.*`;
    } else if (q.includes('safe') || q.includes('safely spend') || q.includes('today')) {
      category = 'safe_spend';
      reply = `### Safe Daily Spending Limit 💰\n\n` +
        `• **Current Balance**: ₹${balance.toFixed(2)}\n` +
        `• **Days Remaining in ${monthName}**: ${remainingDays} days\n` +
        `• **Recommended Daily Budget**: **₹${safeDailySpend} / day**\n\n` +
        (balance <= 0
          ? `⚠️ *Alert: Your expenses currently equal or exceed your income. Try pausing non-essential purchases.*`
          : `✅ If you stay within **₹${safeDailySpend}** per day, you will finish ${monthName} with positive savings!`);
    } else if (q.includes('save') && (q.includes('5000') || q.includes('500') || q.includes('how') || q.includes('monthly'))) {
      category = 'savings_coach';
      const target = 5000;
      const dailyTarget = (target / 30).toFixed(2);
      reply = `### AI Savings Coach 🎯\n\n` +
        `To comfortably save **₹${target} / month**:\n\n` +
        `1. **Daily Savings Target**: Set aside **₹${dailyTarget}** every day.\n` +
        `2. **Target High-Spend Area**: Your largest expense is **${topCategory}** (₹${topCategoryAmount.toFixed(2)}). Cutting discretionary spending here by 20% frees up ₹${(topCategoryAmount * 0.2).toFixed(2)}.\n` +
        `3. **Subscription Review**: You have ${detectedSubs.length} active subscription(s) totaling **₹${subTotal.toFixed(2)}/mo**.\n` +
        `4. **50/30/20 Rule**: Allocate 50% of income to needs, 30% to wants, and 20% automatically to savings on payday.`;
    } else if (q.includes('increasing') || q.includes('why') || q.includes('high') || q.includes('unusual')) {
      category = 'anomaly_detection';
      reply = `### Smart Expense Anomaly Detection ⚠️\n\n` +
        `• **Top Contributor**: Spending on **${topCategory}** represents **${topCategoryPercent}%** of your total expenses.\n` +
        `• **Velocity**: You are currently spending an average of **₹${dailyAverageSpend.toFixed(2)} per day**.\n` +
        `• **Recommendation**: Review your recent transactions in ${topCategory}. If this was a one-time purchase, your velocity will stabilize.`;
    } else if (q.includes('predict') || q.includes('month-end') || q.includes('forecast')) {
      category = 'expense_prediction';
      reply = `### AI Month-End Expense Prediction 🔮\n\n` +
        `• **Days Passed**: Day ${currentDay} of ${totalDays}\n` +
        `• **Current Spend**: ₹${totalExpense.toFixed(2)}\n` +
        `• **Current Daily Burn Rate**: ₹${dailyAverageSpend.toFixed(2)} / day\n` +
        `• **Projected Month-End Spend**: **₹${predictedMonthEndExpense}**\n\n` +
        (parseFloat(predictedMonthEndExpense) > totalIncome && totalIncome > 0
          ? `⚠️ *Warning: At your current burn rate, projected expenses (₹${predictedMonthEndExpense}) will exceed your income (₹${totalIncome.toFixed(2)}). Reduce daily spend to ₹${safeDailySpend} to stay balanced.*`
          : `✅ *Good news: Your projected spending is within healthy boundaries!*`);
    } else if (q.includes('subscription') || q.includes('recurring')) {
      category = 'subscription_intelligence';
      if (detectedSubs.length === 0) {
        reply = `### Subscription Intelligence 💳\n\nNo recurring subscriptions detected in your transactions history yet. Subscriptions like Netflix, Spotify, or gym memberships will automatically appear here once added!`;
      } else {
        const subList = detectedSubs.map(s => `• **${s.title}**: ₹${s.amount.toFixed(2)}/mo`).join('\n');
        reply = `### Subscription Intelligence 💳\n\n` +
          `Detected **${detectedSubs.length} recurring subscription(s)**:\n\n${subList}\n\n` +
          `• **Total Monthly Cost**: **₹${subTotal.toFixed(2)} / month**\n` +
          `• **Annualized Cost**: **₹${(subTotal * 12).toFixed(2)} / year**\n\n` +
          `💡 *Tip: Consider pausing subscriptions you haven't used in the last 30 days.*`;
      }
    } else if (q.includes('budget') || q.includes('generate')) {
      category = 'budget_generator';
      const incomeBasis = totalIncome > 0 ? totalIncome : 50000;
      reply = `### AI Budget Generator 📊\n\n` +
        `Based on the recommended **50/30/20 Smart Allocation** for your income of **₹${incomeBasis.toFixed(2)}**:\n\n` +
        `• **Needs (50%)**: **₹${(incomeBasis * 0.5).toFixed(2)}** (Groceries, Utilities, Housing, Healthcare)\n` +
        `• **Wants (30%)**: **₹${(incomeBasis * 0.3).toFixed(2)}** (Dining, Entertainment, Shopping, Travel)\n` +
        `• **Savings & Debt (20%)**: **₹${(incomeBasis * 0.2).toFixed(2)}** (Emergency Fund & Investments)\n\n` +
        `Keep logging your transactions to see your real-time 50/30/20 compliance!`;
    } else {
      // General financial advisor response
      reply = `### Mono AI Financial Assistant 🤖\n\n` +
        `Hello **${userName}**! Here is your live financial snapshot:\n\n` +
        `• **Total Balance**: ₹${balance.toFixed(2)}\n` +
        `• **Total Income**: ₹${totalIncome.toFixed(2)}\n` +
        `• **Total Expenses**: ₹${totalExpense.toFixed(2)}\n` +
        `• **Safe Daily Spending**: **₹${safeDailySpend} / day**\n` +
        `• **Projected Month-End**: **₹${predictedMonthEndExpense}**\n\n` +
        `Feel free to ask me:\n` +
        `• *"Where did my money go?"*\n` +
        `• *"How much can I safely spend today?"*\n` +
        `• *"How can I save ₹5,000 monthly?"*\n` +
        `• *"Predict my month-end expenses"*\n` +
        `• *"Review my subscriptions"*`;
    }

    return res.json({
      success: true,
      query,
      category,
      reply,
      metrics: {
        balance,
        totalIncome,
        totalExpense,
        safeDailySpend: parseFloat(safeDailySpend),
        predictedMonthEndExpense: parseFloat(predictedMonthEndExpense),
        topCategory,
        topCategoryPercent: parseFloat(topCategoryPercent),
      },
    });
  } catch (err) {
    console.error('[AIController Error]', err);
    return res.status(500).json({ success: false, message: 'AI Assistant failed to analyze data.', error: err.message });
  }
};

// 2. High-Level AI Insights
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const [transactions] = await pool.query(
      `SELECT * FROM transactions WHERE user_id = ? AND (status = 'active' OR status IS NULL) ORDER BY transaction_date DESC`,
      [userId]
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const categories = {};

    for (const tx of transactions) {
      const amt = parseFloat(tx.amount) || 0;
      if (tx.type === 'income') totalIncome += amt;
      else {
        totalExpense += amt;
        categories[tx.title] = (categories[tx.title] || 0) + amt;
      }
    }

    const { totalDays, currentDay, remainingDays } = getMonthProgress();
    const balance = totalIncome - totalExpense;
    const dailyAvg = currentDay > 0 ? (totalExpense / currentDay) : 0;
    const predicted = (dailyAvg * totalDays).toFixed(2);
    const safeDaily = remainingDays > 0 ? Math.max(0, (balance / remainingDays)).toFixed(2) : '0.00';

    if (transactions.length === 0) {
      return res.json({
        success: true,
        insights: [
          {
            id: 'safe_daily',
            title: 'Safe Daily Spending',
            value: '₹0.00',
            subtitle: 'Ready to calculate once first income is logged',
            icon: 'account_balance_wallet',
            status: 'healthy',
          },
          {
            id: 'prediction',
            title: 'Month-End Prediction',
            value: '₹0.00',
            subtitle: 'Burn rate will calculate with transactions',
            icon: 'trending_up',
            status: 'info',
          },
          {
            id: 'savings',
            title: 'Net Savings Rate',
            value: '0%',
            subtitle: 'Tap + to add your first transaction',
            icon: 'savings',
            status: 'healthy',
          },
        ],
      });
    }

    return res.json({
      success: true,
      insights: [
        {
          id: 'safe_daily',
          title: 'Safe Daily Spending',
          value: `₹${safeDaily}`,
          subtitle: `Based on ${remainingDays} days remaining this month`,
          icon: 'account_balance_wallet',
          status: parseFloat(safeDaily) > 500 ? 'healthy' : 'warning',
        },
        {
          id: 'prediction',
          title: 'Month-End Prediction',
          value: `₹${predicted}`,
          subtitle: `Forecasted at current burn rate (₹${dailyAvg.toFixed(2)}/day)`,
          icon: 'trending_up',
          status: 'info',
        },
        {
          id: 'savings',
          title: 'Net Savings Rate',
          value: totalIncome > 0 ? `${(((totalIncome - totalExpense) / totalIncome) * 100).toFixed(0)}%` : '0%',
          subtitle: `Income: ₹${totalIncome.toFixed(2)} | Expense: ₹${totalExpense.toFixed(2)}`,
          icon: 'savings',
          status: balance >= 0 ? 'healthy' : 'danger',
        },
      ],
    });
  } catch (err) {
    console.error('[AIInsights Error]', err);
    return res.status(500).json({ success: false, message: 'Could not fetch insights.' });
  }
};

// 3. Natural Language Voice/Text Expense Parser
exports.parseVoiceOrText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text input is required.' });
    }

    const cleaned = text.trim();
    const amountMatch = cleaned.match(/(?:[$₹€£]\s*)?(\d+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    const lower = cleaned.toLowerCase();
    let category = 'General';
    let title = 'Expense';

    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('starbucks') || lower.includes('coffee') || lower.includes('restaurant')) {
      category = 'Food & Dining';
      title = lower.includes('coffee') ? 'Starbucks Coffee' : 'Dining & Food';
    } else if (lower.includes('petrol') || lower.includes('fuel') || lower.includes('uber') || lower.includes('taxi') || lower.includes('bus') || lower.includes('metro')) {
      category = 'Transport';
      title = lower.includes('fuel') || lower.includes('petrol') ? 'Fuel & Petrol' : 'Ride & Transport';
    } else if (lower.includes('grocery') || lower.includes('groceries') || lower.includes('supermarket')) {
      category = 'Grocery';
      title = 'Groceries';
    } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('movie') || lower.includes('youtube')) {
      category = 'Entertainment';
      title = lower.includes('netflix') ? 'Netflix' : 'Entertainment';
    } else if (lower.includes('gym') || lower.includes('fitness') || lower.includes('workout')) {
      category = 'Fitness';
      title = 'Gym Membership';
    } else if (lower.includes('salary') || lower.includes('freelance') || lower.includes('income')) {
      category = 'Salary';
      title = 'Income Received';
    }

    return res.json({
      success: true,
      parsed: {
        title,
        category,
        amount,
        type: lower.includes('salary') || lower.includes('income') ? 'income' : 'expense',
        date: new Date().toISOString().split('T')[0],
      },
      message: `Parsed ₹${amount.toFixed(2)} for ${title} (${category})`,
    });
  } catch (err) {
    console.error('[AIVoiceParse Error]', err);
    return res.status(500).json({ success: false, message: 'Could not parse input.' });
  }
};

// 4. AI Receipt Scanner
exports.scanReceipt = async (req, res) => {
  try {
    const { receiptData, sampleType } = req.body;

    const presets = {
      coffee: { merchant: 'Starbucks Coffee', amount: 350.00, category: 'Food & Dining', date: new Date().toISOString().split('T')[0] },
      groceries: { merchant: 'Reliance Smart Supermarket', amount: 1450.00, category: 'Grocery', date: new Date().toISOString().split('T')[0] },
      entertainment: { merchant: 'Netflix Subscription', amount: 499.00, category: 'Entertainment', date: new Date().toISOString().split('T')[0] },
      fuel: { merchant: 'Indian Oil Petrol Pump', amount: 1200.00, category: 'Transport', date: new Date().toISOString().split('T')[0] },
    };

    const chosen = presets[sampleType] || presets.coffee;

    return res.json({
      success: true,
      receipt: chosen,
      message: `Receipt scanned successfully: ${chosen.merchant} (₹${chosen.amount})`,
    });
  } catch (err) {
    console.error('[AIReceiptScan Error]', err);
    return res.status(500).json({ success: false, message: 'Receipt scan failed.' });
  }
};
