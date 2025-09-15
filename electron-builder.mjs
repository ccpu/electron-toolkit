import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { getPackages } from '@manypkg/get-packages';

const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url)).toString());

/** @type {() => Promise<import('electron-builder').Configuration>} */
export default async () => {
  /**
   * By default, electron-builder copies all files from the project directory,
   * including source code, tests, configuration, and other unnecessary files.
   *
   * To optimize the build, we dynamically include only the necessary files
   * from each workspace package based on their "files" property in package.json.
   *
   * This ensures that only the built dist folders and package.json are included
   * for each workspace package, preventing unnecessary files from being bundled.
   *
   * For example, if a package has:
   * ```json
   * {
   *   "files": ["dist/**", "package.json"]
   * }
   * ```
   *
   * Only those files will be included in the final build.
   */
  async function getListOfFilesFromEachWorkspace() {
    const { packages } = await getPackages(process.cwd());

    const allFilesToInclude = [];

    for (const pkg of packages) {
      // @ts-ignore
      let patterns = pkg.packageJson.files || ['dist/**', 'package.json'];

      /** @type {string[]} */
      patterns = patterns.map(
        /** @param {string} p */
        (p) => join(pkg.relativeDir, p),
      );
      allFilesToInclude.push(...patterns);
    }

    return allFilesToInclude;
  }

  const workspaceFiles = await getListOfFilesFromEachWorkspace();

  // Build extraResources dynamically for windows excluding main
  const extraResources = [];
  const windowsPath = join(process.cwd(), 'app', 'windows');
  if (existsSync(windowsPath)) {
    const windowsFolders = readdirSync(windowsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    for (const folder of windowsFolders) {
      if (folder === 'main') continue;
      const rendererPath = join(windowsPath, folder, 'renderer');
      if (existsSync(rendererPath)) {
        const htmlFiles = readdirSync(rendererPath).filter((file) =>
          file.endsWith('.html'),
        );
        for (const htmlFile of htmlFiles) {
          extraResources.push({
            from: join('app', 'windows', folder, 'renderer', htmlFile),
            to: join('app', 'windows', folder, 'renderer', htmlFile),
          });
        }
      }
    }
  }

  return {
    productName: 'electron-app',
    directories: {
      output: 'dist',
      buildResources: 'buildResources',
    },
    extraResources,
    generateUpdatesFilesForAllChannels: true,
    linux: {
      target: ['deb'],
    },
    /**
     * It is recommended to avoid using non-standard characters such as spaces in artifact names,
     * as they can unpredictably change during deployment, making them impossible to locate and download for update.
     */
    // eslint-disable-next-line no-template-curly-in-string
    artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
    files: [
      'LICENSE*',
      pkg.main,
      'scripts/**',
      // Include workspace packages with their dist folders
      ...workspaceFiles,
      // Include all node_modules needed for production
      'node_modules/**',
      // Exclude dev dependencies
      '!node_modules/**/{test,tests,spec,__tests__}/**',
      '!node_modules/**/{*.md,*.txt,LICENSE*,CHANGELOG*}',
      '!node_modules/**/{tsconfig*.json,*.d.ts}',
    ],
  };
};
