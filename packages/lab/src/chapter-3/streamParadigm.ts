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
export const paradigmMemoDefinition = `function memo(fun) {
  let already_run = false;
  let result = undefined;
  return () => {
    if (!already_run) {
      result = fun();
      already_run = true;
    }
    return result;
  };
}
`;

/** `stream_map_2` of exercise 3.50 with memoized tails, and the two operations built on it and on `stream_map`. */
export const paradigmStreamOperations = `${paradigmMemoDefinition}
function stream_map_2(f, s1, s2) {
  return is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)),
           memo(() => stream_map_2(f, stream_tail(s1), stream_tail(s2))));
}

function add_streams(s1, s2) {
  return stream_map_2((x1, x2) => x1 + x2, s1, s2);
}

function scale_stream(stream, factor) {
  return stream_map(x => x * factor, stream);
}
`;

/** A memoized `stream_map`, declared in the program so that it shadows the library's. */
export const paradigmMemoStreamMap = `// stream_map with memoized tails; it replaces the library's.
function stream_map(f, s) {
  return is_null(s)
    ? null
    : pair(f(head(s)), memo(() => stream_map(f, stream_tail(s))));
}
`;

/** Our streams are infinite, so `display_stream` takes how many elements to show. */
export const paradigmDisplayStream = `function display_stream(s, n) {
  if (n > 0) {
    display(head(s));
    return display_stream(stream_tail(s), n - 1);
  } else {
    return true;
  }
}
`;

/** Plots of long streams display every k-th element, n of them in all. */
export const paradigmDisplayEvery = `function stream_drop(s, k) {
  return k === 0 ? s : stream_drop(stream_tail(s), k - 1);
}

function display_every(k, s, n) {
  display(head(s));
  return n === 1 ? true : display_every(k, stream_drop(s, k), n - 1);
}
`;

const sqrtImprove = `function average(x, y) {
  return (x + y) / 2;
}

function sqrt_improve(guess, x) {
  return average(guess, x / guess);
}
`;

// ---------------------------------------------------------------- §3.5.3

/** Square roots as a stream of guesses. */
export const paradigmSqrtStreamProgram = `${sqrtImprove}
function sqrt_stream(x) {
  return pair(1, () => stream_map(guess => sqrt_improve(guess, x),
                                  sqrt_stream(x)));
}

${paradigmDisplayStream}
display_stream(sqrt_stream(2), 6);
`;

/** Summands of π/4, their partial sums, and the transformations that accelerate them. */
export const paradigmPiDefinitions = `${paradigmStreamOperations}
function square(x) {
  return x * x;
}

function partial_sums(s) {
  const sums = pair(head(s), memo(() => add_streams(stream_tail(s), sums)));
  return sums;
}

function pi_summands(n) {
  return pair(1 / n, () => stream_map(x => -x, pi_summands(n + 2)));
}

const pi_stream = scale_stream(partial_sums(pi_summands(1)), 4);

function euler_transform(s) {
  const s0 = stream_ref(s, 0); // S(n-1)
  const s1 = stream_ref(s, 1); // S(n)
  const s2 = stream_ref(s, 2); // S(n+1)
  return pair(s2 - square(s2 - s1) / (s0 + (-2) * s1 + s2),
              memo(() => euler_transform(stream_tail(s))));
}

function make_tableau(transform, s) {
  return pair(s, () => make_tableau(transform, transform(s)));
}

function accelerated_sequence(transform, s) {
  return stream_map(head, make_tableau(transform, s));
}
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

function interleave(s1, s2) {
  return is_null(s1)
    ? s2
    : pair(head(s1), () => interleave(s2, stream_tail(s1)));
}

function pairs(s, t) {
  return pair(list(head(s), head(t)),
              () => interleave(stream_map(x => list(head(s), x),
                                          stream_tail(t)),
                               pairs(stream_tail(s), stream_tail(t))));
}
`;

const displayListStream = `function display_pairs(s, n) {
  if (n > 0) {
    display_list(head(s));
    return display_pairs(stream_tail(s), n - 1);
  } else {
    return true;
  }
}
`;

/** The first 31 pairs: just enough to fill the triangle of pairs up to (5, 5). */
export const paradigmPairsProgram = `${paradigmPairsDefinitions}
${displayListStream}
display_pairs(pairs(integers, integers), 31);
`;

/** Pairs whose sum is prime: the nested loop of §2.2.3 over an infinite set. */
export const paradigmPrimeSumPairsProgram = `${paradigmPairsDefinitions}
function is_prime(n) {
  function divides_from(d) {
    return d * d > n ? false : n % d === 0 || divides_from(d + 1);
  }
  return n > 1 && !divides_from(2);
}

const int_pairs = pairs(integers, integers);

const prime_sum_pairs =
  stream_filter(p => is_prime(head(p) + head(tail(p))), int_pairs);

eval_stream(prime_sum_pairs, 8);
`;

