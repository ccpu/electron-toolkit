import { contextBridge } from 'electron';
import * as exports from './index';

function isExport(key: string): key is keyof typeof exports {
  return Object.hasOwn(exports, key);
}

for (const exportsKey in exports) {
  if (isExport(exportsKey)) {
    contextBridge.exposeInMainWorld(btoa(exportsKey), exports[exportsKey]);
  }
}

// Re-export for tests
export * from './index';
