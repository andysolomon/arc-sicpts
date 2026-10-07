import {
  addStreamsDefinition,
  integersStartingFromDefinition,
  mergeStreamsDefinition,
  scaleStreamDefinition,
  streamEnumerateIntervalDefinition,
  streamMap2Definition,
  streamMapOptimizedDefinition,
  streamMemoDefinition,
} from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §3.5.1 and §3.5.2. */

/** What §3.5.2's implicit definitions build on: stream_map_2, add_streams, scale_stream, ones, integers. */
const implicitPrelude = `${streamMap2Definition}
${addStreamsDefinition}
${scaleStreamDefinition}
${integersStartingFromDefinition}
const ones = pair(1, () => ones);

const integers = integers_starting_from(1);
`;

export const exercise_3_50: ExerciseSpec = {
  id: '3.50',
  prelude: `${streamMemoDefinition}
${integersStartingFromDefinition}`,
  starter: `// memo and integers_starting_from are provided.

function stream_map_2(f, s1, s2) {
  // your answer
}

function stream_map_2_optimized(f, s1, s2) {
  // your answer: like stream_map_2, with a memoized tail
}
`,
  tests: [
    {
      name: 'stops at the shorter stream',
      kind: 'value',
      expr: 'equal(stream_to_list(stream_map_2((x, y) => x + y, list_to_stream(list(1, 2, 3)), list_to_stream(list(10, 20, 30, 40)))), list(11, 22, 33))',
      expected: true,
    },
    {
      name: 'works on infinite streams',
      kind: 'value',
      expr: 'stream_ref(stream_map_2((x, y) => x * y, integers_starting_from(1), integers_starting_from(1)), 9)',
      expected: 100,
    },
    {
      name: 'the optimized version gives the same elements',
      kind: 'value',
      expr: 'equal(eval_stream(stream_map_2_optimized((x, y) => x - y, integers_starting_from(10), integers_starting_from(1)), 4), list(9, 9, 9, 9))',
      expected: true,
    },
    {
      name: 'the optimized version computes each element once',
      kind: 'value',
      expr: `let n = 0;
const s = stream_map_2_optimized((x, y) => { n = n + 1; return x + y; }, integers_starting_from(1), integers_starting_from(1));
stream_ref(s, 5);
stream_ref(s, 5);
n`,
      expected: 6,
    },
  ],
  solution: `function stream_map_2(f, s1, s2) {
  return is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)),
           () => stream_map_2(f, stream_tail(s1), stream_tail(s2)));
}

function stream_map_2_optimized(f, s1, s2) {
  return is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)),
           memo(() => stream_map_2_optimized(f, stream_tail(s1), stream_tail(s2))));
}
`,
};

export const exercise_3_51: ExerciseSpec = {
  id: '3.51',
  prelude: `${streamMemoDefinition}
${streamMapOptimizedDefinition}
${streamEnumerateIntervalDefinition}`,
  starter: `// Statement by statement, which numbers are printed? Predict, then run the
// statements in the editor to check (memo, stream_map_optimized and
// stream_enumerate_interval are provided).
//
//   let x = stream_map(display, stream_enumerate_interval(0, 10));
//   stream_ref(x, 5);
//   stream_ref(x, 7);

const printed_by_x = list();
const printed_by_ref_5 = list();
const printed_by_ref_7 = list();

// The same three statements with stream_map_optimized instead of stream_map:
const printed_by_x_optimized = list();
const printed_by_ref_5_optimized = list();
const printed_by_ref_7_optimized = list();
`,
  tests: [
    { name: 'declaring x', kind: 'value', expr: 'equal(printed_by_x, list(0))', expected: true },
    { name: 'stream_ref(x, 5)', kind: 'value', expr: 'equal(printed_by_ref_5, list(1, 2, 3, 4, 5))', expected: true },
    { name: 'stream_ref(x, 7)', kind: 'value', expr: 'equal(printed_by_ref_7, list(1, 2, 3, 4, 5, 6, 7))', expected: true },
    { name: 'declaring x, optimized', kind: 'value', expr: 'equal(printed_by_x_optimized, list(0))', expected: true },
    { name: 'stream_ref(x, 5), optimized', kind: 'value', expr: 'equal(printed_by_ref_5_optimized, list(1, 2, 3, 4, 5))', expected: true },
    { name: 'stream_ref(x, 7), optimized', kind: 'value', expr: 'equal(printed_by_ref_7_optimized, list(6, 7))', expected: true },
  ],
  solution: `const printed_by_x = list(0);
const printed_by_ref_5 = list(1, 2, 3, 4, 5);
const printed_by_ref_7 = list(1, 2, 3, 4, 5, 6, 7);

const printed_by_x_optimized = list(0);
const printed_by_ref_5_optimized = list(1, 2, 3, 4, 5);
const printed_by_ref_7_optimized = list(6, 7);
`,
};

