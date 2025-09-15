/**
 * Implement Electron webview reload when some file was changed
 * @returns {import('vite').Plugin} - Vite plugin for hot reload in Electron preload scripts
 */
export function electronPreloadHotReload() {
  /** @type {import('vite').ViteDevServer|null} */
  let rendererWatchServer = null;

  return {
    name: 'electron-preload-hot-reload',

    /**
     * @param {import('vite').UserConfig} config
     * @param {import('vite').ConfigEnv} env
     */
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
