#!/usr/bin/env node

/**
 * New Window Creator Script
 *
 * This script creates a new window from the template and replaces placeholders
 * with the desired window name.
 *
 * Usage:
 *   node create-new-window.js [window-name]
 *   npm run create-window [window-name]
 */

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const readline = require('node:readline');

// ANSI color codes for console output
const colors = {
  reset: '\x1B[0m',
  cyan: '\x1B[36m',
  green: '\x1B[32m',
  red: '\x1B[31m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  gray: '\x1B[90m',
  white: '\x1B[37m',
};

// Helper function for colored console output
function colorLog(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Get project paths
const projectRoot = path.dirname(__dirname);
const templateDir = path.join(projectRoot, 'templates', 'windows', 'new-window');
const windowsDir = path.join(projectRoot, 'app', 'windows');

/**
 * Validates window name format
 * @param {string} name - The window name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateWindowName(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return false;
  }

  // Check if name contains only alphanumeric characters, hyphens, and underscores
  if (!/^[\w-]+$/u.test(name)) {
    colorLog(
      '❌ Window name can only contain letters, numbers, hyphens, and underscores.',
      'red',
    );
    return false;
  }

  // Check if name starts with a letter
  if (!/^[a-z]/iu.test(name)) {
    colorLog('❌ Window name must start with a letter.', 'red');
    return false;
  }

  return true;
}

/**
 * Prompts user for window name
 * @returns {Promise<string>} - The validated window name
 */
function promptForWindowName() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askForName = () => {
      rl.question(
        "Enter the window name (e.g., 'about', 'settings', 'preferences'): ",
        (name) => {
          const trimmedName = name.trim().toLowerCase();
          if (validateWindowName(trimmedName)) {
            rl.close();
            resolve(trimmedName);
          } else {
            askForName();
          }
        },
      );
    };
    askForName();
  });
}

/**
 * Prompts user for confirmation
 * @param {string} message - The confirmation message
 * @returns {Promise<boolean>} - True if confirmed, false otherwise
 */
function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Recursively copies a directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  const excludedDirs = ['.turbo', '.cache', 'node_modules', 'dist', '.git'];

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      // Skip excluded directories
      if (!excludedDirs.includes(item)) {
        copyDirectory(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Removes build artifacts and cache directories
 * @param {string} targetDir - The target directory to clean
 */
function removeBuildArtifacts(targetDir) {
  const artifactDirs = ['.turbo', '.cache', 'node_modules', 'dist'];

  function removeArtifactsRecursively(dir) {
    if (!fs.existsSync(dir)) return;

    for (const artifactDir of artifactDirs) {
      const fullPath = path.join(dir, artifactDir);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          colorLog(`   🗑️  Removed build artifact: ${artifactDir}`, 'gray');
        } catch {
          colorLog(
            `   ⚠️  Could not remove ${artifactDir} (this is usually okay)`,
            'yellow',
          );
        }
      }
    }

    // Recursively clean subdirectories
    const subDirs = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const subDir of subDirs) {
      if (!artifactDirs.includes(subDir)) {
        removeArtifactsRecursively(path.join(dir, subDir));
      }
    }
  }

  removeArtifactsRecursively(targetDir);
}

/**
 * Updates file content by replacing placeholders
 * @param {string} filePath - Path to the file to update
 * @param {string} windowName - The new window name
 * @returns {boolean} - True if successful, false otherwise
 */
