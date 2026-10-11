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
// newest first, so a later put shadows an earlier one. Each item is a
// function of the arguments of its operation.
type Operation = (...args: List<unknown>) => unknown;

let operation_table: List<List<unknown>> = null;

const put = (op: string, type: string | List<string>, item: Operation): void => {
  operation_table = pair(list(op, type, item), operation_table);
};

const get = (op: string, type: string | List<string>): Operation | undefined => {
  const lookup = (entries: List<List<unknown>>): Operation | undefined => {
    if (is_null(entries)) {
      return undefined;
    } else {
      const entry = head(entries);
      return head(entry) === op && equal(head(tail(entry)), type)
        ? head(tail(tail(entry)))
        : lookup(tail(entries));
    }
  };
  return lookup(operation_table);
};
`;

/** Type tags as in §2.4.2: every datum is a pair of its tag and its contents. */
export const typeTagDefinitions = `// A datum of type T, with its type tag attached.
type Tagged<T> = Pair<string, T>;

const attach_tag = <T>(type_tag: string, contents: T): Tagged<T> =>
  pair(type_tag, contents);

const type_tag = (datum: Tagged<unknown>): string =>
  is_pair(datum)
    ? head(datum)
    : error(datum, "bad tagged datum -- type_tag");

const contents = <T>(datum: Tagged<T>): T =>
  is_pair(datum)
    ? tail(datum)
    : error(datum, "bad tagged datum -- contents");
`;

/** Exercise 2.78: ordinary numbers are their own "javascript_number" datum, untagged. */
export const plainNumberTagDefinitions = `// A datum of type T, with its type tag attached; a number is its own datum.
type Tagged<T> = T | Pair<string, T>;

const attach_tag = <T>(type_tag: string, contents: T): Tagged<T> =>
  type_tag === "javascript_number"
    ? contents
    : pair(type_tag, contents);

const type_tag = (datum: Tagged<unknown>): string =>
  is_number(datum)
    ? "javascript_number"
    : is_pair(datum)
    ? head(datum)
    : error(datum, "bad tagged datum -- type_tag");

const contents = <T>(datum: Tagged<T>): T =>
  is_number(datum)
    ? datum
    : is_pair(datum)
    ? tail(datum)
    : error(datum, "bad tagged datum -- contents");
`;

/** `apply_generic` of §2.4.3: dispatch on the list of type tags, no coercion. */
export const applyGenericDefinition = `const apply_generic = (op: string, ...args: List<unknown>): unknown => {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  return ! is_undefined(fun)
    ? fun(...map(contents, args))
    : error(list(op, type_tags), "no method for these types -- apply_generic");
};
`;

/** The four generic arithmetic operations of §2.5.1. */
export const genericOperationDefinitions = `const add = (x: unknown, y: unknown): unknown => apply_generic("add", x, y);

const sub = (x: unknown, y: unknown): unknown => apply_generic("sub", x, y);

const mul = (x: unknown, y: unknown): unknown => apply_generic("mul", x, y);

const div = (x: unknown, y: unknown): unknown => apply_generic("div", x, y);
`;

/** The ordinary-number package of §2.5.1. */
export const javascriptNumberPackage = `const install_javascript_number_package = (): "done" => {
  const tag = (x: number): Tagged<number> =>
    attach_tag("javascript_number", x);
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
};

const make_javascript_number = (n: number): Tagged<number> =>
  get("make", "javascript_number")(n);
`;

/** The rational-number package of §2.5.1, with §2.1.1's functions inside it. */
export const rationalPackage = `const gcd = (a: number, b: number): number =>
  b === 0 ? a : gcd(b, a % b);

type Rational = Pair<number, number>;

const install_rational_package = (): "done" => {
  // internal functions
  const numer = (x: Rational): number => head(x);
  const denom = (x: Rational): number => tail(x);
  const make_rat = (n: number, d: number): Rational => {
    const g = gcd(n, d);
    return pair(n / g, d / g);
  };
  const add_rat = (x: Rational, y: Rational): Rational =>
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
  // interface to rest of the system
  const tag = (x: Rational): Tagged<Rational> =>
    attach_tag("rational", x);
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
};

