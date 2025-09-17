import { BrowserWindow } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createZoomManager, ZoomManager } from '../src/ZoomManager';

// Mock Electron BrowserWindow
vi.mock('electron', () => ({
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
  },
}));

// Mock WindowStateManager
const mockUpdateZoomFactorState = vi.fn();
const mockWindowStateManager = {
  updateZoomFactorState: mockUpdateZoomFactorState,
};

// Mock BrowserWindow instance
const mockWebContents = {
  on: vi.fn(),
  setZoomFactor: vi.fn(),
  getZoomFactor: vi.fn(),
};

const mockWindow = {
  webContents: mockWebContents,
  isDestroyed: vi.fn(),
};

// Test constants
const TEST_ZOOM_FACTOR = 1.5;
const DEFAULT_ZOOM = 1.0;
const ZOOM_STEP = 0.1;
const MAX_ZOOM = 3.0;
const MIN_ZOOM = 0.25;
const MENU_ITEMS_COUNT = 3;
const SMALL_OFFSET = 0.01;

describe('zoomManager', () => {
  let zoomManager: ZoomManager;

  beforeEach(() => {
    vi.clearAllMocks();
    zoomManager = new ZoomManager();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(zoomManager).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        zoomStep: 0.2,
        minZoom: 0.5,
        maxZoom: 2.0,
        defaultZoom: 1.5,
      };
      const customZoomManager = new ZoomManager(customOptions);
      expect(customZoomManager).toBeDefined();
    });
  });

  describe('registerWindow', () => {
    it('should register window and set up event listeners', () => {
      const windowName = 'test-window';

      zoomManager.registerWindow(
        mockWindow as any,
        windowName,
        mockWindowStateManager as any,
      );

      expect(mockWebContents.on).toHaveBeenCalledWith(
        'before-input-event',
        expect.any(Function),
      );
    });

    it('should handle zoom shortcuts correctly', () => {
      const windowName = 'test-window';
      zoomManager.registerWindow(
        mockWindow as any,
        windowName,
        mockWindowStateManager as any,
      );

      const mockCalls = mockWebContents.on.mock.calls;
      expect(mockCalls.length).toBeGreaterThan(0);
      const eventHandler = mockCalls[0]?.[1];
      expect(eventHandler).toBeDefined();

      if (eventHandler) {
        const mockEvent = { preventDefault: vi.fn() };

        // Test reset zoom (Ctrl+0)
        eventHandler(mockEvent, { control: true, key: '0' });
        expect(mockEvent.preventDefault).toHaveBeenCalled();

        // Test zoom in (Ctrl+Plus)
        eventHandler(mockEvent, { control: true, key: '+' });
        expect(mockEvent.preventDefault).toHaveBeenCalled();

        // Test zoom in (Ctrl+=)
        eventHandler(mockEvent, { control: true, key: '=' });
        expect(mockEvent.preventDefault).toHaveBeenCalled();

        // Test zoom out (Ctrl+-)
        eventHandler(mockEvent, { control: true, key: '-' });
        expect(mockEvent.preventDefault).toHaveBeenCalled();

        // Test with meta key instead of control
        eventHandler(mockEvent, { meta: true, key: '0' });
        expect(mockEvent.preventDefault).toHaveBeenCalled();

        // Test non-zoom key (should not prevent default)
        const mockEvent2 = { preventDefault: vi.fn() };
        eventHandler(mockEvent2, { control: true, key: 'a' });
        expect(mockEvent2.preventDefault).not.toHaveBeenCalled();
      }
    });
  });

  describe('setWindowZoom', () => {
    beforeEach(() => {
      zoomManager.registerWindow(
        mockWindow as any,
        'test-window',
        mockWindowStateManager as any,
      );
    });

    it('should set zoom factor on valid window', () => {
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.setWindowZoom(mockWindow as any, TEST_ZOOM_FACTOR);

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(TEST_ZOOM_FACTOR);
      expect(mockUpdateZoomFactorState).toHaveBeenCalledWith(TEST_ZOOM_FACTOR);
    });

    it('should not set zoom on destroyed window', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      zoomManager.setWindowZoom(mockWindow as any, TEST_ZOOM_FACTOR);

      expect(mockWebContents.setZoomFactor).not.toHaveBeenCalled();
      expect(mockUpdateZoomFactorState).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ZOOM] Cannot set zoom on destroyed window test-window',
      );

      consoleSpy.mockRestore();
    });

    it('should handle setZoomFactor errors', () => {
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.setZoomFactor.mockImplementation(() => {
        throw new Error('Zoom error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      zoomManager.setWindowZoom(mockWindow as any, TEST_ZOOM_FACTOR);

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(TEST_ZOOM_FACTOR);
      expect(mockUpdateZoomFactorState).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ZOOM] Failed to set zoom on window test-window:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle unknown window name', () => {
      const unknownWindow = { ...mockWindow, webContents: { ...mockWebContents } };
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.setWindowZoom(unknownWindow as any, TEST_ZOOM_FACTOR);

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(TEST_ZOOM_FACTOR);
      expect(mockUpdateZoomFactorState).not.toHaveBeenCalled();
    });
  });

  describe('resetZoom', () => {
    it('should reset zoom on focused window', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.registerWindow(
        mockWindow as any,
        'test-window',
        mockWindowStateManager as any,
      );
      zoomManager.resetZoom();

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(DEFAULT_ZOOM);
      expect(mockUpdateZoomFactorState).toHaveBeenCalledWith(DEFAULT_ZOOM);
    });

    it('should do nothing when no focused window', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(null);

      zoomManager.resetZoom();

      expect(mockWebContents.setZoomFactor).not.toHaveBeenCalled();
      expect(mockUpdateZoomFactorState).not.toHaveBeenCalled();
    });
  });

  describe('zoomIn', () => {
    beforeEach(() => {
      zoomManager.registerWindow(
        mockWindow as any,
        'test-window',
        mockWindowStateManager as any,
      );
    });

    it('should zoom in on focused window', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.getZoomFactor.mockReturnValue(DEFAULT_ZOOM);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.zoomIn();

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(
        DEFAULT_ZOOM + ZOOM_STEP,
      );
      expect(mockUpdateZoomFactorState).toHaveBeenCalledWith(DEFAULT_ZOOM + ZOOM_STEP);
    });

    it('should not exceed max zoom', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.getZoomFactor.mockReturnValue(MAX_ZOOM - ZOOM_STEP + SMALL_OFFSET);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.zoomIn();

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(MAX_ZOOM);
      expect(mockUpdateZoomFactorState).toHaveBeenCalledWith(MAX_ZOOM);
    });

    it('should do nothing when no focused window', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(null);

      zoomManager.zoomIn();

      expect(mockWebContents.getZoomFactor).not.toHaveBeenCalled();
      expect(mockWebContents.setZoomFactor).not.toHaveBeenCalled();
      expect(mockUpdateZoomFactorState).not.toHaveBeenCalled();
    });
  });

  describe('zoomOut', () => {
    beforeEach(() => {
      zoomManager.registerWindow(
        mockWindow as any,
        'test-window',
        mockWindowStateManager as any,
      );
    });

    it('should zoom out on focused window', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.getZoomFactor.mockReturnValue(DEFAULT_ZOOM);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.zoomOut();

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(
        DEFAULT_ZOOM - ZOOM_STEP,
      );
      expect(mockUpdateZoomFactorState).toHaveBeenCalledWith(DEFAULT_ZOOM - ZOOM_STEP);
    });

    it('should not go below min zoom', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.getZoomFactor.mockReturnValue(MIN_ZOOM + ZOOM_STEP - SMALL_OFFSET);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      zoomManager.zoomOut();

      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(MIN_ZOOM);
      expect(mockUpdateZoomFactorState).toHaveBeenCalledWith(MIN_ZOOM);
    });

    it('should do nothing when no focused window', () => {
      (BrowserWindow.getFocusedWindow as any).mockReturnValue(null);

      zoomManager.zoomOut();

      expect(mockWebContents.getZoomFactor).not.toHaveBeenCalled();
      expect(mockWebContents.setZoomFactor).not.toHaveBeenCalled();
      expect(mockUpdateZoomFactorState).not.toHaveBeenCalled();
    });
  });

  describe('getZoomMenuItems', () => {
    it('should return correct menu items', () => {
      const menuItems = zoomManager.getZoomMenuItems();

      expect(menuItems).toHaveLength(MENU_ITEMS_COUNT);
      expect(menuItems[0]).toEqual({
        label: 'Reset Zoom',
        accelerator: 'CmdOrCtrl+0',
        click: expect.any(Function),
      });
      expect(menuItems[1]).toEqual({
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: expect.any(Function),
      });
      expect(menuItems[2]).toEqual({
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: expect.any(Function),
      });
    });

    it('should call correct methods when menu items are clicked', () => {
      const menuItems = zoomManager.getZoomMenuItems();

      (BrowserWindow.getFocusedWindow as any).mockReturnValue(mockWindow);
      mockWindow.isDestroyed.mockReturnValue(false);
      mockWebContents.getZoomFactor.mockReturnValue(DEFAULT_ZOOM);
      mockWebContents.setZoomFactor.mockReturnValue(undefined);

      // Test reset zoom menu item
      if (menuItems[0]?.click) {
        (menuItems[0].click as any)();
      }
      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(DEFAULT_ZOOM);

      // Reset mocks
      mockWebContents.setZoomFactor.mockClear();

      // Test zoom in menu item
      if (menuItems[1]?.click) {
        (menuItems[1].click as any)();
      }
      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(
        DEFAULT_ZOOM + ZOOM_STEP,
      );

      // Reset mocks
      mockWebContents.setZoomFactor.mockClear();

      // Test zoom out menu item
      if (menuItems[2]?.click) {
        (menuItems[2].click as any)();
      }
      expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(
        DEFAULT_ZOOM - ZOOM_STEP,
      );
    });
  });

  describe('createZoomManager', () => {
    it('should create a ZoomManager instance', () => {
      const manager = createZoomManager();
      expect(manager).toBeInstanceOf(ZoomManager);
    });

    it('should create a ZoomManager instance with options', () => {
      const options = { zoomStep: 0.2 };
      const manager = createZoomManager(options);
      expect(manager).toBeInstanceOf(ZoomManager);
    });
  });
});
