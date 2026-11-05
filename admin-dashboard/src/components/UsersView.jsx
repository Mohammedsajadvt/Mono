import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit2 } from 'lucide-react';
import { apiFetch, formatINR, formatDate } from '../api';
import UserDetailsModal from './UserDetailsModal';

export default function UsersView({ showToast }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [modalMode, setModalMode] = useState('view');

  const loadUsers = async (page = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/users?page=${page}&limit=12&search=${encodeURIComponent(searchQuery)}`);
      if (res.success) {
        setUsers(res.users);
        setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    loadUsers(1, val);
  };

  return (
    <div className="view-section">
      <div className="card">
        <div className="card-header filter-header">
          <div>
            <h3 className="card-title">User Account Directory</h3>
            <p className="card-subtitle">Manage registered accounts and audit their financial volumes</p>
          </div>
          <div className="filter-controls">
            <div className="search-box">
              <Search size={15} color="#8E9F9D" />
              <input
                type="text"
                placeholder="Search by name or email..."
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
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Transactions</th>
                  <th>Total Expense</th>
                  <th>Total Income</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted" style={{ padding: '30px' }}>
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted" style={{ padding: '30px' }}>
                      No user accounts found matching query.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>#{u.id}</strong></td>
                      <td>
                        <div className="user-cell">
                          <div className="user-mini-avatar">
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="user-cell-info">
                            <strong>{u.name || 'Anonymous'}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge badge-gray">{u.transaction_count} records</span>
                      </td>
                      <td className="text-expense font-weight-bold">{formatINR(u.total_expense)}</td>
                      <td className="text-income font-weight-bold">{formatINR(u.total_income)}</td>
                      <td>
                        <span className="badge badge-gray">{formatDate(u.created_at, false)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setModalMode('view');
                            }}
                            title="View account details and transactions"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setModalMode('edit');
                            }}
                            title="Edit credentials or fix wrong email"
                            style={{ color: '#2563EB', borderColor: '#BFDBFE', background: '#EFF6FF' }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer pagination-footer">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (users.length > 0 ? 1 : 0)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </span>
          <div className="pagination-buttons">
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadUsers(pagination.page - 1)}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="page-indicator">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadUsers(pagination.page + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          initialMode={modalMode}
          onClose={() => setSelectedUserId(null)}
          showToast={showToast}
          onUserUpdated={() => loadUsers(pagination.page)}
        />
      )}
    </div>
  );
}

