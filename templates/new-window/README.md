# New Window Template

This template provides the basic structure for creating a new window in your Electron application.

## Quick Start

1. Copy this entire `templates/new-window` directory to `app/windows/[your-window-name]`
2. Update the window name in the files (replace `window-name-` placeholders)
3. Customize the React content in `renderer/src/App.tsx`
4. The window will be automatically detected and available via IPC

## Example

```bash
# Copy template to create a new "about" window
cp -r templates/new-window app/windows/about

# Replace placeholders (or do manually)
find app/windows/about -type f -name "*.json" -o -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/window-name-/about/g'

# Start development
pnpm start

# Open the window via IPC
await window.electronAPI.invoke('open-window', 'about');
```

## Files Included

- `preload/` - Secure IPC preload scripts
- `renderer/` - React frontend with Tailwind CSS
- Configuration files for TypeScript, Vite, etc.
