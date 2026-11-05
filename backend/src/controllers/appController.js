// GET /api/app/version
const getAppVersion = async (req, res) => {
  try {
    return res.json({
      success: true,
      latestVersion: '1.0.1',
      buildNumber: 2,
      downloadUrl: 'https://betadrop.app/i/qQhg9L',
      guestUrl: 'https://betadrop.app/i/fCW2Qm',
      driveUrl: 'https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing',
      releaseNotes: '• 🔒 6-digit email confirmation code for secure password reset\n• 🛡️ Strict category ownership & multi-tenant security\n• ⚡ 10.6% smaller APK download size (optimized to 48.7MB)\n• 🚀 Enhanced transaction security and instant refresh',
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

