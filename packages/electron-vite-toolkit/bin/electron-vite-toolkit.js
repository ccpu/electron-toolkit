#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(currentDir, '../dist/cli.js');

const CLI_ARGS_START_INDEX = 2;
const child = spawn('node', [scriptPath, ...process.argv.slice(CLI_ARGS_START_INDEX)], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
