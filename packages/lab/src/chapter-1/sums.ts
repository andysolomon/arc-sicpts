/**
 * Section 1.3.1: three summations that share a shape, and the function
 * that captures it by taking functions as arguments.
 */

export const sumDefinitions = `function sum(term, a, next, b) {
  return a > b
    ? 0
    : term(a) + sum(term, next(a), next, b);
}
`;

export const sumProgram = `${sumDefinitions}
function inc(n) {
  return n + 1;
}

function cube(x) {
  return x * x * x;
}

function identity(x) {
  return x;
}

function sum_cubes(a, b) {
  return sum(cube, a, inc, b);
}

function sum_integers(a, b) {
  return sum(identity, a, inc, b);
}

sum_cubes(1, 3);
`;

export const piSumProgram = `${sumDefinitions}
function pi_sum(a, b) {
  function pi_term(x) {
    return 1 / (x * (x + 2));
  }
  function pi_next(x) {
    return x + 4;
  }
  return sum(pi_term, a, pi_next, b);
}

8 * pi_sum(1, 1000);
`;

export const integralProgram = `${sumDefinitions}
function cube(x) {
  return x * x * x;
}

function integral(f, a, b, dx) {
  function add_dx(x) {
    return x + dx;
  }
  return sum(f, a + dx / 2, add_dx, b) * dx;
}

integral(cube, 0, 1, 0.05);
`;
