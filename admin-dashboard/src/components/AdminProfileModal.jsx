import React, { useState, useEffect } from 'react';
import { apiFetch, setAdminUser } from '../api';
import { ShieldCheck, User, Mail, Lock, Check, X } from 'lucide-react';

export default function AdminProfileModal({ onClose, showToast, onAdminUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/profile');
        if (res.success && res.admin) {
          setUsername(res.admin.username || '');
          setEmail(res.admin.email || '');
          setRole(res.admin.role || 'admin');
        }
      } catch (err) {
        showToast(err.message, 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    if (password && password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        username: username.trim(),
        email: email.trim(),
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        showToast('Admin profile & credentials updated successfully!', 'success');
        setAdminUser(res.admin.username);
        if (onAdminUpdated) onAdminUpdated(res.admin.username);
        onClose();
      } else {
        setError(res.message || 'Failed to update admin credentials.');
      }
    } catch (err) {
      setError(err.message || 'Error updating administrator credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#E0F2F1', padding: 6, borderRadius: 8 }}>
              <ShieldCheck size={20} color="#00796B" />
            </div>
            <h3 style={{ margin: 0 }}>Administrator Credentials</h3>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '24px 16px' }}>
              <div className="centered-spinner-container" style={{ padding: '16px 0 24px' }}>
                <div className="circular-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
              </div>
              <div className="skeleton" style={{ width: '80%', height: 22, margin: '0 auto 12px' }} />
              <div className="skeleton" style={{ width: '60%', height: 16, margin: '0 auto' }} />
            </div>
          ) : (
            <form onSubmit={handleSave} autoComplete="off">
              {error && (
                <div className="login-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div className="user-summary-card" style={{ marginBottom: 16, background: '#F8FAFC' }}>
                <div className="user-big-avatar" style={{ background: '#0F766E' }}>
                  {(username || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{username || 'Administrator'}</h4>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    Role: <strong style={{ textTransform: 'capitalize' }}>{role}</strong>
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <User size={14} color="#0F766E" /> Administrator Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
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
                  <Mail size={14} color="#0F766E" /> Official Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
                <small style={{ color: '#64748B', display: 'block', marginTop: 4, fontSize: 12 }}>
                  Used for administrator OTP security and password recovery.
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  <Lock size={14} color="#0F766E" /> New Password (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                  }}
                />
              </div>

              {password.trim().length > 0 && (
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    <Lock size={14} color="#0F766E" /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={onClose}
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
                  <span>{saving ? 'Saving...' : 'Update Admin Credentials'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
