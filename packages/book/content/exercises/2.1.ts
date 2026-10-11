import {
  centerWidthDefinitions,
  gcdDefinitions,
  intervalDefinitions,
  intervalRepresentationDefinitions,
  parallelDefinitions,
} from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §2.1. */

export const exercise_2_1: ExerciseSpec = {
  id: '2.1',
  prelude: `${gcdDefinitions}
type Rational = Pair<number, number>;

const numer = (x: Rational): number =>
  head(x);

const denom = (x: Rational): number =>
  tail(x);

const print_rat = (x: Rational): string =>
  display(stringify(numer(x)) + " / " + stringify(denom(x)));`,
  starter: `// The type Rational, gcd, numer, denom and print_rat are provided; a Rational
// is a pair, and numer and denom are head and tail.

// Reduce to lowest terms, and normalize the sign: a positive rational number
// has a positive numerator and denominator, a negative one has a negative
// numerator and a positive denominator.
const make_rat = (n: number, d: number): Rational => {
  // your answer
};
`,
  tests: [
    { name: 'a negative denominator', kind: 'value', expr: 'print_rat(make_rat(3, -6))', expected: '-1 / 2' },
    { name: 'a negative numerator', kind: 'value', expr: 'print_rat(make_rat(-3, 6))', expected: '-1 / 2' },
    { name: 'both negative', kind: 'value', expr: 'print_rat(make_rat(-3, -6))', expected: '1 / 2' },
    { name: 'both positive, still reduced', kind: 'value', expr: 'print_rat(make_rat(6, 9))', expected: '2 / 3' },
    { name: 'a larger example', kind: 'value', expr: 'print_rat(make_rat(84, -36))', expected: '-7 / 3' },
  ],
  solution: `const make_rat = (n: number, d: number): Rational => {
  const g = math_abs(gcd(n, d));
  const sign = d < 0 ? -1 : 1;
  return pair(sign * n / g, sign * d / g);
};
`,
};

export const exercise_2_2: ExerciseSpec = {
  id: '2.2',
  starter: `type Point = Pair<number, number>;
type Segment = Pair<Point, Point>;

const make_point = (x: number, y: number): Point => {
  // your answer
};

const x_point = (p: Point): number => {
  // your answer
};

const y_point = (p: Point): number => {
  // your answer
};

const make_segment = (start: Point, end: Point): Segment => {
  // your answer
};

const start_segment = (s: Segment): Point => {
  // your answer
};

const end_segment = (s: Segment): Point => {
  // your answer
};

// The point halfway between the endpoints, using only the functions above.
const midpoint_segment = (s: Segment): Point => {
  // your answer
};

const print_point = (p: Point): string =>
  display("(" + stringify(x_point(p)) + ", "
                     + stringify(y_point(p)) + ")");

print_point(midpoint_segment(make_segment(make_point(0, 0), make_point(4, 6))));
`,
  tests: [
    { name: 'a point', kind: 'value', expr: 'print_point(make_point(3, -1))', expected: '(3, -1)' },
    { name: 'the start of a segment', kind: 'value', expr: 'print_point(start_segment(make_segment(make_point(1, 2), make_point(5, 8))))', expected: '(1, 2)' },
    { name: 'the end of a segment', kind: 'value', expr: 'print_point(end_segment(make_segment(make_point(1, 2), make_point(5, 8))))', expected: '(5, 8)' },
    { name: 'a midpoint', kind: 'value', expr: 'print_point(midpoint_segment(make_segment(make_point(0, 0), make_point(4, 6))))', expected: '(2, 3)' },
    { name: 'a midpoint off the grid', kind: 'value', expr: 'print_point(midpoint_segment(make_segment(make_point(-3, 1), make_point(2, 4))))', expected: '(-0.5, 2.5)' },
  ],
  solution: `type Point = Pair<number, number>;
type Segment = Pair<Point, Point>;

const make_point = (x: number, y: number): Point =>
  pair(x, y);

const x_point = (p: Point): number =>
  head(p);

const y_point = (p: Point): number =>
  tail(p);

const make_segment = (start: Point, end: Point): Segment =>
  pair(start, end);

const start_segment = (s: Segment): Point =>
  head(s);

const end_segment = (s: Segment): Point =>
  tail(s);

const average = (a: number, b: number): number =>
  (a + b) / 2;

const midpoint_segment = (s: Segment): Point => {
  const a = start_segment(s);
  const b = end_segment(s);
  return make_point(average(x_point(a), x_point(b)),
                    average(y_point(a), y_point(b)));
};

const print_point = (p: Point): string =>
  display("(" + stringify(x_point(p)) + ", "
                     + stringify(y_point(p)) + ")");

print_point(midpoint_segment(make_segment(make_point(0, 0), make_point(4, 6))));
`,
};

