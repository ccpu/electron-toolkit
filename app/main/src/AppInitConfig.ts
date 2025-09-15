import type { WindowConfig } from './types';

export interface AppInitConfig {
  preload: {
    path: string;
  };

  renderer:
    | {
        path: string;
      }
    | URL;

  windows: Record<string, WindowConfig>;
}
