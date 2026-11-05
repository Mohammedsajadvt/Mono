import React, { useState } from 'react';
import { 
  Wallet, 
  Lock, 
  UserCheck, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { API_BASE, setAdminToken, setAdminUser } from '../api';

export default function LoginView({ onLoginSuccess }) {
  // Mode: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [identifier, setIdentifier] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode) => {
    clearMessages();
    setMode(newMode);
  };

  // 1. LOGIN HANDLER
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        const adminName = data.admin?.username || identifier || 'admin';
        setAdminUser(adminName);
        onLoginSuccess(adminName);
      } else {
        setError(data.message || 'Invalid administrator credentials. Please check your username/email and password.');
      }
    } catch (err) {
      setError('Could not connect to Mono server. Please verify backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // 2. SIGNUP HANDLER
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (signupPassword !== signupConfirm) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername.trim(),
          email: signupEmail.trim().toLowerCase(),
          password: signupPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        const adminName = data.admin?.username || signupUsername;
        setAdminUser(adminName);
        onLoginSuccess(adminName);
      } else {
        setError(data.message || 'Failed to create administrator account.');
      }
    } catch (err) {
      setError('Could not connect to Mono server. Please verify backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // 3. FORGOT PASSWORD (STEP 1: Request OTP)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!resetEmail.trim()) {
      setError('Please enter your registered administrator email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || `A 6-digit confirmation code has been sent to ${resetEmail}.`);
        setMode('reset');
      } else {
        setError(data.message || 'No registered administrator account found with that email.');
      }
    } catch (err) {
      setError('Could not connect to Mono server. Please verify backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // 4. RESET PASSWORD (STEP 2: Verify OTP & set new password)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setError('Please enter the full 6-digit confirmation code sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          code: resetOtp.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Password reset successfully! Please sign in with your new password.');
        setIdentifier(resetEmail.trim());
        setLoginPassword('');
        setMode('login');
      } else {
        setError(data.message || 'Invalid or expired confirmation code.');
      }
    } catch (err) {
      setError('Could not connect to Mono server. Please verify backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        {/* BRAND LOGO */}
        <div className="login-brand">
          <div className="brand-badge">
            <Wallet size={26} color="#FFFFFF" />
          </div>
          <h2>mono <span>admin</span></h2>
          <p>Enterprise Console & Financial Operations</p>
        </div>

        {/* TOP TABS (LOGIN vs SIGNUP) */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-tab-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Create Account
            </button>
          </div>
        )}

        {/* FEEDBACK BANNERS */}
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {/* ================= MODE: LOGIN ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>
                <UserCheck size={14} /> Admin Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={14} /> Password
              </label>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-row-link">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setResetEmail(identifier.includes('@') ? identifier : '');
                  switchMode('forgot');
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Admin Console'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="login-switch-footer">
              <span>Need an administrator account? </span>
              <button
                type="button"
                className="text-link"
                style={{ fontWeight: 700 }}
                onClick={() => switchMode('signup')}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE: SIGNUP ================= */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label>
                <UserCheck size={14} /> Administrator Username
              </label>
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="e.g. admin_sajad"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <Mail size={14} /> Official Email Address
              </label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
              <small>Used for password recovery confirmation codes via email</small>
            </div>

            <div className="form-group">
              <label>
                <Lock size={14} /> Password (min 6 characters)
              </label>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create secure password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                <Lock size={14} /> Confirm Password
              </label>
              <div className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: 12 }}
            >
              <span>{loading ? 'Creating Account...' : 'Register Administrator'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="login-switch-footer">
              <span>Already registered? </span>
              <button
                type="button"
                className="text-link"
                style={{ fontWeight: 700 }}
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE: FORGOT PASSWORD (STEP 1) ================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <div style={{ marginBottom: 18 }}>
              <strong style={{ fontSize: 16, display: 'block', color: 'var(--text-primary)' }}>
                Reset Admin Password
              </strong>
              <span className="text-muted" style={{ fontSize: 12.5, display: 'block', marginTop: 4 }}>
                Enter your registered admin email. We will send a 6-digit confirmation code via email.
              </span>
            </div>

            <div className="form-group">
              <label>
                <Mail size={14} /> Registered Administrator Email
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your admin email"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="login-switch-footer" style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="text-link"
                onClick={() => switchMode('login')}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE: RESET PASSWORD (STEP 2: OTP + NEW PASSWORD) ================= */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit}>
            <div style={{ marginBottom: 18 }}>
              <strong style={{ fontSize: 16, display: 'block', color: 'var(--text-primary)' }}>
                Verify Code & Set New Password
              </strong>
              <span className="text-muted" style={{ fontSize: 12.5, display: 'block', marginTop: 4 }}>
                Enter the 6-digit verification code sent to <strong>{resetEmail}</strong>.
              </span>
            </div>

            <div className="form-group">
              <label>
                <KeyRound size={14} /> 6-Digit Verification Code
              </label>
              <input
                type="text"
                className="otp-input-field"
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={14} /> New Password (min 6 characters)
              </label>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                <Lock size={14} /> Confirm New Password
              </label>
              <div className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              <span>{loading ? 'Verifying & Resetting...' : 'Verify OTP & Reset Password'}</span>
              <CheckCircle2 size={16} />
            </button>

            <div
              className="login-switch-footer"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}
            >
              <button
                type="button"
                className="text-link"
                onClick={() => switchMode('login')}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <button
                type="button"
                className="text-link"
                disabled={loading}
                onClick={handleForgotSubmit}
              >
                <RefreshCw size={13} /> Resend Code
              </button>
            </div>
          </form>
        )}

        {/* SECURITY BADGE FOOTER */}
        <div className="login-footer">
          <ShieldCheck size={14} />
          <span>Secured with TiDB Cloud, Bcrypt & JWT Cryptography</span>
        </div>
      </div>
    </div>
  );
}