const points = `type Point = Pair<number, number>;

const make_point = (x: number, y: number): Point =>
  pair(x, y);

const x_point = (p: Point): number =>
  head(p);

const y_point = (p: Point): number =>
  tail(p);`;

export const exercise_2_3: ExerciseSpec = {
  id: '2.3',
  prelude: points,
  starter: `// The type Point, make_point, x_point and y_point are provided, as in
// Exercise 2.2.
// Rectangles have their sides parallel to the axes.

// Above the barrier: perimeter and area use only width_rect and height_rect.
const perimeter = (r: Rectangle): number => {
  // your answer
};

const area = (r: Rectangle): number => {
  // your answer
};

// Representation 1: a rectangle is a pair of opposite corners, in either order.
type Rectangle = Pair<Point, Point>;

const make_rect = (corner: Point, opposite: Point): Rectangle => {
  // your answer
};

const width_rect = (r: Rectangle): number => {
  // your answer
};

const height_rect = (r: Rectangle): number => {
  // your answer
};

// Representation 2: a rectangle is its bottom-left corner, paired with its
// width and its height. Its selectors must agree with representation 1's.
type Rectangle_2 = Pair<Point, Pair<number, number>>;

const make_rect_2 = (corner: Point, width: number, height: number): Rectangle_2 => {
  // your answer
};

const width_rect_2 = (r: Rectangle_2): number => {
  // your answer
};

const height_rect_2 = (r: Rectangle_2): number => {
  // your answer
};
`,
  tests: [
    { name: 'perimeter', kind: 'value', expr: 'perimeter(make_rect(make_point(1, 1), make_point(4, 5)))', expected: 14 },
    { name: 'area', kind: 'value', expr: 'area(make_rect(make_point(1, 1), make_point(4, 5)))', expected: 12 },
    { name: 'corners in the other order', kind: 'value', expr: 'area(make_rect(make_point(4, 1), make_point(1, 5)))', expected: 12 },
    { name: 'representation 2: width', kind: 'value', expr: 'width_rect_2(make_rect_2(make_point(1, 1), 3, 4))', expected: 3 },
    { name: 'representation 2: height', kind: 'value', expr: 'height_rect_2(make_rect_2(make_point(-2, 0), 7, 2))', expected: 2 },
  ],
  solution: `const perimeter = (r: Rectangle): number =>
  2 * (width_rect(r) + height_rect(r));

const area = (r: Rectangle): number =>
  width_rect(r) * height_rect(r);

// Representation 1: a pair of opposite corners.
type Rectangle = Pair<Point, Point>;

const make_rect = (corner: Point, opposite: Point): Rectangle =>
  pair(corner, opposite);

const width_rect = (r: Rectangle): number =>
  math_abs(x_point(tail(r)) - x_point(head(r)));

const height_rect = (r: Rectangle): number =>
  math_abs(y_point(tail(r)) - y_point(head(r)));

// Representation 2: a corner, paired with the width and the height.
type Rectangle_2 = Pair<Point, Pair<number, number>>;

const make_rect_2 = (corner: Point, width: number, height: number): Rectangle_2 =>
  pair(corner, pair(width, height));

const width_rect_2 = (r: Rectangle_2): number =>
  head(tail(r));

const height_rect_2 = (r: Rectangle_2): number =>
  tail(tail(r));
`,
};

