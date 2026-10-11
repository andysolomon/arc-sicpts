/** Programs of §3.2, shared by the Book's examples and the Laboratory's tests. */

/** §3.2.1: declaring a function makes a function object; applying it makes a frame. */
export const envModelSquareProgram = `const square = (x: number): number => x * x;

square(5);
`;

/** §3.2.1: an assignment changes the first binding of its name that it finds. */
export const envModelAssignmentProgram = `let count = 0;

const bump = (by: number): number => {
  count = count + by;
  return count;
};

bump(1);
bump(10);
`;

/** §3.2.2: the program of §1.1.5, now in the environment model. */
export const envModelSumOfSquaresProgram = `const square = (x: number): number => x * x;

const sum_of_squares = (x: number, y: number): number => square(x) + square(y);

const f = (a: number): number => sum_of_squares(a + 1, a * 2);

f(5);
`;

/** §3.2.2, exercise 3.9: the two factorials of §1.2.1. */
export const envModelFactorialRecursiveDefinition = `const factorial = (n: number): number =>
  n === 1
  ? 1
  : n * factorial(n - 1);
`;

export const envModelFactorialIterativeDefinition = `const factorial = (n: number): number => fact_iter(1, 1, n);

const fact_iter = (product: number, counter: number, max_count: number): number =>
  counter > max_count
  ? product
  : fact_iter(counter * product, counter + 1, max_count);
`;

/** §3.2.3: the withdrawal processor of §3.1.1. */
export const envModelMakeWithdrawDefinition = `const make_withdraw = (balance: number): ((amount: number) => number | string) =>
  amount => {
    if (balance >= amount) {
      balance = balance - amount;
      return balance;
    } else {
      return "insufficient funds";
    }
  };
`;

export const envModelMakeWithdrawProgram = `${envModelMakeWithdrawDefinition}
const W1 = make_withdraw(100);

W1(50);
`;

/** §3.2.3: two withdrawal processors, the same code in two environments. */
export const envModelTwoWithdrawsProgram = `${envModelMakeWithdrawDefinition}
const W1 = make_withdraw(100);
W1(50);

const W2 = make_withdraw(100);
W2(70);

W1(40);
`;

/** §3.2.4: square roots with block structure, as in §1.1.8. */
export const envModelInternalSqrtProgram = `const square = (x: number): number => x * x;

const average = (x: number, y: number): number => (x + y) / 2;

const sqrt = (x: number): number => {
  const is_good_enough = (guess: number): boolean =>
    math_abs(square(guess) - x) < 0.001;
  const improve = (guess: number): number => average(guess, x / guess);
  const sqrt_iter = (guess: number): number =>
    is_good_enough(guess)
    ? guess
    : sqrt_iter(improve(guess));
  return sqrt_iter(1);
};

sqrt(2);
`;

/** §3.2.4: internal declarations may refer to each other, in any order. */
export const envModelMutualRecursionProgram = `const f = (x: number): boolean => {
  const is_even = (n: number): boolean =>
    n === 0
    ? true
    : is_odd(n - 1);
  const is_odd = (n: number): boolean =>
    n === 0
    ? false
    : is_even(n - 1);
  return is_even(x);
};

f(3);
`;

/** §3.2.4: a name used before its declaration has been evaluated is an error, even when an outer one exists. */
export const envModelTooEarlyProgram = `const z = 1;

const f = (x: number): number => {
  const y = x + z;
  const z = 10;
  return y;
};

f(1);
`;

/** §3.2.4, exercise 3.11: the message-passing bank account of §3.1.1. */
export const envModelMakeAccountDefinition = `type Transaction = (amount: number) => number | string;
type Account = (m: "withdraw" | "deposit") => Transaction;

const make_account = (balance: number): Account => {
  const withdraw = (amount: number): number | string => {
    if (balance >= amount) {
      balance = balance - amount;
      return balance;
    } else {
      return "insufficient funds";
    }
  };
  const deposit = (amount: number): number => {
    balance = balance + amount;
    return balance;
  };
  const dispatch = (m: "withdraw" | "deposit"): Transaction =>
    m === "withdraw"
    ? withdraw
    : m === "deposit"
    ? deposit
    : error(m, "unknown request: make_account");
  return dispatch;
};
`;

export const envModelMakeAccountProgram = `${envModelMakeAccountDefinition}
const acc = make_account(50);
acc("deposit")(40);
acc("withdraw")(60);

const acc2 = make_account(100);
acc2("withdraw")(10);
`;
