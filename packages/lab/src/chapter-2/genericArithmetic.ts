/**
 * Programs of §2.5.1 – §2.5.2, generic arithmetic and coercion.
 *
 * Source has no built-in operation table, so the programs declare one: a list
 * of entries kept in a `let`, searched with `===` on the operation and `equal`
 * on the types. The pieces are exported separately so that exercise preludes
 * can assemble the system they need.
 */

/** `put` and `get`: the operation-and-type table of §2.4.3, as a list. */
export const operationTableDefinitions = `// The operation-and-type table: a list of entries list(op, type, item),
// newest first, so a later put shadows an earlier one.
let operation_table = null;

function put(op, type, item) {
  operation_table = pair(list(op, type, item), operation_table);
}

function get(op, type) {
  function lookup(entries) {
    if (is_null(entries)) {
      return undefined;
    } else {
      const entry = head(entries);
      return head(entry) === op && equal(head(tail(entry)), type)
        ? head(tail(tail(entry)))
        : lookup(tail(entries));
    }
  }
  return lookup(operation_table);
}
`;

/** Type tags as in §2.4.2: every datum is a pair of its tag and its contents. */
export const typeTagDefinitions = `function attach_tag(type_tag, contents) {
  return pair(type_tag, contents);
}

function type_tag(datum) {
  return is_pair(datum)
    ? head(datum)
    : error(datum, "bad tagged datum -- type_tag");
}

function contents(datum) {
  return is_pair(datum)
    ? tail(datum)
    : error(datum, "bad tagged datum -- contents");
}
`;

/** Exercise 2.78: ordinary numbers are their own "javascript_number" datum, untagged. */
export const plainNumberTagDefinitions = `function attach_tag(type_tag, contents) {
  return type_tag === "javascript_number"
    ? contents
    : pair(type_tag, contents);
}

function type_tag(datum) {
  return is_number(datum)
    ? "javascript_number"
    : is_pair(datum)
    ? head(datum)
    : error(datum, "bad tagged datum -- type_tag");
}

function contents(datum) {
  return is_number(datum)
    ? datum
    : is_pair(datum)
    ? tail(datum)
    : error(datum, "bad tagged datum -- contents");
}
`;

/** `apply` for the one, two or three arguments the generic operations take. */
export const applyDefinition = `// Source has no spread syntax, so apply takes the arguments apart by hand.
function apply(fun, args) {
  return is_null(tail(args))
    ? fun(head(args))
    : is_null(tail(tail(args)))
    ? fun(head(args), head(tail(args)))
    : fun(head(args), head(tail(args)), head(tail(tail(args))));
}
`;

/** `apply_generic` of §2.4.3: dispatch on the list of type tags, no coercion. */
export const applyGenericDefinition = `function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  return ! is_undefined(fun)
    ? apply(fun, map(contents, args))
    : error(list(op, type_tags), "no method for these types -- apply_generic");
}
`;

/** The four generic arithmetic operations of §2.5.1. */
export const genericOperationDefinitions = `function add(x, y) { return apply_generic("add", list(x, y)); }

function sub(x, y) { return apply_generic("sub", list(x, y)); }

function mul(x, y) { return apply_generic("mul", list(x, y)); }

function div(x, y) { return apply_generic("div", list(x, y)); }
`;

/** The ordinary-number package of §2.5.1. */
export const javascriptNumberPackage = `function install_javascript_number_package() {
  function tag(x) {
    return attach_tag("javascript_number", x);
  }
  put("add", list("javascript_number", "javascript_number"),
      (x, y) => tag(x + y));
  put("sub", list("javascript_number", "javascript_number"),
      (x, y) => tag(x - y));
  put("mul", list("javascript_number", "javascript_number"),
      (x, y) => tag(x * y));
  put("div", list("javascript_number", "javascript_number"),
      (x, y) => tag(x / y));
  put("make", "javascript_number",
      x => tag(x));
  return "done";
}

function make_javascript_number(n) {
  return get("make", "javascript_number")(n);
}
`;

/** The rational-number package of §2.5.1, with §2.1.1's functions inside it. */
export const rationalPackage = `function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function install_rational_package() {
  // internal functions
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
    return make_rat(numer(x) * numer(y),
                    denom(x) * denom(y));
  }
  function div_rat(x, y) {
    return make_rat(numer(x) * denom(y),
                    denom(x) * numer(y));
  }
  // interface to rest of the system
  function tag(x) {
    return attach_tag("rational", x);
  }
  put("add", list("rational", "rational"),
      (x, y) => tag(add_rat(x, y)));
  put("sub", list("rational", "rational"),
      (x, y) => tag(sub_rat(x, y)));
  put("mul", list("rational", "rational"),
      (x, y) => tag(mul_rat(x, y)));
  put("div", list("rational", "rational"),
      (x, y) => tag(div_rat(x, y)));
  put("make", "rational",
      (n, d) => tag(make_rat(n, d)));
  return "done";
}

function make_rational(n, d) {
  return get("make", "rational")(n, d);
}
`;

