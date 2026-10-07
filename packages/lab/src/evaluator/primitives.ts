import { SourceError } from '../syntax/errors.ts';
import { define, extend, type Environment } from './environment.ts';
import type { RegisterMachine } from '../machines/registerMachine.ts';
import { installMachines } from '../machines/install.ts';
import { invoke } from './invoke.ts';
import {
  isClosure,
  isPair,
  isPrimitive,
  listToArray,
  listToString,
  stringify,
  typeName,
  type Pair,
  type Primitive,
  type Value,
} from './values.ts';

const fail = (message: string): never => {
  throw new SourceError('runtime', message, null);
};

const number = (name: string, value: Value): number => {
  if (typeof value !== 'number') fail(`${name} expects a number, got ${typeName(value)}`);
  return value as number;
};

const MATH_UNARY = [
  'abs',
  'sqrt',
  'cbrt',
  'floor',
  'ceil',
  'round',
  'trunc',
  'log',
  'log2',
  'exp',
  'sin',
  'cos',
  'tan',
  'atan',
] as const;

/** A line from (x1, y1) to (x2, y2), drawn by `draw_line` (§2.2.4). */
export type Segment = [x1: number, y1: number, x2: number, y2: number];

export interface GlobalOptions {
  /** Called with every machine that `make_machine` creates (§5.2). */
  onMachine?: (machine: RegisterMachine) => void;
  /** Called with every pair that `pair` or `list` allocates, in order (§5.3). */
  onPair?: (pair: Pair) => void;
  /** Instructions one start of a register machine may execute. */
  maxInstructions?: number;
}

function listOf(name: string, value: Value): Value[] {
  const items = listToArray(value);
  return items ?? fail(`${name} expects a list, got ${stringify(value)}`);
}

/** Structural equality, as `equal` in §2.3.1; the library's `equal` is the same in Source. */
function equal(a: Value, b: Value): boolean {
  if (isPair(a) && isPair(b)) return equal(a[0], b[0]) && equal(a[1], b[1]);
  return a === b;
}

/**
 * The outermost frame: the primitive functions and constants every program can see.
 * `display` output and `draw_line` lines are handed to the caller instead of being shown.
 */
export function createGlobalEnvironment(
  display: (text: string) => void,
  draw: (segment: Segment) => void = () => {},
  options: GlobalOptions = {},
): Environment {
  const env = extend(null, 'global', 'global');
  const primitives: Primitive[] = [];

  const primitive = (name: string, arity: number | null, impl: (...args: Value[]) => Value): void => {
    const value: Primitive = { tag: 'primitive', name, arity, impl };
    primitives.push(value);
    define(env, name, value);
  };

  for (const fn of MATH_UNARY) {
    const name = `math_${fn}`;
    primitive(name, 1, (x) => Math[fn](number(name, x)));
  }
  primitive('math_atan2', 2, (y, x) => Math.atan2(number('math_atan2', y), number('math_atan2', x)));
  primitive('math_pow', 2, (x, y) => Math.pow(number('math_pow', x), number('math_pow', y)));
  primitive('math_max', null, (...xs) => Math.max(...xs.map((x) => number('math_max', x))));
  primitive('math_min', null, (...xs) => Math.min(...xs.map((x) => number('math_min', x))));
  primitive('math_random', 0, () => Math.random());
  define(env, 'math_PI', Math.PI);
  define(env, 'math_E', Math.E);

  primitive('display', 1, (value) => {
    display(stringify(value));
    return value;
  });
  // Milliseconds on a monotonic clock, for timing a computation as in Exercise 1.22.
  primitive('get_time', 0, () => performance.now());
  primitive('stringify', 1, (value) => stringify(value));
  primitive('error', null, (...values) =>
    fail(values.map((v) => (typeof v === 'string' ? v : stringify(v))).join(' ')),
  );
  primitive('parse_int', 2, (text, radix) =>
    typeof text === 'string' ? Number.parseInt(text, number('parse_int', radix)) : fail(`parse_int expects a string, got ${typeName(text)}`),
  );

  const allocate = (head: Value, tail: Value): Pair => {
    const cell: Pair = [head, tail];
    options.onPair?.(cell);
    return cell;
  };
  primitive('pair', 2, allocate);
  primitive('head', 1, (p) => (isPair(p) ? p[0] : fail(`head expects a pair, got ${typeName(p)}`)));
  primitive('tail', 1, (p) => (isPair(p) ? p[1] : fail(`tail expects a pair, got ${typeName(p)}`)));
  primitive('set_head', 2, (p, value) => {
    if (!isPair(p)) fail(`set_head expects a pair, got ${typeName(p)}`);
    (p as Pair)[0] = value;
    return undefined;
  });
  primitive('set_tail', 2, (p, value) => {
    if (!isPair(p)) fail(`set_tail expects a pair, got ${typeName(p)}`);
    (p as Pair)[1] = value;
    return undefined;
  });
  primitive('list', null, (...items) => items.reduceRight<Value>((rest, item) => allocate(item, rest), null));
  primitive('is_null', 1, (v) => v === null);
  primitive('is_pair', 1, (v) => isPair(v));
  primitive('is_list', 1, (v) => listToArray(v) !== null);
  primitive('is_number', 1, (v) => typeof v === 'number');
  primitive('is_string', 1, (v) => typeof v === 'string');
  primitive('is_boolean', 1, (v) => typeof v === 'boolean');
  primitive('is_undefined', 1, (v) => v === undefined);
  primitive('is_function', 1, (v) => isClosure(v) || isPrimitive(v));
  primitive('list_to_string', 1, (xs) => listToString(xs));
  primitive('display_list', 1, (xs) => {
    display(listToString(xs));
    return xs;
  });

  // The picture language (§2.2.4): a vector is a pair of numbers, and the
  // canvas is the unit square with its origin at the bottom left.
  const point = (v: Value): [number, number] => {
    if (isPair(v) && typeof v[0] === 'number' && typeof v[1] === 'number') return [v[0], v[1]];
    return fail(`draw_line expects two vectors, pairs of numbers, got ${stringify(v)}`);
  };
  primitive('draw_line', 2, (start, end) => {
    draw([...point(start), ...point(end)]);
    return undefined;
  });

  // `assoc` as in §3.3.3: the record whose key is `equal` to `key`, or undefined.
  primitive('assoc', 2, (key, records) => {
    for (const record of listOf('assoc', records)) {
      if (isPair(record) && equal(key, record[0])) return record;
    }
    return undefined;
  });
  define(env, 'apply_in_underlying_javascript', {
    tag: 'primitive',
    name: 'apply_in_underlying_javascript',
    arity: 2,
    impl: (fn, args) => invoke(fn, listOf('apply_in_underlying_javascript', args)),
    tailApply: (fn, args) => ({ fn, args: listOf('apply_in_underlying_javascript', args) }),
  });

  installMachines(env, primitives, {
    display,
    ...(options.onMachine !== undefined && { onMachine: options.onMachine }),
    ...(options.maxInstructions !== undefined && { maxInstructions: options.maxInstructions }),
  });
  return env;
}