function updateFileContent(filePath, windowName) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace window-name- with the new name followed by -
    content = content.replace(/window-name-/gu, `${windowName}-`);

    // Replace @app/window-name-preload with @app/{windowname}-preload
    content = content.replace(
      /@app\/window-name-preload/gu,
      `@app/${windowName}-preload`,
    );

    // Replace @app/window-name-renderer with @app/{windowname}-renderer
    content = content.replace(
      /@app\/window-name-renderer/gu,
      `@app/${windowName}-renderer`,
    );

    // Replace standalone window-name with the new name (for cases like directory names in logs)
    content = content.replace(/\bwindow-name\b/gu, windowName);

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    colorLog(`❌ Failed to update file: ${filePath}`, 'red');
    colorLog(`   Error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Gets all files that need to be updated
 * @param {string} targetDir - The target directory
 * @returns {string[]} - Array of file paths to update
 */
function getFilesToUpdate(targetDir) {
  const filesToUpdate = [];
  const allowedExtensions = ['.json', '.ts', '.tsx', '.js', '.jsx', '.md', '.html'];
  const excludedDirs = ['.turbo', '.cache', 'node_modules', 'dist'];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (!excludedDirs.includes(item.name)) {
          scanDirectory(fullPath);
        }
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (allowedExtensions.includes(ext) && !item.name.endsWith('.log')) {
          filesToUpdate.push(fullPath);
        }
      }
    }
  }

  scanDirectory(targetDir);
  return filesToUpdate;
}

/**
 * Shows help information
 */
function showHelp() {
  colorLog('🚀 New Window Creator', 'cyan');
  colorLog('=====================', 'cyan');
  console.log('');
  colorLog(
    'Creates a new window from the template and replaces placeholders with the desired window name.',
    'white',
  );
  console.log('');
  colorLog('Usage:', 'yellow');
  colorLog('  node scripts/create-new-window.js [window-name]', 'white');
  colorLog('  pnpm create-window [window-name]', 'white');
  console.log('');
  colorLog('Arguments:', 'yellow');
  colorLog(
    '  window-name    Optional. The name for the new window (without spaces or special characters)',
    'white',
  );
  colorLog('                 If not provided, you will be prompted to enter it.', 'gray');
  console.log('');
  colorLog('Options:', 'yellow');
  colorLog('  -h, --help     Show this help message', 'white');
  console.log('');
  colorLog('Examples:', 'yellow');
  colorLog('  node scripts/create-new-window.js about', 'white');
  colorLog('  pnpm create-window settings', 'white');
  colorLog('  pnpm create-window preferences', 'white');
  console.log('');
  colorLog('Rules for window names:', 'yellow');
  colorLog('  • Must start with a letter', 'white');
  colorLog('  • Can only contain letters, numbers, hyphens, and underscores', 'white');
  colorLog('  • Should be lowercase (will be converted automatically)', 'white');
  console.log('');
}

/**
 * Main function
 */
async function main() {
  try {
    // Check for help flag
    const ARGS_START_INDEX = 2;
    const args = process.argv.slice(ARGS_START_INDEX);
    if (args.includes('--help') || args.includes('-h') || args.includes('help')) {
      showHelp();
      return;
    }

    colorLog('🚀 New Window Creator', 'cyan');
    colorLog('=====================', 'cyan');
    console.log('');

    // Check if template directory exists
    if (!fs.existsSync(templateDir)) {
      colorLog(`❌ Template directory not found: ${templateDir}`, 'red');
      process.exit(1);
    }

    // Get window name from command line argument or prompt
    let windowName = args[0];
    if (!windowName) {
      windowName = await promptForWindowName();
    } else {
      windowName = windowName.toLowerCase();
      if (!validateWindowName(windowName)) {
        process.exit(1);
      }
    }

    const targetDir = path.join(windowsDir, windowName);

    // Check if target directory already exists
    if (fs.existsSync(targetDir)) {
      colorLog(`❌ Window '${windowName}' already exists at: ${targetDir}`, 'red');
      const overwrite = await promptConfirmation('Do you want to overwrite it?');
      if (!overwrite) {
        colorLog('Operation cancelled.', 'yellow');
        process.exit(0);
      }
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    colorLog(`📁 Creating window: ${windowName}`, 'green');
    colorLog(`   Source: ${templateDir}`, 'gray');
    colorLog(`   Target: ${targetDir}`, 'gray');
    console.log('');

    // Create windows directory if it doesn't exist
    if (!fs.existsSync(windowsDir)) {
      fs.mkdirSync(windowsDir, { recursive: true });
    }

    // Copy template directory
    colorLog('📋 Copying template files...', 'blue');
    copyDirectory(templateDir, targetDir);

    // Clean up build artifacts from the copied template
    colorLog('🧹 Cleaning up build artifacts...', 'blue');
    removeBuildArtifacts(targetDir);

    // Get all files that need to be updated
    colorLog('🔍 Finding files to update...', 'blue');
    const filesToUpdate = getFilesToUpdate(targetDir);

    colorLog(`🔄 Updating ${filesToUpdate.length} files...`, 'blue');
    let successCount = 0;

    for (const filePath of filesToUpdate) {
      const relativePath = path.relative(targetDir, filePath);
      colorLog(`   📝 ${relativePath}`, 'gray');

      if (updateFileContent(filePath, windowName)) {
        successCount++;
      }
    }

    console.log('');
    colorLog(`✅ Successfully created window '${windowName}'`, 'green');
    colorLog(`   📍 Location: ${targetDir}`, 'gray');
    colorLog(`   📝 Updated ${successCount}/${filesToUpdate.length} files`, 'gray');
    console.log('');
    colorLog('🎯 Next steps:', 'cyan');
    colorLog('   1. Customize the React content in renderer/src/App.tsx', 'white');
    colorLog("   2. Run 'pnpm install' to install dependencies", 'white');
    colorLog("   3. Run 'pnpm run dev' to start development", 'white');
    colorLog(
      `   4. Open the window via IPC: window.electronAPI.invoke('open-window', '${windowName}')`,
      'white',
    );
    console.log('');
  } catch (error) {
    colorLog(`❌ An error occurred: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateWindowName,
  updateFileContent,
  main,
};
