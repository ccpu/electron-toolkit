import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForDevServers, waitForServer } from '../src/utils/dev-server-wait';

// Mock global fetch
globalThis.fetch = vi.fn();

const TEST_PORT = 5173;
const TEST_TIMEOUT = 1000;
const EXPECTED_FETCH_CALLS = 2;

describe('dev-server-wait', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Clear any remaining timers to prevent unhandled rejections
    vi.clearAllTimers();
  });

  describe('waitForServer', () => {
    it('should resolve when server responds with ok status', async () => {
      // Arrange
      const mockResponse = { ok: true };
      vi.mocked(fetch).mockResolvedValue(mockResponse as Response);
      const url = `http://localhost:${TEST_PORT}`;

      // Act
      const promise = waitForServer(url, TEST_TIMEOUT);
      vi.runAllTimers();
      await promise;

      // Assert
      expect(fetch).toHaveBeenCalledWith(url);
    });

    it('should retry when server responds with error status', async () => {
      // Arrange
      const mockErrorResponse = { ok: false };
      const mockSuccessResponse = { ok: true };

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockErrorResponse as Response)
        .mockResolvedValueOnce(mockSuccessResponse as Response);

      const url = `http://localhost:${TEST_PORT}`;

      // Act
      const promise = waitForServer(url, TEST_TIMEOUT);

      // Fast-forward through all timers to complete the retry logic
      await vi.runAllTimersAsync();
      await promise;

      // Assert
      expect(fetch).toHaveBeenCalledTimes(EXPECTED_FETCH_CALLS);
    });

    it('should retry when server is not available', async () => {
      // Arrange
      const mockSuccessResponse = { ok: true };

      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce(mockSuccessResponse as Response);

      const url = `http://localhost:${TEST_PORT}`;

      // Act
      const promise = waitForServer(url, TEST_TIMEOUT);
      await vi.runAllTimersAsync();
      await promise;

      // Assert
      expect(fetch).toHaveBeenCalledTimes(EXPECTED_FETCH_CALLS);
    });

    it('should timeout when server never becomes ready', async () => {
      // Temporarily use real timers for this test to avoid unhandled rejections
      vi.useRealTimers();
      
      // Arrange
      vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));
      const url = `http://localhost:${TEST_PORT}`;
      const shortTimeout = 100; // Use a much shorter timeout for faster test execution

      // Act & Assert
      await expect(waitForServer(url, shortTimeout)).rejects.toThrow(
        `Server at ${url} did not become ready within ${shortTimeout}ms`,
      );
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  describe('waitForDevServers', () => {
    it('should wait for all servers to be ready', async () => {
      // Arrange
      const mockResponse = { ok: true };
      vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

      const rendererServers = {
        main: {
          config: { server: { port: TEST_PORT } },
        },
        settings: {
          config: { server: { port: TEST_PORT + 1 } },
        },
      } as any;

      // Act
      const promise = waitForDevServers(rendererServers, TEST_TIMEOUT);
      vi.runAllTimers();
      await promise;

      // Assert
      expect(fetch).toHaveBeenCalledWith(`http://localhost:${TEST_PORT}`);
      expect(fetch).toHaveBeenCalledWith(`http://localhost:${TEST_PORT + 1}`);
      expect(fetch).toHaveBeenCalledTimes(EXPECTED_FETCH_CALLS);
    });

    it('should handle empty servers object', async () => {
      // Arrange
      const rendererServers = {};

      // Act
      const promise = waitForDevServers(rendererServers, TEST_TIMEOUT);
      vi.runAllTimers();
      await promise;

      // Assert
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fail if any server fails to start', async () => {
      // Temporarily use real timers for this test to avoid unhandled rejections
      vi.useRealTimers();
      
      // Arrange
      const mockSuccessResponse = { ok: true };

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockSuccessResponse as Response)
        .mockRejectedValue(new Error('Connection refused'));

      const rendererServers = {
        main: {
          config: { server: { port: TEST_PORT } },
        },
        settings: {
          config: { server: { port: TEST_PORT + 1 } },
        },
      } as any;
      
      const shortTimeout = 100; // Use a much shorter timeout for faster test execution

      // Act & Assert
      await expect(waitForDevServers(rendererServers, shortTimeout)).rejects.toThrow();
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });
});
