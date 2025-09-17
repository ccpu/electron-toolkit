#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { startDevMode } from './dev-mode.js';

interface CliOptions {
  'windows-path'?: string;
  help?: boolean;
}

function showHelp(): void {
  console.log(`
Usage: electron-vite-toolkit [command] [options]

Commands:
  dev, start    Start development server (default)

Options:
  --windows-path <path>  Path to the windows directory (default: app/windows)
  --help                 Show this help message

Examples:
  electron-vite-toolkit dev
  electron-vite-toolkit dev --windows-path src/windows
  electron-vite-toolkit start --windows-path ./my-windows
`);
}

async function main(): Promise<void> {
  try {
    const CLI_ARGS_START_INDEX = 2;
    const { values, positionals } = parseArgs({
      args: process.argv.slice(CLI_ARGS_START_INDEX),
      options: {
        'windows-path': {
          type: 'string',
          short: 'w',
        },
        help: {
          type: 'boolean',
          short: 'h',
        },
      },
      allowPositionals: true,
    });

    const options = values as CliOptions;
    const [command = 'dev'] = positionals;

    if (options.help) {
      showHelp();
      return;
    }

    if (!['dev', 'start'].includes(command)) {
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
    }

    const devModeOptions = {
      windowsPath: options['windows-path']
        ? path.resolve(options['windows-path'])
        : undefined,
    };

    console.log('🚀 Starting Electron development mode...');
    if (devModeOptions.windowsPath) {
      console.log(`📁 Using windows path: ${devModeOptions.windowsPath}`);
    }

    await startDevMode(devModeOptions);
  } catch (error) {
    console.error('Error starting development mode:', error);
    process.exit(1);
  }
}

// Auto-run when called directly (e.g., through bin script)
main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { main };
