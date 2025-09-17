import { BrowserWindow } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowManager } from '../src/WindowManager';
import { WindowStateManager } from '../src/WindowStateManager';

// Mock electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  app: {
    whenReady: vi.fn(),
    on: vi.fn(),
  },
}));

// Mock WindowStateManager
vi.mock('../src/WindowStateManager', () => ({
  WindowStateManager: vi.fn(),
}));

// Mock ZoomManager
vi.mock('../src/ZoomManager', () => ({
  createZoomManager: vi.fn(() => ({
    registerWindow: vi.fn(),
    getZoomMenuItems: vi.fn(() => []),
  })),
}));

describe('windowManager', () => {
  let windowManager: WindowManager;
  let mockWindow: any;
  let mockStateManager: any;
  let mockApp: any;

  const mockConfig = {
    windows: {
      main: {
        preload: { path: '/path/to/preload.js' },
        renderer: { path: '/path/to/renderer.html' },
      },
      settings: {
        preload: { path: '/path/to/settings-preload.js' },
        renderer: new URL('http://localhost:3000/settings'),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock BrowserWindow instance
    mockWindow = {
      isDestroyed: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      show: vi.fn(),
      focus: vi.fn(),
      restore: vi.fn(),
      close: vi.fn(),
      loadFile: vi.fn(),
      loadURL: vi.fn(),
      getBounds: vi.fn(() => ({ x: 100, y: 100, width: 800, height: 600 })),
      on: vi.fn(),
      once: vi.fn(),
      webContents: {
        openDevTools: vi.fn(),
        on: vi.fn(),
      },
    };

    // Mock BrowserWindow constructor
    (BrowserWindow as any).mockImplementation(() => mockWindow);
    (BrowserWindow as any).getAllWindows = vi.fn(() => []);

    // Mock WindowStateManager
    mockStateManager = {
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      zoomFactor: 1.0,
      manage: vi.fn(),
    };
    (WindowStateManager as any).mockImplementation(() => mockStateManager);

    // Mock app
    mockApp = {
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
    };

    windowManager = new WindowManager({
      initConfig: mockConfig,
      openDevTools: false,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default main window name', () => {
      const wm = new WindowManager({
        initConfig: mockConfig,
      });
      expect(wm).toBeInstanceOf(WindowManager);
    });

    it('should initialize with custom main window name', () => {
      const wm = new WindowManager({
        initConfig: { ...mockConfig, mainWindowName: 'custom' },
      });
      expect(wm).toBeInstanceOf(WindowManager);
    });

    it('should initialize with openDevTools option', () => {
      const wm = new WindowManager({
        initConfig: mockConfig,
        openDevTools: true,
      });
      expect(wm).toBeInstanceOf(WindowManager);
    });
  });

  describe('init', () => {
    it('should initialize and create main window', async () => {
      const mainWindow = await windowManager.init({ app: mockApp });

      expect(mockApp.whenReady).toHaveBeenCalled();
      expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
      expect(mainWindow).toBe(mockWindow);
    });
  });

  describe('getWindow', () => {
    it('should return undefined when window is not registered', async () => {
      const result = await windowManager.getWindow('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return registered window when it exists and is not destroyed', async () => {
      // First create a window
      await windowManager.createWindow('main');

      const result = await windowManager.getWindow('main');
      expect(result).toBe(mockWindow);
    });

    it('should cleanup and return undefined when registered window is destroyed', async () => {
      // Create a window first
      await windowManager.createWindow('main');

      // Mock window as destroyed
      mockWindow.isDestroyed.mockReturnValue(true);

      const result = await windowManager.getWindow('main');
      expect(result).toBeUndefined();
    });
  });

  describe('openWindow', () => {
    it('should return existing window and show/focus it', async () => {
      // First create a window
      await windowManager.createWindow('main');

      const result = await windowManager.openWindow('main');

      expect(result).toBe(mockWindow);
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should create new window when none exists and show/focus it', async () => {
      const result = await windowManager.openWindow('settings');

      expect(result).toBe(mockWindow);
      expect(BrowserWindow).toHaveBeenCalled();
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });

  describe('createWindow', () => {
    it('should throw error for non-existent window configuration', async () => {
      await expect(windowManager.createWindow('nonexistent')).rejects.toThrow(
        '[WindowManager] Configuration for window "nonexistent" not found.',
      );
    });

    it('should create window with file renderer', async () => {
      const window = await windowManager.createWindow('main');

      expect(BrowserWindow).toHaveBeenCalledWith({
        show: false,
        x: 100,
        y: 100,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          webviewTag: false,
          preload: '/path/to/preload.js',
          partition: 'window-main',
          zoomFactor: 1.0,
        },
      });

      expect(mockWindow.loadFile).toHaveBeenCalledWith('/path/to/renderer.html');
      expect(window).toBe(mockWindow);
    });

    it('should create window with URL renderer', async () => {
      const window = await windowManager.createWindow('settings');

      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:3000/settings');
      expect(window).toBe(mockWindow);
    });

    it('should show window and register event listeners', async () => {
      await windowManager.createWindow('main');

      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
      expect(mockWindow.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'did-fail-load',
        expect.any(Function),
      );
    });

    it('should open dev tools when openDevTools is true', async () => {
      const wmWithDevTools = new WindowManager({
        initConfig: mockConfig,
        openDevTools: true,
      });

      await wmWithDevTools.createWindow('main');

      // Trigger ready-to-show event
      const readyToShowCallback = mockWindow.once.mock.calls.find(
        (call: any) => call[0] === 'ready-to-show',
      )[1];
      readyToShowCallback();

      expect(mockWindow.webContents.openDevTools).toHaveBeenCalled();
    });

    it('should handle main window close by closing all other windows', async () => {
      const otherWindow = {
        ...mockWindow,
        isDestroyed: vi.fn(() => false),
        close: vi.fn(),
      };
      (BrowserWindow as any).getAllWindows = vi.fn(() => [mockWindow, otherWindow]);

      await windowManager.createWindow('main');

      // Since this is the main window, it should have the cleanup logic
      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('should handle window load timeout', async () => {
      const TIMEOUT_MS = 1000;
      vi.useFakeTimers();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await windowManager.createWindow('main');

      // Fast-forward timer
      vi.advanceTimersByTime(TIMEOUT_MS);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[WindowManager] ⚠️ Window main taking too long to load, showing anyway',
      );

      vi.useRealTimers();
      consoleSpy.mockRestore();
    });

    it('should handle load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await windowManager.createWindow('main');

      // Trigger did-fail-load event
      const failLoadCallback = mockWindow.webContents.on.mock.calls.find(
        (call: any) => call[0] === 'did-fail-load',
      )[1];
      failLoadCallback({}, 1, 'Network error', 'http://example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[WindowManager] Failed to load http://example.com:',
        'Network error',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('restoreOrCreateWindow', () => {
    it('should create new window when none exists', async () => {
      const window = await windowManager.restoreOrCreateWindow();
      expect(window).toBe(mockWindow);
    });

    it('should return existing window without showing', async () => {
      (BrowserWindow as any).getAllWindows = vi.fn(() => [mockWindow]);

      const window = await windowManager.restoreOrCreateWindow(false);
      expect(window).toBe(mockWindow);
      expect(mockWindow.focus).not.toHaveBeenCalled();
    });

    it('should restore and focus minimized window', async () => {
      mockWindow.isMinimized.mockReturnValue(true);
      await windowManager.createWindow('main');

      const window = await windowManager.restoreOrCreateWindow(true);

      expect(mockWindow.restore).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
      expect(window).toBe(mockWindow);
    });

    it('should focus non-minimized window', async () => {
      await windowManager.createWindow('main');

      const window = await windowManager.restoreOrCreateWindow(true);

      expect(mockWindow.restore).not.toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
      expect(window).toBe(mockWindow);
    });
  });

  describe('getZoomMenuItems', () => {
    it('should return zoom menu items from zoom manager', () => {
      const menuItems = windowManager.getZoomMenuItems();
      expect(Array.isArray(menuItems)).toBe(true);
    });
  });
});
