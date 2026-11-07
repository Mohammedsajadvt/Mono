const nodemailer = require('nodemailer');
const { sendFirebasePasswordReset } = require('./firebase');

function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Gmail service shortcut if provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return null;
}

async function sendOtpEmail(toEmail, otpCode, userName = 'Mono User') {
  let emailDispatched = false;
  let deliveryMethod = 'none';

  // 1. Primary: Firebase Authentication Password Reset Email via HTTPS (port 443)
  // 100% immune to Render cloud firewall / SMTP port blocking!
  try {
    const fbRes = await sendFirebasePasswordReset(toEmail);
    if (fbRes.success) {
      emailDispatched = true;
      deliveryMethod = 'firebase';
      console.log(`[Email] Password reset dispatched via Firebase Auth to ${toEmail}`);
    }
  } catch (fbErr) {
    console.warn('[Email] Firebase Auth dispatch error:', fbErr.message);
  }

  // 2. Secondary: Nodemailer SMTP if configured
  const transporter = createTransporter();
  if (transporter) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #438883; margin: 0; font-size: 28px; letter-spacing: -1px;">mono</h1>
          <p style="color: #666; font-size: 14px; margin-top: 4px;">Smart Personal Finance & Expense Tracker</p>
        </div>
        <h2 style="color: #222; font-size: 18px; margin-bottom: 12px;">Password Reset Verification</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.5;">
          Hi ${userName},<br/>
          We received a request to reset your Mono account password. Enter the 6-digit confirmation code below in the app to continue:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #438883; border-radius: 12px; padding: 16px 32px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #438883;">
            ${otpCode}
          </div>
        </div>
        <p style="color: #777; font-size: 12px; line-height: 1.5;">
          ⏰ This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 11px; text-align: center;">
          Mono Expense Tracker • Powered by TiDB Cloud & Firebase
        </p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Mono Finance" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Your Mono Password Reset Code: ${otpCode}`,
        html: htmlContent,
      });
      emailDispatched = true;
      deliveryMethod = deliveryMethod === 'firebase' ? 'firebase+smtp' : 'smtp';
      console.log(`[Email] OTP email successfully sent via SMTP to ${toEmail}`);
    } catch (err) {
      console.warn(`[Email] SMTP delivery failed:`, err.message);
    }
  }

  // Always log OTP in server logs for testing and debugging
  console.log(`[Email Audit] Target: ${toEmail} | OTP Code: ${otpCode} | Dispatched: ${emailDispatched} (${deliveryMethod})`);

  return {
    sent: emailDispatched,
    method: deliveryMethod,
    code: otpCode,
  };
}

module.exports = { sendOtpEmail };
