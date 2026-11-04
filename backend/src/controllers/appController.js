// GET /api/app/version
const getAppVersion = async (req, res) => {
  try {
    return res.json({
      success: true,
      latestVersion: '1.0.0',
      buildNumber: 1,
      downloadUrl: 'https://betadrop.app/i/qQhg9L',
      guestUrl: 'https://betadrop.app/i/fCW2Qm',
      driveUrl: 'https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing',
      releaseNotes: '• Multi-tenant user data isolation\n• Live database hard deletion for categories & transactions\n• Auto-refresh & pull-to-refresh on all screens\n• Financial statement CSV export & clipboard copy\n• In-app push update support',
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
