import type { BrowserWindow, IpcRenderer } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createIpcEvents } from '../src/create-ipc-events';

vi.mock('../src/get-ipc-api', () => ({
  getIpcApi: vi.fn(),
}));

describe('createIpcEvents', () => {
  let mockBrowserWindow: BrowserWindow;
  let mockIpcRenderer: IpcRenderer;
  let mockGetIpcApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBrowserWindow = {
      webContents: {
        send: vi.fn(),
      },
    } as any;

    mockIpcRenderer = {
      on: vi.fn(),
      removeListener: vi.fn(),
    } as any;

    mockGetIpcApi = vi.fn();
    vi.doMock('../src/get-ipc-api', () => ({
      getIpcApi: mockGetIpcApi,
    }));
  });

  it('should create events bridge with correct structure for EventSchema', () => {
    const events = {
      'test-event': ['string', 'number'] as const,
      'another-event': ['object'] as const,
    };

    const bridge = createIpcEvents('test-api', events);

    expect(bridge).toHaveProperty('exposeInPreload');
    expect(bridge).toHaveProperty('send');
    expect(bridge).toHaveProperty('listeners');
    expect(typeof bridge.exposeInPreload).toBe('function');
    expect(typeof bridge.send).toBe('object');
    expect(typeof bridge.listeners).toBe('object');
  });

  it('should create preload API with onCamelCase method names', () => {
    const events = {
      'test-event': ['string'] as const,
      'kebab-case-event': ['number'] as const,
    };

    const bridge = createIpcEvents('test-api', events);
    const api = bridge.exposeInPreload(mockIpcRenderer);

    expect(api).toHaveProperty('onTestEvent');
    expect(api).toHaveProperty('onKebabCaseEvent');
    expect(typeof api.onTestEvent).toBe('function');
    expect(typeof api.onKebabCaseEvent).toBe('function');
  });

  it('should register event listeners and return unsubscribe function', () => {
    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcEvents('test-api', events);
    const api = bridge.exposeInPreload(mockIpcRenderer);
    const callback = vi.fn();

    const unsubscribe = api.onTestEvent(callback);

    expect(mockIpcRenderer.on).toHaveBeenCalledWith('test-event', expect.any(Function));
    expect(typeof unsubscribe).toBe('function');

    // Test unsubscribe
    unsubscribe();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
      'test-event',
      expect.any(Function),
    );
  });

  it('should call callback when IPC event is received', () => {
    const events = {
      'test-event': ['string', 'number'] as const,
    };

    const bridge = createIpcEvents('test-api', events);
    const api = bridge.exposeInPreload(mockIpcRenderer);
    const callback = vi.fn();

    api.onTestEvent(callback);

    // Get the listener that was registered
    const [[, listener]] = (mockIpcRenderer.on as any).mock.calls;

    // Simulate IPC event
    listener({}, 'test-data', 42); // eslint-disable-line no-magic-numbers

    expect(callback).toHaveBeenCalledWith('test-data', 42); // eslint-disable-line no-magic-numbers
  });

  it('should create send methods with camelCase names', () => {
    const events = {
      'test-event': ['string'] as const,
      'kebab-case-event': ['number'] as const,
    };

    const bridge = createIpcEvents('test-api', events);

    expect(bridge.send).toHaveProperty('testEvent');
    expect(bridge.send).toHaveProperty('kebabCaseEvent');
    expect(typeof bridge.send.testEvent).toBe('function');
    expect(typeof bridge.send.kebabCaseEvent).toBe('function');
  });

  it('should send events to BrowserWindow webContents', () => {
    const events = {
      'test-event': [] as const,
    };

    const bridge = createIpcEvents('test-api', events);
    const testNumber = 123;
    (bridge.send as any).testEvent(mockBrowserWindow, 'test-data', testNumber);

    expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
      'test-event',
      'test-data',
      testNumber,
    );
  });

  it('should create listener methods for renderer context', () => {
    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcEvents('test-api', events);

    expect(bridge.listeners).toHaveProperty('onTestEvent');
    expect(typeof bridge.listeners.onTestEvent).toBe('function');
  });

  it('should create listener methods structure correctly', () => {
    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcEvents('test-api', events);

    expect(bridge.listeners).toHaveProperty('onTestEvent');
    expect(typeof bridge.listeners.onTestEvent).toBe('function');
  });

  it('should create listener methods that would call getIpcApi', () => {
    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcEvents('test-api', events);
    const callback = vi.fn();

    // The listener methods exist and are callable (but will throw in test env)
    expect(typeof bridge.listeners.onTestEvent).toBe('function');
    expect(() => bridge.listeners.onTestEvent(callback)).toThrow();
  });

  it('should handle kebab-case to camelCase conversion correctly', () => {
    const events = {
      'simple-event': ['string'] as const,
      'multi-word-event-name': ['number'] as const,
      single: ['boolean'] as const,
    };

    const bridge = createIpcEvents('test-api', events);

    expect(bridge.send).toHaveProperty('simpleEvent');
    expect(bridge.send).toHaveProperty('multiWordEventName');
    expect(bridge.send).toHaveProperty('single');

    expect(bridge.listeners).toHaveProperty('onSimpleEvent');
    expect(bridge.listeners).toHaveProperty('onMultiWordEventName');
    expect(bridge.listeners).toHaveProperty('onSingle');
  });

  it('should handle empty events object', () => {
    const events = {};

    const bridge = createIpcEvents('test-api', events);
    const api = bridge.exposeInPreload(mockIpcRenderer);

    expect(typeof api).toBe('object');
    expect(Object.keys(api)).toHaveLength(0);
    expect(Object.keys(bridge.send)).toHaveLength(0);
    expect(Object.keys(bridge.listeners)).toHaveLength(0);
  });

  it('should maintain type safety with EventSchema', () => {
    // This test verifies TypeScript types at compile time
    const events = {
      'string-event': ['string'] as const,
      'number-event': ['number', 'boolean'] as const,
      'object-event': [{ name: 'string' }] as const,
    };

    const bridge = createIpcEvents('test-api', events);

    // TypeScript should infer correct types for send methods
    expectTypeOf(bridge.send.stringEvent).toBeFunction();
    expectTypeOf(bridge.send.numberEvent).toBeFunction();
    expectTypeOf(bridge.send.objectEvent).toBeFunction();

    // TypeScript should infer correct types for listener methods
    expectTypeOf(bridge.listeners.onStringEvent).toBeFunction();
    expectTypeOf(bridge.listeners.onNumberEvent).toBeFunction();
    expectTypeOf(bridge.listeners.onObjectEvent).toBeFunction();
  });
});

// Helper function for type testing
function expectTypeOf<T>(_value: T) {
  return {
    toBeFunction: () => expect(typeof _value).toBe('function'),
  };
}
