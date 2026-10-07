import { polynomialDefinitions, polynomialPackageDefinitions, symbolicArithmeticDefinitions } from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/**
 * Exercises of §2.5.3. The preludes build on one another: each later exercise
 * starts from the system of this section plus the reference answers of the
 * exercises it depends on, all declared at the top level so that a submission
 * can use them and `put` new methods beside them.
 */

/** Exercise 2.87: a polynomial is zero when every coefficient is zero. */
const zeroPolynomial = `function is_zero_terms(L) {
  return is_empty_termlist(L) ||
         (is_equal_to_zero(coeff(first_term(L))) &&
          is_zero_terms(rest_terms(L)));
}

function is_zero_poly(p) {
  return is_zero_terms(term_list(p));
}

put("is_equal_to_zero", list("polynomial"), is_zero_poly);
`;

/** Exercise 2.88: generic negation, and subtraction as adding the negation. */
const polynomialSubtraction = `function negate(x) {
  return apply_generic("negate", list(x));
}

function negate_terms(L) {
  if (is_empty_termlist(L)) {
    return the_empty_termlist;
  } else {
    const t = first_term(L);
    return adjoin_term(make_term(order(t), negate(coeff(t))),
                       negate_terms(rest_terms(L)));
  }
}

function negate_poly(p) {
  return make_poly(variable(p), negate_terms(term_list(p)));
}

function sub_poly(p1, p2) {
  return add_poly(p1, negate_poly(p2));
}

put("negate", list("javascript_number"), x => -x);
put("negate", list("polynomial"),
    p => attach_tag("polynomial", negate_poly(p)));
put("sub", list("polynomial", "polynomial"),
    (p1, p2) => attach_tag("polynomial", sub_poly(p1, p2)));
`;

/** Exercise 2.91: long division of term lists. */
const polynomialDivision = `function div_terms(L1, L2) {
  if (is_empty_termlist(L1)) {
    return list(the_empty_termlist, the_empty_termlist);
  } else {
    const t1 = first_term(L1);
    const t2 = first_term(L2);
    if (order(t2) > order(t1)) {
      return list(the_empty_termlist, L1);
    } else {
      const new_c = div(coeff(t1), coeff(t2));
      const new_o = order(t1) - order(t2);
      const rest_of_result =
        div_terms(add_terms(L1,
                            negate_terms(mul_term_by_all_terms(
                                           make_term(new_o, new_c), L2))),
                  L2);
      return list(adjoin_term(make_term(new_o, new_c), head(rest_of_result)),
                  head(tail(rest_of_result)));
    }
  }
}

function div_poly(p1, p2) {
  if (is_same_variable(variable(p1), variable(p2))) {
    const result = div_terms(term_list(p1), term_list(p2));
    return list(make_poly(variable(p1), head(result)),
                make_poly(variable(p1), head(tail(result))));
  } else {
    return error("polys not in same var -- div_poly", list(p1, p2));
  }
}
`;

/** Exercise 2.94: the remainder of a division, and Euclid's algorithm on term lists. */
const remainderTerms = `function remainder_terms(a, b) {
  return head(tail(div_terms(a, b)));
}
`;

const euclidGcdTerms = `function gcd_terms(a, b) {
  return is_empty_termlist(b)
    ? a
    : gcd_terms(b, remainder_terms(a, b));
}
`;

/** Exercise 2.94: the generic operation, for numbers. */
const genericGcd = `function greatest_common_divisor(a, b) {
  return apply_generic("greatest_common_divisor", list(a, b));
}

put("greatest_common_divisor", list("javascript_number", "javascript_number"),
    gcd);
`;

/** Exercise 2.96: pseudoremainders, and the integer content divided out. */
const pseudoGcdTerms = `function pseudoremainder_terms(a, b) {
  const o1 = order(first_term(a));
  const o2 = order(first_term(b));
  const c = coeff(first_term(b));
  const factor = make_term(0, math_pow(c, 1 + o1 - o2));
  return remainder_terms(mul_term_by_all_terms(factor, a), b);
}

// The integer gcd of all the coefficients of L.
function coefficient_gcd(L) {
  return is_empty_termlist(L)
    ? 0
    : gcd(math_abs(coeff(first_term(L))), coefficient_gcd(rest_terms(L)));
}

function divide_coefficients(L, k) {
  if (is_empty_termlist(L)) {
    return the_empty_termlist;
  } else {
    const t = first_term(L);
    return adjoin_term(make_term(order(t), coeff(t) / k),
                       divide_coefficients(rest_terms(L), k));
  }
}

function gcd_terms(a, b) {
  function euclid(a, b) {
    return is_empty_termlist(b)
      ? a
      : euclid(b, pseudoremainder_terms(a, b));
  }
  const g = euclid(a, b);
  return divide_coefficients(g, coefficient_gcd(g));
}
`;

