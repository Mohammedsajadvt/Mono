const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { seedDefaultCategoriesForUser } = require('./categoryController');
const { sendOtpEmail } = require('../config/email');
const {
  validateEmail,
  validatePassword,
  validateName,
  validateOtp,
  validateString,
} = require('../utils/validators');

// Generate JWT Helper
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const nameVal = validateName(name);
    if (!nameVal.valid) {
      return res.status(400).json({
        success: false,
        message: nameVal.error,
      });
    }

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({
        success: false,
        message: emailVal.error,
      });
    }

    const passVal = validatePassword(password);
    if (!passVal.valid) {
      return res.status(400).json({
        success: false,
        message: passVal.error,
      });
    }

    const cleanName = nameVal.sanitized;
    const cleanEmail = emailVal.sanitized;
    const cleanPassword = passVal.sanitized;

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(cleanPassword, salt);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, passwordHash]
    );

    const newUser = {
      id: result.insertId,
      name: cleanName,
      email: cleanEmail,
      avatar_url: null,
    };

    // Automatically seed user-specific starter categories for this new user
    await seedDefaultCategoriesForUser(newUser.id);

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('[AuthController.register] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while registering account.',
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({
        success: false,
        message: emailVal.error,
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    const cleanEmail = emailVal.sanitized;
    const cleanPassword = password.trim();

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, avatar_url FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    };

    const token = generateToken(userData);

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: userData,
    });
  } catch (error) {
    console.error('[AuthController.login] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while logging in.',
    });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error('[AuthController.getMe] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, avatar_url } = req.body;

    let cleanName = null;
    if (name !== undefined && name !== null) {
      const nameVal = validateName(name);
      if (!nameVal.valid) {
        return res.status(400).json({
          success: false,
          message: nameVal.error,
        });
      }
      cleanName = nameVal.sanitized;
    }

    let cleanAvatar = null;
    if (avatar_url !== undefined && avatar_url !== null) {
      const avatarVal = validateString(avatar_url, 'Avatar URL', 500);
      if (!avatarVal.valid) {
        return res.status(400).json({
          success: false,
          message: avatarVal.error,
        });
      }
      cleanAvatar = avatarVal.sanitized;
    }

    await pool.execute(
      'UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
      [cleanName, cleanAvatar, req.user.id]
    );

    const [users] = await pool.execute(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: users[0],
    });
  } catch (error) {
    console.error('[AuthController.updateProfile] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile.',
    });
  }
};

// POST /api/auth/forgot-password (Step 1: Send 6-digit confirmation code)
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({
        success: false,
        message: emailVal.error,
      });
    }

    const cleanEmail = emailVal.sanitized;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email address.',
      });
    }

    // Generate secure 6-digit OTP confirmation code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate any previous codes for this email
    await pool.execute('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);

    // Save code to database with 15-minute expiration
    await pool.execute(
      'INSERT INTO password_resets (email, otp_code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [cleanEmail, otpCode]
    );

    // Send email with confirmation code
    await sendOtpEmail(cleanEmail, otpCode, users[0].name);

    // Never leak OTP code in API response
    return res.json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
    });
  } catch (error) {
    console.error('[AuthController.requestPasswordReset] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request.',
    });
  }
};

// POST /api/auth/reset-password (Step 2: Verify code and set new password)
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return res.status(400).json({
        success: false,
        message: emailVal.error,
      });
    }

    const otpVal = validateOtp(code);
    if (!otpVal.valid) {
      return res.status(400).json({
        success: false,
        message: otpVal.error,
      });
    }

    const passVal = validatePassword(newPassword, 'New password');
    if (!passVal.valid) {
      return res.status(400).json({
        success: false,
        message: passVal.error,
      });
    }

    const cleanEmail = emailVal.sanitized;
    const cleanCode = otpVal.sanitized;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this email address.',
      });
    }

    // Verify confirmation code from database
    const [resets] = await pool.execute(
      'SELECT id FROM password_resets WHERE email = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [cleanEmail, cleanCode]
    );

    if (resets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please check your email or request a new code.',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passVal.sanitized, salt);

    // Update user password in TiDB database
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, users[0].id]
    );

    // Delete used confirmation code
    await pool.execute('DELETE FROM password_resets WHERE email = ?', [cleanEmail]);

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[AuthController.resetPassword] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while resetting password.',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  requestPasswordReset,
  resetPassword,
};
