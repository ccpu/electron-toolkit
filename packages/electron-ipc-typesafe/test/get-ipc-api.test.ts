import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getIpcApi } from '../src/get-ipc-api';

// Mock the global window object
const mockWindow = {} as any;

describe('getIpcApi', () => {
  beforeEach(() => {
    // Reset the mock window before each test
    Object.keys(mockWindow).forEach((key) => {
      delete mockWindow[key];
    });

    // Mock the global window
    vi.stubGlobal('window', mockWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return null when window is undefined', () => {
    vi.unstubAllGlobals();
    const result = getIpcApi('testApi');
    expect(result).toBeNull();
  });

  it('should return API when found with plain apiKey (contextBridge.exposeInMainWorld)', () => {
    const mockApi = {
      invoke: { testMethod: vi.fn() },
      onTestEvent: vi.fn(),
    };

    mockWindow.testApi = mockApi;

    const result = getIpcApi('testApi');
    expect(result).toBe(mockApi);
  });

  it('should return API when found with base64 encoded apiKey (legacy support)', () => {
    const mockApi = {
      invoke: { testMethod: vi.fn() },
      onTestEvent: vi.fn(),
    };

    const apiKey = 'testApi';
    const encodedKey = btoa(apiKey);
    mockWindow[encodedKey] = mockApi;

    const result = getIpcApi(apiKey);
    expect(result).toBe(mockApi);
  });

  it('should prefer plain apiKey over base64 encoded when both exist', () => {
    const plainApiMock = {
      invoke: { testMethod: vi.fn() },
      onTestEvent: vi.fn(),
    };

    const encodedApiMock = {
      invoke: { oldTestMethod: vi.fn() },
      onOldTestEvent: vi.fn(),
    };

    const apiKey = 'testApi';
    const encodedKey = btoa(apiKey);

    mockWindow[apiKey] = plainApiMock;
    mockWindow[encodedKey] = encodedApiMock;

    const result = getIpcApi(apiKey);
    expect(result).toBe(plainApiMock);
  });

  it('should return null when neither plain nor encoded API key exists', () => {
    const result = getIpcApi('nonExistentApi');
    expect(result).toBeNull();
  });

  it('should use default apiKey when none provided', () => {
    const mockApi = {
      invoke: { testMethod: vi.fn() },
      onTestEvent: vi.fn(),
    };

    mockWindow.ipcApi = mockApi;

    const result = getIpcApi();
    expect(result).toBe(mockApi);
  });

  it('should handle errors gracefully and return null', () => {
    // Mock btoa to throw an error
    vi.stubGlobal('btoa', () => {
      throw new Error('Test error');
    });

    const result = getIpcApi('testApi');
    expect(result).toBeNull();
  });

  it('should log warning when API not found', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getIpcApi('nonExistentApi');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'IPC API not available - running outside Electron context',
    );

    consoleSpy.mockRestore();
  });

  it('should log warning when running in non-renderer context', () => {
    vi.unstubAllGlobals();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getIpcApi('testApi');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'IPC API not available - running in main process or Node.js context',
    );

    consoleSpy.mockRestore();
  });
});
