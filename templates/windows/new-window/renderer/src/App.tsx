import { appConfig } from '@internal/configs';
import { ThemeProvider } from './theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme={appConfig.theme.defaultTheme}>
      <div className="bg-background text-foreground min-h-screen p-6">
        <h1 className="mb-4 text-2xl font-bold">Window</h1>
        <p>This is the window content.</p>
        <p className="text-muted-foreground mt-4 text-sm">
          Customize this content by editing the App.tsx file.
        </p>
      </div>
    </ThemeProvider>
  );
}

export default App;
