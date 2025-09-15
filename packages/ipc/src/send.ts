import { ipcRenderer } from 'electron';

export function send(channel: string, message: string): Promise<any> {
  return ipcRenderer.invoke(channel, message);
}
