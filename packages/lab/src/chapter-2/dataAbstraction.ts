import { gcdDefinitions } from '../chapter-1/gcd.ts';

/**
 * Programs of §2.1, introduction to data abstraction: rational numbers built
 * on pairs, pairs built on functions, and Alyssa P. Hacker's intervals.
 */

/** §2.1.1: pairs, and pairs of pairs. */
export const pairGlueProgram = `const x = pair(1, 2);
const y = pair(3, 4);
const z = pair(x, y);

display(head(x));
display(tail(x));
display(head(head(z)));
head(tail(z));
`;

/**
 * §2.1.1: the rational-number operations, written by wishful thinking. They
 * name the type `Rational` without knowing what it is; each representation
 * below declares it.
 */
export const ratOperationsDefinitions = `const add_rat = (x: Rational, y: Rational): Rational =>
  make_rat(numer(x) * denom(y) + numer(y) * denom(x),
                  denom(x) * denom(y));

const sub_rat = (x: Rational, y: Rational): Rational =>
  make_rat(numer(x) * denom(y) - numer(y) * denom(x),
                  denom(x) * denom(y));

const mul_rat = (x: Rational, y: Rational): Rational =>
  make_rat(numer(x) * numer(y),
                  denom(x) * denom(y));

const div_rat = (x: Rational, y: Rational): Rational =>
  make_rat(numer(x) * denom(y),
                  denom(x) * numer(y));

const equal_rat = (x: Rational, y: Rational): boolean =>
  numer(x) * denom(y) === numer(y) * denom(x);

const print_rat = (x: Rational): string =>
  display(stringify(numer(x)) + " / " + stringify(denom(x)));
`;

/** §2.1.1: a rational number is a pair of integers. */
export const ratPairDefinitions = `type Rational = Pair<number, number>;

const make_rat = (n: number, d: number): Rational =>
  pair(n, d);

const numer = (x: Rational): number =>
  head(x);

const denom = (x: Rational): number =>
  tail(x);
`;

const ratUses = `const one_half = make_rat(1, 2);
const one_third = make_rat(1, 3);

print_rat(add_rat(one_half, one_third));
print_rat(mul_rat(one_half, one_third));
add_rat(one_third, one_third);
`;

/** §2.1.1: the first representation, which never reduces. */
export const ratProgram = `${ratOperationsDefinitions}
${ratPairDefinitions}
${ratUses}`;

/** §2.1.1: reducing to lowest terms when a rational number is made. */
export const ratLowestTermsDefinitions = `${gcdDefinitions}
type Rational = Pair<number, number>;

const make_rat = (n: number, d: number): Rational => {
  const g = gcd(n, d);
  return pair(n / g, d / g);
};

const numer = (x: Rational): number =>
  head(x);

const denom = (x: Rational): number =>
  tail(x);
`;

export const ratLowestTermsProgram = `${ratOperationsDefinitions}
${ratLowestTermsDefinitions}
${ratUses}`;

/** §2.1.2: the same package, reducing when a part is selected instead. */
export const ratAccessReductionProgram = `${ratOperationsDefinitions}
${gcdDefinitions}
type Rational = Pair<number, number>;

const make_rat = (n: number, d: number): Rational =>
  pair(n, d);

const numer = (x: Rational): number => {
  const g = gcd(head(x), tail(x));
  return head(x) / g;
};

const denom = (x: Rational): number => {
  const g = gcd(head(x), tail(x));
  return tail(x) / g;
};

const one_third = make_rat(1, 3);
const two_thirds = add_rat(one_third, one_third);

print_rat(two_thirds);
display(equal_rat(two_thirds, make_rat(2, 3)));
two_thirds;
`;

