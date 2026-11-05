// Mono Admin Console Application Logic
const API_BASE = '/api/admin';
let currentTab = 'overview';
let adminToken = localStorage.getItem('mono_admin_token') || '';
let trendChartInstance = null;
let categoryChartInstance = null;

// Pagination states
let usersCurrentPage = 1;
let usersSearchQuery = '';
let txCurrentPage = 1;
let txSearchQuery = '';
let txType = '';

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const appWrapper = document.getElementById('appWrapper');
const loginError = document.getElementById('loginError');
const toastEl = document.getElementById('toast');

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initClockAndGreeting();
  setInterval(initClockAndGreeting, 1000);

  if (adminToken) {
    showApp();
    loadOverview();
  } else {
    showLogin();
  }
});

// Realtime Clock & Dynamic Greeting
function initClockAndGreeting() {
  const now = new Date();
  const hours = now.getHours();
  let greeting = 'Good evening';
  if (hours >= 5 && hours < 12) greeting = 'Good morning';
  else if (hours >= 12 && hours < 17) greeting = 'Good afternoon';

  const clockEl = document.getElementById('liveClock');
  const greetingEl = document.getElementById('liveGreeting');
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  if (greetingEl) {
    const adminUser = localStorage.getItem('mono_admin_user') || 'Administrator';
    greetingEl.textContent = `${greeting}, ${adminUser}`;
  }
}

// Format Currency to Indian Rupee (INR ₹)
function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
}

// Format Date
function formatDate(dateStr, withTime = true) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return d.toLocaleDateString('en-IN', options);
}

// Show Toast
function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `toast-notification ${type}`;
  toastEl.style.display = 'flex';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 4000);
}

// Auth API Helper
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

// ================= AUTHENTICATION =================
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim() || 'Administrator';
  const password = document.getElementById('loginPassword').value.trim();
  const submitBtn = document.getElementById('loginSubmitBtn');

  loginError.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      adminToken = data.token;
      localStorage.setItem('mono_admin_token', adminToken);
      localStorage.setItem('mono_admin_user', username);
      showToast('Welcome to Mono Admin Console!', 'success');
      showApp();
      loadOverview();
    } else {
      loginError.textContent = data.message || 'Invalid administrator password.';
      loginError.style.display = 'block';
    }
  } catch (err) {
    loginError.textContent = 'Failed to connect to backend server. Ensure server is running.';
    loginError.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Authenticate & Access</span> <i class="fa-solid fa-arrow-right"></i>';
  }
}

function handleLogout() {
  adminToken = '';
  localStorage.removeItem('mono_admin_token');
  localStorage.removeItem('mono_admin_user');
  showLogin();
  showToast('Logged out of Admin Console.', 'neutral');
}

function showLogin() {
  loginOverlay.style.display = 'flex';
  appWrapper.style.display = 'none';
}

function showApp() {
  loginOverlay.style.display = 'none';
  appWrapper.style.display = 'flex';
  const user = localStorage.getItem('mono_admin_user') || 'Administrator';
  document.getElementById('topbarAdminName').textContent = user;
}

// ================= NAVIGATION =================
function switchTab(tab) {
  currentTab = tab;

  // Update nav item active states
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('href') === `#${tab}`);
  });

  // Update sections active states
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.toggle('active', el.id === `view-${tab}`);
  });

  // Topbar titles
  const titles = {
    overview: 'Dashboard Overview',
    users: 'User Account Management',
    transactions: 'Global Transactions Ledger',
    categories: 'Categories & Allocations',
    releases: 'App Updates & Release Center',
  };
  document.getElementById('topbarTitle').textContent = titles[tab] || 'Admin Console';

  // Load section data
  if (tab === 'overview') loadOverview();
  else if (tab === 'users') loadUsers(1);
  else if (tab === 'transactions') loadTransactions(1);
  else if (tab === 'categories') loadCategories();
  else if (tab === 'releases') loadReleaseConfigIntoForm();
}

function refreshCurrentView() {
  switchTab(currentTab);
  showToast('Dashboard refreshed with latest data.', 'success');
}