export const exercise_3_52: ExerciseSpec = {
  id: '3.52',
  prelude: `${streamMemoDefinition}
${streamMapOptimizedDefinition}
${streamEnumerateIntervalDefinition}
function stream_filter_optimized(pred, s) {
  return is_null(s)
    ? null
    : pred(head(s))
    ? pair(head(s), memo(() => stream_filter_optimized(pred, stream_tail(s))))
    : stream_filter_optimized(pred, stream_tail(s));
}

function is_even(n) {
  return n % 2 === 0;
}

function display_stream(s) {
  return stream_for_each(display, s);
}
`,
  starter: `// The statements:
//
//   let sum = 0;
//   function accum(x) {
//     sum = x + sum;
//     return sum;
//   }
//   const seq = stream_map(accum, stream_enumerate_interval(1, 20));
//   const y = stream_filter(is_even, seq);
//   const z = stream_filter(x => x % 5 === 0, seq);
//   stream_ref(y, 7);
//   display_stream(z);
//
// The value of sum after each of the statements from const seq on (five numbers):
const sums = list();
// The value of stream_ref(y, 7), and what display_stream(z) prints:
const ref_y_7 = 0;
const z_printed = list();

// The same with stream_map_optimized and stream_filter_optimized
// (memo on every tail; both are provided, so you can run them):
const sums_optimized = list();
const ref_y_7_optimized = 0;
const z_printed_optimized = list();
`,
  tests: [
    { name: 'sum after each statement', kind: 'value', expr: 'equal(sums, list(1, 6, 15, 162, 362))', expected: true },
    { name: 'stream_ref(y, 7)', kind: 'value', expr: 'ref_y_7', expected: 162 },
    { name: 'display_stream(z)', kind: 'value', expr: 'equal(z_printed, list(15, 180, 230, 305))', expected: true },
    { name: 'sum after each statement, memoized', kind: 'value', expr: 'equal(sums_optimized, list(1, 6, 10, 136, 210))', expected: true },
    { name: 'stream_ref(y, 7), memoized', kind: 'value', expr: 'ref_y_7_optimized', expected: 136 },
    {
      name: 'display_stream(z), memoized',
      kind: 'value',
      expr: 'equal(z_printed_optimized, list(10, 15, 45, 55, 105, 120, 190, 210))',
      expected: true,
    },
  ],
  solution: `const sums = list(1, 6, 15, 162, 362);
const ref_y_7 = 162;
const z_printed = list(15, 180, 230, 305);

const sums_optimized = list(1, 6, 10, 136, 210);
const ref_y_7_optimized = 136;
const z_printed_optimized = list(10, 15, 45, 55, 105, 120, 190, 210);
`,
};

export const exercise_3_53: ExerciseSpec = {
  id: '3.53',
  prelude: implicitPrelude,
  starter: `// add_streams is provided.
const s = pair(1, () => add_streams(s, s));

// Without running anything: the element of s at position n (counting from 0),
// as a formula in n.
function element_of_s(n) {
  // your answer
}
`,
  tests: [
    { name: 'position 0', kind: 'value', expr: 'element_of_s(0)', expected: 1 },
    { name: 'position 1', kind: 'value', expr: 'element_of_s(1)', expected: 2 },
    { name: 'position 5', kind: 'value', expr: 'element_of_s(5)', expected: 32 },
    { name: 'position 20', kind: 'value', expr: 'element_of_s(20)', expected: 1048576 },
  ],
  solution: `const s = pair(1, () => add_streams(s, s));

// Each element is the previous one added to itself: the powers of 2.
function element_of_s(n) {
  return math_pow(2, n);
}
`,
};

