import {
  paradigmDelayedIntegralDefinition,
  paradigmIntegralDefinition,
  paradigmMemoDefinition,
  paradigmMemoStreamMap,
  paradigmPairsDefinitions,
  paradigmRandDefinitions,
  paradigmStreamOperations,
} from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §3.5.3–§3.5.5. Each export is an ExerciseSpec (see ./spec.ts). */

/** Memoized streams: `memo`, `stream_map_2`, `add_streams`, `scale_stream`, and a memoized `stream_map`. */
const streams = `${paradigmStreamOperations}
${paradigmMemoStreamMap}`;

const sqrtImprove = `const average = (x: number, y: number): number => (x + y) / 2;

let improvement_count = 0;

const sqrt_improve = (guess: number, x: number): number => {
  improvement_count = improvement_count + 1;
  return average(guess, x / guess);
};

/** How many times sqrt_improve is applied while thunk runs. */
const improvements = (thunk: () => unknown): number => {
  const before = improvement_count;
  thunk();
  return improvement_count - before;
};
`;

const sqrtStream = `const sqrt_stream = (x: number): Stream<number> =>
  pair(1, () => stream_map(guess => sqrt_improve(guess, x),
                           sqrt_stream(x)));
`;

const piDefinitions = `${streams}
const square = (x: number): number => x * x;

const partial_sums = (s: Stream<number>): Stream<number> => {
  const sums = pair(head(s), memo(() => add_streams(stream_tail(s), sums)));
  return sums;
};

const euler_transform = (s: Stream<number>): Stream<number> => {
  const s0 = stream_ref(s, 0);
  const s1 = stream_ref(s, 1);
  const s2 = stream_ref(s, 2);
  return pair(s2 - square(s2 - s1) / (s0 + (-2) * s1 + s2),
              memo(() => euler_transform(stream_tail(s))));
};

const make_tableau = <T>(transform: (s: Stream<T>) => Stream<T>, s: Stream<T>): Stream<Stream<T>> =>
  pair(s, () => make_tableau(transform, transform(s)));

const accelerated_sequence = <T>(transform: (s: Stream<T>) => Stream<T>, s: Stream<T>): Stream<T> =>
  stream_map(head, make_tableau(transform, s));
`;

/** Helpers the hidden tests of the pair exercises use on lists of tuples. */
const tupleChecks = `const is_member = <T>(x: T, xs: List<T>): boolean =>
  !is_null(xs) && (equal(x, head(xs)) || is_member(x, tail(xs)));

const all_distinct = <T>(xs: List<T>): boolean =>
  is_null(xs) || (!is_member(head(xs), tail(xs)) && all_distinct(tail(xs)));

const all_ordered = (xs: List<List<number>>): boolean => {
  const ordered = (t: List<number>): boolean =>
    is_null(tail(t)) || (head(t) <= head(tail(t)) && ordered(tail(t)));
  return accumulate((t, rest) => ordered(t) && rest, true, xs);
};

/** Every pair (i, j) with 1 <= i, j <= n, and i <= j when upper is true, is in xs. */
const has_all_pairs = (xs: List<List<number>>, n: number, upper: boolean): boolean => {
  const row = (i: number, j: number): boolean =>
    j > n || (is_member(list(i, j), xs) && row(i, j + 1));
  const rows = (i: number): boolean =>
    i > n || (row(i, upper ? i : 1) && rows(i + 1));
  return rows(1);
};
`;

const weightedPairs = `const merge_weighted = <T>(s1: Stream<T>, s2: Stream<T>, weight: (x: T) => number): Stream<T> => {
  if (is_null(s1)) {
    return s2;
  } else if (is_null(s2)) {
    return s1;
  } else {
    const h1 = head(s1);
    const h2 = head(s2);
    return weight(h1) <= weight(h2)
      ? pair(h1, memo(() => merge_weighted(stream_tail(s1), s2, weight)))
      : pair(h2, memo(() => merge_weighted(s1, stream_tail(s2), weight)));
  }
};

const weighted_pairs = <T>(s: Stream<T>, t: Stream<T>, weight: (p: List<T>) => number): Stream<List<T>> =>
  pair(list(head(s), head(t)),
       memo(() => merge_weighted(
                    stream_map(x => list(head(s), x), stream_tail(t)),
                    weighted_pairs(stream_tail(s), stream_tail(t), weight),
                    weight)));
`;

const zeroCrossings = `const sign_change_detector = (value: number, last_value: number): number =>
  last_value < 0 && value >= 0
    ? 1
    : last_value >= 0 && value < 0
    ? -1
    : 0;
`;

const noisyData = `const sense_data =
  list_to_stream(list(1, 0.4, -0.2, 0.6, 1.2, 0.9, -0.3, -1, -0.4, -1.2, 0.3, -0.2, 0.8, 1.5));
`;

const alyssaZeroCrossings = `const make_zero_crossings = (input_stream: Stream<number>, last_value: number): Stream<number> =>
  is_null(input_stream)
    ? null
    : pair(sign_change_detector(head(input_stream), last_value),
           () => make_zero_crossings(stream_tail(input_stream),
                                     head(input_stream)));
`;

const randomNumbers = `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
${paradigmRandDefinitions}`;

// ---------------------------------------------------------------- §3.5.3