export const exercise_2_4: ExerciseSpec = {
  id: '2.4',
  starter: `// A pair is a function that hands both of its parts to the function m.
type Pair<H, T> = <R>(m: (x: H, y: T) => R) => R;

const pair = <H, T>(x: H, y: T): Pair<H, T> =>
  m => m(x, y);

const head = <H, T>(z: Pair<H, T>): H =>
  z((p, q) => p);

const tail = <H, T>(z: Pair<H, T>): T => {
  // your answer
};
`,
  tests: [
    { name: 'head', kind: 'value', expr: 'head(pair(1, 2))', expected: 1 },
    { name: 'tail', kind: 'value', expr: 'tail(pair(1, 2))', expected: 2 },
    { name: 'pairs of pairs', kind: 'value', expr: 'tail(tail(pair(1, pair(2, 3))))', expected: 3 },
    { name: 'any objects', kind: 'value', expr: 'head(tail(pair("a", pair("b", null))))', expected: 'b' },
  ],
  solution: `type Pair<H, T> = <R>(m: (x: H, y: T) => R) => R;

const pair = <H, T>(x: H, y: T): Pair<H, T> =>
  m => m(x, y);

const head = <H, T>(z: Pair<H, T>): H =>
  z((p, q) => p);

const tail = <H, T>(z: Pair<H, T>): T =>
  z((p, q) => q);
`,
};

export const exercise_2_5: ExerciseSpec = {
  id: '2.5',
  starter: `// The pair of nonnegative integers a and b is the number 2^a 3^b.

const pair = (a: number, b: number): number => {
  // your answer
};

const head = (z: number): number => {
  // your answer
};

const tail = (z: number): number => {
  // your answer
};
`,
  tests: [
    { name: 'a pair is a number', kind: 'value', expr: 'pair(3, 2)', expected: 72 },
    { name: 'head', kind: 'value', expr: 'head(pair(3, 2))', expected: 3 },
    { name: 'tail', kind: 'value', expr: 'tail(pair(3, 2))', expected: 2 },
    { name: 'zeros', kind: 'value', expr: 'head(pair(0, 5)) + tail(pair(7, 0))', expected: 0 },
    { name: 'larger exponents', kind: 'value', expr: 'head(pair(10, 12)) * 100 + tail(pair(10, 12))', expected: 1012 },
  ],
  solution: `const pair = (a: number, b: number): number =>
  math_pow(2, a) * math_pow(3, b);

// How many times d divides n.
const count_factors = (n: number, d: number): number =>
  n % d === 0
    ? 1 + count_factors(n / d, d)
    : 0;

const head = (z: number): number =>
  count_factors(z, 2);

const tail = (z: number): number =>
  count_factors(z, 3);
`,
};

export const exercise_2_6: ExerciseSpec = {
  id: '2.6',
  prelude: `// A Church numeral n applies a function n times.
type Church = <T>(f: (x: T) => T) => (x: T) => T;

// The ordinary number a Church numeral stands for.
const church_to_number = (n: Church): number =>
  n(k => k + 1)(0);`,
  starter: `// church_to_number(n) is provided: it applies n to k => k + 1 and 0.

// A Church numeral n applies a function n times.
type Church = <T>(f: (x: T) => T) => (x: T) => T;

const zero: Church = f => x => x;

const add_1 = (n: Church): Church =>
  f => x => f(n(f)(x));

// Directly, without zero or add_1.
const one = undefined;  // your answer
const two = undefined;  // your answer

// m + n, without applying add_1 repeatedly.
const plus = (m: Church, n: Church): Church => {
  // your answer
};
`,
  tests: [
    { name: 'one', kind: 'value', expr: 'church_to_number(one)', expected: 1 },
    { name: 'two', kind: 'value', expr: 'church_to_number(two)', expected: 2 },
    { name: 'two applies f twice', kind: 'value', expr: 'two(x => x * 3)(1)', expected: 9 },
    { name: 'two plus one', kind: 'value', expr: 'church_to_number(plus(two, one))', expected: 3 },
    { name: 'plus agrees with add_1', kind: 'value', expr: 'church_to_number(plus(add_1(two), two))', expected: 5 },
    { name: 'zero plus zero', kind: 'value', expr: 'church_to_number(plus(zero, zero))', expected: 0 },
  ],
  solution: `type Church = <T>(f: (x: T) => T) => (x: T) => T;

const zero: Church = f => x => x;

const add_1 = (n: Church): Church =>
  f => x => f(n(f)(x));

const one: Church = f => x => f(x);
const two: Church = f => x => f(f(x));

// Apply f n times, then m more times.
const plus = (m: Church, n: Church): Church =>
  f => x => m(f)(n(f)(x));
`,
};

