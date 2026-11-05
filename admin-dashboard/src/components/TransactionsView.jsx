import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch, formatINR, formatDate } from '../api';

export default function TransactionsView({ showToast }) {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTransactions = async (page = 1, searchQuery = search, typeFilter = type) => {
    try {
      setLoading(true);
      const res = await apiFetch(
        `/transactions?page=${page}&limit=15&type=${typeFilter}&search=${encodeURIComponent(searchQuery)}`
      );
      if (res.success) {
        setTransactions(res.transactions);
        setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    loadTransactions(1, val, type);
  };

  const handleTypeChange = (e) => {
    const val = e.target.value;
    setType(val);
    loadTransactions(1, search, val);
  };

  return (
    <div className="view-section">
      <div className="card">
        <div className="card-header filter-header">
          <div>
            <h3 className="card-title">Live Transactions Ledger</h3>
            <p className="card-subtitle">Global real-time audit log across all user accounts</p>
          </div>
          <div className="filter-controls">
            <select className="select-input" value={type} onChange={handleTypeChange}>
              <option value="">All Types (Income & Expense)</option>
              <option value="expense">Expense Only</option>
              <option value="income">Income Only</option>
            </select>
            <div className="search-box">
              <Search size={15} color="#8E9F9D" />
              <input
                type="text"
                placeholder="Search title, user, notes..."
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title & Note</th>
                  <th>User</th>
                  <th>Category</th>
                  <th>Payment Mode</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted" style={{ padding: '30px' }}>
                      Loading ledger transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted" style={{ padding: '30px' }}>
                      No transactions found matching filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isIncome = t.type === 'income';
                    return (
                      <tr key={t.id}>
                        <td><strong>#{t.id}</strong></td>
                        <td>
                          <div>
                            <strong>{t.title || 'Untitled'}</strong>
                            {t.notes && (
                              <span className="text-muted" style={{ fontSize: 11, display: 'block' }}>
                                {t.notes}
                              </span>
                            )}
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
                          <span className="badge badge-gray">{t.payment_mode || 'Cash'}</span>
                        </td>
                        <td>
                          <span className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <strong className={isIncome ? 'text-income' : 'text-expense'}>
                            {isIncome ? '+' : '-'}{formatINR(t.amount)}
                          </strong>
                        </td>
                        <td>{formatDate(t.transaction_date, true)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer pagination-footer">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (transactions.length > 0 ? 1 : 0)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
          </span>
          <div className="pagination-buttons">
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadTransactions(pagination.page - 1)}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="page-indicator">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadTransactions(pagination.page + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
