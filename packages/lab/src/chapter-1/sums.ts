/**
 * Section 1.3.1: three summations that share a shape, and the function
 * that captures it by taking functions as arguments.
 */

export const sumDefinitions = `const sum = (term, a, next, b) =>
  a > b
    ? 0
    : term(a) + sum(term, next(a), next, b);
`;

export const sumProgram = `${sumDefinitions}
const inc = (n) =>
  n + 1;

const cube = (x) =>
  x * x * x;

const identity = (x) =>
  x;

const sum_cubes = (a, b) =>
  sum(cube, a, inc, b);

const sum_integers = (a, b) =>
  sum(identity, a, inc, b);

sum_cubes(1, 3);
`;

export const piSumProgram = `${sumDefinitions}
const pi_sum = (a, b) => {
  const pi_term = (x) =>
    1 / (x * (x + 2));
  const pi_next = (x) =>
    x + 4;
  return sum(pi_term, a, pi_next, b);
};

8 * pi_sum(1, 1000);
`;

export const integralProgram = `${sumDefinitions}
const cube = (x) =>
  x * x * x;

const integral = (f, a, b, dx) => {
  const add_dx = (x) =>
    x + dx;
  return sum(f, a + dx / 2, add_dx, b) * dx;
};

integral(cube, 0, 1, 0.05);
`;
