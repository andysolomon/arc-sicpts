import { parse } from '@sicp/lab';
import type { Trace } from '../useTrace.ts';

/**
 * Newton's method for square roots, as the program ran it: the guesses it
 * printed with `display`, and the number whose root it was after.
 */

export interface NewtonModel {
  /** The radicand, when the program names it; otherwise inferred from the last guess. */
  x: number | null;
  guesses: number[];
  /** Whether `x` was read from a `sqrt(<number>)` call or inferred. */
  inferred: boolean;
}

export function newtonModel(source: string, trace: Trace | null): NewtonModel {
  const guesses = (trace?.output ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  let x: number | null = null;
  try {
    const program = parse(source);
    const params = new Map(
      program.body.flatMap((statement) => (statement.kind === 'function' ? [[statement.symbol, statement.lambda.params] as const] : [])),
    );
    for (const statement of program.body) {
      if (statement.kind !== 'application' || statement.fun.kind !== 'name') continue;
      // The argument the function calls `x`, or else the first numeric one.
      const index = params.get(statement.fun.symbol)?.indexOf('x') ?? -1;
      const candidates = index >= 0 ? [statement.args[index]] : statement.args;
      for (const arg of candidates) {
        if (arg?.kind === 'literal' && typeof arg.value === 'number' && arg.value > 0) {
          x = arg.value;
          break;
        }
      }
    }
  } catch {
    x = null;
  }
  const last = guesses[guesses.length - 1];
  if (x === null && last !== undefined) return { x: last * last, guesses, inferred: true };
  return { x, guesses, inferred: false };
}

/** Newton's step for f(y) = y² − x, which is the same as averaging y with x / y. */
export const improve = (guess: number, x: number): number => (guess + x / guess) / 2;
