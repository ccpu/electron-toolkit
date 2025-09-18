import type { ModuleContext, WindowConfig, WindowOptions } from './types/common';
import type { ZoomManager } from './ZoomManager';

import process from 'node:process';
import deepmerge from '@fastify/deepmerge';

import { BrowserWindow } from 'electron';
import { WindowStateManager } from './WindowStateManager';
import { createZoomManager } from './ZoomManager';

const WINDOW_LOAD_TIMEOUT_MS = 1000; // 1 second timeout

/**
 * The expected shape of the initConfig object for the WindowManager.
 */
interface WindowManagerInitConfig {
  mainWindowName?: string;
  windows: Record<string, WindowConfig>;
}

class WindowManager {
  /** Stores all available window configurations, keyed by name. */
  readonly #windowConfigs: Record<string, WindowConfig>;
  readonly #openDevTools: boolean;
  /** Stores WindowStateManager instances for each window type */
  readonly #windowStateManagers: Record<string, WindowStateManager> = {};
  /** Registry of created windows, keyed by window name */
  readonly #windowRegistry: Map<string, BrowserWindow> = new Map();
  /** Handles zoom functionality for all windows */
  readonly #zoomManager: ZoomManager;

  readonly #mainWindowName: string;
  readonly #mainWindowOptions: WindowOptions | undefined;
  readonly #defaultWindowOptions: WindowOptions | undefined;

  constructor({
    initConfig,
    openDevTools = false,
    mainWindowOptions,
    defaultWindowOptions,
  }: {
    initConfig: WindowManagerInitConfig;
    openDevTools?: boolean;
    mainWindowOptions?: WindowOptions;
    defaultWindowOptions?: WindowOptions;
  }) {
    this.#windowConfigs = initConfig.windows;
    this.#openDevTools = openDevTools;
    this.#zoomManager = createZoomManager();
    this.#mainWindowName = initConfig.mainWindowName ?? 'main';
    this.#mainWindowOptions = mainWindowOptions;
    this.#defaultWindowOptions = defaultWindowOptions;
  }

