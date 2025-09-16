// Part 5: Your API definition

import { createIpcSchema, defineEvent, defineHandler } from 'electron-ipc-bridge';

export const appApi = createIpcSchema({
  apiKey: 'appApi',
  handlers: {
    'show-notification': defineHandler<
      [title: string, body: string],
      { success: true; message: string }
    >(),
    'notify-message': defineHandler<
      [message: string],
      { success: true; message: string }
    >(),
    'notify-info': defineHandler<[info: string], { success: true; message: string }>(),
  },
  events: {
    'user-updated': defineEvent<[userId: string, userData: object]>(),
    'settings-changed': defineEvent<[newSettings: object]>(),
  },
});
