import type { Lambda } from '../syntax/ast.ts';
import type { Environment } from './environment.ts';

/** A function value: code together with the environment it was created in. */
export interface Closure {
  tag: 'closure';
  lambda: Lambda;
  env: Environment;
}

export interface Primitive {
  tag: 'primitive';
  name: string;
  /** `null` means any number of arguments. */
  arity: number | null;
  impl: (...args: Value[]) => Value;
}

/** Pairs are two-element arrays, as in Source. */
export type Pair = [Value, Value];

export type Value = number | string | boolean | null | undefined | Closure | Primitive | Pair;

export function isPair(value: Value): value is Pair {
  return Array.isArray(value);
}

export function isClosure(value: Value): value is Closure {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && value.tag === 'closure';
}

export function isPrimitive(value: Value): value is Primitive {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && value.tag === 'primitive';
}

export function typeName(value: Value): string {
  if (value === null) return 'null';
  if (isPair(value)) return 'pair';
  if (typeof value === 'object') return 'function';
  return typeof value;
}

const MAX_NESTING = 64;

/** Text form of a value: strings are quoted, functions show their defining frame. */
export function stringify(value: Value, nesting = 0): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isPair(value)) {
    if (nesting >= MAX_NESTING) return '[...]';
    return `[${stringify(value[0], nesting + 1)}, ${stringify(value[1], nesting + 1)}]`;
  }
  if (value.tag === 'closure') return `fn[${value.env.frame.id}]`;
  return `primitive[${value.name}]`;
}
