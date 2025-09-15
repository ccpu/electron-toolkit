import { getChromeMajorVersion } from '@internal/electron-versions';
import { defineConfig } from 'vite';
import { electronPreloadExposer } from './plugins/electron-preload-exposer.mjs';
import { electronPreloadHotReload } from './plugins/electron-preload-hot-reload.mjs';

/**
 * Create a Vite configuration for Electron preload scripts with hot reload and API exposure support.
 * @param {import('vite').UserConfig} options - Additional Vite configuration options to merge.
 * @returns {import('vite').UserConfig} - The complete Vite configuration.
 */
function createPreloadConfig(options = {}) {
  return defineConfig({
    ...options,
    build: {
      ssr: true,
      sourcemap: 'inline',
      outDir: 'dist',
      target: `chrome${getChromeMajorVersion()}`,
      assetsDir: '.',
      lib: {
        entry: ['src/exposed.ts', 'virtual:browser.js'],
      },
      rollupOptions: {
        output: [
          {
            // ESM preload scripts must have the .mjs extension
            // https://www.electronjs.org/docs/latest/tutorial/esm#esm-preload-scripts-must-have-the-mjs-extension
            entryFileNames: '[name].mjs',
          },
        ],
      },
      emptyOutDir: true,
      reportCompressedSize: false,
      ...options.build,
    },
    plugins: [
      electronPreloadExposer(),
      electronPreloadHotReload(),
      ...(options.plugins || []),
    ],
  });
}

export default createPreloadConfig;
