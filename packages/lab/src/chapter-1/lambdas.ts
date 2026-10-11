/**
 * Section 1.3.2: functions without names, names without functions, and
 * conditional statements.
 */

export const lambdaProgram = `const square = (x) =>
  x * x;

const plus4 = x => x + 4;

display(plus4(3));
((x, y, z) => x + y + square(z))(1, 2, 3);
`;

export const localNamesProgram = `const square = (x) =>
  x * x;

const f = (x, y) => {
  const a = 1 + x * y;
  const b = 1 - y;
  return x * square(a) + y * b + a * b;
};

f(2, 3);
`;

export const conditionalStatementProgram = `const is_even = (n) =>
  n % 2 === 0;

const expmod = (base, exp, m) => {
  if (exp === 0) {
    return 1;
  } else if (is_even(exp)) {
    const half_exp = expmod(base, exp / 2, m);
    return half_exp * half_exp % m;
  } else {
    return base * expmod(base, exp - 1, m) % m;
  }
};

expmod(3, 13, 13);
`;
