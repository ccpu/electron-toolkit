import type { IpcMainInvokeEvent, IpcRenderer } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createIpcBridge } from '../src/create-ipc-bridge';

describe('createIpcBridge', () => {
  let mockIpcRenderer: IpcRenderer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockIpcRenderer = {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    } as any;

    vi.doMock('../src/get-ipc-api', () => ({
      getIpcApi: vi.fn().mockReturnValue(null),
    }));
  });

  it('should create bridge with config object (new way)', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
    };

    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events,
    });

    expect(bridge).toHaveProperty('registerMainHandlers');
    expect(bridge).toHaveProperty('registerInvokers');
    expect(bridge).toHaveProperty('exposeInPreload');
    expect(bridge).toHaveProperty('invoke');
    expect(bridge).toHaveProperty('send');
  });

  it('should work with handlers only (no events)', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events: {},
    });

    expect(bridge).toHaveProperty('registerMainHandlers');
    expect(bridge).toHaveProperty('registerInvokers');
    expect(bridge).toHaveProperty('exposeInPreload');
    expect(bridge).toHaveProperty('invoke');
    expect(bridge).toHaveProperty('send');
    expect(typeof bridge.registerMainHandlers).toBe('function');
    expect(typeof bridge.invoke).toBe('object');
  });

  it('should combine handlers and events in exposeInPreload', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
    };

    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events,
    });

    const api = bridge.exposeInPreload(mockIpcRenderer);

    expect(api).toHaveProperty('testHandler');
    expect(api).toHaveProperty('onTestEvent');
    expect(typeof api.testHandler).toBe('function');
    expect(typeof api.onTestEvent).toBe('function');
  });

  it('should expose handlers only when no events provided', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events: {},
    });
    const api = bridge.exposeInPreload(mockIpcRenderer);

    expect(api).toHaveProperty('testHandler');
    expect(typeof api.testHandler).toBe('function');

    // Should not have event listeners since no events were provided
    expect(api).not.toHaveProperty('onTestEvent');
  });

  it('should have empty send object when no events provided', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events: {},
    });

    expect(bridge.send).toEqual({});
  });

  it('should include event listeners in bridge return when events provided', () => {
    const handlers = {
      'test-handler': (_event: IpcMainInvokeEvent, data: string) => `Hello ${data}`,
    };

    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events,
    });

    expect(bridge).toHaveProperty('onTestEvent');
    expect(typeof bridge.onTestEvent).toBe('function');
  });

  it('should handle both config patterns correctly', () => {
    const handlers = {
      'same-handler': (_event: IpcMainInvokeEvent, data: string) => data,
    };

    const events = {
      'same-event': ['string'] as const,
    };

    // Test config object pattern
    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events,
    });

    expect(typeof bridge.registerMainHandlers).toBe('function');
    expect(typeof bridge.invoke).toBe('object');
    expect(typeof bridge.send).toBe('object');
  });

  it('should preserve type safety across the bridge', () => {
    // This test verifies TypeScript types at compile time
    const handlers = {
      'string-handler': (_event: IpcMainInvokeEvent, str: string) => str.toUpperCase(),
      'number-handler': (_event: IpcMainInvokeEvent, num: number) => num,
    };

    const events = {
      notification: ['string', 'boolean'] as const,
      update: ['object'] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events,
    });

    // TypeScript should infer correct types
    expectTypeOf(bridge.invoke.stringHandler).toBeFunction();
    expectTypeOf(bridge.invoke.numberHandler).toBeFunction();
    expectTypeOf(bridge.send.notification).toBeFunction();
    expectTypeOf(bridge.send.update).toBeFunction();
  });

  it('should work with events only (no handlers)', () => {
    const events = {
      'test-event': ['string'] as const,
      'another-event': ['number', 'boolean'] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      events,
    });

    expect(bridge).toHaveProperty('exposeInPreload');
    expect(bridge).toHaveProperty('send');
    expect(bridge).toHaveProperty('onTestEvent');
    expect(bridge).toHaveProperty('onAnotherEvent');
    expect(typeof bridge.exposeInPreload).toBe('function');
    expect(typeof bridge.send).toBe('object');
    expect(typeof bridge.onTestEvent).toBe('function');
    expect(typeof bridge.onAnotherEvent).toBe('function');

    // Should have handler-related properties as no-op functions for backward compatibility
    expect(bridge).toHaveProperty('registerMainHandlers');
    expect(bridge).toHaveProperty('registerInvokers');
    expect(typeof (bridge as any).registerMainHandlers).toBe('function');
    expect(typeof (bridge as any).registerInvokers).toBe('function');

    // Should not have invoke property since no handlers were provided
    expect(bridge).not.toHaveProperty('invoke');
  });

  // Helper function for type testing
  function expectTypeOf<T>(_value: T) {
    return {
      toBeFunction: () => expect(typeof _value).toBe('function'),
    };
  }

  // Type safety tests using TypeScript compiler checks
  it('should enforce type safety for handler invokers at compile time', () => {
    const handlers = {
      'get-user': (_event: IpcMainInvokeEvent, id: number) => ({ id, name: 'John' }),
      calculate: (_event: IpcMainInvokeEvent, a: number, b: number) => a + b,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
    });

    // TypeScript should infer correct parameter types for invokers
    const getUserInvoker = bridge.invoke.getUser;
    const calculateInvoker = bridge.invoke.calculate;

    // These should be functions
    expect(typeof getUserInvoker).toBe('function');
    expect(typeof calculateInvoker).toBe('function');

    // Test that the types are correctly inferred by checking function signatures exist
    type GetUserInvokerType = typeof getUserInvoker;
    type CalculateInvokerType = typeof calculateInvoker;

    // Verify the function types can be assigned to variables with correct signatures
    const testGetUser: GetUserInvokerType = getUserInvoker;
    const testCalculate: CalculateInvokerType = calculateInvoker;

    // This assignment should work if types are correct
    expect(testGetUser).toBe(getUserInvoker);
    expect(testCalculate).toBe(calculateInvoker);
  });

  it('should enforce type safety for event senders at compile time', () => {
    const events = {
      notification: [] as const, // no parameters
      'user-action': [] as const, // no parameters
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      events,
    });

    // TypeScript should infer correct parameter types for senders
    const notificationSender = bridge.send.notification;
    const userActionSender = bridge.send.userAction;

    // These should be functions
    expect(typeof notificationSender).toBe('function');
    expect(typeof userActionSender).toBe('function');

    // Test that the types are correctly inferred
    type NotificationSenderType = typeof notificationSender;
    type UserActionSenderType = typeof userActionSender;

    // Verify the function types can be assigned to variables with correct signatures
    const testNotification: NotificationSenderType = notificationSender;
    const testUserAction: UserActionSenderType = userActionSender;

    // This assignment should work if types are correct
    expect(testNotification).toBe(notificationSender);
    expect(testUserAction).toBe(userActionSender);
  });

  it('should enforce type safety for event subscribers at compile time', () => {
    const events = {
      notification: [] as const,
      'user-action': [] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      events,
    });

    // TypeScript should infer correct parameter types for subscribers
    const { onNotification, onUserAction } = bridge;

    // These should be functions
    expect(typeof onNotification).toBe('function');
    expect(typeof onUserAction).toBe('function');

    // Test that the types are correctly inferred
    type OnNotificationType = typeof onNotification;
    type OnUserActionType = typeof onUserAction;

    // Verify the function types can be assigned to variables with correct signatures
    const testOnNotification: OnNotificationType = onNotification;
    const testOnUserAction: OnUserActionType = onUserAction;

    // This assignment should work if types are correct
    expect(testOnNotification).toBe(onNotification);
    expect(testOnUserAction).toBe(onUserAction);
  });

  it('should enforce type safety for combined handlers and events', () => {
    const handlers = {
      'get-user': (_event: IpcMainInvokeEvent, id: number) => ({ id, name: 'John' }),
    };

    const events = {
      notification: [] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      handlers,
      events,
    });

    // Test combined type safety
    type BridgeType = typeof bridge;

    // These should all be properly typed - verify by accessing them
    expect(typeof bridge.invoke.getUser).toBe('function');
    expect(typeof bridge.send.notification).toBe('function');
    expect(typeof bridge.onNotification).toBe('function');

    // Test that the types are accessible and properly inferred
    const invokeType: BridgeType['invoke'] = bridge.invoke;
    const sendType: BridgeType['send'] = bridge.send;
    const onNotificationType: BridgeType['onNotification'] = bridge.onNotification;

    expect(invokeType).toBe(bridge.invoke);
    expect(sendType).toBe(bridge.send);
    expect(onNotificationType).toBe(bridge.onNotification);
  });

  it('should enforce type safety for optional parameters in overloads', () => {
    // Test handlers-only overload
    const handlersOnly = createIpcBridge({
      apiKey: 'test-api',
      handlers: {
        'test-handler': (_event: IpcMainInvokeEvent, data: string) => data,
      },
    });

    // Should have invoke but send should be empty
    expect(typeof handlersOnly.invoke.testHandler).toBe('function');
    expect(handlersOnly.send).toEqual({});

    // Test events-only overload
    const eventsOnly = createIpcBridge({
      apiKey: 'test-api',
      events: {
        'test-event': [] as const,
      },
    });

    // Should have send and subscriber but no invoke
    expect(typeof eventsOnly.send.testEvent).toBe('function');
    expect(typeof eventsOnly.onTestEvent).toBe('function');
    expect(eventsOnly).not.toHaveProperty('invoke');
  });

  it('should throw error when neither handlers nor events are provided', () => {
    expect(() => {
      createIpcBridge({
        apiKey: 'test-api',
        handlers: {},
        events: {},
      } as any);
    }).toThrow('At least one of handlers or events must be provided');

    // Test with undefined values (bypassing TypeScript)
    expect(() => {
      createIpcBridge({
        apiKey: 'test-api',
        handlers: undefined as any,
        events: undefined as any,
      });
    }).toThrow('At least one of handlers or events must be provided');
  });

  it('should provide no-op functions for backward compatibility when no handlers provided', () => {
    const events = {
      'test-event': ['string'] as const,
    };

    const bridge = createIpcBridge({
      apiKey: 'test-api',
      events,
    }) as any; // Cast to any to bypass incorrect type definitions

    // Should have handler-related properties as no-op functions for backward compatibility
    expect(bridge).toHaveProperty('registerMainHandlers');
    expect(bridge).toHaveProperty('registerInvokers');
    expect(typeof (bridge as any).registerMainHandlers).toBe('function');
    expect(typeof (bridge as any).registerInvokers).toBe('function');

    // Should not have invoke property since no handlers were provided
    expect(bridge).not.toHaveProperty('invoke');
  });
});
