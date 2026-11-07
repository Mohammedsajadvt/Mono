import React, { useState, useEffect } from 'react';
import { Rocket, Satellite, Save, RotateCcw, Send, Bell } from 'lucide-react';
import { apiFetch } from '../api';

export default function AppReleaseView({ showToast }) {
  const [formData, setFormData] = useState({
    latestVersion: '1.0.2',
    buildNumber: 3,
    downloadUrl: 'https://betadrop.app/i/fCW2Qm',
    accountUrl: 'https://betadrop.app/i/qQhg9L',
    driveUrl: '',
    releaseNotes: '',
    forceUpdate: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/app-config');
      if (res.success && res.config) {
        setFormData({
          latestVersion: res.config.latestVersion || '1.0.2',
          buildNumber: res.config.buildNumber || 3,
          downloadUrl: res.config.downloadUrl || 'https://betadrop.app/i/fCW2Qm',
          accountUrl: res.config.accountUrl || 'https://betadrop.app/i/qQhg9L',
          driveUrl: res.config.driveUrl || '',
          releaseNotes: res.config.releaseNotes || '',
          forceUpdate: res.config.forceUpdate === true,
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/app-config', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          buildNumber: parseInt(formData.buildNumber, 10) || 1,
        }),
      });

      if (res.success) {
        showToast(
          'App release configuration updated! Devices checking for updates will now receive this build immediately.',
          'success'
        );
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastPush = async () => {
    setBroadcasting(true);
    try {
      const res = await apiFetch('/broadcast-push-update', { method: 'POST' });
      if (res.success) {
        showToast(
          `Firebase push notification broadcasted to all devices! (v${formData.latestVersion})`,
          'success'
        );
      } else {
        showToast(res.message || 'Failed to broadcast push notification.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="view-section">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Rocket size={18} /> App Version & Push Update Manager
            </h3>
            <p className="card-subtitle">
              Configure latest APK releases pushed to devices when users tap 'Check Now'
            </p>
          </div>
          <span className="badge badge-teal">
            <Satellite size={12} /> Instant Push Active
          </span>
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-muted text-center" style={{ padding: 30 }}>Loading configuration...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group col-6">
                  <label>Latest Semantic Version</label>
                  <input
                    type="text"
                    name="latestVersion"
                    value={formData.latestVersion}
                    onChange={handleChange}
                    placeholder="e.g. 1.0.2"
                    required
                  />
                  <small>Used by the app update checker to compare versions (x.y.z).</small>
                </div>

                <div className="form-group col-6">
                  <label>Android Build Number</label>
                  <input
                    type="number"
                    name="buildNumber"
                    value={formData.buildNumber}
                    onChange={handleChange}
                    placeholder="e.g. 3"
                    required
                  />
                  <small>Increment to prompt update on client devices.</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-6">
                  <label>Direct Download Link (BetaDrop / Direct APK)</label>
                  <input
                    type="url"
                    name="downloadUrl"
                    value={formData.downloadUrl}
                    onChange={handleChange}
                    placeholder="https://betadrop.app/i/fCW2Qm"
                    required
                  />
                  <small>Tapping 'Update Now' in the app immediately opens this link.</small>
                </div>

                <div className="form-group col-6">
                  <label>BetaDrop Account URL</label>
                  <input
                    type="url"
                    name="accountUrl"
                    value={formData.accountUrl}
                    onChange={handleChange}
                    placeholder="https://betadrop.app/i/qQhg9L"
                  />
                  <small>Optional login portal link for testers.</small>
                </div>
              </div>

              <div className="form-group">
                <label>Google Drive Mirror URL</label>
                <input
                  type="url"
                  name="driveUrl"
                  value={formData.driveUrl}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
                <small>Alternative download link for backup.</small>
              </div>

              <div className="form-group">
                <label>Release Notes / What's New</label>
                <textarea
                  name="releaseNotes"
                  rows="5"
                  value={formData.releaseNotes}
                  onChange={handleChange}
                  placeholder="Bullet points of changes and features..."
                ></textarea>
                <small>Displayed inside the app's 'Update Available' popup dialog.</small>
              </div>

              <div className="form-group switch-group">
                <label className="switch-container">
                  <input
                    type="checkbox"
                    name="forceUpdate"
                    checked={formData.forceUpdate}
                    onChange={handleChange}
                  />
                  <span className="switch-slider"></span>
                </label>
                <div className="switch-label">
                  <strong>Force Mandatory Update</strong>
                  <span>If enabled, users cannot dismiss or skip the update popup until installed.</span>
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={saving || broadcasting}>
                  <Save size={16} />
                  <span>{saving ? 'Saving & Broadcasting...' : 'Save & Broadcast Update'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#EA580C', borderColor: '#EA580C' }}
                  onClick={handleBroadcastPush}
                  disabled={saving || broadcasting}
                  title="Push notification to all devices via Firebase Cloud Messaging"
                >
                  <Send size={16} />
                  <span>{broadcasting ? 'Broadcasting via Firebase...' : 'Push Update via Firebase'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadConfig}
                  disabled={saving || broadcasting}
                >
                  <RotateCcw size={16} />
                  <span>Reset Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

