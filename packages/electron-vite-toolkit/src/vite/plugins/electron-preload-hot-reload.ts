import type { ConfigEnv, Plugin, UserConfig, ViteDevServer } from 'vite';

/**
 * Implement Electron webview reload when some file was changed
 */
export function electronPreloadHotReload(): Plugin {
  let rendererWatchServer: ViteDevServer | null = null;

  return {
    name: 'electron-preload-hot-reload',

    config(config: UserConfig, env: ConfigEnv) {
      if (env.mode !== 'development') {
        return;
      }

      if (!config.plugins) {
        throw new Error('No plugins found in config');
      }

      const rendererWatchServerProvider = config.plugins.find(
        (p: any) =>
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
      // No return value per Vite plugin API
    },

    writeBundle() {
      if (!rendererWatchServer) {
        return;
      }

      rendererWatchServer.ws.send({
        type: 'full-reload',
      });
    },
  };
}
