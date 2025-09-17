import type { WindowConfig } from './types';

export interface AppInitConfig extends WindowConfig {
  windows: Record<string, WindowConfig>;
}
