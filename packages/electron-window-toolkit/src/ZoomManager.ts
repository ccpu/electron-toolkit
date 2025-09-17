import type { WindowStateManager } from './WindowStateManager';

import { BrowserWindow } from 'electron';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;

interface ZoomManagerOptions {
  zoomStep?: number;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
}

export class ZoomManager {
  private readonly zoomStep: number;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly defaultZoom: number;
  private readonly windowToNameMap = new WeakMap<BrowserWindow, string>();
  private readonly windowStateManagers: Record<string, WindowStateManager> = {};

  constructor(options: ZoomManagerOptions = {}) {
    this.zoomStep = options.zoomStep ?? ZOOM_STEP;
    this.minZoom = options.minZoom ?? MIN_ZOOM;
    this.maxZoom = options.maxZoom ?? MAX_ZOOM;
    this.defaultZoom = options.defaultZoom ?? DEFAULT_ZOOM;
  }

  /**
   * Register a window with the zoom manager
   */
  public registerWindow(
    window: BrowserWindow,
    windowName: string,
    stateManager: WindowStateManager,
  ): void {
    this.windowToNameMap.set(window, windowName);
    this.windowStateManagers[windowName] = stateManager;

    // Block default Electron zoom shortcuts and handle custom zoom
    window.webContents.on('before-input-event', (event, input) => {
      if (
        (input.control || input.meta) &&
        (input.key === '0' || input.key === '+' || input.key === '-' || input.key === '=')
      ) {
        if (input.key === '0') {
          this.resetZoom();
        } else if (input.key === '+' || input.key === '=') {
          this.zoomIn();
        } else if (input.key === '-') {
          this.zoomOut();
        }
        event.preventDefault();
      }
    });
  }

  /**
   * Sets the zoom factor for a specific window and saves it to the window's state.
   */
  public setWindowZoom(window: BrowserWindow, zoomFactor: number): void {
    const windowName = this.windowToNameMap.get(window) || 'unknown';

    // Ensure we're working with a valid, non-destroyed window
    if (window.isDestroyed()) {
      console.error(`[ZOOM] Cannot set zoom on destroyed window ${windowName}`);
      return;
    }

    // Apply zoom to the specific window
    try {
      window.webContents.setZoomFactor(zoomFactor);
    } catch (error) {
      console.error(`[ZOOM] Failed to set zoom on window ${windowName}:`, error);
      return;
    }

    // Save to state manager
    const stateManager = this.windowStateManagers[windowName];
    if (stateManager) {
      stateManager.updateZoomFactorState(zoomFactor);
    }
  }

  /**
   * Reset zoom to default for the focused window
   */
  public resetZoom(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      this.setWindowZoom(focusedWindow, this.defaultZoom);
    }
  }

  /**
   * Zoom in on the focused window
   */
  public zoomIn(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      const currentZoom = focusedWindow.webContents.getZoomFactor();
      this.setWindowZoom(
        focusedWindow,
        Math.min(currentZoom + this.zoomStep, this.maxZoom),
      );
    }
  }

  /**
   * Zoom out on the focused window
   */
  public zoomOut(): void {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      const currentZoom = focusedWindow.webContents.getZoomFactor();
      this.setWindowZoom(
        focusedWindow,
        Math.max(currentZoom - this.zoomStep, this.minZoom),
      );
    }
  }

  /**
   * Get zoom menu items for the application menu
   */
  public getZoomMenuItems(): Electron.MenuItemConstructorOptions[] {
    return [
      {
        label: 'Reset Zoom',
        accelerator: 'CmdOrCtrl+0',
        click: () => this.resetZoom(),
      },
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: () => this.zoomIn(),
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => this.zoomOut(),
      },
    ];
  }
}

export function createZoomManager(options?: ZoomManagerOptions): ZoomManager {
  return new ZoomManager(options);
}
