import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildWindowsConfig } from 'electron-vite-toolkit/windows-config';

(async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const windowsPath = path.resolve(scriptDir, '../app/windows');
  const config = await buildWindowsConfig({ windowsPath });

  const mainDist = await import('../app/main/dist/index.js');
  const { initApp } = mainDist;
  initApp(config);
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
