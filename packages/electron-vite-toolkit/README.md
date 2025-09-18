# electron-vite-toolkit

> **Note:** This toolkit has been mainly created to use with [electron-vite-tailwind-monorepo-template](https://github.com/ccpu/electron-vite-tailwind-monorepo-template).

A comprehensive toolkit for building Electron applications with Vite, featuring multi-window support, hot reload, and TypeScript integration.

## Features

- 🚀 **Multi-window support** - Easily manage multiple Electron windows
- ⚡ **Hot reload** - Fast development with Vite-powered hot reload
- 🔧 **TypeScript support** - Full TypeScript integration
- 🎯 **Auto port management** - Automatic dev server port allocation
- 📦 **Easy setup** - Simple configuration and initialization
- 🔄 **Development & Production** - Seamless transition between dev and production builds

## Installation

```bash
npm install electron-vite-toolkit
# or
yarn add electron-vite-toolkit
# or
pnpm add electron-vite-toolkit
```

## Usage

### Basic Setup

1. **Create your entry script** (e.g., `scripts/electron-entry.mjs`):

```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWindowsConfig } from 'electron-vite-toolkit/windows-config';

(async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const windowsPath = path.resolve(scriptDir, '../app/windows');
  const config = await buildWindowsConfig({ windowsPath });

  const mainDist = await import('../app/main/dist/index.js');
  const { initApp } = mainDist;
  initApp(config);
})();
```

2. **Project Structure**:

```
your-project/
├── app/
│   ├── main/
│   │   └── src/
│   │       └── index.ts        # Main process entry
│   └── windows/
│       ├── main/
│       │   ├── renderer/       # Main window renderer
│       │   └── preload/        # Main window preload
│       └── settings/
│           ├── renderer/       # Settings window renderer
│           └── preload/        # Settings window preload
└── scripts/
    └── electron-entry.mjs
```

### CLI Usage

Start development server:

```bash
npx electron-vite-toolkit dev
# or
npx electron-vite-toolkit start
```

#### CLI Options

The CLI now supports configurable paths for better project flexibility:

```bash
# Use default windows path (app/windows)
npx electron-vite-toolkit dev

# Specify custom windows path
npx electron-vite-toolkit dev --windows-path src/windows
npx electron-vite-toolkit dev -w custom/windows/path

# Show help
npx electron-vite-toolkit --help
npx electron-vite-toolkit -h
```

**Available Options:**

- `--windows-path, -w <path>`: Path to the windows directory (default: `app/windows`)
- `--help, -h`: Show help message

**Examples:**

```bash
# Standard usage
npx electron-vite-toolkit dev

# Custom windows directory
npx electron-vite-toolkit dev --windows-path src/electron/windows

# Using short flag
npx electron-vite-toolkit start -w ./windows

# Different project structure
npx electron-vite-toolkit dev --windows-path packages/renderer/windows
```

### API Reference

#### `buildWindowsConfig(options)`

Builds configuration for all discovered windows based on the current environment.

**Parameters:**

- `options.windowsPath` (string): Path to the windows directory

**Returns:**

- `WindowsConfig`: Configuration object containing window definitions

**Example:**

```javascript
import { buildWindowsConfig } from 'electron-vite-toolkit/windows-config';

const config = buildWindowsConfig({
  windowsPath: path.resolve(__dirname, '../app/windows'),
});

// In development: uses dev server URLs
// In production: uses built file paths
```

#### `startDevMode(options?)`

Starts the development server with hot reload support.

**Parameters:**

- `options.windowsPath` (string, optional): Path to the windows directory. Defaults to `'app/windows'`

**Examples:**

```javascript
import { startDevMode } from 'electron-vite-toolkit';

// Use default windows path
await startDevMode();

// Use custom windows path
await startDevMode({
  windowsPath: 'src/windows',
});

// Absolute path
await startDevMode({
  windowsPath: '/path/to/project/windows',
});
```

### TypeScript Types

The toolkit exports TypeScript interfaces for better development experience:

```typescript
import { DevModeOptions, WindowConfig, WindowsConfig } from 'electron-vite-toolkit';

// Development mode options
const devOptions: DevModeOptions = {
  windowsPath: 'src/windows',
};

// Window configuration type
const windowConfig: WindowConfig = {
  renderer: new URL('http://localhost:5173'),
  preload: { path: '/path/to/preload.mjs' },
};
```

### Environment Variables

The toolkit automatically manages these environment variables:

- `VITE_DEV_SERVER_URL` - Main window dev server URL
- `VITE_DEV_SERVER_URL_{WINDOW_NAME}` - Additional window dev server URLs (e.g., `VITE_DEV_SERVER_URL_SETTINGS`)
- `MODE` - Current mode ('development' or 'production')
- `NODE_ENV` - Node environment ('development' or 'production')

### Multi-Window Support

The toolkit automatically discovers windows in your configured windows directory (default: `app/windows`). Each folder represents a window:

```
{windowsPath}/
├── main/           # Main window (required)
│   ├── renderer/   # Vite-powered renderer process
│   └── preload/    # Preload script
└── settings/       # Additional window
    ├── renderer/   # Vite-powered renderer process
    └── preload/    # Preload script
```

The windows directory can be customized through CLI options or API calls:

- **Default**: `app/windows`
- **CLI**: `--windows-path custom/windows`
- **API**: `startDevMode({ windowsPath: 'custom/windows' })`

#### `mainConfig(options?)`

Creates a Vite configuration for the Electron main process with hot reload support.

**Parameters:**

- `options` (UserConfig, optional): Additional Vite configuration options to merge

**Example:**

```javascript
// vite.config.js for main process
import { mainConfig } from 'electron-vite-toolkit/vite/main';

export default mainConfig({
  // your custom config
  build: {
    outDir: 'custom-dist',
  },
});
```

#### `createRendererViteConfig(options?)`

Creates a base Vite configuration for renderer processes. Include your own plugins such as React and Tailwind CSS.

**Parameters:**

- `options` (UserConfig, optional): Additional Vite configuration options to merge

**Example:**

```javascript
// vite.config.js for renderer
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createRendererViteConfig } from 'electron-vite-toolkit/vite/renderer';

export default createRendererViteConfig({
  // your custom config
  plugins: [
    react(),
    tailwindcss(),
    // additional plugins
  ],
});
```

#### `createPreloadViteConfig(options?)`

Creates a Vite configuration for preload scripts with hot reload and API exposure support.

**Parameters:**

- `options` (UserConfig, optional): Additional Vite configuration options to merge

**Example:**

```javascript
// vite.config.js for preload
import { createPreloadViteConfig } from 'electron-vite-toolkit/vite/preload';

export default createPreloadViteConfig({
  // your custom config
});
```

### Vite Integration

Use the provided Vite configurations for optimal development experience with pre-configured settings for each process type.

## Advanced Usage

### Custom Window Configuration

You can customize window behavior by building the configuration programmatically:

```typescript
import { buildWindowsConfig } from 'electron-vite-toolkit/windows-config';

// Build configuration with custom windows path
const config = buildWindowsConfig({
  windowsPath: path.resolve(__dirname, 'custom/windows'),
});

// Access individual window configurations
const mainWindow = config.windows.main;
const settingsWindow = config.windows.settings;

// Use in your main process
export async function initApp(windowsConfig: WindowsConfig): Promise<void> {
  // Your custom initialization logic
  // Access all discovered windows through windowsConfig.windows
  Object.entries(windowsConfig.windows).forEach(([name, windowConfig]) => {
    console.log(`Window ${name}:`, windowConfig);
  });
}
```

### Development vs Production

The toolkit automatically handles different modes:

- **Development**: Uses Vite dev servers with hot reload and automatic port allocation
- **Production**: Uses built files from `dist` directories with optimized bundles

### Custom Development Workflow

You can integrate the development mode into your own scripts:

```javascript
import { startDevMode } from 'electron-vite-toolkit';

// Custom development setup
async function customDev() {
  await startDevMode({
    windowsPath: process.env.WINDOWS_PATH || 'app/windows',
  });
}

// Run with environment variables
// WINDOWS_PATH=src/windows node custom-dev.js
```

## Troubleshooting

### Port Conflicts

If you encounter port conflicts, the toolkit automatically finds available ports. You can also set `RANDOM_PORTS=true` for random port allocation:

```bash
RANDOM_PORTS=true npx electron-vite-toolkit dev
```

### Custom Windows Path Issues

If the toolkit can't find your windows directory:

1. **Check the path exists**: Ensure your windows directory contains the required structure
2. **Use absolute paths**: When in doubt, use absolute paths in CLI or API calls
3. **Verify permissions**: Make sure the directory is readable

```bash
# Debug with explicit path
npx electron-vite-toolkit dev --windows-path ./src/electron/windows

# Check if directory exists
ls -la ./src/electron/windows
```

### Module Resolution

Make sure your import paths are correct and use the proper file extensions (`.mjs` for ES modules).

### Dev Server Issues

If development servers fail to start:

1. **Check port availability**: Ensure ports aren't blocked by firewall
2. **Verify renderer directories**: Each window should have a `renderer` subdirectory
3. **Check console output**: Look for specific error messages about missing files

### Build Issues

If builds fail:

1. **Update dependencies**: Ensure all packages are up to date
2. **Check TypeScript config**: Verify `tsconfig.json` is properly configured
3. **Clear cache**: Try removing `node_modules` and reinstalling

## Contributing

Contributions are welcome! Please check the [main repository](https://github.com/ccpu/electron-toolkit) for contribution guidelines.

## Acknowledgments

This toolkit is based on the excellent work by [cawa-93](https://github.com/cawa-93) in the original [vite-electron-builder](https://github.com/cawa-93/vite-electron-builder) repository. Special thanks to the contributors and the Electron community for their ongoing support and inspiration.

## License

MIT - see LICENSE file for details.