/** The gcd_poly and its installation, repeated so that they use a new gcd_terms. */
const gcdPolyInstallation = `function gcd_poly(p1, p2) {
  return is_same_variable(variable(p1), variable(p2))
    ? make_poly(variable(p1), gcd_terms(term_list(p1), term_list(p2)))
    : error("polys not in same var -- gcd_poly", list(p1, p2));
}

put("greatest_common_divisor", list("polynomial", "polynomial"),
    (p1, p2) => attach_tag("polynomial", gcd_poly(p1, p2)));
`;

/** The rational package of §2.5.1, on integers. */
const integerRationalPackage = `function install_rational_package() {
  function numer(x) { return head(x); }
  function denom(x) { return tail(x); }
  function make_rat(n, d) {
    const g = gcd(n, d);
    return pair(n / g, d / g);
  }
  function add_rat(x, y) {
    return make_rat(numer(x) * denom(y) + numer(y) * denom(x),
                    denom(x) * denom(y));
  }
  function sub_rat(x, y) {
    return make_rat(numer(x) * denom(y) - numer(y) * denom(x),
                    denom(x) * denom(y));
  }
  function mul_rat(x, y) {
    return make_rat(numer(x) * numer(y), denom(x) * denom(y));
  }
  function div_rat(x, y) {
    return make_rat(numer(x) * denom(y), denom(x) * numer(y));
  }
  function tag(x) { return attach_tag("rational", x); }
  const rr = list("rational", "rational");
  put("add", rr, (x, y) => tag(add_rat(x, y)));
  put("sub", rr, (x, y) => tag(sub_rat(x, y)));
  put("mul", rr, (x, y) => tag(mul_rat(x, y)));
  put("div", rr, (x, y) => tag(div_rat(x, y)));
  put("is_equal_to_zero", list("rational"), x => numer(x) === 0);
  put("make", "rational", (n, d) => tag(make_rat(n, d)));
  return "done";
}

install_rational_package();
`;

/** The rational package on generic operations; `makeRat` is the body of make_rat. */
const genericRationalPackage = (makeRat: string): string => `function install_rational_package() {
  function numer(x) { return head(x); }
  function denom(x) { return tail(x); }
  function make_rat(n, d) {
${makeRat}
  }
  function add_rat(x, y) {
    return make_rat(add(mul(numer(x), denom(y)), mul(numer(y), denom(x))),
                    mul(denom(x), denom(y)));
  }
  function sub_rat(x, y) {
    return make_rat(sub(mul(numer(x), denom(y)), mul(numer(y), denom(x))),
                    mul(denom(x), denom(y)));
  }
  function mul_rat(x, y) {
    return make_rat(mul(numer(x), numer(y)), mul(denom(x), denom(y)));
  }
  function div_rat(x, y) {
    return make_rat(mul(numer(x), denom(y)), mul(denom(x), numer(y)));
  }
  function tag(x) { return attach_tag("rational", x); }
  const rr = list("rational", "rational");
  put("add", rr, (x, y) => tag(add_rat(x, y)));
  put("sub", rr, (x, y) => tag(sub_rat(x, y)));
  put("mul", rr, (x, y) => tag(mul_rat(x, y)));
  put("div", rr, (x, y) => tag(div_rat(x, y)));
  put("is_equal_to_zero", list("rational"), x => is_equal_to_zero(numer(x)));
  put("make", "rational", (n, d) => tag(make_rat(n, d)));
  return "done";
}

install_rational_package();
`;

const withZero = `${polynomialDefinitions}
${zeroPolynomial}`;
const withSub = `${withZero}
${polynomialSubtraction}`;
const withDiv = `${withSub}
${polynomialDivision}`;
const withGcd = `${withDiv}
${remainderTerms}
${euclidGcdTerms}
${gcdPolyInstallation}
${genericGcd}`;
const withPseudoGcd = `${withDiv}
${remainderTerms}
${pseudoGcdTerms}
${gcdPolyInstallation}
${genericGcd}`;

/** A `make_polynomial` expression: `poly('x', [1, 1], [0, 1])` is x + 1. */
const poly = (v: string, ...terms: [number, number | string][]): string =>
  `make_polynomial("${v}", list(${terms.map(([o, c]) => `make_term(${o}, ${c})`).join(', ')}))`;

