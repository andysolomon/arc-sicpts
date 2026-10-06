import { averageDefinition, fixedPointDefinitions, newtonDefinitions, sumDefinitions } from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §1.3. */

const basics = `function inc(n) {
  return n + 1;
}

function identity(x) {
  return x;
}

function square(x) {
  return x * x;
}

function cube(x) {
  return x * x * x;
}
`;

export const exercise_1_29: ExerciseSpec = {
  id: '1.29',
  prelude: `${basics}
${sumDefinitions}`,
  starter: `// sum, inc, square and cube are provided.

// Simpson's rule with n (even) strips: h = (b - a) / n, y_k = f(a + k h),
// and the integral is h / 3 (y_0 + 4 y_1 + 2 y_2 + 4 y_3 + ... + 4 y_(n-1) + y_n).
function simpson(f, a, b, n) {
  // your answer
}
`,
  tests: [
    { name: 'cube from 0 to 1, n = 100', kind: 'value', expr: close('simpson(cube, 0, 1, 100)', 0.25, 1e-12), expected: true },
    { name: 'cube from 1 to 2, n = 10', kind: 'value', expr: close('simpson(cube, 1, 2, 10)', 3.75, 1e-12), expected: true },
    { name: 'square from 0 to 3, n = 2', kind: 'value', expr: close('simpson(square, 0, 3, 2)', 9, 1e-12), expected: true },
    { name: 'identity from 2 to 4, n = 10', kind: 'value', expr: close('simpson(identity, 2, 4, 10)', 6, 1e-12), expected: true },
  ],
  solution: `function simpson(f, a, b, n) {
  const h = (b - a) / n;
  function y(k) {
    return f(a + k * h);
  }
  function term(k) {
    return (k === 0 || k === n ? 1 : k % 2 === 1 ? 4 : 2) * y(k);
  }
  return (h / 3) * sum(term, 0, inc, n);
}
`,
};

export const exercise_1_30: ExerciseSpec = {
  id: '1.30',
  prelude: basics,
  starter: `// inc, identity, square and cube are provided.

function sum(term, a, next, b) {
  function iter(a, result) {
    // your answer
  }
  return iter(a, 0);
}
`,
  tests: [
    { name: 'sum of cubes', kind: 'value', expr: 'sum(cube, 1, inc, 10)', expected: 3025 },
    { name: 'sum of integers', kind: 'value', expr: 'sum(identity, 1, inc, 100)', expected: 5050 },
    { name: 'an empty range', kind: 'value', expr: 'sum(square, 5, inc, 4)', expected: 0 },
    { name: 'an iterative process', kind: 'shape', expr: '"iterative"', call: 'sum(identity, 1, inc, 20)' },
  ],
  solution: `function sum(term, a, next, b) {
  function iter(a, result) {
    return a > b
      ? result
      : iter(next(a), result + term(a));
  }
  return iter(a, 0);
}
`,
};

export const exercise_1_31: ExerciseSpec = {
  id: '1.31',
  prelude: basics,
  starter: `// inc, identity, square and cube are provided.

// A recursive process.
function product(term, a, next, b) {
  // your answer
}

// An iterative process.
function product_iter(term, a, next, b) {
  // your answer
}

function factorial(n) {
  // your answer, using product
}

// Wallis: π/4 = (2·4)/(3·3) · (4·6)/(5·5) · (6·8)/(7·7) · ..., with n factors.
function wallis_pi(n) {
  // your answer, using product
}
`,
  tests: [
    { name: 'product', kind: 'value', expr: 'product(identity, 1, inc, 5) + product(square, 1, inc, 3)', expected: 156 },
    { name: 'product_iter', kind: 'value', expr: 'product_iter(identity, 1, inc, 5) + product_iter(square, 1, inc, 3)', expected: 156 },
    { name: 'factorial', kind: 'value', expr: 'factorial(10)', expected: 3628800 },
    { name: 'π by Wallis', kind: 'value', expr: close('wallis_pi(1000)', Math.PI, 0.002), expected: true },
    { name: 'product is recursive', kind: 'shape', expr: '"recursive"', call: 'product(identity, 1, inc, 8)' },
    { name: 'product_iter is iterative', kind: 'shape', expr: '"iterative"', call: 'product_iter(identity, 1, inc, 8)' },
  ],
  solution: `function product(term, a, next, b) {
  return a > b
    ? 1
    : term(a) * product(term, next(a), next, b);
}

function product_iter(term, a, next, b) {
  function iter(a, result) {
    return a > b
      ? result
      : iter(next(a), result * term(a));
  }
  return iter(a, 1);
}

function factorial(n) {
  return product(identity, 1, inc, n);
}

function wallis_pi(n) {
  // The k-th factor is (2k)(2k + 2) / (2k + 1)².
  function factor(k) {
    return (2 * k * (2 * k + 2)) / square(2 * k + 1);
  }
  return 4 * product_iter(factor, 1, inc, n);
}
`,
};

