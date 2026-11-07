/**
 * OneSignal REST API Push Notification Service
 * Broadcasts push notifications to all users on the Mono mobile app
 */

const path = require('path');
const fs = require('fs');

const DEFAULT_ONESIGNAL_APP_ID = '16a3ff7b-91c2-4b03-9c56-409c5fee91b6';

let pushKeys = {};
try {
  const keysPath = path.join(__dirname, 'push_keys.json');
  if (fs.existsSync(keysPath)) {
    pushKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  }
} catch (_) {}

/**
 * Sends a push notification via OneSignal REST API v1
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body
 * @param {string} [options.url] - Optional target URL to open on click
 * @param {string|Date} [options.sendAfter] - Optional ISO-8601 string or date for scheduled delivery
 * @param {Object} [options.data] - Custom metadata payload
 * @param {string} [options.appId] - OneSignal App ID
 * @param {string} [options.apiKey] - OneSignal REST API Key
 * @returns {Promise<{success: boolean, id?: string, recipients?: number, message?: string, error?: any}>}
 */
async function sendOneSignalPush({
  title,
  message,
  url,
  sendAfter,
  data = {},
  appId,
  apiKey,
}) {
  const activeAppId = appId || process.env.ONESIGNAL_APP_ID || pushKeys.onesignalAppId || DEFAULT_ONESIGNAL_APP_ID;
  const activeApiKey = apiKey || process.env.ONESIGNAL_REST_API_KEY || pushKeys.onesignalRestApiKey || '';

  if (!title || !message) {
    return {
      success: false,
      message: 'Title and message are required for sending push notifications.',
    };
  }

  const payload = {
    app_id: activeAppId,
    included_segments: ['Total Subscriptions', 'All'],
    headings: { en: title },
    contents: { en: message },
    data: {
      timestamp: new Date().toISOString(),
      ...data,
    },
  };

  // Only attach action URL if explicitly provided and non-empty
  if (url && typeof url === 'string' && url.trim().length > 0) {
    payload.url = url.trim();
  }

  // Support future scheduled delivery through OneSignal's send_after parameter
  if (sendAfter) {
    try {
      const scheduledTime = new Date(sendAfter);
      if (!isNaN(scheduledTime.getTime()) && scheduledTime.getTime() > Date.now()) {
        payload.send_after = scheduledTime.toISOString();
        console.log(`[OneSignal] Push scheduled for delivery at: ${payload.send_after}`);
      }
    } catch (e) {
      console.warn('[OneSignal] Invalid sendAfter date provided:', sendAfter, e.message);
    }
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (activeApiKey) {
    // OneSignal accepts 'Basic <REST_API_KEY>' or 'Key <REST_API_KEY>'
    headers.Authorization = activeApiKey.startsWith('Basic ') || activeApiKey.startsWith('Key ')
      ? activeApiKey
      : `Basic ${activeApiKey.trim()}`;
  }

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const resData = await res.json();

    if (res.ok && resData.id) {
      console.log(`[OneSignal] Push dispatched successfully! ID: ${resData.id}, Recipients: ${resData.recipients || 0}`);
      const isScheduled = !!payload.send_after;
      return {
        success: true,
        id: resData.id,
        recipients: resData.recipients || 0,
        scheduled: isScheduled,
        sendAfter: payload.send_after || null,
        message: isScheduled
          ? `Push notification successfully scheduled for ${new Date(payload.send_after).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}!`
          : `Push notification dispatched to ${resData.recipients || 'all'} registered devices!`,
      };
    } else {
      console.warn('[OneSignal] Response status', res.status, resData);
      const errDetail = resData?.errors?.[0] || resData?.errors || 'OneSignal API error';
      return {
        success: false,
        error: errDetail,
        message: typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail),
      };
    }
  } catch (err) {
    console.error('[OneSignal] Network/fetch error:', err);
    return {
      success: false,
      error: err.message,
      message: 'Network error connecting to OneSignal: ' + err.message,
    };
  }
}

module.exports = {
  DEFAULT_ONESIGNAL_APP_ID,
  sendOneSignalPush,
};
