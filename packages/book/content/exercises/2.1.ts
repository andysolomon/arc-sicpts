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
function numer(x) {
  return head(x);
}

function denom(x) {
  return tail(x);
}

function print_rat(x) {
  return display(stringify(numer(x)) + " / " + stringify(denom(x)));
}`,
  starter: `// gcd, numer, denom and print_rat are provided; numer and denom are head and tail.

// Reduce to lowest terms, and normalize the sign: a positive rational number
// has a positive numerator and denominator, a negative one has a negative
// numerator and a positive denominator.
function make_rat(n, d) {
  // your answer
}
`,
  tests: [
    { name: 'a negative denominator', kind: 'value', expr: 'print_rat(make_rat(3, -6))', expected: '-1 / 2' },
    { name: 'a negative numerator', kind: 'value', expr: 'print_rat(make_rat(-3, 6))', expected: '-1 / 2' },
    { name: 'both negative', kind: 'value', expr: 'print_rat(make_rat(-3, -6))', expected: '1 / 2' },
    { name: 'both positive, still reduced', kind: 'value', expr: 'print_rat(make_rat(6, 9))', expected: '2 / 3' },
    { name: 'a larger example', kind: 'value', expr: 'print_rat(make_rat(84, -36))', expected: '-7 / 3' },
  ],
  solution: `function make_rat(n, d) {
  const g = math_abs(gcd(n, d));
  const sign = d < 0 ? -1 : 1;
  return pair(sign * n / g, sign * d / g);
}
`,
};

export const exercise_2_2: ExerciseSpec = {
  id: '2.2',
  starter: `function make_point(x, y) {
  // your answer
}

function x_point(p) {
  // your answer
}

function y_point(p) {
  // your answer
}

function make_segment(start, end) {
  // your answer
}

function start_segment(s) {
  // your answer
}

function end_segment(s) {
  // your answer
}

// The point halfway between the endpoints, using only the functions above.
function midpoint_segment(s) {
  // your answer
}

function print_point(p) {
  return display("(" + stringify(x_point(p)) + ", "
                     + stringify(y_point(p)) + ")");
}

print_point(midpoint_segment(make_segment(make_point(0, 0), make_point(4, 6))));
`,
  tests: [
    { name: 'a point', kind: 'value', expr: 'print_point(make_point(3, -1))', expected: '(3, -1)' },
    { name: 'the start of a segment', kind: 'value', expr: 'print_point(start_segment(make_segment(make_point(1, 2), make_point(5, 8))))', expected: '(1, 2)' },
    { name: 'the end of a segment', kind: 'value', expr: 'print_point(end_segment(make_segment(make_point(1, 2), make_point(5, 8))))', expected: '(5, 8)' },
    { name: 'a midpoint', kind: 'value', expr: 'print_point(midpoint_segment(make_segment(make_point(0, 0), make_point(4, 6))))', expected: '(2, 3)' },
    { name: 'a midpoint off the grid', kind: 'value', expr: 'print_point(midpoint_segment(make_segment(make_point(-3, 1), make_point(2, 4))))', expected: '(-0.5, 2.5)' },
  ],
  solution: `function make_point(x, y) {
  return pair(x, y);
}

function x_point(p) {
  return head(p);
}

function y_point(p) {
  return tail(p);
}

function make_segment(start, end) {
  return pair(start, end);
}

function start_segment(s) {
  return head(s);
}

function end_segment(s) {
  return tail(s);
}

function average(a, b) {
  return (a + b) / 2;
}

function midpoint_segment(s) {
  const a = start_segment(s);
  const b = end_segment(s);
  return make_point(average(x_point(a), x_point(b)),
                    average(y_point(a), y_point(b)));
}

function print_point(p) {
  return display("(" + stringify(x_point(p)) + ", "
                     + stringify(y_point(p)) + ")");
}

print_point(midpoint_segment(make_segment(make_point(0, 0), make_point(4, 6))));
`,
};

const points = `function make_point(x, y) {
  return pair(x, y);
}

function x_point(p) {
  return head(p);
}

function y_point(p) {
  return tail(p);
}`;

export const exercise_2_3: ExerciseSpec = {
  id: '2.3',
  prelude: points,
  starter: `// make_point, x_point and y_point are provided, as in Exercise 2.2.
// Rectangles have their sides parallel to the axes.

// Above the barrier: perimeter and area use only width_rect and height_rect.
function perimeter(r) {
  // your answer
}

function area(r) {
  // your answer
}

