/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-properties */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { build, createServer } from 'vite';
import PortManager from './port-manager.js';

/**
 * This script is designed to run multiple packages of your application in a special development mode.
 * To do this, you need to follow a few steps:
 */
async function main() {
  /**
   * 1. We create a few flags to let everyone know that we are in development mode.
   */
  const mode = 'development';
  process.env.NODE_ENV = mode;
  process.env.MODE = mode;

  /**
   * 2. We create development servers for all renderer windows.
   * Each window gets its own dev server for hot reload.
   */
  const windowsPath = path.resolve('app', 'windows');
  const windowsFolders = fs
    .readdirSync(windowsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const rendererServers = {};
  const portManager = new PortManager();

  console.log('🔍 Discovering renderer windows and allocating ports...');

  // Create dev servers for all renderer windows with dynamic port allocation
  for (const folder of windowsFolders) {
    const rendererPath = path.resolve(`app/windows/${folder}/renderer`);
    if (fs.existsSync(rendererPath)) {
      console.log(`📁 Found renderer: ${folder}`);

      // Get an available port for this window
      // Use random ports if RANDOM_PORTS env var is set, otherwise use sequential ports

      const availablePort =
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.RANDOM_PORTS === 'true'
          ? await portManager.getRandomAvailablePort()
          : await portManager.findAvailablePort();

      console.log(`🚀 Allocating port ${availablePort} for ${folder} window`);

      const server = await createServer({
        mode,
        root: rendererPath,
        server: {
          port: availablePort,
          strictPort: true, // Fail if port is not available
        },
      });

      await server.listen();

      rendererServers[folder] = server;

      // Set environment variables for each window
      const actualPort = server.config.server.port;
      if (folder === 'main') {
        process.env.VITE_DEV_SERVER_URL = `http://localhost:${actualPort}`;
        console.log(`✅ Main window dev server: http://localhost:${actualPort}`);
      } else {
        const envVarName = `VITE_DEV_SERVER_URL_${folder.toUpperCase()}`;
        process.env[envVarName] = `http://localhost:${actualPort}`;
        console.log(`✅ ${folder} window dev server: http://localhost:${actualPort}`);
      }
    }
  }

  /**
   * 3. We are creating a simple provider plugin.
   * Its only purpose is to provide access to the renderer dev-servers to all other build processes.
   */
  /** @type {import('vite').Plugin} */
  const rendererWatchServerProvider = {
    name: '@app/renderer-watch-server-provider',
    api: {
      provideRendererWatchServers() {
        return rendererServers;
      },
      provideRendererWatchServer() {
        return rendererServers.main; // For backward compatibility
      },
    },
  };

  /**
   * 4. Start building all other packages in watch mode.
   * For each of them, we add a plugin provider so that each package can implement its own hot update mechanism.
   * Note: We no longer need to build non-main renderers since they use dev servers now.
   */

  for (const folder of windowsFolders) {
    // Build preload for all windows (preloads still need to be built)

    await build({
      mode,
      root: path.resolve(`app/windows/${folder}/preload`),
      plugins: [rendererWatchServerProvider],
      build: {
        watch: {}, // Enable watch mode for hot reload
      },
    });
  }

  // Note: Non-main renderer windows are now served by dev servers, so no need to build them

  // Build the main package

  await build({
    mode,
    root: path.resolve('app/main'),
    plugins: [rendererWatchServerProvider],
    build: {
      watch: {}, // Enable watch mode for hot reload
    },
  });

  // Start Electron after all dev servers and builds are ready
  const { spawn } = await import('node:child_process');

  console.log('\n🚀 Starting Electron application...');
  console.log('📦 Dev servers running:');

  Object.entries(rendererServers).forEach(([folder, server]) => {
    console.log(`  - ${folder}: http://localhost:${server.config.server.port}`);
  });

  // Use the correct command for Windows
  const isWindows = process.platform === 'win32';
  const electronCommand = isWindows ? 'npx.cmd' : 'npx';

  const electronProcess = spawn(
    electronCommand,
    ['electron', 'scripts/electron-entry.mjs'],
    {
      stdio: 'inherit',
      shell: isWindows, // Use shell on Windows
      env: { ...process.env }, // Pass all environment variables including our dev server URLs
    },
  );

  electronProcess.on('close', (code) => {
    console.log(`\n🔚 Electron process exited with code ${code}`);
    // Close all dev servers and release ports
    console.log('🧹 Cleaning up dev servers and releasing ports...');
    Object.values(rendererServers).forEach((server) => {
      const { port } = server.config.server;
      server.close();
      portManager.releasePort(port);
    });
    process.exit(code);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    electronProcess.kill('SIGTERM');
    // Close all dev servers and release ports
    Object.values(rendererServers).forEach((server) => {
      const { port } = server.config.server;
      server.close();
      portManager.releasePort(port);
    });
    console.log('🧹 Released all allocated ports');
    process.exit(0);
  });
}

main();
