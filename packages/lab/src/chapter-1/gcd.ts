/** Section 1.2.5: Euclid's algorithm. */

export const gcdDefinitions = `function gcd(a, b) {
  return b === 0
    ? a
    : gcd(b, a % b);
}
`;

export const gcdProgram = `${gcdDefinitions}
gcd(206, 40);
`;

/** Consecutive Fibonacci numbers are the worst case for Euclid (Lamé's theorem). */
export const lameProgram = `${gcdDefinitions}
gcd(89, 55);
gcd(987, 610);
gcd(10946, 6765);
gcd(121393, 75025);
`;
