import { applyDefinition, applyGenericDefinition, operationTableDefinitions, typeTagDefinitions } from './genericArithmetic.ts';

/**
 * Programs of §2.4, multiple representations for abstract data: Ben's
 * rectangular and Alyssa's polar complex numbers, first one at a time, then
 * side by side with type tags, then plugged into an operation table, and
 * finally as message-passing objects.
 *
 * The operation table, the tagging functions, `apply` and `apply_generic` are
 * shared with §2.5 and live in `genericArithmetic.ts`.
 */

// ---------------------------------------------------------------------------
// §2.4.1 Representations for complex numbers

/** Arithmetic on complex numbers, in terms of the four selectors and two constructors. */
export const complexArithmeticDefinitions = `function add_complex(z1, z2) {
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
`;

/** Ben's representation: a complex number is the pair (real part, imaginary part). */
export const rectangularDefinitions = `function square(x) {
  return x * x;
}

function real_part(z) { return head(z); }

function imag_part(z) { return tail(z); }

function magnitude(z) {
  return math_sqrt(square(real_part(z)) + square(imag_part(z)));
}

function angle(z) {
  return math_atan2(imag_part(z), real_part(z));
}

function make_from_real_imag(x, y) { return pair(x, y); }

function make_from_mag_ang(r, a) {
  return pair(r * math_cos(a), r * math_sin(a));
}
`;

/** Alyssa's representation: a complex number is the pair (magnitude, angle). */
export const polarDefinitions = `function square(x) {
  return x * x;
}

function real_part(z) {
  return magnitude(z) * math_cos(angle(z));
}

function imag_part(z) {
  return magnitude(z) * math_sin(angle(z));
}

function magnitude(z) { return head(z); }

function angle(z) { return tail(z); }

function make_from_real_imag(x, y) {
  return pair(math_sqrt(square(x) + square(y)),
              math_atan2(y, x));
}

function make_from_mag_ang(r, a) { return pair(r, a); }
`;

/** The four numbers every §2.4 example draws: 3 + i, 1 + i, their sum and their product. */
const complexUses = `const z1 = make_from_real_imag(3, 1);
const z2 = make_from_real_imag(1, 1);
const sum = add_complex(z1, z2);
const product = mul_complex(z1, z2);
`;

export const rectangularProgram = `${rectangularDefinitions}
${complexArithmeticDefinitions}
${complexUses}
product;
`;

export const polarProgram = `${polarDefinitions}
${complexArithmeticDefinitions}
${complexUses}
product;
`;

// ---------------------------------------------------------------------------
// §2.4.2 Tagged data

/** The tagging functions, and the two predicates on tags. */
export const tagPredicateDefinitions = `${typeTagDefinitions}
function is_rectangular(z) {
  return type_tag(z) === "rectangular";
}

function is_polar(z) {
  return type_tag(z) === "polar";
}
`;

/** The same pair, read two ways, and told apart by a tag. */
export const typeTagProgram = `${typeTagDefinitions}
const as_rectangular = attach_tag("rectangular", pair(3, 4));
const as_polar = attach_tag("polar", pair(3, 4));

display(type_tag(as_polar));
contents(as_polar);
`;

/** Ben's and Alyssa's representations renamed, tagged, and behind generic selectors. */
export const taggedComplexDefinitions = `${tagPredicateDefinitions}
function square(x) {
  return x * x;
}

// Ben's rectangular representation
function real_part_rectangular(z) { return head(z); }

function imag_part_rectangular(z) { return tail(z); }

function magnitude_rectangular(z) {
  return math_sqrt(square(real_part_rectangular(z)) +
                   square(imag_part_rectangular(z)));
}

function angle_rectangular(z) {
  return math_atan2(imag_part_rectangular(z),
                    real_part_rectangular(z));
}

function make_from_real_imag_rectangular(x, y) {
  return attach_tag("rectangular", pair(x, y));
}

function make_from_mag_ang_rectangular(r, a) {
  return attach_tag("rectangular",
                    pair(r * math_cos(a), r * math_sin(a)));
}

// Alyssa's polar representation
function real_part_polar(z) {
  return magnitude_polar(z) * math_cos(angle_polar(z));
}

function imag_part_polar(z) {
  return magnitude_polar(z) * math_sin(angle_polar(z));
}

function magnitude_polar(z) { return head(z); }

function angle_polar(z) { return tail(z); }

function make_from_real_imag_polar(x, y) {
  return attach_tag("polar",
                    pair(math_sqrt(square(x) + square(y)),
                         math_atan2(y, x)));
}

function make_from_mag_ang_polar(r, a) {
  return attach_tag("polar", pair(r, a));
}

// The generic selectors: each one dispatches on the tag
function real_part(z) {
  return is_rectangular(z)
    ? real_part_rectangular(contents(z))
    : is_polar(z)
    ? real_part_polar(contents(z))
    : error(z, "unknown type -- real_part");
}

function imag_part(z) {
  return is_rectangular(z)
    ? imag_part_rectangular(contents(z))
    : is_polar(z)
    ? imag_part_polar(contents(z))
    : error(z, "unknown type -- imag_part");
}

function magnitude(z) {
  return is_rectangular(z)
    ? magnitude_rectangular(contents(z))
    : is_polar(z)
    ? magnitude_polar(contents(z))
    : error(z, "unknown type -- magnitude");
}

function angle(z) {
  return is_rectangular(z)
    ? angle_rectangular(contents(z))
    : is_polar(z)
    ? angle_polar(contents(z))
    : error(z, "unknown type -- angle");
}

// Rectangular when we have real and imaginary parts, polar when we have magnitude and angle
function make_from_real_imag(x, y) {
  return make_from_real_imag_rectangular(x, y);
}

function make_from_mag_ang(r, a) {
  return make_from_mag_ang_polar(r, a);
}
`;

