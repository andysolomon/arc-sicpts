/** Programs of §3.1, shared by the Book's examples and the Laboratory's tests. */

// §3.1.1 Local state variables

/** A withdrawal that remembers the balance in a name the whole program shares. */
export const withdrawProgram = `let balance = 100;

function withdraw(amount) {
  if (balance >= amount) {
    balance = balance - amount;
    return balance;
  } else {
    return "Insufficient funds";
  }
}

display(withdraw(25));
display(withdraw(25));
display(withdraw(60));
withdraw(15);
`;

/** The same withdrawal with `balance` made internal to it. */
export const newWithdrawProgram = `function make_withdraw_balance_100() {
  let balance = 100;
  return amount => {
    if (balance >= amount) {
      balance = balance - amount;
      return balance;
    } else {
      return "Insufficient funds";
    }
  };
}

const new_withdraw = make_withdraw_balance_100();

display(new_withdraw(25));
display(new_withdraw(25));
display(new_withdraw(60));
new_withdraw(15);
`;

export const makeWithdrawDefinition = `function make_withdraw(balance) {
  return amount => {
    if (balance >= amount) {
      balance = balance - amount;
      return balance;
    } else {
      return "Insufficient funds";
    }
  };
}
`;

/** Two withdrawal processors, each with a balance of its own. */
export const makeWithdrawProgram = `${makeWithdrawDefinition}
const W1 = make_withdraw(100);
const W2 = make_withdraw(100);

display(W1(50));
display(W2(70));
display(W2(40));
W1(40);
`;

export const makeAccountDefinition = `function make_account(balance) {
  function withdraw(amount) {
    if (balance >= amount) {
      balance = balance - amount;
      return balance;
    } else {
      return "Insufficient funds";
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
      : error(m, "unknown request -- make_account");
  }
  return dispatch;
}
`;

/** A bank account as a dispatch function over its local state (message passing). */
export const makeAccountProgram = `${makeAccountDefinition}
const acc = make_account(100);

display(acc("withdraw")(50));
display(acc("withdraw")(60));
display(acc("deposit")(40));
acc("withdraw")(60);
`;

// §3.1.2 The benefits of introducing assignment

/**
 * The "minimal standard" generator of Park and Miller: x ← 48271 x mod (2³¹ − 1).
 * Every product stays below 2⁵³, so the arithmetic is exact, and the same
 * `random_init` always gives the same sequence.
 */
export const randUpdateDefinitions = `function rand_update(x) {
  return (48271 * x) % 2147483647;
}

const random_init = 2026;
`;

export const randDefinition = `const rand = (() => {
  let x = random_init;
  return () => {
    x = rand_update(x);
    return x;
  };
})();
`;

/** `rand` keeps the last number it produced in a frame of its own. */
export const randProgram = `${randUpdateDefinitions}
${randDefinition}
display(rand());
display(rand());
rand();
`;

export const gcdForRandomDefinition = `function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
`;

export const monteCarloDefinition = `function monte_carlo(trials, experiment) {
  function iter(trials_remaining, trials_passed) {
    return trials_remaining === 0
      ? trials_passed / trials
      : experiment()
      ? iter(trials_remaining - 1, trials_passed + 1)
      : iter(trials_remaining - 1, trials_passed);
  }
  return iter(trials, 0);
}
`;

/** π estimated from the chance that two random integers have no common factor: 6 / π². */
export const monteCarloProgram = `${randUpdateDefinitions}
${randDefinition}
${gcdForRandomDefinition}
${monteCarloDefinition}
function cesaro_test() {
  return gcd(rand(), rand()) === 1;
}

function estimate_pi(trials) {
  return math_sqrt(6 / monte_carlo(trials, cesaro_test));
}

estimate_pi(1000);
`;

/**
 * The same experiment, reporting its running estimate of π every 25 trials,
 * followed by π itself for comparison.
 */
export const monteCarloSeriesProgram = `${randUpdateDefinitions}
${randDefinition}
${gcdForRandomDefinition}
function cesaro_test() {
  return gcd(rand(), rand()) === 1;
}

// monte_carlo, reporting the estimate of π every 25 trials.
function monte_carlo_reporting(trials, experiment) {
  function iter(done, passed) {
    if (done > 0 && done % 25 === 0) {
      display(math_sqrt(6 / (passed / done)));
    } else {}
    return done === trials
      ? passed / trials
      : experiment()
      ? iter(done + 1, passed + 1)
      : iter(done + 1, passed);
  }
  display("estimate of π");
  return iter(0, 0);
}

function show_pi(n) {
  if (n > 0) {
    display(math_PI);
    return show_pi(n - 1);
  } else {
    return math_PI;
  }
}

const estimate = math_sqrt(6 / monte_carlo_reporting(1000, cesaro_test));
display("π");
show_pi(40);
estimate;
`;

/** The same estimate with no assignment: the generator's state is threaded through by hand. */
export const randomGcdTestProgram = `${randUpdateDefinitions}
${gcdForRandomDefinition}
function random_gcd_test(trials, initial_x) {
  function iter(trials_remaining, trials_passed, x) {
    const x1 = rand_update(x);
    const x2 = rand_update(x1);
    return trials_remaining === 0
      ? trials_passed / trials
      : gcd(x1, x2) === 1
      ? iter(trials_remaining - 1, trials_passed + 1, x2)
      : iter(trials_remaining - 1, trials_passed, x2);
  }
  return iter(trials, 0, initial_x);
}

function estimate_pi(trials) {
  return math_sqrt(6 / random_gcd_test(trials, random_init));
}

estimate_pi(1000);
`;

// §3.1.3 The costs of introducing assignment

/** A withdrawal with no check, beside the same thing written without assignment. */
export const simplifiedWithdrawProgram = `function make_simplified_withdraw(balance) {
  return amount => {
    balance = balance - amount;
    return balance;
  };
}

function make_decrementer(balance) {
  return amount => balance - amount;
}

const W = make_simplified_withdraw(25);
const D = make_decrementer(25);

display(W(20));
display(W(10));
display(D(20));
D(10);
`;

/** Two accounts that start out alike and are not the same account. */
export const separateAccountProgram = `${makeAccountDefinition}
const peter_acc = make_account(100);
const paul_acc = make_account(100);

display(peter_acc("withdraw")(10));
display(paul_acc("withdraw")(20));
peter_acc("withdraw")(30);
`;

/** One account known by two names. */
export const aliasedAccountProgram = `${makeAccountDefinition}
const peter_acc = make_account(100);
const paul_acc = peter_acc;

display(peter_acc("withdraw")(10));
display(paul_acc("withdraw")(20));
peter_acc("withdraw")(30);
`;

/** Factorial in imperative style, with the two assignments in the right order and in the wrong one. */
export const imperativeFactorialProgram = `function factorial(n) {
  let product = 1;
  let counter = 1;
  function iter() {
    if (counter > n) {
      return product;
    } else {
      product = counter * product;
      counter = counter + 1;
      return iter();
    }
  }
  return iter();
}

function factorial_swapped(n) {
  let product = 1;
  let counter = 1;
  function iter() {
    if (counter > n) {
      return product;
    } else {
      counter = counter + 1;
      product = counter * product;
      return iter();
    }
  }
  return iter();
}

display(factorial(5));
factorial_swapped(5);
`;