/** The pairs with `stream_append` instead of `interleave`: row 1 never ends. */
export const paradigmAppendPairsProgram = `const integers = integers_from(1);

function pairs(s, t) {
  return pair(list(head(s), head(t)),
              () => stream_append(stream_map(x => list(head(s), x),
                                             stream_tail(t)),
                                  pairs(stream_tail(s), stream_tail(t))));
}

${displayListStream}
display_pairs(pairs(integers, integers), 31);
`;

/** `integral` of §3.5.3: an integrand stream in, the running sum out. */
export const paradigmIntegralDefinition = `function integral(integrand, initial_value, dt) {
  const integ = pair(initial_value,
                     memo(() => add_streams(scale_stream(integrand, dt),
                                            integ)));
  return integ;
}
`;

export const paradigmIntegralProgram = `${paradigmStreamOperations}
${paradigmIntegralDefinition}
function numbers_starting_from(t, dt) {
  return pair(t, () => numbers_starting_from(t + dt, dt));
}

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
function solve(f, y0, dt) {
  const y = integral(dy, y0, dt);
  const dy = stream_map(f, y);
  return y;
}

stream_ref(solve(y => y, 1, 0.001), 1000);
`;

/** `integral` with a delayed integrand, memoized as SICP's footnote asks. */
export const paradigmDelayedIntegralDefinition = `function integral(delayed_integrand, initial_value, dt) {
  const integ =
    pair(initial_value,
         memo(() => {
           const integrand = delayed_integrand();
           return add_streams(scale_stream(integrand, dt), integ);
         }));
  return integ;
}
`;

export const paradigmSolveDefinitions = `${paradigmStreamOperations}
${paradigmDelayedIntegralDefinition}
function solve(f, y0, dt) {
  const y = integral(() => dy, y0, dt);
  const dy = stream_map(f, y);
  return y;
}
`;

/** dy/dt = y with y(0) = 1, solved up to t = 1: e, to within the error of 1000 steps. */
export const paradigmSolveProgram = `${paradigmSolveDefinitions}
const y = solve(y => y, 1, 0.001);

// y every 0.1 from t = 0 to t = 1, and e^t at the same times.
${paradigmDisplayEvery}
function plot_exp(t, n) {
  display(math_exp(t));
  return n === 1 ? true : plot_exp(t + 0.1, n - 1);
}
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
function rand_update(x) {
  return (48271 * x) % 2147483647;
}
`;

export const paradigmRandomStreamDefinitions = `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
${paradigmRandDefinitions}
const random_numbers =
  pair(random_init, memo(() => stream_map(rand_update, random_numbers)));

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function map_successive_pairs(f, s) {
  return pair(f(head(s), head(stream_tail(s))),
              memo(() => map_successive_pairs(f, stream_tail(stream_tail(s)))));
}

const dirichlet_stream =
  map_successive_pairs((r1, r2) => gcd(r1, r2) === 1, random_numbers);
`;

export const paradigmRandomStreamProgram = `${paradigmRandomStreamDefinitions}
display_list(eval_stream(random_numbers, 5));
eval_stream(dirichlet_stream, 20);
`;

export const paradigmMonteCarloDefinitions = `${paradigmRandomStreamDefinitions}
function monte_carlo(experiment_stream, passed, failed) {
  function next(passed, failed) {
    return pair(passed / (passed + failed),
                memo(() => monte_carlo(stream_tail(experiment_stream),
                                       passed, failed)));
  }
  return head(experiment_stream)
    ? next(passed + 1, failed)
    : next(passed, failed + 1);
}

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
export const paradigmWithdrawProgram = `function make_simplified_withdraw(balance) {
  return amount => {
    balance = balance - amount;
    return balance;
  };
}

function stream_withdraw(balance, amount_stream) {
  return pair(balance,
              () => is_null(amount_stream)
                    ? null
                    : stream_withdraw(balance - head(amount_stream),
                                      stream_tail(amount_stream)));
}

const w = make_simplified_withdraw(200);
display(w(50));
display(w(100));
display(w(40));

const my_amounts = list_to_stream(list(50, 100, 40));
const my_account_stream = stream_withdraw(200, my_amounts);
stream_to_list(my_account_stream);
`;

/** Peter and Paul's requests merged by strict alternation: Peter waits for Paul. */
export const paradigmJointAccountProgram = `function stream_withdraw(balance, amount_stream) {
  return pair(balance,
              () => is_null(amount_stream)
                    ? null
                    : stream_withdraw(balance - head(amount_stream),
                                      stream_tail(amount_stream)));
}

// Alternate strictly: one request from each, in turn.
function alternate(s1, s2) {
  return is_null(s1)
    ? null
    : pair(head(s1), () => alternate(s2, stream_tail(s1)));
}

const peter = list_to_stream(list(10, 20, 30, 40));
const paul = list_to_stream(list(100));

stream_to_list(stream_withdraw(500, alternate(peter, paul)));
`;
