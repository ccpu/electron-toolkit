import type { IpcMainInvokeEvent } from 'electron';
import type { RemoveFirstParameter, ToCamelCase } from './ipc-common';

// Handler-related types
export interface IpcHandlers {
  [EventName: string]: (event: IpcMainInvokeEvent, ...data: any[]) => any;
}

export type IpcInvoker = (...data: any[]) => Promise<any>;

export interface IpcInvokers {
  [EventName: string]: IpcInvoker;
}

export type TransformHandlersToInvokers<T extends IpcHandlers> = {
  [K in keyof T as ToCamelCase<K & string>]: RemoveFirstParameter<T[K]>;
};
