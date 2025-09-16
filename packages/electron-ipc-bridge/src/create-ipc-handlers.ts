import type { IpcMain, IpcRenderer } from 'electron';
import type { IpcHandlers, IpcInvokers, TransformHandlersToInvokers } from './types';
import { camelCase } from 'change-case';
import { getIpcApi } from './get-ipc-api';

export function createIpcHandlers<THandlers extends IpcHandlers>(
  apiKey: string,
  handlers: THandlers,
): {
  registerMainHandlers: (ipcMain: IpcMain) => void;
  registerInvokers: (ipcRenderer: IpcRenderer) => IpcInvokers;
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  invoke: TransformHandlersToInvokers<THandlers>;
} {
  const handlerEntries = Object.entries(handlers);

  // Register handlers in main process
  const registerMainHandlers = (ipcMain: IpcMain) => {
    handlerEntries.forEach(([channel, handler]) => ipcMain.handle(channel, handler));
  };

  // Register invokers in preload (legacy support)
  const registerInvokers = (ipcRenderer: IpcRenderer) => {
    const invokerEntries: IpcInvokers = {};
    handlerEntries.forEach(([channel]) => {
      invokerEntries[camelCase(channel)] = (...data) =>
        ipcRenderer.invoke(channel, ...data);
    });
    return invokerEntries;
  };

  // Enhanced preload exposure
  const exposeInPreload = (ipcRenderer: IpcRenderer) => {
    const api: any = {};

    // Add invokers for main handlers
    handlerEntries.forEach(([channel]) => {
      api[camelCase(channel)] = (...data: any[]) => ipcRenderer.invoke(channel, ...data);
    });

    return api;
  };

  // Create invoke object for renderer use
  const invoke = {} as TransformHandlersToInvokers<THandlers>;
  handlerEntries.forEach(([channel]) => {
    (invoke as any)[camelCase(channel)] = (...data: any) => {
      const api = getIpcApi(apiKey);
      if (!api)
        throw new Error(
          `IPC with API key ${apiKey} not available, make sure you are in an Electron renderer process, and exposeInPreload has been called in the preload script and '${apiKey}' key exported`,
        );
      return (api as any)[camelCase(channel)](...data);
    };
  });

  return {
    registerMainHandlers,
    registerInvokers, // Keep for backward compatibility
    exposeInPreload,
    invoke,
  };
}
