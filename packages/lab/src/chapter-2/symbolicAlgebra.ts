/**
 * Section 2.5.3: symbolic algebra. Polynomials join the generic arithmetic
 * system, and because their coefficients are combined with the generic `add`
 * and `mul`, a coefficient may itself be a polynomial.
 *
 * Source has no `put` and `get`, so the generic system below keeps its own
 * operation table: an association list in a `let`, keyed by `list(op, type)`
 * and compared with `equal`. It is a compact copy of §2.5.1, written here so
 * that this section stands on its own. Numbers are the plain JavaScript
 * numbers, untagged, in the style of Exercise 2.78.
 */

/** The operation table, type tags, `apply_generic`, and the number and rational packages. */
export const symbolicArithmeticDefinitions = `// The operation table: a list of entries pair(pair(op, type), item).
// put adds to the front, so a later put for the same key wins.
let operation_table = null;

function put(op, type, item) {
  operation_table = pair(pair(pair(op, type), item), operation_table);
  return "ok";
}

function get(op, type) {
  function lookup(entries) {
    if (is_null(entries)) {
      return undefined;
    } else {
      const key = head(head(entries));
      return head(key) === op && equal(tail(key), type)
        ? tail(head(entries))
        : lookup(tail(entries));
    }
  }
  return lookup(operation_table);
}

// Type tags, with numbers left untagged (Exercise 2.78).
function attach_tag(type_tag, contents) {
  return is_number(contents) ? contents : pair(type_tag, contents);
}

function type_tag(datum) {
  return is_number(datum)
    ? "javascript_number"
    : is_pair(datum)
    ? head(datum)
    : error("bad tagged datum -- type_tag", datum);
}

function contents(datum) {
  return is_number(datum)
    ? datum
    : is_pair(datum)
    ? tail(datum)
    : error("bad tagged datum -- contents", datum);
}

// Source cannot spread a list into arguments; our operations take one or two.
function apply_in_underlying_javascript(fun, args) {
  return is_null(tail(args))
    ? fun(head(args))
    : fun(head(args), head(tail(args)));
}

function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  return is_undefined(fun)
    ? error("no method for these types -- apply_generic", list(op, type_tags))
    : apply_in_underlying_javascript(fun, map(contents, args));
}

function add(x, y) { return apply_generic("add", list(x, y)); }
function sub(x, y) { return apply_generic("sub", list(x, y)); }
function mul(x, y) { return apply_generic("mul", list(x, y)); }
function div(x, y) { return apply_generic("div", list(x, y)); }
function is_equal_to_zero(x) { return apply_generic("is_equal_to_zero", list(x)); }

function install_javascript_number_package() {
  const nn = list("javascript_number", "javascript_number");
  put("add", nn, (x, y) => x + y);
  put("sub", nn, (x, y) => x - y);
  put("mul", nn, (x, y) => x * y);
  put("div", nn, (x, y) => x / y);
  put("is_equal_to_zero", list("javascript_number"), x => x === 0);
  return "done";
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function install_rational_package() {
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

function make_rational(n, d) {
  return get("make", "rational")(n, d);
}

install_javascript_number_package();
install_rational_package();
`;

/** Terms and sparse term lists, highest order first. */
export const sparseTermListDefinitions = `function adjoin_term(term, term_list) {
  return is_equal_to_zero(coeff(term))
    ? term_list
    : pair(term, term_list);
}

const the_empty_termlist = null;

function first_term(term_list) { return head(term_list); }

function rest_terms(term_list) { return tail(term_list); }

function is_empty_termlist(term_list) { return is_null(term_list); }

function make_term(order, coeff) { return list(order, coeff); }

function order(term) { return head(term); }

function coeff(term) { return head(tail(term)); }
`;

/**
 * Polys and their arithmetic, then the installation. The book keeps the
 * internal functions inside `install_polynomial_package`; here they are
 * declared at the top level so that the exercises can extend them, and the
 * installation function only puts the interface into the table.
 */