/** The rectangular and polar packages of §2.4.3, and the generic selectors over them. */
export const complexRepresentationPackages = `function square(x) {
  return x * x;
}

function install_rectangular_package() {
  // internal functions
  function real_part(z) { return head(z); }
  function imag_part(z) { return tail(z); }
  function make_from_real_imag(x, y) { return pair(x, y); }
  function magnitude(z) {
    return math_sqrt(square(real_part(z)) + square(imag_part(z)));
  }
  function angle(z) {
    return math_atan2(imag_part(z), real_part(z));
  }
  function make_from_mag_ang(r, a) {
    return pair(r * math_cos(a), r * math_sin(a));
  }
  // interface to the rest of the system
  function tag(x) { return attach_tag("rectangular", x); }
  put("real_part", list("rectangular"), real_part);
  put("imag_part", list("rectangular"), imag_part);
  put("magnitude", list("rectangular"), magnitude);
  put("angle", list("rectangular"), angle);
  put("make_from_real_imag", "rectangular",
      (x, y) => tag(make_from_real_imag(x, y)));
  put("make_from_mag_ang", "rectangular",
      (r, a) => tag(make_from_mag_ang(r, a)));
  return "done";
}

function install_polar_package() {
  // internal functions
  function magnitude(z) { return head(z); }
  function angle(z) { return tail(z); }
  function make_from_mag_ang(r, a) { return pair(r, a); }
  function real_part(z) {
    return magnitude(z) * math_cos(angle(z));
  }
  function imag_part(z) {
    return magnitude(z) * math_sin(angle(z));
  }
  function make_from_real_imag(x, y) {
    return pair(math_sqrt(square(x) + square(y)), math_atan2(y, x));
  }
  // interface to the rest of the system
  function tag(x) { return attach_tag("polar", x); }
  put("real_part", list("polar"), real_part);
  put("imag_part", list("polar"), imag_part);
  put("magnitude", list("polar"), magnitude);
  put("angle", list("polar"), angle);
  put("make_from_real_imag", "polar",
      (x, y) => tag(make_from_real_imag(x, y)));
  put("make_from_mag_ang", "polar",
      (r, a) => tag(make_from_mag_ang(r, a)));
  return "done";
}

function real_part(z) { return apply_generic("real_part", list(z)); }

function imag_part(z) { return apply_generic("imag_part", list(z)); }

function magnitude(z) { return apply_generic("magnitude", list(z)); }

function angle(z) { return apply_generic("angle", list(z)); }
`;

/** The complex-number package of §2.5.1, built on the rectangular and polar packages. */
export const complexPackage = `function install_complex_package() {
  // imported functions from rectangular and polar packages
  function make_from_real_imag(x, y) {
    return get("make_from_real_imag", "rectangular")(x, y);
  }
  function make_from_mag_ang(r, a) {
    return get("make_from_mag_ang", "polar")(r, a);
  }
  // internal functions
  function add_complex(z1, z2) {
    return make_from_real_imag(real_part(z1) + real_part(z2),
                               imag_part(z1) + imag_part(z2));
  }
  function sub_complex(z1, z2) {
    return make_from_real_imag(real_part(z1) - real_part(z2),
                               imag_part(z1) - imag_part(z2));
  }
  function mul_complex(z1, z2) {
    return make_from_mag_ang(magnitude(z1) * magnitude(z2),
                             angle(z1) + angle(z2));
  }
  function div_complex(z1, z2) {
    return make_from_mag_ang(magnitude(z1) / magnitude(z2),
                             angle(z1) - angle(z2));
  }
  // interface to rest of the system
  function tag(z) { return attach_tag("complex", z); }
  put("add", list("complex", "complex"),
      (z1, z2) => tag(add_complex(z1, z2)));
  put("sub", list("complex", "complex"),
      (z1, z2) => tag(sub_complex(z1, z2)));
  put("mul", list("complex", "complex"),
      (z1, z2) => tag(mul_complex(z1, z2)));
  put("div", list("complex", "complex"),
      (z1, z2) => tag(div_complex(z1, z2)));
  put("make_from_real_imag", "complex",
      (x, y) => tag(make_from_real_imag(x, y)));
  put("make_from_mag_ang", "complex",
      (r, a) => tag(make_from_mag_ang(r, a)));
  return "done";
}

function make_complex_from_real_imag(x, y) {
  return get("make_from_real_imag", "complex")(x, y);
}

function make_complex_from_mag_ang(r, a) {
  return get("make_from_mag_ang", "complex")(r, a);
}
`;

/** Alyssa's addition of Exercise 2.77: the selectors, installed for "complex" too. */
export const complexSelectorsInstall = `put("real_part", list("complex"), real_part);
put("imag_part", list("complex"), imag_part);
put("magnitude", list("complex"), magnitude);
put("angle", list("complex"), angle);
`;

