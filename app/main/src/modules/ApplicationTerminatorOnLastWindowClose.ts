import type { AppModule, ModuleContext } from '../types';

class ApplicationTerminatorOnLastWindowClose implements AppModule {
  enable({ app }: ModuleContext): Promise<void> | void {
    app.on('window-all-closed', () => app.quit());
  }
}

export function terminateAppOnLastWindowClose(
  ...args: ConstructorParameters<typeof ApplicationTerminatorOnLastWindowClose>
): ApplicationTerminatorOnLastWindowClose {
  return new ApplicationTerminatorOnLastWindowClose(...args);
}
