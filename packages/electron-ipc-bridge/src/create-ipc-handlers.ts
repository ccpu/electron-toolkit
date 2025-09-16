import type { IpcMain, IpcRenderer } from 'electron';

import type {
  IpcHandlerSchemas,
  SchemaToHandler,
  TransformSchemasToInvokers,
} from './types';
import { camelCase } from 'change-case';

import { getIpcApi } from './get-ipc-api';

export function createIpcHandlers<THandlerSchemas extends IpcHandlerSchemas>(
  apiKey: string,
  handlers: THandlerSchemas,
): {
  registerHandler: <K extends keyof THandlerSchemas>(
    channel: K,
    handler: SchemaToHandler<THandlerSchemas[K]>,
  ) => () => void;
  registerMainHandlers: (ipcMain: IpcMain) => void;
  registerInvokers: (ipcRenderer: IpcRenderer) => any;
  getInvokeObject: () => TransformSchemasToInvokers<THandlerSchemas>;
  getExposeInPreloadHandlersPart: (ipcRenderer: IpcRenderer) => any;
} {
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

  // Register invokers in preload (legacy support)
  const registerInvokers = (ipcRenderer: IpcRenderer) => {
    const invokerEntries: any = {};

    Object.keys(handlers).forEach((channel) => {
      invokerEntries[camelCase(channel)] = (...data: any[]) =>
        ipcRenderer.invoke(channel, ...data);
    });

    return invokerEntries;
  };

  // Get invoke object for renderer use
  const getInvokeObject = (): TransformSchemasToInvokers<THandlerSchemas> => {
    const invoke = {} as TransformSchemasToInvokers<THandlerSchemas>;
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
    return invoke;
  };

  // Get the handlers part for exposeInPreload
  const getExposeInPreloadHandlersPart = (ipcRenderer: IpcRenderer) => {
    const api: any = {};
    const invokeObj: any = {};

    Object.keys(handlers).forEach((channel) => {
      const invoker = (...data: any[]) => ipcRenderer.invoke(channel, ...data);
      api[camelCase(channel)] = invoker;
      invokeObj[camelCase(channel)] = invoker;
    });

    // Add the invoke object for structured access (backward compatibility)
    api.invoke = invokeObj;

    return api;
  };

  return {
    registerHandler,
    registerMainHandlers,
    registerInvokers,
    getInvokeObject,
    getExposeInPreloadHandlersPart,
  };
}
