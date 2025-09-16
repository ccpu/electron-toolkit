import type { appApi } from './app-api';

declare global {
  interface Window {
    appApi: typeof appApi;
  }
}

export {};
