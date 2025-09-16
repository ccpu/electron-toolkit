/**
 * Utility function for defining handler argument and return types in a type-safe way.
 * This helper exists only for type inference and allows clean handler type definition
 * without providing actual implementations.
 *
 * @example
 * ```typescript
 * const handlers = {
 *   'get-user': defineHandler<[userId: string], User>(),
 *   'save-file': defineHandler<[path: string, data: Buffer], boolean>(),
 * };
 * ```
 */
export function defineHandler<TArgs extends readonly unknown[], TReturn>(): {
  args: TArgs;
  return: TReturn;
} {
  return undefined as unknown as {
    args: TArgs;
    return: TReturn;
  };
}