const make_rational = (n: number, d: number): Tagged<Rational> =>
  get("make", "rational")(n, d);
`;

/** The two representations of §2.4.2, and a complex number as either one, tagged. */
export const complexTypeDefinitions = `type Rectangular = Pair<number, number>; // real part and imaginary part
type Polar = Pair<number, number>;       // magnitude and angle
type Complex = Tagged<Rectangular | Polar>;
`;

/** The rectangular and polar packages of §2.4.3, and the generic selectors over them. */
export const complexRepresentationPackages = `${complexTypeDefinitions}
const square = (x: number): number =>
  x * x;

const install_rectangular_package = (): "done" => {
  // internal functions
  const real_part = (z: Rectangular): number => head(z);
  const imag_part = (z: Rectangular): number => tail(z);
  const make_from_real_imag = (x: number, y: number): Rectangular => pair(x, y);
  const magnitude = (z: Rectangular): number =>
    math_sqrt(square(real_part(z)) + square(imag_part(z)));
  const angle = (z: Rectangular): number =>
    math_atan2(imag_part(z), real_part(z));
  const make_from_mag_ang = (r: number, a: number): Rectangular =>
    pair(r * math_cos(a), r * math_sin(a));
  // interface to the rest of the system
  const tag = (x: Rectangular): Complex => attach_tag("rectangular", x);
  put("real_part", list("rectangular"), real_part);
  put("imag_part", list("rectangular"), imag_part);
  put("magnitude", list("rectangular"), magnitude);
  put("angle", list("rectangular"), angle);
  put("make_from_real_imag", "rectangular",
      (x, y) => tag(make_from_real_imag(x, y)));
  put("make_from_mag_ang", "rectangular",
      (r, a) => tag(make_from_mag_ang(r, a)));
  return "done";
};

const install_polar_package = (): "done" => {
  // internal functions
  const magnitude = (z: Polar): number => head(z);
  const angle = (z: Polar): number => tail(z);
  const make_from_mag_ang = (r: number, a: number): Polar => pair(r, a);
  const real_part = (z: Polar): number =>
    magnitude(z) * math_cos(angle(z));
  const imag_part = (z: Polar): number =>
    magnitude(z) * math_sin(angle(z));
  const make_from_real_imag = (x: number, y: number): Polar =>
    pair(math_sqrt(square(x) + square(y)), math_atan2(y, x));
  // interface to the rest of the system
  const tag = (x: Polar): Complex => attach_tag("polar", x);
  put("real_part", list("polar"), real_part);
  put("imag_part", list("polar"), imag_part);
  put("magnitude", list("polar"), magnitude);
  put("angle", list("polar"), angle);
  put("make_from_real_imag", "polar",
      (x, y) => tag(make_from_real_imag(x, y)));
  put("make_from_mag_ang", "polar",
      (r, a) => tag(make_from_mag_ang(r, a)));
  return "done";
};

const real_part = (z: Complex): number => apply_generic("real_part", z);

const imag_part = (z: Complex): number => apply_generic("imag_part", z);

const magnitude = (z: Complex): number => apply_generic("magnitude", z);

const angle = (z: Complex): number => apply_generic("angle", z);
`;

/** The complex-number package of §2.5.1, built on the rectangular and polar packages. */
export const complexPackage = `const install_complex_package = (): "done" => {
  // imported functions from rectangular and polar packages
  const make_from_real_imag = (x: number, y: number): Complex =>
    get("make_from_real_imag", "rectangular")(x, y);
  const make_from_mag_ang = (r: number, a: number): Complex =>
    get("make_from_mag_ang", "polar")(r, a);
  // internal functions
  const add_complex = (z1: Complex, z2: Complex): Complex =>
    make_from_real_imag(real_part(z1) + real_part(z2),
                        imag_part(z1) + imag_part(z2));
  const sub_complex = (z1: Complex, z2: Complex): Complex =>
    make_from_real_imag(real_part(z1) - real_part(z2),
                        imag_part(z1) - imag_part(z2));
  const mul_complex = (z1: Complex, z2: Complex): Complex =>
    make_from_mag_ang(magnitude(z1) * magnitude(z2),
                      angle(z1) + angle(z2));
  const div_complex = (z1: Complex, z2: Complex): Complex =>
    make_from_mag_ang(magnitude(z1) / magnitude(z2),
                      angle(z1) - angle(z2));
  // interface to rest of the system
  const tag = (z: Complex): Tagged<Complex> => attach_tag("complex", z);
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
};

