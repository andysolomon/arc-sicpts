/**
 * Section 1.3.2: functions without names, names without functions, and
 * conditional statements.
 */

export const lambdaProgram = `function square(x) {
  return x * x;
}

const plus4 = x => x + 4;

display(plus4(3));
((x, y, z) => x + y + square(z))(1, 2, 3);
`;

export const localNamesProgram = `function square(x) {
  return x * x;
}

function f(x, y) {
  const a = 1 + x * y;
  const b = 1 - y;
  return x * square(a) + y * b + a * b;
}

f(2, 3);
`;

export const conditionalStatementProgram = `function is_even(n) {
  return n % 2 === 0;
}

function expmod(base, exp, m) {
  if (exp === 0) {
    return 1;
  } else if (is_even(exp)) {
    const half_exp = expmod(base, exp / 2, m);
    return half_exp * half_exp % m;
  } else {
    return base * expmod(base, exp - 1, m) % m;
  }
}

expmod(3, 13, 13);
`;
