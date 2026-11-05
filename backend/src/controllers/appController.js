// GET /api/app/version
const getAppVersion = async (req, res) => {
  try {
    return res.json({
      success: true,
      latestVersion: '1.0.2',
      buildNumber: 3,
      downloadUrl: 'https://betadrop.app/i/fCW2Qm',
      guestUrl: 'https://betadrop.app/i/fCW2Qm',
      accountUrl: 'https://betadrop.app/i/qQhg9L',
      driveUrl: 'https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing',
      releaseNotes: '• 📅 Compact custom date range dialog with quick presets\n• ✏️ Full transaction & category editing with live sync\n• 🔒 6-digit email verification code for password reset\n• ✨ Shimmer loading skeleton UI across all screens\n• ⚡ Faster pagination & responsive gestures',
      forceUpdate: false,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve version info.',
    });
  }
};

module.exports = { getAppVersion };

