# Contributing to Electron Vite Monorepo Template

Thank you for your interest in contributing! 🎉

We welcome bug reports, feature requests, documentation improvements, and code changes.

## 🚀 Getting Started

### Prerequisites

- Node.js 22.14.0+
- pnpm 9.6.0+
- Git

### Setup

1. Fork and clone the repo
2. `pnpm install`
3. `pnpm start`

## 🏗️ Project Structure

Monorepo using pnpm workspaces and Turbo:

- `packages/main/`: Electron main process
- `packages/preload/`: Preload scripts
- `packages/renderer/`: React frontend
- `tooling/`: Shared dev tools (ESLint, Prettier, etc.)

## 🛠️ Key Commands

- Build: `pnpm run build`
- Test: `pnpm test`
- Lint: `pnpm run lint`
- Format: `pnpm run format:fix`
- Typecheck: `pnpm run typecheck`

## 📝 How to Contribute

1. Fork and create branch from `main`
2. Make changes with conventional commits
3. Add/update tests
4. Run `pnpm run fix:all`, `pnpm run typecheck`, `pnpm test`
5. Update docs if needed
6. Open PR with clear description

### PR Checklist

- [ ] Code up-to-date with `main`
- [ ] Linting passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Docs updated if needed
- [ ] Links issues as `Fixes #0000`
- [ ] Conventional commits used

## 🐛 Bug Reports

Include: Environment, steps to reproduce, expected vs actual behavior, errors, minimal reproduction.

## 💡 Feature Requests

Include: Description, use case, implementation suggestions, breaking changes.

## 📚 Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest](https://vitest.dev/)
- [pnpm](https://pnpm.io/)
- [Turbo](https://turbo.build/)

## Code of Conduct

Follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

Questions? Open an issue or discussion. Thank you! 🚀
