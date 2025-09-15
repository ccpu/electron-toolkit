# @internal/ipc

A type-safe IPC (Inter-Process Communication) library for Electron applications. This package provides a clean, modular approach to handle both renderer-to-main and main-to-renderer communication.

## Quick Setup Guide

### 1. Create Your API (Main Process Only)

```typescript
// main-process-api.ts
import { createIpcBridge, defineArguments } from '@internal/ipc';

export const myApi = createIpcBridge({
  apiKey: 'myApp',
  handlers: {
    'get-user-data': (_event, userId: string) => ({ id: userId, name: 'John Doe' }),
    'save-settings': (_event, settings: object) => ({ success: true }),
  },
  events: {
    'user-updated': defineArguments<[userId: string, userData: object]>(),
    'settings-changed': defineArguments<[newSettings: object]>(),
  },
});
```

### 2. Register in Main Process

```typescript
// main.ts
import { myApi } from './main-process-api';

myApi.registerMainHandlers(ipcMain);

// Send events when needed
myApi.send.userUpdated(browserWindow, 'user123', { name: 'Jane Doe' });
```

### 3. Setup Preload Script

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { myApi } from './main-process-api';

const api = myApi.exposeInPreload(ipcRenderer);
contextBridge.exposeInMainWorld('myApp', api);
```

### 4. Add Type Definitions for Renderer

Create `global.d.ts` in your renderer source directory:

```typescript
// global.d.ts
import type { myApi } from './path/to/main-process-api';

declare global {
  interface Window {
    myApp: ReturnType<typeof myApi>;
  }
}

export {};
```

### 5. Use in Renderer (Window API Only!)

```typescript
// renderer component
const result = await window.myApp.getUserData('user123');
const unsubscribe = window.myApp.onUserUpdated((userId, userData) => {
  console.log('User updated:', userId, userData);
});

// Don't forget to cleanup
useEffect(() => unsubscribe, []);
```

## ⚠️ **CRITICAL: Renderer Usage Warning**

**DO NOT import `myApi` directly in renderer processes unless you are not using any Node.js APIs!**

```typescript
// ❌ NEVER do this in renderer if using Node.js APIs - will cause errors
import { myApi } from '@internal/ipc';

const result = await myApi.invoke.getUserData('user123');
```

**✅ Always use `window.apiName` in renderer processes:**

```typescript
// ✅ CORRECT - Use window API exposed by preload
const result = await window.myApi.getUserData('user123');
const unsubscribe = window.myApi.onUserUpdated((userId, userData) => {
  console.log('User updated:', userId, userData);
});
```

## API Types

### `createIpcBridge` Options

```typescript
interface IpcBridgeConfig {
  apiKey: string;
  handlers?: Record<string, Handler>;
  events?: Record<string, EventSchema>;
}
```

### Handler Functions

```typescript
type Handler = (event: IpcMainInvokeEvent, ...args: any[]) => any;
```

### Event Definitions

```typescript
import { defineArguments } from '@internal/ipc';

const events = {
  'event-name': defineArguments<[arg1: Type1, arg2: Type2]>(),
};
```

## Common Patterns

### Handlers Only (Request/Response)

```typescript
import { createIpcHandlers } from '@internal/ipc';

const apiHandlers = createIpcHandlers('handlers', {
  'fetch-data': (_event, id: string) => getData(id),
  'save-data': (_event, data: object) => saveData(data),
});

// Main process
apiHandlers.registerMainHandlers(ipcMain);

// Preload
const api = apiHandlers.exposeInPreload(ipcRenderer);
contextBridge.exposeInMainWorld('handlers', api);

// Renderer usage
const data = await window.handlers.fetchData('123');
```

### Events Only (Push Notifications)

```typescript
import { createIpcEvents, defineArguments } from '@internal/ipc';

const apiEvents = createIpcEvents('events', {
  'status-changed': defineArguments<[status: string]>(),
  'data-updated': defineArguments<[data: object]>(),
});

// Main process
apiEvents.send.statusChanged(browserWindow, 'ready');

// Preload
const api = apiEvents.exposeInPreload(ipcRenderer);
contextBridge.exposeInMainWorld('events', api);

// Renderer
const unsubscribe = window.events.onStatusChanged((status) => {
  console.log('Status:', status);
});
```

## Best Practices

1. **Never import IPC bridges in renderer** - always use `window.apiName`
2. **Create separate API files** - keep IPC definitions in main process files
3. **Use descriptive API keys** - avoid conflicts between different bridges
4. **Always cleanup event listeners** - call unsubscribe functions
5. **Use kebab-case for channel names** - auto-converted to camelCase

## Testing

```bash
npm test
```
