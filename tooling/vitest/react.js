import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import defineConfig from '@pixpilot/dev-config/vitest';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const filename = fileURLToPath(import.meta.url);
const currentDir = dirname(filename);
const setupFilePath = resolve(currentDir, 'react.setup.ts');

export default defineConfig({
  coverageOnCI: false,
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: [setupFilePath],
  },
});
