import type { Plugin, UserConfig } from 'vite';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { getNodeMajorVersion } from '@internal/electron-versions';
import electronPath from 'electron';

/**
 * Returns a Vite config for the Electron main process.
 * @param customConfig Optional overrides for the config.
 */
export function mainConfig(customConfig: Partial<UserConfig> = {}): UserConfig {
  const defaultConfig = {
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

  // Merge configurations properly
  return {
    ...defaultConfig,
    ...customConfig,
    build: {
      ...defaultConfig.build,
      ...(customConfig.build || {}),
    } as any,
    plugins: [...defaultConfig.plugins, ...(customConfig.plugins || [])],
  };
}

/**
 * Vite plugin to reload Electron app on main process changes in dev.
 */
function handleHotReload(): Plugin {
  let electronApp: ReturnType<typeof spawn> | null = null;
  let rendererWatchServer: any = null;
  return {
    name: '@toolkit/main-process-hot-reload',
    config(config, env) {
      if (env.mode !== 'development') return;
      if (!config.plugins) throw new Error('No plugins found in config');
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
    },
    writeBundle() {
      if (process.env.NODE_ENV !== 'development') return;
      console.log('🚀 Starting main process');
      console.log('VITE_DEV_SERVER_URL:', process.env.VITE_DEV_SERVER_URL);
      if (electronApp !== null) {
        console.log('🔁 Restarting Electron app...');
        electronApp.removeListener('exit', process.exit);
        electronApp.kill('SIGINT');
        electronApp = null;
      }
      electronApp = spawn(String(electronPath), ['--inspect', '.'], {
        stdio: 'inherit',
      });
      electronApp.addListener('exit', process.exit);
      electronApp.on('error', (error) => {
        console.error('Electron process error:', error);
      });
      electronApp.on('exit', (code, signal) => {
        console.log(`Electron process exited with code ${code} and signal ${signal}`);
      });
    },
  };
}

export default mainConfig;