export const exercise_3_54: ExerciseSpec = {
  id: '3.54',
  prelude: implicitPrelude,
  starter: `// stream_map_2, add_streams and integers are provided.

function mul_streams(s1, s2) {
  // your answer
}

// Replace the two nulls: element n should be (n + 1)!
const factorials = pair(1, () => mul_streams(null, null));
`,
  tests: [
    { name: 'mul_streams multiplies elementwise', kind: 'value', expr: 'stream_ref(mul_streams(integers, integers), 4)', expected: 25 },
    { name: 'the first element is 1! = 1', kind: 'value', expr: 'stream_ref(factorials, 0)', expected: 1 },
    { name: 'element 1 is 2! = 2', kind: 'value', expr: 'stream_ref(factorials, 1)', expected: 2 },
    { name: 'element 5 is 6! = 720', kind: 'value', expr: 'stream_ref(factorials, 5)', expected: 720 },
  ],
  solution: `function mul_streams(s1, s2) {
  return stream_map_2((x1, x2) => x1 * x2, s1, s2);
}

const factorials = pair(1, () => mul_streams(factorials, stream_tail(integers)));
`,
};

export const exercise_3_55: ExerciseSpec = {
  id: '3.55',
  prelude: implicitPrelude,
  starter: `// add_streams, scale_stream, ones and integers are provided.

function partial_sums(s) {
  // your answer
}
`,
  tests: [
    {
      name: 'partial sums of the integers',
      kind: 'value',
      expr: 'equal(eval_stream(partial_sums(integers), 5), list(1, 3, 6, 10, 15))',
      expected: true,
    },
    { name: 'partial sums of twos', kind: 'value', expr: 'stream_ref(partial_sums(scale_stream(ones, 2)), 9)', expected: 20 },
    {
      name: 'a finite stream',
      kind: 'value',
      expr: 'equal(stream_to_list(partial_sums(list_to_stream(list(5, 1, 4)))), list(5, 6, 10))',
      expected: true,
    },
  ],
  solution: `function partial_sums(s) {
  return pair(head(s),
              () => add_streams(stream_tail(s), partial_sums(s)));
}
`,
};

export const exercise_3_56: ExerciseSpec = {
  id: '3.56',
  prelude: `${implicitPrelude}
${streamMemoDefinition}
${mergeStreamsDefinition}`,
  starter: `// merge, scale_stream and memo are provided. memo keeps S from
// recomputing itself every time one of its own scaled copies looks at it.

// Replace the two nulls.
const S = pair(1, memo(() => merge(null, null)));
`,
  tests: [
    {
      name: 'the first fifteen',
      kind: 'value',
      expr: 'equal(eval_stream(S, 15), list(1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24))',
      expected: true,
    },
    { name: 'element 29', kind: 'value', expr: 'stream_ref(S, 29)', expected: 80 },
  ],
  solution: `const S = pair(1, memo(() => merge(scale_stream(S, 2),
                                   merge(scale_stream(S, 3),
                                         scale_stream(S, 5)))));
`,
};

export const exercise_3_57: ExerciseSpec = {
  id: '3.57',
  starter: `// How many additions does stream_ref(fibs, n) perform?
// Answer with functions of n. You may experiment in the editor by counting
// in add_streams, but the answers should not build any streams.

// With add_streams on stream_map_2_optimized and fibs declared with memo:
function additions_memoized(n) {
  // your answer
}

// With the plain, unmemoized stream_map_2 and fibs of section 3.5.2:
function additions_unmemoized(n) {
  // your answer
}
`,
  tests: [
    { name: 'memoized, n = 1', kind: 'value', expr: 'additions_memoized(1)', expected: 0 },
    { name: 'memoized, n = 2', kind: 'value', expr: 'additions_memoized(2)', expected: 1 },
    { name: 'memoized, n = 30', kind: 'value', expr: 'additions_memoized(30)', expected: 29 },
    { name: 'unmemoized, n = 1', kind: 'value', expr: 'additions_unmemoized(1)', expected: 0 },
    { name: 'unmemoized, n = 2', kind: 'value', expr: 'additions_unmemoized(2)', expected: 1 },
    { name: 'unmemoized, n = 5', kind: 'value', expr: 'additions_unmemoized(5)', expected: 14 },
    { name: 'unmemoized, n = 10', kind: 'value', expr: 'additions_unmemoized(10)', expected: 221 },
    { name: 'unmemoized, n = 16', kind: 'value', expr: 'additions_unmemoized(16)', expected: 4163 },
  ],
  solution: `function additions_memoized(n) {
  return n <= 1 ? 0 : n - 1;
}

// A(n) = A(n - 1) + A(n - 2) + (n - 1), which is fib(n + 3) - n - 2.
function additions_unmemoized(n) {
  function fib_iter(a, b, k) {
    return k === 0 ? a : fib_iter(b, a + b, k - 1);
  }
  return fib_iter(0, 1, n + 3) - n - 2;
}
`,
};

