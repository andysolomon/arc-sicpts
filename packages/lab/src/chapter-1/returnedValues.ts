import { averageDefinition, fixedPointDefinitions } from './generalMethods.ts';

/**
 * Section 1.3.4: functions that return functions, and the methods of §1.3.3
 * restated with them.
 */

export const averageDampProgram = `${averageDefinition}
const square = (x) =>
  x * x;

const average_damp = (f) =>
  x => average(x, f(x));

const damped_square = average_damp(square);
damped_square(10);
`;

export const newtonDefinitions = `${fixedPointDefinitions}
const dx = 0.00001;

const deriv = (g) =>
  x => (g(x + dx) - g(x)) / dx;

const newton_transform = (g) =>
  x => x - g(x) / deriv(g)(x);

const newtons_method = (g, guess) =>
  fixed_point(newton_transform(g), guess);
`;

export const newtonProgram = `${newtonDefinitions}
const square = (x) =>
  x * x;

const cube = (x) =>
  x * x * x;

display(deriv(cube)(5));
newtons_method(y => square(y) - 2, 1);
`;

export const transformProgram = `${newtonDefinitions}
${averageDefinition}
const square = (x) =>
  x * x;

const average_damp = (f) =>
  x => average(x, f(x));

const fixed_point_of_transform = (g, transform, guess) =>
  fixed_point(transform(g), guess);

const sqrt_by_damping = (x) =>
  fixed_point_of_transform(y => x / y, average_damp, 1);

const sqrt_by_newton = (x) =>
  fixed_point_of_transform(y => square(y) - x, newton_transform, 1);

display(sqrt_by_damping(2));
sqrt_by_newton(2);
`;
