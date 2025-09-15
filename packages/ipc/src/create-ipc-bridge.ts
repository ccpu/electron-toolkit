import type { IpcMain, IpcRenderer } from 'electron';
import type {
  EventSchema,
  EventSchemaToSenders,
  EventSchemaToSubscribers,
  IpcHandlers,
  IpcInvokers,
  TransformHandlersToInvokers,
} from './types';
import { createIpcEvents } from './create-ipc-events';
import { createIpcHandlers } from './create-ipc-handlers';

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

// Implementation
export function createIpcBridge<
  THandlers extends IpcHandlers = Record<string, never>,
  TEventSchema extends EventSchema = Record<string, never>,
>(config: { apiKey: string; handlers?: THandlers; events?: TEventSchema }): any {
  const { apiKey, handlers, events } = config;

  if (
    (!handlers || Object.keys(handlers).length === 0) &&
    (!events || Object.keys(events).length === 0)
  ) {
    throw new Error('At least one of handlers or events must be provided');
  }

  // Create handlers and events using the separate functions
  const handlersApi =
    handlers && Object.keys(handlers).length > 0
      ? createIpcHandlers(apiKey, handlers)
      : null;

  const eventsApi =
    events && Object.keys(events).length > 0 ? createIpcEvents(apiKey, events) : null;

  // Enhanced preload exposure that includes both invokers and listeners
  const exposeInPreload = (ipcRenderer: IpcRenderer) => {
    const api: any = {};

    // Add invokers for main handlers
    if (handlersApi) {
      const handlersPreload = handlersApi.exposeInPreload(ipcRenderer);
      Object.assign(api, handlersPreload);

      // Also add the invoke object for structured access
      api.invoke = handlersPreload;
    }

    // Add listeners for renderer events
    if (eventsApi) {
      const eventsPreload = eventsApi.exposeInPreload(ipcRenderer);
      Object.assign(api, eventsPreload);
    }

    return api;
  };

  // Build the final API object
  const result: any = {
    exposeInPreload,
  };

  // Add handler-related properties if handlers are provided
  if (handlersApi) {
    result.registerMainHandlers = handlersApi.registerMainHandlers;
    result.registerInvokers = handlersApi.registerInvokers;
    result.invoke = handlersApi.invoke;
  } else {
    // If no handlers, provide no-op functions for backward compatibility
    result.registerInvokers = () => ({});
    result.registerMainHandlers = () => {};
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
