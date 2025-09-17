import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock parseArgs to control CLI argument parsing
vi.mock('node:util', () => ({
  parseArgs: vi.fn(),
}));

// Mock the dev-mode module before importing cli
vi.mock('../src/dev-mode', () => ({
  startDevMode: vi.fn().mockResolvedValue(undefined),
}));

// Mock process.argv and console methods
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

const mockParseArgs = vi.mocked((await import('node:util')).parseArgs);

describe('cli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.argv
    process.argv = ['node', 'cli.js'];

    // Default parseArgs mock
    mockParseArgs.mockReturnValue({
      values: {},
      positionals: [],
    });
  });

  afterEach(() => {
    mockExit.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('main function', () => {
    it('should start dev mode with default options', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: {},
        positionals: ['dev'],
      });

      const { main } = await import('../src/cli');
      const { startDevMode } = await import('../src/dev-mode');

      // Act
      await main();

      // Assert
      expect(startDevMode).toHaveBeenCalledWith({
        windowsPath: undefined,
      });
    });

    it('should use custom windows path when provided', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: { 'windows-path': 'custom/windows' },
        positionals: ['dev'],
      });

      const { main } = await import('../src/cli');
      const { startDevMode } = await import('../src/dev-mode');

      // Act
      await main();

      // Assert
      expect(startDevMode).toHaveBeenCalledWith({
        windowsPath: path.resolve('custom/windows'),
      });
    });

    it('should handle start command', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: {},
        positionals: ['start'],
      });

      const { main } = await import('../src/cli');
      const { startDevMode } = await import('../src/dev-mode');

      // Act
      await main();

      // Assert
      expect(startDevMode).toHaveBeenCalledWith({
        windowsPath: undefined,
      });
    });

    it('should show help when --help flag is provided', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: { help: true },
        positionals: [],
      });

      const { main } = await import('../src/cli');

      // Act
      await main();

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage: electron-vite-toolkit'),
      );
    });

    it('should show help when -h flag is provided', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: { help: true },
        positionals: [],
      });

      const { main } = await import('../src/cli');

      // Act
      await main();

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage: electron-vite-toolkit'),
      );
    });

    it('should handle unknown command', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: {},
        positionals: ['unknown'],
      });

      const { main } = await import('../src/cli');

      // Act
      await main();

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith('Unknown command: unknown');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage: electron-vite-toolkit'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle short flag for windows-path', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: { 'windows-path': 'short/path' },
        positionals: ['dev'],
      });

      const { main } = await import('../src/cli');
      const { startDevMode } = await import('../src/dev-mode');

      // Act
      await main();

      // Assert
      expect(startDevMode).toHaveBeenCalledWith({
        windowsPath: path.resolve('short/path'),
      });
    });

    it('should handle startDevMode errors', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: {},
        positionals: ['dev'],
      });

      const { startDevMode } = await import('../src/dev-mode');
      vi.mocked(startDevMode).mockRejectedValueOnce(new Error('Test error'));

      const { main } = await import('../src/cli');

      // Act
      await main();

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error starting development mode:',
        expect.any(Error),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should log windows path when provided', async () => {
      // Arrange
      mockParseArgs.mockReturnValue({
        values: { 'windows-path': 'test/path' },
        positionals: ['dev'],
      });

      const { main } = await import('../src/cli');

      // Act
      await main();

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🚀 Starting Electron development mode...',
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `📁 Using windows path: ${path.resolve('test/path')}`,
      );
    });
  });
});
