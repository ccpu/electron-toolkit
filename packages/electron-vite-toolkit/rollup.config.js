import path from 'node:path';
import process from 'node:process';

import typescript from '@rollup/plugin-typescript';

// Define multiple entry points for this package
const entryPoints = {
  index: 'src/index.ts',
  'vite/renderer': 'src/vite/renderer.ts',
  'vite/preload': 'src/vite/preload.ts',
  'vite/main': 'src/vite/main.ts',
  'build-windows-config': 'src/build-windows-config.ts',
  cli: 'src/cli.ts',
};

// Ensure output directory is relative to the current working directory (package being built)
const outputDir = path.resolve(process.cwd(), 'dist');

/** @type {import('rollup').RollupOptions} */
const config = {
  input: entryPoints,
  output: [
    {
      dir: outputDir,
      entryFileNames: '[name].cjs',
      format: 'cjs',
      exports: 'named',
      // Preserve the original module structure.
      preserveModules: true,
      // Set 'src' as the root. This strips 'src/' from the output path.
      // e.g., 'src/configs/main.ts' becomes 'dist/configs/main.cjs'
      preserveModulesRoot: 'src',
    },
    {
      dir: outputDir,
      entryFileNames: '[name].mjs',
      format: 'es',
      preserveModules: true,
      preserveModulesRoot: 'src',
    },
  ],
  external: [
    // Node.js built-in modules
    /^node:/u,
    // Electron
    'electron',
    // Dependencies that should not be bundled
    'vite',
    '@vitejs/plugin-react',
    '@tailwindcss/vite',
    // Other runtime dependencies that should remain external
    'mlly',
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.build.json',
      /*
       * Enabling incremental compilation may cause errors and sometimes prevent .d.ts file generation.
       * It can also cause the creation of a .rollup.cache folder, which sometimes results in .d.ts files not being copied.
       */
      incremental: false,
    }),
  ],
};

export default config;
