import {
  applyDefinition,
  applyGenericDefinition,
  coercionTableDefinitions,
  complexPackage,
  complexRepresentationPackages,
  complexSelectorsInstall,
  genericArithmeticDefinitions,
  genericOperationDefinitions,
  javascriptNumberPackage,
  operationTableDefinitions,
  plainNumberArithmeticDefinitions,
  plainNumberTagDefinitions,
  rationalPackage,
  typeTagDefinitions,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §2.5.1 – §2.5.2. Each export is an ExerciseSpec. */

export const exercise_2_77: ExerciseSpec = {
  id: '2.77',
  prelude: genericArithmeticDefinitions,
  starter: `// The prelude is the system of this section with every package installed:
// put, get, apply_generic, the selectors real_part, imag_part, magnitude
// and angle of §2.4.3, and the complex package.
const z = make_complex_from_real_imag(3, 4);

// Alyssa's suggestion: install the four selectors for "complex" numbers.
// your answer

// How many times does magnitude(z) invoke apply_generic?
const apply_generic_calls = 0;

// The type tag each of those invocations dispatches on, in order,
// as a list of strings.
const dispatched_on = null;
`,
  tests: [
    { name: 'magnitude(z) is 5', kind: 'value', expr: 'magnitude(z)', expected: 5 },
    { name: 'the other selectors work too', kind: 'value', expr: 'real_part(z) * 100 + imag_part(z) * 10 + angle(make_complex_from_real_imag(1, 0))', expected: 340 },
    { name: 'your count of apply_generic', kind: 'value', expr: 'apply_generic_calls', expected: 2 },
    { name: 'the count, measured', kind: 'calls', call: 'magnitude(z)', fn: 'apply_generic', atMost: 2 },
    { name: 'the tags dispatched on', kind: 'value', expr: 'equal(dispatched_on, list("complex", "rectangular"))', expected: true },
  ],
  solution: `const z = make_complex_from_real_imag(3, 4);

put("real_part", list("complex"), real_part);
put("imag_part", list("complex"), imag_part);
put("magnitude", list("complex"), magnitude);
put("angle", list("complex"), angle);

const apply_generic_calls = 2;

const dispatched_on = list("complex", "rectangular");
`,
};

export const exercise_2_78: ExerciseSpec = {
  id: '2.78',
  prelude: `${operationTableDefinitions}
${applyDefinition}`,
  starter: `// The prelude provides put, get and apply.

// your answer: change these three so that a plain number is a
// "javascript_number" datum with no tag attached.
${typeTagDefinitions}
${applyGenericDefinition}
${genericOperationDefinitions}
${javascriptNumberPackage}
install_javascript_number_package();
`,
  tests: [
    { name: 'add(3, 4) with plain numbers', kind: 'value', expr: 'add(3, 4)', expected: 7 },
    { name: 'make_javascript_number makes a plain number', kind: 'value', expr: 'mul(make_javascript_number(6), 7)', expected: 42 },
    { name: 'type_tag, contents and attach_tag on numbers', kind: 'value', expr: 'type_tag(5) === "javascript_number" && contents(5) === 5 && attach_tag("javascript_number", 5) === 5', expected: true },
    { name: 'other types are still tagged', kind: 'value', expr: 'equal(attach_tag("rational", pair(1, 2)), pair("rational", pair(1, 2))) && type_tag(pair("rational", pair(1, 2))) === "rational" && head(contents(pair("rational", pair(1, 2)))) === 1', expected: true },
  ],
  solution: `function attach_tag(type_tag, contents) {
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

${applyGenericDefinition}
${genericOperationDefinitions}
${javascriptNumberPackage}
install_javascript_number_package();
`,
};

const plainSystemComment = `// The prelude is the generic arithmetic system with Exercise 2.78's plain
// numbers: put, get, apply_generic, add, sub, mul, div, make_rational,
// make_complex_from_real_imag, make_complex_from_mag_ang, and the
// selectors real_part, imag_part, magnitude and angle, which work on
// "complex" numbers as Exercise 2.77 arranged.`;

export const exercise_2_79: ExerciseSpec = {
  id: '2.79',
  prelude: plainNumberArithmeticDefinitions,
  starter: `${plainSystemComment}
// A rational number's contents are pair(numer, denom).

function is_equal(x, y) {
  return apply_generic("is_equal", list(x, y));
}

// your answer: put an "is_equal" method for each type of number
`,
  tests: [
    { name: 'ordinary numbers', kind: 'value', expr: 'is_equal(3, 3) && ! is_equal(3, 4)', expected: true },
    { name: 'rational numbers', kind: 'value', expr: 'is_equal(make_rational(1, 2), make_rational(2, 4)) && ! is_equal(make_rational(1, 2), make_rational(1, 3))', expected: true },
    { name: 'complex numbers', kind: 'value', expr: 'is_equal(make_complex_from_real_imag(3, 4), make_complex_from_real_imag(3, 4)) && ! is_equal(make_complex_from_real_imag(3, 4), make_complex_from_real_imag(3, -4))', expected: true },
    { name: 'complex numbers in different representations', kind: 'value', expr: 'is_equal(make_complex_from_real_imag(2, 0), make_complex_from_mag_ang(2, 0)) && ! is_equal(make_complex_from_real_imag(2, 0), make_complex_from_mag_ang(2, 1))', expected: true },
  ],
  solution: `function is_equal(x, y) {
  return apply_generic("is_equal", list(x, y));
}

put("is_equal", list("javascript_number", "javascript_number"),
    (x, y) => x === y);
put("is_equal", list("rational", "rational"),
    (x, y) => head(x) * tail(y) === head(y) * tail(x));
put("is_equal", list("complex", "complex"),
    (z1, z2) => real_part(z1) === real_part(z2) &&
                imag_part(z1) === imag_part(z2));
`,
};

export const exercise_2_80: ExerciseSpec = {
  id: '2.80',
  prelude: plainNumberArithmeticDefinitions,
  starter: `${plainSystemComment}
// A rational number's contents are pair(numer, denom).

function is_equal_to_zero(x) {
  return apply_generic("is_equal_to_zero", list(x));
}

// your answer: put an "is_equal_to_zero" method for each type of number
`,
  tests: [
    { name: 'ordinary numbers', kind: 'value', expr: 'is_equal_to_zero(0) && ! is_equal_to_zero(5)', expected: true },
    { name: 'rational numbers', kind: 'value', expr: 'is_equal_to_zero(make_rational(0, 3)) && ! is_equal_to_zero(make_rational(1, 3))', expected: true },
    { name: 'complex numbers', kind: 'value', expr: 'is_equal_to_zero(make_complex_from_real_imag(0, 0)) && ! is_equal_to_zero(make_complex_from_real_imag(0, 1)) && ! is_equal_to_zero(make_complex_from_real_imag(1, 0))', expected: true },
    { name: 'zero in polar form', kind: 'value', expr: 'is_equal_to_zero(make_complex_from_mag_ang(0, 1)) && ! is_equal_to_zero(make_complex_from_mag_ang(1, 0))', expected: true },
  ],
  solution: `function is_equal_to_zero(x) {
  return apply_generic("is_equal_to_zero", list(x));
}

put("is_equal_to_zero", list("javascript_number"),
    x => x === 0);
put("is_equal_to_zero", list("rational"),
    x => head(x) === 0);
put("is_equal_to_zero", list("complex"),
    z => magnitude(z) === 0);
`,
};

/** Coercion support shared by Exercises 2.81 and 2.82, on the plain-number system. */
const coercionPrelude = `${plainNumberArithmeticDefinitions}
${coercionTableDefinitions}
function javascript_number_to_complex(n) {
  return make_complex_from_real_imag(contents(n), 0);
}
put_coercion("javascript_number", "complex", javascript_number_to_complex);
`;

/** The apply_generic of §2.5.2. */
const twoArgumentApplyGeneric = `function apply_generic(op, args) {
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

export const exercise_2_81: ExerciseSpec = {
  id: '2.81',
  prelude: `${coercionPrelude}
// Louis's coercions
function javascript_number_to_javascript_number(n) { return n; }
function complex_to_complex(z) { return z; }
put_coercion("javascript_number", "javascript_number",
             javascript_number_to_javascript_number);
put_coercion("complex", "complex", complex_to_complex);

// exponentiation, for ordinary numbers only
put("exp", list("javascript_number", "javascript_number"),
    (x, y) => math_pow(x, y));
`,
  starter: `// The prelude is the plain-number system with a coercion table, the
// coercion javascript_number_to_complex, Louis's two coercions, and an
// "exp" method for ordinary numbers only.

// your answer: change apply_generic so that it does not try coercion
// when both arguments have the same type.
${twoArgumentApplyGeneric}
function exp(x, y) { return apply_generic("exp", list(x, y)); }

function add(x, y) { return apply_generic("add", list(x, y)); }

// What happens with Louis's coercions and the apply_generic of the text,
// if exp is called with two complex numbers?
// One of "no method error", "loops forever", "wrong answer".
const exp_on_complex = "";

// Did something have to be done about arguments of the same type?
const louis_is_right = undefined;
`,
  tests: [
    { name: 'what Louis gets', kind: 'value', expr: 'exp_on_complex', expected: 'loops forever' },
    { name: 'whether Louis is right', kind: 'value', expr: 'louis_is_right', expected: false },
    { name: 'exp on two complex numbers stops with "no method"', kind: 'error', call: 'exp(make_complex_from_real_imag(1, 2), make_complex_from_real_imag(3, 4))', message: 'no method' },
    { name: 'so does exp on a complex and an ordinary number', kind: 'error', call: 'exp(make_complex_from_real_imag(1, 2), 3)', message: 'no method' },
    { name: 'exp on ordinary numbers still works', kind: 'value', expr: 'exp(2, 10)', expected: 1024 },
    { name: 'mixed types are still coerced', kind: 'value', expr: 'equal(add(5, make_complex_from_real_imag(3, 4)), make_complex_from_real_imag(8, 4))', expected: true },
  ],
  solution: `function apply_generic(op, args) {
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
      if (type1 === type2) {
        return error(list(op, type_tags), "no method for these types");
      } else {
        const t1_to_t2 = get_coercion(type1, type2);
        const t2_to_t1 = get_coercion(type2, type1);
        return ! is_undefined(t1_to_t2)
          ? apply_generic(op, list(t1_to_t2(a1), a2))
          : ! is_undefined(t2_to_t1)
          ? apply_generic(op, list(a1, t2_to_t1(a2)))
          : error(list(op, type_tags), "no method for these types");
      }
    } else {
      return error(list(op, type_tags), "no method for these types");
    }
  }
}

