import { makeAccountDefinition, randUpdateDefinitions } from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §3.1. Each export is an ExerciseSpec (see ./spec.ts). */

export const exercise_3_1: ExerciseSpec = {
  id: '3.1',
  starter: `// An accumulator is a function, called repeatedly with a single numeric
// argument, that accumulates its arguments into a sum and returns it.
function make_accumulator(initial) {
  // your answer
}

const a = make_accumulator(5);
a(10);
`,
  tests: [
    { name: 'one call', kind: 'value', expr: 'const acc = make_accumulator(5); acc(10)', expected: 15 },
    { name: 'the sum is remembered', kind: 'value', expr: 'const acc = make_accumulator(5); acc(10); acc(10)', expected: 25 },
    {
      name: 'each accumulator has its own sum',
      kind: 'value',
      expr: 'const a1 = make_accumulator(5); const a2 = make_accumulator(100); a1(10); a2(1); a1(10)',
      expected: 25,
    },
  ],
  solution: `function make_accumulator(sum) {
  return amount => {
    sum = sum + amount;
    return sum;
  };
}

const a = make_accumulator(5);
a(10);
`,
};

export const exercise_3_2: ExerciseSpec = {
  id: '3.2',
  starter: `// make_monitored(f) returns a function mf that keeps count of how often it
// has been called. mf("how many calls") returns the count, mf("reset count")
// sets it to zero, and any other argument is passed on to f.
function make_monitored(f) {
  // your answer
}

const s = make_monitored(math_sqrt);
s(100);
`,
  tests: [
    { name: 'passes the argument on', kind: 'value', expr: 'const s = make_monitored(math_sqrt); s(100)', expected: 10 },
    { name: 'counts the calls', kind: 'value', expr: 'const s = make_monitored(math_sqrt); s(100); s(25); s("how many calls")', expected: 2 },
    { name: 'starts at zero', kind: 'value', expr: 'const s = make_monitored(math_sqrt); s("how many calls")', expected: 0 },
    {
      name: 'resets the count',
      kind: 'value',
      expr: 'const s = make_monitored(math_sqrt); s(4); s(9); s("reset count"); s(16); s("how many calls")',
      expected: 1,
    },
    {
      name: 'each monitored function has its own count',
      kind: 'value',
      expr: 'const s = make_monitored(math_sqrt); const t = make_monitored(math_abs); s(4); t(-1); t(-2); s("how many calls")',
      expected: 1,
    },
  ],
  solution: `function make_monitored(f) {
  let calls = 0;
  return x => {
    if (x === "how many calls") {
      return calls;
    } else if (x === "reset count") {
      calls = 0;
      return calls;
    } else {
      calls = calls + 1;
      return f(x);
    }
  };
}

const s = make_monitored(math_sqrt);
s(100);
`,
};

/** `make_account` of §3.1.1, the starting point of Exercises 3.3 and 3.4. */
const passwordAccount = `function make_account(balance, password) {
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
  function dispatch(p, m) {
    return p !== password
      ? amount => "Incorrect password"
      : m === "withdraw"
      ? withdraw
      : m === "deposit"
      ? deposit
      : error(m, "unknown request -- make_account");
  }
  return dispatch;
}
`;

export const exercise_3_3: ExerciseSpec = {
  id: '3.3',
  starter: `// Change make_account so that it creates password-protected accounts:
// make_account(100, "secret password") returns an account that processes a
// request only if it comes with the password, and otherwise returns
// "Incorrect password".
${makeAccountDefinition.replace('make_account(balance)', 'make_account(balance, password)').replace('function dispatch(m)', 'function dispatch(p, m)')}
const acc = make_account(100, "secret password");
acc("secret password", "withdraw")(40);
`,
  tests: [
    {
      name: 'the right password withdraws',
      kind: 'value',
      expr: 'const acc = make_account(100, "secret password"); acc("secret password", "withdraw")(40)',
      expected: 60,
    },
    {
      name: 'the right password deposits',
      kind: 'value',
      expr: 'const acc = make_account(100, "secret password"); acc("secret password", "deposit")(50)',
      expected: 150,
    },
    {
      name: 'a wrong password is refused',
      kind: 'value',
      expr: 'const acc = make_account(100, "secret password"); acc("some other password", "deposit")(50)',
      expected: 'Incorrect password',
    },
    {
      name: 'a refused request changes nothing',
      kind: 'value',
      expr: 'const acc = make_account(100, "secret password"); acc("guess", "withdraw")(40); acc("secret password", "withdraw")(0)',
      expected: 100,
    },
  ],
  solution: `${passwordAccount}
const acc = make_account(100, "secret password");
acc("secret password", "withdraw")(40);
`,
};

/** `n` attempts on `acc` with `password`, each one a withdrawal of 10. */
const attempts = (n: number, password: string): string =>
  Array.from({ length: n }, () => `acc("${password}", "withdraw")(10);`).join(' ');

