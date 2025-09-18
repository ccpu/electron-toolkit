import type { AppModule, ModuleContext } from '../types';

export class HardwareAccelerationModule implements AppModule {
  readonly #shouldBeDisabled: boolean;

  constructor({ enable }: { enable: boolean }) {
    this.#shouldBeDisabled = !enable;
  }

  enable({ app }: ModuleContext): Promise<void> | void {
    if (this.#shouldBeDisabled) {
      app.disableHardwareAcceleration();
    }
  }
}

export function hardwareAccelerationMode(
  ...args: ConstructorParameters<typeof HardwareAccelerationModule>
): HardwareAccelerationModule {
  return new HardwareAccelerationModule(...args);
}
