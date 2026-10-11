import {
  applyGenericDefinition,
  complexTypeDefinitions,
  operationTableDefinitions,
  typeTagDefinitions,
} from './genericArithmetic.ts';

/**
 * Programs of §2.4, multiple representations for abstract data: Ben's
 * rectangular and Alyssa's polar complex numbers, first one at a time, then
 * side by side with type tags, then plugged into an operation table, and
 * finally as message-passing objects.
 *
 * The operation table, the tagging functions, the types of tagged complex
 * numbers, `apply` and `apply_generic` are shared with §2.5 and live in
 * `genericArithmetic.ts`.
 */

// ---------------------------------------------------------------------------
// §2.4.1 Representations for complex numbers

/** Arithmetic on complex numbers, in terms of the four selectors and two constructors. */
export const complexArithmeticDefinitions = `const add_complex = (z1: Complex, z2: Complex): Complex =>
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
`;

/** Ben's representation: a complex number is the pair (real part, imaginary part). */
export const rectangularDefinitions = `type Complex = Pair<number, number>; // real part and imaginary part

const square = (x: number): number =>
  x * x;

const real_part = (z: Complex): number => head(z);

const imag_part = (z: Complex): number => tail(z);

const magnitude = (z: Complex): number =>
  math_sqrt(square(real_part(z)) + square(imag_part(z)));

const angle = (z: Complex): number =>
  math_atan2(imag_part(z), real_part(z));

const make_from_real_imag = (x: number, y: number): Complex => pair(x, y);

const make_from_mag_ang = (r: number, a: number): Complex =>
  pair(r * math_cos(a), r * math_sin(a));
`;

/** Alyssa's representation: a complex number is the pair (magnitude, angle). */
export const polarDefinitions = `type Complex = Pair<number, number>; // magnitude and angle

const square = (x: number): number =>
  x * x;

const real_part = (z: Complex): number =>
  magnitude(z) * math_cos(angle(z));

const imag_part = (z: Complex): number =>
  magnitude(z) * math_sin(angle(z));

const magnitude = (z: Complex): number => head(z);

const angle = (z: Complex): number => tail(z);

const make_from_real_imag = (x: number, y: number): Complex =>
  pair(math_sqrt(square(x) + square(y)),
       math_atan2(y, x));

const make_from_mag_ang = (r: number, a: number): Complex => pair(r, a);
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

/** The tagging functions, the types of tagged complex numbers, and the two predicates on tags. */
export const tagPredicateDefinitions = `${typeTagDefinitions}
${complexTypeDefinitions}
const is_rectangular = (z: Complex): boolean =>
  type_tag(z) === "rectangular";

const is_polar = (z: Complex): boolean =>
  type_tag(z) === "polar";
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
const square = (x: number): number =>
  x * x;

// Ben's rectangular representation
const real_part_rectangular = (z: Rectangular): number => head(z);

const imag_part_rectangular = (z: Rectangular): number => tail(z);

const magnitude_rectangular = (z: Rectangular): number =>
  math_sqrt(square(real_part_rectangular(z)) +
            square(imag_part_rectangular(z)));

const angle_rectangular = (z: Rectangular): number =>
  math_atan2(imag_part_rectangular(z),
             real_part_rectangular(z));

const make_from_real_imag_rectangular = (x: number, y: number): Complex =>
  attach_tag("rectangular", pair(x, y));

const make_from_mag_ang_rectangular = (r: number, a: number): Complex =>
  attach_tag("rectangular",
             pair(r * math_cos(a), r * math_sin(a)));

// Alyssa's polar representation
const real_part_polar = (z: Polar): number =>
  magnitude_polar(z) * math_cos(angle_polar(z));

const imag_part_polar = (z: Polar): number =>
  magnitude_polar(z) * math_sin(angle_polar(z));

const magnitude_polar = (z: Polar): number => head(z);

const angle_polar = (z: Polar): number => tail(z);

const make_from_real_imag_polar = (x: number, y: number): Complex =>
  attach_tag("polar",
             pair(math_sqrt(square(x) + square(y)),
                  math_atan2(y, x)));

const make_from_mag_ang_polar = (r: number, a: number): Complex =>
  attach_tag("polar", pair(r, a));