export const exercise_1_32: ExerciseSpec = {
  id: '1.32',
  prelude: basics,
  starter: `// inc, identity, square and cube are provided.

function accumulate(combiner, null_value, term, a, next, b) {
  // your answer
}

function plus(x, y) {
  return x + y;
}

function times(x, y) {
  return x * y;
}

function sum(term, a, next, b) {
  // your answer, using accumulate
}

function product(term, a, next, b) {
  // your answer, using accumulate
}
`,
  tests: [
    { name: 'sum', kind: 'value', expr: 'sum(cube, 1, inc, 10)', expected: 3025 },
    { name: 'product', kind: 'value', expr: 'product(identity, 1, inc, 6)', expected: 720 },
    { name: 'any combiner', kind: 'value', expr: 'accumulate(math_max, 0, square, 1, inc, 5)', expected: 25 },
    { name: 'an empty range', kind: 'value', expr: 'accumulate(plus, 42, square, 5, inc, 4)', expected: 42 },
  ],
  solution: `function accumulate(combiner, null_value, term, a, next, b) {
  return a > b
    ? null_value
    : combiner(term(a), accumulate(combiner, null_value, term, next(a), next, b));
}

function plus(x, y) {
  return x + y;
}

function times(x, y) {
  return x * y;
}

function sum(term, a, next, b) {
  return accumulate(plus, 0, term, a, next, b);
}

function product(term, a, next, b) {
  return accumulate(times, 1, term, a, next, b);
}
`,
};

export const exercise_1_33: ExerciseSpec = {
  id: '1.33',
  prelude: `${basics}
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function is_prime(n) {
  function find(d) {
    return d * d > n ? true : n % d === 0 ? false : find(d + 1);
  }
  return n > 1 && find(2);
}`,
  starter: `// inc, identity, square, cube, gcd and is_prime are provided.

function filtered_accumulate(combiner, null_value, term, a, next, b, filter) {
  // your answer
}

function plus(x, y) {
  return x + y;
}

function times(x, y) {
  return x * y;
}

// The sum of the squares of the primes from a to b.
function sum_of_prime_squares(a, b) {
  // your answer
}

// The product of the positive integers less than n that are relatively prime to n.
function product_of_coprimes(n) {
  // your answer
}
`,
  tests: [
    { name: 'squares of primes from 2 to 10', kind: 'value', expr: 'sum_of_prime_squares(2, 10)', expected: 87 },
    { name: 'squares of primes from 1 to 20', kind: 'value', expr: 'sum_of_prime_squares(1, 20)', expected: 1027 },
    { name: 'coprimes below 10', kind: 'value', expr: 'product_of_coprimes(10)', expected: 189 },
    { name: 'coprimes below 7', kind: 'value', expr: 'product_of_coprimes(7)', expected: 720 },
  ],
  solution: `function filtered_accumulate(combiner, null_value, term, a, next, b, filter) {
  return a > b
    ? null_value
    : filter(a)
      ? combiner(term(a), filtered_accumulate(combiner, null_value, term, next(a), next, b, filter))
      : filtered_accumulate(combiner, null_value, term, next(a), next, b, filter);
}

function plus(x, y) {
  return x + y;
}

function times(x, y) {
  return x * y;
}

function sum_of_prime_squares(a, b) {
  return filtered_accumulate(plus, 0, square, a, inc, b, is_prime);
}

function product_of_coprimes(n) {
  function is_coprime(i) {
    return gcd(i, n) === 1;
  }
  return filtered_accumulate(times, 1, identity, 1, inc, n - 1, is_coprime);
}
`,
};

