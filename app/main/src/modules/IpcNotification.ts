import type { AppModule } from '../AppModule';
import type { ModuleContext } from '../ModuleContext';

class IpcNotification implements AppModule {
  async enable(_context: ModuleContext): Promise<void> {
    // Show notification with custom message
    // ipcMain.handle('show-notification', async (_event, title: string, body: string) => {
    //   const { Notification } = await import('electron');
    //   if (Notification.isSupported()) {
    //     const notification = new Notification({
    //       title,
    //       body,
    //     });
    //     notification.show();
    //     return { success: true, message: 'Notification shown successfully' };
    //   }
    //   return { success: false, message: 'Notifications not supported on this system' };
    // });
    // // Simple notification with predefined message
    // ipcMain.handle('notify-message', async (_event, message: string) => {
    //   const { Notification } = await import('electron');
    //   if (Notification.isSupported()) {
    //     const notification = new Notification({
    //       title: 'App Notification',
    //       body: message,
    //     });
    //     notification.show();
    //     return { success: true, message: 'Message notification shown' };
    //   }
    //   return { success: false, message: 'Notifications not supported on this system' };
    // });
    // // Quick info notification
    // ipcMain.handle('notify-info', async (_event, info: string) => {
    //   const { Notification } = await import('electron');
    //   if (Notification.isSupported()) {
    //     const notification = new Notification({
    //       title: 'Info',
    //       body: info,
    //       icon: undefined, // You can add an icon path here if needed
    //     });
    //     notification.show();
    //     return { success: true, message: 'Info notification shown' };
    //   }
    //   return { success: false, message: 'Notifications not supported on this system' };
    // });
  }

  async disable(): Promise<void> {
    // Clean up IPC handlers
    // ipcMain.removeAllListeners('show-notification');
    // ipcMain.removeAllListeners('notify-message');
    // ipcMain.removeAllListeners('notify-info');
  }
}

export function createIpcNotificationModule(): IpcNotification {
  return new IpcNotification();
}
