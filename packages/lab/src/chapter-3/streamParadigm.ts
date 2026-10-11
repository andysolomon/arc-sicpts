/**
 * Programs of §3.5.3–§3.5.5, shared by the Book's examples and the
 * Laboratory's tests (`streamParadigm.test.ts`).
 *
 * The library's streams recompute a tail every time it is asked for. The
 * programs here lean on streams that refer to themselves, so they bring their
 * own memoized helpers (§3.5.1): `memo`, a memoized `stream_map_2` with
 * `add_streams` on top, and, where a stream is built from itself through
 * `stream_map`, a memoized `stream_map` that shadows the library's.
 */

/** `memo` of §3.5.1: a function of no arguments that runs `fun` once and then remembers. */
export const paradigmMemoDefinition = `const memo = <T>(fun: () => T): (() => T) => {
  let already_run = false;
  let result: T | undefined = undefined;
  return () => {
    if (!already_run) {
      result = fun();
      already_run = true;
    }
    return result;
  };
};
`;

/** `stream_map_2` of exercise 3.50 with memoized tails, and the two operations built on it and on `stream_map`. */
export const paradigmStreamOperations = `${paradigmMemoDefinition}
const stream_map_2 = <A, B, C>(f: (x: A, y: B) => C, s1: Stream<A>, s2: Stream<B>): Stream<C> =>
  is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)),
           memo(() => stream_map_2(f, stream_tail(s1), stream_tail(s2))));

const add_streams = (s1: Stream<number>, s2: Stream<number>): Stream<number> =>
  stream_map_2((x1, x2) => x1 + x2, s1, s2);

const scale_stream = (stream: Stream<number>, factor: number): Stream<number> =>
  stream_map(x => x * factor, stream);
`;

/** A memoized `stream_map`, declared in the program so that it shadows the library's. */
export const paradigmMemoStreamMap = `// stream_map with memoized tails; it replaces the library's.
const stream_map = <A, B>(f: (x: A) => B, s: Stream<A>): Stream<B> =>
  is_null(s)
    ? null
    : pair(f(head(s)), memo(() => stream_map(f, stream_tail(s))));
`;

/** Our streams are infinite, so `display_stream` takes how many elements to show. */
export const paradigmDisplayStream = `const display_stream = <T>(s: Stream<T>, n: number): true => {
  if (n > 0) {
    display(head(s));
    return display_stream(stream_tail(s), n - 1);
  } else {
    return true;
  }
};
`;

/** Plots of long streams display every k-th element, n of them in all. */
export const paradigmDisplayEvery = `const stream_drop = <T>(s: Stream<T>, k: number): Stream<T> =>
  k === 0 ? s : stream_drop(stream_tail(s), k - 1);

const display_every = <T>(k: number, s: Stream<T>, n: number): true => {
  display(head(s));
  return n === 1 ? true : display_every(k, stream_drop(s, k), n - 1);
};
`;

const sqrtImprove = `const average = (x: number, y: number): number =>
  (x + y) / 2;

const sqrt_improve = (guess: number, x: number): number =>
  average(guess, x / guess);
`;

// ---------------------------------------------------------------- §3.5.3

/** Square roots as a stream of guesses. */
export const paradigmSqrtStreamProgram = `${sqrtImprove}
const sqrt_stream = (x: number): Stream<number> =>
  pair(1, () => stream_map(guess => sqrt_improve(guess, x),
                                  sqrt_stream(x)));

${paradigmDisplayStream}
display_stream(sqrt_stream(2), 6);
`;

/** Summands of π/4, their partial sums, and the transformations that accelerate them. */
export const paradigmPiDefinitions = `${paradigmStreamOperations}
const square = (x: number): number =>
  x * x;

const partial_sums = (s: Stream<number>): Stream<number> => {
  const sums = pair(head(s), memo(() => add_streams(stream_tail(s), sums)));
  return sums;
};

const pi_summands = (n: number): Stream<number> =>
  pair(1 / n, () => stream_map(x => -x, pi_summands(n + 2)));

const pi_stream = scale_stream(partial_sums(pi_summands(1)), 4);

const euler_transform = (s: Stream<number>): Stream<number> => {
  const s0 = stream_ref(s, 0); // S(n-1)
  const s1 = stream_ref(s, 1); // S(n)
  const s2 = stream_ref(s, 2); // S(n+1)
  return pair(s2 - square(s2 - s1) / (s0 + (-2) * s1 + s2),
              memo(() => euler_transform(stream_tail(s))));
};

const make_tableau = <T>(transform: (s: Stream<T>) => Stream<T>, s: Stream<T>): Stream<Stream<T>> =>
  pair(s, () => make_tableau(transform, transform(s)));

const accelerated_sequence = <T>(transform: (s: Stream<T>) => Stream<T>, s: Stream<T>): Stream<T> =>
  stream_map(head, make_tableau(transform, s));
`;

