import fs from 'node:fs';
import path from 'node:path';

export function ensureDirectoryExistsAndNotEmpty(
  dirPath: string,
  errorMessage: string,
): boolean {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`\x1B[31m${errorMessage}\x1B[0m`);
  }
  const packageJsonPath = path.join(dirPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`\x1B[31m${errorMessage}\x1B[0m`);
  }
  return true;
}

export function ensureWindowDirectories(
  windowFolder: string,
  windowsPath: string,
  checkRenderer: boolean = true,
): boolean {
  const preloadPath = path.join(windowsPath, windowFolder, 'preload');

  ensureDirectoryExistsAndNotEmpty(
    preloadPath,
    `The preload folder for window '${windowFolder}' does not contain package.json. Please ensure the preload is properly set up.`,
  );

  if (checkRenderer) {
    const rendererPath = path.join(windowsPath, windowFolder, 'renderer');
    ensureDirectoryExistsAndNotEmpty(
      rendererPath,
      `The renderer folder for window '${windowFolder}' does not contain package.json. Please ensure the renderer is properly set up.`,
    );
  }

  return true;
}
