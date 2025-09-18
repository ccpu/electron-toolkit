import type { WindowConfig } from 'electron-window-toolkit';

export interface AppInitConfig extends WindowConfig {
  windows: Record<string, WindowConfig>;
}