/** The three sequences of approximations to π, each labelled so that the plot draws three series. */
export const paradigmPiStreamProgram = `${paradigmPiDefinitions}
${paradigmDisplayStream}
display("pi_stream");
display_stream(pi_stream, 8);
display("euler");
display_stream(euler_transform(pi_stream), 8);
display("accelerated");
display_stream(accelerated_sequence(euler_transform, pi_stream), 8);
`;

/** `interleave` and `pairs`, the order in which pairs of integers come out. */
export const paradigmPairsDefinitions = `const integers = integers_from(1);

const interleave = <T>(s1: Stream<T>, s2: Stream<T>): Stream<T> =>
  is_null(s1)
    ? s2
    : pair(head(s1), () => interleave(s2, stream_tail(s1)));

const pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> =>
  pair(list(head(s), head(t)),
              () => interleave(stream_map(x => list(head(s), x),
                                          stream_tail(t)),
                               pairs(stream_tail(s), stream_tail(t))));
`;

const displayListStream = `const display_pairs = <T>(s: Stream<List<T>>, n: number): true => {
  if (n > 0) {
    display_list(head(s));
    return display_pairs(stream_tail(s), n - 1);
  } else {
    return true;
  }
};
`;

/** The first 31 pairs: just enough to fill the triangle of pairs up to (5, 5). */
export const paradigmPairsProgram = `${paradigmPairsDefinitions}
${displayListStream}
display_pairs(pairs(integers, integers), 31);
`;

/** Pairs whose sum is prime: the nested loop of §2.2.3 over an infinite set. */
export const paradigmPrimeSumPairsProgram = `${paradigmPairsDefinitions}
const is_prime = (n: number): boolean => {
  const divides_from = (d: number): boolean =>
    d * d > n ? false : n % d === 0 || divides_from(d + 1);
  return n > 1 && !divides_from(2);
};

const int_pairs = pairs(integers, integers);

const prime_sum_pairs =
  stream_filter(p => is_prime(head(p) + head(tail(p))), int_pairs);

eval_stream(prime_sum_pairs, 8);
`;

/** The pairs with `stream_append` instead of `interleave`: row 1 never ends. */
export const paradigmAppendPairsProgram = `const integers = integers_from(1);

const pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> =>
  pair(list(head(s), head(t)),
              () => stream_append(stream_map(x => list(head(s), x),
                                             stream_tail(t)),
                                  pairs(stream_tail(s), stream_tail(t))));

${displayListStream}
display_pairs(pairs(integers, integers), 31);
`;

/** `integral` of §3.5.3: an integrand stream in, the running sum out. */
export const paradigmIntegralDefinition = `const integral = (integrand: Stream<number>, initial_value: number, dt: number): Stream<number> => {
  const integ = pair(initial_value,
                     memo(() => add_streams(scale_stream(integrand, dt),
                                            integ)));
  return integ;
};
`;

export const paradigmIntegralProgram = `${paradigmStreamOperations}
${paradigmIntegralDefinition}
const numbers_starting_from = (t: number, dt: number): Stream<number> =>
  pair(t, () => numbers_starting_from(t + dt, dt));

const dt = 0.01;
const linear = numbers_starting_from(0, dt);
const linear_integral = integral(linear, 0, dt);

// Every 25th element, beside the exact integral t² / 2.
${paradigmDisplayEvery}
display("integral");
display_every(25, linear_integral, 13);
display("t² / 2");
display_every(25, stream_map(t => t * t / 2, linear), 13);

// The integral of t from 0 to 3 is 4.5.
stream_ref(linear_integral, math_round(3 / dt));
`;

// ---------------------------------------------------------------- §3.5.4

/** `solve` with the first `integral`: it asks for `dy` before `dy` exists. */
export const paradigmSolveUndelayedProgram = `${paradigmStreamOperations}
${paradigmIntegralDefinition}
const solve = (f: (y: number) => number, y0: number, dt: number): Stream<number> => {
  const y = integral(dy, y0, dt);
  const dy = stream_map(f, y);
  return y;
};

stream_ref(solve(y => y, 1, 0.001), 1000);
`;

/** `integral` with a delayed integrand, memoized as SICP's footnote asks. */
export const paradigmDelayedIntegralDefinition = `const integral = (delayed_integrand: () => Stream<number>, initial_value: number, dt: number): Stream<number> => {
  const integ =
    pair(initial_value,
         memo(() => {
           const integrand = delayed_integrand();
           return add_streams(scale_stream(integrand, dt), integ);
         }));
  return integ;
};
`;

