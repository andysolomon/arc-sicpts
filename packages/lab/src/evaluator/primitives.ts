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

/**
 * The outermost frame: the primitive functions and constants every program can see.
 * `display` output is handed to the caller instead of being printed.
 */
export function createGlobalEnvironment(display: (text: string) => void): Environment {
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
  // §3.4: threads, and the one atomic operation a mutex needs.
  define(env, 'concurrent_execute', {
    tag: 'primitive',
    name: 'concurrent_execute',
    arity: null,
    control: 'concurrent_execute',
    impl: () => fail('concurrent_execute is carried out by the machine'),
  });
  primitive('test_and_set', 1, (cell) => {
    if (!isPair(cell)) fail(`test_and_set expects a pair, got ${typeName(cell)}`);
    const p = cell as Pair;
    if (p[0] === true) return true;
    p[0] = true;
    return false;
  });
  primitive('list_to_string', 1, (xs) => listToString(xs));
  primitive('display_list', 1, (xs) => {
    display(listToString(xs));
    return xs;
  });

  return env;
}