// The generic selectors: each one dispatches on the tag
const real_part = (z: Complex): number =>
  is_rectangular(z)
    ? real_part_rectangular(contents(z))
    : is_polar(z)
    ? real_part_polar(contents(z))
    : error(z, "unknown type -- real_part");

const imag_part = (z: Complex): number =>
  is_rectangular(z)
    ? imag_part_rectangular(contents(z))
    : is_polar(z)
    ? imag_part_polar(contents(z))
    : error(z, "unknown type -- imag_part");

const magnitude = (z: Complex): number =>
  is_rectangular(z)
    ? magnitude_rectangular(contents(z))
    : is_polar(z)
    ? magnitude_polar(contents(z))
    : error(z, "unknown type -- magnitude");

const angle = (z: Complex): number =>
  is_rectangular(z)
    ? angle_rectangular(contents(z))
    : is_polar(z)
    ? angle_polar(contents(z))
    : error(z, "unknown type -- angle");

// Rectangular when we have real and imaginary parts, polar when we have magnitude and angle
const make_from_real_imag = (x: number, y: number): Complex =>
  make_from_real_imag_rectangular(x, y);

const make_from_mag_ang = (r: number, a: number): Complex =>
  make_from_mag_ang_polar(r, a);
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
 * What the §2.4.3 examples take as given: the table and the tags.
 * The shared definitions are those of `genericArithmetic.ts`.
 */
export const dataDirectedPrelude = `${operationTableDefinitions}
${typeTagDefinitions}`;

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
export const rectangularPackageDefinition = `const install_rectangular_package = (): "done" => {
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
`;

/** Alyssa's package, the same shape with her functions inside. */
export const polarPackageDefinition = `const install_polar_package = (): "done" => {
  // internal functions
  const magnitude = (z: Polar): number => head(z);
  const angle = (z: Polar): number => tail(z);
  const make_from_mag_ang = (r: number, a: number): Polar => pair(r, a);
  const real_part = (z: Polar): number =>
    magnitude(z) * math_cos(angle(z));
  const imag_part = (z: Polar): number =>
    magnitude(z) * math_sin(angle(z));
  const make_from_real_imag = (x: number, y: number): Polar =>
    pair(math_sqrt(square(x) + square(y)),
         math_atan2(y, x));

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
`;

/** The generic selectors and constructors over the table. */
export const dataDirectedInterfaceDefinitions = `${applyGenericDefinition}
const real_part = (z: Complex): number => apply_generic("real_part", z);

const imag_part = (z: Complex): number => apply_generic("imag_part", z);

const magnitude = (z: Complex): number => apply_generic("magnitude", z);

const angle = (z: Complex): number => apply_generic("angle", z);

const make_from_real_imag = (x: number, y: number): Complex =>
  get("make_from_real_imag", "rectangular")(x, y);

const make_from_mag_ang = (r: number, a: number): Complex =>
  get("make_from_mag_ang", "polar")(r, a);
`;

/** The whole data-directed system; the prelude is `dataDirectedPrelude`. */
export const dataDirectedProgram = `${complexTypeDefinitions}
const square = (x: number): number =>
  x * x;

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
export const messagePassingDefinitions = `// A complex number is a function that answers the name of an operation.
type Complex = (op: string) => number;

const square = (x: number): number =>
  x * x;

const make_from_real_imag = (x: number, y: number): Complex => {
  const dispatch = (op: string): number =>
    op === "real_part"
      ? x
      : op === "imag_part"
      ? y
      : op === "magnitude"
      ? math_sqrt(square(x) + square(y))
      : op === "angle"
      ? math_atan2(y, x)
      : error(op, "unknown op -- make_from_real_imag");
  return dispatch;
};

const apply_generic = (op: string, ...args: List<Complex>): number => head(args)(op);

const real_part = (z: Complex): number => apply_generic("real_part", z);

const imag_part = (z: Complex): number => apply_generic("imag_part", z);

const magnitude = (z: Complex): number => apply_generic("magnitude", z);

const angle = (z: Complex): number => apply_generic("angle", z);
`;

export const messagePassingProgram = `${messagePassingDefinitions}
const z = make_from_real_imag(3, 4);

display(magnitude(z));
z("angle");
`;
