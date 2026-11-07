import React, { useState, useEffect } from 'react';
import { apiFetch, formatINR, formatDate } from '../api';
import { Edit2, Check, X, Mail, User, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function UserDetailsModal({ 
  userId, 
  initialMode = 'view', 
  onClose, 
  showToast, 
  onUserUpdated 
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/users/${userId}`);
      if (res.success) {
        setData(res);
        setEditName(res.user.name || '');
        setEditEmail(res.user.email || '');
        setEditPassword('');
      }
    } catch (err) {
      showToast(err.message, 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
      setIsEditing(initialMode === 'edit');
    }
  }, [userId, initialMode]);

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim()) {
      setEditError('User name cannot be empty.');
      return;
    }

    if (!editEmail.trim() || !editEmail.includes('@')) {
      setEditError('Please provide a valid email address.');
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setEditError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast(res.message || 'User account updated successfully!', 'success');
        setData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            ...res.user,
          },
        }));
        setEditPassword('');
        setIsEditing(false);
        if (onUserUpdated) onUserUpdated();
      } else {
        setEditError(res.message || 'Failed to update user credentials.');
      }
    } catch (err) {
      setEditError(err.message || 'Error updating user. Please check email uniqueness.');
    } finally {
      setSaving(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isEditing && (
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '4px 8px' }}
                onClick={() => { setIsEditing(false); setEditError(''); }}
                title="Back to details"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <h3>{isEditing ? 'Edit User Credentials & Profile' : 'User Profile Details'}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isEditing && data && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditName(data.user.name || '');
                  setEditEmail(data.user.email || '');
                  setEditPassword('');
                  setEditError('');
                  setIsEditing(true);
                }}
              >
                <Edit2 size={13} />
                <span>Edit Credentials</span>
              </button>
            )}
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="modal-body">
          {loading || !data ? (
            <div style={{ padding: '24px 16px' }}>
              <div className="centered-spinner-container" style={{ padding: '16px 0 24px' }}>
                <div className="circular-spinner" style={{ width: 42, height: 42, borderWidth: 4 }} />
              </div>
              <div className="skeleton" style={{ height: 24, width: '50%', margin: '0 auto 16px' }} />
              <div className="skeleton" style={{ height: 18, width: '70%', margin: '0 auto 16px' }} />
              <div className="skeleton" style={{ height: 80, width: '100%', borderRadius: 12 }} />
            </div>
          ) : isEditing ? (
            /* ================= EDIT MODE ================= */
            <form onSubmit={handleSaveCredentials} autoComplete="off">
              {editError && (
                <div className="login-error" style={{ marginBottom: 16 }}>
                  {editError}
                </div>
              )}

              <div className="user-summary-card" style={{ marginBottom: 18, background: '#F8FAFC' }}>
                <div className="user-big-avatar" style={{ background: '#2563EB' }}>
                  {(editName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>Editing Account #{data.user.id}</h4>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    Current email: <strong>{data.user.email}</strong>
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <User size={14} color="#438883" /> Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter user's full name"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <Mail size={14} color="#438883" /> Email Address (Changeable / Editable)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
                <small style={{ color: '#64748B', display: 'block', marginTop: 4, fontSize: 12 }}>
                  Fix wrong, mistyped, or changed email addresses. The user can log in with this updated email.
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <Lock size={14} color="#438883" /> Set New Password (Optional)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
                <small style={{ color: '#64748B', display: 'block', marginTop: 4, fontSize: 12 }}>
                  Only enter if the user forgot their password or is locked out (minimum 6 characters).
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => { setIsEditing(false); setEditError(''); }}
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Check size={14} />
                  <span>{saving ? 'Saving Changes...' : 'Save Updated Credentials'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= VIEW MODE ================= */
            <>
              <div className="user-summary-card">
                <div className="user-big-avatar">
                  {(data.user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h4 style={{ margin: 0 }}>{data.user.name || 'Anonymous User'}</h4>
                    <span 
                      style={{ 
                        fontSize: 11, 
                        fontWeight: 600, 
                        color: '#0284C7', 
                        background: '#E0F2FE', 
                        padding: '2px 8px', 
                        borderRadius: 6,
                        cursor: 'pointer' 
                      }}
                      onClick={() => setIsEditing(true)}
                      title="Edit this account"
                    >
                      Edit
                    </span>
                  </div>
                  <span className="text-muted" style={{ fontSize: 13, display: 'block', marginTop: 3 }}>
                    {data.user.email}
                  </span>
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
