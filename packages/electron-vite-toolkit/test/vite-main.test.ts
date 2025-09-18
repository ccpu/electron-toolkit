import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mainConfig } from '../src/vite/main';

// Mock dependencies
vi.mock('node:child_process');
vi.mock('electron-utilities');
vi.mock('electron', () => ({ default: '/path/to/electron' }));

const mockGetNodeMajorVersion = vi.mocked(
  await import('electron-utilities'),
).getNodeMajorVersion;

// Test constants
const DEFAULT_NODE_VERSION = 18;
const TEST_NODE_VERSION = 20;
const EXPECTED_PLUGIN_COUNT = 2;

describe('vite/main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNodeMajorVersion.mockReturnValue(DEFAULT_NODE_VERSION);
  });

  describe('mainConfig', () => {
    it('should return default main process config', () => {
      // Act
      const config = mainConfig();

      // Assert
      expect(config).toMatchObject({
        build: {
          ssr: true,
          sourcemap: 'inline',
          outDir: 'dist',
          assetsDir: '.',
          target: 'node18',
          lib: {
            entry: 'src/index.ts',
            formats: ['es'],
          },
          rollupOptions: {
            external: ['electron', 'electron-updater'],
            output: {
              entryFileNames: '[name].js',
            },
          },
          emptyOutDir: true,
          reportCompressedSize: false,
        },
      });

      expect(config.plugins).toBeDefined();
      expect(Array.isArray(config.plugins)).toBe(true);
      expect(config.plugins).toHaveLength(1);
    });

    it('should merge custom config with defaults', () => {
      // Arrange
      const customConfig = {
        build: {
          outDir: 'custom-dist',
          sourcemap: false,
        },
        plugins: [{ name: 'custom-plugin' }],
      };

      // Act
      const config = mainConfig(customConfig);

      // Assert
      expect(config.build?.outDir).toBe('custom-dist');
      expect(config.build?.sourcemap).toBe(false);
      expect(config.build?.ssr).toBe(true); // Should keep default
      expect(config.plugins).toHaveLength(EXPECTED_PLUGIN_COUNT); // Hot reload + custom plugin
    });

    it('should use correct node version from electron-versions', () => {
      // Arrange
      mockGetNodeMajorVersion.mockReturnValue(TEST_NODE_VERSION);

      // Act
      const config = mainConfig();

      // Assert
      expect(config.build?.target).toBe('node20');
    });

    it('should handle empty custom config', () => {
      // Act
      const config = mainConfig({});

      // Assert
      expect(config).toBeDefined();
      expect(config.build).toBeDefined();
      expect(config.plugins).toBeDefined();
    });

    it('should include hot reload plugin in development mode', () => {
      // Act
      const config = mainConfig();
      const hotReloadPlugin = config.plugins?.[0];

      // Assert
      expect(hotReloadPlugin).toBeDefined();
      expect(typeof hotReloadPlugin).toBe('object');
      expect((hotReloadPlugin as any).name).toBe('@toolkit/main-process-hot-reload');
    });

    it('should preserve custom plugins', () => {
      // Arrange
      const customPlugin = { name: 'test-plugin' };
      const customConfig = {
        plugins: [customPlugin],
      };

      // Act
      const config = mainConfig(customConfig);

      // Assert
      expect(config.plugins).toContain(customPlugin);
      expect(config.plugins).toHaveLength(EXPECTED_PLUGIN_COUNT); // Hot reload + custom
    });
  });

  describe('hot reload plugin', () => {
    it('should have correct plugin name', () => {
      // Arrange
      const config = mainConfig();
      const plugin = config.plugins?.[0] as any;

      // Assert
      expect(plugin?.name).toBe('@toolkit/main-process-hot-reload');
    });

    it('should have config and writeBundle methods', () => {
      // Arrange
      const config = mainConfig();
      const plugin = config.plugins?.[0] as any;

      // Assert
      expect(typeof plugin?.config).toBe('function');
      expect(typeof plugin?.writeBundle).toBe('function');
    });

    it('should skip config in non-development mode', () => {
      // Arrange
      const config = mainConfig();
      const plugin = config.plugins?.[0] as any;
      const mockConfig = { plugins: [] };
      const env = { mode: 'production' };

      // Act
      const result = plugin?.config(mockConfig, env);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should skip writeBundle in non-development mode', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const config = mainConfig();
      const plugin = config.plugins?.[0] as any;
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      plugin?.writeBundle();

      // Assert
      expect(mockConsoleLog).not.toHaveBeenCalled();

      // Cleanup
      mockConsoleLog.mockRestore();
      delete process.env.NODE_ENV;
    });
  });
});
