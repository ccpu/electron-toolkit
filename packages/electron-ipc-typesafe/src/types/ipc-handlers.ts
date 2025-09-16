import type { IpcMainInvokeEvent } from 'electron';
import type { ToCamelCase } from './ipc-common';

// Handler-related types
export interface IpcHandlers {
  [EventName: string]: (event: IpcMainInvokeEvent, ...data: any[]) => any;
}

export type IpcInvoker = (...data: any[]) => Promise<any>;

// Schema-based handler types
export interface HandlerSchema<
  TArgs extends readonly unknown[] = readonly unknown[],
  TReturn = unknown,
> {
  args: TArgs;
  return: TReturn;
}

export interface IpcHandlerSchemas {
  [EventName: string]: HandlerSchema<any, any>;
}

// Convert schema to actual handler function type
export type SchemaToHandler<T extends HandlerSchema> = (
  event: IpcMainInvokeEvent,
  ...args: T['args']
) => T['return'] | Promise<T['return']>;

// Convert handler schemas to invokers
export type TransformSchemasToInvokers<T extends IpcHandlerSchemas> = {
  [K in keyof T as ToCamelCase<K & string>]: (
    ...args: T[K]['args']
  ) => Promise<T[K]['return']>;
};
