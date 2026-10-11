/**
 * Section 1.3.1: three summations that share a shape, and the function
 * that captures it by taking functions as arguments.
 */

export const sumDefinitions = `type NumFn = (x: number) => number;

const sum = (term: NumFn, a: number, next: NumFn, b: number): number =>
  a > b
    ? 0
    : term(a) + sum(term, next(a), next, b);
`;

export const sumProgram = `${sumDefinitions}
const inc = (n: number): number => n + 1;

const cube = (x: number): number => x * x * x;

const identity = (x: number): number => x;

const sum_cubes = (a: number, b: number): number => sum(cube, a, inc, b);

const sum_integers = (a: number, b: number): number => sum(identity, a, inc, b);

sum_cubes(1, 3);
`;

export const piSumProgram = `${sumDefinitions}
const pi_sum = (a: number, b: number): number => {
  const pi_term = (x: number): number => 1 / (x * (x + 2));
  const pi_next = (x: number): number => x + 4;
  return sum(pi_term, a, pi_next, b);
};

8 * pi_sum(1, 1000);
`;

export const integralProgram = `${sumDefinitions}
const cube = (x: number): number => x * x * x;

const integral = (f: NumFn, a: number, b: number, dx: number): number => {
  const add_dx = (x: number): number => x + dx;
  return sum(f, a + dx / 2, add_dx, b) * dx;
};

integral(cube, 0, 1, 0.05);
`;
