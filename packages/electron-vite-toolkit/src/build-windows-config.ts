import type { RendererConfig, WindowConfig, WindowsConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureWindowDirectories } from './utils/check-directory';
import { getDevServerEnvVarName } from './utils/env-var-name';
import { loadBrowserWindowOptions } from './utils/load-browser-window-options';

interface WindowsConfigOptions {
  windowsPath: string;
}

export async function buildWindowsConfig(
  options: WindowsConfigOptions,
): Promise<WindowsConfig> {
  const { windowsPath } = options;

  const windowsFolders = fs
    .readdirSync(windowsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // Prepare window configurations and collect option loading promises
  const windowPromises = windowsFolders.map(async (folder) => {
    const isMain = folder === 'main';
    let renderer: URL | RendererConfig;

    if (process.env.MODE === 'development') {
      // In development mode, all windows use their respective dev servers
      let devServerUrl: string | undefined;

      if (isMain && Boolean(process.env.VITE_DEV_SERVER_URL)) {
        devServerUrl = process.env.VITE_DEV_SERVER_URL;
      } else {
        // For non-main windows, check for their specific dev server URL
        const envVar = getDevServerEnvVarName(folder);
        devServerUrl = process.env[envVar];
      }

      if (devServerUrl) {
        // await waitForRenderer(devServerUrl); // Wait for the renderer dev server to be ready
        renderer = new URL(devServerUrl);
      } else {
        // Fallback to built files if dev server URL not available
        renderer = {
          path: fileURLToPath(
            pathToFileURL(
              path.resolve(windowsPath, `${folder}/renderer/dist/index.html`),
            ),
          ),
        };
      }
    } else {
      // In production mode, all windows use built files
      renderer = {
        path: fileURLToPath(
          pathToFileURL(path.resolve(windowsPath, `${folder}/renderer/dist/index.html`)),
        ),
      };
    }

    // Load browser window options for this window
    const browserWindowOptionsPath = path.resolve(
      windowsPath,
      `${folder}/browser-window-options.mjs`,
    );
    const windowOptions = await loadBrowserWindowOptions(browserWindowOptionsPath);

    ensureWindowDirectories(folder, windowsPath, 'path' in renderer);

    return {
      folder,
      config: {
        renderer,
        preload: {
          path: fileURLToPath(
            pathToFileURL(
              path.resolve(windowsPath, `${folder}/preload/dist/exposed.mjs`),
            ),
          ),
        },
        options: windowOptions,
      } as WindowConfig,
    };
  });

  // Wait for all window configurations to be resolved
  const windowConfigs = await Promise.all(windowPromises);

  // Build the windows object
  const windows: Record<string, WindowConfig> = {};
  for (const { folder, config } of windowConfigs) {
    windows[folder] = config;
  }

  return {
    // 🔧 Pass the whole windows object
    windows,
    // We still need a default entry for the first window
    renderer: windows.main!.renderer,
    preload: windows.main!.preload,
  };
}
