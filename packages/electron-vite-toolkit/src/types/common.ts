export interface RendererConfig {
  path: string;
}

export interface WindowConfig {
  renderer: URL | RendererConfig;
  preload: RendererConfig;
  options: Record<string, Electron.BrowserWindowConstructorOptions>;
}

export interface WindowsConfig {
  windows: Record<string, WindowConfig>;
  renderer: URL | RendererConfig;
  preload: RendererConfig;
}