/** The base every package plugs into: the table, tags, `apply` and `apply_generic`, and add, sub, mul, div. */
export const genericBaseDefinitions = `${operationTableDefinitions}
${typeTagDefinitions}
${applyDefinition}
${applyGenericDefinition}
${genericOperationDefinitions}`;

/**
 * The generic arithmetic system of §2.5.1 as the text has it, every package
 * installed: tagged ordinary numbers, rationals, and complex numbers in either
 * representation.
 */
export const genericArithmeticDefinitions = `${genericBaseDefinitions}
${javascriptNumberPackage}
${rationalPackage}
${complexRepresentationPackages}
${complexPackage}
install_javascript_number_package();
install_rational_package();
install_rectangular_package();
install_polar_package();
install_complex_package();
`;

/**
 * The same system after Exercises 2.77 and 2.78: ordinary numbers are plain
 * numbers, and the complex selectors work on "complex" data.
 */
export const plainNumberArithmeticDefinitions = `${operationTableDefinitions}
${plainNumberTagDefinitions}
${applyDefinition}
${applyGenericDefinition}
${genericOperationDefinitions}
${javascriptNumberPackage}
${rationalPackage}
${complexRepresentationPackages}
${complexPackage}
install_javascript_number_package();
install_rational_package();
install_rectangular_package();
install_polar_package();
install_complex_package();
${complexSelectorsInstall}`;

// ---------------------------------------------------------------------------
// §2.5.1 examples

/** The base of the system and the first package: ordinary numbers, tagged. */
export const javascriptNumberProgram = `${genericBaseDefinitions}
${javascriptNumberPackage}
install_javascript_number_package();

const seven = add(make_javascript_number(3), make_javascript_number(4));
seven;
`;

/** The rational package plugged into the base; the prelude is `genericBaseDefinitions`. */
export const rationalPackageProgram = `${rationalPackage}
install_rational_package();

const one_half = make_rational(1, 2);
const sum = add(one_half, make_rational(1, 3));
sum;
`;

/** The prelude of `complexPackageProgram`: the base and the two representations of §2.4.3. */
export const complexPackagePrelude = `${genericBaseDefinitions}
${complexRepresentationPackages}
install_rectangular_package();
install_polar_package();
`;

/** The complex package, and the two-level tags of figure 2.24. */
export const complexPackageProgram = `${complexPackage}
install_complex_package();

const z = make_complex_from_real_imag(3, 4);
const product = mul(z, z);
product;
`;

// ---------------------------------------------------------------------------
// §2.5.2 examples

/** One cross-type operation, installed by hand; the prelude is `genericArithmeticDefinitions`. */
export const crossTypeProgram = `function add_complex_to_javascript_num(z, x) {
  return make_complex_from_real_imag(real_part(z) + x, imag_part(z));
}

put("add", list("complex", "javascript_number"),
    (z, x) => add_complex_to_javascript_num(z, x));

const z = make_complex_from_real_imag(3, 4);
const sum = add(z, make_javascript_number(5));
sum;
`;

/** `put_coercion` and `get_coercion`: a second table, keyed by two types. */
export const coercionTableDefinitions = `let coercion_table = null;

function put_coercion(type1, type2, coercion) {
  coercion_table = pair(list(type1, type2, coercion), coercion_table);
}

function get_coercion(type1, type2) {
  function lookup(entries) {
    if (is_null(entries)) {
      return undefined;
    } else {
      const entry = head(entries);
      return head(entry) === type1 && head(tail(entry)) === type2
        ? head(tail(tail(entry)))
        : lookup(tail(entries));
    }
  }
  return lookup(coercion_table);
}
`;

/** `apply_generic` of §2.5.2: when no method fits, coerce one argument to the other's type. */
export const applyGenericWithCoercion = `function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  if (! is_undefined(fun)) {
    return apply(fun, map(contents, args));
  } else {
    if (length(args) === 2) {
      const type1 = head(type_tags);
      const type2 = head(tail(type_tags));
      const a1 = head(args);
      const a2 = head(tail(args));
      const t1_to_t2 = get_coercion(type1, type2);
      const t2_to_t1 = get_coercion(type2, type1);
      return ! is_undefined(t1_to_t2)
        ? apply_generic(op, list(t1_to_t2(a1), a2))
        : ! is_undefined(t2_to_t1)
        ? apply_generic(op, list(a1, t2_to_t1(a2)))
        : error(list(op, type_tags), "no method for these types");
    } else {
      return error(list(op, type_tags), "no method for these types");
    }
  }
}
`;

/** Coercion in the system of §2.5.1; the prelude is `genericArithmeticDefinitions`. */
export const coercionProgram = `${coercionTableDefinitions}
function javascript_number_to_complex(n) {
  return make_complex_from_real_imag(contents(n), 0);
}

put_coercion("javascript_number", "complex",
             javascript_number_to_complex);

${applyGenericWithCoercion}
// add again, so that it calls this apply_generic
function add(x, y) { return apply_generic("add", list(x, y)); }

const z = make_complex_from_real_imag(3, 4);
add(make_javascript_number(5), z);
`;
