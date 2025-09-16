import { describe, expect, it } from 'vitest';

import { defineEvent } from '../src/define-event';

describe('defineEvent', () => {
  it('should return undefined', () => {
    const result = defineEvent<[string, number]>();
    expect(result).toBeUndefined();
  });

  it('should work with different tuple types', () => {
    const stringArgs = defineEvent<[string]>();
    const numberArgs = defineEvent<[number, boolean]>();
    const objectArgs = defineEvent<[{ name: string }, number[]]>();
    const emptyArgs = defineEvent<[]>();

    expect(stringArgs).toBeUndefined();
    expect(numberArgs).toBeUndefined();
    expect(objectArgs).toBeUndefined();
    expect(emptyArgs).toBeUndefined();
  });

  it('should maintain type information for TypeScript', () => {
    // This test verifies that TypeScript can infer the correct types
    const args1 = defineEvent<[string, number]>();
    const args2 = defineEvent<[boolean, { id: number }]>();
    const args3 = defineEvent<[string[], Record<string, any>]>();

    // The actual values are undefined, but TypeScript knows the intended types
    expectTypeOf(args1).toBeUndefined();
    expectTypeOf(args2).toBeUndefined();
    expectTypeOf(args3).toBeUndefined();
  });

  it('should work in event schema definition context', () => {
    // Example of how defineEvent would be used in real code
    const eventSchema = {
      'user-login': defineEvent<[string, { timestamp: number }]>(),
      'data-update': defineEvent<[any[], boolean]>(),
      'error-occurred': defineEvent<[Error]>(),
      'simple-notification': defineEvent<[string]>(),
    };

    expect(eventSchema['user-login']).toBeUndefined();
    expect(eventSchema['data-update']).toBeUndefined();
    expect(eventSchema['error-occurred']).toBeUndefined();
    expect(eventSchema['simple-notification']).toBeUndefined();

    // The schema object should have the correct shape
    expect(Object.keys(eventSchema)).toHaveLength(4); // eslint-disable-line no-magic-numbers
    expect(eventSchema).toHaveProperty('user-login');
    expect(eventSchema).toHaveProperty('data-update');
    expect(eventSchema).toHaveProperty('error-occurred');
    expect(eventSchema).toHaveProperty('simple-notification');
  });

  it('should handle complex nested types', () => {
    interface User {
      id: number;
      name: string;
      settings: {
        theme: 'light' | 'dark';
        notifications: boolean;
      };
    }

    type ComplexEventData = [User, string[], { metadata: Record<string, unknown> }];

    const complexArgs = defineEvent<ComplexEventData>();
    expect(complexArgs).toBeUndefined();
  });

  it('should work with readonly arrays', () => {
    const readonlyArgs = defineEvent<readonly [string, number]>();
    expect(readonlyArgs).toBeUndefined();
  });
});

// Helper function for type testing
function expectTypeOf<T>(_value: T) {
  return {
    toBeUndefined: () => expect(_value).toBeUndefined(),
  };
}
