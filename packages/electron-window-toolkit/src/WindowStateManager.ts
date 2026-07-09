'use strict';

import type { BrowserWindow } from 'electron';

import * as fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import * as path from 'node:path';

import { app, screen } from 'electron';

interface WindowState {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isMaximized?: boolean;
  isFullScreen?: boolean;
  zoomFactor?: number; // Store zoom level for each window
  displayBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  displayId?: number; // Store display ID for better display tracking
}

interface WindowStateManagerOptions {
  file?: string;
  path?: string;
  maximize?: boolean;
  fullScreen?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultZoomFactor?: number;
  /**
   * Whether the window position (x/y) should be persisted and restored.
   * When disabled, only the size is tracked and the position is left to the
   * default provided by the caller/Electron. Defaults to `true`.
   */
  trackPosition?: boolean;
}

const EVENT_HANDLING_DELAY = 100;
const JSON_INDENT = 2;
const DISPLAY_MARGIN = 100;
const CENTER_POINT_DIVISOR = 2;
/**
 * Minimum number of pixels (per axis) of the window that must remain on a
 * display for its saved position to be considered restorable. Requiring full
 * containment instead would "correct" windows the user deliberately parked
 * overlapping a screen edge (e.g. a floating bar over the taskbar, or a window
 * straddling two monitors), snapping them away from their saved spot on every
 * launch.
 */
const MIN_VISIBLE_ON_DISPLAY = 32;

class WindowStateManager {
  private state: WindowState = {} as WindowState;
  private winRef: BrowserWindow | null = null;
  private stateChangeTimer: NodeJS.Timeout | null = null;
  /** Whether the window position (x/y) is currently being tracked. */
  private trackPosition: boolean;
  private readonly eventHandlingDelay = EVENT_HANDLING_DELAY;
  private readonly config: {
    file: string;
    path: string;
    maximize: boolean;
    fullScreen: boolean;
    defaultWidth?: number;
    defaultHeight?: number;
    defaultZoomFactor?: number;
  };

  private readonly fullStoreFileName: string;

  constructor(options: WindowStateManagerOptions = {}) {
    // Generate window-specific filename if windowName is provided

    this.config = {
      file: options.file || 'window-state.json',
      path: options.path || app.getPath('userData'),
      maximize: options.maximize !== false,
      fullScreen: options.fullScreen !== false,
      defaultWidth: options.defaultWidth,
      defaultHeight: options.defaultHeight,
      defaultZoomFactor: options.defaultZoomFactor,
    };

    this.trackPosition = options.trackPosition !== false;

    this.fullStoreFileName = path.join(this.config.path, this.config.file);

    // Load previous state
    this.loadState();

    // DON'T validate state here since screen module isn't available yet
    // We'll validate when manage() is called
  }

  private isNormal(win: BrowserWindow): boolean {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
  }

  private hasBounds(): boolean {
    return Boolean(
      this.state &&
        Number.isInteger(this.state.x) &&
        Number.isInteger(this.state.y) &&
        Number.isInteger(this.state.width) &&
        this.state.width !== undefined &&
        this.state.width > 0 &&
        Number.isInteger(this.state.height) &&
        this.state.height !== undefined &&
        this.state.height > 0,
    );
  }

  private hasSize(): boolean {
    return Boolean(
      this.state &&
        Number.isInteger(this.state.width) &&
        this.state.width !== undefined &&
        this.state.width > 0 &&
        Number.isInteger(this.state.height) &&
        this.state.height !== undefined &&
        this.state.height > 0,
    );
  }

  private resetStateToDefault(): void {
    const primaryDisplay = screen.getPrimaryDisplay();

    // Reset state to default values on the primary display
    this.state = {
      width: this.config.defaultWidth,
      height: this.config.defaultHeight,
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      displayBounds: primaryDisplay.bounds,
      displayId: primaryDisplay.id,
    };
  }

  private windowWithinBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    // The window counts as "within" the display when enough of it is visible
    // to see and grab it — not only when it is completely contained. Partial
    // overhang past a screen edge is a position the user chose; preserve it.
    if (
      this.state.x === undefined ||
      this.state.y === undefined ||
      this.state.width === undefined ||
      this.state.height === undefined
    ) {
      return false;
    }

    const visibleWidth =
      Math.min(this.state.x + this.state.width, bounds.x + bounds.width) -
      Math.max(this.state.x, bounds.x);
    const visibleHeight =
      Math.min(this.state.y + this.state.height, bounds.y + bounds.height) -
      Math.max(this.state.y, bounds.y);

