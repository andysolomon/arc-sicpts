/**
 * Section 1.2.2: tree recursion. The Book shows these texts in its editors;
 * `processes.test.ts` asserts the claims the section makes about them.
 */

export const fibDefinitions = `function fib(n) {
  return n === 0
    ? 0
    : n === 1
      ? 1
      : fib(n - 1) + fib(n - 2);
}
`;

/** Small enough to draw every call. */
export const fibProgram = `${fibDefinitions}
fib(5);
`;

export const fibIterDefinitions = `function fib_iter(a, b, count) {
  return count === 0
    ? b
    : fib_iter(a + b, a, count - 1);
}
`;

/** The tree-recursive and the iterative Fibonacci, each at three sizes. */
export const fibCompareProgram = `${fibDefinitions}
${fibIterDefinitions}
fib(5);
fib(10);
fib(15);
fib_iter(1, 0, 5);
fib_iter(1, 0, 10);
fib_iter(1, 0, 15);
`;

export const countChangeDefinitions = `function count_change(amount) {
  return cc(amount, 5);
}

function cc(amount, kinds_of_coins) {
  return amount === 0
    ? 1
    : amount < 0 || kinds_of_coins === 0
      ? 0
      : cc(amount, kinds_of_coins - 1) +
        cc(amount - first_denomination(kinds_of_coins), kinds_of_coins);
}

function first_denomination(kinds_of_coins) {
  return kinds_of_coins === 1
    ? 1
    : kinds_of_coins === 2
      ? 5
      : kinds_of_coins === 3
        ? 10
        : kinds_of_coins === 4
          ? 25
          : kinds_of_coins === 5
            ? 50
            : 0;
}
`;

export const countChangeProgram = `${countChangeDefinitions}
count_change(100);
`;