// Representation 1: a rectangle is a pair of opposite corners, in either order.
function make_rect(corner, opposite) {
  // your answer
}

function width_rect(r) {
  // your answer
}

function height_rect(r) {
  // your answer
}

// Representation 2: a rectangle is its bottom-left corner, its width and
// its height. Its selectors must agree with representation 1's.
function make_rect_2(corner, width, height) {
  // your answer
}

function width_rect_2(r) {
  // your answer
}

function height_rect_2(r) {
  // your answer
}
`,
  tests: [
    { name: 'perimeter', kind: 'value', expr: 'perimeter(make_rect(make_point(1, 1), make_point(4, 5)))', expected: 14 },
    { name: 'area', kind: 'value', expr: 'area(make_rect(make_point(1, 1), make_point(4, 5)))', expected: 12 },
    { name: 'corners in the other order', kind: 'value', expr: 'area(make_rect(make_point(4, 1), make_point(1, 5)))', expected: 12 },
    { name: 'representation 2: width', kind: 'value', expr: 'width_rect_2(make_rect_2(make_point(1, 1), 3, 4))', expected: 3 },
    { name: 'representation 2: height', kind: 'value', expr: 'height_rect_2(make_rect_2(make_point(-2, 0), 7, 2))', expected: 2 },
  ],
  solution: `function perimeter(r) {
  return 2 * (width_rect(r) + height_rect(r));
}

function area(r) {
  return width_rect(r) * height_rect(r);
}

function make_rect(corner, opposite) {
  return pair(corner, opposite);
}

function width_rect(r) {
  return math_abs(x_point(tail(r)) - x_point(head(r)));
}

function height_rect(r) {
  return math_abs(y_point(tail(r)) - y_point(head(r)));
}

function make_rect_2(corner, width, height) {
  return pair(corner, pair(width, height));
}

function width_rect_2(r) {
  return head(tail(r));
}

function height_rect_2(r) {
  return tail(tail(r));
}
`,
};

export const exercise_2_4: ExerciseSpec = {
  id: '2.4',
  starter: `function pair(x, y) {
  return m => m(x, y);
}

function head(z) {
  return z((p, q) => p);
}

function tail(z) {
  // your answer
}
`,
  tests: [
    { name: 'head', kind: 'value', expr: 'head(pair(1, 2))', expected: 1 },
    { name: 'tail', kind: 'value', expr: 'tail(pair(1, 2))', expected: 2 },
    { name: 'pairs of pairs', kind: 'value', expr: 'tail(tail(pair(1, pair(2, 3))))', expected: 3 },
    { name: 'any objects', kind: 'value', expr: 'head(tail(pair("a", pair("b", null))))', expected: 'b' },
  ],
  solution: `function pair(x, y) {
  return m => m(x, y);
}

function head(z) {
  return z((p, q) => p);
}

function tail(z) {
  return z((p, q) => q);
}
`,
};

export const exercise_2_5: ExerciseSpec = {
  id: '2.5',
  starter: `// The pair of nonnegative integers a and b is the number 2^a 3^b.

function pair(a, b) {
  // your answer
}

function head(z) {
  // your answer
}

function tail(z) {
  // your answer
}
`,
  tests: [
    { name: 'a pair is a number', kind: 'value', expr: 'pair(3, 2)', expected: 72 },
    { name: 'head', kind: 'value', expr: 'head(pair(3, 2))', expected: 3 },
    { name: 'tail', kind: 'value', expr: 'tail(pair(3, 2))', expected: 2 },
    { name: 'zeros', kind: 'value', expr: 'head(pair(0, 5)) + tail(pair(7, 0))', expected: 0 },
    { name: 'larger exponents', kind: 'value', expr: 'head(pair(10, 12)) * 100 + tail(pair(10, 12))', expected: 1012 },
  ],
  solution: `function pair(a, b) {
  return math_pow(2, a) * math_pow(3, b);
}

// How many times d divides n.
function count_factors(n, d) {
  return n % d === 0
    ? 1 + count_factors(n / d, d)
    : 0;
}

function head(z) {
  return count_factors(z, 2);
}

function tail(z) {
  return count_factors(z, 3);
}
`,
};

export const exercise_2_6: ExerciseSpec = {
  id: '2.6',
  prelude: `// The ordinary number a Church numeral stands for.
function church_to_number(n) {
  return n(k => k + 1)(0);
}`,
  starter: `// church_to_number(n) is provided: it applies n to k => k + 1 and 0.

