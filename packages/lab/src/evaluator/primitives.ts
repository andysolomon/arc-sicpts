import { SourceError } from '../syntax/errors.ts';
import { define, extend, type Environment } from './environment.ts';
import { isClosure, isPair, isPrimitive, listToString, stringify, typeName, type Pair, type Value } from './values.ts';

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

/**
 * The outermost frame: the primitive functions and constants every program can see.
 * `display` output and `draw_line` lines are handed to the caller instead of being shown.
 */
export function createGlobalEnvironment(
  display: (text: string) => void,
  draw: (segment: Segment) => void = () => {},
): Environment {
  const env = extend(null, 'global', 'global');

  const primitive = (name: string, arity: number | null, impl: (...args: Value[]) => Value): void => {
    define(env, name, { tag: 'primitive', name, arity, impl });
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

  primitive('pair', 2, (head, tail) => [head, tail]);
  primitive('head', 1, (p) => (isPair(p) ? p[0] : fail(`head expects a pair, got ${typeName(p)}`)));
  primitive('tail', 1, (p) => (isPair(p) ? p[1] : fail(`tail expects a pair, got ${typeName(p)}`)));
  primitive('set_head', 2, (p, v) => {
    if (!isPair(p)) fail(`set_head expects a pair, got ${typeName(p)}`);
    (p as Pair)[0] = v;
    return undefined;
  });
  primitive('set_tail', 2, (p, v) => {
    if (!isPair(p)) fail(`set_tail expects a pair, got ${typeName(p)}`);
    (p as Pair)[1] = v;
    return undefined;
  });
  primitive('list', null, (...items) => items.reduceRight<Value>((rest, item) => [item, rest], null));
  primitive('is_null', 1, (v) => v === null);
  primitive('is_pair', 1, (v) => isPair(v));
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

  return env;
}
