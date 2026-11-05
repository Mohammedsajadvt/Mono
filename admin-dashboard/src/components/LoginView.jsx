import React, { useState } from 'react';
import { Wallet, Lock, UserCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_BASE, setAdminToken, setAdminUser } from '../api';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('Administrator');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        setAdminUser(username || 'Administrator');
        onLoginSuccess(username);
      } else {
        setError(data.message || 'Invalid administrator password.');
      }
    } catch (err) {
      setError('Could not reach backend server. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-badge">
            <Wallet size={26} color="#FFFFFF" />
          </div>
          <h2>mono <span>react admin</span></h2>
          <p>Enterprise Console & Financial Operations</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <UserCheck size={14} /> Admin Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={14} /> Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password (default: admin demo)"
              required
              autoFocus
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : 'Authenticate & Access'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="login-footer">
          <ShieldCheck size={14} />
          <span>Secured with TiDB Cloud & JWT Cryptography</span>
        </div>
      </div>
    </div>
  );
}

