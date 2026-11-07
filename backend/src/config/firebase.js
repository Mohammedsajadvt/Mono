/**
 * Firebase Identity Toolkit & Authentication Service
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

module.exports = {
  FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID,
  sendFirebasePasswordReset,
};