export const exercise_2_87: ExerciseSpec = {
  id: '2.87',
  prelude: polynomialDefinitions,
  starter: `// The prelude provides the generic arithmetic system and the polynomial
// package of this section. Its functions (term_list, first_term, coeff,
// is_empty_termlist and the rest) are declared at the top level.
// A polynomial is zero when every one of its coefficients is zero.

function is_zero_poly(p) {
  // your answer: p is a poly without its tag
}

put("is_equal_to_zero", list("polynomial"), is_zero_poly);
`,
  tests: [
    { name: 'no terms is zero', kind: 'value', expr: `is_equal_to_zero(make_polynomial("x", the_empty_termlist))`, expected: true },
    { name: '3x is not zero', kind: 'value', expr: `is_equal_to_zero(${poly('x', [1, 3])})`, expected: false },
    {
      name: 'zero coefficients make a zero polynomial',
      kind: 'value',
      expr: `is_equal_to_zero(${poly('x', [3, 0], [1, 'make_polynomial("y", the_empty_termlist)'])})`,
      expected: true,
    },
    {
      name: 'a coefficient that cancels to zero is dropped',
      kind: 'value',
      expr: `list_to_string(add(${poly('x', [2, poly('y', [1, 1])], [0, 1])}, ${poly('x', [2, poly('y', [1, -1])], [0, 2])}))`,
      expected: 'list("polynomial", "x", list(0, 3))',
    },
  ],
  solution: `function is_zero_terms(L) {
  return is_empty_termlist(L) ||
         (is_equal_to_zero(coeff(first_term(L))) &&
          is_zero_terms(rest_terms(L)));
}

function is_zero_poly(p) {
  return is_zero_terms(term_list(p));
}

put("is_equal_to_zero", list("polynomial"), is_zero_poly);
`,
};

export const exercise_2_88: ExerciseSpec = {
  id: '2.88',
  prelude: withZero,
  starter: `// The prelude provides the generic arithmetic system, the polynomial
// package of this section with its functions at the top level, and
// is_equal_to_zero for polynomials (Exercise 2.87).

function negate(x) {
  return apply_generic("negate", list(x));
}

// your answer: install negate for javascript_number and polynomial,
// and sub for two polynomials
`,
  tests: [
    {
      name: '(x² + 3x) − (x² + x + 1)',
      kind: 'value',
      expr: `list_to_string(sub(${poly('x', [2, 1], [1, 3])}, ${poly('x', [2, 1], [1, 1], [0, 1])}))`,
      expected: 'list("polynomial", "x", list(1, 2), list(0, -1))',
    },
    {
      name: 'x³ − x²',
      kind: 'value',
      expr: `list_to_string(sub(${poly('x', [3, 1])}, ${poly('x', [2, 1])}))`,
      expected: 'list("polynomial", "x", list(3, 1), list(2, -1))',
    },
    {
      name: '(y + 1)x − (y)x',
      kind: 'value',
      expr: `list_to_string(sub(${poly('x', [1, poly('y', [1, 1], [0, 1])])}, ${poly('x', [1, poly('y', [1, 1])])}))`,
      expected: 'list("polynomial", "x", list(1, list("polynomial", "y", list(0, 1))))',
    },
    {
      name: 'p − p is zero',
      kind: 'value',
      expr: `is_equal_to_zero(sub(${poly('x', [2, 5], [0, -7])}, ${poly('x', [2, 5], [0, -7])}))`,
      expected: true,
    },
  ],
  solution: polynomialSubtraction,
};

export const exercise_2_89: ExerciseSpec = {
  id: '2.89',
  prelude: symbolicArithmeticDefinitions,
  starter: `// The prelude provides the generic arithmetic system. Here a term list
// is dense: the list of all its coefficients, highest order first, so
// x⁵ + 2x⁴ + 3x² − 2x − 5 is list(1, 2, 0, 3, -2, -5). Terms are still
// made with make_term, and the polynomial package below is unchanged.

const the_empty_termlist = null;

function is_empty_termlist(term_list) { return is_null(term_list); }

function make_term(order, coeff) { return list(order, coeff); }

function order(term) { return head(term); }

function coeff(term) { return head(tail(term)); }

function first_term(term_list) {
  // your answer
}

function rest_terms(term_list) {
  // your answer
}

function adjoin_term(term, term_list) {
  // your answer: callers always adjoin a term of higher order than any in
  // term_list, but maybe not the next one up
}

${polynomialPackageDefinitions}`,
  tests: [
    { name: 'the first term of A', kind: 'value', expr: 'equal(first_term(list(1, 2, 0, 3, -2, -5)), make_term(5, 1))', expected: true },
    { name: 'adjoining pads with zeros', kind: 'value', expr: 'equal(adjoin_term(make_term(4, 7), list(2, 3)), list(7, 0, 0, 2, 3))', expected: true },
    {
      name: 'A + (−x⁵ + 1)',
      kind: 'value',
      expr: 'list_to_string(add(make_polynomial("x", list(1, 2, 0, 3, -2, -5)), make_polynomial("x", list(-1, 0, 0, 0, 0, 1))))',
      expected: 'list("polynomial", "x", 2, 0, 3, -2, -4)',
    },
    {
      name: '(x² − x + 1)(x + 1)',
      kind: 'value',
      expr: 'list_to_string(mul(make_polynomial("x", list(1, -1, 1)), make_polynomial("x", list(1, 1))))',
      expected: 'list("polynomial", "x", 1, 0, 0, 1)',
    },
  ],
  solution: `const the_empty_termlist = null;

function is_empty_termlist(term_list) { return is_null(term_list); }

function make_term(order, coeff) { return list(order, coeff); }

function order(term) { return head(term); }

function coeff(term) { return head(tail(term)); }

// The order of the first coefficient is the length of the list, less 1.
function first_term(term_list) {
  return make_term(length(term_list) - 1, head(term_list));
}

function rest_terms(term_list) {
  return tail(term_list);
}

function adjoin_term(term, term_list) {
  return is_equal_to_zero(coeff(term))
    ? term_list
    : order(term) === length(term_list)
    ? pair(coeff(term), term_list)
    : adjoin_term(term, pair(0, term_list));
}

${polynomialPackageDefinitions}`,
};

