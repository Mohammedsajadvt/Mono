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
  Wallet
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
    return (
      <div className="view-section">
        <p className="text-muted" style={{ padding: '40px', textAlign: 'center' }}>
          Loading dashboard metrics...
        </p>
      </div>
    );
  }

  const { stats, recentTransactions, recentUsers, topCategories, monthlyTrend, system } = data;

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
      {/* 4 STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon icon-users">
            <Users size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Users</span>
            <h3 className="stat-value">{stats.totalUsers.toLocaleString()}</h3>
            <span className="stat-sub positive">
              <UserPlus size={12} /> +{stats.todayNewUsers} today
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-tx">
            <Receipt size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Transactions</span>
            <h3 className="stat-value">{stats.totalTransactions.toLocaleString()}</h3>
            <span className="stat-sub positive">
              <Zap size={12} /> +{stats.todayTransactions} today
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-income">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-label">Total Income Volume</span>
            <h3 className="stat-value text-income">{formatINR(stats.totalIncome)}</h3>
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
            <h3 className="stat-value text-expense">{formatINR(stats.totalExpense)}</h3>
            <span className="stat-sub neutral">
              <Wallet size={12} /> Recorded Debits
            </span>
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

