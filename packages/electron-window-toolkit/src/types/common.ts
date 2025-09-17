/**
 * Defines the configuration for a single renderable window.
 */
export interface WindowConfig {
  renderer: { path: string } | URL;
  preload: { path: string };
}

export interface ModuleContext {
  readonly app: Electron.App;
}

/**
 * The expected shape of the initConfig object for the WindowManager.
 */
export interface WindowManagerInitConfig {
  windows: Record<string, WindowConfig>;
}