/** Both representations in one program: 3 + i is rectangular, 1 + i polar. */
export const taggedComplexProgram = `${taggedComplexDefinitions}
${complexArithmeticDefinitions}
const z1 = make_from_real_imag(3, 1);
const z2 = make_from_mag_ang(math_sqrt(2), math_PI / 4);
const sum = add_complex(z1, z2);
const product = mul_complex(z1, z2);

product;
`;

/** Figure 2.21 as layers: the arithmetic over the generic selectors over the two representations. */
export const taggedLayersProgram = `${taggedComplexDefinitions}
${complexArithmeticDefinitions}
mul_complex(add_complex(make_from_real_imag(3, 1),
                        make_from_mag_ang(2, 0)),
            make_from_real_imag(0, 1));
`;

/** One sum, two dispatches; the prelude is `taggedComplexDefinitions`. */
export const dispatchProgram = `const z1 = make_from_real_imag(3, 1);
const z2 = make_from_mag_ang(2, 0);

real_part(z1) + real_part(z2);
`;

// ---------------------------------------------------------------------------
// §2.4.3 Data-directed programming and additivity

/**
 * What the §2.4.3 examples take as given: the table, the tags, and `apply`.
 * The shared definitions are those of `genericArithmetic.ts`.
 */
export const dataDirectedPrelude = `${operationTableDefinitions}
${typeTagDefinitions}
${applyDefinition}`;

/** The table on its own: a few entries put in, two looked up. */
export const operationTableProgram = `${operationTableDefinitions}
put("real_part", list("rectangular"), head);
put("imag_part", list("rectangular"), tail);
put("magnitude", list("polar"), head);
put("angle", list("polar"), tail);

const z = pair(2, 0.5);
display(get("angle", list("polar"))(z));
get("angle", list("rectangular"));
`;

/** Ben's package, as he wrote it in §2.4.1, wrapped in an installation function. */
export const rectangularPackageDefinition = `function install_rectangular_package() {
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
`;

/** Alyssa's package, the same shape with her functions inside. */
export const polarPackageDefinition = `function install_polar_package() {
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
    return pair(math_sqrt(square(x) + square(y)),
                math_atan2(y, x));
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
`;

/** The generic selectors and constructors over the table. */
export const dataDirectedInterfaceDefinitions = `${applyGenericDefinition}
function real_part(z) { return apply_generic("real_part", list(z)); }

function imag_part(z) { return apply_generic("imag_part", list(z)); }

function magnitude(z) { return apply_generic("magnitude", list(z)); }

function angle(z) { return apply_generic("angle", list(z)); }

function make_from_real_imag(x, y) {
  return get("make_from_real_imag", "rectangular")(x, y);
}

function make_from_mag_ang(r, a) {
  return get("make_from_mag_ang", "polar")(r, a);
}
`;

/** The whole data-directed system; the prelude is `dataDirectedPrelude`. */
export const dataDirectedProgram = `function square(x) {
  return x * x;
}

${rectangularPackageDefinition}
${polarPackageDefinition}
${dataDirectedInterfaceDefinitions}
install_rectangular_package();
install_polar_package();

const z1 = make_from_real_imag(3, 1);
const z2 = make_from_mag_ang(math_sqrt(2), math_PI / 4);

display(magnitude(z1));
real_part(z2);
`;

/** A data object that is a function of the operation's name. */
export const messagePassingDefinitions = `function square(x) {
  return x * x;
}

function make_from_real_imag(x, y) {
  function dispatch(op) {
    return op === "real_part"
      ? x
      : op === "imag_part"
      ? y
      : op === "magnitude"
      ? math_sqrt(square(x) + square(y))
      : op === "angle"
      ? math_atan2(y, x)
      : error(op, "unknown op -- make_from_real_imag");
  }
  return dispatch;
}

function apply_generic(op, arg) { return head(arg)(op); }

function real_part(z) { return apply_generic("real_part", list(z)); }

function imag_part(z) { return apply_generic("imag_part", list(z)); }

function magnitude(z) { return apply_generic("magnitude", list(z)); }

function angle(z) { return apply_generic("angle", list(z)); }
`;

export const messagePassingProgram = `${messagePassingDefinitions}
const z = make_from_real_imag(3, 4);

display(magnitude(z));
z("angle");
`;
