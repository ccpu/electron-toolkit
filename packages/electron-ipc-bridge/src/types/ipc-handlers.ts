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

// Convert handler schemas to actual handlers object
export type TransformSchemasToHandlers<T extends IpcHandlerSchemas> = {
  [K in keyof T]: SchemaToHandler<T[K]>;
};

// Convert handler schemas to invokers
export type TransformSchemasToInvokers<T extends IpcHandlerSchemas> = {
  [K in keyof T as ToCamelCase<K & string>]: (
    ...args: T[K]['args']
  ) => Promise<T[K]['return']>;
};