export const exercise_1_34: ExerciseSpec = {
  id: '1.34',
  starter: `function square(x) {
  return x * x;
}

function f(g) {
  return g(2);
}

// Work out f(f) by substitution before running it. When the evaluator
// gives up, what value is it trying to apply, and to what argument?
const operator_value = undefined;
const argument_value = undefined;
`,
  tests: [
    { name: 'f still works on functions', kind: 'value', expr: 'f(square)', expected: 4 },
    { name: 'the value being applied', kind: 'value', expr: 'operator_value', expected: 2 },
    { name: 'the argument it is applied to', kind: 'value', expr: 'argument_value', expected: 2 },
  ],
  solution: `function square(x) {
  return x * x;
}

function f(g) {
  return g(2);
}

// f(f) → f(2) → 2(2): the number 2 is not a function.
const operator_value = 2;
const argument_value = 2;
`,
};

export const exercise_1_35: ExerciseSpec = {
  id: '1.35',
  prelude: fixedPointDefinitions,
  starter: `// fixed_point is provided.

// The golden ratio as a fixed point of x ↦ 1 + 1 / x.
const golden_ratio = 0;
`,
  tests: [{ name: 'φ to within 0.0001', kind: 'value', expr: close('golden_ratio', (1 + Math.sqrt(5)) / 2, 0.0001), expected: true }],
  solution: `const golden_ratio = fixed_point(x => 1 + 1 / x, 1);
`,
};

export const exercise_1_36: ExerciseSpec = {
  id: '1.36',
  prelude: averageDefinition,
  starter: `// average is provided.

const tolerance = 0.00001;

// Make fixed_point display each guess.
function fixed_point(f, first_guess) {
  function close_enough(x, y) {
    return math_abs(x - y) < tolerance;
  }
  function try_with(guess) {
    const next = f(guess);
    return close_enough(guess, next)
      ? next
      : try_with(next);
  }
  return try_with(first_guess);
}

// x^x = 1000 means x = log(1000) / log(x).
function f(x) {
  return math_log(1000) / math_log(x);
}

// The same map with average damping.
function damped(x) {
  // your answer
}

display(fixed_point(f, 2));
fixed_point(damped, 2);
`,
  tests: [
    { name: 'the undamped search finds x', kind: 'value', expr: close('fixed_point(f, 2)', 4.555532270803653, 0.0001), expected: true },
    { name: 'the damped search finds the same x', kind: 'value', expr: close('fixed_point(damped, 2)', 4.555532270803653, 0.0001), expected: true },
    { name: 'damping takes far fewer guesses', kind: 'calls', call: 'fixed_point(damped, 2)', fn: 'try_with', atMost: 12 },
  ],
  solution: `const tolerance = 0.00001;

function fixed_point(f, first_guess) {
  function close_enough(x, y) {
    return math_abs(x - y) < tolerance;
  }
  function try_with(guess) {
    display(guess);
    const next = f(guess);
    return close_enough(guess, next)
      ? next
      : try_with(next);
  }
  return try_with(first_guess);
}

function f(x) {
  return math_log(1000) / math_log(x);
}

function damped(x) {
  return average(x, f(x));
}

display(fixed_point(f, 2));
fixed_point(damped, 2);
`,
};

const one = `function one(i) {
  return 1;
}`;