function exp(x, y) { return apply_generic("exp", list(x, y)); }

function add(x, y) { return apply_generic("add", list(x, y)); }

const exp_on_complex = "loops forever";

const louis_is_right = false;
`,
};

export const exercise_2_82: ExerciseSpec = {
  id: '2.82',
  prelude: `${coercionPrelude}
function javascript_number_to_rational(n) {
  return make_rational(contents(n), 1);
}
function rational_to_complex(r) {
  return make_complex_from_real_imag(head(contents(r)) / tail(contents(r)), 0);
}
put_coercion("javascript_number", "rational", javascript_number_to_rational);
put_coercion("rational", "complex", rational_to_complex);

// a three-argument operation, for complex numbers only
put("add3", list("complex", "complex", "complex"),
    (z1, z2, z3) => add(attach_tag("complex", z1),
                        add(attach_tag("complex", z2),
                            attach_tag("complex", z3))));
`,
  starter: `// The prelude is the plain-number system with a coercion table holding
// javascript_number to complex, javascript_number to rational and
// rational to complex, and an "add3" method for three complex numbers
// only. apply handles up to three arguments.

// your answer: coerce any number of arguments, trying the type of each
// argument in turn as the type to coerce all of them to.
${twoArgumentApplyGeneric}
function add(x, y) { return apply_generic("add", list(x, y)); }

