import type { IpcMainInvokeEvent } from 'electron';
import type { AppModule, ModuleContext } from '../types';
import { appApi } from '@internal/ipc';

async function notify(title: string, options: { body: string }) {
  try {
    const { Notification } = await import('electron');
    const notification = new Notification({
      title,
      body: options.body,
    });

    notification.show();
    return notification;
  } catch (error) {
    console.error('Notification error:', error);
    return null;
  }
}

class IpcNotification implements AppModule {
  private cleanupFunctions: (() => void)[] = [];

  async enable(_context: ModuleContext): Promise<void> {
    // Register handlers separately for better modularity and store cleanup functions
    this.cleanupFunctions.push(
      appApi.registerHandler(
        'show-notification',
        async (_event: IpcMainInvokeEvent, title: string, body: string) => {
          await notify(title, { body });
          return { success: true, message: 'Notification shown' };
        },
      ),
    );

    this.cleanupFunctions.push(
      appApi.registerHandler(
        'notify-message',
        async (_event: IpcMainInvokeEvent, message: string) => {
          await notify('Message', { body: message });
          return { success: true, message: 'Message notification shown' };
        },
      ),
    );

    this.cleanupFunctions.push(
      appApi.registerHandler(
        'notify-info',
        async (_event: IpcMainInvokeEvent, info: string) => {
          await notify('Info', { body: `${info}` });
          return { success: true, message: 'Info notification shown' };
        },
      ),
    );
  }

  async disable(): Promise<void> {
    // Clean up all registered handlers
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}

export function createIpcNotificationModule(): IpcNotification {
  return new IpcNotification();
}
