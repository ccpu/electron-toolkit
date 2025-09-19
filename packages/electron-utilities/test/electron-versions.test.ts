import { execSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getChromeMajorVersion, getNodeMajorVersion } from '../src/electron-versions';

// Mock the execSync function
vi.mock('node:child_process');

const mockExecSync = vi.mocked(execSync);

describe('electron-versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getChromeMajorVersion', () => {
    it('should return Chrome major version when Electron is available', () => {
      const expectedChromeMajor = 118;
      const mockVersions = {
        chrome: '118.0.5993.159',
        node: '18.17.1',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      const result = getChromeMajorVersion();
      expect(result).toBe(expectedChromeMajor);
    });

    it('should return undefined when Electron command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = getChromeMajorVersion();
      expect(result).toBeUndefined();
    });

    it('should return undefined when Chrome version is not available', () => {
      const mockVersions = {
        node: '18.17.1',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      const result = getChromeMajorVersion();
      expect(result).toBeUndefined();
    });

    it('should handle malformed version strings gracefully', () => {
      const mockVersions = {
        chrome: 'invalid-version',
        node: '18.17.1',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      const result = getChromeMajorVersion();
      expect(result).toBeNaN(); // getMajorVersion returns NaN for invalid versions
    });
  });

  describe('getNodeMajorVersion', () => {
    it('should return Node major version when Electron is available', () => {
      const expectedNodeMajor = 18;
      const mockVersions = {
        chrome: '118.0.5993.159',
        node: '18.17.1',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      const result = getNodeMajorVersion();
      expect(result).toBe(expectedNodeMajor);
    });

    it('should return undefined when Electron command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = getNodeMajorVersion();
      expect(result).toBeUndefined();
    });

    it('should return undefined when Node version is not available', () => {
      const mockVersions = {
        chrome: '118.0.5993.159',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      const result = getNodeMajorVersion();
      expect(result).toBeUndefined();
    });

    it('should handle different Node version formats', () => {
      const expectedNodeMajor = 20;
      const mockVersions = {
        chrome: '118.0.5993.159',
        node: '20.9.0',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      const result = getNodeMajorVersion();
      expect(result).toBe(expectedNodeMajor);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical Electron version response', () => {
      const expectedChromeMajor = 116;
      const expectedNodeMajor = 18;
      const mockVersions = {
        chrome: '116.0.5845.228',
        node: '18.15.0',
        electron: '25.8.4',
        v8: '11.6.189.12-electron.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      expect(getChromeMajorVersion()).toBe(expectedChromeMajor);
      expect(getNodeMajorVersion()).toBe(expectedNodeMajor);
    });

    it('should verify execSync is called with correct parameters', () => {
      const mockVersions = {
        chrome: '118.0.5993.159',
        node: '18.17.1',
        electron: '27.0.0',
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockVersions));

      getChromeMajorVersion();

      expect(mockExecSync).toHaveBeenCalledWith(
        'npx electron -p "JSON.stringify(process.versions)"',
        {
          encoding: 'utf-8',
          env: expect.objectContaining({
            ELECTRON_RUN_AS_NODE: '1',
          }),
        },
      );
    });
  });
});