export const exercise_1_37: ExerciseSpec = {
  id: '1.37',
  prelude: `${one}

function identity_n(i) {
  return i;
}`,
  starter: `// one(i) returns 1 and identity_n(i) returns i, for every i.

// The k-term finite continued fraction N1 / (D1 + N2 / (D2 + ... Nk / Dk)).
// A recursive process.
function cont_frac(n, d, k) {
  // your answer
}

// An iterative process.
function cont_frac_iter(n, d, k) {
  // your answer
}

// The smallest k for which cont_frac(one, one, k) is within 0.00005 of 1/φ.
const k_needed = 0;
`,
  tests: [
    { name: 'cont_frac approaches 1/φ', kind: 'value', expr: close('cont_frac(one, one, 100)', 2 / (1 + Math.sqrt(5)), 1e-12), expected: true },
    { name: 'cont_frac_iter agrees', kind: 'value', expr: close('cont_frac_iter(one, one, 12) - cont_frac(one, one, 12)', 0, 1e-15), expected: true },
    { name: 'the terms are taken in order', kind: 'value', expr: close('cont_frac(identity_n, one, 3)', 1 / (1 + 2 / (1 + 3)), 1e-15), expected: true },
    { name: 'k for four decimal places', kind: 'value', expr: 'k_needed', expected: 11 },
    { name: 'cont_frac is recursive', kind: 'shape', expr: '"recursive"', call: 'cont_frac(one, one, 10)' },
    { name: 'cont_frac_iter is iterative', kind: 'shape', expr: '"iterative"', call: 'cont_frac_iter(one, one, 10)' },
  ],
  solution: `function cont_frac(n, d, k) {
  function from(i) {
    return i > k
      ? 0
      : n(i) / (d(i) + from(i + 1));
  }
  return from(1);
}

function cont_frac_iter(n, d, k) {
  // Build the fraction from the inside out.
  function iter(i, result) {
    return i === 0
      ? result
      : iter(i - 1, n(i) / (d(i) + result));
  }
  return iter(k, 0);
}

const k_needed = 11;
`,
};

const contFrac = `function cont_frac(n, d, k) {
  function iter(i, result) {
    return i === 0
      ? result
      : iter(i - 1, n(i) / (d(i) + result));
  }
  return iter(k, 0);
}`;

export const exercise_1_38: ExerciseSpec = {
  id: '1.38',
  prelude: `${one}

${contFrac}`,
  starter: `// one and cont_frac are provided.

// Euler's D_i: 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, ...
function euler_d(i) {
  // your answer
}

function e_approx(k) {
  return 2 + cont_frac(one, euler_d, k);
}
`,
  tests: [
    { name: 'the first terms', kind: 'value', expr: 'euler_d(1) * 100 + euler_d(2) * 10 + euler_d(3)', expected: 121 },
    { name: 'later terms', kind: 'value', expr: 'euler_d(5) * 100 + euler_d(8) * 10 + euler_d(10)', expected: 461 },
    { name: 'e', kind: 'value', expr: close('e_approx(20)', Math.E, 1e-12), expected: true },
  ],
  solution: `function euler_d(i) {
  return (i + 1) % 3 === 0 ? (2 * (i + 1)) / 3 : 1;
}

function e_approx(k) {
  return 2 + cont_frac(one, euler_d, k);
}
`,
};

export const exercise_1_39: ExerciseSpec = {
  id: '1.39',
  prelude: contFrac,
  starter: `// cont_frac is provided.

// Lambert: tan x = x / (1 - x² / (3 - x² / (5 - ...))), with k terms.
function tan_cf(x, k) {
  // your answer
}
`,
  tests: [
    { name: 'tan 1', kind: 'value', expr: close('tan_cf(1, 20)', Math.tan(1), 1e-12), expected: true },
    { name: 'tan 0.5', kind: 'value', expr: close('tan_cf(0.5, 20)', Math.tan(0.5), 1e-12), expected: true },
    { name: 'tan π/4', kind: 'value', expr: close('tan_cf(math_PI / 4, 20)', 1, 1e-12), expected: true },
  ],
  solution: `function tan_cf(x, k) {
  function n(i) {
    return i === 1 ? x : -x * x;
  }
  function d(i) {
    return 2 * i - 1;
  }
  return cont_frac(n, d, k);
}
`,
};

