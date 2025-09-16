import path from 'node:path';
import process from 'node:process';

import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

// For all TypeScript files in 'src', excluding declaration files.
// const entryPoints = globSync('src/**/*.ts', {
//   ignore: ['src/**/*.d.ts', 'src/**/__tests__/**'], // Ignore declaration files and all __tests__ folders
// });

const entryPoints = 'src/index.ts';

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
      entryFileNames: '[name].js',
      format: 'es',
      preserveModules: true,
      preserveModulesRoot: 'src',
    },
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
    terser(),
  ],
};

export default config;