const zero = f => x => x;

function add_1(n) {
  return f => x => f(n(f)(x));
}

// Directly, without zero or add_1.
const one = undefined;  // your answer
const two = undefined;  // your answer

// m + n, without applying add_1 repeatedly.
function plus(m, n) {
  // your answer
}
`,
  tests: [
    { name: 'one', kind: 'value', expr: 'church_to_number(one)', expected: 1 },
    { name: 'two', kind: 'value', expr: 'church_to_number(two)', expected: 2 },
    { name: 'two applies f twice', kind: 'value', expr: 'two(x => x * 3)(1)', expected: 9 },
    { name: 'two plus one', kind: 'value', expr: 'church_to_number(plus(two, one))', expected: 3 },
    { name: 'plus agrees with add_1', kind: 'value', expr: 'church_to_number(plus(add_1(two), two))', expected: 5 },
    { name: 'zero plus zero', kind: 'value', expr: 'church_to_number(plus(zero, zero))', expected: 0 },
  ],
  solution: `const zero = f => x => x;

function add_1(n) {
  return f => x => f(n(f)(x));
}

const one = f => x => f(x);
const two = f => x => f(f(x));

// Apply f n times, then m more times.
function plus(m, n) {
  return f => x => m(f)(n(f)(x));
}
`,
};

const alyssa = `function add_interval(x, y) {
  return make_interval(lower_bound(x) + lower_bound(y),
                       upper_bound(x) + upper_bound(y));
}

function mul_interval(x, y) {
  const p1 = lower_bound(x) * lower_bound(y);
  const p2 = lower_bound(x) * upper_bound(y);
  const p3 = upper_bound(x) * lower_bound(y);
  const p4 = upper_bound(x) * upper_bound(y);
  return make_interval(math_min(p1, p2, p3, p4),
                       math_max(p1, p2, p3, p4));
}

function div_interval(x, y) {
  return mul_interval(x, make_interval(1 / upper_bound(y),
                                       1 / lower_bound(y)));
}
`;

export const exercise_2_7: ExerciseSpec = {
  id: '2.7',
  starter: `function make_interval(x, y) {
  return pair(x, y);
}

function lower_bound(i) {
  // your answer
}

function upper_bound(i) {
  // your answer
}

${alyssa}`,
  tests: [
    { name: 'the bounds', kind: 'value', expr: 'lower_bound(make_interval(1, 2)) * 10 + upper_bound(make_interval(1, 2))', expected: 12 },
    { name: 'a sum', kind: 'value', expr: 'upper_bound(add_interval(make_interval(1, 2), make_interval(3, 5)))', expected: 7 },
    { name: 'a product', kind: 'value', expr: 'lower_bound(mul_interval(make_interval(-1, 2), make_interval(3, 4)))', expected: -4 },
    { name: 'a quotient', kind: 'value', expr: 'upper_bound(div_interval(make_interval(1, 2), make_interval(4, 8)))', expected: 0.5 },
  ],
  solution: `function make_interval(x, y) {
  return pair(x, y);
}

function lower_bound(i) {
  return head(i);
}

function upper_bound(i) {
  return tail(i);
}

${alyssa}`,
};

const intervals = `${intervalRepresentationDefinitions}
${intervalDefinitions}`;

/** Both bounds as one string, so a test can compare a whole interval. */
const bounds = `function bounds(i) {
  return stringify(lower_bound(i)) + ", " + stringify(upper_bound(i));
}`;

export const exercise_2_8: ExerciseSpec = {
  id: '2.8',
  prelude: `${intervals}
${bounds}`,
  starter: `// make_interval, lower_bound, upper_bound, add_interval, mul_interval and
// div_interval are provided.

function sub_interval(x, y) {
  // your answer
}
`,
  tests: [
    { name: '[5, 10] − [1, 2]', kind: 'value', expr: 'bounds(sub_interval(make_interval(5, 10), make_interval(1, 2)))', expected: '3, 9' },
    { name: '[−1, 1] − [−1, 1]', kind: 'value', expr: 'bounds(sub_interval(make_interval(-1, 1), make_interval(-1, 1)))', expected: '-2, 2' },
    { name: '[0, 1] − [3, 7]', kind: 'value', expr: 'bounds(sub_interval(make_interval(0, 1), make_interval(3, 7)))', expected: '-7, -2' },
  ],
  solution: `function sub_interval(x, y) {
  return make_interval(lower_bound(x) - upper_bound(y),
                       upper_bound(x) - lower_bound(y));
}
`,
};

const subAndWidth = `function sub_interval(x, y) {
  return make_interval(lower_bound(x) - upper_bound(y),
                       upper_bound(x) - lower_bound(y));
}

