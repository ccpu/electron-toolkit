import type { IpcMain, IpcRenderer } from 'electron';

import type {
  EventSchema,
  EventSchemaToSenders,
  EventSchemaToSubscribers,
  IpcHandlerSchemas,
  SchemaToHandler,
  TransformSchemasToInvokers,
} from './types';

import { createIpcEvents } from './create-ipc-events';
import { createIpcHandlers } from './create-ipc-handlers';

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
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke: TransformSchemasToInvokers<THandlerSchemas>;
  send: EventSchemaToSenders<TEventSchema>;
  events: EventSchemaToSubscribers<TEventSchema>;
};

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
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke?: never;
  send: EventSchemaToSenders<TEventSchema>;
  events: EventSchemaToSubscribers<TEventSchema>;
};

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

  const handlersApi =
    handlers && Object.keys(handlers).length > 0
      ? createIpcHandlers(apiKey, handlers)
      : null;

  // Create events API if events are provided
  const eventsApi =
    events && Object.keys(events).length > 0 ? createIpcEvents(apiKey, events) : null;

  // Enhanced preload exposure
  const exposeInPreload = (ipcRenderer: IpcRenderer) => {
    const api: any = {};

    // Add invokers for handler schemas
    if (handlersApi) {
      Object.assign(api, handlersApi.getExposeInPreloadHandlersPart(ipcRenderer));
    }

    // Add listeners for renderer events
    if (eventsApi) {
      const eventsPreload = eventsApi.exposeInPreload(ipcRenderer);
      api.events = eventsPreload;
    }

    return api;
  };

  const invoke = handlersApi ? handlersApi.getInvokeObject() : ({} as any);

  // Build the final API object
  const result: any = {
    exposeInPreload,
  };

  const hasHandlers = handlers && Object.keys(handlers).length > 0;
  const hasEvents = eventsApi !== null;

  // Add handler-related properties if handlers are provided
  if (hasHandlers) {
    result.registerHandler = handlersApi!.registerHandler;
    result.registerMainHandlers = handlersApi!.registerMainHandlers;
    result.registerInvokers = handlersApi!.registerInvokers;
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
    result.events = eventsApi.listeners;
  } else {
    result.send = {};
    result.events = {};
  }

  return result;
}