export const exercise_3_63: ExerciseSpec = {
  id: '3.63',
  prelude: `${sqrtImprove}
${paradigmMemoDefinition}
const stream_map_optimized = <A, B>(f: (x: A) => B, s: Stream<A>): Stream<B> =>
  is_null(s)
    ? null
    : pair(f(head(s)), memo(() => stream_map_optimized(f, stream_tail(s))));
`,
  starter: `// average, sqrt_improve, memo and stream_map_optimized (stream_map
// with memo on every tail) are provided.

// Louis's attempt:
const sqrt_stream_optimized = (x: number): Stream<number> =>
  pair(1,
       memo(() => stream_map_optimized(guess => sqrt_improve(guess, x),
                                       sqrt_stream_optimized(x))));

// Alyssa's proposal: share one stream of guesses.
const sqrt_stream_optimized_2 = (x: number): Stream<number> => {
  // your answer
};

// How many times does stream_ref(sqrt_stream_optimized(2), n) apply sqrt_improve?
const louis_applications = (n: number): number => {
  // your answer
};

// Without memoization (plain () => ... tails and the library's stream_map),
// is Alyssa's version faster than the original sqrt_stream? true or false.
const alyssa_without_memo_is_faster = undefined;
`,
  tests: [
    { name: 'Alyssa’s stream converges to √2', kind: 'value', expr: close('stream_ref(sqrt_stream_optimized_2(2), 6)', Math.SQRT2, 1e-12), expected: true },
    { name: 'Alyssa’s stream improves each guess once', kind: 'calls', call: 'stream_ref(sqrt_stream_optimized_2(2), 10)', fn: 'sqrt_improve', atMost: 10 },
    { name: 'Louis’s cost at n = 10', kind: 'value', expr: 'louis_applications(10)', expected: 55 },
    { name: 'Louis’s cost in general', kind: 'value', expr: 'louis_applications(30) === 465 && louis_applications(17) === improvements(() => stream_ref(sqrt_stream_optimized(2), 17))', expected: true },
    { name: 'without memoization', kind: 'value', expr: 'alyssa_without_memo_is_faster', expected: false },
  ],
  solution: `const sqrt_stream_optimized = (x: number): Stream<number> =>
  pair(1,
       memo(() => stream_map_optimized(guess => sqrt_improve(guess, x),
                                       sqrt_stream_optimized(x))));

const sqrt_stream_optimized_2 = (x: number): Stream<number> => {
  const guesses = pair(1,
                       memo(() => stream_map_optimized(guess => sqrt_improve(guess, x),
                                                       guesses)));
  return guesses;
};

// Each call of sqrt_stream_optimized builds a new stream, so memo never
// gets a second chance: guess k is recomputed from scratch, k improvements.
const louis_applications = (n: number): number => n * (n + 1) / 2;

// Without memo, every tail of guesses is recomputed, and the count is
// n (n + 1) / 2 again: the same as the original.
const alyssa_without_memo_is_faster = false;
`,
};

export const exercise_3_64: ExerciseSpec = {
  id: '3.64',
  prelude: `${sqrtImprove}
${sqrtStream}`,
  starter: `// sqrt_improve and sqrt_stream are provided.

const stream_limit = (s: Stream<number>, tolerance: number): number => {
  // your answer
};

const sqrt = (x: number, tolerance: number): number =>
  stream_limit(sqrt_stream(x), tolerance);
`,
  tests: [
    { name: 'the second of the first close pair', kind: 'value', expr: 'stream_limit(list_to_stream(list(1, 2, 2.5, 2.6, 2.65)), 0.2)', expected: 2.6 },
    { name: 'on an infinite stream', kind: 'value', expr: close('stream_limit(stream_map(n => 1 / n, integers_from(1)), 0.01)', 1 / 11, 1e-15), expected: true },
    { name: '√2 to ten places', kind: 'value', expr: close('sqrt(2, 1e-10)', Math.SQRT2, 1e-12), expected: true },
    { name: '√9 roughly', kind: 'value', expr: close('sqrt(9, 0.5)', 3.023529411764706, 1e-12), expected: true },
  ],
  solution: `const stream_limit = (s: Stream<number>, tolerance: number): number => {
  const s0 = head(s);
  const s1 = head(stream_tail(s));
  return math_abs(s1 - s0) < tolerance
    ? s1
    : stream_limit(stream_tail(s), tolerance);
};

const sqrt = (x: number, tolerance: number): number =>
  stream_limit(sqrt_stream(x), tolerance);
`,
};

export const exercise_3_65: ExerciseSpec = {
  id: '3.65',
  prelude: piDefinitions,
  starter: `// partial_sums, euler_transform and accelerated_sequence are provided,
// with memoized stream_map, add_streams and scale_stream.

// The summands 1, -1/2, 1/3, -1/4, ...
const ln2_summands = (n: number): Stream<number> => {
  // your answer
};

const ln2_stream = null;      // your answer: the partial sums
const ln2_euler = null;       // your answer: Euler's transform of them
const ln2_accelerated = null; // your answer: the tableau's first terms
`,
  tests: [
    { name: 'the partial sums', kind: 'value', expr: `stream_ref(ln2_stream, 0) === 1 && ${close('stream_ref(ln2_stream, 9)', 0.6456349206349207, 1e-12)}`, expected: true },
    { name: 'the Euler transform', kind: 'value', expr: close('stream_ref(ln2_euler, 7)', 0.6930033416875522, 1e-12), expected: true },
    { name: 'the accelerated sequence', kind: 'value', expr: close('stream_ref(ln2_accelerated, 7)', Math.LN2, 1e-12), expected: true },
  ],
  budget: 300_000,
  solution: `const ln2_summands = (n: number): Stream<number> =>
  pair(1 / n, () => stream_map(x => -x, ln2_summands(n + 1)));

const ln2_stream = partial_sums(ln2_summands(1));
const ln2_euler = euler_transform(ln2_stream);
const ln2_accelerated = accelerated_sequence(euler_transform, ln2_stream);
`,
};

