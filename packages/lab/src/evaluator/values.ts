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
  /** Set for the primitives the machine carries out itself, such as starting threads. */
  control?: 'concurrent_execute';
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
/**
 * Pairs written out at most, per value. Shared structure is written out each
 * time it is met, so without a limit a value built by doubling, such as
 * `pair(x, x)` applied twenty times, would take millions of characters.
 */
const MAX_PAIRS = 2000;

interface Budget {
  pairs: number;
}

/** Text form of a value: strings are quoted, functions show their defining frame. */
export function stringify(value: Value, nesting = 0): string {
  return write(value, nesting, new Set(), { pairs: MAX_PAIRS });
}

function write(value: Value, nesting: number, path: Set<Pair>, budget: Budget): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isPair(value)) {
    // A pair inside itself is a cycle: name it instead of following it forever.
    if (path.has(value)) return '...';
    if (nesting >= MAX_NESTING || budget.pairs <= 0) return '[...]';
    budget.pairs--;
    path.add(value);
    const text = `[${write(value[0], nesting + 1, path, budget)}, ${write(value[1], nesting + 1, path, budget)}]`;
    path.delete(value);
    return text;
  }
  if (value.tag === 'closure') return `fn[${value.env.frame.id}]`;
  return `primitive[${value.name}]`;
}

/**
 * List notation, as `display_list` prints it: `list(1, 2, 3)` for a list,
 * `[1, 2]` for a pair whose tail is not a list. A pair met again on the way
 * down, as in a circular list, prints as `...`.
 */
export function listToString(value: Value): string {
  return writeList(value, new Set(), { pairs: MAX_PAIRS * 5 });
}

function writeList(value: Value, path: Set<Pair>, budget: Budget): string {
  if (!isPair(value)) return stringify(value);
  if (path.has(value)) return '...';
  const items: string[] = [];
  const spine: Pair[] = [];
  let rest: Value = value;
  while (isPair(rest) && !path.has(rest)) {
    if (budget.pairs-- <= 0) {
      items.push('...');
      rest = null;
      break;
    }
    path.add(rest);
    spine.push(rest);
    items.push(writeList(rest[0], path, budget));
    rest = rest[1];
  }
  for (const pair of spine) path.delete(pair);
  if (rest === null) return `list(${items.join(', ')})`;
  // An improper or circular tail: pair notation from the first pair.
  const tailText = isPair(rest) ? '...' : stringify(rest);
  return items.reduceRight((text, item) => `[${item}, ${text}]`, tailText);
}