const alyssa = `const add_interval = (x: Interval, y: Interval): Interval =>
  make_interval(lower_bound(x) + lower_bound(y),
                       upper_bound(x) + upper_bound(y));

const mul_interval = (x: Interval, y: Interval): Interval => {
  const p1 = lower_bound(x) * lower_bound(y);
  const p2 = lower_bound(x) * upper_bound(y);
  const p3 = upper_bound(x) * lower_bound(y);
  const p4 = upper_bound(x) * upper_bound(y);
  return make_interval(math_min(p1, p2, p3, p4),
                       math_max(p1, p2, p3, p4));
};

const div_interval = (x: Interval, y: Interval): Interval =>
  mul_interval(x, make_interval(1 / upper_bound(y),
                                       1 / lower_bound(y)));
`;

export const exercise_2_7: ExerciseSpec = {
  id: '2.7',
  starter: `type Interval = Pair<number, number>;

const make_interval = (x: number, y: number): Interval =>
  pair(x, y);

const lower_bound = (i: Interval): number => {
  // your answer
};

const upper_bound = (i: Interval): number => {
  // your answer
};

${alyssa}`,
  tests: [
    { name: 'the bounds', kind: 'value', expr: 'lower_bound(make_interval(1, 2)) * 10 + upper_bound(make_interval(1, 2))', expected: 12 },
    { name: 'a sum', kind: 'value', expr: 'upper_bound(add_interval(make_interval(1, 2), make_interval(3, 5)))', expected: 7 },
    { name: 'a product', kind: 'value', expr: 'lower_bound(mul_interval(make_interval(-1, 2), make_interval(3, 4)))', expected: -4 },
    { name: 'a quotient', kind: 'value', expr: 'upper_bound(div_interval(make_interval(1, 2), make_interval(4, 8)))', expected: 0.5 },
  ],
  solution: `type Interval = Pair<number, number>;

const make_interval = (x: number, y: number): Interval =>
  pair(x, y);

const lower_bound = (i: Interval): number =>
  head(i);

const upper_bound = (i: Interval): number =>
  tail(i);

${alyssa}`,
};

const intervals = `${intervalRepresentationDefinitions}
${intervalDefinitions}`;

/** Both bounds as one string, so a test can compare a whole interval. */
const bounds = `const bounds = (i: Interval): string =>
  stringify(lower_bound(i)) + ", " + stringify(upper_bound(i));`;

export const exercise_2_8: ExerciseSpec = {
  id: '2.8',
  prelude: `${intervals}
${bounds}`,
  starter: `// The type Interval, make_interval, lower_bound, upper_bound, add_interval,
// mul_interval and div_interval are provided.

const sub_interval = (x: Interval, y: Interval): Interval => {
  // your answer
};
`,
  tests: [
    { name: '[5, 10] − [1, 2]', kind: 'value', expr: 'bounds(sub_interval(make_interval(5, 10), make_interval(1, 2)))', expected: '3, 9' },
    { name: '[−1, 1] − [−1, 1]', kind: 'value', expr: 'bounds(sub_interval(make_interval(-1, 1), make_interval(-1, 1)))', expected: '-2, 2' },
    { name: '[0, 1] − [3, 7]', kind: 'value', expr: 'bounds(sub_interval(make_interval(0, 1), make_interval(3, 7)))', expected: '-7, -2' },
  ],
  solution: `const sub_interval = (x: Interval, y: Interval): Interval =>
  make_interval(lower_bound(x) - upper_bound(y),
                       upper_bound(x) - lower_bound(y));
`,
};

const subAndWidth = `const sub_interval = (x: Interval, y: Interval): Interval =>
  make_interval(lower_bound(x) - upper_bound(y),
                       upper_bound(x) - lower_bound(y));

const width = (i: Interval): number =>
  (upper_bound(i) - lower_bound(i)) / 2;`;