export const exercise_3_66: ExerciseSpec = {
  id: '3.66',
  prelude: `${paradigmPairsDefinitions}
const index_of_pair = (i: number, j: number): number => {
  const search = (s: Stream<List<number>>, n: number): number =>
    head(head(s)) === i && head(tail(head(s))) === j
      ? n
      : search(stream_tail(s), n + 1);
  return search(pairs(integers, integers), 0);
};
`,
  starter: `// pairs, interleave and integers are provided.

// How many pairs come before (i, j), i <= j, in pairs(integers, integers)?
const preceding = (i: number, j: number): number => {
  // your answer
};
`,
  tests: [
    { name: 'before (1, 100)', kind: 'value', expr: 'preceding(1, 100)', expected: 197 },
    { name: 'before (99, 100)', kind: 'value', expr: 'preceding(99, 100) === 3 * math_pow(2, 98) - 2', expected: true },
    { name: 'before (100, 100)', kind: 'value', expr: 'preceding(100, 100) === math_pow(2, 100) - 2', expected: true },
    { name: 'agrees with the stream', kind: 'value', expr: 'preceding(3, 7) === index_of_pair(3, 7) && preceding(4, 4) === index_of_pair(4, 4) && preceding(2, 9) === index_of_pair(2, 9) && preceding(1, 1) === 0', expected: true },
  ],
  solution: `const preceding = (i: number, j: number): number =>
  i === j
    ? math_pow(2, i) - 2
    : math_pow(2, i) * (j - i) + math_pow(2, i - 1) - 2;
`,
};

export const exercise_3_67: ExerciseSpec = {
  id: '3.67',
  prelude: `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
${paradigmPairsDefinitions}
${tupleChecks}`,
  starter: `// integers, interleave and pairs are provided.

// Every pair (i, j) of positive integers, without the condition i <= j.
const all_pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> => {
  // your answer
};
`,
  tests: [
    { name: 'starts with (1, 1)', kind: 'value', expr: 'equal(head(all_pairs(integers, integers)), list(1, 1))', expected: true },
    { name: 'every pair up to (3, 3) among the first 60', kind: 'value', expr: 'has_all_pairs(eval_stream(all_pairs(integers, integers), 60), 3, false)', expected: true },
    { name: 'no pair twice', kind: 'value', expr: 'all_distinct(eval_stream(all_pairs(integers, integers), 60))', expected: true },
  ],
  budget: 400_000,
  solution: `const all_pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> =>
  pair(list(head(s), head(t)),
       () => interleave(
               stream_map(x => list(head(s), x), stream_tail(t)),
               interleave(
                 stream_map(x => list(x, head(t)), stream_tail(s)),
                 all_pairs(stream_tail(s), stream_tail(t)))));
`,
};

export const exercise_3_68: ExerciseSpec = {
  id: '3.68',
  prelude: `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
${paradigmPairsDefinitions}
${tupleChecks}
const louis_pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> =>
  interleave(stream_map(x => list(head(s), x), t),
             louis_pairs(stream_tail(s), stream_tail(t)));
`,
  starter: `// integers, interleave and Louis's louis_pairs are provided.

// Does louis_pairs(integers, integers) ever return? true or false.
const louis_pairs_returns = undefined;

// Like interleave, but its second argument is a function that returns
// the stream, so that the stream is not needed until it is used.
const interleave_delayed = <T>(s1: Stream<T>, delayed_s2: () => Stream<T>): Stream<T> => {
  // your answer
};

// Louis's idea, mended: the whole first row, interleaved with the rest.
const mended_pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> =>
  interleave_delayed(stream_map(x => list(head(s), x), t),
                     () => mended_pairs(stream_tail(s), stream_tail(t)));
`,
  tests: [
    { name: 'Louis’s pairs', kind: 'value', expr: 'louis_pairs_returns', expected: false },
    { name: 'the mended stream starts with (1, 1)', kind: 'value', expr: 'equal(head(mended_pairs(integers, integers)), list(1, 1))', expected: true },
    { name: 'every pair up to (4, 4) among the first 40', kind: 'value', expr: 'has_all_pairs(eval_stream(mended_pairs(integers, integers), 40), 4, true)', expected: true },
    { name: 'each pair once, in order', kind: 'value', expr: 'all_distinct(eval_stream(mended_pairs(integers, integers), 40)) && all_ordered(eval_stream(mended_pairs(integers, integers), 40))', expected: true },
  ],
  budget: 300_000,
  solution: `// louis_pairs calls itself before interleave can produce anything, and
// that call calls itself again: the recursion never bottoms out.
const louis_pairs_returns = false;

const interleave_delayed = <T>(s1: Stream<T>, delayed_s2: () => Stream<T>): Stream<T> =>
  is_null(s1)
    ? delayed_s2()
    : pair(head(s1),
           () => interleave_delayed(delayed_s2(), () => stream_tail(s1)));

const mended_pairs = <T>(s: Stream<T>, t: Stream<T>): Stream<List<T>> =>
  interleave_delayed(stream_map(x => list(head(s), x), t),
                     () => mended_pairs(stream_tail(s), stream_tail(t)));
`,
};