function width(i) {
  return (upper_bound(i) - lower_bound(i)) / 2;
}`;

export const exercise_2_9: ExerciseSpec = {
  id: '2.9',
  prelude: `${intervals}
${subAndWidth}`,
  starter: `// Interval arithmetic, sub_interval and width are provided.

// The width of the sum of two intervals, from their widths alone.
function width_of_sum(w1, w2) {
  // your answer
}

// The width of the difference of two intervals, from their widths alone.
function width_of_difference(w1, w2) {
  // your answer
}

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
  solution: `function width_of_sum(w1, w2) {
  return w1 + w2;
}

function width_of_difference(w1, w2) {
  return w1 + w2;
}

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
function add_interval(x, y) {
  return make_interval(lower_bound(x) + lower_bound(y),
                       upper_bound(x) + upper_bound(y));
}

function mul_interval(x, y) {
  const p1 = lower_bound(x) * lower_bound(y);
  const p2 = lower_bound(x) * upper_bound(y);
  const p3 = upper_bound(x) * lower_bound(y);
  const p4 = upper_bound(x) * upper_bound(y);
  return make_interval(math_min(p1, p2, p3, p4),
                       math_max(p1, p2, p3, p4));
}`,
  starter: `// make_interval, lower_bound, upper_bound, add_interval and mul_interval
// are provided.

// True when the interval contains zero, endpoints included.
function spans_zero(i) {
  // your answer
}

// Make div_interval use spans_zero to signal an error.
function div_interval(x, y) {
  return mul_interval(x, make_interval(1 / upper_bound(y),
                                       1 / lower_bound(y)));
}
`,
  tests: [
    { name: '[−1, 1] spans zero', kind: 'value', expr: 'spans_zero(make_interval(-1, 1))', expected: true },
    { name: 'an endpoint at zero counts', kind: 'value', expr: 'spans_zero(make_interval(0, 2)) && spans_zero(make_interval(-2, 0))', expected: true },
    { name: 'positive and negative intervals do not', kind: 'value', expr: 'spans_zero(make_interval(1, 2)) || spans_zero(make_interval(-3, -1))', expected: false },
    { name: 'division still divides', kind: 'value', expr: 'upper_bound(div_interval(make_interval(1, 2), make_interval(4, 8)))', expected: 0.5 },
    { name: 'div_interval checks its divisor', kind: 'calls', call: 'div_interval(make_interval(1, 2), make_interval(4, 8))', fn: 'spans_zero', atMost: 1 },
    { name: 'dividing by an interval that spans zero is an error', kind: 'error', call: 'div_interval(make_interval(1, 2), make_interval(-1, 1))' },
  ],
  solution: `function spans_zero(i) {
  return lower_bound(i) <= 0 && upper_bound(i) >= 0;
}

function div_interval(x, y) {
  return spans_zero(y)
    ? error("division by an interval that spans zero", y)
    : mul_interval(x, make_interval(1 / upper_bound(y),
                                    1 / lower_bound(y)));
}
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

function mul(a, b) {
  return a * b;
}`,
  starter: `// make_interval, lower_bound and upper_bound are provided, and mul(a, b),
// which multiplies two numbers. Use mul for every multiplication, so that the
// checker can count them.

// Nine cases on the signs of the endpoints: each interval is nonnegative,
// nonpositive, or spans zero.
function mul_interval(x, y) {
  // your answer
}
`,
  tests: [
    ...ninecases,
    { name: 'an endpoint at zero', kind: 'value', expr: 'bounds(mul_interval(make_interval(0, 2), make_interval(-3, -1)))', expected: '-6, 0' },
    { name: 'two multiplications for positive intervals', kind: 'calls', call: 'mul_interval(make_interval(2, 3), make_interval(4, 5))', fn: 'mul', atMost: 2 },
    { name: 'two when only one interval spans zero', kind: 'calls', call: 'mul_interval(make_interval(-1, 4), make_interval(-5, -2))', fn: 'mul', atMost: 2 },
    { name: 'four when both span zero', kind: 'calls', call: 'mul_interval(make_interval(-1, 4), make_interval(-2, 3))', fn: 'mul', atMost: 4 },
  ],
  solution: `function mul_interval(x, y) {
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
}
`,
};

