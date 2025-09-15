import { resolveModuleExportNames } from 'mlly';

/**
 * This plugin creates a browser (renderer) version of `preload` package.
 * Basically, it just reads all nominals you exported from package and defines them as globalThis properties
 * expecting that real values were exposed by `electron.contextBridge.exposeInMainWorld()`
 *
 * Example:
 * ```ts
 * // index.ts
 * export const someVar = 'my-value';
 * ```
 *
 * Output
 * ```js
 * // _virtual_browser.mjs
 * export const someVar = globalThis[<hash>] // 'my-value'
 * ```
 *
 * @returns {import('vite').Plugin} - Vite plugin for mocking exposed preload APIs
 */
export function electronPreloadExposer() {
  const virtualModuleId = 'virtual:browser.js';
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;
  let projectRoot = '';

  return {
    name: 'electron-preload-exposer',
    /**
     * @param {import('vite').ResolvedConfig} config
     */
    configResolved(config) {
      // Store the root directory for later use
      projectRoot = config.root;
    },
    /**
     * @param {string} id
     */
    resolveId(id) {
      if (id.endsWith(virtualModuleId)) {
        return resolvedVirtualModuleId;
      }
      return null;
    },
    /**
     * @param {string} id
     */
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        // Use the Vite project root to resolve the index.ts file
        const { pathToFileURL } = await import('node:url');
        const exportedNames = await resolveModuleExportNames('./src/index.ts', {
          url: pathToFileURL(projectRoot),
        });
        return exportedNames.reduce(
          (s, key) =>
            s +
            (key === 'default'
              ? `export default globalThis['${btoa(key)}'];\n`
              : `export const ${key} = globalThis['${btoa(key)}'];\n`),
          '',
        );
      }
      return null;
    },
  };
}
