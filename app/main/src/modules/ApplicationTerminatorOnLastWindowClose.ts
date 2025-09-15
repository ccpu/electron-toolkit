import type { AppModule } from '../AppModule';
import type { ModuleContext } from '../ModuleContext';

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
