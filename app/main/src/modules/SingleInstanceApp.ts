import type * as Electron from 'electron';
import type { AppModule } from '../AppModule';
import process from 'node:process';

class SingleInstanceApp implements AppModule {
  enable({ app }: { app: Electron.App }): void {
    const isSingleInstance = app.requestSingleInstanceLock();
    if (!isSingleInstance) {
      app.quit();
      process.exit(0);
    }
  }
}

export function disallowMultipleAppInstance(
  ...args: ConstructorParameters<typeof SingleInstanceApp>
): SingleInstanceApp {
  return new SingleInstanceApp(...args);
}
