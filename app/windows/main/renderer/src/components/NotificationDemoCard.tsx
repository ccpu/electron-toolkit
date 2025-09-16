import { appApi } from '@internal/ipc';
import { useState } from 'react';

export function NotificationDemoCard() {
  const [customTitle, setCustomTitle] = useState('My App');
  const [customMessage, setCustomMessage] = useState('Hello from Electron!');
  const [simpleMessage, setSimpleMessage] = useState('Quick message notification');
  const [infoMessage, setInfoMessage] = useState('This is an info notification');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const handleCustomNotification = async () => {
    try {
      setIsLoading(true);
      const result = await appApi.invoke.showNotification(customTitle, customMessage);
      setLastResult(
        result.success ? 'Custom notification sent!' : `Failed: ${result.message}`,
      );
    } catch (error) {
      setLastResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimpleNotification = async () => {
    try {
      setIsLoading(true);
      const result = await appApi.invoke.notifyMessage(simpleMessage);
      setLastResult(
        result.success ? 'Message notification sent!' : `Failed: ${result.message}`,
      );
    } catch (error) {
      setLastResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoNotification = async () => {
    try {
      setIsLoading(true);
      const result = await appApi.invoke.notifyInfo(infoMessage);
      setLastResult(
        result.success ? 'Info notification sent!' : `Failed: ${result.message}`,
      );
    } catch (error) {
      setLastResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers that wrap async functions
  const onCustomClick = () => {
    handleCustomNotification().catch(console.error);
  };

  const onSimpleClick = () => {
    handleSimpleNotification().catch(console.error);
  };

  const onInfoClick = () => {
    handleInfoNotification().catch(console.error);
  };

  return (
    <div className="bg-card rounded-lg border p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold">📢 Notification Demo</h3>

      {/* Custom Notification */}
      <div className="mb-6">
        <h4 className="mb-2 font-medium">Custom Notification</h4>
        <div className="mb-3 space-y-2">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Notification title"
            className="bg-background w-full rounded-md border px-3 py-2"
          />
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Notification message"
            className="bg-background w-full rounded-md border px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={onCustomClick}
          disabled={isLoading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Custom Notification'}
        </button>
      </div>

      {/* Simple Message Notification */}
      <div className="mb-6">
        <h4 className="mb-2 font-medium">Simple Message Notification</h4>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={simpleMessage}
            onChange={(e) => setSimpleMessage(e.target.value)}
            placeholder="Message to notify"
            className="bg-background flex-1 rounded-md border px-3 py-2"
          />
          <button
            type="button"
            onClick={onSimpleClick}
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Notify'}
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          This will show a notification with title "App Notification"
        </p>
      </div>

      {/* Info Notification */}
      <div className="mb-6">
        <h4 className="mb-2 font-medium">Info Notification</h4>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={infoMessage}
            onChange={(e) => setInfoMessage(e.target.value)}
            placeholder="Info message"
            className="bg-background flex-1 rounded-md border px-3 py-2"
          />
          <button
            type="button"
            onClick={onInfoClick}
            disabled={isLoading}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Info'}
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          This will show an info notification
        </p>
      </div>

      {/* Result Display */}
      {lastResult && (
        <div className="bg-muted rounded p-3 text-sm">
          <strong>Last Result:</strong> {lastResult}
        </div>
      )}
    </div>
  );
}
