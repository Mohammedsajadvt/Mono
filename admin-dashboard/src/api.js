// API Client for Mono Admin React Dashboard

const API_BASE = '/api/admin';

export function getAdminToken() {
  return localStorage.getItem('mono_admin_token') || '';
}

export function setAdminToken(token) {
  if (token) localStorage.setItem('mono_admin_token', token);
  else localStorage.removeItem('mono_admin_token');
}

export function getAdminUser() {
  return localStorage.getItem('mono_admin_user') || 'Administrator';
}

export function setAdminUser(name) {
  if (name) localStorage.setItem('mono_admin_user', name);
  else localStorage.removeItem('mono_admin_user');
}

export async function apiFetch(endpoint, options = {}) {
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    setAdminToken('');
    window.dispatchEvent(new Event('mono_admin_logout'));
    throw new Error('Admin session expired. Please sign in again.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

// Currency Formatter - INR ₹
export function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
}

// Date Formatter
export function formatDate(dateStr, withTime = false) {
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
