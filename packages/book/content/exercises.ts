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
  /** A reference answer in the same form as the starter. */
  solution: string;
}

const close = (expr: string, expected: number, tolerance: number): string =>
  `math_abs(${expr} - ${expected}) < ${tolerance}`;

const exercise_1_3: ExerciseSpec = {
  id: '1.3',
  starter: `function square(x) {
  return x * x;
}

function sum_of_larger_squares(a, b, c) {
  // your answer
}
`,
  tests: [
    { name: 'ascending', kind: 'value', expr: 'sum_of_larger_squares(1, 2, 3)', expected: 13 },
    { name: 'descending', kind: 'value', expr: 'sum_of_larger_squares(3, 2, 1)', expected: 13 },
    { name: 'smallest in the middle', kind: 'value', expr: 'sum_of_larger_squares(4, 1, 5)', expected: 41 },
    { name: 'ties', kind: 'value', expr: 'sum_of_larger_squares(2, 2, 1) + sum_of_larger_squares(5, 5, 5)', expected: 58 },
  ],
  solution: `function square(x) {
  return x * x;
}

function sum_of_larger_squares(a, b, c) {
  return a <= b && a <= c
    ? square(b) + square(c)
    : b <= a && b <= c
      ? square(a) + square(c)
      : square(a) + square(b);
}
`,
};

const exercise_1_7: ExerciseSpec = {
  id: '1.7',
  starter: `function is_good_enough(guess, x) {
  return math_abs(guess * guess - x) < 0.001;
}

function improve(guess, x) {
  return (guess + x / guess) / 2;
}

function sqrt_iter(guess, x) {
  return is_good_enough(guess, x)
    ? guess
    : sqrt_iter(improve(guess, x), x);
}

function sqrt(x) {
  return sqrt_iter(1, x);
}
`,
  tests: [
    { name: 'an ordinary number', kind: 'value', expr: close('sqrt(9)', 3, 0.001), expected: true },
    { name: 'a small number', kind: 'value', expr: close('sqrt(0.0001)', 0.01, 0.0001), expected: true },
    { name: 'a very small number', kind: 'value', expr: close('sqrt(0.00000004)', 0.0002, 0.000002), expected: true },
    { name: 'a large number terminates', kind: 'value', expr: close('sqrt(10000000000000) / 3162277.6601683795', 1, 0.001), expected: true },
  ],
  solution: `function is_good_enough(guess, x) {
  // Stop when one more improvement would change the guess
  // by less than a small fraction of the guess itself.
  return math_abs(improve(guess, x) - guess) < guess * 0.00001;
}

function improve(guess, x) {
  return (guess + x / guess) / 2;
}

function sqrt_iter(guess, x) {
  return is_good_enough(guess, x)
    ? guess
    : sqrt_iter(improve(guess, x), x);
}

function sqrt(x) {
  return sqrt_iter(1, x);
}
`,
};

const exercise_1_8: ExerciseSpec = {
  id: '1.8',
  starter: `function improve(guess, x) {
  // a better approximation to the cube root of x
}

function cube_root(x) {
  // your answer
}
`,
  tests: [
    { name: 'a perfect cube', kind: 'value', expr: close('cube_root(27)', 3, 0.001), expected: true },
    { name: 'another perfect cube', kind: 'value', expr: close('cube_root(1000)', 10, 0.001), expected: true },
    { name: 'not a perfect cube', kind: 'value', expr: close('cube_root(2)', 1.2599210498948732, 0.001), expected: true },
    { name: 'a small number', kind: 'value', expr: close('cube_root(0.000001)', 0.01, 0.0001), expected: true },
  ],
  solution: `function improve(guess, x) {
  return (x / (guess * guess) + 2 * guess) / 3;
}

function is_good_enough(guess, x) {
  return math_abs(improve(guess, x) - guess) < guess * 0.00001;
}

function cube_root_iter(guess, x) {
  return is_good_enough(guess, x)
    ? guess
    : cube_root_iter(improve(guess, x), x);
}

function cube_root(x) {
  return cube_root_iter(1, x);
}
`,
};

const exercise_1_9: ExerciseSpec = {
  id: '1.9',
  prelude: `function inc(x) { return x + 1; }
function dec(x) { return x - 1; }`,
  starter: `function plus_a(a, b) {
  return a === 0 ? b : inc(plus_a(dec(a), b));
}
function plus_b(a, b) {
  return a === 0 ? b : plus_b(dec(a), inc(b));
}
function classify(f) {
  // your answer: return "recursive" or "iterative"
}
`,
  tests: [
    { name: 'plus_a still adds', kind: 'value', expr: 'plus_a(4, 5)', expected: 9 },
    { name: 'plus_b still adds', kind: 'value', expr: 'plus_b(4, 5)', expected: 9 },
    { name: 'plus_a is classified as measured', kind: 'shape', expr: 'classify(plus_a)', call: 'plus_a(4, 5)' },
    { name: 'plus_b is classified as measured', kind: 'shape', expr: 'classify(plus_b)', call: 'plus_b(4, 5)' },
  ],
  solution: `function plus_a(a, b) {
  return a === 0 ? b : inc(plus_a(dec(a), b));
}
function plus_b(a, b) {
  return a === 0 ? b : plus_b(dec(a), inc(b));
}
function classify(f) {
  return f === plus_a ? "recursive" : "iterative";
}
`,
};

const exercise_1_10: ExerciseSpec = {
  id: '1.10',
  starter: `function A(x, y) {
  return y === 0
    ? 0
    : x === 0
      ? 2 * y
      : y === 1
        ? 2
        : A(x - 1, A(x, y - 1));
}

// Work these out by hand, then replace each 0.
const a_1_10 = 0;
const a_2_4 = 0;
const a_3_3 = 0;

// g(n) computes A(1, n) for positive n. Give it a closed form:
// an expression in n that does not call A.
function g(n) {
  return 0;
}
`,
  tests: [
    { name: 'A(1, 10)', kind: 'value', expr: 'a_1_10', expected: 1024 },
    { name: 'A(2, 4)', kind: 'value', expr: 'a_2_4', expected: 65536 },
    { name: 'A(3, 3)', kind: 'value', expr: 'a_3_3', expected: 65536 },
    { name: 'closed form of A(1, n)', kind: 'value', expr: 'g(1) === 2 && g(7) === 128 && g(12) === A(1, 12)', expected: true },
  ],
  solution: `function A(x, y) {
  return y === 0
    ? 0
    : x === 0
      ? 2 * y
      : y === 1
        ? 2
        : A(x - 1, A(x, y - 1));
}

const a_1_10 = 1024;
const a_2_4 = 65536;
const a_3_3 = 65536;

function g(n) {
  return math_pow(2, n);
}
`,
};

export const exercises: Readonly<Record<string, ExerciseSpec>> = Object.fromEntries(
  [exercise_1_3, exercise_1_7, exercise_1_8, exercise_1_9, exercise_1_10].map((spec) => [spec.id, spec]),
);
