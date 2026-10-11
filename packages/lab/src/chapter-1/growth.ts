import { factorialDefinitions } from './factorial.ts';
import { fibDefinitions } from './treeRecursion.ts';

/**
 * Section 1.2.3: the same two functions measured at growing sizes. Each
 * top-level call is one measurement; `processes.test.ts` asserts the counts.
 */

export const growthProgram = `${factorialDefinitions}
${fibDefinitions}
factorial(5);
factorial(10);
factorial(15);
factorial(20);
fib(5);
fib(10);
fib(15);
fib(20);
`;

/** Exercise 1.15: sine by repeated use of the triple-angle formula. */
export const sineDefinitions = `const cube = (x: number): number =>
  x * x * x;

const p = (x: number): number =>
  3 * x - 4 * cube(x);

const sine = (angle: number): number =>
  !(math_abs(angle) > 0.1)
    ? angle
    : p(sine(angle / 3));
`;