const make_complex_from_real_imag = (x: number, y: number): Tagged<Complex> =>
  get("make_from_real_imag", "complex")(x, y);

const make_complex_from_mag_ang = (r: number, a: number): Tagged<Complex> =>
  get("make_from_mag_ang", "complex")(r, a);
`;

/** Alyssa's addition of Exercise 2.77: the selectors, installed for "complex" too. */
export const complexSelectorsInstall = `put("real_part", list("complex"), real_part);
put("imag_part", list("complex"), imag_part);
put("magnitude", list("complex"), magnitude);
put("angle", list("complex"), angle);
`;

/** The base every package plugs into: the table, tags, `apply_generic`, and add, sub, mul, div. */
export const genericBaseDefinitions = `${operationTableDefinitions}
${typeTagDefinitions}
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
export const crossTypeProgram = `const add_complex_to_javascript_num = (z: Complex, x: number): Tagged<Complex> =>
  make_complex_from_real_imag(real_part(z) + x, imag_part(z));

put("add", list("complex", "javascript_number"),
    (z, x) => add_complex_to_javascript_num(z, x));

const z = make_complex_from_real_imag(3, 4);
const sum = add(z, make_javascript_number(5));
sum;
`;

/** `put_coercion` and `get_coercion`: a second table, keyed by two types. */
export const coercionTableDefinitions = `// A coercion turns a datum of one type into the same value as another type.
type Coercion = (datum: unknown) => unknown;

let coercion_table: List<List<unknown>> = null;

const put_coercion = (type1: string, type2: string, coercion: Coercion): void => {
  coercion_table = pair(list(type1, type2, coercion), coercion_table);
};

const get_coercion = (type1: string, type2: string): Coercion | undefined => {
  const lookup = (entries: List<List<unknown>>): Coercion | undefined => {
    if (is_null(entries)) {
      return undefined;
    } else {
      const entry = head(entries);
      return head(entry) === type1 && head(tail(entry)) === type2
        ? head(tail(tail(entry)))
        : lookup(tail(entries));
    }
  };
  return lookup(coercion_table);
};
`;

/** `apply_generic` of §2.5.2: when no method fits, coerce one argument to the other's type. */
export const applyGenericWithCoercion = `const apply_generic = (op: string, ...args: List<unknown>): unknown => {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  if (! is_undefined(fun)) {
    return fun(...map(contents, args));
  } else {
    if (length(args) === 2) {
      const type1 = head(type_tags);
      const type2 = head(tail(type_tags));
      const a1 = head(args);
      const a2 = head(tail(args));
      const t1_to_t2 = get_coercion(type1, type2);
      const t2_to_t1 = get_coercion(type2, type1);
      return ! is_undefined(t1_to_t2)
        ? apply_generic(op, t1_to_t2(a1), a2)
        : ! is_undefined(t2_to_t1)
        ? apply_generic(op, a1, t2_to_t1(a2))
        : error(list(op, type_tags), "no method for these types");
    } else {
      return error(list(op, type_tags), "no method for these types");
    }
  }
};
`;

/** Coercion in the system of §2.5.1; the prelude is `genericArithmeticDefinitions`. */
export const coercionProgram = `${coercionTableDefinitions}
const javascript_number_to_complex = (n: Tagged<number>): Tagged<Complex> =>
  make_complex_from_real_imag(contents(n), 0);

put_coercion("javascript_number", "complex",
             javascript_number_to_complex);

${applyGenericWithCoercion}
// add again, so that it calls this apply_generic
const add = (x: unknown, y: unknown): unknown => apply_generic("add", x, y);

const z = make_complex_from_real_imag(3, 4);
add(make_javascript_number(5), z);
`;
