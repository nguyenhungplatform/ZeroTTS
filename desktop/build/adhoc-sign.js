// Ad-hoc sign the macOS app after packaging. electron-builder rewrites the
// bundle (Info.plist, app.asar) but leaves Electron's original signature, which
// no longer matches; Apple Silicon refuses to launch it ("ZeroTTS is damaged").
// An ad-hoc signature is valid without a certificate. The app is still
// unnotarized, so the first launch needs right-click → Open.
// Skipped when a real identity is configured (CSC_LINK / CSC_NAME).
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.CSC_LINK || process.env.CSC_NAME) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
