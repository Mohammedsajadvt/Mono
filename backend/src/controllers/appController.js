const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../config/app_release.json');

const defaultRelease = {
  latestVersion: '1.0.3',
  buildNumber: 4,
  downloadUrl: 'https://mono-nbt6.onrender.com/api/app/download',
  firebaseStorageUrl: 'https://firebasestorage.googleapis.com/v0/b/mono-f7e35.firebasestorage.app/o/releases%2FMono_Release_v1.0.3.apk?alt=media',
  driveUrl: 'https://drive.google.com/drive/folders/1OgtLqLPd-3Pdtc4se1oWBNiL8xeCub8H?usp=sharing',
  releaseNotes: '• 🔔 Instant OneSignal Push Notifications\n• 👤 Responsive Profile with popup view & centered sync badge\n• 📅 Monthly Statistics Navigation with next/previous movement\n• ✨ Shimmer Skeleton Loading Effect across dashboard\n• 💰 Formatted Total Balance with Indian currency styling\n• 🚀 Direct Firebase & High-Speed APK Updates (Zero BetaDrop)',
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

// GET /api/app/download
const downloadApk = async (req, res) => {
  try {
    const config = cachedRelease || loadReleaseConfig();
    const apkPath = path.resolve(__dirname, '../../public/downloads/mono-latest.apk');

    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Mono_v${config.latestVersion || '1.0.3'}.apk"`
      );
      return res.sendFile(apkPath);
    }

    // Fallback: If not stored locally, redirect to Firebase Storage or Google Drive
    const redirectUrl =
      config.firebaseStorageUrl || config.driveUrl || config.downloadUrl;
    if (redirectUrl) {
      return res.redirect(redirectUrl);
    }

    return res.status(404).json({
      success: false,
      message: 'Release APK not found. Please download via Firebase or Google Drive.',
    });
  } catch (error) {
    console.error('[downloadApk] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process APK download request.',
    });
  }
};

module.exports = {
  getAppVersion,
  downloadApk,
  loadReleaseConfig,
  saveReleaseConfig,
};
