import type { CSSProperties } from 'react';
import { appConfig } from '@internal/configs';
import { ThemeProvider } from './theme-provider';

// Electron-specific CSS property that controls which regions drag the frameless window.
const dragStyle = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;

function App() {
  const handleClose = () => {
    window.close();
  };

  return (
    <ThemeProvider defaultTheme={appConfig.theme.defaultTheme}>
      <div className="bg-card text-card-foreground flex h-screen w-screen flex-col overflow-hidden">
        {/* Drag handle: the whole bar moves the frameless window */}
        <div
          style={dragStyle}
          className="flex flex-1 items-center justify-between px-1.5 select-none"
          title="Drag to move"
        >
          <span className="text-muted-foreground text-[11px] leading-none">⣿⣿</span>
          <button
            type="button"
            onClick={handleClose}
            style={noDragStyle}
            className="text-muted-foreground hover:text-foreground flex h-4 w-4 items-center justify-center rounded text-[11px] leading-none"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
