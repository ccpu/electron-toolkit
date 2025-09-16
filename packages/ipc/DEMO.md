# IPC Enhancement Demo

This demonstrates the new flexible handler registration capability.

## Schema-Based API Example

```typescript
// api-schema.ts
import { createIpcSchema, defineArguments, defineHandler } from '@internal/ipc';

export const appApi = createIpcSchema({
  apiKey: 'demo-app',
  handlers: {
    'user.get': defineHandler<
      [id: string],
      { id: string; name: string; email: string }
    >(),
    'user.create': defineHandler<
      [userData: { name: string; email: string }],
      { id: string; name: string; email: string }
    >(),
    'settings.get': defineHandler<[key: string], any>(),
    'settings.set': defineHandler<[key: string, value: any], boolean>(),
    'file.read': defineHandler<[path: string], string>(),
    'file.write': defineHandler<[path: string, content: string], boolean>(),
  },
  events: {
    'user.created':
      defineArguments<[user: { id: string; name: string; email: string }]>(),
    'settings.changed': defineArguments<[key: string, value: any]>(),
    'file.saved': defineArguments<[path: string]>(),
  },
});
```

## Modular Handler Registration

```typescript
// services/user-service.ts
import { appApi } from '../api-schema';

const users: Array<{ id: string; name: string; email: string }> = [];

appApi.registerHandler('user.get', (_event, id) => {
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  return user;
});

appApi.registerHandler('user.create', (_event, userData) => {
  const radix = 36;
  const user = {
    id: Math.random().toString(radix),
    ...userData,
  };
  users.push(user);

  // Emit event to notify UI
  appApi.send.userCreated(mainWindow, user);

  return user;
});
```

```typescript
// services/settings-service.ts
import { appApi } from '../api-schema';

const settings = new Map<string, any>();

appApi.registerHandler('settings.get', (_event, key) => settings.get(key));

appApi.registerHandler('settings.set', (_event, key, value) => {
  settings.set(key, value);
  appApi.send.settingsChanged(mainWindow, key, value);
  return true;
});
```

```typescript
// services/file-service.ts
import { promises as fs } from 'node:fs';
import { appApi } from '../api-schema';

appApi.registerHandler(
  'file.read',
  async (_event, path) => await fs.readFile(path, 'utf8'),
);

appApi.registerHandler('file.write', async (_event, path, content) => {
  await fs.writeFile(path, content, 'utf8');
  appApi.send.fileSaved(mainWindow, path);
  return true;
});
```

## Main Process Setup

```typescript
// main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { appApi } from './api-schema';

// Import services to register handlers
import './services/user-service';
import './services/settings-service';
import './services/file-service';

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  // Register all IPC handlers
  appApi.registerMainHandlers(ipcMain);

  mainWindow.loadFile('index.html');
});
```

## Renderer Usage

```typescript
// renderer.ts
async function demo() {
  // Create a user
  const user = await window.appApi.userCreate({
    name: 'John Doe',
    email: 'john@example.com',
  });

  console.log('Created user:', user);

  // Get the user back
  const retrievedUser = await window.appApi.userGet(user.id);
  console.log('Retrieved user:', retrievedUser);

  // Save settings
  await window.appApi.settingsSet('theme', 'dark');
  const theme = await window.appApi.settingsGet('theme');
  console.log('Theme setting:', theme);

  // Listen for events
  const unsubscribeUser = window.appApi.onUserCreated((newUser) => {
    console.log('New user created:', newUser);
  });

  const unsubscribeSettings = window.appApi.onSettingsChanged((key, value) => {
    console.log(`Setting ${key} changed to:`, value);
  });

  // Cleanup listeners when done
  // unsubscribeUser();
  // unsubscribeSettings();
}
```

## Benefits Demonstrated

1. **Modular**: Each service registers its own handlers
2. **Type-safe**: Full TypeScript support with proper inference
3. **Testable**: Each handler can be unit tested in isolation
4. **Scalable**: Easy to add new handlers without touching existing code
5. **Maintainable**: Handler logic lives with related business logic