function add3(x, y, z) { return apply_generic("add3", list(x, y, z)); }

// Which of these calls does your strategy fail on, although every
// argument could be coerced to complex? Answer 1, 2 or 3.
//   1. add3(1, make_complex_from_real_imag(3, 4), 2)
//   2. add3(make_rational(1, 2), make_complex_from_real_imag(3, 4), 3)
//   3. add3(1, make_rational(1, 2), 3)
const not_general_enough = 0;
`,
  tests: [
    { name: 'three arguments, two coerced', kind: 'value', expr: 'equal(add3(1, make_complex_from_real_imag(3, 4), 2), make_complex_from_real_imag(6, 4))', expected: true },
    { name: 'three arguments of three types', kind: 'value', expr: 'equal(add3(make_rational(1, 2), make_complex_from_real_imag(3, 4), 3), make_complex_from_real_imag(6.5, 4))', expected: true },
    { name: 'two arguments still work', kind: 'value', expr: 'equal(add(1, make_rational(1, 2)), make_rational(3, 2)) && equal(add(make_complex_from_real_imag(3, 4), 1), make_complex_from_real_imag(4, 4))', expected: true },
    { name: 'the call the strategy misses', kind: 'value', expr: 'not_general_enough', expected: 3 },
  ],
  budget: 300_000,
  solution: `// Coerce every argument to type target: a list, or undefined if one cannot be.
