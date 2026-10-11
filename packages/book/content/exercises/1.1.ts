import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §1.1. */

export const exercise_1_2: ExerciseSpec = {
  id: '1.2',
  starter: `// (5 + 4 + (2 - (3 - (6 + 4/5)))) / (3 (6 - 2) (2 - 7)), in JavaScript
const answer = 0;
`,
  tests: [{ name: 'the translated expression has the right value', kind: 'value', expr: close('answer', -37 / 150, 1e-12), expected: true }],
  solution: `const answer = (5 + 4 + (2 - (3 - (6 + 4 / 5)))) / (3 * (6 - 2) * (2 - 7));
`,
};

export const exercise_1_3: ExerciseSpec = {
  id: '1.3',
  starter: `const square = (x: number): number => x * x;

const sum_of_larger_squares = (a: number, b: number, c: number): number => {
  // your answer
};
`,
  tests: [
    { name: 'ascending', kind: 'value', expr: 'sum_of_larger_squares(1, 2, 3)', expected: 13 },
    { name: 'descending', kind: 'value', expr: 'sum_of_larger_squares(3, 2, 1)', expected: 13 },
    { name: 'smallest in the middle', kind: 'value', expr: 'sum_of_larger_squares(4, 1, 5)', expected: 41 },
    { name: 'ties', kind: 'value', expr: 'sum_of_larger_squares(2, 2, 1) + sum_of_larger_squares(5, 5, 5)', expected: 58 },
  ],
  solution: `const square = (x: number): number => x * x;

const sum_of_larger_squares = (a: number, b: number, c: number): number =>
  a <= b && a <= c
    ? square(b) + square(c)
    : b <= a && b <= c
      ? square(a) + square(c)
      : square(a) + square(b);
`,
};

export const exercise_1_4: ExerciseSpec = {
  id: '1.4',
  starter: `const plus = (a: number, b: number): number => a + b;

const minus = (a: number, b: number): number => a - b;

const a_plus_abs_b = (a: number, b: number): number =>
  (b >= 0 ? plus : minus)(a, b);

// a - |b|, choosing the function in the same way
const a_minus_abs_b = (a: number, b: number): number => {
  // your answer
};
`,
  tests: [
    { name: 'a_plus_abs_b is unchanged', kind: 'value', expr: 'a_plus_abs_b(5, -3)', expected: 8 },
    { name: 'positive b', kind: 'value', expr: 'a_minus_abs_b(5, 3)', expected: 2 },
    { name: 'negative b', kind: 'value', expr: 'a_minus_abs_b(5, -3)', expected: 2 },
    { name: 'zero b', kind: 'value', expr: 'a_minus_abs_b(5, 0)', expected: 5 },
  ],
  solution: `const plus = (a: number, b: number): number => a + b;

const minus = (a: number, b: number): number => a - b;

const a_plus_abs_b = (a: number, b: number): number =>
  (b >= 0 ? plus : minus)(a, b);

const a_minus_abs_b = (a: number, b: number): number =>
  (b >= 0 ? minus : plus)(a, b);
`,
};

export const exercise_1_7: ExerciseSpec = {
  id: '1.7',
  starter: `const is_good_enough = (guess: number, x: number): boolean =>
  math_abs(guess * guess - x) < 0.001;

const improve = (guess: number, x: number): number => (guess + x / guess) / 2;

const sqrt_iter = (guess: number, x: number): number =>
  is_good_enough(guess, x)
    ? guess
    : sqrt_iter(improve(guess, x), x);

const sqrt = (x: number): number => sqrt_iter(1, x);
`,
  tests: [
    { name: 'an ordinary number', kind: 'value', expr: close('sqrt(9)', 3, 0.001), expected: true },
    { name: 'a small number', kind: 'value', expr: close('sqrt(0.0001)', 0.01, 0.0001), expected: true },
    { name: 'a very small number', kind: 'value', expr: close('sqrt(0.00000004)', 0.0002, 0.000002), expected: true },
    { name: 'a large number terminates', kind: 'value', expr: close('sqrt(10000000000000) / 3162277.6601683795', 1, 0.001), expected: true },
  ],
  solution: `const is_good_enough = (guess: number, x: number): boolean => {
  // Stop when one more improvement would change the guess
  // by less than a small fraction of the guess itself.
  return math_abs(improve(guess, x) - guess) < guess * 0.00001;
};

const improve = (guess: number, x: number): number => (guess + x / guess) / 2;

const sqrt_iter = (guess: number, x: number): number =>
  is_good_enough(guess, x)
    ? guess
    : sqrt_iter(improve(guess, x), x);

const sqrt = (x: number): number => sqrt_iter(1, x);
`,
};

export const exercise_1_8: ExerciseSpec = {
  id: '1.8',
  starter: `const improve = (guess: number, x: number): number => {
  // a better approximation to the cube root of x
};

const cube_root = (x: number): number => {
  // your answer
};
`,
  tests: [
    { name: 'a perfect cube', kind: 'value', expr: close('cube_root(27)', 3, 0.001), expected: true },
    { name: 'another perfect cube', kind: 'value', expr: close('cube_root(1000)', 10, 0.001), expected: true },
    { name: 'not a perfect cube', kind: 'value', expr: close('cube_root(2)', 1.2599210498948732, 0.001), expected: true },
    { name: 'a small number', kind: 'value', expr: close('cube_root(0.000001)', 0.01, 0.0001), expected: true },
  ],
  solution: `const improve = (guess: number, x: number): number =>
  (x / (guess * guess) + 2 * guess) / 3;

const is_good_enough = (guess: number, x: number): boolean =>
  math_abs(improve(guess, x) - guess) < guess * 0.00001;

const cube_root_iter = (guess: number, x: number): number =>
  is_good_enough(guess, x)
    ? guess
    : cube_root_iter(improve(guess, x), x);

const cube_root = (x: number): number => cube_root_iter(1, x);
`,
};

