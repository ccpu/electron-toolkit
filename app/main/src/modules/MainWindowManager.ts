import type { AppInitConfig } from '../AppInitConfig.js';
import type { AppModule } from '../AppModule.js';

import type { ModuleContext } from '../ModuleContext.js';

import type { WindowConfig } from '../types/common.js';

import { appApi } from '@internal/ipc';

import { ipcMain, Menu, MenuItem, shell } from 'electron';
import { WindowManager } from 'electron-window-toolkit';

/**
 * The expected shape of the initConfig object for the WindowManager.
 */
interface WindowManagerInitConfig extends AppInitConfig {
  windows: Record<string, WindowConfig>;
}

class MainWindowManager implements AppModule {
  readonly #windowManager: WindowManager;

  constructor({
    initConfig,
    openDevTools = false,
  }: {
    initConfig: WindowManagerInitConfig;
    openDevTools?: boolean;
  }) {
    this.#windowManager = new WindowManager({ initConfig, openDevTools });
  }

  async enable({ app }: ModuleContext): Promise<void> {
    const mainWindow = await this.#windowManager.init({ app });

    appApi.registerMainHandlers(ipcMain);

    this.createMenus(mainWindow);
  }

  private async createWindow(windowName: string): Promise<void> {
    const browserWindow = await this.#windowManager.createWindow(windowName);
    this.createMenus(browserWindow);
  }

  private createMenus(window: Electron.BrowserWindow): void {
    // Create and set the application menu
    const menu = Menu.buildFromTemplate(this.createMenuTemplate());
    Menu.setApplicationMenu(menu);

    window.webContents.on('context-menu', (_event, params) => {
      // In development mode, show context menu with DevTools option
      const contextMenu = new Menu();

      // Add inspect element option
      contextMenu.append(
        new MenuItem({
          label: 'Inspect Element',
          click: () => {
            window.webContents.inspectElement(params.x, params.y);
          },
        }),
      );

      contextMenu.popup({ window });
    });
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
          ...this.#windowManager.getZoomMenuItems(),
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
  ...args: ConstructorParameters<typeof MainWindowManager>
): MainWindowManager {
  return new MainWindowManager(...args);
}
