import type { IpcMainInvokeEvent, IpcRenderer } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createIpcSchema } from '../src/create-ipc-schema';
import { defineHandler } from '../src/define-handler';

describe('createIpcSchema', () => {
  let mockIpcRenderer: IpcRenderer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockIpcRenderer = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    } as any;

    vi.doMock('../src/get-ipc-api', () => ({
      getIpcApi: vi.fn().mockReturnValue(null),
    }));
  });

  it('should create schema with handler definitions', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
      'save-settings': defineHandler<[settings: object], boolean>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    expect(schema).toHaveProperty('registerHandler');
    expect(schema).toHaveProperty('registerMainHandlers');
    expect(schema).toHaveProperty('registerInvokers');
    expect(schema).toHaveProperty('exposeInPreload');
    expect(schema).toHaveProperty('invoke');
    expect(schema).toHaveProperty('send');
    expect(typeof schema.registerHandler).toBe('function');
  });

  it('should work with events only', () => {
    const events = {
      'user-updated': ['string', 'object'] as const,
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      events,
    });

    expect(schema).toHaveProperty('exposeInPreload');
    expect(schema).toHaveProperty('send');
    expect(schema).not.toHaveProperty('registerHandler');
    // createIpcSchema provides these for consistency, unlike createIpcBridge which removes them
    expect(schema).toHaveProperty('registerMainHandlers');
    expect(schema).toHaveProperty('registerInvokers');
    expect(schema).not.toHaveProperty('invoke'); // No invoke for events-only
  });

  it('should combine handlers and events', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const events = {
      'user-updated': ['string', 'object'] as const,
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
      events,
    });

    expect(schema).toHaveProperty('registerHandler');
    expect(schema).toHaveProperty('registerMainHandlers');
    expect(schema).toHaveProperty('exposeInPreload');
    expect(schema).toHaveProperty('invoke');
    expect(schema).toHaveProperty('send');
    expect(schema).toHaveProperty('onUserUpdated');
  });

  it('should allow registering handlers after creation', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
      'save-data': defineHandler<[data: string], boolean>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockHandler = vi.fn((_event: IpcMainInvokeEvent, userId: string) => ({
      id: userId,
      name: 'John Doe',
    }));

    // Should not throw and should return a function
    const cleanup = schema.registerHandler('get-user', mockHandler);
    expect(typeof cleanup).toBe('function');

    // Should store the handler
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should register handlers with IpcMain when registerMainHandlers is called', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockIpcMain = {
      handle: vi.fn(),
    } as any;

    const mockHandler = vi.fn();
    schema.registerHandler('get-user', mockHandler);

    schema.registerMainHandlers(mockIpcMain);

    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-user', mockHandler);
  });

  it('should register handlers immediately if IpcMain is already registered', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockIpcMain = {
      handle: vi.fn(),
    } as any;

    // Register IpcMain first
    schema.registerMainHandlers(mockIpcMain);

    const mockHandler = vi.fn();

    // This should immediately register with IpcMain
    schema.registerHandler('get-user', mockHandler);

    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-user', mockHandler);
  });

  it('should expose handlers in preload', () => {
    const handlers = {
      'get-user-data': defineHandler<[userId: string], { id: string; name: string }>(),
      'save-settings': defineHandler<[settings: object], boolean>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const api = schema.exposeInPreload(mockIpcRenderer);

    expect(api).toHaveProperty('getUserData');
    expect(api).toHaveProperty('saveSettings');
    expect(typeof api.getUserData).toBe('function');
    expect(typeof api.saveSettings).toBe('function');
  });

  it('should create type-safe invoke object', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    expect(schema.invoke).toHaveProperty('getUser');
    expect(typeof schema.invoke.getUser).toBe('function');
  });

  it('should throw error when no handlers or events provided', () => {
    expect(() => {
      createIpcSchema({
        apiKey: 'test-api',
      } as any);
    }).toThrow('At least one of handlers or events must be provided');
  });

  it('should handle empty handlers object', () => {
    expect(() => {
      createIpcSchema({
        apiKey: 'test-api',
        handlers: {},
      } as any);
    }).toThrow('At least one of handlers or events must be provided');
  });

  it('should return a cleanup function from registerHandler', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockHandler = vi.fn((_event: IpcMainInvokeEvent, userId: string) => ({
      id: userId,
      name: 'John Doe',
    }));

    const cleanup = schema.registerHandler('get-user', mockHandler);

    expect(typeof cleanup).toBe('function');
  });

  it('should remove handler from registeredHandlers when cleanup is called', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockIpcMain = {
      handle: vi.fn(),
      removeHandler: vi.fn(),
    } as any;

    // Register IpcMain first
    schema.registerMainHandlers(mockIpcMain);

    const mockHandler = vi.fn();
    const cleanup = schema.registerHandler('get-user', mockHandler);

    // Verify handler was registered
    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-user', mockHandler);

    // Call cleanup
    cleanup();

    // Verify handler was removed from ipcMain
    expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('get-user');
  });

  it('should call ipcMain.removeHandler when cleanup is called and ipcMain is registered', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockIpcMain = {
      handle: vi.fn(),
      removeHandler: vi.fn(),
    } as any;

    // Register IpcMain first
    schema.registerMainHandlers(mockIpcMain);

    const mockHandler = vi.fn();
    const cleanup = schema.registerHandler('get-user', mockHandler);

    // Call cleanup
    cleanup();

    expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('get-user');
  });

  it('should not call ipcMain.removeHandler when cleanup is called but ipcMain is not registered', () => {
    const handlers = {
      'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
    };

    const schema = createIpcSchema({
      apiKey: 'test-api',
      handlers,
    });

    const mockHandler = vi.fn();
    const cleanup = schema.registerHandler('get-user', mockHandler);

    // Call cleanup without registering ipcMain
    cleanup();

    // Since ipcMain is not registered, removeHandler should not be called
    // This test verifies that the cleanup function doesn't throw when ipcMain is null
  });
});
