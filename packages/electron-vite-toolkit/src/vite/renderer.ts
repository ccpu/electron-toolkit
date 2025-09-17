import type { UserConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Create a Vite configuration for a React renderer process with Tailwind CSS support.
 * @param {import('vite').UserConfig} options - Additional Vite configuration options to merge.
 * @returns {import('vite').UserConfig} - The complete Vite configuration.
 */
function createRendererViteConfig(options: UserConfig = {}): UserConfig {
  return defineConfig({
    ...options,
    plugins: [react(), tailwindcss(), ...(options.plugins || [])],
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