export const exercise_3_69: ExerciseSpec = {
  id: '3.69',
  prelude: `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
${paradigmPairsDefinitions}
${tupleChecks}
const is_pythagorean = (t: List<number>): boolean => {
  const i = list_ref(t, 0);
  const j = list_ref(t, 1);
  const k = list_ref(t, 2);
  return i <= j && i * i + j * j === k * k;
};
`,
  starter: `// integers, interleave and pairs are provided.

// The triples list(S_i, T_j, U_k) with i <= j <= k.
const triples = <T>(s: Stream<T>, t: Stream<T>, u: Stream<T>): Stream<List<T>> => {
  // your answer
};

const pythagorean_triples = null; // your answer
`,
  tests: [
    { name: 'starts with (1, 1, 1)', kind: 'value', expr: 'equal(head(triples(integers, integers, integers)), list(1, 1, 1))', expected: true },
    { name: 'ordered and distinct', kind: 'value', expr: 'all_ordered(eval_stream(triples(integers, integers, integers), 40)) && all_distinct(eval_stream(triples(integers, integers, integers), 40))', expected: true },
    { name: 'the triples of 1s and 2s come early', kind: 'value', expr: 'accumulate((t, ok) => ok && is_member(t, eval_stream(triples(integers, integers, integers), 40)), true, list(list(1, 1, 2), list(1, 2, 2), list(2, 2, 2), list(1, 1, 3)))', expected: true },
    { name: 'the first Pythagorean triple', kind: 'value', expr: 'equal(stream_ref(pythagorean_triples, 0), list(3, 4, 5))', expected: true },
    { name: 'a second, different one', kind: 'value', expr: 'is_pythagorean(stream_ref(pythagorean_triples, 1)) && !equal(stream_ref(pythagorean_triples, 1), list(3, 4, 5))', expected: true },
  ],
  budget: 3_000_000,
  solution: `const triples = <T>(s: Stream<T>, t: Stream<T>, u: Stream<T>): Stream<List<T>> =>
  pair(list(head(s), head(t), head(u)),
       () => interleave(
               stream_map(p => pair(head(s), p),
                          stream_tail(pairs(t, u))),
               triples(stream_tail(s), stream_tail(t), stream_tail(u))));

const pythagorean_triples =
  stream_filter(t => {
                  const i = head(t);
                  const j = head(tail(t));
                  const k = head(tail(tail(t)));
                  return i * i + j * j === k * k;
                },
                triples(integers, integers, integers));
`,
};

export const exercise_3_70: ExerciseSpec = {
  id: '3.70',
  prelude: `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
const integers = integers_from(1);
${tupleChecks}`,
  starter: `// integers, memo and a memoized stream_map are provided.
// A weight function takes a pair as a list, list(i, j).

const merge_weighted = <T>(s1: Stream<T>, s2: Stream<T>, weight: (x: T) => number): Stream<T> => {
  // your answer
};

const weighted_pairs = <T>(s: Stream<T>, t: Stream<T>, weight: (p: List<T>) => number): Stream<List<T>> => {
  // your answer
};

const by_sum = null;           // your answer: (a)
const by_2i_3j_5ij = null;     // your answer: (b)
`,
  tests: [
    { name: '(a) weights in order, ties kept', kind: 'value', expr: 'equal(map(p => head(p) + head(tail(p)), eval_stream(by_sum, 12)), list(2, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 7))', expected: true },
    { name: '(a) each pair once, with i <= j', kind: 'value', expr: 'all_ordered(eval_stream(by_sum, 30)) && all_distinct(eval_stream(by_sum, 30))', expected: true },
    { name: '(b) the first ten', kind: 'value', expr: 'equal(eval_stream(by_2i_3j_5ij, 10), list(list(1, 1), list(1, 7), list(1, 11), list(1, 13), list(1, 17), list(1, 19), list(1, 23), list(1, 29), list(1, 31), list(7, 7)))', expected: true },
  ],
  budget: 400_000,
  solution: `const merge_weighted = <T>(s1: Stream<T>, s2: Stream<T>, weight: (x: T) => number): Stream<T> => {
  if (is_null(s1)) {
    return s2;
  } else if (is_null(s2)) {
    return s1;
  } else {
    const h1 = head(s1);
    const h2 = head(s2);
    return weight(h1) <= weight(h2)
      ? pair(h1, memo(() => merge_weighted(stream_tail(s1), s2, weight)))
      : pair(h2, memo(() => merge_weighted(s1, stream_tail(s2), weight)));
  }
};

const weighted_pairs = <T>(s: Stream<T>, t: Stream<T>, weight: (p: List<T>) => number): Stream<List<T>> =>
  pair(list(head(s), head(t)),
       memo(() => merge_weighted(
                    stream_map(x => list(head(s), x), stream_tail(t)),
                    weighted_pairs(stream_tail(s), stream_tail(t), weight),
                    weight)));

const by_sum = weighted_pairs(integers, integers,
                              p => head(p) + head(tail(p)));

const not_235 = stream_filter(n => n % 2 !== 0 && n % 3 !== 0 && n % 5 !== 0,
                              integers);
const by_2i_3j_5ij =
  weighted_pairs(not_235, not_235,
                 p => 2 * head(p) + 3 * head(tail(p)) + 5 * head(p) * head(tail(p)));
`,
};

