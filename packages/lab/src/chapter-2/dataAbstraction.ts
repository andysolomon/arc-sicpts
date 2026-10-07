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

/** §2.1.1: the rational-number operations, written by wishful thinking. */
export const ratOperationsDefinitions = `function add_rat(x, y) {
  return make_rat(numer(x) * denom(y) + numer(y) * denom(x),
                  denom(x) * denom(y));
}

function sub_rat(x, y) {
  return make_rat(numer(x) * denom(y) - numer(y) * denom(x),
                  denom(x) * denom(y));
}

function mul_rat(x, y) {
  return make_rat(numer(x) * numer(y),
                  denom(x) * denom(y));
}

function div_rat(x, y) {
  return make_rat(numer(x) * denom(y),
                  denom(x) * numer(y));
}

function equal_rat(x, y) {
  return numer(x) * denom(y) === numer(y) * denom(x);
}

function print_rat(x) {
  return display(stringify(numer(x)) + " / " + stringify(denom(x)));
}
`;

/** §2.1.1: a rational number is a pair of integers. */
export const ratPairDefinitions = `function make_rat(n, d) {
  return pair(n, d);
}

function numer(x) {
  return head(x);
}

function denom(x) {
  return tail(x);
}
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
function make_rat(n, d) {
  const g = gcd(n, d);
  return pair(n / g, d / g);
}

function numer(x) {
  return head(x);
}

function denom(x) {
  return tail(x);
}
`;

export const ratLowestTermsProgram = `${ratOperationsDefinitions}
${ratLowestTermsDefinitions}
${ratUses}`;

/** §2.1.2: the same package, reducing when a part is selected instead. */
export const ratAccessReductionProgram = `${ratOperationsDefinitions}
${gcdDefinitions}
function make_rat(n, d) {
  return pair(n, d);
}

function numer(x) {
  const g = gcd(head(x), tail(x));
  return head(x) / g;
}

function denom(x) {
  const g = gcd(head(x), tail(x));
  return tail(x) / g;
}

const one_third = make_rat(1, 3);
const two_thirds = add_rat(one_third, one_third);

print_rat(two_thirds);
display(equal_rat(two_thirds, make_rat(2, 3)));
two_thirds;
`;

/** §2.1.2: the smallest program with every layer of figure 2.1, for the layers diagram. */
export const ratLayersProgram = `${ratPairDefinitions}
function add_rat(x, y) {
  return make_rat(numer(x) * denom(y) + numer(y) * denom(x),
                  denom(x) * denom(y));
}

function mul_rat(x, y) {
  return make_rat(numer(x) * numer(y),
                  denom(x) * denom(y));
}

function equal_rat(x, y) {
  return numer(x) * denom(y) === numer(y) * denom(x);
}

const x = make_rat(1, 3);
const two = make_rat(2, 1);

equal_rat(add_rat(x, x), mul_rat(two, x));
`;

/** §2.1.3: pair, head and tail with no data structure at all. */
export const functionalPairDefinitions = `function pair(x, y) {
  function dispatch(m) {
    return m === 0
      ? x
      : m === 1
        ? y
        : error("argument not 0 or 1 -- pair", m);
  }
  return dispatch;
}

function head(z) {
  return z(0);
}

function tail(z) {
  return z(1);
}
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
export const intervalRepresentationDefinitions = `function make_interval(x, y) {
  return pair(x, y);
}

function lower_bound(i) {
  return head(i);
}

function upper_bound(i) {
  return tail(i);
}
`;

/** §2.1.4: Alyssa's arithmetic on intervals. */
export const intervalDefinitions = `function add_interval(x, y) {
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
export const centerWidthDefinitions = `function make_center_width(c, w) {
  return make_interval(c - w, c + w);
}

function center(i) {
  return (lower_bound(i) + upper_bound(i)) / 2;
}

function width(i) {
  return (upper_bound(i) - lower_bound(i)) / 2;
}
`;

/** Lem's two formulas for resistors in parallel. */
export const parallelDefinitions = `function par1(r1, r2) {
  return div_interval(mul_interval(r1, r2),
                      add_interval(r1, r2));
}

function par2(r1, r2) {
  const one = make_interval(1, 1);
  return div_interval(one,
                      add_interval(div_interval(one, r1),
                                   div_interval(one, r2)));
}
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
