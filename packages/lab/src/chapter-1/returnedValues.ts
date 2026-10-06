import { averageDefinition, fixedPointDefinitions } from './generalMethods.ts';

/**
 * Section 1.3.4: functions that return functions, and the methods of §1.3.3
 * restated with them.
 */

export const averageDampProgram = `${averageDefinition}
function square(x) {
  return x * x;
}

function average_damp(f) {
  return x => average(x, f(x));
}

const damped_square = average_damp(square);
damped_square(10);
`;

export const newtonDefinitions = `${fixedPointDefinitions}
const dx = 0.00001;

function deriv(g) {
  return x => (g(x + dx) - g(x)) / dx;
}

function newton_transform(g) {
  return x => x - g(x) / deriv(g)(x);
}

function newtons_method(g, guess) {
  return fixed_point(newton_transform(g), guess);
}
`;

export const newtonProgram = `${newtonDefinitions}
function square(x) {
  return x * x;
}

function cube(x) {
  return x * x * x;
}

display(deriv(cube)(5));
newtons_method(y => square(y) - 2, 1);
`;

export const transformProgram = `${newtonDefinitions}
${averageDefinition}
function square(x) {
  return x * x;
}

function average_damp(f) {
  return x => average(x, f(x));
}

function fixed_point_of_transform(g, transform, guess) {
  return fixed_point(transform(g), guess);
}

function sqrt_by_damping(x) {
  return fixed_point_of_transform(y => x / y, average_damp, 1);
}

function sqrt_by_newton(x) {
  return fixed_point_of_transform(y => square(y) - x, newton_transform, 1);
}

display(sqrt_by_damping(2));
sqrt_by_newton(2);
`;