export const exercise_3_71: ExerciseSpec = {
  id: '3.71',
  prelude: `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
const integers = integers_from(1);
${weightedPairs}`,
  starter: `// integers, merge_weighted and weighted_pairs (exercise 3.70) are provided.

const ramanujan_numbers = null; // your answer

// The five Ramanujan numbers after 1729, as a list.
const next_five = null;
`,
  tests: [
    { name: 'the first is 1729', kind: 'value', expr: 'stream_ref(ramanujan_numbers, 0)', expected: 1729 },
    { name: 'the second and third', kind: 'value', expr: 'stream_ref(ramanujan_numbers, 1) === 4104 && stream_ref(ramanujan_numbers, 2) === 13832', expected: true },
    { name: 'the next five', kind: 'value', expr: 'equal(next_five, list(4104, 13832, 20683, 32832, 39312))', expected: true },
  ],
  budget: 2_000_000,
  solution: `const cube = (x: number): number => x * x * x;

const cube_weight = (p: List<number>): number =>
  cube(head(p)) + cube(head(tail(p)));

const by_cubes = weighted_pairs(integers, integers, cube_weight);

// Two neighbours with the same weight: a sum of two cubes in two ways.
const same_weight_neighbours = (s: Stream<List<number>>): Stream<number> => {
  const w1 = cube_weight(head(s));
  const w2 = cube_weight(head(stream_tail(s)));
  return w1 === w2
    ? pair(w1, () => same_weight_neighbours(stream_tail(stream_tail(s))))
    : same_weight_neighbours(stream_tail(s));
};

const ramanujan_numbers = same_weight_neighbours(by_cubes);

const next_five = list(4104, 13832, 20683, 32832, 39312);
`,
};

export const exercise_3_72: ExerciseSpec = {
  id: '3.72',
  prelude: `${paradigmMemoDefinition}
${paradigmMemoStreamMap}
const integers = integers_from(1);
${weightedPairs}
const ways_ok = (entry: Pair<number, List<List<number>>>): boolean => {
  const n = head(entry);
  const ways = tail(entry);
  const squares = (p: List<number>): number =>
    head(p) * head(p) + head(tail(p)) * head(tail(p));
  return length(ways) === 3
    && accumulate((p, ok) => ok && head(p) <= head(tail(p)) && squares(p) === n, true, ways)
    && !equal(list_ref(ways, 0), list_ref(ways, 1))
    && !equal(list_ref(ways, 1), list_ref(ways, 2))
    && !equal(list_ref(ways, 0), list_ref(ways, 2));
};
`,
  starter: `// integers, merge_weighted and weighted_pairs (exercise 3.70) are provided.

// Elements of the form list(n, list(i1, j1), list(i2, j2), list(i3, j3)),
// where n is i*i + j*j for each of the three pairs.
const three_square_ways = null; // your answer
`,
  tests: [
    { name: 'the first is 325', kind: 'value', expr: 'head(stream_ref(three_square_ways, 0))', expected: 325 },
    { name: 'with its three ways', kind: 'value', expr: 'ways_ok(stream_ref(three_square_ways, 0))', expected: true },
    { name: 'the second is 425, in three ways', kind: 'value', expr: 'head(stream_ref(three_square_ways, 1)) === 425 && ways_ok(stream_ref(three_square_ways, 1))', expected: true },
  ],
  budget: 2_000_000,
  solution: `const square_weight = (p: List<number>): number =>
  head(p) * head(p) + head(tail(p)) * head(tail(p));

const by_squares = weighted_pairs(integers, integers, square_weight);

const three_in_a_row = (s: Stream<List<number>>): Stream<Pair<number, List<List<number>>>> => {
  const p1 = head(s);
  const p2 = head(stream_tail(s));
  const p3 = head(stream_tail(stream_tail(s)));
  const w = square_weight(p1);
  return w === square_weight(p2) && w === square_weight(p3)
    ? pair(list(w, p1, p2, p3),
           () => three_in_a_row(stream_tail(stream_tail(stream_tail(s)))))
    : three_in_a_row(stream_tail(s));
};

const three_square_ways = three_in_a_row(by_squares);
`,
};

export const exercise_3_73: ExerciseSpec = {
  id: '3.73',
  prelude: `${streams}
${paradigmIntegralDefinition}
const ones = pair(1, () => ones);
const integers = integers_from(1);
`,
  starter: `// integral (§3.5.3), add_streams, scale_stream, ones and integers are provided.

// v = R i + v0 + (1 / C) ∫ i dt
const RC = (R: number, C: number, dt: number): ((i: Stream<number>, v0: number) => Stream<number>) => {
  // your answer
};
`,
  tests: [
    { name: 'a constant current', kind: 'value', expr: `stream_ref(RC(5, 1, 0.5)(ones, 0), 0) === 5 && ${close('stream_ref(RC(5, 1, 0.5)(ones, 0), 10)', 10, 1e-9)}`, expected: true },
    { name: 'a rising current', kind: 'value', expr: close('stream_ref(RC(2, 4, 0.1)(integers, 2), 10)', 25.375, 1e-9), expected: true },
  ],
  solution: `const RC = (R: number, C: number, dt: number): ((i: Stream<number>, v0: number) => Stream<number>) =>
  (i, v0) => add_streams(scale_stream(i, R),
                         integral(scale_stream(i, 1 / C), v0, dt));
`,
};