export const exercise_1_40: ExerciseSpec = {
  id: '1.40',
  prelude: newtonDefinitions,
  starter: `// fixed_point, deriv and newtons_method are provided.

// The function x ↦ x³ + a x² + b x + c.
function cubic(a, b, c) {
  // your answer
}
`,
  tests: [
    { name: 'cubic returns a function', kind: 'value', expr: 'cubic(2, 3, 4)(1)', expected: 10 },
    { name: 'a root of x³ + x² + x + 1', kind: 'value', expr: close('newtons_method(cubic(1, 1, 1), 1)', -1, 1e-6), expected: true },
    { name: 'a root of x³ − 2', kind: 'value', expr: close('newtons_method(cubic(0, 0, -2), 1)', Math.cbrt(2), 1e-6), expected: true },
  ],
  solution: `function cubic(a, b, c) {
  return x => x * x * x + a * x * x + b * x + c;
}
`,
};

export const exercise_1_41: ExerciseSpec = {
  id: '1.41',
  prelude: `function inc(n) {
  return n + 1;
}`,
  starter: `// inc is provided.

// A function that applies f twice.
function double(f) {
  // your answer
}

// Predict it first: what is double(double(double))(inc)(5)?
const prediction = 0;
`,
  tests: [
    { name: 'double(inc)', kind: 'value', expr: 'double(inc)(5)', expected: 7 },
    { name: 'double(double(double))(inc)(5)', kind: 'value', expr: 'double(double(double))(inc)(5)', expected: 21 },
    { name: 'the prediction', kind: 'value', expr: 'prediction', expected: 21 },
  ],
  solution: `function double(f) {
  return x => f(f(x));
}

// double(double) applies f 4 times; double(double(double)) applies it 16 times.
const prediction = 21;
`,
};

const squareAndInc = `function square(x) {
  return x * x;
}

function inc(n) {
  return n + 1;
}`;

export const exercise_1_42: ExerciseSpec = {
  id: '1.42',
  prelude: squareAndInc,
  starter: `// square and inc are provided.

// The function x ↦ f(g(x)).
function compose(f, g) {
  // your answer
}
`,
  tests: [
    { name: 'compose(square, inc)(6)', kind: 'value', expr: 'compose(square, inc)(6)', expected: 49 },
    { name: 'compose(inc, square)(6)', kind: 'value', expr: 'compose(inc, square)(6)', expected: 37 },
  ],
  solution: `function compose(f, g) {
  return x => f(g(x));
}
`,
};

export const exercise_1_43: ExerciseSpec = {
  id: '1.43',
  prelude: squareAndInc,
  starter: `// square and inc are provided.

function compose(f, g) {
  return x => f(g(x));
}

// The function that applies f n times.
function repeated(f, n) {
  // your answer
}
`,
  tests: [
    { name: 'repeated(square, 2)(5)', kind: 'value', expr: 'repeated(square, 2)(5)', expected: 625 },
    { name: 'repeated(inc, 10)(0)', kind: 'value', expr: 'repeated(inc, 10)(0)', expected: 10 },
    { name: 'once is f itself', kind: 'value', expr: 'repeated(square, 1)(7)', expected: 49 },
  ],
  solution: `function compose(f, g) {
  return x => f(g(x));
}

function repeated(f, n) {
  return n === 1
    ? f
    : compose(f, repeated(f, n - 1));
}
`,
};

