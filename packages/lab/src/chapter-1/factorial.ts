/**
 * Section 1.2.1: two functions that compute the same value and generate
 * processes of different shape. The Book shows this exact text in its editor;
 * `processes.test.ts` asserts the claims the section makes about it.
 */

export const factorialDefinitions = `const factorial = (n: number): number =>
  n === 1
    ? 1
    : n * factorial(n - 1);

const fact_iter = (product: number, counter: number, max: number): number =>
  counter > max
    ? product
    : fact_iter(counter * product, counter + 1, max);
`;

export const factorialProgram = `${factorialDefinitions}
factorial(6);
fact_iter(1, 1, 6);
`;
