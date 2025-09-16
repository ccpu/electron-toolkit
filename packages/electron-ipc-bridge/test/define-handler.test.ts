import { describe, expect, it } from 'vitest';

import { defineHandler } from '../src/define-handler';

describe('defineHandler', () => {
  it('should return a type-safe handler schema', () => {
    const handler = defineHandler<[userId: string], { id: string; name: string }>();

    // TypeScript should infer these types correctly
    expect(handler).toBeUndefined(); // Runtime value is undefined

    // Type assertions to ensure correct type inference
    type HandlerArgs = typeof handler.args;
    type HandlerReturn = typeof handler.return;

    // These should compile without errors
    const testArgs: HandlerArgs = ['user123'];
    const testReturn: HandlerReturn = { id: 'user123', name: 'John Doe' };

    expect(testArgs).toEqual(['user123']);
    expect(testReturn).toEqual({ id: 'user123', name: 'John Doe' });
  });

  it('should work with different argument patterns', () => {
    // No arguments
    const noArgs = defineHandler<[], boolean>();
    expect(noArgs).toBeUndefined();

    // Multiple arguments
    const multiArgs = defineHandler<[path: string, data: Uint8Array], boolean>();
    expect(multiArgs).toBeUndefined();

    // Complex return types
    const complexReturn = defineHandler<
      [id: string],
      { user: { id: string; settings: object } }
    >();
    expect(complexReturn).toBeUndefined();
  });

  it('should be purely for type inference', () => {
    const handler = defineHandler<[test: string], number>();

    // Should always return undefined at runtime
    expect(handler).toBeUndefined();
    expect(typeof handler).toBe('undefined');
  });
});
