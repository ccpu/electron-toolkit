# @internal/ipc

A type-safe IPC (Inter-Process Communication) library for Electron applications. This package provides a clean, modular approach to handle both renderer-to-main and main-to-renderer communication with **flexible handler registration**.

## 🚀 Quick Start (Recommended: Schema-Based Approach)

### 1. Define Your API Schema (Main Process Only)

```typescript
// main-process-api.ts
import { createIpcSchema, defineArguments, defineHandler } from '@internal/ipc';

export const myApi = createIpcSchema({
  apiKey: 'myApp',
  handlers: {
    'get-user-data': defineHandler<[userId: string], { id: string; name: string }>(),
    'save-settings': defineHandler<[settings: object], { success: boolean }>(),
  },
  events: {
    'user-updated': defineArguments<[userId: string, userData: object]>(),
    'settings-changed': defineArguments<[newSettings: object]>(),
  },
});
```

### 2. Register Handlers in Different Modules

```typescript
// user-service.ts
import { myApi } from './main-process-api';

myApi.registerHandler(
  'get-user-data',
  (_event, userId) => userService.getUser(userId), // Type-safe!
);

// settings-service.ts
myApi.registerHandler(
  'save-settings',
  (_event, settings) => settingsService.save(settings), // Type-safe!
);
```

### 3. Register in Main Process

```typescript
// main.ts
import { ipcMain } from 'electron';
import { myApi } from './main-process-api';

// Import your services to register handlers
import './user-service';
import './settings-service';

// Register all handlers with IpcMain
myApi.registerMainHandlers(ipcMain);

// Send events when needed
myApi.send.userUpdated(browserWindow, 'user123', { name: 'Jane Doe' });
```

### 4. Setup Preload Script

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { myApi } from './main-process-api';

const api = myApi.exposeInPreload(ipcRenderer);
contextBridge.exposeInMainWorld('myApp', api);
```

### 5. Add Type Definitions for Renderer

Create `global.d.ts` in your renderer source directory:

```typescript
// global.d.ts
import type { myApi } from './path/to/main-process-api';

declare global {
  interface Window {
    myApp: ReturnType<typeof myApi.exposeInPreload>;
  }
}

export {};
```

### 6. Use in Renderer (Window API Only!)

```typescript

// renderer component
const result = await window.myApp.getUserData('user123');
const unsubscribe = window.myApp.onUserUpdated((userId, userData) => {
  console.log('User updated:', userId, userData);
});

// Don't forget to cleanup
useEffect(() => unsubscribe, []);
```

## 📊 **Why Use `createIpcSchema` (Recommended)**

### ✅ **Best Practices**

- **Modular**: Handlers can be registered from different modules
- **Separation of concerns**: Handler logic lives with related business logic
- **Testable**: Individual handlers can be easily unit tested
- **Scalable**: Perfect for large applications with many IPC handlers
- **Type-safe**: Full TypeScript support with schema definitions

### 🔧 **Legacy Support: `createIpcBridge`**

> ⚠️ **Use with caution in large applications**

```typescript
import { createIpcBridge, defineArguments } from '@internal/ipc';

export const myApi = createIpcBridge({
  apiKey: 'myApp',
  handlers: {
    'get-user-data': (_event, userId: string) => ({ id: userId, name: 'John Doe' }),
    'save-settings': (_event, settings: object) => ({ success: true }),
  },
  events: {
    'user-updated': defineArguments<[userId: string, userData: object]>(),
  },
});
```

**Limitations of `createIpcBridge`:**

- ❌ Poor separation of concerns (all handler logic in one file)
- ❌ Difficult to maintain in large applications
- ❌ No modular registration capabilities
- ❌ Handler logic can't live with related business logic
- ❌ Makes testing individual handlers more complex

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

## API Reference

### `createIpcSchema` (Recommended)

Creates a schema-based IPC API with flexible handler registration.

```typescript
interface IpcSchemaConfig {
  apiKey: string;
  handlers?: Record<string, HandlerSchema>;
  events?: Record<string, EventSchema>;
}

const api = createIpcSchema(config);
api.registerHandler(channel, handler); // Register handlers dynamically
api.registerMainHandlers(ipcMain); // Register all handlers with IpcMain
```

### `defineHandler`

Define handler argument and return types for schema-based APIs.

```typescript
import { defineHandler } from '@internal/ipc';

const handlers = {
  'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
  'save-file': defineHandler<[path: string, data: Uint8Array], boolean>(),
  'get-settings': defineHandler<[], Settings>(),
};
```

### `defineArguments`

Define event argument types.

```typescript
import { defineArguments } from '@internal/ipc';

const events = {
  'user-updated': defineArguments<[userId: string, userData: object]>(),
  'file-saved': defineArguments<[path: string, success: boolean]>(),
};
```

### `createIpcBridge` (Legacy)

Creates an IPC bridge with immediate handler registration.

```typescript
interface IpcBridgeConfig {
  apiKey: string;
  handlers?: Record<string, Handler>;
  events?: Record<string, EventSchema>;
}

type Handler = (event: IpcMainInvokeEvent, ...args: any[]) => any;
```

## 🔄 Migration from `createIpcBridge` to `createIpcSchema`

### Before (createIpcBridge)

```typescript
// ❌ Old way - everything in one place
export const api = createIpcBridge({
  apiKey: 'myApp',
  handlers: {
    'get-user': (_event, id: string) => userService.getUser(id),
    'get-settings': (_event) => settingsService.getAll(),
    'save-file': (_event, path: string, data: Uint8Array) => fileService.save(path, data),
  },
});
```

### After (createIpcSchema)

```typescript
// ✅ New way - modular and scalable
export const api = createIpcSchema({
  apiKey: 'myApp',
  handlers: {
    'get-user': defineHandler<[id: string], User>(),
    'get-settings': defineHandler<[], Settings>(),
    'save-file': defineHandler<[path: string, data: Uint8Array], boolean>(),
  },
});

// user-module.ts
api.registerHandler('get-user', (_event, id) => userService.getUser(id));

// settings-module.ts
api.registerHandler('get-settings', (_event) => settingsService.getAll());

// file-module.ts
api.registerHandler('save-file', (_event, path, data) => fileService.save(path, data));
```

## 📝 Common Patterns

### Complex Application Structure

```typescript
// api-schema.ts
// modules/user-service.ts
import { appApi } from '../api-schema';

export const appApi = createIpcSchema({
  apiKey: 'myApp',
  handlers: {
    // User management
    'user.get': defineHandler<[id: string], User>(),
    'user.create': defineHandler<[userData: CreateUserRequest], User>(),
    'user.update': defineHandler<[id: string, updates: UpdateUserRequest], User>(),

    // File operations
    'file.read': defineHandler<[path: string], string>(),
    'file.write': defineHandler<[path: string, content: string], boolean>(),

    // Settings
    'settings.get': defineHandler<[key: string], any>(),
    'settings.set': defineHandler<[key: string, value: any], boolean>(),
  },
  events: {
    'user.updated': defineArguments<[user: User]>(),
    'file.changed': defineArguments<[path: string]>(),
    'settings.changed': defineArguments<[key: string, value: any]>(),
  },
});

appApi.registerHandler(
  'user.get',
  async (_event, id) => await database.users.findById(id),
);

appApi.registerHandler('user.create', async (_event, userData) => {
  const user = await database.users.create(userData);
  appApi.send.userUpdated(mainWindow, user);
  return user;
});

// modules/file-service.ts
appApi.registerHandler('file.read', (_event, path) => fs.readFileSync(path, 'utf8'));
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