export const polynomialPackageDefinitions = `function make_poly(variable, term_list) {
  return pair(variable, term_list);
}

function variable(p) { return head(p); }

function term_list(p) { return tail(p); }

function is_variable(x) { return is_string(x); }

function is_same_variable(v1, v2) {
  return is_variable(v1) && is_variable(v2) && v1 === v2;
}

function add_poly(p1, p2) {
  return is_same_variable(variable(p1), variable(p2))
    ? make_poly(variable(p1), add_terms(term_list(p1), term_list(p2)))
    : error("polys not in same var -- add_poly", list(p1, p2));
}

function add_terms(L1, L2) {
  if (is_empty_termlist(L1)) {
    return L2;
  } else if (is_empty_termlist(L2)) {
    return L1;
  } else {
    const t1 = first_term(L1);
    const t2 = first_term(L2);
    return order(t1) > order(t2)
      ? adjoin_term(t1, add_terms(rest_terms(L1), L2))
      : order(t1) < order(t2)
      ? adjoin_term(t2, add_terms(L1, rest_terms(L2)))
      : adjoin_term(make_term(order(t1), add(coeff(t1), coeff(t2))),
                    add_terms(rest_terms(L1), rest_terms(L2)));
  }
}

function mul_poly(p1, p2) {
  return is_same_variable(variable(p1), variable(p2))
    ? make_poly(variable(p1), mul_terms(term_list(p1), term_list(p2)))
    : error("polys not in same var -- mul_poly", list(p1, p2));
}

function mul_terms(L1, L2) {
  return is_empty_termlist(L1)
    ? the_empty_termlist
    : add_terms(mul_term_by_all_terms(first_term(L1), L2),
                mul_terms(rest_terms(L1), L2));
}

function mul_term_by_all_terms(t1, L) {
  if (is_empty_termlist(L)) {
    return the_empty_termlist;
  } else {
    const t2 = first_term(L);
    return adjoin_term(make_term(order(t1) + order(t2),
                                 mul(coeff(t1), coeff(t2))),
                       mul_term_by_all_terms(t1, rest_terms(L)));
  }
}

function install_polynomial_package() {
  function tag(p) { return attach_tag("polynomial", p); }
  put("add", list("polynomial", "polynomial"),
      (p1, p2) => tag(add_poly(p1, p2)));
  put("mul", list("polynomial", "polynomial"),
      (p1, p2) => tag(mul_poly(p1, p2)));
  put("make", "polynomial",
      (variable, terms) => tag(make_poly(variable, terms)));
  return "done";
}

install_polynomial_package();

function make_polynomial(variable, terms) {
  return get("make", "polynomial")(variable, terms);
}
`;

/** The whole system of this section: generic arithmetic, term lists and the polynomial package. */
export const polynomialDefinitions = `${symbolicArithmeticDefinitions}
${sparseTermListDefinitions}
${polynomialPackageDefinitions}`;

/**
 * 5x² + 3x + 7 and x² − 3x, added and multiplied. The generic system is the
 * prelude; the program is the polynomial package itself.
 */
export const polynomialProgram = `${sparseTermListDefinitions}
${polynomialPackageDefinitions}
const p = make_polynomial("x", list(make_term(2, 5),
                                    make_term(1, 3),
                                    make_term(0, 7)));
const q = make_polynomial("x", list(make_term(2, 1),
                                    make_term(1, -3)));
const sum = add(p, q);
mul(p, q);
`;

/**
 * A polynomial in x whose coefficients are polynomials in y. Multiplying
 * two of them sends `mul` through `mul_poly` for x, and from inside it
 * through `mul_poly` again for each pair of coefficients.
 */
export const nestedCoefficientsProgram = `// adjoin_term asks whether each new coefficient is zero, and coefficients
// are now polynomials. This quick test is enough here; Exercise 2.87
// asks for a better one.
put("is_equal_to_zero", list("polynomial"),
    p => is_empty_termlist(term_list(p)));

function poly_y(terms) {
  return make_polynomial("y", terms);
}

// (y + 1)x² + (y² + 1)x + (y − 1)
const a = make_polynomial("x", list(
  make_term(2, poly_y(list(make_term(1, 1), make_term(0, 1)))),
  make_term(1, poly_y(list(make_term(2, 1), make_term(0, 1)))),
  make_term(0, poly_y(list(make_term(1, 1), make_term(0, -1))))));

// (y − 2)x + (y³ + 7)
const b = make_polynomial("x", list(
  make_term(1, poly_y(list(make_term(1, 1), make_term(0, -2)))),
  make_term(0, poly_y(list(make_term(3, 1), make_term(0, 7))))));

const product = mul(a, b);
display_list(first_term(term_list(contents(product))));
product;
`;

/** The dense and the sparse term lists of A and B. */
export const termListsProgram = `function make_term(order, coeff) {
  return list(order, coeff);
}

// A: x⁵ + 2x⁴ + 3x² − 2x − 5
const A_dense = list(1, 2, 0, 3, -2, -5);
const A_sparse = list(make_term(5, 1), make_term(4, 2), make_term(2, 3),
                      make_term(1, -2), make_term(0, -5));

// B: x¹⁰⁰ + 2x² + 1
const B_sparse = list(make_term(100, 1), make_term(2, 2), make_term(0, 1));
const B_dense = build_list(i => i === 0 ? 1 : i === 98 ? 2 : i === 100 ? 1 : 0,
                           101);

display(length(B_sparse));
length(B_dense);
`;

/**
 * One polynomial written two ways: as a polynomial in x with coefficients
 * in y, and as a polynomial in y with coefficients in x. Neither type is
 * above the other, and the package cannot add them.
 */
export const twoVariablesProgram = `// (y² + 1)x³ + (2y)x + 1
const in_x = make_polynomial("x", list(
  make_term(3, make_polynomial("y", list(make_term(2, 1), make_term(0, 1)))),
  make_term(1, make_polynomial("y", list(make_term(1, 2)))),
  make_term(0, 1)));

// (x³)y² + (2x)y + (x³ + 1), the same polynomial
const in_y = make_polynomial("y", list(
  make_term(2, make_polynomial("x", list(make_term(3, 1)))),
  make_term(1, make_polynomial("x", list(make_term(1, 2)))),
  make_term(0, make_polynomial("x", list(make_term(3, 1), make_term(0, 1))))));

display(equal(in_x, in_y));
add(in_x, in_y);
`;
