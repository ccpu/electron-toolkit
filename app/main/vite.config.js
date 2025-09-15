/* eslint-disable no-restricted-properties */
import { spawn } from 'node:child_process';
import process from 'node:process';
import { getNodeMajorVersion } from '@internal/electron-versions';
import electronPath from 'electron';

/**
 * @typedef {import('node:child_process').ChildProcess} ChildProcess
 */

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
export default {
  build: {
    ssr: true,
    sourcemap: 'inline',
    outDir: 'dist',
    assetsDir: '.',
    target: `node${getNodeMajorVersion()}`,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['electron', 'electron-updater'],
      output: {
        entryFileNames: '[name].js',
      },
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  plugins: [handleHotReload()],
};

/**
 * Implement Electron app reload when some file was changed
 * @return {import('vite').Plugin}
 */
function handleHotReload() {
  /** @type {ChildProcess | null} */
  let electronApp = null;

  /** @type {import('vite').ViteDevServer|null} */
  let rendererWatchServer = null;

  return {
    name: '@app/main-process-hot-reload',

    config(config, env) {
      if (env.mode !== 'development') {
        return;
      }

      if (!config.plugins) {
        throw new Error('No plugins found in config');
      }

      const rendererWatchServerProvider = config.plugins.find(
        (p) =>
          p &&
          typeof p === 'object' &&
          'name' in p &&
          p.name === '@app/renderer-watch-server-provider',
      );
      if (
        !rendererWatchServerProvider ||
        typeof rendererWatchServerProvider !== 'object' ||
        !('api' in rendererWatchServerProvider)
      ) {
        throw new Error('Renderer watch server provider not found or invalid');
      }

      rendererWatchServer = rendererWatchServerProvider.api.provideRendererWatchServer();

      if (!rendererWatchServer || !rendererWatchServer.resolvedUrls?.local) {
        throw new Error('Renderer watch server not properly initialized');
      }

      const [url] = rendererWatchServer.resolvedUrls.local;
      process.env.VITE_DEV_SERVER_URL = url;
      // No return value per Vite plugin API
    },

    writeBundle() {
      if (process.env.NODE_ENV !== 'development') {
        return;
      }

      /** Kill electron if a process already exists */
      if (electronApp !== null) {
        electronApp.removeListener('exit', process.exit);
        electronApp.kill('SIGINT');
        electronApp = null;
      }

      /** Spawn a new electron process */
      electronApp = spawn(String(electronPath), ['--inspect', '.'], {
        stdio: 'inherit',
      });

      /** Stops the watch script when the application has been quit */
      electronApp.addListener('exit', process.exit);
    },
  };
}
