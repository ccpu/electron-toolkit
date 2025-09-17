import type { RendererConfig, WindowConfig, WindowsConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface WindowsConfigOptions {
  windowsPath: string;
}

export function buildWindowsConfig(options: WindowsConfigOptions): WindowsConfig {
  const { windowsPath } = options;

  const windowsFolders = fs
    .readdirSync(windowsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const windows: Record<string, WindowConfig> = {};
  for (const folder of windowsFolders) {
    const isMain = folder === 'main';
    let renderer: URL | RendererConfig;

    if (process.env.MODE === 'development') {
      // In development mode, all windows use their respective dev servers
      let devServerUrl: string | undefined;

      if (isMain && Boolean(process.env.VITE_DEV_SERVER_URL)) {
        devServerUrl = process.env.VITE_DEV_SERVER_URL;
      } else {
        // For non-main windows, check for their specific dev server URL
        const envVar = `VITE_DEV_SERVER_URL_${folder.toUpperCase()}`;
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

    windows[folder] = {
      renderer,
      preload: {
        path: fileURLToPath(
          pathToFileURL(path.resolve(windowsPath, `${folder}/preload/dist/exposed.mjs`)),
        ),
      },
    };
  }

  return {
    // 🔧 Pass the whole windows object
    windows,
    // We still need a default entry for the first window
    renderer: windows.main!.renderer,
    preload: windows.main!.preload,
  };
}
