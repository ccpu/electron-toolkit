import type { IpcRenderer } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import { createIpcSchema } from '../src/create-ipc-schema';
import { defineHandler } from '../src/define-handler';

describe('iPC Enhancement Integration Tests', () => {
  it('should demonstrate the dual API approach working together', () => {
    // New flexible approach with createIpcSchema
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

    expect(complexApi).toHaveProperty('registerHandler'); // New capability
    expect(complexApi).toHaveProperty('registerMainHandlers');
    expect(complexApi).toHaveProperty('exposeInPreload');
    expect(complexApi).toHaveProperty('invoke');
    expect(complexApi).toHaveProperty('send');

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
    const schemaApi = createIpcSchema({
      apiKey: 'schema-types',
      handlers: {
        'get-user': defineHandler<[id: number], { id: number; name: string }>(),
      },
    });

    type SchemaInvoker = typeof schemaApi.invoke.getUser;

    const schemaInvoker: SchemaInvoker = schemaApi.invoke.getUser;

    expect(typeof schemaInvoker).toBe('function');

    // Register the schema handler
    schemaApi.registerHandler('get-user', (_event, id) => ({ id, name: 'Schema User' }));

    expect(typeof schemaApi.registerHandler).toBe('function');
  });

  it('should allow preload exposure to work identically', () => {
    const mockIpcRenderer: IpcRenderer = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    } as any;

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

    const schemaPreload = schemaApi.exposeInPreload(mockIpcRenderer);

    expect(schemaPreload).toHaveProperty('getData');
    expect(schemaPreload).toHaveProperty('invoke');
    expect(schemaPreload.invoke).toHaveProperty('getData');
    expect(schemaPreload.events).toHaveProperty('onDataChanged');

    // Both should be functions
    expect(typeof schemaPreload.getData).toBe('function');
    expect(typeof schemaPreload.invoke.getData).toBe('function');
  });
});
