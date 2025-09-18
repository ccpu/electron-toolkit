import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Reads browser window options from a .mjs file if it exists
 * @param optionsPath - Path to the browser-window-options.mjs file
 * @returns Options object or empty object if file doesn't exist
 */
export async function loadBrowserWindowOptions(
  optionsPath: string,
): Promise<Record<string, any>> {
  try {
    if (!fs.existsSync(optionsPath)) {
      return {};
    }

    const optionsModule = await import(pathToFileURL(optionsPath).href);
    return optionsModule.default || optionsModule || {};
  } catch (error) {
    console.warn(`Failed to load browser window options from ${optionsPath}:`, error);
    return {};
  }
}
