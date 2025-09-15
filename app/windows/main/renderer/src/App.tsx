import { appConfig } from '@internal/configs';
import { ThemeProvider } from '@internal/ui';
import { useState } from 'react';
import reactLogo from './assets/react.svg';
import { NotificationDemoCard } from './components/NotificationDemoCard';

import viteLogo from '/vite.svg';

function App() {
  const [count, setCount] = useState(0);

  return (
    <ThemeProvider defaultTheme={appConfig.theme.defaultTheme}>
      <div className="bg-background text-foreground min-h-screen">
        <div className="container mx-auto p-8">
          {/* Header with theme toggle */}
          <div className="mb-8 flex items-center justify-center">
            <h1 className="text-primary text-3xl font-bold">{appConfig.name}</h1>
            {/* {appConfig.theme.enabled && <ThemeToggle />} */}
          </div>

          <div className="flex flex-col items-center space-y-8">
            <div className="flex space-x-8">
              <a
                href="https://vite.dev"
                target="_blank"
                rel="noreferrer noopener"
                className="transition-transform hover:scale-110"
              >
                <img src={viteLogo} className="h-24 w-24" alt="Vite logo" />
              </a>
              <a
                href="https://react.dev"
                target="_blank"
                rel="noreferrer noopener"
                className="transition-transform hover:scale-110"
              >
                <img
                  src={reactLogo}
                  className="animate-spin-slow h-24 w-24"
                  alt="React logo"
                />
              </a>
            </div>

            <h2 className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
              Vite + React
            </h2>

            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <button
                type="button"
                onClick={() => setCount((prevCount) => prevCount + 1)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3 font-medium transition-colors"
              >
                count is {count}
              </button>
              <p className="text-muted-foreground mt-4">
                Edit{' '}
                <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                  src/App.tsx
                </code>{' '}
                and save to test HMR
              </p>
            </div>

            <p className="text-muted-foreground max-w-2xl text-center">
              {appConfig.description}
            </p>

            <p className="text-muted-foreground text-sm">
              Click on the Vite and React logos to learn more
            </p>

            {/* Notification Demo */}
            <NotificationDemoCard />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