function coerce_all(args, target) {
  if (is_null(args)) {
    return null;
  } else {
    const rest = coerce_all(tail(args), target);
    const arg = head(args);
    const coercion = type_tag(arg) === target
      ? x => x
      : get_coercion(type_tag(arg), target);
    return is_undefined(rest) || is_undefined(coercion)
      ? undefined
      : pair(coercion(arg), rest);
  }
}

function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  function try_types(targets) {
    if (is_null(targets)) {
      return error(list(op, type_tags), "no method for these types");
    } else {
      const coerced = coerce_all(args, head(targets));
      const fun = is_undefined(coerced)
        ? undefined
        : get(op, map(type_tag, coerced));
      return is_undefined(fun)
        ? try_types(tail(targets))
        : apply(fun, map(contents, coerced));
    }
  }
  const fun = get(op, type_tags);
  return ! is_undefined(fun)
    ? apply(fun, map(contents, args))
    : try_types(type_tags);
}

function add(x, y) { return apply_generic("add", list(x, y)); }

function add3(x, y, z) { return apply_generic("add3", list(x, y, z)); }

const not_general_enough = 3;
`,
};

/**
 * The tower of Exercises 2.83 – 2.85: integer, rational, real, complex, each
 * a tagged type, on the table and apply_generic of §2.5.1.
 */
const towerSystemWith = (applyGeneric: string): string => `${operationTableDefinitions}
${typeTagDefinitions}
${applyDefinition}
${applyGeneric}
${genericOperationDefinitions}
function install_integer_package() {
  function tag(x) { return attach_tag("integer", x); }
  put("add", list("integer", "integer"), (x, y) => tag(x + y));
  put("sub", list("integer", "integer"), (x, y) => tag(x - y));
  put("mul", list("integer", "integer"), (x, y) => tag(x * y));
  put("div", list("integer", "integer"), (x, y) => make_rational(x, y));
  put("make", "integer", n => tag(n));
  return "done";
}

function make_integer(n) {
  return get("make", "integer")(n);
}

function install_real_package() {
  function tag(x) { return attach_tag("real", x); }
  put("add", list("real", "real"), (x, y) => tag(x + y));
  put("sub", list("real", "real"), (x, y) => tag(x - y));
  put("mul", list("real", "real"), (x, y) => tag(x * y));
  put("div", list("real", "real"), (x, y) => tag(x / y));
  put("make", "real", x => tag(x));
  return "done";
}

function make_real(x) {
  return get("make", "real")(x);
}

${rationalPackage}
${complexRepresentationPackages}
${complexPackage}
install_integer_package();
install_rational_package();
install_real_package();
install_rectangular_package();
install_polar_package();
install_complex_package();
${complexSelectorsInstall}`;

const towerSystem = towerSystemWith(applyGenericDefinition);

const towerComment = `// The prelude is a generic arithmetic system for the tower
// integer, rational, real, complex: put, get, apply_generic, add, sub,
// mul, div, make_integer, make_rational, make_real,
// make_complex_from_real_imag and the complex selectors. A rational
// number's contents are pair(numer, denom).`;

const raiseSolution = `function raise(x) {
  return apply_generic("raise", list(x));
}

function integer_to_rational(n) {
  return make_rational(n, 1);
}

function rational_to_real(r) {
  return make_real(head(r) / tail(r));
}

function real_to_complex(x) {
  return make_complex_from_real_imag(x, 0);
}

put("raise", list("integer"), integer_to_rational);
put("raise", list("rational"), rational_to_real);
put("raise", list("real"), real_to_complex);
`;

