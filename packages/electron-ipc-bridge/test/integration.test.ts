import type { IpcMainInvokeEvent, IpcRenderer } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import { createIpcBridge } from '../src/create-ipc-bridge';
import { createIpcSchema } from '../src/create-ipc-schema';
import { defineHandler } from '../src/define-handler';

describe('iPC Enhancement Integration Tests', () => {
  it('should demonstrate the dual API approach working together', () => {
    // 1. Simple approach with createIpcBridge (existing functionality)
    const simpleApi = createIpcBridge({
      apiKey: 'simple',
      handlers: {
        'get-data': (_event: IpcMainInvokeEvent, id: string) => ({ id, data: 'test' }),
      },
      events: {
        'data-updated': ['object'] as const,
      },
    });

    // 2. New flexible approach with createIpcSchema
    const complexApi = createIpcSchema({
      apiKey: 'complex',
      handlers: {
        'get-user-data': defineHandler<[userId: string], { id: string; name: string }>(),
        'get-settings': defineHandler<[], { theme: string; language: string }>(),
        'save-file': defineHandler<[path: string, data: Uint8Array], boolean>(),
      },
      events: {
        'user-updated': ['string', 'object'] as const,
      },
    });

    // Both APIs should have similar properties, but different capabilities
    expect(simpleApi).toHaveProperty('registerMainHandlers');
    expect(simpleApi).toHaveProperty('exposeInPreload');
    expect(simpleApi).toHaveProperty('invoke');
    expect(simpleApi).toHaveProperty('send');

    expect(complexApi).toHaveProperty('registerHandler'); // New capability
    expect(complexApi).toHaveProperty('registerMainHandlers');
    expect(complexApi).toHaveProperty('exposeInPreload');
    expect(complexApi).toHaveProperty('invoke');
    expect(complexApi).toHaveProperty('send');

    // Simple API handlers are already registered
    expect(typeof simpleApi.invoke.getData).toBe('function');

    // Complex API requires handler registration
    expect(typeof complexApi.registerHandler).toBe('function');
    expect(typeof complexApi.invoke.getUserData).toBe('function');
    expect(typeof complexApi.invoke.getSettings).toBe('function');
    expect(typeof complexApi.invoke.saveFile).toBe('function');
  });

  it('should allow flexible handler registration with createIpcSchema', () => {
    const api = createIpcSchema({
      apiKey: 'modular',
      handlers: {
        'user-service': defineHandler<[action: string, payload: any], any>(),
        'file-service': defineHandler<[operation: string, params: any], any>(),
        'settings-service': defineHandler<[key: string], any>(),
      },
    });

    // Track registered handlers
    const mockIpcMain = {
      handle: vi.fn(),
    } as any;

    // Register handlers from different modules (simulated)
    api.registerHandler('user-service', (_event, action, payload) => ({
      service: 'user',
      action,
      payload,
      result: 'user-data',
    }));

    api.registerHandler('file-service', (_event, operation, params) => ({
      service: 'file',
      operation,
      params,
      result: 'file-result',
    }));

    api.registerHandler('settings-service', (_event, key) => ({
      service: 'settings',
      key,
      result: 'setting-value',
    }));

    // Register with IpcMain
    api.registerMainHandlers(mockIpcMain);

    // Verify all handlers were registered
    const expectedHandlerCount = 3;
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(expectedHandlerCount);
    expect(mockIpcMain.handle).toHaveBeenCalledWith('user-service', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file-service', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(
      'settings-service',
      expect.any(Function),
    );
  });

  it('should allow late registration of handlers', () => {
    const api = createIpcSchema({
      apiKey: 'late-registration',
      handlers: {
        'early-handler': defineHandler<[data: string], string>(),
        'late-handler': defineHandler<[value: number], number>(),
      },
    });

    const mockIpcMain = {
      handle: vi.fn(),
    } as any;

    // Register early handler
    api.registerHandler('early-handler', (_event, data) => `processed: ${data}`);

    // Register IpcMain first
    api.registerMainHandlers(mockIpcMain);

    // Should have registered the early handler
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(1);
    expect(mockIpcMain.handle).toHaveBeenCalledWith(
      'early-handler',
      expect.any(Function),
    );

    // Register late handler - should be immediately registered since IpcMain is already set
    const multiplier = 2;
    api.registerHandler('late-handler', (_event, value) => value * multiplier);

    // Should now have both handlers registered
    const totalHandlers = 2;
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(totalHandlers);
    expect(mockIpcMain.handle).toHaveBeenCalledWith('late-handler', expect.any(Function));
  });

  it('should maintain type safety across both APIs', () => {
    // Type safety test - these should compile without errors
    const bridgeApi = createIpcBridge({
      apiKey: 'bridge-types',
      handlers: {
        'get-user': (_event: IpcMainInvokeEvent, id: number) => ({ id, name: 'John' }),
      },
    });

    const schemaApi = createIpcSchema({
      apiKey: 'schema-types',
      handlers: {
        'get-user': defineHandler<[id: number], { id: number; name: string }>(),
      },
    });

    // Both should have properly typed invoke methods
    type BridgeInvoker = typeof bridgeApi.invoke.getUser;
    type SchemaInvoker = typeof schemaApi.invoke.getUser;

    // Type assertions - should compile
    const bridgeInvoker: BridgeInvoker = bridgeApi.invoke.getUser;
    const schemaInvoker: SchemaInvoker = schemaApi.invoke.getUser;

    expect(typeof bridgeInvoker).toBe('function');
    expect(typeof schemaInvoker).toBe('function');

    // Register the schema handler
    schemaApi.registerHandler('get-user', (_event, id) => ({ id, name: 'Schema User' }));

    expect(typeof schemaApi.registerHandler).toBe('function');
  });

  it('should provide backward compatibility for existing createIpcBridge usage', () => {
    // All existing patterns should continue to work
    const handlersOnly = createIpcBridge({
      apiKey: 'handlers-only',
      handlers: {
        'test-handler': (_event: IpcMainInvokeEvent, data: string) => data.toUpperCase(),
      },
    });

    const eventsOnly = createIpcBridge({
      apiKey: 'events-only',
      events: {
        'test-event': ['string'] as const,
      },
    });

    const combined = createIpcBridge({
      apiKey: 'combined',
      handlers: {
        'test-handler': (_event: IpcMainInvokeEvent, data: string) => data,
      },
      events: {
        'test-event': ['string'] as const,
      },
    });

    // All should have the expected properties
    expect(handlersOnly).toHaveProperty('registerMainHandlers');
    expect(handlersOnly).toHaveProperty('invoke');
    expect(handlersOnly.invoke).toHaveProperty('testHandler');

    expect(eventsOnly).toHaveProperty('registerMainHandlers'); // no-op for backward compatibility
    expect(eventsOnly).toHaveProperty('send');
    expect(eventsOnly).not.toHaveProperty('invoke'); // events-only shouldn't have invoke

    expect(combined).toHaveProperty('registerMainHandlers');
    expect(combined).toHaveProperty('invoke');
    expect(combined).toHaveProperty('send');
  });

  it('should allow preload exposure to work identically', () => {
    const mockIpcRenderer: IpcRenderer = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    } as any;

    const bridgeApi = createIpcBridge({
      apiKey: 'preload-bridge',
      handlers: {
        'get-data': (_event: IpcMainInvokeEvent, id: string) => ({ id }),
      },
      events: {
        'data-changed': ['string'] as const,
      },
    });

    const schemaApi = createIpcSchema({
      apiKey: 'preload-schema',
      handlers: {
        'get-data': defineHandler<[id: string], { id: string }>(),
      },
      events: {
        'data-changed': ['string'] as const,
      },
    });

    // Register schema handler
    schemaApi.registerHandler('get-data', (_event, id) => ({ id }));

    // Both should expose identical APIs for preload
    const bridgePreload = bridgeApi.exposeInPreload(mockIpcRenderer);
    const schemaPreload = schemaApi.exposeInPreload(mockIpcRenderer);

    // Both should have the same structure
    expect(bridgePreload).toHaveProperty('getData');
    expect(bridgePreload).toHaveProperty('invoke');
    expect(bridgePreload.invoke).toHaveProperty('getData');
    expect(bridgePreload).toHaveProperty('onDataChanged');

    expect(schemaPreload).toHaveProperty('getData');
    expect(schemaPreload).toHaveProperty('invoke');
    expect(schemaPreload.invoke).toHaveProperty('getData');
    expect(schemaPreload).toHaveProperty('onDataChanged');

    // Both should be functions
    expect(typeof bridgePreload.getData).toBe('function');
    expect(typeof schemaPreload.getData).toBe('function');
    expect(typeof bridgePreload.invoke.getData).toBe('function');
    expect(typeof schemaPreload.invoke.getData).toBe('function');
  });
});
