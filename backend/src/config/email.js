const nodemailer = require('nodemailer');

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
  const transporter = createTransporter();
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
        Mono Expense Tracker • Powered by TiDB Cloud
      </p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Mono Finance" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Your Mono Password Reset Code: ${otpCode}`,
        html: htmlContent,
      });
      console.log(`[Email] OTP email successfully sent to ${toEmail}`);
      return { sent: true };
    } catch (err) {
      console.error(`[Email] Failed to send email via SMTP:`, err);
      return { sent: false, error: err.message };
    }
  } else {
    console.log(`[Email Mock/Dev] No SMTP configured in env. OTP for ${toEmail} is: ${otpCode}`);
    return { sent: false, mock: true, code: otpCode };
  }
}

module.exports = { sendOtpEmail };
