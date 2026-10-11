/**
 * Section 1.3.3: two general methods, each a function that takes the
 * function it works on as an argument.
 */

export const averageDefinition = `const average = (x, y) =>
  (x + y) / 2;
`;

export const halfIntervalDefinitions = `${averageDefinition}
const positive = (x) =>
  x > 0;

const negative = (x) =>
  x < 0;

const close_enough = (x, y) =>
  math_abs(x - y) < 0.001;

const search = (f, neg_point, pos_point) => {
  const midpoint = average(neg_point, pos_point);
  if (close_enough(neg_point, pos_point)) {
    return midpoint;
  } else {
    const test_value = f(midpoint);
    return positive(test_value)
      ? search(f, neg_point, midpoint)
      : negative(test_value)
        ? search(f, midpoint, pos_point)
        : midpoint;
  }
};

const half_interval_method = (f, a, b) => {
  const a_value = f(a);
  const b_value = f(b);
  return negative(a_value) && positive(b_value)
    ? search(f, a, b)
    : negative(b_value) && positive(a_value)
      ? search(f, b, a)
      : error("values are not of opposite sign");
};
`;

export const halfIntervalProgram = `${halfIntervalDefinitions}
half_interval_method(math_sin, 2, 4);
`;

export const fixedPointDefinitions = `const tolerance = 0.00001;

const fixed_point = (f, first_guess) => {
  const close_enough = (x, y) =>
    math_abs(x - y) < tolerance;
  const try_with = (guess) => {
    const next = f(guess);
    return close_enough(guess, next)
      ? next
      : try_with(next);
  };
  return try_with(first_guess);
};
`;

export const fixedPointProgram = `${fixedPointDefinitions}
fixed_point(math_cos, 1);
`;

/** Searching for √2 as a fixed point of y ↦ 2 / y: the guesses never settle. */
export const oscillatingProgram = `${fixedPointDefinitions}
const x = 2;
fixed_point(y => x / y, 1);
`;

/** The same search with average damping, which converges. */
export const dampedProgram = `${fixedPointDefinitions}
${averageDefinition}
const x = 2;
fixed_point(y => average(y, x / y), 1);
`;
