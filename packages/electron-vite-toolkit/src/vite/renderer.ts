import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';

/**
 * Create a Vite configuration for a renderer process.
 * @param {import('vite').UserConfig} options - Additional Vite configuration options to merge.
 * @returns {import('vite').UserConfig} - The complete Vite configuration.
 */
function createRendererViteConfig(options: UserConfig = {}): UserConfig {
  return defineConfig({
    ...options,
    base: './', // Use relative paths for assets
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      ...options.build,
    },
  });
}

export default createRendererViteConfig;

export { createRendererViteConfig };