export const paradigmSolveDefinitions = `${paradigmStreamOperations}
${paradigmDelayedIntegralDefinition}
const solve = (f: (y: number) => number, y0: number, dt: number): Stream<number> => {
  const y = integral(() => dy, y0, dt);
  const dy = stream_map(f, y);
  return y;
};
`;

/** dy/dt = y with y(0) = 1, solved up to t = 1: e, to within the error of 1000 steps. */
export const paradigmSolveProgram = `${paradigmSolveDefinitions}
const y = solve(y => y, 1, 0.001);

// y every 0.1 from t = 0 to t = 1, and e^t at the same times.
${paradigmDisplayEvery}
const plot_exp = (t: number, n: number): true => {
  display(math_exp(t));
  return n === 1 ? true : plot_exp(t + 0.1, n - 1);
};
display("solve");
display_every(100, y, 11);
display("e^t");
plot_exp(0, 11);

stream_ref(y, 1000);
`;

// ---------------------------------------------------------------- §3.5.5

/** A linear congruential generator, so that every run sees the same "random" numbers. */
export const paradigmRandDefinitions = `const random_init = 20220301;

// x(n+1) = 48271 x(n) mod (2^31 - 1), the "minimal standard" generator.
const rand_update = (x: number): number =>
  (48271 * x) % 2147483647;
`;

export const paradigmRandomStreamDefinitions = `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
${paradigmRandDefinitions}
const random_numbers =
  pair(random_init, memo(() => stream_map(rand_update, random_numbers)));

const gcd = (a: number, b: number): number =>
  b === 0 ? a : gcd(b, a % b);

const map_successive_pairs = <T, R>(f: (a: T, b: T) => R, s: Stream<T>): Stream<R> =>
  pair(f(head(s), head(stream_tail(s))),
              memo(() => map_successive_pairs(f, stream_tail(stream_tail(s)))));

const dirichlet_stream =
  map_successive_pairs((r1, r2) => gcd(r1, r2) === 1, random_numbers);
`;

export const paradigmRandomStreamProgram = `${paradigmRandomStreamDefinitions}
display_list(eval_stream(random_numbers, 5));
eval_stream(dirichlet_stream, 20);
`;

export const paradigmMonteCarloDefinitions = `${paradigmRandomStreamDefinitions}
const monte_carlo = (experiment_stream: Stream<boolean>, passed: number, failed: number): Stream<number> => {
  const next = (passed: number, failed: number): Stream<number> =>
    pair(passed / (passed + failed),
                memo(() => monte_carlo(stream_tail(experiment_stream),
                                       passed, failed)));
  return head(experiment_stream)
    ? next(passed + 1, failed)
    : next(passed, failed + 1);
};

const pi = stream_map(p => math_sqrt(6 / p),
                      monte_carlo(dirichlet_stream, 0, 0));
`;

/** Every fifth estimate of π up to 500 experiments, then the 500th. */
export const paradigmMonteCarloProgram = `${paradigmMonteCarloDefinitions}
${paradigmDisplayEvery}
display("estimate of π");
display_every(5, stream_tail(pi), 100);
stream_ref(pi, 500);
`;

/** The withdrawal processor twice: an object with state, and a function from streams to streams. */
export const paradigmWithdrawProgram = `const make_simplified_withdraw = (balance: number): ((amount: number) => number) =>
  amount => {
    balance = balance - amount;
    return balance;
  };

const stream_withdraw = (balance: number, amount_stream: Stream<number>): Stream<number> =>
  pair(balance,
              () => is_null(amount_stream)
                    ? null
                    : stream_withdraw(balance - head(amount_stream),
                                      stream_tail(amount_stream)));

const w = make_simplified_withdraw(200);
display(w(50));
display(w(100));
display(w(40));

const my_amounts = list_to_stream(list(50, 100, 40));
const my_account_stream = stream_withdraw(200, my_amounts);
stream_to_list(my_account_stream);
`;

/** Peter and Paul's requests merged by strict alternation: Peter waits for Paul. */
export const paradigmJointAccountProgram = `const stream_withdraw = (balance: number, amount_stream: Stream<number>): Stream<number> =>
  pair(balance,
              () => is_null(amount_stream)
                    ? null
                    : stream_withdraw(balance - head(amount_stream),
                                      stream_tail(amount_stream)));

// Alternate strictly: one request from each, in turn.
const alternate = <T>(s1: Stream<T>, s2: Stream<T>): Stream<T> =>
  is_null(s1)
    ? null
    : pair(head(s1), () => alternate(s2, stream_tail(s1)));

const peter = list_to_stream(list(10, 20, 30, 40));
const paul = list_to_stream(list(100));

stream_to_list(stream_withdraw(500, alternate(peter, paul)));
`;
