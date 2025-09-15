/* eslint-disable no-await-in-loop */

import net from 'node:net';

/**
 * Port management utility for development servers
 */
class PortManager {
  constructor() {
    this.usedPorts = new Set();
    this.basePort = 5173; // Default starting port for Vite
    this.maxAttempts = 100; // Maximum number of ports to try
  }

  /**
   * Check if a port is available
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} - True if port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Find the next available port starting from a given port
   * @param {number} startPort - Port to start checking from
   * @returns {Promise<number>} - Available port number
   */
  async findAvailablePort(startPort = this.basePort) {
    let attempts = 0;
    let currentPort = startPort;

    while (attempts < this.maxAttempts) {
      // Skip ports we've already allocated
      if (!this.usedPorts.has(currentPort)) {
        const isAvailable = await this.isPortAvailable(currentPort);
        if (isAvailable) {
          this.usedPorts.add(currentPort);
          return currentPort;
        }
      }

      currentPort++;
      attempts++;
    }

    throw new Error(
      `Unable to find an available port after ${this.maxAttempts} attempts`,
    );
  }

  /**
   * Get a random available port within a range
   * @param {number} min - Minimum port number (default: 5000)
   * @param {number} max - Maximum port number (default: 6000)
   * @returns {Promise<number>} - Available port number
   */
  async getRandomAvailablePort(min = 5000, max = 6000) {
    let attempts = 0;

    while (attempts < this.maxAttempts) {
      const randomPort = Math.floor(Math.random() * (max - min + 1)) + min;

      // Skip ports we've already allocated
      if (!this.usedPorts.has(randomPort)) {
        const isAvailable = await this.isPortAvailable(randomPort);
        if (isAvailable) {
          this.usedPorts.add(randomPort);
          return randomPort;
        }
      }

      attempts++;
    }

    throw new Error(
      `Unable to find a random available port after ${this.maxAttempts} attempts`,
    );
  }

  /**
   * Release a port back to the available pool
   * @param {number} port - Port number to release
   */
  releasePort(port) {
    this.usedPorts.delete(port);
  }

  /**
   * Get all currently allocated ports
   * @returns {Set<number>} - Set of allocated ports
   */
  getAllocatedPorts() {
    return new Set(this.usedPorts);
  }

  /**
   * Clear all allocated ports
   */
  clearAllPorts() {
    this.usedPorts.clear();
  }
}

export default PortManager;
