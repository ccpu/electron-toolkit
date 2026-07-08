# Renderer Package

The renderer package contains the frontend user interface built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. This is the visual layer of the Electron application that users interact with.

## 🚀 Features

- **⚛️ React 19** - Latest React with modern features and concurrent rendering
- **🏗️ TypeScript** - Full type safety for better development experience
- **⚡ Vite** - Lightning-fast development server with Hot Module Replacement (HMR)
- **🎨 Tailwind CSS v4** - Modern utility-first CSS framework with latest features
- **🧪 Vitest** - Fast unit testing framework with React Testing Library
- **🎭 Testing Library** - Simple and complete testing utilities for React components
- **🌙 Dark Mode** - Built-in theme provider with system preference detection

## 🏃 Getting Started

### Development

```bash
# Start development server
pnpm dev

# Run in specific package
pnpm --filter @app/renderer dev
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### Building

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 🏗️ Architecture

The renderer follows modern React patterns and best practices:

- **Component-based architecture** - Modular, reusable components
- **Custom hooks** - Shared logic and state management
- **Context providers** - Global state management (theme, etc.)
- **TypeScript interfaces** - Type-safe data models and props
- **CSS-in-JS** - Tailwind CSS for styling with design system

## 🎨 Styling

### Tailwind CSS v4

This package uses the latest Tailwind CSS v4 with:

- **CSS custom properties** - Dynamic theming support
- **Container queries** - Responsive design at component level
- **Advanced color system** - HSL-based color variables
- **Custom design tokens** - Consistent spacing, typography, and colors

### Theme System

The application includes a comprehensive theme system:

```typescript
// Built-in theme modes
type ThemeMode = 'light' | 'dark' | 'system';

// CSS custom properties for dynamic theming
// --background, --foreground, --primary, --secondary, etc.
```

## 🧪 Testing

### Test Setup

- **Vitest** - Fast, Vite-powered test runner
- **React Testing Library** - Simple component testing utilities
- **Jest DOM** - Custom matchers for DOM assertions
- **User Event** - Realistic user interaction simulation
- **JSDOM** - Browser environment simulation

### Example Test

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it } from 'vitest';

export function Component() {
  return <div>Click</div>;
}

describe('Component', () => {
  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<Component />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

## 🔗 Integration with Electron

### Preload API Access

Import functions from the preload package safely:

```typescript
import { electronAPI } from '@app/preload';

// Use Electron APIs through secure bridge
const result = await electronAPI.readFile('/path/to/file');
```

### Environment Variables

Access Vite environment variables:

```typescript
// Only VITE_ prefixed variables are exposed
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
```

## 📁 Directory Structure

```
src/
├── assets/          # Static assets (images, icons)
├── components/      # Reusable React components
├── hooks/          # Custom React hooks
├── providers/      # Context providers
├── test/           # Test utilities and setup
├── App.tsx         # Main application component
├── main.tsx        # React application entry point
├── config.ts       # Application configuration
└── globals.css     # Global styles and CSS variables
```

## 🔧 Configuration Files

- **`vite.config.ts`** - Vite build configuration with React and Tailwind
- **`vitest.config.ts`** - Test configuration with JSDOM environment
- **`tailwind.config.ts`** - Tailwind CSS customization and theme
- **`tsconfig.json`** - TypeScript project references
- **`tsconfig.app.json`** - Application-specific TypeScript settings

## 🚀 Performance

- **Code splitting** - Automatic route-based and dynamic imports
- **Tree shaking** - Dead code elimination in production builds
- **Asset optimization** - Image and font optimization
- **Bundle analysis** - Built-in bundle size analysis
- **Fast refresh** - Instant hot reloading during development

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
