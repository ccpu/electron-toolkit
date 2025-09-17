import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortManager from '../src/utils/port-manager';

// Mock net module
vi.mock('node:net');

// Test constants
const TEST_PORT = 5173;
const TEST_PORT_2 = 5174;
const TEST_RANDOM_PORT = 9999;
const EXPECTED_PORT_COUNT = 2;

describe('portManager', () => {
  let portManager: PortManager;

  beforeEach(() => {
    vi.clearAllMocks();
    portManager = new PortManager();
  });

  describe('isPortAvailable', () => {
    it('should return true when port is available', async () => {
      // Arrange
      const mockServer = {
        listen: vi.fn((port, callback) => {
          setTimeout(callback, 0);
        }),
        close: vi.fn(),
        once: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        }),
        on: vi.fn(),
      };

      const net = await import('node:net');
      vi.mocked(net.createServer).mockReturnValue(mockServer as any);

      // Act
      const result = await portManager.isPortAvailable(TEST_PORT);

      // Assert
      expect(result).toBe(true);
      expect(mockServer.listen).toHaveBeenCalledWith(TEST_PORT, expect.any(Function));
    });

    it('should return false when port is not available', async () => {
      // Arrange
      const mockServer = {
        listen: vi.fn(),
        close: vi.fn(),
        once: vi.fn(),
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(callback, 0);
          }
        }),
      };

      const net = await import('node:net');
      vi.mocked(net.createServer).mockReturnValue(mockServer as any);

      // Act
      const result = await portManager.isPortAvailable(TEST_PORT);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findAvailablePort', () => {
    it('should find and allocate an available port', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(true);

      // Act
      const port = await portManager.findAvailablePort(TEST_PORT);

      // Assert
      expect(port).toBe(TEST_PORT);
      expect(portManager.getAllocatedPorts().has(TEST_PORT)).toBe(true);
    });

    it('should skip already allocated ports', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(true);

      // Allocate port 5173
      await portManager.findAvailablePort(TEST_PORT);

      // Act
      const secondPort = await portManager.findAvailablePort(TEST_PORT);

      // Assert
      expect(secondPort).toBe(TEST_PORT_2);
      expect(portManager.getAllocatedPorts().has(TEST_PORT)).toBe(true);
      expect(portManager.getAllocatedPorts().has(TEST_PORT_2)).toBe(true);
    });

    it('should throw error when no ports available', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(false);

      // Act & Assert
      await expect(portManager.findAvailablePort()).rejects.toThrow(
        'Unable to find an available port after 100 attempts',
      );
    });
  });

  describe('getRandomAvailablePort', () => {
    it('should find a random available port within range', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(true);
      const min = 5000;
      const max = 5010;

      // Act
      const port = await portManager.getRandomAvailablePort(min, max);

      // Assert
      expect(port).toBeGreaterThanOrEqual(min);
      expect(port).toBeLessThanOrEqual(max);
      expect(portManager.getAllocatedPorts().has(port)).toBe(true);
    });

    it('should throw error when no random ports available', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(false);

      // Act & Assert
      await expect(portManager.getRandomAvailablePort()).rejects.toThrow(
        'Unable to find a random available port after 100 attempts',
      );
    });
  });

  describe('releasePort', () => {
    it('should release an allocated port', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(true);
      const port = await portManager.findAvailablePort(TEST_PORT);
      expect(portManager.getAllocatedPorts().has(port)).toBe(true);

      // Act
      portManager.releasePort(port);

      // Assert
      expect(portManager.getAllocatedPorts().has(port)).toBe(false);
    });
  });

  describe('clearAllPorts', () => {
    it('should clear all allocated ports', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(true);
      await portManager.findAvailablePort(TEST_PORT);
      await portManager.findAvailablePort(TEST_PORT_2);
      expect(portManager.getAllocatedPorts().size).toBe(EXPECTED_PORT_COUNT);

      // Act
      portManager.clearAllPorts();

      // Assert
      expect(portManager.getAllocatedPorts().size).toBe(0);
    });
  });

  describe('getAllocatedPorts', () => {
    it('should return copy of allocated ports', async () => {
      // Arrange
      vi.spyOn(portManager, 'isPortAvailable').mockResolvedValue(true);
      await portManager.findAvailablePort(TEST_PORT);

      // Act
      const allocatedPorts = portManager.getAllocatedPorts();

      // Assert
      expect(allocatedPorts).toBeInstanceOf(Set);
      expect(allocatedPorts.has(TEST_PORT)).toBe(true);

      // Verify it's a copy (modifications don't affect original)
      allocatedPorts.add(TEST_RANDOM_PORT);
      expect(portManager.getAllocatedPorts().has(TEST_RANDOM_PORT)).toBe(false);
    });
  });
});