export const exercise_3_74: ExerciseSpec = {
  id: '3.74',
  prelude: `${paradigmStreamOperations}
${zeroCrossings}
${alyssaZeroCrossings}
const sense_data =
  list_to_stream(list(1, 2, 1.5, 1, 0.5, -0.1, -2, -3, -2, -0.5, 0.2, 3, 4));
`,
  starter: `// sense_data, sign_change_detector, make_zero_crossings and
// stream_map_2 are provided.

const zero_crossings = stream_map_2(sign_change_detector,
                                    sense_data,
                                    null); // your expression instead of null
`,
  tests: [
    { name: 'the crossings', kind: 'value', expr: 'equal(stream_to_list(zero_crossings), list(0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0))', expected: true },
    { name: 'the same as Alyssa’s', kind: 'value', expr: 'equal(stream_to_list(zero_crossings), stream_to_list(make_zero_crossings(sense_data, 0)))', expected: true },
  ],
  solution: `const zero_crossings = stream_map_2(sign_change_detector,
                                    sense_data,
                                    pair(0, () => sense_data));
`,
};

export const exercise_3_75: ExerciseSpec = {
  id: '3.75',
  prelude: `${zeroCrossings}
${noisyData}`,
  starter: `// sense_data and sign_change_detector are provided.
// Mend Louis's function; it should be called as
// make_zero_crossings(sense_data, 0, 0).

const make_zero_crossings = (input_stream: Stream<number>, last_value: number): Stream<number> => {
  if (is_null(input_stream)) {
    return null;
  } else {
    const avpt = (head(input_stream) + last_value) / 2;
    return pair(sign_change_detector(avpt, last_value),
                () => make_zero_crossings(stream_tail(input_stream), avpt));
  }
};
`,
  tests: [
    { name: 'the crossings of the smoothed signal', kind: 'value', expr: 'equal(stream_to_list(make_zero_crossings(sense_data, 0, 0)), list(0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 1, 0, 0))', expected: true },
    { name: 'a clean signal', kind: 'value', expr: 'equal(stream_to_list(make_zero_crossings(list_to_stream(list(2, 2, -2, -2, 2, 2)), 0, 0)), list(0, 0, 0, -1, 1, 0))', expected: true },
  ],
  solution: `// Louis averages each value with the previous average, not the previous
// value, and compares with the previous value, not the previous average.
const make_zero_crossings = (
  input_stream: Stream<number>,
  last_value: number,
  last_avpt: number
): Stream<number> => {
  if (is_null(input_stream)) {
    return null;
  } else {
    const avpt = (head(input_stream) + last_value) / 2;
    return pair(sign_change_detector(avpt, last_avpt),
                () => make_zero_crossings(stream_tail(input_stream),
                                          head(input_stream), avpt));
  }
};
`,
};

export const exercise_3_76: ExerciseSpec = {
  id: '3.76',
  prelude: `${paradigmStreamOperations}
${zeroCrossings}
${alyssaZeroCrossings}
${noisyData}`,
  starter: `// sense_data, sign_change_detector, Alyssa's make_zero_crossings
// (no smoothing) and stream_map_2 are provided.

// Each element is the average of an input element and the one before it;
// the one before the first counts as 0.
const smooth = (s: Stream<number>): Stream<number> => {
  // your answer
};

const smoothed_zero_crossings = (s: Stream<number>): Stream<number> => {
  // your answer, from smooth and make_zero_crossings
};
`,
  tests: [
    { name: 'smooth', kind: 'value', expr: 'equal(stream_to_list(smooth(list_to_stream(list(2, 4, 8)))), list(1, 3, 6))', expected: true },
    { name: 'smooth is lazy', kind: 'value', expr: 'stream_ref(smooth(integers_from(1)), 9)', expected: 9.5 },
    { name: 'the crossings of the smoothed signal', kind: 'value', expr: 'equal(stream_to_list(smoothed_zero_crossings(sense_data)), list(0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 1, 0, 0))', expected: true },
  ],
  solution: `const smooth = (s: Stream<number>): Stream<number> =>
  stream_map_2((x, previous) => (x + previous) / 2,
               s,
               pair(0, () => s));

const smoothed_zero_crossings = (s: Stream<number>): Stream<number> =>
  make_zero_crossings(smooth(s), 0);
`,
};

// ---------------------------------------------------------------- §3.5.4

