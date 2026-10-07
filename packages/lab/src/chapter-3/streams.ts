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
export const streamPrimalityDefinitions = `function square(x) {
  return x * x;
}

function smallest_divisor(n) {
  return find_divisor(n, 2);
}

function find_divisor(n, test_divisor) {
  return square(test_divisor) > n
    ? n
    : divides(test_divisor, n)
    ? test_divisor
    : find_divisor(n, test_divisor + 1);
}

function divides(a, b) {
  return b % a === 0;
}

function is_prime(n) {
  return n === smallest_divisor(n);
}
`;

/** The list version of `enumerate_interval` from §2.2.3. */
export const enumerateIntervalDefinition = `function enumerate_interval(low, high) {
  return low > high
    ? null
    : pair(low, enumerate_interval(low + 1, high));
}
`;

export const sumPrimesProgram = `${streamPrimalityDefinitions}
${enumerateIntervalDefinition}
// The iterative style: only the sum so far is kept.
function sum_primes_iterative(a, b) {
  function iter(count, accum) {
    return count > b
      ? accum
      : is_prime(count)
      ? iter(count + 1, count + accum)
      : iter(count + 1, accum);
  }
  return iter(a, 0);
}

// The sequence style: a list of the whole interval, then a list of its primes.
function sum_primes_with_lists(a, b) {
  return accumulate((x, y) => x + y,
                    0,
                    filter(is_prime, enumerate_interval(a, b)));
}

display(sum_primes_iterative(10, 100));
sum_primes_with_lists(10, 100);
`;

export const secondPrimeListProgram = `${streamPrimalityDefinitions}
${enumerateIntervalDefinition}
let tested = 0;
function is_prime_counted(n) {
  tested = tested + 1;
  return is_prime(n);
}

display(head(tail(filter(is_prime_counted,
                         enumerate_interval(10000, 11000)))));
tested;
`;

export const streamEnumerateIntervalDefinition = `function stream_enumerate_interval(low, high) {
  return low > high
    ? null
    : pair(low,
           () => stream_enumerate_interval(low + 1, high));
}
`;

export const streamFilterDefinition = `function stream_filter(pred, stream) {
  return is_null(stream)
    ? null
    : pred(head(stream))
    ? pair(head(stream),
           () => stream_filter(pred, stream_tail(stream)))
    : stream_filter(pred, stream_tail(stream));
}
`;

/** The book's stream operations; they shadow the library's, which are the same. */
export const streamOperationsDefinitions = `function stream_tail(stream) {
  return tail(stream)();
}

function stream_ref(s, n) {
  return n === 0
    ? head(s)
    : stream_ref(stream_tail(s), n - 1);
}

function stream_map(f, s) {
  return is_null(s)
    ? null
    : pair(f(head(s)),
           () => stream_map(f, stream_tail(s)));
}

function stream_for_each(fun, s) {
  if (is_null(s)) {
    return true;
  } else {
    fun(head(s));
    return stream_for_each(fun, stream_tail(s));
  }
}

function display_stream(s) {
  return stream_for_each(display, s);
}
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
function stream_enumerate_interval(low, high) {
  return low > high
    ? null
    : pair(display(low),
           () => stream_enumerate_interval(low + 1, high));
}

head(stream_tail(stream_filter(
                     is_prime,
                     stream_enumerate_interval(10000, 1000000))));
`;

export const streamMemoDefinition = `function memo(fun) {
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
}
`;

export const streamMapOptimizedDefinition = `function stream_map_optimized(f, s) {
  return is_null(s)
    ? null
    : pair(f(head(s)),
           memo(() => stream_map_optimized(f, stream_tail(s))));
}
`;

export const memoizedStreamProgram = `${streamMemoDefinition}
${streamMapOptimizedDefinition}
${streamEnumerateIntervalDefinition}
function show_square(x) {
  return display(x * x);
}

display("stream_map");
const plain = stream_map(show_square, stream_enumerate_interval(1, 10));
stream_ref(plain, 4);
stream_ref(plain, 4);

display("stream_map_optimized");
const memoized = stream_map_optimized(show_square, stream_enumerate_interval(1, 10));
stream_ref(memoized, 4);
stream_ref(memoized, 4);
`;

export const integersStartingFromDefinition = `function integers_starting_from(n) {
  return pair(n, () => integers_starting_from(n + 1));
}
`;

export const isDivisibleDefinition = `function is_divisible(x, y) {
  return x % y === 0;
}
`;

export const noSevensProgram = `${integersStartingFromDefinition}
const integers = integers_starting_from(1);

${isDivisibleDefinition}
const no_sevens = stream_filter(x => ! is_divisible(x, 7),
                                integers);

stream_ref(no_sevens, 100);
`;

export const fibgenProgram = `function fibgen(a, b) {
  return pair(a, () => fibgen(b, a + b));
}

const fibs = fibgen(0, 1);

display_list(eval_stream(fibs, 15));
stream_ref(fibs, 50);
`;

export const sieveDefinitions = `${integersStartingFromDefinition}
${isDivisibleDefinition}
function sieve(stream) {
  return pair(head(stream),
              () => sieve(stream_filter(
                              x => ! is_divisible(x, head(stream)),
                              stream_tail(stream))));
}

const primes = sieve(integers_starting_from(2));
`;

export const sieveProgram = `${sieveDefinitions}
stream_ref(primes, 50);
`;

/** Exercise 3.50's `stream_map_2`, which `add_streams` is built on. */
export const streamMap2Definition = `function stream_map_2(f, s1, s2) {
  return is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)),
           () => stream_map_2(f, stream_tail(s1), stream_tail(s2)));
}
`;

export const addStreamsDefinition = `function add_streams(s1, s2) {
  return stream_map_2((x1, x2) => x1 + x2, s1, s2);
}
`;

export const scaleStreamDefinition = `function scale_stream(stream, factor) {
  return stream_map(x => x * factor,
                    stream);
}
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
function add_streams(s1, s2) {
  return stream_map_2((x1, x2) => display(x1 + x2), s1, s2);
}

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
function square(x) {
  return x * x;
}

function is_prime(n) {
  function iter(ps) {
    return square(head(ps)) > n
      ? true
      : is_divisible(n, head(ps))
      ? false
      : iter(stream_tail(ps));
  }
  return iter(primes);
}

const primes = pair(2,
                    () => stream_filter(is_prime,
                                        integers_starting_from(3)));

stream_ref(primes, 50);
`;

/** Merging two ordered streams without repetitions, for Hamming's problem (exercise 3.56). */
export const mergeStreamsDefinition = `function merge(s1, s2) {
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
}
`;
