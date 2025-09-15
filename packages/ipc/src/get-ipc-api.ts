// Declare window for TypeScript in renderer context
declare const window: any;

// Get the IPC API from the exposed preload functions
export function getIpcApi(apiKey: string = 'ipcApi'): unknown | null {
  try {
    // Check if we're in a renderer process (where window is available)
    if (typeof window === 'undefined') {
      console.warn('IPC API not available - running in main process or Node.js context');
      return null;
    }

    const windowWithApi = window as unknown as Record<string, unknown>;

    // First, try to get the API using the plain apiKey (contextBridge.exposeInMainWorld)
    let ipcApi = windowWithApi[apiKey];

    // If not found, try the base64 encoded version (legacy support)
    if (ipcApi === undefined) {
      const encodedKey = btoa(apiKey);
      ipcApi = windowWithApi[encodedKey];
    }

    if (ipcApi === undefined) {
      console.warn('IPC API not available - running outside Electron context');
      return null;
    }

    return ipcApi;
  } catch (error) {
    console.error('Failed to access IPC API:', error);
    return null;
  }
}