/**
 * For Exercise 2.90: term lists tagged "sparse" or "dense", and term-list
 * operations that dispatch on the tag. The polynomial package is the same text
 * as before; only the functions it calls have changed.
 */
const genericTermLists = `function make_term(order, coeff) { return list(order, coeff); }
function order(term) { return head(term); }
function coeff(term) { return head(tail(term)); }

function make_sparse(terms) { return attach_tag("sparse", terms); }
function make_dense(coeffs) { return attach_tag("dense", coeffs); }

const the_empty_termlist = make_sparse(null);

function is_empty_termlist(L) {
  return apply_generic("is_empty_termlist", list(L));
}
function first_term(L) {
  return apply_generic("first_term", list(L));
}
function rest_terms(L) {
  return apply_generic("rest_terms", list(L));
}
function adjoin_term(term, L) {
  return is_equal_to_zero(coeff(term))
    ? L
    : get("adjoin_term", list(type_tag(L)))(term, contents(L));
}

// The nonzero terms of the polynomial p, as a plain list of terms.
function poly_terms(p) {
  function terms(L) {
    return is_empty_termlist(L)
      ? null
      : is_equal_to_zero(coeff(first_term(L)))
      ? terms(rest_terms(L))
      : pair(first_term(L), terms(rest_terms(L)));
  }
  return terms(term_list(contents(p)));
}
`;

export const exercise_2_90: ExerciseSpec = {
  id: '2.90',
  prelude: `${symbolicArithmeticDefinitions}
${genericTermLists}
${polynomialPackageDefinitions}`,
  starter: `// The prelude provides the generic arithmetic system and the polynomial
// package, whose term-list operations are now generic. A term list is
// tagged "sparse" (a list of terms) or "dense" (a list of coefficients):
//   make_sparse(list(make_term(100, 1), make_term(0, 1)))   is x¹⁰⁰ + 1
//   make_dense(list(1, 0, -1))                              is x² − 1
// first_term, rest_terms and is_empty_termlist call apply_generic with the
// term list. adjoin_term(term, L) drops a zero term, and otherwise calls
// get("adjoin_term", list(type_tag(L)))(term, contents(L)). The methods
// for rest_terms and adjoin_term return tagged term lists. Terms are not
// tagged, and the empty term list is make_sparse(null).

function install_sparse_termlist_package() {
  function tag(L) { return attach_tag("sparse", L); }
  // your answer: put "first_term", "rest_terms", "is_empty_termlist"
  // and "adjoin_term" for list("sparse")
  return "done";
}

function install_dense_termlist_package() {
  function tag(L) { return attach_tag("dense", L); }
  // your answer: the same for list("dense")
  return "done";
}

install_sparse_termlist_package();
install_dense_termlist_package();
`,
  tests: [
    {
      name: 'a dense polynomial, term by term',
      kind: 'value',
      expr: 'list_to_string(poly_terms(make_polynomial("x", make_dense(list(1, 0, -1)))))',
      expected: 'list(list(2, 1), list(0, -1))',
    },
    {
      name: 'sparse plus dense',
      kind: 'value',
      expr: 'list_to_string(poly_terms(add(make_polynomial("x", make_sparse(list(make_term(20, 1), make_term(0, 1)))), make_polynomial("x", make_dense(list(1, 2, 0, 3))))))',
      expected: 'list(list(20, 1), list(3, 1), list(2, 2), list(0, 4))',
    },
    {
      name: 'dense times dense',
      kind: 'value',
      expr: 'list_to_string(poly_terms(mul(make_polynomial("x", make_dense(list(1, 1))), make_polynomial("x", make_dense(list(1, -1))))))',
      expected: 'list(list(2, 1), list(0, -1))',
    },
    {
      name: 'a high term adjoined to a dense list',
      kind: 'value',
      expr: 'list_to_string(poly_terms(add(make_polynomial("x", make_sparse(list(make_term(5, 1)))), make_polynomial("x", make_dense(list(1, 1))))))',
      expected: 'list(list(5, 1), list(1, 1), list(0, 1))',
    },
  ],
  budget: 300_000,
  solution: `function install_sparse_termlist_package() {
  function tag(L) { return attach_tag("sparse", L); }
  put("first_term", list("sparse"), L => head(L));
  put("rest_terms", list("sparse"), L => tag(tail(L)));
  put("is_empty_termlist", list("sparse"), L => is_null(L));
  put("adjoin_term", list("sparse"), (term, L) => tag(pair(term, L)));
  return "done";
}

function install_dense_termlist_package() {
  function tag(L) { return attach_tag("dense", L); }
  function zeros(n, L) {
    return n === 0 ? L : zeros(n - 1, pair(0, L));
  }
  function adjoin(term, L) {
    return pair(coeff(term), zeros(order(term) - length(L), L));
  }
  put("first_term", list("dense"), L => make_term(length(L) - 1, head(L)));
  put("rest_terms", list("dense"), L => tag(tail(L)));
  put("is_empty_termlist", list("dense"), L => is_null(L));
  put("adjoin_term", list("dense"), (term, L) => tag(adjoin(term, L)));
  return "done";
}

install_sparse_termlist_package();
install_dense_termlist_package();
`,
};

