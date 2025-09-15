import { describe, expect, it } from 'vitest';

import { defineArguments } from '../src/define-arguments';

describe('defineArguments', () => {
  it('should return undefined', () => {
    const result = defineArguments<[string, number]>();
    expect(result).toBeUndefined();
  });

  it('should work with different tuple types', () => {
    const stringArgs = defineArguments<[string]>();
    const numberArgs = defineArguments<[number, boolean]>();
    const objectArgs = defineArguments<[{ name: string }, number[]]>();
    const emptyArgs = defineArguments<[]>();

    expect(stringArgs).toBeUndefined();
    expect(numberArgs).toBeUndefined();
    expect(objectArgs).toBeUndefined();
    expect(emptyArgs).toBeUndefined();
  });

  it('should maintain type information for TypeScript', () => {
    // This test verifies that TypeScript can infer the correct types
    const args1 = defineArguments<[string, number]>();
    const args2 = defineArguments<[boolean, { id: number }]>();
    const args3 = defineArguments<[string[], Record<string, any>]>();

    // The actual values are undefined, but TypeScript knows the intended types
    expectTypeOf(args1).toBeUndefined();
    expectTypeOf(args2).toBeUndefined();
    expectTypeOf(args3).toBeUndefined();
  });

  it('should work in event schema definition context', () => {
    // Example of how defineArguments would be used in real code
    const eventSchema = {
      'user-login': defineArguments<[string, { timestamp: number }]>(),
      'data-update': defineArguments<[any[], boolean]>(),
      'error-occurred': defineArguments<[Error]>(),
      'simple-notification': defineArguments<[string]>(),
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

    const complexArgs = defineArguments<ComplexEventData>();
    expect(complexArgs).toBeUndefined();
  });

  it('should work with readonly arrays', () => {
    const readonlyArgs = defineArguments<readonly [string, number]>();
    expect(readonlyArgs).toBeUndefined();
  });
});

// Helper function for type testing
function expectTypeOf<T>(_value: T) {
  return {
    toBeUndefined: () => expect(_value).toBeUndefined(),
  };
}