export const exercise_2_9: ExerciseSpec = {
  id: '2.9',
  prelude: `${intervals}
${subAndWidth}`,
  starter: `// Interval arithmetic, sub_interval and width are provided.

// The width of the sum of two intervals, from their widths alone.
const width_of_sum = (w1: number, w2: number): number => {
  // your answer
};

// The width of the difference of two intervals, from their widths alone.
const width_of_difference = (w1: number, w2: number): number => {
  // your answer
};

// Multiplication has no such function. Complete the counterexample:
// a1 and a2 have the same width, b1 and b2 have the same width, but
// mul_interval(a1, b1) and mul_interval(a2, b2) do not.
const a1 = make_interval(0, 1);
const a2 = make_interval(0, 1);
const b1 = make_interval(0, 1);
const b2 = make_interval(0, 1);
`,
  tests: [
    { name: 'the width of a sum', kind: 'value', expr: 'width(add_interval(make_interval(1, 3), make_interval(2, 7))) === width_of_sum(1, 2.5)', expected: true },
    { name: 'the width of another sum', kind: 'value', expr: 'width(add_interval(make_interval(-4, 0), make_interval(10, 11))) === width_of_sum(2, 0.5)', expected: true },
    { name: 'the width of a difference', kind: 'value', expr: 'width(sub_interval(make_interval(1, 3), make_interval(2, 7))) === width_of_difference(1, 2.5)', expected: true },
    { name: 'the factors have equal widths', kind: 'value', expr: 'width(a1) === width(a2) && width(b1) === width(b2)', expected: true },
    { name: 'the products do not', kind: 'value', expr: 'width(mul_interval(a1, b1)) !== width(mul_interval(a2, b2))', expected: true },
  ],
  solution: `const width_of_sum = (w1: number, w2: number): number =>
  w1 + w2;

const width_of_difference = (w1: number, w2: number): number =>
  w1 + w2;

// Both a's have width 0.5, but a2 sits much further from zero.
const a1 = make_interval(0, 1);
const a2 = make_interval(10, 11);
const b1 = make_interval(0, 1);
const b2 = make_interval(0, 1);
`,
};

export const exercise_2_10: ExerciseSpec = {
  id: '2.10',
  prelude: `${intervalRepresentationDefinitions}
const add_interval = (x: Interval, y: Interval): Interval =>
  make_interval(lower_bound(x) + lower_bound(y),
                       upper_bound(x) + upper_bound(y));

const mul_interval = (x: Interval, y: Interval): Interval => {
  const p1 = lower_bound(x) * lower_bound(y);
  const p2 = lower_bound(x) * upper_bound(y);
  const p3 = upper_bound(x) * lower_bound(y);
  const p4 = upper_bound(x) * upper_bound(y);
  return make_interval(math_min(p1, p2, p3, p4),
                       math_max(p1, p2, p3, p4));
};`,
  starter: `// The type Interval, make_interval, lower_bound, upper_bound, add_interval
// and mul_interval are provided.

// True when the interval contains zero, endpoints included.
const spans_zero = (i: Interval): boolean => {
  // your answer
};

// Make div_interval use spans_zero to signal an error.
const div_interval = (x: Interval, y: Interval): Interval =>
  mul_interval(x, make_interval(1 / upper_bound(y),
                                       1 / lower_bound(y)));
`,
  tests: [
    { name: '[−1, 1] spans zero', kind: 'value', expr: 'spans_zero(make_interval(-1, 1))', expected: true },
    { name: 'an endpoint at zero counts', kind: 'value', expr: 'spans_zero(make_interval(0, 2)) && spans_zero(make_interval(-2, 0))', expected: true },
    { name: 'positive and negative intervals do not', kind: 'value', expr: 'spans_zero(make_interval(1, 2)) || spans_zero(make_interval(-3, -1))', expected: false },
    { name: 'division still divides', kind: 'value', expr: 'upper_bound(div_interval(make_interval(1, 2), make_interval(4, 8)))', expected: 0.5 },
    { name: 'div_interval checks its divisor', kind: 'calls', call: 'div_interval(make_interval(1, 2), make_interval(4, 8))', fn: 'spans_zero', atMost: 1 },
    { name: 'dividing by an interval that spans zero is an error', kind: 'error', call: 'div_interval(make_interval(1, 2), make_interval(-1, 1))' },
  ],
  solution: `const spans_zero = (i: Interval): boolean =>
  lower_bound(i) <= 0 && upper_bound(i) >= 0;

const div_interval = (x: Interval, y: Interval): Interval =>
  spans_zero(y)
    ? error("division by an interval that spans zero", y)
    : mul_interval(x, make_interval(1 / upper_bound(y),
                                    1 / lower_bound(y)));
`,
};

