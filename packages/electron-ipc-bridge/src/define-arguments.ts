/**
 * Utility function for defining event argument types in a type-safe way.
 * This helper exists only for type inference and allows clean event argument type definition
 * without providing actual values.
 */

export function defineArguments<T extends readonly any[]>(): T {
  return undefined as unknown as T;
}
