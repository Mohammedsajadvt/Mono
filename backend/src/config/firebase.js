/**
 * Firebase Identity Toolkit, Authentication & Cloud Messaging (FCM) Service
 * Uses HTTPS REST API on port 443 — 100% immune to SMTP port blocks on Render!
 */

const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || 'AIzaSyBJ61nF76ww_Q7hqzn3BR2hbz-JPqyvxQQ';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mono-f7e35';

/**
 * Sends an official password reset email via Firebase Identity Toolkit
 * @param {string} email - Destination email address
 * @returns {Promise<{success: boolean, email?: string, error?: string}>}
 */
async function sendFirebasePasswordReset(email) {
  try {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Ensure the user exists in Firebase Auth
    // If the user isn't in Firebase Auth yet, Firebase returns EMAIL_NOT_FOUND.
    // Registering them first ensures the password reset email can always be sent!
    try {
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: 'TmpPassword_' + Math.random().toString(36).slice(-8) + '!',
            returnSecureToken: false,
          }),
        }
      );
      // We safely ignore whether it created a new user or returned EMAIL_EXISTS
    } catch (e) {
      // Ignore network hiccup on registration
    }

    // 2. Request Firebase to send official password reset email
    const resetRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: cleanEmail,
        }),
      }
    );

    const data = await resetRes.json();
    if (resetRes.ok && data.email) {
      console.log(`[Firebase] Password reset email successfully dispatched to ${cleanEmail}`);
      return { success: true, email: data.email };
    } else {
      const errMsg = data?.error?.message || 'Firebase error';
      console.warn(`[Firebase] Reset email response (${resetRes.status}):`, errMsg);
      return { success: false, error: errMsg };
    }
  } catch (err) {
    console.error(`[Firebase] Network error calling Firebase Auth:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Broadcasts an app update notification via Firebase Cloud Messaging (FCM)
 * @param {object} release - { latestVersion, buildNumber, downloadUrl, releaseNotes, forceUpdate }
 * @returns {Promise<{success: boolean, broadcastedAt: string, version: string, details?: any, error?: string}>}
 */
async function broadcastFirebaseAppUpdate(release = {}) {
  try {
    const version = release.latestVersion || '1.0.3';
    const notes = release.releaseNotes || 'New features and improvements are now available!';
    const downloadUrl = release.downloadUrl || 'https://mono-nbt6.onrender.com/api/app/download';
    const isForce = release.forceUpdate === true;

    console.log(`[Firebase FCM] Broadcasting update v${version} to topic 'app_updates'...`);

    // Payload for FCM broadcast to topic 'app_updates'
    const payload = {
      to: '/topics/app_updates',
      notification: {
        title: `Mono App Update Ready! 🚀 (v${version})`,
        body: isForce
          ? `Mandatory update: v${version} is required to continue. Tap to install now!`
          : `New version v${version} is out. Tap to download and install!`,
        sound: 'default',
      },
      data: {
        type: 'app_update',
        version: String(version),
        buildNumber: String(release.buildNumber || 3),
        downloadUrl: String(downloadUrl),
        forceUpdate: String(isForce),
        releaseNotes: String(notes),
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
    };

    // Attempt FCM broadcast
    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FIREBASE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    let result = null;
    try {
      result = await fcmRes.json();
    } catch (_) {
      result = { status: fcmRes.status };
    }

    console.log(`[Firebase FCM] Broadcast response (${fcmRes.status}):`, result);

    return {
      success: true,
      broadcastedAt: new Date().toISOString(),
      version: version,
      details: result,
    };
  } catch (err) {
    console.warn(`[Firebase FCM] Broadcast warning:`, err.message);
    return {
      success: false,
      error: err.message,
      broadcastedAt: new Date().toISOString(),
      version: release.latestVersion || '1.0.3',
    };
  }
}

/**
 * Broadcasts generic push notification to all devices via FCM
 */
async function broadcastFirebaseNotification({ title, message, url, data = {} }) {
  try {
    const payload = {
      to: '/topics/all_users',
      notification: {
        title: title || 'Mono Financial Notification',
        body: message || '',
        sound: 'default',
      },
      data: {
        type: 'general_push',
        url: url || '',
        timestamp: new Date().toISOString(),
        ...data,
      },
      priority: 'high',
    };

    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FIREBASE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    let result = null;
    try {
      result = await fcmRes.json();
    } catch (_) {
      result = { status: fcmRes.status };
    }

    return {
      success: true,
      broadcastedAt: new Date().toISOString(),
      details: result,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID,
  sendFirebasePasswordReset,
  broadcastFirebaseAppUpdate,
  broadcastFirebaseNotification,
};
