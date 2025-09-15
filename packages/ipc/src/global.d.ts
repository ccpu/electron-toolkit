import type { appApi } from '@internal/ipc';

declare global {
  interface Window {
    appApi: typeof appApi;
  }
}

export {};
