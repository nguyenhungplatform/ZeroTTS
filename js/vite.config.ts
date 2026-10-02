import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, Plugin } from 'vite';

/** Copy public/ into the bundle, minus public/ggml/models. That is a symlink
 *  to cpp/models for bench-ggml.html under the dev server; Vite's own copy
 *  would follow it and put every converted GGUF (hundreds of MB each) into
 *  dist/ — or fail outright when the link dangles. */
function copyPublicWithoutModels(): Plugin {
  let outDir = 'dist';
  return {
    name: 'copy-public-without-models',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() {
      const from = resolve(__dirname, 'public');
      if (!existsSync(from)) return;
      const skip = resolve(from, 'ggml', 'models');
      cpSync(from, resolve(__dirname, outDir), {
        recursive: true,
        filter: (src) => resolve(src) !== skip,
      });
    },
  };
}

export default defineConfig({
  // onnxruntime-web ships .wasm/.mjs assets that must not be inlined or renamed.
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  build: { target: 'es2022', assetsInlineLimit: 0, copyPublicDir: false },
  plugins: [copyPublicWithoutModels()],
  // src/worker.ts is where the model runs; it must be a real module worker so
  // its (large) onnxruntime-web graph stays off the page's bundle.
  worker: { format: 'es' },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  server: {
    // src/loader.ts imports ../../webui/test_samples.txt?raw so both demos read
    // the same sample file; without this, Vite's dev server refuses to serve it.
    fs: { allow: ['..'] },
    headers: {
      // Required for SharedArrayBuffer, which onnxruntime-web needs for
      // multi-threaded WASM. Without these it silently falls back to a single
      // thread and generation is several times slower.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