export const exercise_3_4: ExerciseSpec = {
  id: '3.4',
  prelude: `let cops_called = 0;

function call_the_cops() {
  cops_called = cops_called + 1;
  return "Calling the cops";
}
`,
  starter: `// call_the_cops() is provided. Change the account so that if it is accessed
// more than seven consecutive times with an incorrect password, it calls
// call_the_cops.
${passwordAccount}
const acc = make_account(100, "secret password");
acc("secret password", "withdraw")(40);
`,
  tests: [
    {
      name: 'seven wrong passwords are tolerated',
      kind: 'value',
      expr: `const acc = make_account(100, "secret password"); ${attempts(7, 'guess')} cops_called`,
      expected: 0,
    },
    {
      name: 'the eighth calls the cops',
      kind: 'value',
      expr: `const acc = make_account(100, "secret password"); ${attempts(8, 'guess')} cops_called`,
      expected: 1,
    },
    {
      name: 'a right password in between starts the count again',
      kind: 'value',
      expr: `const acc = make_account(100, "secret password"); ${attempts(6, 'guess')} ${attempts(1, 'secret password')} ${attempts(6, 'guess')} cops_called`,
      expected: 0,
    },
    {
      name: 'the account still works',
      kind: 'value',
      expr: `const acc = make_account(100, "secret password"); ${attempts(3, 'guess')} acc("secret password", "withdraw")(40)`,
      expected: 60,
    },
    {
      name: 'a wrong password is still refused',
      kind: 'value',
      expr: 'const acc = make_account(100, "secret password"); acc("guess", "deposit")(50)',
      expected: 'Incorrect password',
    },
  ],
  solution: `function make_account(balance, password) {
  let wrong_attempts = 0;
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
  function refuse(amount) {
    return "Incorrect password";
  }
  function dispatch(p, m) {
    if (p !== password) {
      wrong_attempts = wrong_attempts + 1;
      if (wrong_attempts > 7) {
        call_the_cops();
      } else {}
      return refuse;
    } else {
      wrong_attempts = 0;
      return m === "withdraw"
        ? withdraw
        : m === "deposit"
        ? deposit
        : error(m, "unknown request -- make_account");
    }
  }
  return dispatch;
}

const acc = make_account(100, "secret password");
acc("secret password", "withdraw")(40);
`,
};

/**
 * A repeatable `random_in_range`: the Park–Miller generator of §3.1.2, scaled
 * to the range. Every check of Exercise 3.5 draws the same numbers.
 */
const randomInRange = `${randUpdateDefinitions}
let random_state = random_init;

function random_in_range(low, high) {
  random_state = rand_update(random_state);
  return low + (random_state / 2147483647) * (high - low);
}

function monte_carlo(trials, experiment) {
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

export const exercise_3_5: ExerciseSpec = {
  id: '3.5',
  prelude: randomInRange,
  budget: 1_000_000,
  starter: `// monte_carlo and random_in_range(low, high) are provided.

// The area of the region where P(x, y) holds, inside the rectangle from
// x1 to x2 and y1 to y2, estimated from the fraction of random points in
// the rectangle that fall in the region.
function estimate_integral(P, x1, x2, y1, y2, trials) {
  // your answer
}

function in_unit_circle(x, y) {
  return x * x + y * y <= 1;
}

estimate_integral(in_unit_circle, -1, 1, -1, 1, 1000);
`,
  tests: [
    {
      name: 'a region that fills the rectangle',
      kind: 'value',
      expr: 'estimate_integral((x, y) => true, 0, 2, 0, 3, 10)',
      expected: 6,
    },
    {
      name: 'a region outside the rectangle',
      kind: 'value',
      expr: 'estimate_integral((x, y) => false, 0, 2, 0, 3, 10)',
      expected: 0,
    },
    {
      name: 'π from the unit circle',
      kind: 'value',
      expr: close('estimate_integral((x, y) => x * x + y * y <= 1, -1, 1, -1, 1, 2000)', Math.PI, 0.15),
      expected: true,
    },
    {
      name: 'the circle of radius 3 about (5, 7)',
      kind: 'value',
      expr: close('estimate_integral((x, y) => (x - 5) * (x - 5) + (y - 7) * (y - 7) <= 9, 2, 8, 4, 10, 2000)', 9 * Math.PI, 1.3),
      expected: true,
    },
    {
      name: 'half of a rectangle',
      kind: 'value',
      expr: close('estimate_integral((x, y) => x < 1, 0, 2, 0, 1, 2000)', 1, 0.08),
      expected: true,
    },
  ],
  solution: `function estimate_integral(P, x1, x2, y1, y2, trials) {
  function experiment() {
    return P(random_in_range(x1, x2), random_in_range(y1, y2));
  }
  return monte_carlo(trials, experiment) * (x2 - x1) * (y2 - y1);
}