export const exercise_3_77: ExerciseSpec = {
  id: '3.77',
  prelude: streams,
  starter: `// memo, add_streams, scale_stream and a memoized stream_map are provided.

// Change integral so that it takes its integrand delayed, as a function
// of no arguments, and solve works.
const integral = (integrand: Stream<number>, initial_value: number, dt: number): Stream<number> =>
  pair(initial_value,
       is_null(integrand)
       ? null
       : integral(stream_tail(integrand),
                  dt * head(integrand) + initial_value,
                  dt));

const solve = (f: (y: number) => number, y0: number, dt: number): Stream<number> => {
  const y = integral(() => dy, y0, dt);
  const dy = stream_map(f, y);
  return y;
};
`,
  tests: [
    { name: 'sums the integrand', kind: 'value', expr: 'stream_ref(integral(() => integers_from(1), 0, 1), 3)', expected: 6 },
    { name: 'stops with a finite integrand', kind: 'value', expr: 'equal(stream_to_list(integral(() => list_to_stream(list(1, 2)), 0, 1)), list(0, 1, 3))', expected: true },
    { name: 'solves dy/dt = y', kind: 'value', expr: close('stream_ref(solve(y => y, 1, 0.01), 100)', 1.01 ** 100, 1e-9), expected: true },
  ],
  budget: 300_000,
  solution: `const integral = (delayed_integrand: () => Stream<number>, initial_value: number, dt: number): Stream<number> =>
  pair(initial_value,
       memo(() => {
         const integrand = delayed_integrand();
         return is_null(integrand)
           ? null
           : integral(() => stream_tail(integrand),
                      dt * head(integrand) + initial_value,
                      dt);
       }));

const solve = (f: (y: number) => number, y0: number, dt: number): Stream<number> => {
  const y = integral(() => dy, y0, dt);
  const dy = stream_map(f, y);
  return y;
};
`,
};

const delayedIntegral = `${streams}
${paradigmDelayedIntegralDefinition}`;

export const exercise_3_78: ExerciseSpec = {
  id: '3.78',
  prelude: delayedIntegral,
  starter: `// integral (with a delayed integrand), add_streams, scale_stream and
// a memoized stream_map are provided.

// The stream of y for  d²y/dt² - a dy/dt - b y = 0.
const solve_2nd = (a: number, b: number, dt: number, y0: number, dy0: number): Stream<number> => {
  // your answer
};
`,
  tests: [
    { name: 'y″ = −y is a cosine', kind: 'value', expr: close('stream_ref(solve_2nd(0, -1, 0.01, 1, 0), 100)', 0.5430386343323511, 1e-9), expected: true },
    { name: 'y″ = y′ is e^t', kind: 'value', expr: close('stream_ref(solve_2nd(1, 0, 0.001, 1, 1), 1000)', 2.716923932235896, 1e-9), expected: true },
  ],
  budget: 2_000_000,
  solution: `const solve_2nd = (a: number, b: number, dt: number, y0: number, dy0: number): Stream<number> => {
  const y = integral(() => dy, y0, dt);
  const dy = integral(() => ddy, dy0, dt);
  const ddy = add_streams(scale_stream(dy, a), scale_stream(y, b));
  return y;
};
`,
};

export const exercise_3_79: ExerciseSpec = {
  id: '3.79',
  prelude: delayedIntegral,
  starter: `// integral (with a delayed integrand), stream_map_2, add_streams,
// scale_stream and a memoized stream_map are provided.

// The stream of y for  d²y/dt² = f(dy/dt, y).
const solve_2nd = (f: (dy: number, y: number) => number, dt: number, y0: number, dy0: number): Stream<number> => {
  // your answer
};
`,
  tests: [
    { name: 'y″ = −y is a cosine', kind: 'value', expr: close('stream_ref(solve_2nd((dy, y) => -y, 0.01, 1, 0), 100)', 0.5430386343323511, 1e-9), expected: true },
    { name: 'y″ = y′ is e^t', kind: 'value', expr: close('stream_ref(solve_2nd((dy, y) => dy, 0.001, 1, 1), 1000)', 2.716923932235896, 1e-9), expected: true },
  ],
  budget: 2_000_000,
  solution: `const solve_2nd = (f: (dy: number, y: number) => number, dt: number, y0: number, dy0: number): Stream<number> => {
  const y = integral(() => dy, y0, dt);
  const dy = integral(() => ddy, dy0, dt);
  const ddy = stream_map_2(f, dy, y);
  return y;
};
`,
};

export const exercise_3_80: ExerciseSpec = {
  id: '3.80',
  prelude: delayedIntegral,
  starter: `// integral (with a delayed integrand), add_streams, scale_stream and
// a memoized stream_map are provided.

// RLC(R, L, C, dt) returns a function of (v_C0, i_L0) that returns
// pair(stream of v_C, stream of i_L).
type Circuit = (v_C0: number, i_L0: number) => Pair<Stream<number>, Stream<number>>;

const RLC = (R: number, L: number, C: number, dt: number): Circuit => {
  // your answer
};

const RLC1 = RLC(1, 1, 0.2, 0.1);
const states = null; // your answer: i_L0 = 0 amps, v_C0 = 10 volts
`,
  tests: [
    { name: 'the first steps', kind: 'value', expr: `stream_ref(head(states), 1) === 10 && stream_ref(tail(states), 1) === 1 && ${close('stream_ref(head(states), 2)', 9.5, 1e-12)} && ${close('stream_ref(tail(states), 2)', 1.9, 1e-12)}`, expected: true },
    { name: 'v_C after 5 seconds', kind: 'value', expr: close('stream_ref(head(states), 50)', 0.15526261365409155, 1e-9), expected: true },
    { name: 'i_L after 5 seconds', kind: 'value', expr: close('stream_ref(tail(states), 50)', -1.2231501590473288, 1e-9), expected: true },
  ],
  budget: 300_000,
  solution: `type Circuit = (v_C0: number, i_L0: number) => Pair<Stream<number>, Stream<number>>;

const RLC = (R: number, L: number, C: number, dt: number): Circuit =>
  (v_C0, i_L0) => {
    const v_C = integral(() => dv_C, v_C0, dt);
    const i_L = integral(() => di_L, i_L0, dt);
    const dv_C = scale_stream(i_L, -1 / C);
    const di_L = add_streams(scale_stream(v_C, 1 / L),
                             scale_stream(i_L, -R / L));
    return pair(v_C, i_L);
  };

const RLC1 = RLC(1, 1, 0.2, 0.1);
const states = RLC1(10, 0);
`,
};

