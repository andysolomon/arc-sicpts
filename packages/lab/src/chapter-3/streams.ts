/**
 * Programs of §3.5.1 and §3.5.2, shared by the Book's examples and the
 * Laboratory's tests: streams as pairs whose tail is a function of no
 * arguments, the order in which a delayed computation really happens, `memo`,
 * and streams that never end.
 *
 * The library's stream functions (`library.ts`) do not memoize. Programs here
 * that declare `stream_map`, `stream_filter` and the like shadow the library's
 * versions with the book's text, which behaves the same.
 */

/** The Θ(√n) primality test of §1.2.6. */
export const streamPrimalityDefinitions = `const square = (x) =>
  x * x;

const smallest_divisor = (n) =>
  find_divisor(n, 2);

const find_divisor = (n, test_divisor) =>
  square(test_divisor) > n
    ? n
    : divides(test_divisor, n)
    ? test_divisor
    : find_divisor(n, test_divisor + 1);

const divides = (a, b) =>
  b % a === 0;

const is_prime = (n) =>
  n === smallest_divisor(n);
`;

/** The list version of `enumerate_interval` from §2.2.3. */
export const enumerateIntervalDefinition = `const enumerate_interval = (low, high) =>
  low > high
    ? null
    : pair(low, enumerate_interval(low + 1, high));
`;

export const sumPrimesProgram = `${streamPrimalityDefinitions}
${enumerateIntervalDefinition}
// The iterative style: only the sum so far is kept.
const sum_primes_iterative = (a, b) => {
  const iter = (count, accum) =>
    count > b
      ? accum
      : is_prime(count)
      ? iter(count + 1, count + accum)
      : iter(count + 1, accum);
  return iter(a, 0);
};

// The sequence style: a list of the whole interval, then a list of its primes.
const sum_primes_with_lists = (a, b) =>
  accumulate((x, y) => x + y,
                    0,
                    filter(is_prime, enumerate_interval(a, b)));

display(sum_primes_iterative(10, 100));
sum_primes_with_lists(10, 100);
`;

export const secondPrimeListProgram = `${streamPrimalityDefinitions}
${enumerateIntervalDefinition}
let tested = 0;
const is_prime_counted = (n) => {
  tested = tested + 1;
  return is_prime(n);
};

display(head(tail(filter(is_prime_counted,
                         enumerate_interval(10000, 11000)))));
tested;
`;

export const streamEnumerateIntervalDefinition = `const stream_enumerate_interval = (low, high) =>
  low > high
    ? null
    : pair(low,
           () => stream_enumerate_interval(low + 1, high));
`;

export const streamFilterDefinition = `const stream_filter = (pred, stream) =>
  is_null(stream)
    ? null
    : pred(head(stream))
    ? pair(head(stream),
           () => stream_filter(pred, stream_tail(stream)))
    : stream_filter(pred, stream_tail(stream));
`;

/** The book's stream operations; they shadow the library's, which are the same. */
export const streamOperationsDefinitions = `const stream_tail = (stream) =>
  tail(stream)();

const stream_ref = (s, n) =>
  n === 0
    ? head(s)
    : stream_ref(stream_tail(s), n - 1);

const stream_map = (f, s) =>
  is_null(s)
    ? null
    : pair(f(head(s)),
           () => stream_map(f, stream_tail(s)));

const stream_for_each = (fun, s) => {
  if (is_null(s)) {
    return true;
  } else {
    fun(head(s));
    return stream_for_each(fun, stream_tail(s));
  }
};

const display_stream = (s) =>
  stream_for_each(display, s);
`;

export const streamOperationsProgram = `${streamOperationsDefinitions}
${streamEnumerateIntervalDefinition}
const squares = stream_map(x => x * x, stream_enumerate_interval(1, 6));

display_stream(squares);
stream_ref(squares, 4);
`;

/**
 * The "outrageous" second prime, with streams. `display` returns its argument,
 * so `pair(display(low), ...)` prints each element of the interval as it is made.
 */
export const delayedPrimeProgram = `${streamPrimalityDefinitions}
${streamFilterDefinition}
const stream_enumerate_interval = (low, high) =>
  low > high
    ? null
    : pair(display(low),
           () => stream_enumerate_interval(low + 1, high));

head(stream_tail(stream_filter(
                     is_prime,
                     stream_enumerate_interval(10000, 1000000))));
`;

export const streamMemoDefinition = `const memo = (fun) => {
  let already_run = false;
  let result = undefined;
  return () => {
    if (!already_run) {
      result = fun();
      already_run = true;
      return result;
    } else {
      return result;
    }
  };
};
`;

