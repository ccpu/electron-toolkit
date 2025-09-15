import type { BrowserWindow } from 'electron';
import type { ToCamelCase } from './ipc-common';

// Event schema definition (declarative approach)
export interface EventSchema {
  [EventName: string]: readonly any[];
}

export type EventSchemaToSenders<T extends EventSchema> = {
  [K in keyof T as ToCamelCase<K & string>]: (win: BrowserWindow, ...args: T[K]) => void;
};

export type EventSchemaToSubscribers<T extends EventSchema> = {
  [K in keyof T as `on${Capitalize<ToCamelCase<K & string>>}`]: (
    callback: (...args: T[K]) => void,
  ) => () => void;
};