export const exercise_1_44: ExerciseSpec = {
  id: '1.44',
  prelude: `${squareAndInc}

function compose(f, g) {
  return x => f(g(x));
}

function repeated(f, n) {
  return n === 1 ? f : compose(f, repeated(f, n - 1));
}`,
  starter: `// square, inc, compose and repeated are provided.

const dx = 0.1;

// The average of f(x - dx), f(x) and f(x + dx).
function smooth(f) {
  // your answer
}

// smooth applied n times, using repeated.
function n_fold_smooth(f, n) {
  // your answer
}
`,
  tests: [
    { name: 'smooth(square)(1)', kind: 'value', expr: close('smooth(square)(1)', 1 + 0.02 / 3, 1e-12), expected: true },
    { name: 'smooth(square)(0)', kind: 'value', expr: close('smooth(square)(0)', 0.02 / 3, 1e-12), expected: true },
    { name: 'twice smoothed', kind: 'value', expr: close('n_fold_smooth(square, 2)(1)', 1 + 0.04 / 3, 1e-12), expected: true },
  ],
  solution: `const dx = 0.1;

function smooth(f) {
  return x => (f(x - dx) + f(x) + f(x + dx)) / 3;
}

function n_fold_smooth(f, n) {
  return repeated(smooth, n)(f);
}
`,
};

export const exercise_1_45: ExerciseSpec = {
  id: '1.45',
  prelude: `${fixedPointDefinitions}
${averageDefinition}
function average_damp(f) {
  return x => average(x, f(x));
}

function compose(f, g) {
  return x => f(g(x));
}

function repeated(f, n) {
  return n === 1 ? f : compose(f, repeated(f, n - 1));
}`,
  starter: `// fixed_point, average_damp and repeated are provided.

// The nth root of x: a fixed point of y ↦ x / y^(n-1), average-damped
// enough times to converge.
function nth_root(x, n) {
  // your answer
}
`,
  tests: [
    { name: 'square root', kind: 'value', expr: close('nth_root(81, 2)', 9, 1e-4), expected: true },
    { name: 'fourth root', kind: 'value', expr: close('nth_root(81, 4)', 3, 1e-4), expected: true },
    { name: 'fifth root', kind: 'value', expr: close('nth_root(32, 5)', 2, 1e-4), expected: true },
    { name: 'sixteenth root', kind: 'value', expr: close('nth_root(65536, 16)', 2, 1e-4), expected: true },
  ],
  solution: `function nth_root(x, n) {
  // floor(log2 n) dampings are enough.
  const dampings = math_floor(math_log2(n));
  const f = y => x / math_pow(y, n - 1);
  return fixed_point(repeated(average_damp, dampings)(f), 1);
}
`,
};

export const exercise_1_46: ExerciseSpec = {
  id: '1.46',
  prelude: averageDefinition,
  starter: `// average is provided.

// A function that takes a guess and keeps improving it until it is good enough.
function iterative_improve(is_good_enough, improve) {
  // your answer
}

function sqrt(x) {
  // your answer, using iterative_improve
}

function fixed_point(f, first_guess) {
  // your answer, using iterative_improve
}
`,
  tests: [
    { name: 'sqrt(9)', kind: 'value', expr: close('sqrt(9)', 3, 0.001), expected: true },
    { name: 'sqrt(2)', kind: 'value', expr: close('sqrt(2)', Math.SQRT2, 0.001), expected: true },
    { name: 'fixed point of cos', kind: 'value', expr: close('fixed_point(math_cos, 1)', 0.7390822985224023, 0.0001), expected: true },
  ],
  solution: `function iterative_improve(is_good_enough, improve) {
  function iter(guess) {
    return is_good_enough(guess) ? guess : iter(improve(guess));
  }
  return iter;
}

function sqrt(x) {
  const is_good_enough = guess => math_abs(guess * guess - x) < 0.001;
  const improve = guess => average(guess, x / guess);
  return iterative_improve(is_good_enough, improve)(1);
}

function fixed_point(f, first_guess) {
  const is_good_enough = guess => math_abs(f(guess) - guess) < 0.00001;
  return iterative_improve(is_good_enough, f)(first_guess);
}
`,
};
