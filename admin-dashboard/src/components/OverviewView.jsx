import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  Zap, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Wallet,
  Calendar,
  Sparkles,
  CheckCircle2,
  Scale
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { apiFetch, formatINR, formatDate } from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function OverviewView({ onNavigate, showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/overview');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return <OverviewSkeleton />;
  }

  const { stats, recentTransactions, recentUsers, topCategories, monthlyTrend, system } = data;

  // Lifetime Totals (all preserved and augmented with net balance)
  const totalUsers = stats?.totalUsers || 0;
  const todayNewUsers = stats?.todayNewUsers || 0;
  const totalTransactions = stats?.totalTransactions || 0;
  const todayTransactions = stats?.todayTransactions || 0;
  const totalIncome = stats?.totalIncome || 0;
  const totalExpense = stats?.totalExpense || 0;
  const totalBalance = stats?.totalBalance !== undefined 
    ? stats.totalBalance 
    : (totalIncome - totalExpense);

  // This Month Metrics
  const thisMonthIncome = stats?.thisMonthIncome || 0;
  const thisMonthExpense = stats?.thisMonthExpense || 0;
  const thisMonthBalance = stats?.thisMonthBalance !== undefined 
    ? stats.thisMonthBalance 
    : (thisMonthIncome - thisMonthExpense);
  const thisMonthTx = stats?.thisMonthTransactions || 0;
  const thisMonthLabel = stats?.thisMonthLabel || 'This Month';

  // Last Month Metrics
  const lastMonthIncome = stats?.lastMonthIncome || 0;
  const lastMonthExpense = stats?.lastMonthExpense || 0;
  const lastMonthBalance = stats?.lastMonthBalance !== undefined 
    ? stats.lastMonthBalance 
    : (lastMonthIncome - lastMonthExpense);
  const lastMonthTx = stats?.lastMonthTransactions || 0;
  const lastMonthLabel = stats?.lastMonthLabel || 'Last Month';

  // Month-over-Month (MoM) Growth & Variance
  const momExpenseChangePct = stats?.momExpenseChangePct !== undefined
    ? stats.momExpenseChangePct
    : (lastMonthExpense > 0 ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 1000) / 10 : 0);

  const momBalanceDiff = stats?.momBalanceDiff !== undefined
    ? stats.momBalanceDiff
    : (thisMonthBalance - lastMonthBalance);

  const savingsRate = thisMonthIncome > 0
    ? Math.max(0, Math.min(100, Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100)))
    : 0;

  // Chart 1: Monthly Trend
  const barLabels = monthlyTrend?.length > 0 ? monthlyTrend.map(d => d.month_label) : ['No Data'];
  const barIncome = monthlyTrend?.length > 0 ? monthlyTrend.map(d => Number(d.income) || 0) : [0];
  const barExpense = monthlyTrend?.length > 0 ? monthlyTrend.map(d => Number(d.expense) || 0) : [0];

  const trendChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Income (₹)',
        data: barIncome,
        backgroundColor: '#25A969',
        borderRadius: 6,
        barPercentage: 0.6,
      },
      {
        label: 'Expense (₹)',
        data: barExpense,
        backgroundColor: '#F95B51',
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { family: 'Inter', weight: 600 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val) => '₹' + (val >= 1000 ? val / 1000 + 'k' : val),
          font: { family: 'Inter' },
        },
        grid: { color: '#F0F4F4' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', weight: 600 } },
      },
    },
  };

  // Chart 2: Category Donut
  const donutPalette = ['#438883', '#69AEA9', '#F59E0B', '#3B82F6', '#8B5CF6'];
  const donutLabels = topCategories?.map(c => c.category_name) || [];
  const donutValues = topCategories?.map(c => Number(c.total_amount) || 0) || [];

  const donutChartData = {
    labels: donutLabels,
    datasets: [
      {
        data: donutValues,
        backgroundColor: donutPalette.slice(0, donutLabels.length),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  const donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatINR(ctx.raw)}`,
        },
      },
    },
    cutout: '70%',
  };

  return (
    <div className="view-section">
      {/* 5 LIFETIME STAT CARDS (Keep existing totals + Total Net Balance) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon icon-balance">
            <Wallet size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Net Balance</span>
            <h3 className={`stat-value ${totalBalance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatINR(totalBalance)}
            </h3>
            <span className={`stat-sub ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
              <ShieldCheck size={12} /> {totalBalance >= 0 ? 'Surplus Reserve' : 'Deficit Reserve'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-income">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Income Volume</span>
            <h3 className="stat-value text-income">{formatINR(totalIncome)}</h3>
            <span className="stat-sub neutral">
              <ShieldCheck size={12} /> Verified Credits
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-expense">
            <TrendingDown size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Expense Volume</span>
            <h3 className="stat-value text-expense">{formatINR(totalExpense)}</h3>
            <span className="stat-sub neutral">
              <Receipt size={12} /> Recorded Debits
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-users">
            <Users size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Users</span>
            <h3 className="stat-value">{totalUsers.toLocaleString()}</h3>
            <span className="stat-sub positive">
              <UserPlus size={12} /> +{todayNewUsers} today
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-tx">
            <Receipt size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Transactions</span>
            <h3 className="stat-value">{totalTransactions.toLocaleString()}</h3>
            <span className="stat-sub positive">
              <Zap size={12} /> +{todayTransactions} today
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED MONTHLY PERFORMANCE (This Month Balance & Expense, Last Month Balance & Expense, and MoM Comparison) */}
      <div className="dashboard-subheading">
        <h4>
          <Calendar size={18} color="var(--primary)" />
          Monthly Financial Performance & Comparison
        </h4>
        <span>Current billing cycle vs previous closed period</span>
      </div>

      <div className="monthly-grid">
        {/* THIS MONTH CARD */}
        <div className="month-feature-card highlight">
          <div className="month-card-header">
            <div className="month-card-title">
              <Calendar size={16} color="var(--primary)" />
              <strong>{thisMonthLabel}</strong>
            </div>
            <span className="month-badge current">Current Month</span>
          </div>

          <div className="month-main-metric">
            <span className="month-main-label">This Month Balance</span>
            <h3 className={`month-main-val ${thisMonthBalance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatINR(thisMonthBalance)}
            </h3>
            <span className={`badge ${thisMonthBalance >= 0 ? 'badge-income' : 'badge-expense'}`} style={{ marginTop: 6 }}>
              {thisMonthBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}
            </span>
          </div>

          <div className="month-sub-grid">
            <div className="month-sub-col">
              <span>This Month Exp</span>
              <strong className="text-expense">{formatINR(thisMonthExpense)}</strong>
            </div>
            <div className="month-sub-col">
              <span>This Month Inc</span>
              <strong className="text-income">{formatINR(thisMonthIncome)}</strong>
            </div>
          </div>

          <div className="month-footer-note">
            <Clock size={13} color="var(--text-muted)" />
            <span>{thisMonthTx} transactions recorded this month</span>
          </div>
        </div>

        {/* LAST MONTH CARD */}
        <div className="month-feature-card">
          <div className="month-card-header">
            <div className="month-card-title">
              <Clock size={16} color="var(--text-secondary)" />
              <strong>{lastMonthLabel}</strong>
            </div>
            <span className="month-badge previous">Last Month</span>
          </div>

          <div className="month-main-metric">
            <span className="month-main-label">Last Month Balance</span>
            <h3 className={`month-main-val ${lastMonthBalance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatINR(lastMonthBalance)}
            </h3>
            <span className={`badge ${lastMonthBalance >= 0 ? 'badge-income' : 'badge-expense'}`} style={{ marginTop: 6 }}>
              {lastMonthBalance >= 0 ? 'Closed Surplus' : 'Closed Deficit'}
            </span>
          </div>

          <div className="month-sub-grid">
            <div className="month-sub-col">
              <span>Last Month Exp</span>
              <strong className="text-expense">{formatINR(lastMonthExpense)}</strong>
            </div>
            <div className="month-sub-col">
              <span>Last Month Inc</span>
              <strong className="text-income">{formatINR(lastMonthIncome)}</strong>
            </div>
          </div>

          <div className="month-footer-note">
            <CheckCircle2 size={13} color="var(--text-muted)" />
            <span>{lastMonthTx} finalized transactions</span>
          </div>
        </div>

        {/* MONTH-OVER-MONTH HEALTH & VARIANCE INSIGHT */}
        <div className="insight-card">
          <div className="insight-header">
            <strong>
              <Sparkles size={16} />
              MoM Variance & Retention
            </strong>
            <span className="insight-badge">Health Metric</span>
          </div>

          <div className="insight-row">
            <div className="insight-row-top">
              <span>Expense MoM Variance</span>
              <span className="insight-badge">
                {momExpenseChangePct <= 0 ? 'Controlled' : 'Elevated'}
              </span>
            </div>
            <div className="insight-row-val">
              <span>{momExpenseChangePct <= 0 ? '↓ ' : '↑ '}{Math.abs(momExpenseChangePct)}%</span>
              <small style={{ fontSize: 11, opacity: 0.85 }}>
                {formatINR(Math.abs(thisMonthExpense - lastMonthExpense))} {thisMonthExpense <= lastMonthExpense ? 'savings' : 'growth'}
              </small>
            </div>
          </div>

          <div className="insight-row">
            <div className="insight-row-top">
              <span>Net Balance Delta</span>
              <span className="insight-badge">
                {momBalanceDiff >= 0 ? 'Gain' : 'Drawdown'}
              </span>
            </div>
            <div className="insight-row-val">
              <span>{momBalanceDiff >= 0 ? '+' : ''}{formatINR(momBalanceDiff)}</span>
              <small style={{ fontSize: 11, opacity: 0.85 }}>vs {lastMonthLabel}</small>
            </div>
          </div>

          <div className="insight-row" style={{ marginBottom: 0 }}>
            <div className="insight-row-top">
              <span>Active Retention Rate</span>
              <span>{savingsRate}% retained</span>
            </div>
            <div className="savings-bar-bg">
              <div className="savings-bar-fill" style={{ width: `${savingsRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid-2-col">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Transaction Volume Trend</h3>
              <p className="card-subtitle">Last 6 Months Income vs Expense Breakdown (INR ₹)</p>
            </div>
            <span className="badge badge-teal">Live Aggregation</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Bar data={trendChartData} options={trendChartOptions} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Top Spending Categories</h3>
              <p className="card-subtitle">Highest platform expense allocation</p>
            </div>
          </div>
          <div className="card-body">
            {donutLabels.length > 0 ? (
              <>
                <div className="chart-container-donut">
                  <Doughnut data={donutChartData} options={donutChartOptions} />
                </div>
                <div className="category-bars-list">
                  {topCategories.map((c, i) => (
                    <div key={i} className="cat-bar-item">
                      <div className="cat-bar-left">
                        <span
                          className="cat-dot"
                          style={{ backgroundColor: donutPalette[i % donutPalette.length] }}
                        ></span>
                        <span>{c.category_name} ({c.transaction_count} tx)</span>
                      </div>
                      <span className="cat-bar-right">{formatINR(c.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted text-center" style={{ fontSize: '13px', padding: '30px' }}>
                No expense transactions recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RECENT TABLES ROW */}
      <div className="grid-2-col">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={16} /> Recent Transactions
            </h3>
            <button className="card-action-link" onClick={() => onNavigate('transactions')}>
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>User</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted" style={{ padding: '24px' }}>
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    recentTransactions?.map((t) => {
                      const isIncome = t.type === 'income';
                      return (
                        <tr key={t.id}>
                          <td>
                            <div className="user-cell">
                              <div
                                className={`stat-card-icon ${isIncome ? 'icon-income' : 'icon-expense'}`}
                                style={{ width: 32, height: 32, fontSize: 13 }}
                              >
                                {isIncome ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              </div>
                              <div>
                                <strong>{t.title || 'Untitled'}</strong>
                                <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>
                                  {formatDate(t.transaction_date, false)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{t.user_name || 'User'}</strong>
                              <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>
                                {t.user_email || ''}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-teal">{t.category_title || 'General'}</span>
                          </td>
                          <td>
                            <span
                              className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}
                              style={{ fontSize: '12.5px' }}
                            >
                              {isIncome ? '+' : '-'}{formatINR(t.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={16} /> Latest Registered Users
            </h3>
            <button className="card-action-link" onClick={() => onNavigate('users')}>
              <span>Manage Users</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers?.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted" style={{ padding: '24px' }}>
                        No registered users yet
                      </td>
                    </tr>
                  ) : (
                    recentUsers?.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-mini-avatar">
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="user-cell-info">
                              <strong>{u.name || 'Anonymous'}</strong>
                              <span>ID: #{u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className="badge badge-gray">{formatDate(u.created_at, false)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {system && (
            <div className="system-stats-bar">
              <div className="sys-item">
                <span className="sys-label">Node Runtime</span>
                <strong className="sys-val">{system.nodeVersion}</strong>
              </div>
              <div className="sys-item">
                <span className="sys-label">Server Uptime</span>
                <strong className="sys-val">
                  {Math.floor(system.uptimeSeconds / 3600)}h {Math.floor((system.uptimeSeconds % 3600) / 60)}m
                </strong>
              </div>
              <div className="sys-item">
                <span className="sys-label">Heap Memory</span>
                <strong className="sys-val">{system.heapUsedMB} MB</strong>
              </div>
              <div className="sys-item">
                <span className="sys-label">Database</span>
                <strong className="sys-val text-teal">TiDB Cloud OK</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="view-section">
      {/* Centered Circular Progress Indicator with Shimmer Effect */}
      <div className="centered-spinner-container" style={{ padding: '24px 0 28px' }}>
        <div className="circular-spinner" style={{ width: 50, height: 50, borderWidth: 4 }} />
      </div>

      {/* Top Banner Skeleton */}
      <div className="skeleton-card" style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="skeleton skeleton-title" style={{ width: 220, height: 20, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: 340, height: 14 }} />
          </div>
          <div className="skeleton skeleton-badge" style={{ width: 140, height: 28 }} />
        </div>
      </div>

      {/* 4 Lifetime Stat Cards */}
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, marginRight: 14 }} />
            <div className="stat-card-content" style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: '60%', height: 12 }} />
              <div className="skeleton skeleton-title" style={{ width: '85%', height: 24, margin: '6px 0' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%', height: 11 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Performance Section */}
      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <div className="skeleton skeleton-title" style={{ width: 280, height: 18 }} />
      </div>

      <div className="monthly-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="month-feature-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="skeleton skeleton-text" style={{ width: 120, height: 16 }} />
              <div className="skeleton skeleton-badge" style={{ width: 80, height: 18 }} />
            </div>
            <div className="skeleton skeleton-title" style={{ width: '70%', height: 28, margin: '14px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div className="skeleton skeleton-text" style={{ height: 36 }} />
              <div className="skeleton skeleton-text" style={{ height: 36 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid" style={{ marginTop: 24 }}>
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="skeleton skeleton-title" style={{ width: 200, height: 18 }} />
            <div className="skeleton skeleton-badge" style={{ width: 90, height: 22 }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: 240, borderRadius: 12 }} />
        </div>
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="skeleton skeleton-title" style={{ width: 180, height: 18 }} />
            <div className="skeleton skeleton-badge" style={{ width: 70, height: 22 }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: 240, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}