export const exercise_2_83: ExerciseSpec = {
  id: '2.83',
  prelude: towerSystem,
  starter: `${towerComment}

function raise(x) {
  return apply_generic("raise", list(x));
}

// your answer: a raising function for integer, rational and real,
// each installed in the table as "raise"
`,
  tests: [
    { name: 'an integer becomes a rational', kind: 'value', expr: 'equal(raise(make_integer(3)), make_rational(3, 1))', expected: true },
    { name: 'a rational becomes a real', kind: 'value', expr: 'equal(raise(make_rational(1, 2)), make_real(0.5))', expected: true },
    { name: 'a real becomes a complex', kind: 'value', expr: 'equal(raise(make_real(0.5)), make_complex_from_real_imag(0.5, 0))', expected: true },
    { name: 'up the whole tower', kind: 'value', expr: 'equal(raise(raise(raise(make_integer(2)))), make_complex_from_real_imag(2, 0))', expected: true },
  ],
  solution: raiseSolution,
};

const raisingApplyGeneric = `// A type's level is how many times it can be raised: 0 for the top.
function level(x) {
  return is_undefined(get("raise", list(type_tag(x))))
    ? 0
    : 1 + level(raise(x));
}

function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  if (! is_undefined(fun)) {
    return apply(fun, map(contents, args));
  } else if (length(args) === 2 &&
             head(type_tags) !== head(tail(type_tags))) {
    const a1 = head(args);
    const a2 = head(tail(args));
    return level(a1) > level(a2)
      ? apply_generic(op, list(raise(a1), a2))
      : apply_generic(op, list(a1, raise(a2)));
  } else {
    return error(list(op, type_tags), "no method for these types");
  }
}
`;

export const exercise_2_84: ExerciseSpec = {
  id: '2.84',
  prelude: `${towerSystem}
${raiseSolution}`,
  starter: `${towerComment}
// raise, from Exercise 2.83, is installed for integer, rational and real.

// your answer: coerce two arguments of different types by raising the
// lower one until they are at the same level.
${applyGenericDefinition}
${genericOperationDefinitions}`,
  tests: [
    { name: 'integer and rational', kind: 'value', expr: 'equal(add(make_integer(1), make_rational(1, 2)), make_rational(3, 2))', expected: true },
    { name: 'rational and integer', kind: 'value', expr: 'equal(sub(make_rational(1, 2), make_integer(1)), make_rational(-1, 2))', expected: true },
    { name: 'integer and complex, three levels apart', kind: 'value', expr: 'equal(add(make_integer(2), make_complex_from_real_imag(3, 4)), make_complex_from_real_imag(5, 4))', expected: true },
    { name: 'real and integer', kind: 'value', expr: 'equal(mul(make_real(0.5), make_integer(4)), make_real(2))', expected: true },
    { name: 'same types as before', kind: 'value', expr: 'equal(add(make_integer(1), make_integer(2)), make_integer(3))', expected: true },
  ],
  budget: 300_000,
  solution: `${raisingApplyGeneric}
${genericOperationDefinitions}`,
};

