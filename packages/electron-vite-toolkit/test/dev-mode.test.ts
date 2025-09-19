import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startDevMode } from '../src/dev-mode';

// Mock dependencies
vi.mock('node:fs');
vi.mock('vite');
vi.mock('../src/utils/port-manager');
vi.mock('../src/utils/dev-server-wait');

const mockFs = vi.mocked(fs);
const mockCreateServer = vi.mocked(createServer);

describe('dev-mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {};
  });

  describe('startDevMode', () => {
    it('should use default windows path when none provided', async () => {
      // Arrange
      mockFs.readdirSync.mockReturnValue([]);

      // Act
      await startDevMode();

      // Assert
      expect(mockFs.readdirSync).toHaveBeenCalledWith(path.resolve('app', 'windows'), {
        withFileTypes: true,
      });
    });

    it('should use custom windows path when provided', async () => {
      // Arrange
      const customPath = '/custom/windows';
      mockFs.readdirSync.mockReturnValue([]);

      // Act
      await startDevMode({ windowsPath: customPath });

      // Assert
      expect(mockFs.readdirSync).toHaveBeenCalledWith(customPath, {
        withFileTypes: true,
      });
    });

    it('should set development environment variables', async () => {
      // Arrange
      mockFs.readdirSync.mockReturnValue([]);

      // Act
      try {
        await startDevMode();
      } catch {
        // Expected to fail due to mocked dependencies
      }

      // Assert
      expect(process.env.NODE_ENV).toBe('development');
      expect(process.env.MODE).toBe('development');
    });

    it('should create dev servers for renderer directories', async () => {
      // Arrange
      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([
        mockDirent('main'),
        mockDirent('settings'),
      ] as any);

      mockFs.existsSync.mockImplementation(
        (pathToCheck) =>
          typeof pathToCheck === 'string' &&
          (pathToCheck.includes('renderer') || pathToCheck.includes('preload')),
      );

      const mockServer = {
        listen: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        config: {
          server: { port: 5173 },
        },
      };

      mockCreateServer.mockResolvedValue(mockServer as any);

      // Act
      try {
        await startDevMode();
      } catch {
        // Expected to fail due to incomplete mocking
      }

      // Assert
      const expectedServerCount = 2;
      expect(mockCreateServer).toHaveBeenCalledTimes(expectedServerCount);
    });
  });
});
