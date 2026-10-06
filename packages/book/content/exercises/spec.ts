import type { TestSpec } from '@sicp/lab';

/**
 * Everything about an exercise that can be checked by machine. The statement
 * and the explanation of the solution are prose and live in the section's MDX.
 * `tests/exercises.test.ts` proves that each solution passes and each starter
 * does not.
 */
export interface ExerciseSpec {
  /** Exercise number as in the book, e.g. `1.9`. */
  id: string;
  /** What the editor starts with. */
  starter: string;
  /** Definitions the submission can use without seeing them. */
  prelude?: string;
  /** The hidden tests; the reader sees only how many pass. */
  tests: TestSpec[];
  /** Evaluator steps allowed for each test, when the default of 100 000 is not right. */
  budget?: number;
  /** A reference answer in the same form as the starter. */
  solution: string;
}

/** A test expression that is true when `expr` is within `tolerance` of `expected`. */
export const close = (expr: string, expected: number, tolerance: number): string =>
  `math_abs(${expr} - ${expected}) < ${tolerance}`;