export const exercise_2_85: ExerciseSpec = {
  id: '2.85',
  prelude: `${towerSystemWith(raisingApplyGeneric)}
${raiseSolution}
function is_equal(x, y) {
  return apply_generic("is_equal", list(x, y));
}
put("is_equal", list("integer", "integer"), (x, y) => x === y);
put("is_equal", list("rational", "rational"),
    (x, y) => head(x) * tail(y) === head(y) * tail(x));
put("is_equal", list("real", "real"), (x, y) => x === y);
put("is_equal", list("complex", "complex"),
    (z1, z2) => real_part(z1) === real_part(z2) &&
                imag_part(z1) === imag_part(z2));
`,
  starter: `${towerComment}
// raise (Exercise 2.83) and is_equal (Exercise 2.79) are installed for
// every level, and apply_generic raises as in Exercise 2.84.

function project(x) {
  return apply_generic("project", list(x));
}

// your answer: install "project" for complex, real and rational
// (math_round gives the nearest integer), then write drop.
function drop(x) {
}

// your answer: make this apply_generic simplify its answers with drop.
${raisingApplyGeneric}
${genericOperationDefinitions}`,
  tests: [
    { name: '1.5 + 0i drops to a real', kind: 'value', expr: 'equal(drop(make_complex_from_real_imag(1.5, 0)), make_real(1.5))', expected: true },
    { name: '1 + 0i drops to an integer', kind: 'value', expr: 'equal(drop(make_complex_from_real_imag(1, 0)), make_integer(1))', expected: true },
    { name: '2 + 3i does not drop', kind: 'value', expr: 'equal(drop(make_complex_from_real_imag(2, 3)), make_complex_from_real_imag(2, 3))', expected: true },
    { name: '6/3 drops to 2', kind: 'value', expr: 'equal(drop(make_rational(6, 3)), make_integer(2))', expected: true },
    { name: '(2 + 3i) + (4 − 3i) is the integer 6', kind: 'value', expr: 'equal(add(make_complex_from_real_imag(2, 3), make_complex_from_real_imag(4, -3)), make_integer(6))', expected: true },
    { name: 'answers that cannot drop stay put', kind: 'value', expr: 'equal(mul(make_rational(1, 2), make_integer(3)), make_rational(3, 2)) && equal(add(make_real(0.5), make_rational(1, 2)), make_integer(1))', expected: true },
  ],
  budget: 1_000_000,
  solution: `function project(x) {
  return apply_generic("project", list(x));
}

put("project", list("complex"),
    z => make_real(real_part(z)));
put("project", list("real"),
    x => make_rational(math_round(x), 1));
put("project", list("rational"),
    r => make_integer(math_round(head(r) / tail(r))));

function drop(x) {
  if (is_undefined(get("project", list(type_tag(x))))) {
    return x;
  } else {
    const lower = project(x);
    return is_equal(raise(lower), x) ? drop(lower) : x;
  }
}

// A type's level is how many times it can be raised: 0 for the top.
function level(x) {
  return is_undefined(get("raise", list(type_tag(x))))
    ? 0
    : 1 + level(raise(x));
}

function is_arithmetic(op) {
  return op === "add" || op === "sub" || op === "mul" || op === "div";
}

function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  if (! is_undefined(fun)) {
    const result = apply(fun, map(contents, args));
    return is_arithmetic(op) ? drop(result) : result;
  } else if (length(args) === 2 &&
             head(type_tags) !== head(tail(type_tags))) {
    const a1 = head(args);
    const a2 = head(tail(args));
    return level(a1) > level(a2)
      ? apply_generic(op, list(raise(a1), a2))
      : apply_generic(op, list(a1, raise(a2)));
  } else {
    return error(list(op, type_tags), "no method for these types");
  }
}

${genericOperationDefinitions}`,
};

/** For Exercise 2.86: ordinary and rational numbers, with coercion from rational to ordinary. */
const genericPartsPrelude = `${operationTableDefinitions}
${plainNumberTagDefinitions}
${applyDefinition}
${coercionTableDefinitions}
function apply_generic(op, args) {
  const type_tags = map(type_tag, args);
  const fun = get(op, type_tags);
  if (! is_undefined(fun)) {
    return apply(fun, map(contents, args));
  } else if (length(args) === 2 &&
             head(type_tags) !== head(tail(type_tags))) {
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

${genericOperationDefinitions}
${javascriptNumberPackage}
${rationalPackage}
install_javascript_number_package();
install_rational_package();

function rational_to_javascript_number(r) {
  return head(contents(r)) / tail(contents(r));
}
put_coercion("rational", "javascript_number", rational_to_javascript_number);
`;

const complexStarterPackages = `${complexRepresentationPackages}
${complexPackage}`;

