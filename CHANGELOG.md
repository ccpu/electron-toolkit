# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-01-XX

### 🎯 React-Focused Simplification

**BREAKING CHANGES**: This release simplifies the template to focus exclusively on React applications.

#### ✨ Changes Made

- **🔧 Simplified CI/CD**: Removed multi-framework testing and renderer creation logic
  - Updated GitHub Actions to remove `renderer-template` inputs
  - Renamed `init-template-with-renderer` action to `setup-project`
  - Streamlined CI workflows to focus on React-only builds
- **📦 Package Cleanup**: Removed unnecessary packages
  - Deleted `packages/integrate-renderer` package
  - Removed `create-renderer` and `integrate-renderer` scripts from root package.json
- **📚 Updated Documentation**:
  - Updated README to reflect React-specific nature
  - Added clear acknowledgment of the original template
  - Simplified setup instructions (no renderer creation needed)
- **🎯 Project Naming**: Updated project name to `react-electron-vite-monorepo-template`

#### 🎯 Why This Change?

This template is now specifically designed for developers who want to build React Electron applications without the complexity of multi-framework support. The React renderer is pre-configured and ready to use.

#### 🚀 Migration Guide

If you're upgrading from a previous version:

1. The React renderer is already included - no setup needed
2. Remove any references to `create-renderer` or `integrate-renderer` scripts
3. CI/CD workflows no longer need `renderer-template` parameters

---

## [1.0.0] - 2025-03-09

### 🎉 Initial Release

This is the initial release of the **Electron Vite Monorepo Template**, a modernized version based on the excellent [vite-electron-builder](https://github.com/cawa-93/vite-electron-builder) template by [cawa-93](https://github.com/cawa-93).

### ✨ New Features

#### 📦 Monorepo Architecture

- **pnpm workspace** - Fast, disk-efficient package manager with workspace support
- **Turbo** - High-performance build system for monorepos with intelligent caching
- **Dependency catalog** - Centralized dependency management across packages
- **Workspace dependencies** - Shared tooling and configurations

#### 🚀 Modern Frontend Stack

- **React 19** - Latest React with modern features and concurrent rendering
- **TypeScript** - Full type safety across all packages
- **Tailwind CSS v4** - Modern utility-first CSS framework with latest features
- **Vite** - Lightning-fast development server and build tool

#### 🧪 Testing & Quality

- **Vitest** - Fast, Vite-powered unit testing framework
- **React Testing Library** - Simple and complete testing utilities
- **Playwright** - End-to-end testing for the complete application
- **ESLint + Prettier** - Code quality and formatting tools
- **TypeScript strict mode** - Enhanced type checking

#### 🔧 Development Experience

- **Hot Module Replacement** - Instant feedback during development
- **Theme system** - Built-in dark/light/system theme support
- **Pre-commit hooks** - Automated code quality checks
- **VS Code integration** - Optimized for Visual Studio Code

#### 🔒 Security & Performance

- **Latest Electron** - Uses Electron 38.x with latest security patches
- **Context isolation** - Proper separation between main, preload, and renderer
- **Secure IPC** - Modern ES modules approach for inter-process communication
- **Code splitting** - Optimized bundle sizes

#### 🚀 Production Ready

- **Auto-update** - Built-in update mechanism with electron-updater
- **Code signing ready** - Prepared for production code signing
- **GitHub Actions** - CI/CD workflows for testing, building, and releases
- **Cross-platform builds** - Support for Windows, macOS, and Linux

### 📁 Package Structure

```
packages/
├── main/           # Electron main process (TypeScript)
├── preload/        # Preload scripts for secure IPC
└── renderer/       # React frontend with Tailwind CSS

tooling/           # Shared development tools
├── eslint/        # ESLint configurations
├── prettier/      # Prettier configurations
├── typescript/    # TypeScript configurations
└── vitest/        # Vitest testing configurations
```

### 🔄 Migration from Original Template

This template maintains compatibility with the original `vite-electron-builder` while adding:

- **pnpm** instead of npm for package management
- **Turbo** for build orchestration and caching
- **Monorepo structure** with workspace packages
- **Tailwind CSS** for modern styling
- **Vitest** for testing
- **Enhanced TypeScript** configurations
- **React 19** with latest features

### 🙏 Acknowledgments

This template is based on the excellent [vite-electron-builder](https://github.com/cawa-93/vite-electron-builder) by [cawa-93](https://github.com/cawa-93). Special thanks for creating the foundation of secure Electron development with Vite.

### 📝 Breaking Changes

- **Package manager**: Requires pnpm instead of npm
- **Node.js**: Minimum version requirement updated to 22.14.0
- **Repository structure**: Monorepo architecture with workspace packages
- **Scripts**: Updated to use pnpm and turbo commands

### 🐛 Known Issues

- TypeScript definitions for testing libraries need to be installed via `pnpm install`
- Some GitHub Actions workflows may need adjustment for your specific repository

### 📚 Documentation

- Updated README.md with comprehensive guide
- Added package-specific documentation
- Included testing examples and best practices
- Enhanced architecture documentation

---

**Full Changelog**: https://github.com/ccpu/electron-vite-tailwind-monorepo-template/commits/main
