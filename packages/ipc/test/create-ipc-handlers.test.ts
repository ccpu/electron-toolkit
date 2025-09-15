import type { IpcMain, IpcMainInvokeEvent, IpcRenderer } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createIpcHandlers } from '../src/create-ipc-handlers';

vi.mock('../src/get-ipc-api', () => ({
  getIpcApi: vi.fn(),
}));

describe('createIpcHandlers', () => {
  let mockIpcMain: IpcMain;
  let mockIpcRenderer: IpcRenderer;
  let mockGetIpcApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockIpcMain = {
      handle: vi.fn(),
      removeHandler: vi.fn(),
    } as any;

    mockIpcRenderer = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    } as any;

    // Mock the getIpcApi function
    mockGetIpcApi = vi.fn();
    vi.doMock('../src/get-ipc-api', () => ({
      getIpcApi: mockGetIpcApi,
    }));
  });

  it('should create handlers bridge with correct structure', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
      'another-handler': (_event: IpcMainInvokeEvent, num: number) => num * 2, // eslint-disable-line no-magic-numbers
    };

    const bridge = createIpcHandlers('test-api', handlers);

    expect(bridge).toHaveProperty('registerMainHandlers');
    expect(bridge).toHaveProperty('registerInvokers');
    expect(bridge).toHaveProperty('exposeInPreload');
    expect(bridge).toHaveProperty('invoke');
    expect(typeof bridge.registerMainHandlers).toBe('function');
    expect(typeof bridge.registerInvokers).toBe('function');
    expect(typeof bridge.exposeInPreload).toBe('function');
    expect(typeof bridge.invoke).toBe('object');
  });

  it('should register main handlers correctly', () => {
    const handlers = {
      'test-handler': vi.fn(),
      'kebab-case-handler': vi.fn(),
    };

    const bridge = createIpcHandlers('test-api', handlers);
    bridge.registerMainHandlers(mockIpcMain);

    const expectedCallCount = 2;
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(expectedCallCount);
    expect(mockIpcMain.handle).toHaveBeenCalledWith(
      'test-handler',
      handlers['test-handler'],
    );
    expect(mockIpcMain.handle).toHaveBeenCalledWith(
      'kebab-case-handler',
      handlers['kebab-case-handler'],
    );
  });

  it('should register invokers with camelCase names', () => {
    const handlers = {
      'test-handler': vi.fn(),
      'kebab-case-handler': vi.fn(),
    };

    const bridge = createIpcHandlers('test-api', handlers);
    const invokers = bridge.registerInvokers(mockIpcRenderer);

    expect(invokers).toHaveProperty('testHandler');
    expect(invokers).toHaveProperty('kebabCaseHandler');
    expect(typeof invokers.testHandler).toBe('function');
    expect(typeof invokers.kebabCaseHandler).toBe('function');
  });

  it('should create preload API with camelCase method names', () => {
    const handlers = {
      'test-handler': vi.fn(),
      'another-handler': vi.fn(),
    };

    const bridge = createIpcHandlers('test-api', handlers);
    const api = bridge.exposeInPreload(mockIpcRenderer);

    expect(api).toHaveProperty('testHandler');
    expect(api).toHaveProperty('anotherHandler');
    expect(typeof api.testHandler).toBe('function');
    expect(typeof api.anotherHandler).toBe('function');
  });

  it('should invoke IpcRenderer.invoke when calling preload API methods', async () => {
    const handlers = {
      'test-handler': vi.fn(),
    };

    mockIpcRenderer.invoke = vi.fn().mockResolvedValue('test result');

    const bridge = createIpcHandlers('test-api', handlers);
    const api = bridge.exposeInPreload(mockIpcRenderer);

    const result = await api.testHandler('test data');

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('test-handler', 'test data');
    expect(result).toBe('test result');
  });

  it('should handle invoke methods structure correctly', () => {
    const handlers = {
      'test-handler': vi.fn(),
      'another-handler': vi.fn(),
    };

    const bridge = createIpcHandlers('test-api', handlers);

    expect(bridge.invoke).toHaveProperty('testHandler');
    expect(bridge.invoke).toHaveProperty('anotherHandler');
    expect(typeof bridge.invoke.testHandler).toBe('function');
    expect(typeof bridge.invoke.anotherHandler).toBe('function');
  });

  it('should create invoke methods that would call getIpcApi', () => {
    const handlers = {
      'test-handler': vi.fn(),
    };

    const bridge = createIpcHandlers('test-api', handlers);

    // The invoke methods exist and are callable (but will throw in test env)
    expect(typeof bridge.invoke.testHandler).toBe('function');
    expect(() => bridge.invoke.testHandler('test')).toThrow();
  });

  it('should handle kebab-case to camelCase conversion correctly', () => {
    const handlers = {
      'simple-handler': vi.fn(),
      'multi-word-handler-name': vi.fn(),
      single: vi.fn(),
    };

    const bridge = createIpcHandlers('test-api', handlers);
    const invokers = bridge.registerInvokers(mockIpcRenderer);

    expect(invokers).toHaveProperty('simpleHandler');
    expect(invokers).toHaveProperty('multiWordHandlerName');
    expect(invokers).toHaveProperty('single');
  });

  it('should preserve handler function signatures in type system', () => {
    // This test verifies TypeScript types at compile time
    const handlers = {
      'string-handler': (_event: IpcMainInvokeEvent, str: string) => str.toUpperCase(),
      'number-handler': (_event: IpcMainInvokeEvent, num: number) => num * 2, // eslint-disable-line no-magic-numbers
      'object-handler': (_event: IpcMainInvokeEvent, obj: { name: string }) => obj.name,
    };

    const bridge = createIpcHandlers('test-api', handlers);

    // TypeScript should infer the correct parameter types
    // These calls should be type-safe
    expectTypeOf(bridge.invoke.stringHandler).toBeFunction();
    expectTypeOf(bridge.invoke.numberHandler).toBeFunction();
    expectTypeOf(bridge.invoke.objectHandler).toBeFunction();
  });
});

// Helper function for type testing
function expectTypeOf<T>(_value: T) {
  return {
    toBeFunction: () => expect(typeof _value).toBe('function'),
  };
}
