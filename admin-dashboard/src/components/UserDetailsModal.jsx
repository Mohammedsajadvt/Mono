import React, { useState, useEffect } from 'react';
import { apiFetch, formatINR, formatDate } from '../api';

export default function UserDetailsModal({ userId, onClose, showToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/users/${userId}`);
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        showToast(err.message, 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>User Profile Details</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading || !data ? (
            <p className="text-muted text-center" style={{ padding: '40px' }}>Loading user details...</p>
          ) : (
            <>
              <div className="user-summary-card">
                <div className="user-big-avatar">
                  {(data.user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4>{data.user.name || 'Anonymous User'}</h4>
                  <span className="text-muted" style={{ fontSize: 13 }}>{data.user.email}</span>
                  <div className="user-badge-row">
                    <span className="badge badge-teal">Joined: {formatDate(data.user.created_at, false)}</span>
                    <span className="badge badge-gray">ID: #{data.user.id}</span>
                  </div>
                </div>
              </div>

              <h4 className="section-heading">Recent Transactions</h4>
              <div className="table-responsive modal-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Payment Mode</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted" style={{ padding: 20 }}>
                          No transactions found for this user.
                        </td>
                      </tr>
                    ) : (
                      data.transactions.map((t) => {
                        const isIncome = t.type === 'income';
                        return (
                          <tr key={t.id}>
                            <td><strong>{t.title || 'Untitled'}</strong></td>
                            <td><span className="badge badge-teal">{t.category_title || 'General'}</span></td>
                            <td><span className="badge badge-gray">{t.payment_mode || 'Cash'}</span></td>
                            <td>
                              <span className={`badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
                                {isIncome ? '+' : '-'}{formatINR(t.amount)}
                              </span>
                            </td>
                            <td>{formatDate(t.transaction_date, false)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