function in_unit_circle(x, y) {
  return x * x + y * y <= 1;
}

estimate_integral(in_unit_circle, -1, 1, -1, 1, 1000);
`,
};

const update = (x: number): number => (48271 * x) % 2147483647;

export const exercise_3_6: ExerciseSpec = {
  id: '3.6',
  prelude: randUpdateDefinitions,
  starter: `// rand_update and random_init are provided.

// rand("generate") produces a new random number; rand("reset")(new_value)
// resets the internal variable to new_value, so that sequences can be repeated.
// make_rand() makes such a rand, starting from random_init.
function make_rand() {
  // your answer
}

const rand = make_rand();
rand("generate");
`,
  tests: [
    { name: 'generate starts from random_init', kind: 'value', expr: 'const r = make_rand(); r("generate")', expected: update(2026) },
    { name: 'generate goes on from there', kind: 'value', expr: 'const r = make_rand(); r("generate"); r("generate")', expected: update(update(2026)) },
    { name: 'reset sets the state', kind: 'value', expr: 'const r = make_rand(); r("generate"); r("reset")(5); r("generate")', expected: update(5) },
    {
      name: 'reset repeats a sequence',
      kind: 'value',
      expr: 'const r = make_rand(); r("reset")(42); r("generate"); const b = r("generate"); r("reset")(42); r("generate"); b === r("generate") && is_number(b)',
      expected: true,
    },
    {
      name: 'each generator has its own state',
      kind: 'value',
      expr: 'const r = make_rand(); const s = make_rand(); r("generate"); r("generate"); s("generate")',
      expected: update(2026),
    },
  ],
  solution: `function make_rand() {
  let x = random_init;
  return m => {
    if (m === "generate") {
      x = rand_update(x);
      return x;
    } else if (m === "reset") {
      return new_value => {
        x = new_value;
        return x;
      };
    } else {
      return error(m, "unknown request -- rand");
    }
  };
}

const rand = make_rand();
rand("generate");
`,
};

/** A fresh account and a joint account on it, for each check of Exercise 3.7. */
const joint = 'const peter = make_account(100, "open sesame"); const paul = make_joint(peter, "open sesame", "rosebud");';

export const exercise_3_7: ExerciseSpec = {
  id: '3.7',
  prelude: passwordAccount,
  starter: `// make_account(balance, password) of Exercise 3.3 is provided.

// make_joint(acc, password, new_password) gives access to the account acc,
// whose password is password, under the additional password new_password.
function make_joint(acc, password, new_password) {
  // your answer
}

const peter_acc = make_account(100, "open sesame");
const paul_acc = make_joint(peter_acc, "open sesame", "rosebud");
`,
  tests: [
    { name: 'the new password works', kind: 'value', expr: `${joint} paul("rosebud", "withdraw")(30)`, expected: 70 },
    { name: 'it is the same account', kind: 'value', expr: `${joint} paul("rosebud", "withdraw")(30); peter("open sesame", "deposit")(10)`, expected: 80 },
    { name: 'the old password does not open the joint account', kind: 'value', expr: `${joint} paul("open sesame", "withdraw")(10)`, expected: 'Incorrect password' },
    { name: 'the new password does not open the original', kind: 'value', expr: `${joint} peter("rosebud", "withdraw")(10)`, expected: 'Incorrect password' },
    {
      name: 'a refused request changes nothing',
      kind: 'value',
      expr: `${joint} paul("guess", "withdraw")(10); peter("open sesame", "withdraw")(0)`,
      expected: 100,
    },
  ],
  solution: `function make_joint(acc, password, new_password) {
  return (p, m) =>
    p === new_password
      ? acc(password, m)
      : amount => "Incorrect password";
}

const peter_acc = make_account(100, "open sesame");
const paul_acc = make_joint(peter_acc, "open sesame", "rosebud");
`,
};

export const exercise_3_8: ExerciseSpec = {
  id: '3.8',
  starter: `// make_f() returns a function f such that f(0) + f(1) is 0 when the operands
// are evaluated from left to right, and 1 when they are evaluated from right
// to left. (The checker makes a fresh f for each test.)
function make_f() {
  // your answer
}

const f = make_f();
f(0) + f(1);
`,
  tests: [
    { name: 'left to right gives 0', kind: 'value', expr: 'const g = make_f(); g(0) + g(1)', expected: 0 },
    { name: 'right to left gives 1', kind: 'value', expr: 'const g = make_f(); const right = g(1); const left = g(0); left + right', expected: 1 },
  ],
  solution: `// f returns its argument the first time it is called, and 0 after that.
function make_f() {
  let called = false;
  return x => {
    if (called) {
      return 0;
    } else {
      called = true;
      return x;
    }
  };
}

const f = make_f();
f(0) + f(1);
`,
};