// ================= OVERVIEW =================
async function loadOverview() {
  try {
    const data = await apiFetch('/overview');
    if (!data.success) return;

    const { stats, recentTransactions, recentUsers, topCategories, monthlyTrend, system } = data;

    // 1. Stat cards
    document.getElementById('statTotalUsers').textContent = stats.totalUsers.toLocaleString();
    document.getElementById('statTodayUsers').innerHTML = `<i class="fa-solid fa-user-plus"></i> +${stats.todayNewUsers} today`;

    document.getElementById('statTotalTx').textContent = stats.totalTransactions.toLocaleString();
    document.getElementById('statTodayTx').innerHTML = `<i class="fa-solid fa-bolt"></i> +${stats.todayTransactions} today`;

    document.getElementById('statTotalIncome').textContent = formatINR(stats.totalIncome);
    document.getElementById('statTotalExpense').textContent = formatINR(stats.totalExpense);

    // 2. Charts
    renderMonthlyChart(monthlyTrend);
    renderCategoryChart(topCategories);

    // 3. Recent Transactions
    const txTbody = document.querySelector('#recentTxTable tbody');
    if (recentTransactions.length === 0) {
      txTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 24px;">No transactions recorded yet</td></tr>';
    } else {
      txTbody.innerHTML = recentTransactions.map(t => {
        const isIncome = t.type === 'income';
        const badgeClass = isIncome ? 'badge-income' : 'badge-expense';
        const sign = isIncome ? '+' : '-';
        return `
          <tr>
            <td>
              <div class="user-cell">
                <div class="stat-card-icon ${isIncome ? 'icon-income' : 'icon-expense'}" style="width: 32px; height: 32px; font-size: 13px;">
                  <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                </div>
                <div>
                  <strong>${t.title || 'Untitled'}</strong>
                  <span class="text-muted" style="font-size: 11px; display: block;">${formatDate(t.transaction_date, false)}</span>
                </div>
              </div>
            </td>
            <td>
              <div>
                <strong>${t.user_name || 'User'}</strong>
                <span class="text-muted" style="font-size: 11px; display: block;">${t.user_email || ''}</span>
              </div>
            </td>
            <td>
              <span class="badge badge-teal">${t.category_title || 'General'}</span>
            </td>
            <td>
              <span class="badge ${badgeClass}" style="font-size: 12.5px;">${sign}${formatINR(t.amount)}</span>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 4. Recent Users
    const usersTbody = document.querySelector('#recentUsersTable tbody');
    if (recentUsers.length === 0) {
      usersTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 24px;">No registered users yet</td></tr>';
    } else {
      usersTbody.innerHTML = recentUsers.map(u => `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-mini-avatar">${(u.name || 'U').charAt(0).toUpperCase()}</div>
              <div class="user-cell-info">
                <strong>${u.name || 'Anonymous'}</strong>
                <span>ID: #${u.id}</span>
              </div>
            </div>
          </td>
          <td>${u.email}</td>
          <td><span class="badge badge-gray">${formatDate(u.created_at, false)}</span></td>
        </tr>
      `).join('');
    }

    // 5. System stats
    if (system) {
      document.getElementById('sysNodeVersion').textContent = system.nodeVersion;
      const hours = Math.floor(system.uptimeSeconds / 3600);
      const mins = Math.floor((system.uptimeSeconds % 3600) / 60);
      document.getElementById('sysUptime').textContent = `${hours}h ${mins}m`;
      document.getElementById('sysMemory').textContent = `${system.heapUsedMB} MB`;
    }

  } catch (err) {
    showToast('Failed to load dashboard overview data.', 'error');
  }
}

// Chart.js: Monthly Trend
function renderMonthlyChart(trendData = []) {
  const ctx = document.getElementById('monthlyTrendChart');
  if (!ctx) return;

  const labels = trendData.length > 0 ? trendData.map(d => d.month_label) : ['No Data'];
  const incomeData = trendData.length > 0 ? trendData.map(d => Number(d.income) || 0) : [0];
  const expenseData = trendData.length > 0 ? trendData.map(d => Number(d.expense) || 0) : [0];

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  trendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income (₹)',
          data: incomeData,
          backgroundColor: '#25A969',
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: 'Expense (₹)',
          data: expenseData,
          backgroundColor: '#F95B51',
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
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
            callback: (val) => '₹' + (val >= 1000 ? (val / 1000) + 'k' : val),
            font: { family: 'Inter' },
          },
          grid: { color: '#F0F4F4' },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', weight: 600 } },
        },
      },
    },
  });
}

// Chart.js: Top Spending Categories Donut
function renderCategoryChart(categories = []) {
  const ctx = document.getElementById('categoriesChart');
  const listEl = document.getElementById('topCategoriesList');
  if (!ctx || !listEl) return;

  const palette = ['#438883', '#69AEA9', '#F59E0B', '#3B82F6', '#8B5CF6'];

  if (categories.length === 0) {
    listEl.innerHTML = '<p class="text-muted text-center" style="font-size: 12px;">No expense categories recorded yet.</p>';
    if (categoryChartInstance) categoryChartInstance.destroy();
    return;
  }

  const labels = categories.map(c => c.category_name);
  const dataValues = categories.map(c => Number(c.total_amount) || 0);

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dataValues,
        backgroundColor: palette.slice(0, categories.length),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }],
    },
    options: {
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
    },
  });

  listEl.innerHTML = categories.map((c, i) => `
    <div class="cat-bar-item">
      <div class="cat-bar-left">
        <span class="cat-dot" style="background-color: ${palette[i % palette.length]}"></span>
        <span>${c.category_name} (${c.transaction_count} tx)</span>
      </div>
      <span class="cat-bar-right">${formatINR(c.total_amount)}</span>
    </div>
  `).join('');
}

// ================= USERS MANAGEMENT =================
let usersDebounceTimer = null;
function debounceUsersSearch() {
  clearTimeout(usersDebounceTimer);
  usersDebounceTimer = setTimeout(() => {
    usersSearchQuery = document.getElementById('usersSearchInput').value.trim();
    loadUsers(1);
  }, 350);
}

async function loadUsers(page = 1) {
  usersCurrentPage = page;
  try {
    const data = await apiFetch(`/users?page=${page}&limit=12&search=${encodeURIComponent(usersSearchQuery)}`);
    if (!data.success) return;

    const { users, pagination } = data;
    const tbody = document.querySelector('#usersTable tbody');

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding: 30px;">No users found matching query</td></tr>';
    } else {
      tbody.innerHTML = users.map(u => `
        <tr>
          <td><strong>#${u.id}</strong></td>
          <td>
            <div class="user-cell">
              <div class="user-mini-avatar">${(u.name || 'U').charAt(0).toUpperCase()}</div>
              <div class="user-cell-info">
                <strong>${u.name || 'Anonymous'}</strong>
              </div>
            </div>
          </td>
          <td>${u.email}</td>
          <td><span class="badge badge-gray">${u.transaction_count} records</span></td>
          <td class="text-expense font-weight-bold">${formatINR(u.total_expense)}</td>
          <td class="text-income font-weight-bold">${formatINR(u.total_income)}</td>
          <td><span class="badge badge-gray">${formatDate(u.created_at, false)}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="viewUserDetails(${u.id})">
              <i class="fa-solid fa-eye"></i> Details
            </button>
          </td>
        </tr>
      `).join('');
    }

    // Pagination
    document.getElementById('usersPaginationInfo').textContent =
      `Showing ${(pagination.page - 1) * pagination.limit + (users.length > 0 ? 1 : 0)} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} users`;
    document.getElementById('usersPageIndicator').textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    document.getElementById('usersPrevBtn').disabled = pagination.page <= 1;
    document.getElementById('usersNextBtn').disabled = pagination.page >= pagination.totalPages;

  } catch (err) {
    showToast('Failed to load users directory.', 'error');
  }
}

function changeUsersPage(delta) {
  loadUsers(usersCurrentPage + delta);
}

// User Details Modal
async function viewUserDetails(userId) {
  try {
    const data = await apiFetch(`/users/${userId}`);
    if (!data.success) return;

    const { user, transactions } = data;
    document.getElementById('modalUserFullName').textContent = user.name || 'Anonymous';
    document.getElementById('modalUserEmail').textContent = user.email;
    document.getElementById('modalUserJoined').textContent = `Joined: ${formatDate(user.created_at, false)}`;
    document.getElementById('modalUserId').textContent = `Account ID: #${user.id}`;
    document.getElementById('modalUserAvatar').textContent = (user.name || 'U').charAt(0).toUpperCase();

    const tbody = document.querySelector('#modalUserTxTable tbody');
    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">No transactions found for this user</td></tr>';
    } else {
      tbody.innerHTML = transactions.map(t => {
        const isIncome = t.type === 'income';
        return `
          <tr>
            <td><strong>${t.title || 'Untitled'}</strong></td>
            <td><span class="badge badge-teal">${t.category_title || 'General'}</span></td>
            <td><span class="badge badge-gray">${t.payment_mode || 'Cash'}</span></td>
            <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${isIncome ? '+' : '-'}${formatINR(t.amount)}</span></td>
            <td>${formatDate(t.transaction_date, false)}</td>
          </tr>
        `;
      }).join('');
    }

    document.getElementById('userModal').style.display = 'flex';
  } catch (err) {
    showToast('Could not load user profile details.', 'error');
  }
}

function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
}

