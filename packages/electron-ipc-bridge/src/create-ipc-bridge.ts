import type { IpcMain, IpcRenderer } from 'electron';

import type {
  EventSchema,
  EventSchemaToSenders,
  EventSchemaToSubscribers,
  IpcHandlers,
  IpcInvokers,
  TransformHandlersToInvokers,
} from './types';
import { createIpcSchema } from './create-ipc-schema';

// Overload 1: Both handlers and events provided
export function createIpcBridge<
  THandlers extends IpcHandlers,
  TEventSchema extends EventSchema,
>(config: {
  apiKey: string;
  handlers: THandlers;
  events: TEventSchema;
}): {
  registerMainHandlers: (ipcMain: IpcMain) => void;
  registerInvokers: (ipcRenderer: IpcRenderer) => IpcInvokers;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke: TransformHandlersToInvokers<THandlers>;
  send: EventSchemaToSenders<TEventSchema>;
} & EventSchemaToSubscribers<TEventSchema>;

// Overload 2: Only handlers provided
export function createIpcBridge<THandlers extends IpcHandlers>(config: {
  apiKey: string;
  handlers: THandlers;
  events?: never;
}): {
  registerMainHandlers: (ipcMain: IpcMain) => void;
  registerInvokers: (ipcRenderer: IpcRenderer) => IpcInvokers;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke: TransformHandlersToInvokers<THandlers>;
  send: Record<string, never>;
};

// Overload 3: Only events provided
export function createIpcBridge<TEventSchema extends EventSchema>(config: {
  apiKey: string;
  handlers?: never;
  events: TEventSchema;
}): {
  registerMainHandlers?: never;
  registerInvokers?: never;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke?: never;
  send: EventSchemaToSenders<TEventSchema>;
} & EventSchemaToSubscribers<TEventSchema>;

/**
 * @deprecated Use `createIpcSchema` instead for better modularity and type safety.
 *
 * @example
 * // Instead of:
 * const api = createIpcBridge({ handlers: { 'get-data': handler } });
 *
 * // Use:
 * const api = createIpcSchema({ handlers: { 'get-data': defineHandler<[string], Data>() } });
 * api.registerHandler('get-data', handler);
 */
export function createIpcBridge<
  THandlers extends IpcHandlers = Record<string, never>,
  TEventSchema extends EventSchema = Record<string, never>,
>(config: { apiKey: string; handlers?: THandlers; events?: TEventSchema }): any {
  const { apiKey, handlers, events } = config;

  const hasHandlers = handlers && Object.keys(handlers).length > 0;
  const hasEvents = events && Object.keys(events).length > 0;

  // Convert handlers to schema format for createIpcSchema
  const handlerSchemas: any = {};
  if (hasHandlers) {
    Object.keys(handlers!).forEach((channel) => {
      // Create a placeholder schema since we have actual implementations
      handlerSchemas[channel] = { args: [], return: undefined };
    });
  }

  // Create the schema-based API
  const schema = createIpcSchema({
    apiKey,
    handlers: hasHandlers ? handlerSchemas : undefined,
    events: hasEvents ? events : undefined,
  } as any);

  // Auto-register any handler implementations provided
  if (hasHandlers) {
    Object.entries(handlers!).forEach(([channel, handler]) => {
      if (typeof handler === 'function' && schema.registerHandler) {
        schema.registerHandler(channel, handler);
      }
    });
  }

  // For events-only configuration, ensure proper no-op functions are provided
  if (!hasHandlers && hasEvents) {
    const eventsOnlySchema: any = { ...schema };
    // Remove schema-specific handler registration but keep backward compatibility functions
    delete eventsOnlySchema.registerHandler;
    delete eventsOnlySchema.invoke; // Remove invoke for events-only

    // Ensure no-op functions exist for backward compatibility
    if (!eventsOnlySchema.registerMainHandlers) {
      eventsOnlySchema.registerMainHandlers = () => {};
    }
    if (!eventsOnlySchema.registerInvokers) {
      eventsOnlySchema.registerInvokers = () => ({});
    }

    return eventsOnlySchema;
  }

  return schema;
}
