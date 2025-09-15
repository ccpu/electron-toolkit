// Part 5: Your API definition

import type { IpcMainInvokeEvent } from 'electron';

import { createIpcBridge } from './create-ipc-bridge';

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

export const appApi = createIpcBridge({
  apiKey: 'appApi',
  handlers: {
    'show-notification': async (
      _event: IpcMainInvokeEvent,
      title: string,
      body: string,
    ) => {
      notify(title, { body });
      return { success: true, message: 'Notification shown' };
    },
    'notify-message': (_event: IpcMainInvokeEvent, message: string) => {
      notify('Message', { body: message });
      return { success: true, message: 'Message notification shown' };
    },
    'notify-info': (_event: IpcMainInvokeEvent, info: string) => {
      notify('Info', { body: info });
      return { success: true, message: 'Info notification shown' };
    },
  },
});
