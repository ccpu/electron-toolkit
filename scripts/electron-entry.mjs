import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// noinspection JSIgnoredPromiseFromCall
/**
 * We resolve '@app/renderer' and '@app/preload'
 * here and not in '@app/main'
 * to observe good practices of modular design.
 * This allows fewer dependencies and better separation of concerns in '@app/main'.
 * Thus,
 * the main module remains simplistic and efficient
 * as it receives initialization instructions rather than direct module imports.
 */

(async () => {
  const mainDist = await import('../app/main/dist/index.js');
  const { initApp } = mainDist;

  // Build windows object dynamically
  const windowsPath = new URL('../app/windows', import.meta.url);
  const windowsFolders = fs
    .readdirSync(fileURLToPath(windowsPath), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const windows = {};
  for (const folder of windowsFolders) {
    const isMain = folder === 'main';
    let renderer;

    if (process.env.MODE === 'development') {
      // In development mode, all windows use their respective dev servers
      let devServerUrl;

      if (isMain && Boolean(process.env.VITE_DEV_SERVER_URL)) {
        devServerUrl = process.env.VITE_DEV_SERVER_URL;
      } else {
        // For non-main windows, check for their specific dev server URL
        const envVar = `VITE_DEV_SERVER_URL_${folder.toUpperCase()}`;
        devServerUrl = process.env[envVar];
      }

      if (devServerUrl) {
        renderer = new URL(devServerUrl);
      } else {
        // Fallback to built files if dev server URL not available
        renderer = {
          path: fileURLToPath(
            new URL(`../app/windows/${folder}/renderer/dist/index.html`, import.meta.url),
          ),
        };
      }
    } else {
      // In production mode, all windows use built files
      renderer = {
        path: fileURLToPath(
          new URL(`../app/windows/${folder}/renderer/dist/index.html`, import.meta.url),
        ),
      };
    }

    windows[folder] = {
      renderer,
      preload: {
        path: fileURLToPath(
          new URL(`../app/windows/${folder}/preload/dist/exposed.mjs`, import.meta.url),
        ),
      },
    };
  }

  // noinspection JSIgnoredPromiseFromCall
  initApp({
    // 🔧 Pass the whole windows object
    windows,
    // We still need a default entry for the first window
    renderer: windows.main.renderer,
    preload: windows.main.preload,
  });
})();

if (
  process.env.NODE_ENV === 'development' ||
  process.env.PLAYWRIGHT_TEST === 'true' ||
  Boolean(process.env.CI)
) {
  function showAndExit(...args) {
    console.error(...args);
    process.exit(1);
  }

  process.on('uncaughtException', showAndExit);
  process.on('unhandledRejection', showAndExit);
}