/** The nine sign cases of Exercise 2.11, each with the bounds Alyssa's version gives. */
const signed: Record<string, [number, number]> = { positive: [2, 3], spanning: [-1, 4], negative: [-5, -2] };
const ninecases = Object.entries(signed).flatMap(([xs, x]) =>
  Object.entries(signed).map(([ys, y]) => {
    const products = [x[0] * y[0], x[0] * y[1], x[1] * y[0], x[1] * y[1]];
    return {
      name: `${xs} × ${ys}`,
      kind: 'value' as const,
      expr: `bounds(mul_interval(make_interval(${x[0]}, ${x[1]}), make_interval(${y[0]}, ${y[1]})))`,
      expected: `${Math.min(...products)}, ${Math.max(...products)}`,
    };
  }),
);

export const exercise_2_11: ExerciseSpec = {
  id: '2.11',
  prelude: `${intervalRepresentationDefinitions}
${bounds}

const mul = (a: number, b: number): number =>
  a * b;`,
  starter: `// The type Interval, make_interval, lower_bound and upper_bound are provided,
// and mul(a, b),
// which multiplies two numbers. Use mul for every multiplication, so that the
// checker can count them.

// Nine cases on the signs of the endpoints: each interval is nonnegative,
// nonpositive, or spans zero.
const mul_interval = (x: Interval, y: Interval): Interval => {
  // your answer
};
`,
  tests: [
    ...ninecases,
    { name: 'an endpoint at zero', kind: 'value', expr: 'bounds(mul_interval(make_interval(0, 2), make_interval(-3, -1)))', expected: '-6, 0' },
    { name: 'two multiplications for positive intervals', kind: 'calls', call: 'mul_interval(make_interval(2, 3), make_interval(4, 5))', fn: 'mul', atMost: 2 },
    { name: 'two when only one interval spans zero', kind: 'calls', call: 'mul_interval(make_interval(-1, 4), make_interval(-5, -2))', fn: 'mul', atMost: 2 },
    { name: 'four when both span zero', kind: 'calls', call: 'mul_interval(make_interval(-1, 4), make_interval(-2, 3))', fn: 'mul', atMost: 4 },
  ],
  solution: `const mul_interval = (x: Interval, y: Interval): Interval => {
  const xl = lower_bound(x);
  const xu = upper_bound(x);
  const yl = lower_bound(y);
  const yu = upper_bound(y);
  const x_pos = xl >= 0;
  const x_neg = xu <= 0;
  const y_pos = yl >= 0;
  const y_neg = yu <= 0;
  return x_pos
    ? (y_pos
       ? make_interval(mul(xl, yl), mul(xu, yu))
       : y_neg
       ? make_interval(mul(xu, yl), mul(xl, yu))
       : make_interval(mul(xu, yl), mul(xu, yu)))
    : x_neg
    ? (y_pos
       ? make_interval(mul(xl, yu), mul(xu, yl))
       : y_neg
       ? make_interval(mul(xu, yu), mul(xl, yl))
       : make_interval(mul(xl, yu), mul(xl, yl)))
    : (y_pos
       ? make_interval(mul(xl, yu), mul(xu, yu))
       : y_neg
       ? make_interval(mul(xu, yl), mul(xl, yl))
       // Both span zero: the only case that needs four.
       : make_interval(math_min(mul(xl, yu), mul(xu, yl)),
                       math_max(mul(xl, yl), mul(xu, yu))));
};
`,
};