const x5minus1 = 'list(make_term(5, 1), make_term(0, -1))';
const x2minus1 = 'list(make_term(2, 1), make_term(0, -1))';

export const exercise_2_91: ExerciseSpec = {
  id: '2.91',
  prelude: withSub,
  starter: `// The prelude provides the polynomial system of this section with its
// functions at the top level, including add_terms and
// mul_term_by_all_terms, and negate_terms from Exercise 2.88.

function div_terms(L1, L2) {
  if (is_empty_termlist(L1)) {
    return list(the_empty_termlist, the_empty_termlist);
  } else {
    const t1 = first_term(L1);
    const t2 = first_term(L2);
    if (order(t2) > order(t1)) {
      return list(the_empty_termlist, L1);
    } else {
      const new_c = div(coeff(t1), coeff(t2));
      const new_o = order(t1) - order(t2);
      const rest_of_result = null; // your answer: compute rest of result recursively
      return null; // your answer: form and return complete result
    }
  }
}

function div_poly(p1, p2) {
  // your answer: a list of the quotient poly and the remainder poly
}
`,
  tests: [
    {
      name: '(x⁵ − 1) / (x² − 1)',
      kind: 'value',
      expr: `list_to_string(div_terms(${x5minus1}, ${x2minus1}))`,
      expected: 'list(list(list(3, 1), list(1, 1)), list(list(1, 1), list(0, -1)))',
    },
    {
      name: '(x³ − 1) / (x − 1) leaves no remainder',
      kind: 'value',
      expr: 'list_to_string(div_terms(list(make_term(3, 1), make_term(0, -1)), list(make_term(1, 1), make_term(0, -1))))',
      expected: 'list(list(list(2, 1), list(1, 1), list(0, 1)), null)',
    },
    {
      name: '(2x² + 1) / 4x',
      kind: 'value',
      expr: 'list_to_string(div_terms(list(make_term(2, 2), make_term(0, 1)), list(make_term(1, 4))))',
      expected: 'list(list(list(1, 0.5)), list(list(0, 1)))',
    },
    {
      name: 'div_poly keeps the variable',
      kind: 'value',
      expr: `list_to_string(div_poly(make_poly("x", ${x5minus1}), make_poly("x", ${x2minus1})))`,
      expected: 'list(list("x", list(3, 1), list(1, 1)), list("x", list(1, 1), list(0, -1)))',
    },
  ],
  solution: polynomialDivision,
};

