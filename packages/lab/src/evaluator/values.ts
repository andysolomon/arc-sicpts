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

/**
 * The primitive the machine applies itself: it spreads a list into arguments
 * and applies a function, compound or primitive, to them.
 */
export const APPLY_PRIMITIVE = 'apply_in_underlying_javascript';

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

/**
 * Longest text `stringify` produces by default. An evaluator written in Source
 * keeps its environments in lists that contain the functions made in them, so
 * a value can be very large; its text form stops here.
 */
export const MAX_TEXT = 10_000;

/** Longest text of a value quoted in an error message. */
export const ERROR_TEXT = 300;

interface Budget {
  pairs: number;
}

/** Text form of a value: strings are quoted, functions show their defining frame. */
export function stringify(value: Value, maxLength = MAX_TEXT): string {
  // Every call of a compound function labels its frame with its arguments,
  // so the common case, a value that is not a pair, must be cheap.
  if (!isPair(value)) {
    const text = atom(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }
  const parts: string[] = [];
  let length = 0;
  // The pairs being written, outermost first: meeting one again is a cycle.
  const path: Pair[] = [];
  const budget: Budget = { pairs: MAX_PAIRS };
  const walk = (v: Value, nesting: number): void => {
    if (length > maxLength) return;
    if (!isPair(v)) {
      const text = atom(v);
      parts.push(text);
      length += text.length;
      return;
    }
    // A pair inside itself is a cycle: name it instead of following it forever.
    const stop = path.includes(v) ? '...' : nesting >= MAX_NESTING || budget.pairs <= 0 ? '[...]' : null;
    if (stop !== null) {
      parts.push(stop);
      length += stop.length;
      return;
    }
    budget.pairs--;
    path.push(v);
    parts.push('[');
    walk(v[0], nesting + 1);
    parts.push(', ');
    walk(v[1], nesting + 1);
    parts.push(']');
    length += 4;
    path.pop();
  };
  walk(value, 0);
  const text = parts.join('');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function atom(value: Exclude<Value, Pair>): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
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