    // Windows smaller than the threshold must simply be mostly visible.
    const requiredWidth = Math.min(MIN_VISIBLE_ON_DISPLAY, this.state.width);
    const requiredHeight = Math.min(MIN_VISIBLE_ON_DISPLAY, this.state.height);

    return visibleWidth >= requiredWidth && visibleHeight >= requiredHeight;
  }

  private findBestDisplay(): Electron.Display | null {
    const displays = screen.getAllDisplays();

    // First, try to find the display by ID if we have one stored
    if (this.state.displayId) {
      const displayById = displays.find((display) => display.id === this.state.displayId);
      if (displayById) {
        return displayById;
      }
    }

    // If we have stored display bounds, try to find a display that matches
    if (this.state.displayBounds) {
      const matchingDisplay = displays.find(
        (display) =>
          display.bounds.x === this.state.displayBounds!.x &&
          display.bounds.y === this.state.displayBounds!.y &&
          display.bounds.width === this.state.displayBounds!.width &&
          display.bounds.height === this.state.displayBounds!.height,
      );
      if (matchingDisplay) {
        return matchingDisplay;
      }
    }

    // If window has position, find the display that contains the center point
    if (
      this.state.x !== undefined &&
      this.state.y !== undefined &&
      this.state.width !== undefined &&
      this.state.height !== undefined
    ) {
      const centerX = this.state.x + this.state.width / CENTER_POINT_DIVISOR;
      const centerY = this.state.y + this.state.height / CENTER_POINT_DIVISOR;

      const containingDisplay = displays.find(
        (display) =>
          centerX >= display.bounds.x &&
          centerX < display.bounds.x + display.bounds.width &&
          centerY >= display.bounds.y &&
          centerY < display.bounds.y + display.bounds.height,
      );

      if (containingDisplay) {
        return containingDisplay;
      }
    }

    return null;
  }

  private repositionToDisplay(targetDisplay: Electron.Display): void {
    const displayBounds = targetDisplay.bounds;

    // If window was maximized, we'll handle that in manage()
    if (this.state.isMaximized) {
      this.state.x = displayBounds.x;
      this.state.y = displayBounds.y;
      this.state.displayBounds = displayBounds;
      this.state.displayId = targetDisplay.id;
      return;
    }

    // Ensure window fits within the display
    let newX = this.state.x || displayBounds.x;
    let newY = this.state.y || displayBounds.y;
    const newWidth = Math.min(
      this.state.width || displayBounds.width,
      displayBounds.width - DISPLAY_MARGIN,
    ); // Leave some margin
    const newHeight = Math.min(
      this.state.height || displayBounds.height,
      displayBounds.height - DISPLAY_MARGIN,
    );

    // Adjust position if window extends beyond display bounds
    if (newX + newWidth > displayBounds.x + displayBounds.width) {
      newX = displayBounds.x + displayBounds.width - newWidth;
    }
    if (newY + newHeight > displayBounds.y + displayBounds.height) {
      newY = displayBounds.y + displayBounds.height - newHeight;
    }

    // Ensure minimum position within display
    newX = Math.max(newX, displayBounds.x);
    newY = Math.max(newY, displayBounds.y);

    this.state.x = newX;
    this.state.y = newY;
    this.state.width = newWidth;
    this.state.height = newHeight;
    this.state.displayBounds = displayBounds;
    this.state.displayId = targetDisplay.id;
  }

  private ensureWindowVisibleOnSomeDisplay(): void {
    // Try to find the best display for this window
    const bestDisplay = this.findBestDisplay();

    if (bestDisplay) {
      // Check if window is completely within the found display
      if (this.windowWithinBounds(bestDisplay.bounds)) {
        // Update the display info in case display bounds changed slightly
        this.state.displayBounds = bestDisplay.bounds;
        this.state.displayId = bestDisplay.id;
        return;
      }
      // Window exists on this display but is partially out of bounds
      this.repositionToDisplay(bestDisplay);
      return;
    }

    // If no suitable display found, check if window is visible on any display
    const visible = screen
      .getAllDisplays()
      .some((display) => this.windowWithinBounds(display.bounds));

    if (!visible) {
      // Window is not visible on any display. Try to find the closest display.
      const displays = screen.getAllDisplays();
      let closestDisplay = screen.getPrimaryDisplay();
      let closestDistance = Number.MAX_SAFE_INTEGER;

      if (this.state.x !== undefined && this.state.y !== undefined) {
        for (const display of displays) {
          const distanceX = Math.min(
            Math.abs(this.state.x - display.bounds.x),
            Math.abs(this.state.x - (display.bounds.x + display.bounds.width)),
          );
          const distanceY = Math.min(
            Math.abs(this.state.y - display.bounds.y),
            Math.abs(this.state.y - (display.bounds.y + display.bounds.height)),
          );
          const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestDisplay = display;
          }
        }
      }

      // Reposition to the closest display
      this.repositionToDisplay(closestDisplay);
    }
  }

  private validateState(): void {
    const isValid =
      this.state &&
      (this.hasBounds() || this.state.isMaximized || this.state.isFullScreen);
    if (!isValid) {
      this.state = {} as WindowState;
      return;
    }

    if (this.hasBounds() && this.state.displayBounds) {
      this.ensureWindowVisibleOnSomeDisplay();
    }
  }

  private updateState(window?: BrowserWindow): void {
    const targetWindow = window || this.winRef;
    if (!targetWindow) {
      return;
    }

    // Don't throw an error when window was closed
    try {
      const winBounds = targetWindow.getBounds();
      if (this.isNormal(targetWindow)) {
        if (this.trackPosition) {
          this.state.x = winBounds.x;
          this.state.y = winBounds.y;
        }
        this.state.width = winBounds.width;
        this.state.height = winBounds.height;
      }
      this.state.isMaximized = targetWindow.isMaximized();
      this.state.isFullScreen = targetWindow.isFullScreen();

      // Only update zoom factor if window is not destroyed and webContents is accessible
      if (!targetWindow.isDestroyed() && targetWindow.webContents) {
        this.state.zoomFactor = targetWindow.webContents.getZoomFactor();
      }

      // Update display information
      const currentDisplay = screen.getDisplayMatching(winBounds);
      this.state.displayBounds = currentDisplay.bounds;
      this.state.displayId = currentDisplay.id;
    } catch {
      // Ignore errors when window is closed - preserve existing zoom factor
    }
  }

  private loadState(): void {
    try {
      const data = fs.readFileSync(this.fullStoreFileName, 'utf8');
      this.state = JSON.parse(data);
    } catch {
      this.state = {} as WindowState;
    }
  }

  public saveState(win?: BrowserWindow): void {
    // Update window state only if it was provided
    if (win) {
      this.updateState(win);
    }

    // Save state
    try {
      // Ensure directory exists
      const dir = path.dirname(this.fullStoreFileName);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.fullStoreFileName,
        JSON.stringify(this.state, null, JSON_INDENT),
      );
    } catch {
      // Don't care about save errors
    }
  }

  public async saveStateAsync(win?: BrowserWindow): Promise<void> {
    // Update window state only if it was provided
    if (win) {
      this.updateState(win);
    }

    // Save state
    try {
      // Ensure directory exists
      const dir = path.dirname(this.fullStoreFileName);
      await fsPromises.mkdir(dir, { recursive: true });
      await fsPromises.writeFile(
        this.fullStoreFileName,
        JSON.stringify(this.state, null, JSON_INDENT),
      );
    } catch {
      // Don't care about save errors
    }
  }

  private stateChangeHandler = (): void => {
    // Handles both 'resize' and 'move'
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }
    this.stateChangeTimer = setTimeout(() => {
      // Update the in-memory state and flush it to disk. Debouncing the write
      // here keeps persistence robust against hard process kills (e.g. an OS
      // shutdown that terminates the process without a clean 'close'/'closed'),
      // where relying on the 'closed' handler alone would lose the last bounds.
      this.updateState();
      this.saveStateAsync();
    }, this.eventHandlingDelay);
  };

  private closeHandler = (): void => {
    this.updateState();
  };

  private closedHandler = (): void => {
    // Unregister listeners and save state
    this.unmanage();
    this.saveState();
  };

  /**
   * Applies `bounds` to the window, compensating for two Windows quirks:
   * on displays with fractional DPI scaling (e.g. 125%) a single `setBounds`
   * can land a pixel or two off after the DIP↔physical round-trip, and
   * non-resizable windows can ignore the size portion of the call. If the
   * first attempt misses, re-apply once with resizing temporarily enabled.
   */
  private applyBounds(
    win: BrowserWindow,
    bounds: { x: number; y: number; width: number; height: number },
  ): void {
    win.setBounds(bounds);

    const actual = win.getBounds();
    if (
      actual.x === bounds.x &&
      actual.y === bounds.y &&
      actual.width === bounds.width &&
      actual.height === bounds.height
    ) {
      return;
    }

    const wasResizable = win.isResizable();
    if (!wasResizable) {
      win.setResizable(true);
    }
    win.setBounds(bounds);
    if (!wasResizable) {
      win.setResizable(false);
    }
  }

  public manage(win: BrowserWindow): void {
    // Validate state now that screen module is available
    this.validateState();

    // Set window bounds first if we have valid position/size
    if (this.hasBounds()) {
      if (this.trackPosition) {
        this.applyBounds(win, {
          x: this.state.x!,
          y: this.state.y!,
          width: this.state.width!,
          height: this.state.height!,
        });
      } else {
        // Position tracking disabled: restore size only, leave position to default.
        win.setSize(this.state.width!, this.state.height!);
      }
    } else if (!this.trackPosition && this.hasSize()) {
      // No stored position, but we still have a valid size to restore.
      win.setSize(this.state.width!, this.state.height!);
    }

    // Handle maximized state - do this after setting bounds to ensure correct display
    if (this.config.maximize && this.state.isMaximized) {
      // If we have a specific display, try to move window there first
      if (this.state.displayId) {
        const targetDisplay = screen
          .getAllDisplays()
          .find((d) => d.id === this.state.displayId);
        if (targetDisplay) {
          // Move window to the target display before maximizing
          win.setBounds({
            x: targetDisplay.bounds.x,
            y: targetDisplay.bounds.y,
            width: Math.min(
              this.state.width || targetDisplay.bounds.width,
              targetDisplay.bounds.width,
            ),
            height: Math.min(
              this.state.height || targetDisplay.bounds.height,
              targetDisplay.bounds.height,
            ),
          });
        }
      }
      win.maximize();
    }

    // Handle fullscreen state
    if (this.config.fullScreen && this.state.isFullScreen) {
      win.setFullScreen(true);
    }

    // Restore zoom factor
    if (this.state.zoomFactor !== undefined) {
      win.webContents.setZoomFactor(this.state.zoomFactor);
    } else if (this.config.defaultZoomFactor !== undefined) {
      win.webContents.setZoomFactor(this.config.defaultZoomFactor);
    }

    win.on('resize', this.stateChangeHandler);
    win.on('move', this.stateChangeHandler);
    win.on('close', this.closeHandler);
    win.on('closed', this.closedHandler);
    this.winRef = win;
  }

  public unmanage(): void {
    if (this.winRef) {
      this.winRef.removeListener('resize', this.stateChangeHandler);
      this.winRef.removeListener('move', this.stateChangeHandler);
      if (this.stateChangeTimer) {
        clearTimeout(this.stateChangeTimer);
      }
      this.winRef.removeListener('close', this.closeHandler);
      this.winRef.removeListener('closed', this.closedHandler);
      this.winRef = null;
    }
  }

  /**
   * Enables or disables tracking of the window position (x/y). When disabled,
   * the position is no longer persisted or restored; the size continues to be
   * tracked. Useful for temporarily pinning a window to a caller-defined
   * position without persisting it.
   */
  public setPositionTracking(enabled: boolean): void {
    this.trackPosition = enabled;
  }

  public isPositionTrackingEnabled(): boolean {
    return this.trackPosition;
  }

  // Getters for state properties
  public get x(): number | undefined {
    return this.trackPosition ? this.state.x : undefined;
  }

  public get y(): number | undefined {
    return this.trackPosition ? this.state.y : undefined;
  }

  public get width(): number | undefined {
    return this.state.width;
  }

  public get height(): number | undefined {
    return this.state.height;
  }

  public get displayBounds(): WindowState['displayBounds'] {
    return this.state.displayBounds;
  }

  public get displayId(): number | undefined {
    return this.state.displayId;
  }

  public get isMaximized(): boolean | undefined {
    return this.state.isMaximized;
  }

  public get isFullScreen(): boolean | undefined {
    return this.state.isFullScreen;
  }

  public get zoomFactor(): number | undefined {
    return this.state.zoomFactor;
  }

  public setZoomFactor(zoomFactor: number): void {
    this.state.zoomFactor = zoomFactor;
    if (this.winRef && !this.winRef.isDestroyed()) {
      this.winRef.webContents.setZoomFactor(zoomFactor);
    }
  }

  public updateZoomFactorState(zoomFactor: number): void {
    this.state.zoomFactor = zoomFactor;
  }

  public resetStateToDefaultPublic(): void {
    this.resetStateToDefault();
  }
}

export function createWindowStateManager(
  options?: WindowStateManagerOptions,
): WindowStateManager {
  return new WindowStateManager(options);
}

export { type WindowState, WindowStateManager, type WindowStateManagerOptions };