// ================= TRANSACTIONS LEDGER =================
let txDebounceTimer = null;
function debounceTxSearch() {
  clearTimeout(txDebounceTimer);
  txDebounceTimer = setTimeout(() => {
    txSearchQuery = document.getElementById('txSearchInput').value.trim();
    loadTransactions(1);
  }, 350);
}

async function loadTransactions(page = 1) {
  txCurrentPage = page;
  txType = document.getElementById('txTypeFilter').value;

  try {
    const data = await apiFetch(`/transactions?page=${page}&limit=15&type=${txType}&search=${encodeURIComponent(txSearchQuery)}`);
    if (!data.success) return;

    const { transactions, pagination } = data;
    const tbody = document.querySelector('#transactionsTable tbody');

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding: 30px;">No transactions matching filters</td></tr>';
    } else {
      tbody.innerHTML = transactions.map(t => {
        const isIncome = t.type === 'income';
        return `
          <tr>
            <td><strong>#${t.id}</strong></td>
            <td>
              <div>
                <strong>${t.title || 'Untitled'}</strong>
                ${t.notes ? `<span class="text-muted" style="font-size: 11px; display: block;">${t.notes}</span>` : ''}
              </div>
            </td>
            <td>
              <div>
                <strong>${t.user_name || 'User'}</strong>
                <span class="text-muted" style="font-size: 11px; display: block;">${t.user_email || ''}</span>
              </div>
            </td>
            <td><span class="badge badge-teal">${t.category_title || 'General'}</span></td>
            <td><span class="badge badge-gray">${t.payment_mode || 'Cash'}</span></td>
            <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${t.type.toUpperCase()}</span></td>
            <td><strong class="${isIncome ? 'text-income' : 'text-expense'}">${isIncome ? '+' : '-'}${formatINR(t.amount)}</strong></td>
            <td>${formatDate(t.transaction_date, true)}</td>
          </tr>
        `;
      }).join('');
    }

    // Pagination
    document.getElementById('txPaginationInfo').textContent =
      `Showing ${(pagination.page - 1) * pagination.limit + (transactions.length > 0 ? 1 : 0)} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} records`;
    document.getElementById('txPageIndicator').textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    document.getElementById('txPrevBtn').disabled = pagination.page <= 1;
    document.getElementById('txNextBtn').disabled = pagination.page >= pagination.totalPages;

  } catch (err) {
    showToast('Failed to load transactions log.', 'error');
  }
}