export const exercise_2_92: ExerciseSpec = {
  id: '2.92',
  prelude: withSub,
  starter: `// The prelude provides the polynomial system of this section with its
// functions at the top level, and is_equal_to_zero, negate and sub for
// polynomials (Exercises 2.87 and 2.88).
// Order the variables alphabetically: a polynomial in "x" may have
// polynomials in "y" as coefficients, never the other way round.

function variable_precedes(v1, v2) {
  return v1 < v2;
}

// your answer: install "add" and "mul" for two polynomials in any
// variables, and for a polynomial and a number in either order
`,
  tests: [
    {
      name: '(x + 1) + (y + 1)',
      kind: 'value',
      expr: `list_to_string(add(${poly('x', [1, 1], [0, 1])}, ${poly('y', [1, 1], [0, 1])}))`,
      expected: 'list("polynomial", "x", list(1, 1), list(0, list("polynomial", "y", list(1, 1), list(0, 2))))',
    },
    {
      name: 'the order of the arguments does not matter',
      kind: 'value',
      expr: `equal(add(${poly('y', [1, 1], [0, 1])}, ${poly('x', [1, 1], [0, 1])}), add(${poly('x', [1, 1], [0, 1])}, ${poly('y', [1, 1], [0, 1])}))`,
      expected: true,
    },
    {
      name: '(y + 1)(x + 1)',
      kind: 'value',
      expr: `list_to_string(mul(${poly('y', [1, 1], [0, 1])}, ${poly('x', [1, 1], [0, 1])}))`,
      expected: 'list("polynomial", "x", list(1, list("polynomial", "y", list(1, 1), list(0, 1))), list(0, list("polynomial", "y", list(1, 1), list(0, 1))))',
    },
    {
      name: 'a number and a polynomial',
      kind: 'value',
      expr: `list_to_string(add(3, ${poly('x', [1, 1], [0, 1])}))`,
      expected: 'list("polynomial", "x", list(1, 1), list(0, 4))',
    },
  ],
  solution: `function variable_precedes(v1, v2) {
  return v1 < v2;
}

function is_poly(x) {
  return type_tag(x) === "polynomial";
}

// The variable that comes first among the polynomials x and y (tagged).
function principal_variable(x, y) {
  return !is_poly(x)
    ? variable(contents(y))
    : !is_poly(y)
    ? variable(contents(x))
    : variable_precedes(variable(contents(x)), variable(contents(y)))
    ? variable(contents(x))
    : variable(contents(y));
}

// x as a poly in v: itself if it is one, otherwise a constant term.
function as_poly_in(v, x) {
  return is_poly(x) && is_same_variable(variable(contents(x)), v)
    ? contents(x)
    : make_poly(v, adjoin_term(make_term(0, x), the_empty_termlist));
}

function install_mixed_operation(op, poly_op) {
  function tag(p) { return attach_tag("polynomial", p); }
  function combine(x, y) {
    const v = principal_variable(x, y);
    return tag(poly_op(as_poly_in(v, x), as_poly_in(v, y)));
  }
  put(op, list("polynomial", "polynomial"),
      (p1, p2) => combine(tag(p1), tag(p2)));
  put(op, list("polynomial", "javascript_number"),
      (p, n) => combine(tag(p), n));
  put(op, list("javascript_number", "polynomial"),
      (n, p) => combine(n, tag(p)));
  return "done";
}

install_mixed_operation("add", add_poly);
install_mixed_operation("mul", mul_poly);
`,
};

const p1_2_93 = poly('x', [2, 1], [0, 1]);
const p2_2_93 = poly('x', [3, 1], [0, 1]);

export const exercise_2_93: ExerciseSpec = {
  id: '2.93',
  prelude: withSub,
  starter: `// The prelude provides the generic arithmetic system and the polynomial
// package, with is_equal_to_zero and sub for polynomials. Change this
// rational package to use the generic operations, and make make_rat
// leave fractions as they are.

${integerRationalPackage}
const p1 = ${p1_2_93};
const p2 = ${p2_2_93};
const rf = make_rational(p2, p1);
`,
  tests: [
    {
      name: 'the numerator of rf + rf',
      kind: 'value',
      expr: 'list_to_string(head(contents(add(rf, rf))))',
      expected: 'list("polynomial", "x", list(5, 2), list(3, 2), list(2, 2), list(0, 2))',
    },
    {
      name: 'the denominator of rf + rf',
      kind: 'value',
      expr: 'list_to_string(tail(contents(add(rf, rf))))',
      expected: 'list("polynomial", "x", list(4, 1), list(2, 2), list(0, 1))',
    },
    {
      name: 'rational numbers still work, unreduced',
      kind: 'value',
      expr: 'stringify(add(make_rational(1, 2), make_rational(1, 2)))',
      expected: '["rational", [4, 4]]',
    },
  ],
  solution: `${genericRationalPackage('    return pair(n, d);')}
const p1 = ${p1_2_93};
const p2 = ${p2_2_93};
const rf = make_rational(p2, p1);
`,
};

const p1_2_94 = poly('x', [4, 1], [3, -1], [2, -2], [1, 2]);
const p2_2_94 = poly('x', [3, 1], [1, -1]);

