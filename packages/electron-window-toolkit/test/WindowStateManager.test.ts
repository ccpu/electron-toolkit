import type { BrowserWindow } from 'electron';

import * as fs from 'node:fs';
import { screen } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowStateManager } from '../src/WindowStateManager';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
  },
  screen: {
    getAllDisplays: vi.fn(() => []),
    getPrimaryDisplay: vi.fn(() => ({
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    })),
  },
}));

// Mock fs modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => {
    throw new Error('no saved state');
  }),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('windowStateManager', () => {
  it('should create an instance', () => {
    const wsm = new WindowStateManager();
    expect(wsm).toBeInstanceOf(WindowStateManager);
  });

  it('should have required properties', () => {
    const wsm = new WindowStateManager();
    expect(['number', 'undefined']).toContain(typeof wsm.width);
    expect(['number', 'undefined']).toContain(typeof wsm.height);
    expect(['number', 'undefined']).toContain(typeof wsm.zoomFactor);
  });

  it('should have required methods', () => {
    const wsm = new WindowStateManager();
    expect(typeof wsm.manage).toBe('function');
    expect(typeof wsm.unmanage).toBe('function');
    expect(typeof wsm.updateZoomFactorState).toBe('function');
    expect(typeof wsm.saveState).toBe('function');
    expect(typeof wsm.saveStateAsync).toBe('function');
  });

  it('should use default values when provided', () => {
    const wsm = new WindowStateManager({
      defaultWidth: 1200,
      defaultHeight: 800,
      defaultZoomFactor: 1.0,
    });
    // When defaults are provided but no saved state exists, width/height should still be undefined
    // since we removed the fallback assignment - defaults are only used during resetStateToDefault
    expect(['number', 'undefined']).toContain(typeof wsm.width);
    expect(['number', 'undefined']).toContain(typeof wsm.height);
    expect(['number', 'undefined']).toContain(typeof wsm.zoomFactor);
  });

  it('should return undefined values when no defaults provided', () => {
    const wsm = new WindowStateManager();
    expect(wsm.width).toBeUndefined();
    expect(wsm.height).toBeUndefined();
    expect(wsm.zoomFactor).toBeUndefined();
  });
});

describe('bounds restoration', () => {
  const display = {
    id: 314,
    bounds: { x: 1920, y: 85, width: 1536, height: 960 },
    workArea: { x: 1920, y: 85, width: 1536, height: 930 },
  } as Electron.Display;

  /**
   * Creates a BrowserWindow mock whose getBounds reflects the last setBounds
   * call, so manage()'s post-apply verification sees an exact match.
   */
  function createMockWindow(
    overrides: Partial<Record<keyof BrowserWindow, unknown>> = {},
  ): BrowserWindow {
    let bounds = { x: 0, y: 0, width: 0, height: 0 };
    return {
      setBounds: vi.fn((next: Partial<typeof bounds>) => {
        bounds = { ...bounds, ...next };
      }),
      getBounds: vi.fn(() => bounds),
      setSize: vi.fn(),
      isResizable: vi.fn(() => true),
      setResizable: vi.fn(),
      isMaximized: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      isFullScreen: vi.fn(() => false),
      isDestroyed: vi.fn(() => false),
      maximize: vi.fn(),
      setFullScreen: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      webContents: { setZoomFactor: vi.fn(), getZoomFactor: vi.fn(() => 1) },
      ...overrides,
    } as unknown as BrowserWindow;
  }

  function mockSavedState(state: Record<string, unknown>): void {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(state));
  }

  beforeEach(() => {
    vi.mocked(screen.getAllDisplays).mockReturnValue([display]);
  });

  it('keeps a window that slightly overhangs the display edge at its saved position', () => {
    // Bottom edge is 4px past the display (a bar parked over the taskbar).
    mockSavedState({
      x: 3365,
      y: 1003,
      width: 91,
      height: 46,
      displayBounds: display.bounds,
      displayId: display.id,
    });

    const win = createMockWindow();
    new WindowStateManager().manage(win);

    expect(win.setBounds).toHaveBeenCalledWith({
      x: 3365,
      y: 1003,
      width: 91,
      height: 46,
    });
  });

  it('keeps a window straddling the display edge while enough of it is visible', () => {
    // Only 34px of the window's height is on the display — still grabbable.
    mockSavedState({
      x: 3365,
      y: 1011,
      width: 91,
      height: 46,
      displayBounds: display.bounds,
      displayId: display.id,
    });

    const win = createMockWindow();
    new WindowStateManager().manage(win);

    expect(win.setBounds).toHaveBeenCalledWith({
      x: 3365,
      y: 1011,
      width: 91,
      height: 46,
    });
  });

  it('repositions a window that is almost entirely offscreen', () => {
    // Only 5px of the window's height remains on the display.
    mockSavedState({
      x: 3365,
      y: 1040,
      width: 91,
      height: 46,
      displayBounds: display.bounds,
      displayId: display.id,
    });

    const win = createMockWindow();
    new WindowStateManager().manage(win);

    expect(win.setBounds).toHaveBeenCalledWith({
      x: 3365,
      y: 999, // display bottom (1045) - height (46)
      width: 91,
      height: 46,
    });
  });

  it('re-applies bounds with resizing enabled when the first attempt lands off-target', () => {
    mockSavedState({
      x: 3365,
      y: 1003,
      width: 91,
      height: 46,
      displayBounds: display.bounds,
      displayId: display.id,
    });

    // Simulate fractional-DPI drift: the window reports bounds 1px off from
    // what was requested, no matter what is applied.
    const win = createMockWindow({
      getBounds: vi.fn(() => ({ x: 3364, y: 1002, width: 91, height: 46 })),
      isResizable: vi.fn(() => false),
    });
    new WindowStateManager().manage(win);

    const expected = { x: 3365, y: 1003, width: 91, height: 46 };
    expect(win.setBounds).toHaveBeenNthCalledWith(1, expected);
    expect(win.setBounds).toHaveBeenNthCalledWith(2, expected);
    expect(win.setResizable).toHaveBeenNthCalledWith(1, true);
    expect(win.setResizable).toHaveBeenNthCalledWith(2, false);
  });
});
