const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../config/app_release.json');

const defaultRelease = {
  latestVersion: '1.0.2',
  buildNumber: 3,
  downloadUrl: 'https://betadrop.app/i/fCW2Qm',
  guestUrl: 'https://betadrop.app/i/fCW2Qm',
  accountUrl: 'https://betadrop.app/i/qQhg9L',
  driveUrl: 'https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing',
  releaseNotes: '• 📅 Compact custom date range dialog with quick presets\n• ✏️ Full transaction & category editing with live sync\n• 🔒 6-digit email verification code for password reset\n• ✨ Shimmer loading skeleton UI across all screens\n• ⚡ Faster pagination & responsive gestures',
  forceUpdate: false,
};

let cachedRelease = null;

const loadReleaseConfig = () => {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      cachedRelease = JSON.parse(data);
      return cachedRelease;
    }
  } catch (err) {
    console.error('[appController] Error reading app_release.json:', err.message);
  }
  cachedRelease = { ...defaultRelease };
  return cachedRelease;
};

const saveReleaseConfig = (newConfig) => {
  try {
    cachedRelease = {
      ...defaultRelease,
      ...cachedRelease,
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(configPath, JSON.stringify(cachedRelease, null, 2), 'utf8');
    return cachedRelease;
  } catch (err) {
    console.error('[appController] Error saving app_release.json:', err.message);
    cachedRelease = { ...cachedRelease, ...newConfig };
    return cachedRelease;
  }
};

// GET /api/app/version
const getAppVersion = async (req, res) => {
  try {
    const config = cachedRelease || loadReleaseConfig();
    return res.json({
      success: true,
      ...config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve version info.',
    });
  }
};

module.exports = {
  getAppVersion,
  loadReleaseConfig,
  saveReleaseConfig,
};
