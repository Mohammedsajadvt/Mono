import React, { useState, useEffect } from 'react';
import { Rocket, Satellite, Save, RotateCcw, Send, Bell, Trash2, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../api';

const getTomorrowPreset = (hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const toDatetimeLocalValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return String(dateStr);
  }
};

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
  });
  const [deliveryMode, setDeliveryMode] = useState('now'); // 'now' | 'tomorrow_morning' | 'tomorrow_evening' | 'custom'
  const [customSchedule, setCustomSchedule] = useState(() => toDatetimeLocalValue(getTomorrowPreset(9, 0)));
  const [sendingPush, setSendingPush] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  // Notification History List state
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Helpers for scheduling presets
  const tomorrowDate = getTomorrowPreset(9, 0);
  const tomorrowDayName = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });

  const getScheduledDate = () => {
    if (deliveryMode === 'now') return null;
    if (deliveryMode === 'tomorrow_morning') return getTomorrowPreset(9, 0);
    if (deliveryMode === 'tomorrow_evening') return getTomorrowPreset(18, 0);
    if (deliveryMode === 'custom' && customSchedule) {
      const parsed = new Date(customSchedule);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

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
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await apiFetch('/notifications');
      if (res.success && Array.isArray(res.notifications)) {
        setNotificationsList(res.notifications);
      }
    } catch (err) {
      console.warn('Failed to load notifications list:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Delete this notification from history and user devices?')) return;
    try {
      const res = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      if (res.success) {
        setNotificationsList(prev => prev.filter(n => n.id !== id));
        showToast('Notification deleted successfully.', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    loadConfig();
    loadNotifications();
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

    const scheduledDate = getScheduledDate();
    if (deliveryMode !== 'now' && (!scheduledDate || scheduledDate.getTime() <= Date.now())) {
      showToast('Scheduled delivery time must be set in the future.', 'error');
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
          scheduledAt: scheduledDate ? scheduledDate.toISOString() : undefined,
        }),
      });

      if (res.success) {
        setPushResult({
          success: true,
          recipients: res.recipients,
          id: res.id,
          scheduled: res.scheduled,
          scheduledAt: res.scheduledAt,
        });
        showToast(
          res.message || (scheduledDate ? 'Push notification scheduled successfully!' : 'Push notification dispatched to all app users!'),
          'success'
        );
        loadNotifications();
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
      {/* CARD 1: Push Notification Broadcaster & Scheduler */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Bell size={18} color="var(--primary-color)" /> Send Push Notification to All Users
            </h3>
            <p className="card-subtitle">
              Broadcast instant push alerts or schedule future notifications for every user on the Mono app
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-teal">
              OneSignal Active
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

            {/* Delivery Timing Scheduler */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                <Clock size={15} color="var(--primary)" /> Delivery Timing &amp; Schedule
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('now')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${deliveryMode === 'now' ? '#2563EB' : '#E2E8F0'}`,
                    background: deliveryMode === 'now' ? '#EFF6FF' : '#FFFFFF',
                    color: deliveryMode === 'now' ? '#1D4ED8' : '#475569',
                    fontWeight: deliveryMode === 'now' ? 600 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>⚡ Send Immediately (Now)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('tomorrow_morning')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${deliveryMode === 'tomorrow_morning' ? '#D97706' : '#E2E8F0'}`,
                    background: deliveryMode === 'tomorrow_morning' ? '#FEF3C7' : '#FFFFFF',
                    color: deliveryMode === 'tomorrow_morning' ? '#92400E' : '#475569',
                    fontWeight: deliveryMode === 'tomorrow_morning' ? 600 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🌅 Tomorrow {tomorrowDayName} (9:00 AM)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('tomorrow_evening')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${deliveryMode === 'tomorrow_evening' ? '#D97706' : '#E2E8F0'}`,
                    background: deliveryMode === 'tomorrow_evening' ? '#FEF3C7' : '#FFFFFF',
                    color: deliveryMode === 'tomorrow_evening' ? '#92400E' : '#475569',
                    fontWeight: deliveryMode === 'tomorrow_evening' ? 600 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🌆 Tomorrow {tomorrowDayName} (6:00 PM)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('custom')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${deliveryMode === 'custom' ? '#2563EB' : '#E2E8F0'}`,
                    background: deliveryMode === 'custom' ? '#EFF6FF' : '#FFFFFF',
                    color: deliveryMode === 'custom' ? '#1D4ED8' : '#475569',
                    fontWeight: deliveryMode === 'custom' ? 600 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Calendar size={14} />
                  <span>Custom Date &amp; Time</span>
                </button>
              </div>

              {deliveryMode === 'custom' && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Select Custom Date &amp; Time for Notification Delivery:
                  </label>
                  <input
                    type="datetime-local"
                    min={toDatetimeLocalValue(new Date())}
                    value={customSchedule}
                    onChange={(e) => setCustomSchedule(e.target.value)}
                    style={{ maxWidth: 300 }}
                    required={deliveryMode === 'custom'}
                  />
                  <small style={{ display: 'block', marginTop: 4 }}>
                    OneSignal will automatically broadcast the notification to users at this scheduled date and time.
                  </small>
                </div>
              )}

              {deliveryMode !== 'now' && getScheduledDate() && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontSize: 12.5,
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Clock size={16} color="#D97706" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Scheduled Delivery:</strong> Push notification will automatically be delivered on{' '}
                    <strong>{formatDateTime(getScheduledDate())}</strong>.
                  </div>
                </div>
              )}
            </div>

            {pushResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  marginTop: 16,
                  marginBottom: 16,
                  backgroundColor: pushResult.success ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${pushResult.success ? '#A7F3D0' : '#FECACA'}`,
                  color: pushResult.success ? '#065F46' : '#991B1B',
                  fontSize: 13,
                }}
              >
                {pushResult.success ? (
                  <div>
                    <strong>✓ {pushResult.scheduled ? 'Push Broadcast Scheduled!' : 'Push Broadcast Successful!'}</strong>{' '}
                    {pushResult.id ? <span>Notification ID: <code>{pushResult.id}</code></span> : null}
                    {pushResult.scheduledAt && (
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        ⏰ Will be delivered on: <strong>{formatDateTime(pushResult.scheduledAt)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <strong>✗ Push Send Failed:</strong> {pushResult.error}
                  </div>
                )}
              </div>
            )}

            <div className="form-actions" style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendingPush}
                style={{
                  backgroundColor: deliveryMode === 'now' ? '#2563EB' : '#D97706',
                  borderColor: deliveryMode === 'now' ? '#2563EB' : '#D97706',
                }}
              >
                {deliveryMode === 'now' ? <Send size={16} /> : <Clock size={16} />}
                <span>
                  {sendingPush
                    ? 'Processing Push...'
                    : deliveryMode === 'now'
                    ? '🚀 Send Push to All Users (OneSignal)'
                    : `⏰ Schedule Push for ${tomorrowDayName}`}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CARD 2: Pushed Notifications History & Feed */}
      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                <Bell size={18} /> Pushed Notification History &amp; App Device Feed
              </h3>
              <span className="badge badge-gray">
                {notificationsList.length} total
              </span>
            </div>
            <p className="card-subtitle" style={{ marginTop: 4 }}>
              All broadcasts delivered or scheduled for users' devices and displayed in the in-app Notification Center
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadNotifications}
            disabled={loadingNotifications}
          >
            <RotateCcw size={13} /> Refresh List
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loadingNotifications ? (
            <div style={{ padding: 32 }}>
              <div className="centered-spinner-container">
                <div className="circular-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
              </div>
            </div>
          ) : notificationsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ opacity: 0.35, marginBottom: 10 }} />
              <p>No push notifications recorded yet. Send your first broadcast above!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 85 }}>#ID</th>
                    <th>Notification Details</th>
                    <th style={{ width: 220 }}>Delivery / Schedule Time</th>
                    <th style={{ width: 140 }}>Status</th>
                    <th style={{ width: 95, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationsList.map((item) => {
                    const isItemScheduled = item.status === 'scheduled' || (item.scheduled_at && new Date(item.scheduled_at) > new Date());
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="badge badge-id">#{item.id}</span>
                        </td>
                        <td>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontSize: 13.5, fontWeight: 700 }}>
                              {item.title}
                            </div>
                            <div style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, maxWidth: 520 }}>
                              {item.message}
                            </div>
                          </div>
                        </td>
                        <td>
                          {isItemScheduled && item.scheduled_at ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#D97706', fontWeight: 600, fontSize: 12.5 }}>
                                <Clock size={13} />
                                <span>{formatDateTime(item.scheduled_at)}</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                Scheduled
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 500 }}>
                                <CheckCircle2 size={13} color="#059669" />
                                <span>{formatDateTime(item.created_at)}</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                Dispatched immediately
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          {isItemScheduled ? (
                            <span className="badge badge-scheduled">
                              <Clock size={11} /> Scheduled
                            </span>
                          ) : (
                            <span className="badge badge-sent">
                              <CheckCircle2 size={11} /> Sent / Active
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            style={{
                              padding: '5px 9px',
                              color: '#DC2626',
                              borderColor: '#FECACA',
                              background: '#FEF2F2',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={() => handleDeleteNotification(item.id)}
                            title="Delete notification from history & device feed"
                          >
                            <Trash2 size={13} />
                            <span style={{ fontSize: 11 }}>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: App Version & Release Configuration */}
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