// ---------------------------------------------------------------- §3.5.5

export const exercise_3_81: ExerciseSpec = {
  id: '3.81',
  prelude: paradigmRandDefinitions,
  starter: `// random_init and rand_update are provided.

// requests is a stream whose elements are "generate" or list("reset", x).
// "generate" answers with the next random number; list("reset", x) starts
// the sequence again from x, and answers with x.
type Request = "generate" | List<"reset" | number>;

const random_stream = (requests: Stream<Request>): Stream<number> => {
  // your answer
};
`,
  tests: [
    { name: 'generate', kind: 'value', expr: 'equal(stream_to_list(random_stream(list_to_stream(list("generate", "generate")))), list(rand_update(random_init), rand_update(rand_update(random_init))))', expected: true },
    { name: 'reset', kind: 'value', expr: 'equal(stream_to_list(random_stream(list_to_stream(list("generate", list("reset", 42), "generate", "generate")))), list(rand_update(random_init), 42, rand_update(42), rand_update(rand_update(42))))', expected: true },
    { name: 'resetting twice repeats the sequence', kind: 'value', expr: 'equal(stream_to_list(random_stream(list_to_stream(list(list("reset", 7), "generate", list("reset", 7), "generate")))), list(7, rand_update(7), 7, rand_update(7)))', expected: true },
    { name: 'an endless stream of requests', kind: 'value', expr: '(() => { const gen = pair("generate", () => gen); return stream_ref(random_stream(gen), 2) === rand_update(rand_update(rand_update(random_init))); })()', expected: true },
  ],
  solution: `type Request = "generate" | List<"reset" | number>;

const random_stream = (requests: Stream<Request>): Stream<number> => {
  const from = (x: number, requests: Stream<Request>): Stream<number> => {
    if (is_null(requests)) {
      return null;
    } else {
      const request = head(requests);
      const next = request === "generate"
                   ? rand_update(x)
                   : head(tail(request));
      return pair(next, () => from(next, stream_tail(requests)));
    }
  };
  return from(random_init, requests);
};
`,
};

export const exercise_3_82: ExerciseSpec = {
  id: '3.82',
  prelude: `${randomNumbers}
const random_numbers =
  pair(random_init, memo(() => stream_map(rand_update, random_numbers)));

const monte_carlo = (experiment_stream: Stream<boolean>, passed: number, failed: number): Stream<number> => {
  const next = (passed: number, failed: number): Stream<number> =>
    pair(passed / (passed + failed),
         memo(() => monte_carlo(stream_tail(experiment_stream),
                                passed, failed)));
  return head(experiment_stream)
    ? next(passed + 1, failed)
    : next(passed, failed + 1);
};
`,
  starter: `// random_numbers (between 1 and 2147483646), memo, a memoized
// stream_map and the stream version of monte_carlo are provided.

// The stream of estimates of the area of the region where P(x, y) holds,
// inside the rectangle from x1 to x2 and y1 to y2.
const estimate_integral = (
  P: (x: number, y: number) => boolean,
  x1: number,
  x2: number,
  y1: number,
  y2: number
): Stream<number> => {
  // your answer
};
`,
  tests: [
    { name: 'the whole rectangle', kind: 'value', expr: 'stream_ref(estimate_integral((x, y) => true, 2, 5, 0, 2), 10)', expected: 6 },
    { name: 'every point lies in the rectangle', kind: 'value', expr: 'stream_ref(estimate_integral((x, y) => x >= 2 && x <= 5 && y >= 0 && y <= 2, 2, 5, 0, 2), 50)', expected: 6 },
    { name: 'half the rectangle', kind: 'value', expr: close('stream_ref(estimate_integral((x, y) => x >= 3, 2, 4, 0, 1), 400)', 1, 0.25), expected: true },
    { name: 'the unit circle', kind: 'value', expr: close('stream_ref(estimate_integral((x, y) => x * x + y * y <= 1, -1, 1, -1, 1), 1000)', Math.PI, 0.3), expected: true },
  ],
  budget: 2_000_000,
  solution: `const map_successive_pairs = <T, R>(f: (a: T, b: T) => R, s: Stream<T>): Stream<R> =>
  pair(f(head(s), head(stream_tail(s))),
       memo(() => map_successive_pairs(f, stream_tail(stream_tail(s)))));

const estimate_integral = (
  P: (x: number, y: number) => boolean,
  x1: number,
  x2: number,
  y1: number,
  y2: number
): Stream<number> => {
  const area = (x2 - x1) * (y2 - y1);
  const trials = map_successive_pairs(
                   (rx, ry) => P(x1 + (rx / 2147483647) * (x2 - x1),
                                 y1 + (ry / 2147483647) * (y2 - y1)),
                   random_numbers);
  return stream_map(p => p * area, monte_carlo(trials, 0, 0));
};
`,
};
