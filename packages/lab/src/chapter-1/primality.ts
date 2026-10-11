/**
 * Section 1.2.6: two tests for primality, one that searches for a divisor in
 * Θ(√n) steps and one that trusts Fermat in Θ(log n).
 */

export const smallestDivisorDefinitions = `const square = (x) =>
  x * x;

const smallest_divisor = (n) =>
  find_divisor(n, 2);

const find_divisor = (n, test_divisor) =>
  square(test_divisor) > n
    ? n
    : divides(test_divisor, n)
      ? test_divisor
      : find_divisor(n, test_divisor + 1);

const divides = (a, b) =>
  b % a === 0;

const is_prime = (n) =>
  n === smallest_divisor(n);
`;

export const smallestDivisorProgram = `${smallestDivisorDefinitions}
smallest_divisor(91);
`;

export const expmodDefinitions = `const is_even = (n) =>
  n % 2 === 0;

const expmod = (base, exp, m) =>
  exp === 0
    ? 1
    : is_even(exp)
      ? square(expmod(base, exp / 2, m)) % m
      : (base * expmod(base, exp - 1, m)) % m;
`;

export const fermatDefinitions = `${expmodDefinitions}
const fermat_test = (n) => {
  const try_it = (a) =>
    expmod(a, n, n) === a;
  return try_it(1 + math_floor(math_random() * (n - 1)));
};

const fast_is_prime = (n, times) =>
  times === 0
    ? true
    : fermat_test(n)
      ? fast_is_prime(n, times - 1)
      : false;
`;

export const fermatProgram = `const square = (x) =>
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
