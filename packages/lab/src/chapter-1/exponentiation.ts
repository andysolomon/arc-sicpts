/**
 * Section 1.2.4: three ways to raise a number to a power, from linear
 * recursion to successive squaring.
 */

export const exptDefinitions = `const expt = (b: number, n: number): number =>
  n === 0
    ? 1
    : b * expt(b, n - 1);

const is_even = (n: number): boolean => n % 2 === 0;

const square = (x: number): number => x * x;

const fast_expt = (b: number, n: number): number =>
  n === 0
    ? 1
    : is_even(n)
      ? square(fast_expt(b, n / 2))
      : b * fast_expt(b, n - 1);
`;

/** Both functions at doubling sizes: one call more each time, against twice as many. */
export const exptGrowthProgram = `${exptDefinitions}
expt(2, 8);
expt(2, 16);
expt(2, 32);
expt(2, 64);
fast_expt(2, 8);
fast_expt(2, 16);
fast_expt(2, 32);
fast_expt(2, 64);
`;

export const fastExptProgram = `const is_even = (n: number): boolean => n % 2 === 0;

const square = (x: number): number => x * x;

const fast_expt = (b: number, n: number): number =>
  n === 0
    ? 1
    : is_even(n)
      ? square(fast_expt(b, n / 2))
      : b * fast_expt(b, n - 1);

fast_expt(2, 10);
`;