export const exercise_2_94: ExerciseSpec = {
  id: '2.94',
  prelude: withDiv,
  starter: `// The prelude provides the polynomial system of this section with its
// functions at the top level, div_terms and div_poly (Exercise 2.91),
// and gcd for integers.

function remainder_terms(a, b) {
  // your answer
}

function gcd_terms(a, b) {
  return is_empty_termlist(b)
    ? a
    : gcd_terms(b, remainder_terms(a, b));
}

function gcd_poly(p1, p2) {
  // your answer: signal an error unless p1 and p2 have the same variable
}

function greatest_common_divisor(a, b) {
  return apply_generic("greatest_common_divisor", list(a, b));
}

// your answer: install greatest_common_divisor for two numbers and for
// two polynomials

const p1 = ${p1_2_94};
const p2 = ${p2_2_94};
`,
  tests: [
    {
      name: 'the remainder of (x⁵ − 1) / (x² − 1)',
      kind: 'value',
      expr: `list_to_string(remainder_terms(${x5minus1}, ${x2minus1}))`,
      expected: 'list(list(1, 1), list(0, -1))',
    },
    { name: 'gcd of 12 and 18', kind: 'value', expr: 'greatest_common_divisor(12, 18)', expected: 6 },
    {
      name: 'gcd of p1 and p2',
      kind: 'value',
      expr: 'list_to_string(greatest_common_divisor(p1, p2))',
      expected: 'list("polynomial", "x", list(2, -1), list(1, 1))',
    },
    {
      name: 'polynomials in different variables are an error',
      kind: 'error',
      call: `greatest_common_divisor(p1, ${poly('y', [1, 1])})`,
      message: 'same var',
    },
  ],
  solution: `${remainderTerms}
${euclidGcdTerms}
${gcdPolyInstallation}
${genericGcd}
const p1 = ${p1_2_94};
const p2 = ${p2_2_94};
`,
};

const P1 = poly('x', [2, 1], [1, -2], [0, 1]);
const P2 = poly('x', [2, 11], [0, 7]);
const P3 = poly('x', [1, 13], [0, 5]);
const pDeclarations = `const p1 = ${P1};
const p2 = ${P2};
const p3 = ${P3};`;

export const exercise_2_95: ExerciseSpec = {
  id: '2.95',
  prelude: withGcd,
  starter: `// The prelude provides the polynomial system with remainder_terms and
// greatest_common_divisor (Exercise 2.94).

${pDeclarations}

const q1 = null; // your answer: the product of p1 and p2
const q2 = null; // your answer: the product of p1 and p3

const g = greatest_common_divisor(q1, q2);

// What is the order of g, as computed? (p1 has order 2.)
const gcd_order = 2; // your answer

// The first remainder, of q1 divided by q2, is p1 times a constant.
// Which constant?
const factor = 1; // your answer
`,
  tests: [
    {
      name: 'q1 is p1 times p2',
      kind: 'value',
      expr: 'list_to_string(q1)',
      expected: 'list("polynomial", "x", list(4, 11), list(3, -22), list(2, 18), list(1, -14), list(0, 7))',
    },
    {
      name: 'q2 is p1 times p3',
      kind: 'value',
      expr: 'list_to_string(q2)',
      expected: 'list("polynomial", "x", list(3, 13), list(2, -21), list(1, 3), list(0, 5))',
    },
    { name: 'the order of the computed gcd', kind: 'value', expr: 'gcd_order', expected: 0 },
    { name: 'the constant in the first remainder', kind: 'value', expr: close('factor', 1458 / 169, 1e-9), expected: true },
  ],
  budget: 1_000_000,
  solution: `${pDeclarations}

const q1 = mul(p1, p2);
const q2 = mul(p1, p3);

const g = greatest_common_divisor(q1, q2);

const gcd_order = order(first_term(term_list(contents(g))));

const first_remainder = remainder_terms(term_list(contents(q1)),
                                        term_list(contents(q2)));
const factor = coeff(first_term(first_remainder));
`,
};

export const exercise_2_96: ExerciseSpec = {
  id: '2.96',
  prelude: withGcd,
  starter: `// The prelude provides the polynomial system with remainder_terms,
// gcd_terms, gcd_poly and greatest_common_divisor (Exercise 2.94), and gcd
// for integers.

function pseudoremainder_terms(a, b) {
  // your answer
}

function gcd_terms(a, b) {
  // your answer: Euclid's algorithm with pseudoremainder_terms, then
  // divide the coefficients by their integer gcd
}

${gcdPolyInstallation}
${pDeclarations}
const q1 = mul(p1, p2);
const q2 = mul(p1, p3);
`,
  tests: [
    {
      name: 'the pseudoremainder of q1 by q2',
      kind: 'value',
      expr: 'list_to_string(pseudoremainder_terms(term_list(contents(q1)), term_list(contents(q2))))',
      expected: 'list(list(2, 1458), list(1, -2916), list(0, 1458))',
    },
    {
      name: 'the gcd of q1 and q2 is p1',
      kind: 'value',
      expr: 'list_to_string(greatest_common_divisor(q1, q2))',
      expected: 'list("polynomial", "x", list(2, 1), list(1, -2), list(0, 1))',
    },
    {
      name: 'the gcd of 6x² − 6 and 4x + 4 is x + 1',
      kind: 'value',
      expr: `list_to_string(greatest_common_divisor(${poly('x', [2, 6], [0, -6])}, ${poly('x', [1, 4], [0, 4])}))`,
      expected: 'list("polynomial", "x", list(1, 1), list(0, 1))',
    },
  ],
  budget: 1_000_000,
  solution: `${pseudoGcdTerms}
${gcdPolyInstallation}
${pDeclarations}
const q1 = mul(p1, p2);
const q2 = mul(p1, p3);
`,
};

