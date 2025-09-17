# Changelog

## 2.0.0

### Major Changes

- 830e785: release

## 1.1.0

### Minor Changes

- added electron-vite-toolkit

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-09-17

### Added

- Initial release of electron-vite-toolkit
- Multi-window support for Electron applications
- Hot reload development server with Vite
- Automatic port management for dev servers
- TypeScript integration
- CLI tool for development workflow

### Fixed

- Fixed issue where dev server initialization was running twice, causing port conflicts
- Separated dev-mode CLI from main module to prevent side effects during import
- Improved module structure to prevent unintended execution of dev server code

### Features

- `initializeElectronApp()` - Main function to initialize Electron app with multi-window support
- `startDevMode()` - Start development servers with hot reload
- Automatic window discovery from filesystem structure
- Support for both development and production modes
- Vite configuration helpers for renderer and preload processes
- Comprehensive CLI tool (`electron-vite-toolkit dev`)

### Documentation

- Complete README with usage examples
- API documentation
- Setup and configuration guides
- Troubleshooting section
