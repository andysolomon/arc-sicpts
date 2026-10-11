/**
 * Section 1.2.6: two tests for primality, one that searches for a divisor in
 * Θ(√n) steps and one that trusts Fermat in Θ(log n).
 */

export const smallestDivisorDefinitions = `const square = (x: number): number =>
  x * x;

const smallest_divisor = (n: number): number =>
  find_divisor(n, 2);

const find_divisor = (n: number, test_divisor: number): number =>
  square(test_divisor) > n
    ? n
    : divides(test_divisor, n)
      ? test_divisor
      : find_divisor(n, test_divisor + 1);

const divides = (a: number, b: number): boolean =>
  b % a === 0;

const is_prime = (n: number): boolean =>
  n === smallest_divisor(n);
`;

export const smallestDivisorProgram = `${smallestDivisorDefinitions}
smallest_divisor(91);
`;

export const expmodDefinitions = `const is_even = (n: number): boolean =>
  n % 2 === 0;

const expmod = (base: number, exp: number, m: number): number =>
  exp === 0
    ? 1
    : is_even(exp)
      ? square(expmod(base, exp / 2, m)) % m
      : (base * expmod(base, exp - 1, m)) % m;
`;

export const fermatDefinitions = `${expmodDefinitions}
const fermat_test = (n: number): boolean => {
  const try_it = (a: number): boolean =>
    expmod(a, n, n) === a;
  return try_it(1 + math_floor(math_random() * (n - 1)));
};

const fast_is_prime = (n: number, times: number): boolean =>
  times === 0
    ? true
    : fermat_test(n)
      ? fast_is_prime(n, times - 1)
      : false;
`;

export const fermatProgram = `const square = (x: number): number =>
  x * x;

${fermatDefinitions}
display(fast_is_prime(1009, 10));
display(fast_is_prime(1001, 10));
fast_is_prime(561, 10);
`;

/** Both tests on primes ten times apart: the divisor search grows like √n, expmod like log n. */
export const primalityGrowthProgram = `${smallestDivisorDefinitions}
${expmodDefinitions}
smallest_divisor(101);
smallest_divisor(1009);
smallest_divisor(10007);
smallest_divisor(100003);
expmod(2, 100, 101);
expmod(2, 1008, 1009);
expmod(2, 10006, 10007);
expmod(2, 100002, 100003);
`;