/** A test that `expr` prints as `pos`, or as `neg`: the same fraction with numerator and denominator negated. */
const eitherSign = (expr: string, pos: string, neg: string): string =>
  `!is_null(member(list_to_string(${expr}), list(${JSON.stringify(pos)}, ${JSON.stringify(neg)})))`;

const rfDeclarations = `const p1 = ${poly('x', [1, 1], [0, 1])};
const p2 = ${poly('x', [3, 1], [0, -1])};
const p3 = ${poly('x', [1, 1])};
const p4 = ${poly('x', [2, 1], [0, -1])};

const rf1 = make_rational(p1, p2);
const rf2 = make_rational(p3, p4);`;

const reduceSolution = `function reduce_terms(n, d) {
  const g = gcd_terms(n, d);
  const o1 = math_max(order(first_term(n)), order(first_term(d)));
  const o2 = order(first_term(g));
  const factor = make_term(0, math_pow(coeff(first_term(g)), 1 + o1 - o2));
  const nn = head(div_terms(mul_term_by_all_terms(factor, n), g));
  const dd = head(div_terms(mul_term_by_all_terms(factor, d), g));
  const k = gcd(coefficient_gcd(nn), coefficient_gcd(dd));
  return list(divide_coefficients(nn, k), divide_coefficients(dd, k));
}

function reduce_poly(p1, p2) {
  if (is_same_variable(variable(p1), variable(p2))) {
    const result = reduce_terms(term_list(p1), term_list(p2));
    return list(make_poly(variable(p1), head(result)),
                make_poly(variable(p1), head(tail(result))));
  } else {
    return error("polys not in same var -- reduce_poly", list(p1, p2));
  }
}

function reduce_integers(n, d) {
  const g = gcd(n, d);
  return list(n / g, d / g);
}

function reduce(n, d) {
  return apply_generic("reduce", list(n, d));
}

put("reduce", list("javascript_number", "javascript_number"), reduce_integers);
put("reduce", list("polynomial", "polynomial"),
    (p1, p2) => map(p => attach_tag("polynomial", p), reduce_poly(p1, p2)));
`;

export const exercise_2_97: ExerciseSpec = {
  id: '2.97',
  prelude: withPseudoGcd,
  starter: `// The prelude provides the polynomial system with gcd_terms from
// Exercise 2.96, and its helpers coefficient_gcd(L), the integer gcd of
// the coefficients of L, and divide_coefficients(L, k), which divides
// each coefficient of L by k.

function reduce_terms(n, d) {
  // your answer: list(nn, dd)
}

function reduce_poly(p1, p2) {
  // your answer
}

function reduce_integers(n, d) {
  const g = gcd(n, d);
  return list(n / g, d / g);
}

function reduce(n, d) {
  return apply_generic("reduce", list(n, d));
}

// your answer: install reduce for two numbers and for two polynomials

${genericRationalPackage('    return pair(n, d); // your answer: reduce first')}
${rfDeclarations}
`,
  tests: [
    {
      name: '6/4 is reduced to 3/2',
      kind: 'value',
      expr: 'stringify(make_rational(6, 4))',
      expected: '["rational", [3, 2]]',
    },
    {
      name: '(x² − 1)/(x + 1) is reduced to x − 1 over a constant',
      kind: 'value',
      expr: eitherSign('make_rational(p4, p1)', 'list("rational", list("polynomial", "x", list(1, 1), list(0, -1)), "polynomial", "x", list(0, 1))', 'list("rational", list("polynomial", "x", list(1, -1), list(0, 1)), "polynomial", "x", list(0, -1))'),
      expected: true,
    },
    {
      name: 'rf1 + rf2 in lowest terms',
      kind: 'value',
      expr: eitherSign('add(rf1, rf2)', 'list("rational", list("polynomial", "x", list(3, 1), list(2, 2), list(1, 3), list(0, 1)), "polynomial", "x", list(4, 1), list(3, 1), list(1, -1), list(0, -1))', 'list("rational", list("polynomial", "x", list(3, -1), list(2, -2), list(1, -3), list(0, -1)), "polynomial", "x", list(4, -1), list(3, -1), list(1, 1), list(0, 1))'),
      expected: true,
    },
  ],
  budget: 2_000_000,
  solution: `${reduceSolution}
${genericRationalPackage(`    const reduced = reduce(n, d);
    return pair(head(reduced), head(tail(reduced)));`)}
${rfDeclarations}
`,
};
