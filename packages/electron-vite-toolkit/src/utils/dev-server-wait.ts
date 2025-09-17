/* eslint-disable no-await-in-loop */
import type { ViteDevServer } from 'vite';

// Constants for server health checks
const SERVER_READY_TIMEOUT = 10000;
const SERVER_CHECK_INTERVAL = 100;

/**
 * Wait for all dev servers to be ready by checking their health endpoints
 * @param {Record<string, ViteDevServer>} rendererServers - Object containing all renderer servers
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForDevServers(
  rendererServers: Record<string, ViteDevServer>,
  timeout = SERVER_READY_TIMEOUT,
): Promise<void> {
  const checks = Object.entries(rendererServers).map(async ([folder, server]) => {
    const { port } = server.config.server;
    const url = `http://localhost:${port}`;
    await waitForServer(url, timeout);
    console.log(`✅ ${folder} dev server ready at ${url}`);
  });

  await Promise.all(checks);
  console.log('🎉 All dev servers are ready!');
}

/**
 * Wait for a single server to respond with a successful HTTP status
 * @param {string} url - Server URL to check
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForServer(
  url: string,
  timeout = SERVER_READY_TIMEOUT,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet, continue waiting
    }
    await new Promise((resolve) => {
      setTimeout(resolve, SERVER_CHECK_INTERVAL);
    });
  }
  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`);
}
