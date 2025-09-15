import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIpcBridge } from '../src/create-ipc-bridge';
import { defineArguments } from '../src/define-arguments';

// Mock electron modules
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

const mockWindow = {} as any;

describe('createIpcBridge with contextBridge', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

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

  it('should create bridge with both handlers and events', () => {
    const bridge = createIpcBridge({
      apiKey: 'testApi',
      handlers: {
        'process-data': (_event, title: string, message: string) => ({
          success: true,
          title,
          message,
        }),
      },
      events: {
        'data-updated': defineArguments<[data: { id: string; value: any }]>(),
      },
    });

    expect(bridge.exposeInPreload).toBeDefined();
    expect(bridge.registerMainHandlers).toBeDefined();
    expect(bridge.send).toBeDefined();
    expect(bridge.invoke).toBeDefined();
  });

  it('should expose API with invoke methods and event listeners', () => {
    const bridge = createIpcBridge({
      apiKey: 'testApi',
      handlers: {
        'process-data': (_event, title: string, message: string) => ({
          success: true,
          title,
          message,
        }),
      },
      events: {
        'data-updated': defineArguments<[data: { id: string; value: any }]>(),
      },
    });

    const exposedApi = bridge.exposeInPreload(mockIpcRenderer as any);

    // Should have direct invoke methods
    expect(exposedApi.processData).toBeDefined();
    expect(typeof exposedApi.processData).toBe('function');

    // Should have invoke object for structured access
    expect(exposedApi.invoke).toBeDefined();
    expect(exposedApi.invoke.processData).toBeDefined();
    expect(typeof exposedApi.invoke.processData).toBe('function');

    // Should have event listeners
    expect(exposedApi.onDataUpdated).toBeDefined();
    expect(typeof exposedApi.onDataUpdated).toBe('function');
  });

  it('should work when exposed via contextBridge.exposeInMainWorld', () => {
    const bridge = createIpcBridge({
      apiKey: 'testApi',
      handlers: {
        'process-data': (_event, title: string, message: string) => ({
          success: true,
          title,
          message,
        }),
      },
      events: {
        'data-updated': defineArguments<[data: { id: string; value: any }]>(),
      },
    });

    const exposedApi = bridge.exposeInPreload(mockIpcRenderer as any);

    // Simulate contextBridge.exposeInMainWorld('testApi', exposedApi)
    mockWindow.testApi = exposedApi;

    // Test direct method access (like window.testApi.processData())
    expect(mockWindow.testApi.processData).toBeDefined();

    // Test structured invoke access (like window.testApi.invoke.processData())
    expect(mockWindow.testApi.invoke.processData).toBeDefined();

    // Test event listeners (like window.testApi.onDataUpdated())
    expect(mockWindow.testApi.onDataUpdated).toBeDefined();
  });

  it('should handle invoke calls through contextBridge API', async () => {
    mockIpcRenderer.invoke.mockResolvedValue({
      success: true,
      title: 'Test',
      message: 'Hello',
    });

    const bridge = createIpcBridge({
      apiKey: 'testApi',
      handlers: {
        'process-data': (_event, title: string, message: string) => ({
          success: true,
          title,
          message,
        }),
      },
    });

    const exposedApi = bridge.exposeInPreload(mockIpcRenderer as any);
    mockWindow.testApi = exposedApi;

    // Test direct method call
    const result1 = await mockWindow.testApi.processData('Test Title', 'Test Message');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      'process-data',
      'Test Title',
      'Test Message',
    );
    expect(result1).toEqual({ success: true, title: 'Test', message: 'Hello' });

    // Test structured invoke call
    const result2 = await mockWindow.testApi.invoke.processData(
      'Test Title 2',
      'Test Message 2',
    );
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      'process-data',
      'Test Title 2',
      'Test Message 2',
    );
    expect(result2).toEqual({ success: true, title: 'Test', message: 'Hello' });
  });

  it('should handle event subscription through contextBridge API', () => {
    const bridge = createIpcBridge({
      apiKey: 'testApi',
      events: {
        'data-updated': defineArguments<[data: { id: string; value: any }]>(),
      },
    });

    const exposedApi = bridge.exposeInPreload(mockIpcRenderer as any);
    mockWindow.testApi = exposedApi;

    const callback = vi.fn();
    const unsubscribe = mockWindow.testApi.onDataUpdated(callback);

    expect(mockIpcRenderer.on).toHaveBeenCalledWith('data-updated', expect.any(Function));
    expect(typeof unsubscribe).toBe('function');

    // Test unsubscribe
    unsubscribe();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
      'data-updated',
      expect.any(Function),
    );
  });

  it('should work with handlers only', () => {
    const bridge = createIpcBridge({
      apiKey: 'testApi',
      handlers: {
        'get-data': (_event, id: string) => ({ id, data: 'some data' }),
      },
    });

    const exposedApi = bridge.exposeInPreload(mockIpcRenderer as any);
    mockWindow.testApi = exposedApi;

    expect(mockWindow.testApi.getData).toBeDefined();
    expect(mockWindow.testApi.invoke.getData).toBeDefined();
  });

  it('should work with events only', () => {
    const bridge = createIpcBridge({
      apiKey: 'testApi',
      events: {
        'status-update': defineArguments<[status: string]>(),
      },
    });

    const exposedApi = bridge.exposeInPreload(mockIpcRenderer as any);
    mockWindow.testApi = exposedApi;

    expect(mockWindow.testApi.onStatusUpdate).toBeDefined();
  });
});