export const exercise_2_12: ExerciseSpec = {
  id: '2.12',
  prelude: `${intervals}
${centerWidthDefinitions}`,
  starter: `// Interval arithmetic, make_center_width, center and width are provided.

// An interval from its center and a percentage tolerance:
// make_center_percent(6.8, 10) is 6.8 ohms ± 10%.
const make_center_percent = (c: number, p: number): Interval => {
  // your answer
};

const percent = (i: Interval): number => {
  // your answer
};
`,
  tests: [
    { name: 'the lower bound', kind: 'value', expr: close('lower_bound(make_center_percent(10, 5))', 9.5, 1e-9), expected: true },
    { name: 'the upper bound', kind: 'value', expr: close('upper_bound(make_center_percent(6.8, 10))', 7.48, 1e-9), expected: true },
    { name: 'the center survives', kind: 'value', expr: close('center(make_center_percent(6.8, 10))', 6.8, 1e-9), expected: true },
    { name: 'the percentage survives', kind: 'value', expr: close('percent(make_center_percent(6.8, 10))', 10, 1e-9), expected: true },
    { name: 'the percentage of [9, 11]', kind: 'value', expr: close('percent(make_interval(9, 11))', 10, 1e-9), expected: true },
  ],
  solution: `const make_center_percent = (c: number, p: number): Interval =>
  make_center_width(c, c * p / 100);

const percent = (i: Interval): number =>
  width(i) / center(i) * 100;
`,
};

const centerPercent = `${centerWidthDefinitions}
const make_center_percent = (c: number, p: number): Interval =>
  make_center_width(c, c * p / 100);

const percent = (i: Interval): number =>
  width(i) / center(i) * 100;
`;

export const exercise_2_13: ExerciseSpec = {
  id: '2.13',
  prelude: `${intervals}
${centerPercent}`,
  starter: `// Interval arithmetic, center, width, make_center_percent and percent are provided.

// The approximate percentage tolerance of the product of two positive
// intervals with small tolerances p1 and p2.
const product_percent = (p1: number, p2: number): number => {
  // your answer
};
`,
  tests: [
    { name: '1% times 2%', kind: 'value', expr: close('product_percent(1, 2)', 3, 0.01), expected: true },
    { name: '0.5% times 0.25%', kind: 'value', expr: close('product_percent(0.5, 0.25)', 0.75, 0.001), expected: true },
    {
      name: 'it matches mul_interval',
      kind: 'value',
      expr: close('product_percent(0.5, 0.25) - percent(mul_interval(make_center_percent(6.8, 0.5), make_center_percent(4.7, 0.25)))', 0, 0.001),
      expected: true,
    },
  ],
  solution: `// Tolerances add: the exact value is (p1 + p2) / (1 + p1 p2 / 10000).
const product_percent = (p1: number, p2: number): number =>
  p1 + p2;
`,
};

const resistors = `${intervals}
${centerPercent}
${parallelDefinitions}`;

/** The percentages the starter of Exercise 2.14 asks for, computed exactly as the system does. */
const pct = (lo: number, hi: number): number => ((hi - lo) / 2 / ((hi + lo) / 2)) * 100;
const interval = (c: number, p: number): [number, number] => [c - (c * p) / 100, c + (c * p) / 100];
const mul = ([a, b]: [number, number], [c, d]: [number, number]): [number, number] => {
  const ps = [a * c, a * d, b * c, b * d];
  return [Math.min(...ps), Math.max(...ps)];
};
const div = (x: [number, number], [c, d]: [number, number]): [number, number] => mul(x, [1 / d, 1 / c]);
const add = ([a, b]: [number, number], [c, d]: [number, number]): [number, number] => [a + c, b + d];
const A = interval(100, 1);
const B = interval(200, 2);
const ONE: [number, number] = [1, 1];
const expected = {
  aOverA: pct(...div(A, A)),
  aOverB: pct(...div(A, B)),
  par1: pct(...div(mul(A, B), add(A, B))),
  par2: pct(...div(ONE, add(div(ONE, A), div(ONE, B)))),
};

