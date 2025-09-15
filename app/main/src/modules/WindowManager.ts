import type { AppInitConfig } from '../AppInitConfig.js';
import type { AppModule } from '../AppModule.js';
import type { ModuleContext } from '../ModuleContext.js';

import type { WindowConfig } from '../types/common.js';
import process from 'node:process';

import { appApi } from '@internal/ipc';
import { BrowserWindow, ipcMain, Menu, MenuItem, shell } from 'electron';
import { WindowStateManager } from './WindowStateManager';

/**
 * The expected shape of the initConfig object for the WindowManager.
 */
interface WindowManagerInitConfig extends AppInitConfig {
  windows: Record<string, WindowConfig>;
}

class WindowManager implements AppModule {
  /** Stores all available window configurations, keyed by name. */
  readonly #windowConfigs: Record<string, WindowConfig>;
  readonly #openDevTools: boolean;
  /** Stores WindowStateManager instances for each window type */
  readonly #windowStateManagers: Record<string, WindowStateManager> = {};

  constructor({
    initConfig,
    openDevTools = false,
  }: {
    initConfig: WindowManagerInitConfig;
    openDevTools?: boolean;
  }) {
    this.#windowConfigs = initConfig.windows;
    this.#openDevTools = openDevTools;
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
    return this.#windowStateManagers[windowName];
  }

  async enable({ app }: ModuleContext): Promise<void> {
    await app.whenReady();

    // Create the main window on startup
    await this.restoreOrCreateWindow(true);

    // Re-create main window if app is activated and no windows are open (macOS)
    app.on('activate', () => this.restoreOrCreateWindow(true));

    // Focus existing main window if a second instance is started
    app.on('second-instance', () => this.restoreOrCreateWindow(true));

    appApi.registerMainHandlers(ipcMain);

    // Set up the IPC handler to listen for requests to open new windows
    ipcMain.handle('open-window', async (_event, windowName: string) => {
      if (this.#windowConfigs[windowName]) {
        await this.createWindow(windowName);
      } else {
        console.error(
          `[WindowManager] Error: Window configuration for "${windowName}" not found.`,
        );
      }
    });

    // Create and set the application menu
    const menu = Menu.buildFromTemplate(this.createMenuTemplate());
    Menu.setApplicationMenu(menu);
  }

  /**
   * Creates a new BrowserWindow based on a named configuration.
   * @param windowName The key for the window configuration (e.g., 'main', 'settings').
   */
  async createWindow(windowName: string): Promise<BrowserWindow> {
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

    const browserWindow = new BrowserWindow({
      show: false, // Use 'ready-to-show' event to show the window gracefully
      x: windowStateManager.x,
      y: windowStateManager.y,
      width: windowStateManager.width,
      height: windowStateManager.height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Required for preload scripts that use Node.js APIs
        webviewTag: false,
        preload: config.preload.path,
      },
    });

    // Manage window state (this will set up event listeners for state changes)
    windowStateManager.manage(browserWindow);

    // Enable context menu for development (allows right-click -> Inspect Element)
    if (this.#openDevTools) {
      browserWindow.webContents.on('context-menu', (_event, params) => {
        // In development mode, show context menu with DevTools option
        const contextMenu = new Menu();

        // Add inspect element option
        contextMenu.append(
          new MenuItem({
            label: 'Inspect Element',
            click: () => {
              browserWindow.webContents.inspectElement(params.x, params.y);
            },
          }),
        );

        contextMenu.popup({ window: browserWindow });
      });
    }

    // Load the renderer content
    if (config.renderer instanceof URL) {
      await browserWindow.loadURL(config.renderer.href);
    } else {
      await browserWindow.loadFile(config.renderer.path);
    }

    // Show the window only when it's ready to avoid a white flash
    browserWindow.once('ready-to-show', () => {
      browserWindow.show();
      if (this.#openDevTools) {
        // Comment out automatic DevTools opening - users can right-click to open DevTools manually
        // browserWindow.webContents.openDevTools();
      }
    });

    // Close all other windows when the main window is closed
    if (windowName === 'main') {
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
    // This logic is specific to the "main" window
    let window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

    if (window === undefined) {
      window = await this.createWindow('main');
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

  /**
   * Creates the menu template for the application.
   */
  private createMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    return [
      {
        label: 'File',
        submenu: [
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.createWindow('settings');
            },
          },
          { type: 'separator' },
          {
            label: 'Quit',
            role: 'quit',
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'close' }],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click: () => {
              shell.openExternal('https://example.com');
            },
          },
        ],
      },
    ];
  }
}

export function createWindowManagerModule(
  ...args: ConstructorParameters<typeof WindowManager>
): WindowManager {
  return new WindowManager(...args);
}
