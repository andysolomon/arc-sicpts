import { countChangeDefinitions, fermatDefinitions, sineDefinitions, smallestDivisorDefinitions } from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §1.2. */

export const exercise_1_9: ExerciseSpec = {
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

export const exercise_1_10: ExerciseSpec = {
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


export const exercise_1_11: ExerciseSpec = {
  id: '1.11',
  starter: `// f(n) = n if n < 3, and f(n - 1) + 2 f(n - 2) + 3 f(n - 3) otherwise.

function f_recursive(n) {
  // your answer: a recursive process
}

function f_iterative(n) {
  // your answer: an iterative process
}
`,
  tests: [
    { name: 'small values, recursively', kind: 'value', expr: 'f_recursive(0) + f_recursive(2) + f_recursive(5)', expected: 27 },
    { name: 'f(10), recursively', kind: 'value', expr: 'f_recursive(10)', expected: 1892 },
    { name: 'small values, iteratively', kind: 'value', expr: 'f_iterative(0) + f_iterative(2) + f_iterative(5)', expected: 27 },
    { name: 'f(30), iteratively', kind: 'value', expr: 'f_iterative(30)', expected: 61354575194 },
    { name: 'f_recursive is recursive', kind: 'shape', expr: '"recursive"', call: 'f_recursive(6)' },
    { name: 'f_iterative is iterative', kind: 'shape', expr: '"iterative"', call: 'f_iterative(6)' },
  ],
  solution: `function f_recursive(n) {
  return n < 3
    ? n
    : f_recursive(n - 1) + 2 * f_recursive(n - 2) + 3 * f_recursive(n - 3);
}

// a, b and c hold f(k), f(k - 1) and f(k - 2); count steps k up to n.
function f_iter(a, b, c, count) {
  return count === 0
    ? a
    : f_iter(a + 2 * b + 3 * c, a, b, count - 1);
}

function f_iterative(n) {
  return n < 3 ? n : f_iter(2, 1, 0, n - 2);
}
`,
};

export const exercise_1_12: ExerciseSpec = {
  id: '1.12',
  starter: `// The element in row \`row\` and position \`col\` of Pascal's triangle,
// both counted from 0.
function pascal(row, col) {
  // your answer
}
`,
  tests: [
    { name: 'the apex', kind: 'value', expr: 'pascal(0, 0)', expected: 1 },
    { name: 'the edges', kind: 'value', expr: 'pascal(4, 0) + pascal(4, 4)', expected: 2 },
    { name: 'row 4', kind: 'value', expr: 'pascal(4, 1) * 100 + pascal(4, 2) * 10 + pascal(4, 3)', expected: 464 },
    { name: 'row 10', kind: 'value', expr: 'pascal(10, 5)', expected: 252 },
  ],
  solution: `function pascal(row, col) {
  return col === 0 || col === row
    ? 1
    : pascal(row - 1, col - 1) + pascal(row - 1, col);
}
`,
};

export const exercise_1_14: ExerciseSpec = {
  id: '1.14',
  starter: `${countChangeDefinitions}
// How many times is cc applied when evaluating cc(amount, kinds_of_coins)?
// Follow the shape of cc, counting instead of adding up ways.
function cc_calls(amount, kinds_of_coins) {
  // your answer
}
`,
  tests: [
    { name: 'a leaf is one call', kind: 'value', expr: 'cc_calls(0, 5) + cc_calls(-4, 2) + cc_calls(3, 0)', expected: 3 },
    { name: 'count_change(10) with two kinds of coin', kind: 'value', expr: 'cc_calls(10, 2)', expected: 35 },
    { name: 'count_change(11)', kind: 'value', expr: 'cc_calls(11, 5)', expected: 55 },
    { name: 'count_change(100)', kind: 'value', expr: 'cc_calls(100, 5)', expected: 15499 },
  ],
  budget: 1_000_000,
  solution: `${countChangeDefinitions}
function cc_calls(amount, kinds_of_coins) {
  return amount === 0 || amount < 0 || kinds_of_coins === 0
    ? 1
    : 1 +
      cc_calls(amount, kinds_of_coins - 1) +
      cc_calls(amount - first_denomination(kinds_of_coins), kinds_of_coins);
}
`,
};

export const exercise_1_15: ExerciseSpec = {
  id: '1.15',
  starter: `${sineDefinitions}
// How many times is p applied when evaluating sine(angle)?
function p_count(angle) {
  // your answer
}
`,
  tests: [
    { name: 'sine(12.15)', kind: 'value', expr: 'p_count(12.15)', expected: 5 },
    { name: 'a small angle needs none', kind: 'value', expr: 'p_count(0.05)', expected: 0 },
    { name: 'sine(100)', kind: 'value', expr: 'p_count(100)', expected: 7 },
    { name: 'a million times larger, only 12 more', kind: 'value', expr: 'p_count(12150000) - p_count(12.15)', expected: 12 },
  ],
  solution: `${sineDefinitions}
function p_count(angle) {
  return !(math_abs(angle) > 0.1)
    ? 0
    : 1 + p_count(angle / 3);
}
`,
};

const evenAndSquare = `function is_even(n) {
  return n % 2 === 0;
}

function square(x) {
  return x * x;
}
`;

export const exercise_1_16: ExerciseSpec = {
  id: '1.16',
  starter: `${evenAndSquare}
// Keep a * b^n unchanged from one step to the next; when n reaches 0, a is the answer.
function fast_expt_iter(a, b, n) {
  // your answer
}

function fast_expt(b, n) {
  return fast_expt_iter(1, b, n);
}
`,
  tests: [
    { name: '2 to the 10th', kind: 'value', expr: 'fast_expt(2, 10)', expected: 1024 },
    { name: 'odd exponents and zero', kind: 'value', expr: 'fast_expt(3, 5) + fast_expt(7, 0)', expected: 244 },
    { name: 'an iterative process', kind: 'shape', expr: '"iterative"', call: 'fast_expt(2, 100)' },
    { name: 'a logarithmic number of steps', kind: 'calls', call: 'fast_expt(1.000001, 1000000)', fn: 'fast_expt_iter', atMost: 42 },
  ],
  solution: `${evenAndSquare}
function fast_expt_iter(a, b, n) {
  return n === 0
    ? a
    : is_even(n)
      ? fast_expt_iter(a, square(b), n / 2)
      : fast_expt_iter(a * b, b, n - 1);
}

function fast_expt(b, n) {
  return fast_expt_iter(1, b, n);
}
`,
};

const doubleAndHalve = `function is_even(n) {
  return n % 2 === 0;
}

function double(x) {
  return x + x;
}

function halve(x) {
  return x / 2;
}
`;

export const exercise_1_17: ExerciseSpec = {
  id: '1.17',
  prelude: doubleAndHalve,
  starter: `// is_even, double and halve are provided.

function times(a, b) {
  return b === 0
    ? 0
    : a + times(a, b - 1);
}

// The product of a and b in a logarithmic number of steps,
// using only +, double and halve.
function fast_times(a, b) {
  // your answer
}
`,
  tests: [
    { name: '3 times 7', kind: 'value', expr: 'fast_times(3, 7)', expected: 21 },
    { name: 'zeros', kind: 'value', expr: 'fast_times(0, 9) + fast_times(9, 0)', expected: 0 },
    { name: 'a large b', kind: 'value', expr: 'fast_times(3, 1000000)', expected: 3000000 },
    { name: 'a logarithmic number of steps', kind: 'calls', call: 'fast_times(3, 1000000)', fn: 'fast_times', atMost: 42 },
  ],
  solution: `function times(a, b) {
  return b === 0
    ? 0
    : a + times(a, b - 1);
}

function fast_times(a, b) {
  return b === 0
    ? 0
    : is_even(b)
      ? double(fast_times(a, halve(b)))
      : a + fast_times(a, b - 1);
}
`,
};

export const exercise_1_18: ExerciseSpec = {
  id: '1.18',
  prelude: doubleAndHalve,
  starter: `// is_even, double and halve are provided.

// Keep acc + a * b unchanged from one step to the next.
function fast_times_iter(acc, a, b) {
  // your answer
}

function fast_times(a, b) {
  return fast_times_iter(0, a, b);
}
`,
  tests: [
    { name: '3 times 7', kind: 'value', expr: 'fast_times(3, 7)', expected: 21 },
    { name: 'a large b', kind: 'value', expr: 'fast_times(3, 1000000)', expected: 3000000 },
    { name: 'an iterative process', kind: 'shape', expr: '"iterative"', call: 'fast_times(5, 37)' },
    { name: 'a logarithmic number of steps', kind: 'calls', call: 'fast_times(3, 1000000)', fn: 'fast_times_iter', atMost: 42 },
  ],
  solution: `function fast_times_iter(acc, a, b) {
  return b === 0
    ? acc
    : is_even(b)
      ? fast_times_iter(acc, double(a), halve(b))
      : fast_times_iter(acc + a, a, b - 1);
}

function fast_times(a, b) {
  return fast_times_iter(0, a, b);
}
`,
};

export const exercise_1_19: ExerciseSpec = {
  id: '1.19',
  starter: `function is_even(n) {
  return n % 2 === 0;
}

// Applying T(p, q) twice is the same as applying T(p_prime, q_prime) once.
function p_prime(p, q) {
  return 0; // your answer
}

function q_prime(p, q) {
  return 0; // your answer
}

function fib_iter(a, b, p, q, count) {
  return count === 0
    ? b
    : is_even(count)
      ? fib_iter(a, b, p_prime(p, q), q_prime(p, q), count / 2)
      : fib_iter(b * q + a * q + a * p, b * p + a * q, p, q, count - 1);
}

function fib(n) {
  return fib_iter(1, 0, 0, 1, n);
}
`,
  tests: [
    { name: 'fib(10)', kind: 'value', expr: 'fib(10)', expected: 55 },
    { name: 'fib(30)', kind: 'value', expr: 'fib(30)', expected: 832040 },
    { name: 'fib(70)', kind: 'value', expr: 'fib(70)', expected: 190392490709135 },
    { name: 'fib(1000) in a logarithmic number of steps', kind: 'calls', call: 'fib(1000)', fn: 'fib_iter', atMost: 24 },
  ],
  solution: `function is_even(n) {
  return n % 2 === 0;
}

function p_prime(p, q) {
  return p * p + q * q;
}

function q_prime(p, q) {
  return 2 * p * q + q * q;
}

function fib_iter(a, b, p, q, count) {
  return count === 0
    ? b
    : is_even(count)
      ? fib_iter(a, b, p_prime(p, q), q_prime(p, q), count / 2)
      : fib_iter(b * q + a * q + a * p, b * p + a * q, p, q, count - 1);
}

function fib(n) {
  return fib_iter(1, 0, 0, 1, n);
}
`,
};

export const exercise_1_20: ExerciseSpec = {
  id: '1.20',
  starter: `// How many remainder operations does gcd(206, 40) perform?
const normal_order_remainders = 0;
const applicative_order_remainders = 0;
`,
  tests: [
    { name: 'applicative order', kind: 'value', expr: 'applicative_order_remainders', expected: 4 },
    { name: 'normal order', kind: 'value', expr: 'normal_order_remainders', expected: 18 },
  ],
  solution: `const normal_order_remainders = 18;
const applicative_order_remainders = 4;
`,
};

export const exercise_1_21: ExerciseSpec = {
  id: '1.21',
  starter: `${smallestDivisorDefinitions}
// Replace each 0 with the smallest divisor, found by running smallest_divisor.
const d_199 = 0;
const d_1999 = 0;
const d_19999 = 0;
`,
  tests: [
    { name: '199', kind: 'value', expr: 'd_199', expected: 199 },
    { name: '1999', kind: 'value', expr: 'd_1999', expected: 1999 },
    { name: '19999', kind: 'value', expr: 'd_19999', expected: 7 },
  ],
  solution: `${smallestDivisorDefinitions}
const d_199 = smallest_divisor(199);
const d_1999 = smallest_divisor(1999);
const d_19999 = smallest_divisor(19999);
`,
};

export const exercise_1_22: ExerciseSpec = {
  id: '1.22',
  starter: `${smallestDivisorDefinitions}
function timed_prime_test(n) {
  const start = get_time();
  const prime = is_prime(n);
  if (prime) {
    display(n);
    display(get_time() - start);
  }
  return prime;
}

// A list of the first \`count\` primes larger than \`start\`,
// testing consecutive odd numbers with timed_prime_test.
function search_for_primes(start, count) {
  // your answer
}
`,
  tests: [
    { name: 'above 1000', kind: 'value', expr: 'stringify(search_for_primes(1000, 3))', expected: '[1009, [1013, [1019, null]]]' },
    { name: 'above 10 000', kind: 'value', expr: 'stringify(search_for_primes(10000, 3))', expected: '[10007, [10009, [10037, null]]]' },
    { name: 'above 100 000', kind: 'value', expr: 'stringify(search_for_primes(100000, 3))', expected: '[100003, [100019, [100043, null]]]' },
    { name: 'above 1 000 000', kind: 'value', expr: 'stringify(search_for_primes(1000000, 3))', expected: '[1000003, [1000033, [1000037, null]]]' },
  ],
  budget: 1_000_000,
  solution: `${smallestDivisorDefinitions}
function timed_prime_test(n) {
  const start = get_time();
  const prime = is_prime(n);
  if (prime) {
    display(n);
    display(get_time() - start);
  }
  return prime;
}

function search_from(candidate, count) {
  return count === 0
    ? null
    : timed_prime_test(candidate)
      ? pair(candidate, search_from(candidate + 2, count - 1))
      : search_from(candidate + 2, count);
}

function search_for_primes(start, count) {
  return search_from(start % 2 === 0 ? start + 1 : start + 2, count);
}
`,
};

export const exercise_1_23: ExerciseSpec = {
  id: '1.23',
  starter: `${smallestDivisorDefinitions}
// Change find_divisor so that after 2 it tries only odd numbers.
`,
  tests: [
    { name: 'still finds 7 for 91', kind: 'value', expr: 'smallest_divisor(91)', expected: 7 },
    { name: 'still finds 2 and 5', kind: 'value', expr: 'smallest_divisor(4) * 10 + smallest_divisor(25)', expected: 25 },
    { name: 'still recognises primes', kind: 'value', expr: 'is_prime(199) && is_prime(1009) && !is_prime(1001)', expected: true },
    { name: 'half as many divisors tried', kind: 'calls', call: 'smallest_divisor(1009)', fn: 'find_divisor', atMost: 17 },
  ],
  solution: `function square(x) {
  return x * x;
}

function smallest_divisor(n) {
  return find_divisor(n, 2);
}

function next(test_divisor) {
  return test_divisor === 2 ? 3 : test_divisor + 2;
}

function find_divisor(n, test_divisor) {
  return square(test_divisor) > n
    ? n
    : divides(test_divisor, n)
      ? test_divisor
      : find_divisor(n, next(test_divisor));
}

function divides(a, b) {
  return b % a === 0;
}

function is_prime(n) {
  return n === smallest_divisor(n);
}
`,
};

export const exercise_1_27: ExerciseSpec = {
  id: '1.27',
  prelude: `function square(x) {
  return x * x;
}

${fermatDefinitions}`,
  starter: `// expmod and square are provided.

// True when a^n is congruent to a modulo n for every a < n.
function fools_fermat(n) {
  // your answer
}
`,
  tests: [
    { name: '561 passes every test', kind: 'value', expr: 'fools_fermat(561)', expected: true },
    { name: '1105 too', kind: 'value', expr: 'fools_fermat(1105)', expected: true },
    { name: 'and 1729', kind: 'value', expr: 'fools_fermat(1729)', expected: true },
    { name: 'so does a prime', kind: 'value', expr: 'fools_fermat(1009)', expected: true },
    { name: 'an ordinary composite does not', kind: 'value', expr: 'fools_fermat(15) || fools_fermat(1001)', expected: false },
  ],
  budget: 2_000_000,
  solution: `function fools_fermat(n) {
  function from(a) {
    return a === n
      ? true
      : expmod(a, n, n) === a && from(a + 1);
  }
  return from(1);
}
`,
};

export const exercise_1_28: ExerciseSpec = {
  id: '1.28',
  prelude: `function square(x) {
  return x * x;
}

function is_even(n) {
  return n % 2 === 0;
}`,
  starter: `// square and is_even are provided.

// Like expmod, but returns 0 as soon as it finds a nontrivial
// square root of 1 modulo m.
function mr_expmod(base, exp, m) {
  // your answer
}

function miller_rabin_test(n) {
  function try_it(a) {
    return mr_expmod(a, n - 1, n) === 1;
  }
  return try_it(1 + math_floor(math_random() * (n - 1)));
}

function fast_is_prime(n, times) {
  return times === 0
    ? true
    : miller_rabin_test(n)
      ? fast_is_prime(n, times - 1)
      : false;
}
`,
  tests: [
    { name: 'primes pass', kind: 'value', expr: 'fast_is_prime(1009, 20) && fast_is_prime(7919, 20)', expected: true },
    { name: 'an ordinary composite fails', kind: 'value', expr: 'fast_is_prime(1001, 20)', expected: false },
    { name: '561 is caught', kind: 'value', expr: 'fast_is_prime(561, 20)', expected: false },
    { name: '1105, 1729 and 2465 are caught', kind: 'value', expr: 'fast_is_prime(1105, 20) || fast_is_prime(1729, 20) || fast_is_prime(2465, 20)', expected: false },
  ],
  solution: `function mr_expmod(base, exp, m) {
  if (exp === 0) {
    return 1;
  } else if (is_even(exp)) {
    const half = mr_expmod(base, exp / 2, m);
    const squared = square(half) % m;
    // A nontrivial square root of 1 proves m composite.
    return half !== 1 && half !== m - 1 && squared === 1 ? 0 : squared;
  } else {
    return (base * mr_expmod(base, exp - 1, m)) % m;
  }
}

function miller_rabin_test(n) {
  function try_it(a) {
    return mr_expmod(a, n - 1, n) === 1;
  }
  return try_it(1 + math_floor(math_random() * (n - 1)));
}

function fast_is_prime(n, times) {
  return times === 0
    ? true
    : miller_rabin_test(n)
      ? fast_is_prime(n, times - 1)
      : false;
}
`,
};