export const exercise_3_58: ExerciseSpec = {
  id: '3.58',
  starter: `function expand(num, den, radix) {
  return pair(math_trunc((num * radix) / den),
              () => expand((num * radix) % den, den, radix));
}

// The first eight elements of each stream:
const expand_1_7 = list();
const expand_3_8 = list();
`,
  tests: [
    { name: 'expand(1, 7, 10)', kind: 'value', expr: 'equal(expand_1_7, list(1, 4, 2, 8, 5, 7, 1, 4))', expected: true },
    { name: 'expand(3, 8, 10)', kind: 'value', expr: 'equal(expand_3_8, list(3, 7, 5, 0, 0, 0, 0, 0))', expected: true },
  ],
  solution: `function expand(num, den, radix) {
  return pair(math_trunc((num * radix) / den),
              () => expand((num * radix) % den, den, radix));
}

// The digits of num / den after the point, in base radix.
const expand_1_7 = list(1, 4, 2, 8, 5, 7, 1, 4);
const expand_3_8 = list(3, 7, 5, 0, 0, 0, 0, 0);
`,
};

/** The series of exercise 3.59 for the exercises after it. */
const seriesSolution = `function integrate_series(s) {
  return stream_map_2((a, n) => a / n, s, integers);
}

const exp_series = pair(1, () => integrate_series(exp_series));

const cosine_series = pair(1, () => scale_stream(integrate_series(sine_series), -1));
const sine_series = pair(0, () => integrate_series(cosine_series));
`;

const mulSeriesSolution = `function mul_series(s1, s2) {
  return pair(head(s1) * head(s2),
              () => add_streams(scale_stream(stream_tail(s2), head(s1)),
                                mul_series(stream_tail(s1), s2)));
}
`;

const invertSolution = `function invert_unit_series(s) {
  return pair(1, () => scale_stream(mul_series(stream_tail(s), invert_unit_series(s)), -1));
}
`;

/** Unmemoized series take more steps than the default as the terms go up. */
const SERIES_BUDGET = 400_000;

export const exercise_3_59: ExerciseSpec = {
  id: '3.59',
  prelude: implicitPrelude,
  budget: SERIES_BUDGET,
  starter: `// stream_map_2, add_streams, scale_stream, ones and integers are provided.

// a. a0, a1 / 2, a2 / 3, ...
function integrate_series(s) {
  // your answer
}

const exp_series = pair(1, () => integrate_series(exp_series));

// b. Replace the nulls, knowing that sine' = cosine and cosine' = -sine.
const cosine_series = pair(1, () => null);
const sine_series = pair(0, () => null);
`,
  tests: [
    {
      name: 'integrating 1 + x + x² + ...',
      kind: 'value',
      expr: 'equal(eval_stream(integrate_series(ones), 4), list(1, 1 / 2, 1 / 3, 1 / 4))',
      expected: true,
    },
    { name: 'exp: the coefficient of x⁵ is 1/120', kind: 'value', expr: close('stream_ref(exp_series, 5)', 1 / 120, 1e-12), expected: true },
    { name: 'cosine: 1, 0, -1/2', kind: 'value', expr: 'equal(eval_stream(cosine_series, 3), list(1, 0, -1 / 2))', expected: true },
    { name: 'cosine: the coefficient of x⁴ is 1/24', kind: 'value', expr: close('stream_ref(cosine_series, 4)', 1 / 24, 1e-12), expected: true },
    { name: 'sine: 0, 1, 0', kind: 'value', expr: 'equal(eval_stream(sine_series, 3), list(0, 1, 0))', expected: true },
    { name: 'sine: the coefficient of x⁵ is 1/120', kind: 'value', expr: close('stream_ref(sine_series, 5)', 1 / 120, 1e-12), expected: true },
  ],
  solution: `${seriesSolution}`,
};

