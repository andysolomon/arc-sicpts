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

export const exercise_1_4: ExerciseSpec = {
  id: '1.4',
  starter: `function plus(a, b) {
  return a + b;
}

function minus(a, b) {
  return a - b;
}

function a_plus_abs_b(a, b) {
  return (b >= 0 ? plus : minus)(a, b);
}

// a - |b|, choosing the function in the same way
function a_minus_abs_b(a, b) {
  // your answer
}
`,
  tests: [
    { name: 'a_plus_abs_b is unchanged', kind: 'value', expr: 'a_plus_abs_b(5, -3)', expected: 8 },
    { name: 'positive b', kind: 'value', expr: 'a_minus_abs_b(5, 3)', expected: 2 },
    { name: 'negative b', kind: 'value', expr: 'a_minus_abs_b(5, -3)', expected: 2 },
    { name: 'zero b', kind: 'value', expr: 'a_minus_abs_b(5, 0)', expected: 5 },
  ],
  solution: `function plus(a, b) {
  return a + b;
}

function minus(a, b) {
  return a - b;
}

function a_plus_abs_b(a, b) {
  return (b >= 0 ? plus : minus)(a, b);
}

function a_minus_abs_b(a, b) {
  return (b >= 0 ? minus : plus)(a, b);
}
`,
};

export const exercise_1_7: ExerciseSpec = {
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

export const exercise_1_8: ExerciseSpec = {
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

