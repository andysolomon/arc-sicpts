import { isDeclaration, parse, prepare, type Expression, type StepRecord } from '@sicp/lab';
import type { Trace } from '../useTrace.ts';

/**
 * What the general methods of §1.3 need in order to be drawn: the call that
 * starts the method, the function it was handed (sampled, so that it can be
 * plotted), and what the evaluator did with it according to the trace.
 */

export interface MethodCall {
  /** The function the method works on, as written: `math_cos`, `y => x / y`, `cube`. */
  fn: string;
  /** The other arguments, as numbers when they are numeric literals. */
  args: (number | null)[];
  /** Index of the top-level statement that makes the call. */
  statement: number;
}

const numberOf = (expr: Expression | undefined): number | null => {
  if (expr === undefined) return null;
  if (expr.kind === 'literal' && typeof expr.value === 'number') return expr.value;
  if (expr.kind === 'unary' && expr.operator === '-' && expr.operand.kind === 'literal' && typeof expr.operand.value === 'number') return -expr.operand.value;
  return null;
};

/** The first top-level statement that applies `callee` to a function and further arguments. */
export function findMethodCall(source: string, callee: string): MethodCall | null {
  let program;
  try {
    program = parse(source);
  } catch {
    return null;
  }
  for (const [statement, node] of program.body.entries()) {
    if (node.kind !== 'application' || node.fun.kind !== 'name' || node.fun.symbol !== callee) continue;
    const [fn, ...rest] = node.args;
    if (fn === undefined) continue;
    return { fn: source.slice(fn.loc.start, fn.loc.end), args: rest.map(numberOf), statement };
  }
  return null;
}

export type Sampler = (x: number) => number | null;

const DECLARATIONS_BUDGET = 50_000;
const SAMPLE_BUDGET = 5_000;

/**
 * A function that evaluates `fn` at a number, using the program's own
 * declarations. Only declarations are evaluated, never the program's other
 * statements, and every evaluation has a small step budget, so sampling cannot
 * hang the page. Null when the declarations do not evaluate.
 */
export function sampler(source: string, fn: string): Sampler | null {
  let declarations: string;
  try {
    declarations = parse(source)
      .body.filter(isDeclaration)
      .map((node) => source.slice(node.loc.start, node.loc.end))
      .join('\n');
  } catch {
    return null;
  }
  let session;
  try {
    session = prepare(declarations, { budget: DECLARATIONS_BUDGET });
  } catch {
    return null;
  }
  if (session.machine.run() !== 'done') return null;
  const cache = new Map<number, number | null>();
  return (x) => {
    const known = cache.get(x);
    if (known !== undefined) return known;
    let value: number | null = null;
    try {
      const machine = session.follow(`(${fn})(${x});`, { budget: SAMPLE_BUDGET });
      if (machine.run() === 'done' && typeof machine.value === 'number' && Number.isFinite(machine.value)) value = machine.value;
    } catch {
      value = null;
    }
    cache.set(x, value);
    return value;
  };
}

/** The calls the trace recorded for one function, in order, with the record each was made at. */
export function callsOf(trace: Trace | null, name: string, statement?: number): { args: string[]; record: StepRecord }[] {
  return (trace?.records ?? []).flatMap((record) =>
    record.event.kind === 'call' && record.event.name === name && (statement === undefined || record.statement === statement)
      ? [{ args: record.event.args, record }]
      : [],
  );
}

/**
 * The guesses of a fixed-point search: the argument of every `try_with` call,
 * or failing that, the numbers the program printed.
 */
export function guessesOf(trace: Trace | null, statement?: number): number[] {
  const fromCalls = callsOf(trace, 'try_with', statement).map((call) => Number(call.args[0]));
  const guesses = fromCalls.length > 0 ? fromCalls : (trace?.output ?? []).map(Number);
  return guesses.filter((n) => Number.isFinite(n));
}

/** The value the program finished with, as a number, when it did. */
export function finalNumber(trace: Trace | null): number | null {
  if (trace?.outcome.status !== 'done') return null;
  const n = Number(trace.outcome.value);
  return Number.isFinite(n) ? n : null;
}

export const fmt = (n: number): string => {
  if (Number.isInteger(n)) return String(n);
  const text = Math.abs(n) < 1e-4 ? n.toExponential(3) : n.toPrecision(6);
  return text.replace(/(\.\d*?)0+(e|$)/, '$1$2').replace(/\.(e|$)/, '$1');
};
