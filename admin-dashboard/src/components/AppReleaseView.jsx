import React, { useState, useEffect } from 'react';
import { Rocket, Satellite, Save, RotateCcw, Send, Bell } from 'lucide-react';
import { apiFetch } from '../api';

export default function AppReleaseView({ showToast }) {
  const [formData, setFormData] = useState({
    latestVersion: '1.0.3',
    buildNumber: 4,
    downloadUrl: 'https://mono-nbt6.onrender.com/api/app/download',
    firebaseStorageUrl: 'https://firebasestorage.googleapis.com/v0/b/mono-f7e35.firebasestorage.app/o/releases%2FMono_Release_v1.0.3.apk?alt=media',
    releaseNotes: '',
    forceUpdate: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Push Notification state
  const [pushData, setPushData] = useState({
    title: 'Mono Update Ready 🚀',
    message: 'A new version of Mono is live! Tap to download and install the latest update.',
    url: 'https://mono-nbt6.onrender.com/api/app/download',
  });
  const [sendingPush, setSendingPush] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/app-config');
      if (res.success && res.config) {
        const download = res.config.downloadUrl || 'https://mono-nbt6.onrender.com/api/app/download';
        setFormData({
          latestVersion: res.config.latestVersion || '1.0.3',
          buildNumber: res.config.buildNumber || 4,
          downloadUrl: download,
          firebaseStorageUrl: res.config.firebaseStorageUrl || 'https://firebasestorage.googleapis.com/v0/b/mono-f7e35.firebasestorage.app/o/releases%2FMono_Release_v1.0.3.apk?alt=media',
          releaseNotes: res.config.releaseNotes || '',
          forceUpdate: res.config.forceUpdate === true,
        });

        setPushData(prev => ({
          ...prev,
          url: prev.url || download,
        }));
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

  const handlePushChange = (e) => {
    const { name, value } = e.target;
    setPushData((prev) => ({
      ...prev,
      [name]: value,
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
          `Push update notification broadcasted to all devices via OneSignal & Firebase! (v${formData.latestVersion})`,
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

  const handleSendCustomPush = async (e) => {
    e.preventDefault();
    if (!pushData.title.trim() || !pushData.message.trim()) {
      showToast('Please enter both title and message for the push notification.', 'error');
      return;
    }

    setSendingPush(true);
    setPushResult(null);
    try {
      const res = await apiFetch('/send-push-notification', {
        method: 'POST',
        body: JSON.stringify({
          title: pushData.title,
          message: pushData.message,
          url: pushData.url || undefined,
        }),
      });

      if (res.success) {
        setPushResult({
          success: true,
          recipients: res.recipients,
          id: res.id,
        });
        showToast(res.message || 'Push notification sent to all app users successfully!', 'success');
      } else {
        setPushResult({
          success: false,
          error: res.message || 'OneSignal send failure',
        });
        showToast(res.message || 'Failed to dispatch push notification.', 'error');
      }
    } catch (err) {
      setPushResult({
        success: false,
        error: err.message,
      });
      showToast(err.message, 'error');
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <div className="view-section" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* CARD 1: Push Notification Broadcaster */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Bell size={18} color="var(--primary-color)" /> Send Push Notification to All Users
            </h3>
            <p className="card-subtitle">
              Broadcast instant push alerts to every user who has installed the Mono mobile app
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-teal">
              OneSignal App: 16a3ff7b...
            </span>
          </div>
        </div>

        <div className="card-body">
          <form onSubmit={handleSendCustomPush}>
            <div className="form-group">
              <label>Notification Title</label>
              <input
                type="text"
                name="title"
                value={pushData.title}
                onChange={handlePushChange}
                placeholder="e.g. 📢 Important Update / Monthly Savings Reminder"
                required
              />
            </div>

            <div className="form-group">
              <label>Message Content</label>
              <textarea
                name="message"
                rows="3"
                value={pushData.message}
                onChange={handlePushChange}
                placeholder="Enter notification message seen on users' notification bar..."
                required
              ></textarea>
            </div>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Action URL (Optional)</label>
              <input
                type="url"
                name="url"
                value={pushData.url}
                onChange={handlePushChange}
                placeholder="https://mono-nbt6.onrender.com/api/app/download"
              />
              <small>Optional link or website opened when the user taps the push notification.</small>
            </div>

            {pushResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  marginBottom: 16,
                  backgroundColor: pushResult.success ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${pushResult.success ? '#A7F3D0' : '#FECACA'}`,
                  color: pushResult.success ? '#065F46' : '#991B1B',
                  fontSize: 13,
                }}
              >
                {pushResult.success ? (
                  <div>
                    <strong>✓ Push Broadcast Successful!</strong> Notification ID: <code>{pushResult.id}</code> (Delivered to active subscriptions)
                  </div>
                ) : (
                  <div>
                    <strong>✗ Push Send Failed:</strong> {pushResult.error}
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      Tip: Push keys are configured on the backend. You can check delivery logs in the OneSignal dashboard.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-actions" style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingPush}
                style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
              >
                <Send size={16} />
                <span>{sendingPush ? 'Broadcasting Push...' : '🚀 Send Push to All Users (OneSignal)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CARD 2: App Version & Release Configuration */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Rocket size={18} /> App Version &amp; Release Manager
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
            <div style={{ padding: '24px 20px' }}>
              <div className="centered-spinner-container" style={{ padding: '16px 0 24px' }}>
                <div className="circular-spinner" style={{ width: 44, height: 44, borderWidth: 4 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
              </div>
            </div>
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
                  <label>Direct APK Download Link (Firebase / Server)</label>
                  <input
                    type="url"
                    name="downloadUrl"
                    value={formData.downloadUrl}
                    onChange={handleChange}
                    placeholder="https://mono-nbt6.onrender.com/api/app/download"
                    required
                  />
                  <small>Direct APK download link without third-party login walls.</small>
                </div>

                <div className="form-group col-6">
                  <label>Firebase Storage / App Distribution URL</label>
                  <input
                    type="url"
                    name="firebaseStorageUrl"
                    value={formData.firebaseStorageUrl || ''}
                    onChange={handleChange}
                    placeholder="https://firebasestorage.googleapis.com/..."
                  />
                  <small>Official Firebase Storage or App Distribution APK link.</small>
                </div>
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
                  title="Push notification to all devices via OneSignal and Firebase"
                >
                  <Send size={16} />
                  <span>{broadcasting ? 'Broadcasting Push...' : 'Broadcast Release to All Devices'}</span>
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

