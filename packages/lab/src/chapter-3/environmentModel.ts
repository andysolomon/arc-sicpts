/** Programs of §3.2, shared by the Book's examples and the Laboratory's tests. */

/** §3.2.1: a function declaration makes a function object; applying it makes a frame. */
export const envModelSquareProgram = `function square(x) {
  return x * x;
}

square(5);
`;

/** §3.2.1: an assignment changes the first binding of its name that it finds. */
export const envModelAssignmentProgram = `let count = 0;

function bump(by) {
  count = count + by;
  return count;
}

bump(1);
bump(10);
`;

/** §3.2.2: the program of §1.1.5, now in the environment model. */
export const envModelSumOfSquaresProgram = `function square(x) {
  return x * x;
}

function sum_of_squares(x, y) {
  return square(x) + square(y);
}

function f(a) {
  return sum_of_squares(a + 1, a * 2);
}

f(5);
`;

/** §3.2.2, exercise 3.9: the two factorials of §1.2.1. */
export const envModelFactorialRecursiveDefinition = `function factorial(n) {
  return n === 1
         ? 1
         : n * factorial(n - 1);
}
`;

export const envModelFactorialIterativeDefinition = `function factorial(n) {
  return fact_iter(1, 1, n);
}

function fact_iter(product, counter, max_count) {
  return counter > max_count
         ? product
         : fact_iter(counter * product, counter + 1, max_count);
}
`;

/** §3.2.3: the withdrawal processor of §3.1.1. */
export const envModelMakeWithdrawDefinition = `function make_withdraw(balance) {
  return amount => {
           if (balance >= amount) {
             balance = balance - amount;
             return balance;
           } else {
             return "insufficient funds";
           }
         };
}
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
export const envModelInternalSqrtProgram = `function square(x) {
  return x * x;
}

function average(x, y) {
  return (x + y) / 2;
}

function sqrt(x) {
  function is_good_enough(guess) {
    return math_abs(square(guess) - x) < 0.001;
  }
  function improve(guess) {
    return average(guess, x / guess);
  }
  function sqrt_iter(guess) {
    return is_good_enough(guess)
           ? guess
           : sqrt_iter(improve(guess));
  }
  return sqrt_iter(1);
}

sqrt(2);
`;

/** §3.2.4: internal declarations may refer to each other, in any order. */
export const envModelMutualRecursionProgram = `function f(x) {
  function is_even(n) {
    return n === 0
           ? true
           : is_odd(n - 1);
  }
  function is_odd(n) {
    return n === 0
           ? false
           : is_even(n - 1);
  }
  return is_even(x);
}

f(3);
`;

/** §3.2.4: a name used before its declaration has been evaluated is an error, even when an outer one exists. */
export const envModelTooEarlyProgram = `const z = 1;

function f(x) {
  const y = x + z;
  const z = 10;
  return y;
}

f(1);
`;

/** §3.2.4, exercise 3.11: the message-passing bank account of §3.1.1. */
export const envModelMakeAccountDefinition = `function make_account(balance) {
  function withdraw(amount) {
    if (balance >= amount) {
      balance = balance - amount;
      return balance;
    } else {
      return "insufficient funds";
    }
  }
  function deposit(amount) {
    balance = balance + amount;
    return balance;
  }
  function dispatch(m) {
    return m === "withdraw"
           ? withdraw
           : m === "deposit"
           ? deposit
           : error(m, "unknown request: make_account");
  }
  return dispatch;
}
`;

export const envModelMakeAccountProgram = `${envModelMakeAccountDefinition}
const acc = make_account(50);
acc("deposit")(40);
acc("withdraw")(60);

const acc2 = make_account(100);
acc2("withdraw")(10);
`;