export const exercise_2_14: ExerciseSpec = {
  id: '2.14',
  prelude: resistors,
  starter: `// Interval arithmetic, center, width, make_center_percent, percent,
// par1 and par2 are provided.

const A = make_center_percent(100, 1);
const B = make_center_percent(200, 2);

// Compute each of these and look at it in center-percent form, for example
// center(div_interval(A, A)) and percent(div_interval(A, A)).
// Record the percentages to one decimal place.
const percent_a_over_a = 0;  // A / A, which is exactly 1 for any number
const percent_a_over_b = 0;  // A / B
const percent_par1 = 0;      // par1(A, B)
const percent_par2 = 0;      // par2(A, B)
`,
  tests: [
    { name: 'A / A', kind: 'value', expr: close('percent_a_over_a', expected.aOverA, 0.051), expected: true },
    { name: 'A / B', kind: 'value', expr: close('percent_a_over_b', expected.aOverB, 0.051), expected: true },
    { name: 'par1(A, B)', kind: 'value', expr: close('percent_par1', expected.par1, 0.051), expected: true },
    { name: 'par2(A, B)', kind: 'value', expr: close('percent_par2', expected.par2, 0.051), expected: true },
  ],
  solution: `const A = make_center_percent(100, 1);
const B = make_center_percent(200, 2);

const percent_a_over_a = 2.0;
const percent_a_over_b = 3.0;
const percent_par1 = 4.7;
const percent_par2 = 1.3;
`,
};

export const exercise_2_15: ExerciseSpec = {
  id: '2.15',
  prelude: resistors,
  starter: `// Interval arithmetic, center, width, make_center_percent, percent,
// par1 and par2 are provided.

// The true range of 1 / (1/r1 + 1/r2) as r1 and r2 vary over their
// intervals. The formula grows as r1 grows and as r2 grows.
const exact_par = (r1: Interval, r2: Interval): Interval => {
  // your answer
};

// Which program computes exactly that range: "par1" or "par2"?
const exact = "";
`,
  tests: [
    { name: 'the lower end of the true range', kind: 'value', expr: close('lower_bound(exact_par(make_interval(6.12, 7.48), make_interval(4.465, 4.935)))', 2.581558809636278, 1e-9), expected: true },
    { name: 'the upper end of the true range', kind: 'value', expr: close('upper_bound(exact_par(make_interval(6.12, 7.48), make_interval(4.465, 4.935)))', 2.97332259363673, 1e-9), expected: true },
    { name: 'another pair of resistors', kind: 'value', expr: close('upper_bound(exact_par(make_interval(1, 3), make_interval(2, 6)))', 2, 1e-9), expected: true },
    { name: 'the program that is exact', kind: 'value', expr: 'exact', expected: 'par2' },
  ],
  solution: `const exact_par = (r1: Interval, r2: Interval): Interval => {
  const par = (a: number, b: number): number =>
    1 / (1 / a + 1 / b);
  return make_interval(par(lower_bound(r1), lower_bound(r2)),
                       par(upper_bound(r1), upper_bound(r2)));
};

const exact = "par2";
`,
};

export const exercise_2_16: ExerciseSpec = {
  id: '2.16',
  prelude: `${intervals}
${bounds}`,
  starter: `// Interval arithmetic is provided, and bounds(i), which shows both bounds.

// mul_interval(x, x) cannot know that its arguments are the same quantity.
// Choose x so that mul_interval(x, x) includes negative numbers, which no
// square can be.
const x = make_interval(1, 2);

// The true range of the square of a number in the interval i.
const square_interval = (i: Interval): Interval => {
  // your answer
};
`,
  tests: [
    { name: 'the counterexample', kind: 'value', expr: 'lower_bound(mul_interval(x, x)) < 0', expected: true },
    { name: 'a positive interval', kind: 'value', expr: 'bounds(square_interval(make_interval(2, 3)))', expected: '4, 9' },
    { name: 'a negative interval', kind: 'value', expr: 'bounds(square_interval(make_interval(-3, -2)))', expected: '4, 9' },
    { name: 'an interval spanning zero', kind: 'value', expr: 'bounds(square_interval(make_interval(-1, 2)))', expected: '0, 4' },
    { name: 'another one', kind: 'value', expr: 'bounds(square_interval(make_interval(-3, 1)))', expected: '0, 9' },
  ],
  solution: `const x = make_interval(-1, 2);

const square_interval = (i: Interval): Interval => {
  const lo = math_abs(lower_bound(i));
  const hi = math_abs(upper_bound(i));
  return lower_bound(i) <= 0 && upper_bound(i) >= 0
    ? make_interval(0, math_max(lo, hi) * math_max(lo, hi))
    : make_interval(math_min(lo, hi) * math_min(lo, hi),
                    math_max(lo, hi) * math_max(lo, hi));
};
`,
};