  /**
   * Gets or creates a WindowStateManager for the specified window name.
   */
  private getWindowStateManager(windowName: string): WindowStateManager {
    if (!this.#windowStateManagers[windowName]) {
      this.#windowStateManagers[windowName] = new WindowStateManager({
        file: `${windowName}-window-state.json`,
        path: process.cwd(),
      });
    }
    return this.#windowStateManagers[windowName]!;
  }

  async init({ app }: ModuleContext): Promise<BrowserWindow> {
    await app.whenReady();

    // Create the main window on startup
    const mainWindow = await this.restoreOrCreateWindow(true);

    // Re-create main window if app is activated and no windows are open (macOS)
    app.on('activate', () => this.restoreOrCreateWindow(true));

    // Focus existing main window if a second instance is started
    app.on('second-instance', () => this.restoreOrCreateWindow(true));

    return mainWindow;
  }

  async getWindow(windowName: string): Promise<BrowserWindow | undefined> {
    const registeredWindow = this.#windowRegistry.get(windowName);

    // If we have a registered window and it's not destroyed, return it
    if (registeredWindow && !registeredWindow.isDestroyed()) {
      return registeredWindow;
    }

    // If the registered window was destroyed, clean it up from registry
    if (registeredWindow && registeredWindow.isDestroyed()) {
      this.#windowRegistry.delete(windowName);
    }

    return undefined;
  }

  async openWindow(name: string, options?: WindowOptions): Promise<BrowserWindow> {
    const win = (await this.getWindow(name)) ?? (await this.createWindow(name, options));
    win.show();
    win.focus();
    return win;
  }

  /**
   * Creates a new BrowserWindow based on a named configuration.
   * @param windowName The key for the window configuration (e.g., 'main', 'settings').
   */
  async createWindow(
    windowName: string,
    options?: WindowOptions,
  ): Promise<BrowserWindow> {
    const config = this.#windowConfigs[windowName];
    if (!config) {
      throw new Error(
        `[WindowManager] Configuration for window "${windowName}" not found.`,
      );
    }

    /**
     * Get window state manager first to use saved dimensions during creation.
     * Each window gets its own WindowStateManager with a unique state file.
     */
    const windowStateManager = this.getWindowStateManager(windowName);

    // Create a deepmerge function for merging options
    const merge = deepmerge();

    // Base options for all windows
    const baseOptions: WindowOptions = {
      show: false, // Use 'ready-to-show' event to show the window gracefully
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Required for preload scripts that use Node.js APIs
        webviewTag: false,
        preload: config.preload.path,
        // Give each window its own session to prevent zoom sharing
        partition: `window-${windowName}`,
      },
    };

    // Merge options in steps: base -> default -> specific
    const withDefaults = merge(baseOptions, this.#defaultWindowOptions || {});
    const mergedOptions = merge(withDefaults, options || {});

    const browserWindow = new BrowserWindow({
      ...mergedOptions,
      x: windowStateManager.x || mergedOptions.x,
      y: windowStateManager.y || mergedOptions.y,
      width: windowStateManager.width || mergedOptions.width,
      height: windowStateManager.height || mergedOptions.height,
      webPreferences: {
        ...mergedOptions.webPreferences,
        zoomFactor:
          windowStateManager.zoomFactor ?? mergedOptions.webPreferences?.zoomFactor,
      },
    });

    // Manage window state (this will set up event listeners for state changes)
    windowStateManager.manage(browserWindow);

    // Register window with zoom manager for zoom functionality
    this.#zoomManager.registerWindow(browserWindow, windowName, windowStateManager);

    // Register window in our registry for quick lookup
    this.#windowRegistry.set(windowName, browserWindow);

    // Clean up registry when window is closed
    browserWindow.on('closed', () => {
      this.#windowRegistry.delete(windowName);
    });

    // Load the renderer content
    if (config.renderer instanceof URL) {
      await browserWindow.loadURL(config.renderer.href);
    } else {
      await browserWindow.loadFile(config.renderer.path);
    }

    const showWindow = () => {
      if (!browserWindow.isDestroyed()) {
        browserWindow.show();
      }
      if (this.#openDevTools) {
        browserWindow.webContents.openDevTools();
      }
    };

    // In createWindow method, after loadURL/loadFile
    const showTimeout = setTimeout(() => {
      console.warn(
        `[WindowManager] ⚠️ Window ${windowName} taking too long to load, showing anyway`,
      );
      showWindow();
    }, WINDOW_LOAD_TIMEOUT_MS);

    browserWindow.once('ready-to-show', () => {
      clearTimeout(showTimeout);
      showWindow();
    });

    // Also add error handling
    browserWindow.webContents.on(
      'did-fail-load',
      (_event, _errorCode, errorDescription, validatedURL) => {
        console.error(
          `[WindowManager] Failed to load ${validatedURL}:`,
          errorDescription,
        );
        clearTimeout(showTimeout);
        // Still show the window so user can see the error
        browserWindow.show();
      },
    );

    // Close all other windows when the main window is closed
    if (windowName === this.#mainWindowName) {
      browserWindow.on('closed', () => {
        const allWindows = BrowserWindow.getAllWindows();
        for (const win of allWindows) {
          if (win !== browserWindow && !win.isDestroyed()) {
            win.close();
          }
        }
      });
    }

    return browserWindow;
  }

  /**
   * Restores the main window if it's minimized, or creates a new one if none exist.
   * @param show - Whether to show and focus the window.
   */
  async restoreOrCreateWindow(show = false): Promise<BrowserWindow> {
    // Try to get the main window from our registry first
    let window = await this.getWindow(this.#mainWindowName);

    if (window === undefined) {
      window = await this.createWindow(this.#mainWindowName, this.#mainWindowOptions);
    }

    if (!show) {
      return window;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window.focus();
    return window;
  }

  getZoomMenuItems(): Electron.MenuItemConstructorOptions[] {
    return this.#zoomManager.getZoomMenuItems();
  }
}

export { WindowManager };
