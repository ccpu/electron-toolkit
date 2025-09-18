# electron-window-toolkit

A simple toolkit for managing Electron windows with state persistence and zoom functionality.

## Installation

```bash
npm install electron-window-toolkit
```

## Quick Start

```typescript
import { WindowManager } from 'electron-window-toolkit';

// Define your window configurations
const windowManager = new WindowManager({
  initConfig: {
    mainWindowName: 'main',
    windows: {
      main: {
        preload: { path: path.join(__dirname, 'preload.js') },
        renderer: { path: 'index.html' },
        options: {
          width: 1200,
          height: 800,
          titleBarStyle: 'hiddenInset',
        },
      },
      settings: {
        preload: { path: path.join(__dirname, 'preload.js') },
        renderer: new URL('http://localhost:3000/settings'),
        options: {
          width: 600,
          height: 400,
          resizable: false,
        },
      },
    },
  },
  openDevTools: true, // Set to true for development
  defaultWindowOptions: {
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  },
});

// Initialize and create main window
app.whenReady().then(async () => {
  const mainWindow = await windowManager.init({ app });

  // Open settings window (creates if doesn't exist, or shows existing)
  const settingsWindow = await windowManager.openWindow('settings');

  // Open a window with runtime options that override config
  const customWindow = await windowManager.openWindow('settings', {
    width: 800, // Overrides the 600 from config
    height: 600, // Overrides the 400 from config
  });
});
```

## Advanced Example: Options Merging

```typescript
const windowManager = new WindowManager({
  initConfig: {
    windows: {
      editor: {
        preload: { path: 'preload.js' },
        renderer: { path: 'editor.html' },
        options: {
          width: 1400,
          height: 900,
          webPreferences: {
            nodeIntegration: true,
          },
        },
      },
    },
  },
  defaultWindowOptions: {
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
  },
});

// This window will have merged options:
// - Base: session isolation, security defaults
// - Default: contextIsolation: true, sandbox: false, titleBarStyle: 'hiddenInset'
// - Config: width: 1400, height: 900, nodeIntegration: true
// - Runtime: width: 1600 (overrides config)
const editorWindow = await windowManager.openWindow('editor', {
  width: 1600, // Runtime override
});
```

## Core Features

- **Window Registry**: Fast window lookup by name with automatic cleanup
- **State Persistence**: Automatically saves window position, size, and zoom level
- **Zoom Management**: Independent zoom levels per window with menu integration
- **Session Isolation**: Each window gets its own session to prevent zoom conflicts
- **TypeScript**: Full TypeScript support with comprehensive types

## Components

### WindowManager

Manages multiple windows with automatic state persistence and zoom control.

```typescript
const windowManager = new WindowManager({
  initConfig: {
    mainWindowName: 'main', // optional, defaults to 'main'
    windows: {
      main: {
        preload: { path: '/path/to/preload.js' },
        renderer: { path: '/path/to/index.html' }, // or new URL(...)
        options: {
          // Window-specific BrowserWindow options
          width: 1200,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
          },
        },
      },
    },
  },
  openDevTools: false, // optional
  defaultWindowOptions: {
    // Default options applied to all windows
    webPreferences: {
      contextIsolation: true,
    },
  },
});

// Methods
await windowManager.init({ app }); // Initialize with main window
const window = await windowManager.getWindow('windowName'); // Fast lookup
const newWindow = await windowManager.createWindow('windowName'); // Create new window
const openedWindow = await windowManager.openWindow('windowName'); // Get existing or create new, then show/focus
const menuItems = windowManager.getZoomMenuItems(); // For application menu
```

### WindowStateManager (Advanced Usage)

For direct state management without WindowManager:

```typescript
import { WindowStateManager } from 'electron-window-toolkit';

const stateManager = new WindowStateManager({
  file: 'window-state.json',
  defaultWidth: 1200, // Optional - window width will be undefined if not provided
  defaultHeight: 800, // Optional - window height will be undefined if not provided
});

const win = new BrowserWindow({
  x: stateManager.x,
  y: stateManager.y,
  width: stateManager.width,
  height: stateManager.height,
});

stateManager.manage(win); // Auto-save state changes
```

### ZoomManager (Advanced Usage)

For direct zoom management:

```typescript
import { ZoomManager } from 'electron-window-toolkit';

const zoomManager = new ZoomManager();
zoomManager.registerWindow(win, 'windowName', stateManager);

// Add to application menu
const menuItems = zoomManager.getZoomMenuItems();
```

## Configuration Options

### WindowManager Options

- `initConfig.mainWindowName` - Name of the main window (default: 'main')
- `initConfig.windows` - Window configurations object
- `openDevTools` - Open DevTools on window creation (default: false)
- `defaultWindowOptions` - Default BrowserWindow options applied to all windows

### Window Configuration

Each window in the `initConfig.windows` object supports:

- `preload` - Preload script configuration
- `renderer` - Renderer content (file path or URL)
- `options` - BrowserWindow constructor options specific to this window

### Options Merging Priority

Window options are merged in the following order (highest priority last):

1. **Base options** - Default toolkit options (session isolation, security settings)
2. **Default options** - `defaultWindowOptions` from WindowManager constructor
3. **Window config options** - `options` from the window configuration
4. **Runtime options** - Options passed to `createWindow()` or `openWindow()`

This allows you to set common defaults for all windows while still customizing individual windows and overriding options at runtime.

### WindowStateManager Options

- `file` - State file name (default: 'window-state.json')
- `path` - Directory for state file (default: userData)
- `defaultWidth/Height` - Optional default dimensions (if not provided, window dimensions will be undefined until first save)
- `defaultZoomFactor` - Optional default zoom factor (if not provided, zoom factor will be undefined until first save)
- `maximize/fullScreen` - Restore maximized/fullscreen state (default: true)

### ZoomManager Options

- `zoomStep` - Zoom increment (default: 0.1)
- `minZoom/maxZoom` - Zoom limits (default: 0.25-3.0)

## API Reference

### WindowManager

- `init({ app })` → `Promise<BrowserWindow>` - Initialize with main window
- `getWindow(name)` → `Promise<BrowserWindow|undefined>` - Get existing window
- `createWindow(name)` → `Promise<BrowserWindow>` - Create new window
- `openWindow(name)` → `Promise<BrowserWindow>` - Get existing or create new window, then show and focus
- `getZoomMenuItems()` → `MenuItemConstructorOptions[]` - Get zoom menu items

### WindowStateManager

- `manage(window)` - Start managing window state
- `unmanage()` - Stop managing and save final state
- `updateZoomFactorState(zoom)` - Update zoom level
- `saveState(window?)` - Manually save state

### ZoomManager

- `registerWindow(window, name, stateManager)` - Register window for zoom
- `getZoomMenuItems()` - Get zoom menu items
- `zoomIn/zoomOut/resetZoom()` - Zoom controls
