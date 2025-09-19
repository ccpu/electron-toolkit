import type { UserConfig } from 'vite';
import { getChromeMajorVersion } from 'electron-utilities';
import { defineConfig } from 'vite';

import { electronPreloadExposer } from './plugins/electron-preload-exposer';
import { electronPreloadHotReload } from './plugins/electron-preload-hot-reload';

/**
 * Create a Vite configuration for Electron preload scripts with hot reload and API exposure support.
 */
function createPreloadViteConfig(options: UserConfig = {}): UserConfig {
  return defineConfig({
    ...options,
    build: {
      ssr: true,
      sourcemap: 'inline',
      outDir: 'dist',
      target: `chrome${getChromeMajorVersion()}`,
      assetsDir: '.',
      lib: {
        entry: ['src/exposed.ts', 'virtual:browser'],
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

export default createPreloadViteConfig;

export { createPreloadViteConfig };
