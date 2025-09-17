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
      },
      settings: {
        preload: { path: path.join(__dirname, 'preload.js') },
        renderer: new URL('http://localhost:3000/settings'),
      },
    },
  },
  openDevTools: true, // Set to true for development
});

// Initialize and create main window
app.whenReady().then(async () => {
  const mainWindow = await windowManager.init({ app });

  // Open settings window (creates if doesn't exist, or shows existing)
  const settingsWindow = await windowManager.openWindow('settings');
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
      },
    },
  },
  openDevTools: false, // optional
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
  defaultWidth: 1200,
  defaultHeight: 800,
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

### WindowStateManager Options

- `file` - State file name (default: 'window-state.json')
- `path` - Directory for state file (default: userData)
- `defaultWidth/Height` - Default dimensions (default: 800x600)
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
