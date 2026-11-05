// @types/node를 넣지 않는다(의존성 네 개 원칙, design.md 10절). 테스트가 쓰는 만큼만 선언한다.

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: string): string;
}

declare module 'node:assert/strict' {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    match(value: string, pattern: RegExp, message?: string): void;
    doesNotMatch(value: string, pattern: RegExp, message?: string): void;
    throws(fn: () => unknown, expected?: RegExp, message?: string): void;
  }
  const assert: Assert;
  export default assert;
}
