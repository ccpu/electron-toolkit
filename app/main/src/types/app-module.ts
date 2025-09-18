import type { ModuleContext } from './module-context';

export interface AppModule {
  enable: (context: ModuleContext) => Promise<void> | void;
}
