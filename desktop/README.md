# TTS_TiengViet_v1 — desktop app (Hưng Jr)

The browser demo in [`../js/`](../js/) packaged as an installable app for
macOS and Windows with [Electron](https://www.electronjs.org/). The app adds
nothing to the model code: it gives the web bundle a secure origin and serves it
with COOP/COEP so multi-threaded WASM works, the same as `vite.config.ts` does
for the dev server.

For the user: install, open, press **Cài mô hình**. The weights (~820 MB by
default, or 124 MB / 206 MB for the quantized builds under *Tuỳ chọn nâng cao*)
download once from Hugging Face and stay in the app's storage. On later launches
the app loads the cached model by itself. After that it works offline.

## Build

Needs Node 20+ and the ggml WASM pair in `js/public/ggml/`
(`cpp/build-wasm.sh`, which needs emsdk).

```bash
cd desktop
npm install
npm start          # build js/ and run the app
npm run dist:mac   # → release/TTS_TiengViet_v1-<ver>-mac-{arm64,x64}.dmg
npm run dist:win   # → release/TTS_TiengViet_v1-<ver>-win-x64.exe
npm run dist       # both (Windows can be built from macOS)
```

`ZEROTTS_URL=http://localhost:5173 npx electron .` points the app at a running
`npm run dev` in `js/`.

CI: [`.github/workflows/desktop.yml`](../.github/workflows/desktop.yml) builds
the WASM and both installers. Run it by hand, or push a `desktop-v*` tag to
attach them to a release.

## Unsigned builds

Without a signing certificate the installers are not signed with a developer
identity. The macOS app gets an ad-hoc signature (`build/adhoc-sign.js`) so it
runs on Apple Silicon, but it is not notarized:

- **macOS**: the first time, right-click TTS_TiengViet_v1.app → *Open* → *Open*. Or run
  `xattr -cr /Applications/TTS_TiengViet_v1.app`.
- **Windows**: SmartScreen shows "Windows protected your PC". Click *More info* →
  *Run anyway*.

To sign with a real certificate, remove `"identity": null` from `build.mac` in
`package.json` and set `CSC_LINK` / `CSC_KEY_PASSWORD` (and the notarization
variables for macOS) before you run electron-builder. The ad-hoc hook skips
itself when `CSC_LINK` is set. See the
[electron-builder code signing docs](https://www.electron.build/code-signing).

## Where the model is stored

The model is kept in the Cache API storage of the `app://zerotts` origin, under
the app's user-data folder:

- macOS: `~/Library/Application Support/TTS_TiengViet_v1/`
- Windows: `%APPDATA%\TTS_TiengViet_v1\`

The **Xoá bộ nhớ đệm mô hình** button in *Tuỳ chọn nâng cao* frees that space.
