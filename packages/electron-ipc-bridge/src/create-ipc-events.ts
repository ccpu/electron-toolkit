import type { BrowserWindow, IpcRenderer } from 'electron';
import type {
  EventSchema,
  EventSchemaToSenders,
  EventSchemaToSubscribers,
} from './types';
import { camelCase } from 'change-case';
import { getIpcApi } from './get-ipc-api';

// Overload 1: Using event schema (recommended)
export function createIpcEvents<TEventSchema extends EventSchema>(
  apiKey: string,
  events: TEventSchema,
): {
  exposeInPreload: (ipcRenderer: IpcRenderer) => any;
  send: EventSchemaToSenders<TEventSchema>;
  listeners: EventSchemaToSubscribers<TEventSchema>;
};

// Implementation
export function createIpcEvents<TEventSchema extends EventSchema>(
  apiKey: string,
  events: TEventSchema,
): any {
  const eventEntries = Object.entries(events);

  // Create send object for main process use
  const send = {} as any;
  eventEntries.forEach(([channel]) => {
    (send as any)[camelCase(channel)] = (win: BrowserWindow, ...data: any[]) => {
      win.webContents.send(channel, ...data);
    };
  });

  // Create listener methods for renderer use
  const listeners = {} as any;
  eventEntries.forEach(([channel]) => {
    const onMethodName = `on${camelCase(channel).charAt(0).toUpperCase() + camelCase(channel).slice(1)}`;
    (listeners as any)[onMethodName] = (callback: (...data: any[]) => void) => {
      const api = getIpcApi(apiKey);
      if (!api) {
        throw new Error(
          `IPC with API key ${apiKey} not available, make sure you are in an Electron renderer process, and exposeInPreload has been called in the preload script and '${apiKey}' key exported`,
        );
      }
      return (api as any)[onMethodName](callback);
    };
  });

  // Enhanced preload exposure that includes listeners
  const exposeInPreload = (ipcRenderer: IpcRenderer) => {
    const api: any = {};

    // Add listeners for renderer events
    eventEntries.forEach(([channel]) => {
      const onMethodName = `on${camelCase(channel).charAt(0).toUpperCase() + camelCase(channel).slice(1)}`;
      api[onMethodName] = (callback: (...data: any[]) => void) => {
        const listener = (_event: any, ...args: any[]) => callback(...args);
        ipcRenderer.on(channel, listener);

        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, listener);
        };
      };
    });

    return api;
  };

  return {
    exposeInPreload,
    send,
    listeners,
  };
}