function changeTxPage(delta) {
  loadTransactions(txCurrentPage + delta);
}

// ================= CATEGORIES =================
async function loadCategories() {
  try {
    const data = await apiFetch('/categories');
    if (!data.success) return;

    const grid = document.getElementById('categoriesGrid');
    if (data.categories.length === 0) {
      grid.innerHTML = '<p class="text-muted">No categories created yet.</p>';
      return;
    }

    grid.innerHTML = data.categories.map(c => `
      <div class="category-card">
        <div class="category-badge-icon" style="background-color: ${c.color || '#438883'}">
          <i class="fa-solid fa-shapes"></i>
        </div>
        <div class="category-card-content">
          <strong>${c.title}</strong>
          <span>${c.usage_count || 0} transactions (${formatINR(c.total_volume || 0)})</span>
          <span class="badge ${c.type === 'income' ? 'badge-income' : 'badge-expense'}" style="margin-top: 4px;">
            ${(c.type || 'expense').toUpperCase()}
          </span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    showToast('Failed to load categories analytics.', 'error');
  }
}

// ================= APP UPDATES & RELEASES =================
async function loadReleaseConfigIntoForm() {
  try {
    const data = await apiFetch('/app-config');
    if (!data.success) return;

    const cfg = data.config;
    document.getElementById('cfgVersion').value = cfg.latestVersion || '1.0.2';
    document.getElementById('cfgBuild').value = cfg.buildNumber || 3;
    document.getElementById('cfgDownloadUrl').value = cfg.downloadUrl || 'https://betadrop.app/i/fCW2Qm';
    document.getElementById('cfgAccountUrl').value = cfg.accountUrl || 'https://betadrop.app/i/qQhg9L';
    document.getElementById('cfgDriveUrl').value = cfg.driveUrl || '';
    document.getElementById('cfgReleaseNotes').value = cfg.releaseNotes || '';
    document.getElementById('cfgForceUpdate').checked = cfg.forceUpdate === true;

  } catch (err) {
    showToast('Failed to load current release configuration.', 'error');
  }
}

async function handleSaveReleaseConfig(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveReleaseBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving & Broadcasting...';

  const payload = {
    latestVersion: document.getElementById('cfgVersion').value.trim(),
    buildNumber: parseInt(document.getElementById('cfgBuild').value.trim()) || 1,
    downloadUrl: document.getElementById('cfgDownloadUrl').value.trim(),
    accountUrl: document.getElementById('cfgAccountUrl').value.trim(),
    driveUrl: document.getElementById('cfgDriveUrl').value.trim(),
    releaseNotes: document.getElementById('cfgReleaseNotes').value.trim(),
    forceUpdate: document.getElementById('cfgForceUpdate').checked,
  };

  try {
    const data = await apiFetch('/app-config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data.success) {
      showToast('App release settings updated! All devices checking for updates will now receive this build immediately.', 'success');
    } else {
      showToast(data.message || 'Failed to update release settings.', 'error');
    }
  } catch (err) {
    showToast('Failed to broadcast app release.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save & Broadcast Update</span>';
  }
}
