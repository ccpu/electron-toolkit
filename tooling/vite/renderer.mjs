import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import rendererConfig from 'electron-vite-toolkit/vite/renderer';

/**
 * @param {import('vite').UserConfig} options - Additional Vite configuration options to merge.
 * @returns {import('vite').UserConfig} - The complete Vite configuration.
 */
function createRendererViteConfig(options = {}) {
  return rendererConfig({
    ...options,
    plugins: [react(), tailwindcss(), ...(options.plugins || [])],
  });
}
export default createRendererViteConfig;