export const exercise_3_60: ExerciseSpec = {
  id: '3.60',
  prelude: `${implicitPrelude}
${seriesSolution}`,
  budget: SERIES_BUDGET,
  starter: `// add_streams, scale_stream, exp_series, sine_series and cosine_series
// (exercise 3.59) are provided.

function mul_series(s1, s2) {
  // your answer: pair(..., () => add_streams(..., ...))
}
`,
  tests: [
    { name: 'sin² x + cos² x: the constant term is 1', kind: 'value', expr: close('stream_ref(add_streams(mul_series(sine_series, sine_series), mul_series(cosine_series, cosine_series)), 0)', 1, 1e-12), expected: true },
    { name: 'sin² x + cos² x: no x² term', kind: 'value', expr: close('stream_ref(add_streams(mul_series(sine_series, sine_series), mul_series(cosine_series, cosine_series)), 2)', 0, 1e-12), expected: true },
    { name: 'sin² x + cos² x: no x⁶ term', kind: 'value', expr: close('stream_ref(add_streams(mul_series(sine_series, sine_series), mul_series(cosine_series, cosine_series)), 6)', 0, 1e-12), expected: true },
    { name: 'eˣ · eˣ = e²ˣ: the coefficient of x⁵ is 2⁵/5!', kind: 'value', expr: close('stream_ref(mul_series(exp_series, exp_series), 5)', 32 / 120, 1e-12), expected: true },
  ],
  solution: mulSeriesSolution,
};

export const exercise_3_61: ExerciseSpec = {
  id: '3.61',
  prelude: `${implicitPrelude}
${seriesSolution}
${mulSeriesSolution}`,
  budget: SERIES_BUDGET,
  starter: `// mul_series (exercise 3.60), scale_stream, exp_series and cosine_series
// are provided.

function invert_unit_series(s) {
  // your answer
}
`,
  tests: [
    { name: '1/eˣ = e⁻ˣ: constant term 1', kind: 'value', expr: 'stream_ref(invert_unit_series(exp_series), 0)', expected: 1 },
    { name: '1/eˣ = e⁻ˣ: coefficient of x³ is -1/6', kind: 'value', expr: close('stream_ref(invert_unit_series(exp_series), 3)', -1 / 6, 1e-12), expected: true },
    { name: '1/eˣ = e⁻ˣ: coefficient of x⁶ is 1/720', kind: 'value', expr: close('stream_ref(invert_unit_series(exp_series), 6)', 1 / 720, 1e-12), expected: true },
    { name: 'S · (1/S) = 1 for cosine', kind: 'value', expr: close('stream_ref(mul_series(cosine_series, invert_unit_series(cosine_series)), 4)', 0, 1e-12), expected: true },
  ],
  solution: invertSolution,
};

export const exercise_3_62: ExerciseSpec = {
  id: '3.62',
  prelude: `${implicitPrelude}
${seriesSolution}
${mulSeriesSolution}
${invertSolution}`,
  budget: SERIES_BUDGET,
  starter: `// mul_series, invert_unit_series, scale_stream and the series of
// exercise 3.59 are provided.

function div_series(s1, s2) {
  // your answer
}

const tangent_series = null; // replace null
`,
  tests: [
    { name: 'eˣ / eˣ = 1', kind: 'value', expr: close('stream_ref(div_series(exp_series, exp_series), 3)', 0, 1e-12), expected: true },
    {
      name: 'a denominator whose constant term is not 1',
      kind: 'value',
      expr: close('stream_ref(div_series(exp_series, scale_stream(exp_series, 2)), 0)', 0.5, 1e-12),
      expected: true,
    },
    { name: 'tangent: 0, 1, 0', kind: 'value', expr: 'equal(eval_stream(tangent_series, 3), list(0, 1, 0))', expected: true },
    { name: 'tangent: the coefficient of x³ is 1/3', kind: 'value', expr: close('stream_ref(tangent_series, 3)', 1 / 3, 1e-12), expected: true },
    { name: 'tangent: the coefficient of x⁵ is 2/15', kind: 'value', expr: close('stream_ref(tangent_series, 5)', 2 / 15, 1e-12), expected: true },
  ],
  solution: `function div_series(s1, s2) {
  const c = head(s2);
  return c === 0
    ? error("div_series: the denominator has a zero constant term")
    : scale_stream(mul_series(s1, invert_unit_series(scale_stream(s2, 1 / c))), 1 / c);
}

const tangent_series = div_series(sine_series, cosine_series);
`,
};
