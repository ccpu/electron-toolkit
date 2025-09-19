import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWindowsConfig } from '../src/build-windows-config';

// Mock dependencies
vi.mock('node:fs');
vi.mock('../src/utils/load-browser-window-options');

const mockFs = vi.mocked(fs);
const mockLoadBrowserWindowOptions = vi.mocked(
  await import('../src/utils/load-browser-window-options'),
).loadBrowserWindowOptions;

describe('build-windows-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {};
    mockLoadBrowserWindowOptions.mockResolvedValue({});
    mockFs.existsSync.mockReturnValue(true);
  });

  describe('buildWindowsConfig', () => {
    it('should build config for main window only', async () => {
      // Arrange
      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([mockDirent('main')] as any);
      const windowsPath = '/test/windows';

      // Act
      const config = await buildWindowsConfig({ windowsPath });

      // Assert
      expect(config.windows).toBeDefined();
      expect(config.windows.main).toBeDefined();
      expect(config.renderer).toBeDefined();
      expect(config.preload).toBeDefined();
      expect(mockFs.readdirSync).toHaveBeenCalledWith(windowsPath, {
        withFileTypes: true,
      });
    });

    it('should build config for multiple windows', async () => {
      // Arrange
      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([
        mockDirent('main'),
        mockDirent('settings'),
        mockDirent('about'),
      ] as any);
      const windowsPath = '/test/windows';

      // Act
      const config = await buildWindowsConfig({ windowsPath });

      // Assert
      const expectedWindowCount = 3;
      expect(Object.keys(config.windows)).toHaveLength(expectedWindowCount);
      expect(config.windows.main).toBeDefined();
      expect(config.windows.settings).toBeDefined();
      expect(config.windows.about).toBeDefined();
    });

    it('should use dev server URLs in development mode', async () => {
      // Arrange
      process.env.MODE = 'development';
      process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
      process.env.VITE_DEV_SERVER_URL_SETTINGS = 'http://localhost:5174';

      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([
        mockDirent('main'),
        mockDirent('settings'),
      ] as any);
      const windowsPath = '/test/windows';

      // Act
      const config = await buildWindowsConfig({ windowsPath });

      // Assert
      expect(config.windows.main).toBeDefined();
      expect(config.windows.settings).toBeDefined();
      expect(config.windows.main!.renderer).toBeInstanceOf(URL);
      expect(config.windows.settings!.renderer).toBeInstanceOf(URL);
      expect((config.windows.main!.renderer as URL).href).toBe('http://localhost:5173/');
      expect((config.windows.settings!.renderer as URL).href).toBe(
        'http://localhost:5174/',
      );
    });

    it('should use file paths in production mode', async () => {
      // Arrange
      process.env.MODE = 'production';

      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([mockDirent('main')] as any);
      const windowsPath = '/test/windows';

      // Act
      const config = await buildWindowsConfig({ windowsPath });

      // Assert
      expect(config.windows.main).toBeDefined();
      expect(config.windows.main!.renderer).toHaveProperty('path');
      expect(typeof (config.windows.main!.renderer as any).path).toBe('string');
    });

    it('should fallback to file paths when dev server URL not available', async () => {
      // Arrange
      process.env.MODE = 'development';
      // No VITE_DEV_SERVER_URL set

      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([mockDirent('main')] as any);
      const windowsPath = '/test/windows';

      // Act
      const config = await buildWindowsConfig({ windowsPath });

      // Assert
      expect(config.windows.main).toBeDefined();
      expect(config.windows.main!.renderer).toHaveProperty('path');
      expect(typeof (config.windows.main!.renderer as any).path).toBe('string');
    });

    it('should load browser window options for each window', async () => {
      // Arrange
      const mockDirent = (name: string) => ({
        name,
        isDirectory: () => true,
      });

      mockFs.readdirSync.mockReturnValue([
        mockDirent('main'),
        mockDirent('settings'),
      ] as any);
      const windowsPath = '/test/windows';
      const expectedWindowCount = 2;

      const mockOptions = { width: 800, height: 600 };
      mockLoadBrowserWindowOptions.mockResolvedValue(mockOptions);

      // Act
      const config = await buildWindowsConfig({ windowsPath });

      // Assert
      expect(mockLoadBrowserWindowOptions).toHaveBeenCalledTimes(expectedWindowCount);
      expect(mockLoadBrowserWindowOptions).toHaveBeenCalledWith(
        path.resolve(windowsPath, 'main/browser-window-options.mjs'),
      );
      expect(mockLoadBrowserWindowOptions).toHaveBeenCalledWith(
        path.resolve(windowsPath, 'settings/browser-window-options.mjs'),
      );
      expect(config.windows.main!.options).toEqual(mockOptions);
      expect(config.windows.settings!.options).toEqual(mockOptions);
    });
  });
});
