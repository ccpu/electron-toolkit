// Common utility types used across IPC modules
export type ToCamelCase<S extends string> = S extends `${infer P1}-${infer P2}${infer P3}`
  ? `${P1}${Capitalize<ToCamelCase<`${P2}${P3}`>>}`
  : S;

export type Promisify<T> = T extends Promise<any> ? T : Promise<T>;

export type RemoveFirstParameter<T> = T extends (
  first: any,
  ...rest: infer Rest
) => infer Return
  ? (...args: Rest) => Promisify<Return>
  : never;
