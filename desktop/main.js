// ZeroTTS desktop shell: serves the built browser demo (../js/dist) to a
// Chromium window. Everything that matters — download, cache, inference — is
// the web app's own code; this file only gives it an origin it can run on.

const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_NAME = 'TTS_TiengViet_v1';
const SCHEME = 'app';
const HOST = 'zerotts';

// file:// will not do: the bundle requests /assets/… and /ggml/… by absolute
// path, and onnxruntime-web / the ggml build need SharedArrayBuffer, which
// needs a secure origin served with COOP/COEP. A privileged custom scheme is
// both. `standard` also gives it a real origin, so the Cache API holding the
// ~800 MB of weights persists across launches.
protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: {
    standard: true, secure: true, supportFetchAPI: true,
    corsEnabled: true, stream: true, codeCache: true,
  },
}]);

const webRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, '..', 'js', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function serve(request) {
  const { pathname } = new URL(request.url);
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.normalize(path.join(webRoot, rel));
  if (file !== webRoot && !file.startsWith(webRoot + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }
  const res = await net.fetch(pathToFileURL(file).toString());
  if (!res.ok) return new Response('Not found', { status: 404 });
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 720,
    minHeight: 600,
    title: APP_NAME,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Generation runs for minutes; do not let Chromium slow the worker down
      // when the window is behind another one.
      backgroundThrottling: false,
    },
  });

  // Keep the app's name in the title bar instead of the web page's <title>.
  win.on('page-title-updated', (event) => event.preventDefault());

  // Links (Hugging Face, the voice platform, …) open in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`) && !url.startsWith(process.env.ZEROTTS_URL || '\0')) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  // ZEROTTS_URL=http://localhost:5173 points the shell at the Vite dev server.
  win.loadURL(process.env.ZEROTTS_URL || `${SCHEME}://${HOST}/index.html`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 Hưng Jr',
    authors: ['Hưng Jr'],
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, serve);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