export const exercise_2_12: ExerciseSpec = {
  id: '2.12',
  prelude: `${intervals}
${centerWidthDefinitions}`,
  starter: `// Interval arithmetic, make_center_width, center and width are provided.

// An interval from its center and a percentage tolerance:
// make_center_percent(6.8, 10) is 6.8 ohms ± 10%.
function make_center_percent(c, p) {
  // your answer
}

function percent(i) {
  // your answer
}
`,
  tests: [
    { name: 'the lower bound', kind: 'value', expr: close('lower_bound(make_center_percent(10, 5))', 9.5, 1e-9), expected: true },
    { name: 'the upper bound', kind: 'value', expr: close('upper_bound(make_center_percent(6.8, 10))', 7.48, 1e-9), expected: true },
    { name: 'the center survives', kind: 'value', expr: close('center(make_center_percent(6.8, 10))', 6.8, 1e-9), expected: true },
    { name: 'the percentage survives', kind: 'value', expr: close('percent(make_center_percent(6.8, 10))', 10, 1e-9), expected: true },
    { name: 'the percentage of [9, 11]', kind: 'value', expr: close('percent(make_interval(9, 11))', 10, 1e-9), expected: true },
  ],
  solution: `function make_center_percent(c, p) {
  return make_center_width(c, c * p / 100);
}

function percent(i) {
  return width(i) / center(i) * 100;
}
`,
};

const centerPercent = `${centerWidthDefinitions}
function make_center_percent(c, p) {
  return make_center_width(c, c * p / 100);
}

function percent(i) {
  return width(i) / center(i) * 100;
}
`;

export const exercise_2_13: ExerciseSpec = {
  id: '2.13',
  prelude: `${intervals}
${centerPercent}`,
  starter: `// Interval arithmetic, center, width, make_center_percent and percent are provided.

// The approximate percentage tolerance of the product of two positive
// intervals with small tolerances p1 and p2.
function product_percent(p1, p2) {
  // your answer
}
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
function product_percent(p1, p2) {
  return p1 + p2;
}
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
function exact_par(r1, r2) {
  // your answer
}

// Which program computes exactly that range: "par1" or "par2"?
const exact = "";
`,
  tests: [
    { name: 'the lower end of the true range', kind: 'value', expr: close('lower_bound(exact_par(make_interval(6.12, 7.48), make_interval(4.465, 4.935)))', 2.581558809636278, 1e-9), expected: true },
    { name: 'the upper end of the true range', kind: 'value', expr: close('upper_bound(exact_par(make_interval(6.12, 7.48), make_interval(4.465, 4.935)))', 2.97332259363673, 1e-9), expected: true },
    { name: 'another pair of resistors', kind: 'value', expr: close('upper_bound(exact_par(make_interval(1, 3), make_interval(2, 6)))', 2, 1e-9), expected: true },
    { name: 'the program that is exact', kind: 'value', expr: 'exact', expected: 'par2' },
  ],
  solution: `function exact_par(r1, r2) {
  function par(a, b) {
    return 1 / (1 / a + 1 / b);
  }
  return make_interval(par(lower_bound(r1), lower_bound(r2)),
                       par(upper_bound(r1), upper_bound(r2)));
}

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
function square_interval(i) {
  // your answer
}
`,
  tests: [
    { name: 'the counterexample', kind: 'value', expr: 'lower_bound(mul_interval(x, x)) < 0', expected: true },
    { name: 'a positive interval', kind: 'value', expr: 'bounds(square_interval(make_interval(2, 3)))', expected: '4, 9' },
    { name: 'a negative interval', kind: 'value', expr: 'bounds(square_interval(make_interval(-3, -2)))', expected: '4, 9' },
    { name: 'an interval spanning zero', kind: 'value', expr: 'bounds(square_interval(make_interval(-1, 2)))', expected: '0, 4' },
    { name: 'another one', kind: 'value', expr: 'bounds(square_interval(make_interval(-3, 1)))', expected: '0, 9' },
  ],
  solution: `const x = make_interval(-1, 2);

function square_interval(i) {
  const lo = math_abs(lower_bound(i));
  const hi = math_abs(upper_bound(i));
  return lower_bound(i) <= 0 && upper_bound(i) >= 0
    ? make_interval(0, math_max(lo, hi) * math_max(lo, hi))
    : make_interval(math_min(lo, hi) * math_min(lo, hi),
                    math_max(lo, hi) * math_max(lo, hi));
}
`,
};
