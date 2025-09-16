# electron-ipc-typesafe

A type-safe IPC (Inter-Process Communication) library for Electron applications. This package provides a clean, modular approach to handle both renderer-to-main and main-to-renderer communication with **flexible handler registration**.

## 🚀 Quick Start

### 1. Install the Package

First, install the `electron-ipc-typesafe` package:

```bash
npm install electron-ipc-typesafe
# or
pnpm add electron-ipc-typesafe
# or
yarn add electron-ipc-typesafe
```

### 2. Define Your API Schema

```typescript
// api-schema.ts
import { createIpcSchema, defineEvent, defineHandler } from 'electron-ipc-typesafe';

export const myApi = createIpcSchema({
  apiKey: 'myApp',
  handlers: {
    'get-user-data': defineHandler<[userId: string], { id: string; name: string }>(),
    'save-settings': defineHandler<[settings: object], { success: boolean }>(),
  },
  events: {
    'user-updated': defineEvent<[userId: string, userData: object]>(),
    'settings-changed': defineEvent<[newSettings: object]>(),
  },
});
```

### 3. Register Handlers in Different Modules

```typescript
// user-service.ts
import { myApi } from './api-schema';

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

### 4. Setup Main Process

```typescript
// main.ts
import { ipcMain } from 'electron';
import { myApi } from './api-schema';

// Import your services to register handlers
import './user-service';
import './settings-service';

// Register all handlers with IpcMain
myApi.registerMainHandlers(ipcMain);

// Send events when needed
myApi.send.userUpdated(browserWindow, 'user123', { name: 'Jane Doe' });
```

### 5. Setup Preload Script

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { myApi } from './api-schema';

const api = myApi.exposeInPreload(ipcRenderer);
contextBridge.exposeInMainWorld('myApp', api);
```

### 6. Use in Renderer (Direct Import)

```typescript
// renderer component
import { myApi } from './api-schema';

const result = await myApi.invoke.getUserData('user123');
const unsubscribe = myApi.events.onUserUpdated((userId, userData) => {
  console.log('User updated:', userId, userData);
});

// Don't forget to cleanup
useEffect(() => unsubscribe, []);
```

## 📊 **Why Use `createIpcSchema`**

- **Modular**: Handlers can be registered from different modules
- **Separation of concerns**: Handler logic lives with related business logic
- **Testable**: Individual handlers can be easily unit tested
- **Scalable**: Perfect for large applications with many IPC handlers
- **Type-safe**: Full TypeScript support with schema definitions
- **Flexible**: Use direct imports or window-based API access

## API Reference

### `createIpcSchema(config)`

Creates a type-safe IPC API with flexible handler registration.

```typescript
const api = createIpcSchema({
  apiKey: 'myApp',
  handlers: {
    /* handler definitions */
  },
  events: {
    /* event definitions */
  },
});
```

### `defineHandler<Args, Return>()`

Define handler argument and return types.

```typescript
const handlers = {
  'get-user': defineHandler<[userId: string], { id: string; name: string }>(),
};
```

### `defineEvent<Args>()`

Define event argument types.

```typescript
const events = {
  'user-updated': defineEvent<[userId: string, userData: object]>(),
};
```

## 📝 Common Patterns

### Complex Application Structure

```typescript
// api-schema.ts
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
    'user.updated': defineEvent<[user: User]>(),
    'file.changed': defineEvent<[path: string]>(),
    'settings.changed': defineEvent<[key: string, value: any]>(),
  },
});
```

```typescript
// modules/user-service.ts
import { appApi } from '../api-schema';

appApi.registerHandler(
  'user.get',
  async (_event, id) => await database.users.findById(id),
);

appApi.registerHandler('user.create', async (_event, userData) => {
  const user = await database.users.create(userData);
  appApi.send.userUpdated(mainWindow, user);
  return user;
});
```

```typescript
// modules/file-service.ts
import { appApi } from '../api-schema';

appApi.registerHandler('file.read', (_event, path) => fs.readFileSync(path, 'utf8'));
```

## Best Practices

1. **Use descriptive API keys** - avoid conflicts between different bridges
2. **Create separate API files** - keep IPC definitions in shared files
3. **Always cleanup event listeners** - call unsubscribe functions
4. **Use kebab-case for channel names** - auto-converted to camelCase
5. **Modular handler registration** - register handlers where business logic lives

## Alternative: Window-Based API Access (Optional)

If you prefer to use window-based API access instead of direct imports:

### Add Type Definitions for Renderer

Create `global.d.ts` in your renderer source directory:

```typescript
// global.d.ts
import type { myApi } from './path/to/api-schema';

declare global {
  interface Window {
    myApp: ReturnType<typeof myApi.exposeInPreload>;
  }
}

export {};
```

### Use Window API in Renderer

```typescript
// renderer component
const result = await window.myApp.getUserData('user123');
const unsubscribe = window.myApp.events.onUserUpdated((userId, userData) => {
  console.log('User updated:', userId, userData);
});

// Don't forget to cleanup
useEffect(() => unsubscribe, []);
```

## Testing

```bash
npm test
```
