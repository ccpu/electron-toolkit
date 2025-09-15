import { appConfig } from '@internal/configs';
import { ThemeProvider } from '@internal/ui';

function App() {
  return (
    <ThemeProvider defaultTheme={appConfig.theme.defaultTheme}>
      <div className="bg-background text-foreground min-h-screen p-8 text-4xl">
        <h1 className="text-5xl font-bold text-blue-600">Settings Window</h1>
        <p className="mt-4 text-lg text-green-600">Hot reload is now working! 🎉</p>
        <p className="mt-2 text-base text-purple-500">
          Changes appear instantly without restarting!
        </p>
        <div className="mt-6 rounded-lg border-2 border-yellow-400 p-4">
          <p className="text-sm">This should update immediately when you save! ✨</p>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