export const streamMapOptimizedDefinition = `const stream_map_optimized = (f, s) =>
  is_null(s)
    ? null
    : pair(f(head(s)),
           memo(() => stream_map_optimized(f, stream_tail(s))));
`;

export const memoizedStreamProgram = `${streamMemoDefinition}
${streamMapOptimizedDefinition}
${streamEnumerateIntervalDefinition}
const show_square = (x) =>
  display(x * x);

display("stream_map");
const plain = stream_map(show_square, stream_enumerate_interval(1, 10));
stream_ref(plain, 4);
stream_ref(plain, 4);

display("stream_map_optimized");
const memoized = stream_map_optimized(show_square, stream_enumerate_interval(1, 10));
stream_ref(memoized, 4);
stream_ref(memoized, 4);
`;

export const integersStartingFromDefinition = `const integers_starting_from = (n) =>
  pair(n, () => integers_starting_from(n + 1));
`;

export const isDivisibleDefinition = `const is_divisible = (x, y) =>
  x % y === 0;
`;

export const noSevensProgram = `${integersStartingFromDefinition}
const integers = integers_starting_from(1);

${isDivisibleDefinition}
const no_sevens = stream_filter(x => ! is_divisible(x, 7),
                                integers);

stream_ref(no_sevens, 100);
`;

export const fibgenProgram = `const fibgen = (a, b) =>
  pair(a, () => fibgen(b, a + b));

const fibs = fibgen(0, 1);

display_list(eval_stream(fibs, 15));
stream_ref(fibs, 50);
`;

export const sieveDefinitions = `${integersStartingFromDefinition}
${isDivisibleDefinition}
const sieve = (stream) =>
  pair(head(stream),
              () => sieve(stream_filter(
                              x => ! is_divisible(x, head(stream)),
                              stream_tail(stream))));

const primes = sieve(integers_starting_from(2));
`;

export const sieveProgram = `${sieveDefinitions}
stream_ref(primes, 50);
`;

/** Exercise 3.50's `stream_map_2`, which `add_streams` is built on. */
export const streamMap2Definition = `const stream_map_2 = (f, s1, s2) =>
  is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)),
           () => stream_map_2(f, stream_tail(s1), stream_tail(s2)));
`;

export const addStreamsDefinition = `const add_streams = (s1, s2) =>
  stream_map_2((x1, x2) => x1 + x2, s1, s2);
`;

export const scaleStreamDefinition = `const scale_stream = (stream, factor) =>
  stream_map(x => x * factor,
                    stream);
`;

export const implicitIntegersProgram = `${streamMap2Definition}
${addStreamsDefinition}
const ones = pair(1, () => ones);

const integers = pair(1, () => add_streams(ones, integers));

display_list(eval_stream(integers, 10));
stream_ref(integers, 30);
`;

/** Implicit Fibonacci numbers, printing every addition as it is made. */
export const implicitFibsProgram = `${streamMap2Definition}
// Each addition prints its sum (display returns its argument).
const add_streams = (s1, s2) =>
  stream_map_2((x1, x2) => display(x1 + x2), s1, s2);

const fibs = pair(0,
                  () => pair(1,
                             () => add_streams(stream_tail(fibs),
                                               fibs)));

stream_ref(fibs, 8);
`;

export const doubleStreamProgram = `${scaleStreamDefinition}
const double = pair(1, () => scale_stream(double, 2));

display_list(eval_stream(double, 11));
stream_ref(double, 50);
`;

export const primesFromPrimesProgram = `${integersStartingFromDefinition}
${isDivisibleDefinition}
const square = (x) =>
  x * x;

const is_prime = (n) => {
  const iter = (ps) =>
    square(head(ps)) > n
      ? true
      : is_divisible(n, head(ps))
      ? false
      : iter(stream_tail(ps));
  return iter(primes);
};

const primes = pair(2,
                    () => stream_filter(is_prime,
                                        integers_starting_from(3)));

stream_ref(primes, 50);
`;

/** Merging two ordered streams without repetitions, for Hamming's problem (exercise 3.56). */
export const mergeStreamsDefinition = `const merge = (s1, s2) => {
  if (is_null(s1)) {
    return s2;
  } else if (is_null(s2)) {
    return s1;
  } else {
    const s1head = head(s1);
    const s2head = head(s2);
    return s1head < s2head
      ? pair(s1head, () => merge(stream_tail(s1), s2))
      : s1head > s2head
      ? pair(s2head, () => merge(s1, stream_tail(s2)))
      : pair(s1head, () => merge(stream_tail(s1), stream_tail(s2)));
  }
};
`;