export const exercise_2_86: ExerciseSpec = {
  id: '2.86',
  prelude: genericPartsPrelude,
  starter: `// The prelude has ordinary numbers (plain, as in Exercise 2.78) and
// rational numbers, with add, sub, mul and div, and an apply_generic that
// coerces a rational to an ordinary number when the two are mixed.
// A rational number's contents are pair(numer, denom).

function sine(x) { return apply_generic("sine", list(x)); }
function cosine(x) { return apply_generic("cosine", list(x)); }
function square_root(x) { return apply_generic("square_root", list(x)); }
function arctan(y, x) { return apply_generic("arctan", list(y, x)); }
// your answer: install sine, cosine, square_root and arctan for
// ordinary and rational numbers

// your answer: make the parts of a complex number generic numbers.
${complexStarterPackages}
install_rectangular_package();
install_polar_package();
install_complex_package();
${complexSelectorsInstall}`,
  tests: [
    { name: 'sine and cosine of ordinary and rational numbers', kind: 'value', expr: 'sine(0) === 0 && cosine(0) === 1 && math_abs(sine(make_rational(1, 2)) - math_sin(0.5)) < 1e-12 && math_abs(cosine(make_rational(1, 3)) - math_cos(1 / 3)) < 1e-12', expected: true },
    { name: 'rational parts add as rationals', kind: 'value', expr: 'equal(add(make_complex_from_real_imag(make_rational(1, 2), 1), make_complex_from_real_imag(make_rational(1, 3), 2)), make_complex_from_real_imag(make_rational(5, 6), 3))', expected: true },
    { name: 'the magnitude of 3/1 + 4i', kind: 'value', expr: 'magnitude(make_complex_from_real_imag(make_rational(3, 1), 4))', expected: 5 },
    { name: 'multiplying through the polar form', kind: 'value', expr: 'real_part(mul(make_complex_from_real_imag(make_rational(1, 2), 0), make_complex_from_real_imag(2, 0)))', expected: 1 },
    { name: 'a rational magnitude in polar form', kind: 'value', expr: 'real_part(make_complex_from_mag_ang(make_rational(1, 2), 0))', expected: 0.5 },
    { name: 'ordinary parts still work', kind: 'value', expr: 'magnitude(make_complex_from_real_imag(3, 4)) === 5 && equal(sub(make_complex_from_real_imag(3, 4), make_complex_from_real_imag(1, 1)), make_complex_from_real_imag(2, 3))', expected: true },
  ],
  budget: 500_000,
  solution: `function sine(x) { return apply_generic("sine", list(x)); }
function cosine(x) { return apply_generic("cosine", list(x)); }
function square_root(x) { return apply_generic("square_root", list(x)); }
function arctan(y, x) { return apply_generic("arctan", list(y, x)); }

function rational_value(r) { return head(r) / tail(r); }

put("sine", list("javascript_number"), math_sin);
put("cosine", list("javascript_number"), math_cos);
put("square_root", list("javascript_number"), math_sqrt);
put("arctan", list("javascript_number", "javascript_number"), math_atan2);
put("sine", list("rational"), r => math_sin(rational_value(r)));
put("cosine", list("rational"), r => math_cos(rational_value(r)));
put("square_root", list("rational"), r => math_sqrt(rational_value(r)));
put("arctan", list("rational", "rational"),
    (y, x) => math_atan2(rational_value(y), rational_value(x)));

function square(x) {
  return mul(x, x);
}

function install_rectangular_package() {
  function real_part(z) { return head(z); }
  function imag_part(z) { return tail(z); }
  function make_from_real_imag(x, y) { return pair(x, y); }
  function magnitude(z) {
    return square_root(add(square(real_part(z)), square(imag_part(z))));
  }
  function angle(z) {
    return arctan(imag_part(z), real_part(z));
  }
  function make_from_mag_ang(r, a) {
    return pair(mul(r, cosine(a)), mul(r, sine(a)));
  }
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
  function magnitude(z) { return head(z); }
  function angle(z) { return tail(z); }
  function make_from_mag_ang(r, a) { return pair(r, a); }
  function real_part(z) {
    return mul(magnitude(z), cosine(angle(z)));
  }
  function imag_part(z) {
    return mul(magnitude(z), sine(angle(z)));
  }
  function make_from_real_imag(x, y) {
    return pair(square_root(add(square(x), square(y))), arctan(y, x));
  }
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

function install_complex_package() {
  function make_from_real_imag(x, y) {
    return get("make_from_real_imag", "rectangular")(x, y);
  }
  function make_from_mag_ang(r, a) {
    return get("make_from_mag_ang", "polar")(r, a);
  }
  function add_complex(z1, z2) {
    return make_from_real_imag(add(real_part(z1), real_part(z2)),
                               add(imag_part(z1), imag_part(z2)));
  }
  function sub_complex(z1, z2) {
    return make_from_real_imag(sub(real_part(z1), real_part(z2)),
                               sub(imag_part(z1), imag_part(z2)));
  }
  function mul_complex(z1, z2) {
    return make_from_mag_ang(mul(magnitude(z1), magnitude(z2)),
                             add(angle(z1), angle(z2)));
  }
  function div_complex(z1, z2) {
    return make_from_mag_ang(div(magnitude(z1), magnitude(z2)),
                             sub(angle(z1), angle(z2)));
  }
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

install_rectangular_package();
install_polar_package();
install_complex_package();
${complexSelectorsInstall}`,
};
