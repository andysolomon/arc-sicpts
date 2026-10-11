import { averageDefinition, fixedPointDefinitions } from './generalMethods.ts';

/**
 * Section 1.3.4: functions that return functions, and the methods of §1.3.3
 * restated with them.
 */

export const averageDampProgram = `type NumFn = (x: number) => number;

${averageDefinition}
const square = (x: number): number =>
  x * x;

const average_damp = (f: NumFn): NumFn =>
  x => average(x, f(x));

const damped_square = average_damp(square);
damped_square(10);
`;

export const newtonDefinitions = `${fixedPointDefinitions}
const dx = 0.00001;

const deriv = (g: NumFn): NumFn =>
  x => (g(x + dx) - g(x)) / dx;

const newton_transform = (g: NumFn): NumFn =>
  x => x - g(x) / deriv(g)(x);

const newtons_method = (g: NumFn, guess: number): number =>
  fixed_point(newton_transform(g), guess);
`;

export const newtonProgram = `${newtonDefinitions}
const square = (x: number): number =>
  x * x;

const cube = (x: number): number =>
  x * x * x;

display(deriv(cube)(5));
newtons_method(y => square(y) - 2, 1);
`;

export const transformProgram = `${newtonDefinitions}
${averageDefinition}
const square = (x: number): number =>
  x * x;

const average_damp = (f: NumFn): NumFn =>
  x => average(x, f(x));

const fixed_point_of_transform = (g: NumFn, transform: (f: NumFn) => NumFn, guess: number): number =>
  fixed_point(transform(g), guess);

const sqrt_by_damping = (x: number): number =>
  fixed_point_of_transform(y => x / y, average_damp, 1);

const sqrt_by_newton = (x: number): number =>
  fixed_point_of_transform(y => square(y) - x, newton_transform, 1);

display(sqrt_by_damping(2));
sqrt_by_newton(2);
`;