/** §2.1.2: the smallest program with every layer of figure 2.1, for the layers diagram. */
export const ratLayersProgram = `${ratPairDefinitions}
const add_rat = (x: Rational, y: Rational): Rational =>
  make_rat(numer(x) * denom(y) + numer(y) * denom(x),
                  denom(x) * denom(y));

const mul_rat = (x: Rational, y: Rational): Rational =>
  make_rat(numer(x) * numer(y),
                  denom(x) * denom(y));

const equal_rat = (x: Rational, y: Rational): boolean =>
  numer(x) * denom(y) === numer(y) * denom(x);

const x = make_rat(1, 3);
const two = make_rat(2, 1);

equal_rat(add_rat(x, x), mul_rat(two, x));
`;

/**
 * §2.1.3: pair, head and tail with no data structure at all. The program's
 * `Pair` takes the place of the library's type, as its `pair` takes the place
 * of the primitive: a pair is now a function from 0 or 1 to one of its parts.
 */
export const functionalPairDefinitions = `type Pair<H, T> = (m: number) => H | T;

const pair = <H, T>(x: H, y: T): Pair<H, T> => {
  const dispatch = (m: number): H | T =>
    m === 0
      ? x
      : m === 1
        ? y
        : error("argument not 0 or 1 -- pair", m);
  return dispatch;
};

const head = <H, T>(z: Pair<H, T>): H | T =>
  z(0);

const tail = <H, T>(z: Pair<H, T>): H | T =>
  z(1);
`;

export const functionalPairProgram = `${functionalPairDefinitions}
const x = pair(1, 2);

display(head(x));
tail(x);
`;

/** §2.1.3: the rational package of §2.1.1, unchanged, on functional pairs. */
export const ratOnFunctionalPairsProgram = `${functionalPairDefinitions}
${ratPairDefinitions}
${ratOperationsDefinitions}
const one_half = make_rat(1, 2);
const one_third = make_rat(1, 3);

print_rat(add_rat(one_half, one_third));
`;

/** §2.1.4: the interval constructor and selectors (Exercise 2.7). */
export const intervalRepresentationDefinitions = `type Interval = Pair<number, number>;

const make_interval = (x: number, y: number): Interval =>
  pair(x, y);

const lower_bound = (i: Interval): number =>
  head(i);

const upper_bound = (i: Interval): number =>
  tail(i);
`;

/** §2.1.4: Alyssa's arithmetic on intervals. */
export const intervalDefinitions = `const add_interval = (x: Interval, y: Interval): Interval =>
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

/** Example 0 of §2.1.4; the prelude is `intervalRepresentationDefinitions`. */
export const intervalProgram = `${intervalDefinitions}
// 6.8 ohms ± 10% and 4.7 ohms ± 5%.
const r1 = make_interval(6.12, 7.48);
const r2 = make_interval(4.465, 4.935);

const one = make_interval(1, 1);
const parallel = div_interval(one, add_interval(div_interval(one, r1),
                                                div_interval(one, r2)));
display(parallel);
mul_interval(r1, r2);
`;

/** Center and width, Alyssa's alternate constructor and selectors. */
export const centerWidthDefinitions = `const make_center_width = (c: number, w: number): Interval =>
  make_interval(c - w, c + w);

const center = (i: Interval): number =>
  (lower_bound(i) + upper_bound(i)) / 2;

const width = (i: Interval): number =>
  (upper_bound(i) - lower_bound(i)) / 2;
`;

/** Lem's two formulas for resistors in parallel. */
export const parallelDefinitions = `const par1 = (r1: Interval, r2: Interval): Interval =>
  div_interval(mul_interval(r1, r2),
                      add_interval(r1, r2));

const par2 = (r1: Interval, r2: Interval): Interval => {
  const one = make_interval(1, 1);
  return div_interval(one,
                      add_interval(div_interval(one, r1),
                                   div_interval(one, r2)));
};
`;

/** Example 1 of §2.1.4: two formulas, two answers. Same prelude as `intervalProgram`. */
export const parallelResistorsProgram = `${intervalDefinitions}
${centerWidthDefinitions}
${parallelDefinitions}
const r1 = make_interval(6.12, 7.48);
const r2 = make_interval(4.465, 4.935);

const by_par1 = par1(r1, r2);
const by_par2 = par2(r1, r2);

display(width(by_par1));
display(width(by_par2));
`;
