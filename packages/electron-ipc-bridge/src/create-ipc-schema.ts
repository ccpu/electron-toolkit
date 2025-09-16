import type { IpcMain, IpcRenderer } from 'electron';

import type {
  EventSchema,
  EventSchemaToSenders,
  EventSchemaToSubscribers,
  IpcHandlerSchemas,
  IpcInvokers,
  SchemaToHandler,
  TransformSchemasToInvokers,
} from './types';
import { camelCase } from 'change-case';

import { createIpcEvents } from './create-ipc-events';
import { getIpcApi } from './get-ipc-api';

// Overload 1: Both handler schemas and events provided
export function createIpcSchema<
  THandlerSchemas extends IpcHandlerSchemas,
  TEventSchema extends EventSchema,
>(config: {
  apiKey: string;
  handlers: THandlerSchemas;
  events: TEventSchema;
}): {
  registerHandler: <K extends keyof THandlerSchemas>(
    channel: K,
    handler: SchemaToHandler<THandlerSchemas[K]>,
  ) => () => void;
  registerMainHandlers: (ipcMain: IpcMain) => void;
  registerInvokers: (ipcRenderer: IpcRenderer) => IpcInvokers;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke: TransformSchemasToInvokers<THandlerSchemas>;
  send: EventSchemaToSenders<TEventSchema>;
} & EventSchemaToSubscribers<TEventSchema>;

// Overload 2: Only handler schemas provided
export function createIpcSchema<THandlerSchemas extends IpcHandlerSchemas>(config: {
  apiKey: string;
  handlers: THandlerSchemas;
  events?: never;
}): {
  registerHandler: <K extends keyof THandlerSchemas>(
    channel: K,
    handler: SchemaToHandler<THandlerSchemas[K]>,
  ) => () => void;
  registerMainHandlers: (ipcMain: IpcMain) => void;
  registerInvokers: (ipcRenderer: IpcRenderer) => IpcInvokers;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke: TransformSchemasToInvokers<THandlerSchemas>;
  send: Record<string, never>;
};

// Overload 3: Only events provided
export function createIpcSchema<TEventSchema extends EventSchema>(config: {
  apiKey: string;
  handlers?: never;
  events: TEventSchema;
}): {
  registerHandler?: never;
  registerMainHandlers?: never;
  registerInvokers?: never;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke?: never;
  send: EventSchemaToSenders<TEventSchema>;
} & EventSchemaToSubscribers<TEventSchema>;

// Implementation
export function createIpcSchema<
  THandlerSchemas extends IpcHandlerSchemas = Record<string, never>,
  TEventSchema extends EventSchema = Record<string, never>,
>(config: { apiKey: string; handlers?: THandlerSchemas; events?: TEventSchema }): any {
  const { apiKey, handlers, events } = config;

  if (
    (!handlers || Object.keys(handlers).length === 0) &&
    (!events || Object.keys(events).length === 0)
  ) {
    throw new Error('At least one of handlers or events must be provided');
  }

  // Store registered handlers
  const registeredHandlers: Record<string, any> = {};
  let ipcMainInstance: IpcMain | null = null;

  // Register a handler implementation
  const registerHandler = <K extends keyof THandlerSchemas>(
    channel: K,
    handler: SchemaToHandler<THandlerSchemas[K]>,
  ): (() => void) => {
    const channelStr = channel as string;
    registeredHandlers[channelStr] = handler;

    // If main IPC is already registered, immediately register this handler
    if (ipcMainInstance) {
      ipcMainInstance.handle(channelStr, handler);
    }

    // Return cleanup function
    return () => {
      // Remove from registered handlers
      delete registeredHandlers[channelStr];

      // Remove from ipcMain if it's registered
      if (ipcMainInstance) {
        ipcMainInstance.removeHandler(channelStr);
      }
    };
  };

  // Register all handlers with IpcMain
  const registerMainHandlers = (ipcMain: IpcMain) => {
    ipcMainInstance = ipcMain;

    // Register any already-registered handlers
    Object.entries(registeredHandlers).forEach(([channel, handler]) => {
      ipcMain.handle(channel, handler);
    });
  };

  // Create events API if events are provided
  const eventsApi =
    events && Object.keys(events).length > 0 ? createIpcEvents(apiKey, events) : null;

  // Register invokers in preload (legacy support)
  const registerInvokers = (ipcRenderer: IpcRenderer) => {
    const invokerEntries: IpcInvokers = {};

    if (handlers) {
      Object.keys(handlers).forEach((channel) => {
        invokerEntries[camelCase(channel)] = (...data) =>
          ipcRenderer.invoke(channel, ...data);
      });
    }

    return invokerEntries;
  };

  // Enhanced preload exposure
  const exposeInPreload = (ipcRenderer: IpcRenderer) => {
    const api: any = {};

    // Add invokers for handler schemas
    if (handlers) {
      const invokeObj: any = {};
      Object.keys(handlers).forEach((channel) => {
        const invoker = (...data: any[]) => ipcRenderer.invoke(channel, ...data);
        api[camelCase(channel)] = invoker;
        invokeObj[camelCase(channel)] = invoker;
      });

      // Add the invoke object for structured access (backward compatibility)
      api.invoke = invokeObj;
    }

    // Add listeners for renderer events
    if (eventsApi) {
      const eventsPreload = eventsApi.exposeInPreload(ipcRenderer);
      Object.assign(api, eventsPreload);
    }

    return api;
  };

  // Create invoke object for renderer use
  const invoke = {} as TransformSchemasToInvokers<THandlerSchemas>;
  if (handlers) {
    Object.keys(handlers).forEach((channel) => {
      (invoke as any)[camelCase(channel)] = (...data: any) => {
        const api = getIpcApi(apiKey);
        if (!api)
          throw new Error(
            `IPC with API key ${apiKey} not available, make sure you are in an Electron renderer process, and exposeInPreload has been called in the preload script and '${apiKey}' key exported`,
          );
        return (api as any)[camelCase(channel)](...data);
      };
    });
  }

  // Build the final API object
  const result: any = {
    exposeInPreload,
  };

  const hasHandlers = handlers && Object.keys(handlers).length > 0;
  const hasEvents = eventsApi !== null;

  // Add handler-related properties if handlers are provided
  if (hasHandlers) {
    result.registerHandler = registerHandler;
    result.registerMainHandlers = registerMainHandlers;
    result.registerInvokers = registerInvokers;
    result.invoke = invoke;
  } else {
    // Always provide no-op functions for backward compatibility
    result.registerInvokers = () => ({});
    result.registerMainHandlers = () => {};
    // Only add invoke if it's not an events-only scenario
    if (!hasEvents) {
      result.invoke = {};
    }
  }

  // Add event-related properties if events are provided
  if (eventsApi) {
    result.send = eventsApi.send;
    Object.assign(result, eventsApi.listeners);
  } else {
    result.send = {};
  }

  return result;
}
