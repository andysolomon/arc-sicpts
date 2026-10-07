import { accountExchangeDefinitions, mutexDefinitions, serializerDefinitions } from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/**
 * Exercises of §3.4. Each export is an ExerciseSpec (see ./spec.ts).
 *
 * Checks that run threads carry a `seed`, so that a check interleaves the same
 * way every time, and they never rely on one lucky interleaving: they run the
 * scenario many times inside the test expression and assert something about
 * every outcome (or that some outcome happened at least once in many runs).
 */

/** Lists used as sets, and a scenario run many times. */
const sets = `function contains(xs, x) {
    return !is_null(member(x, xs));
}

function subset(xs, ys) {
    return is_null(xs) || (contains(ys, head(xs)) && subset(tail(xs), ys));
}

function same_values(xs, ys) {
    return subset(xs, ys) && subset(ys, xs);
}

function distinct(xs) {
    return is_null(xs)
           ? null
           : contains(tail(xs), head(xs))
           ? distinct(tail(xs))
           : pair(head(xs), distinct(tail(xs)));
}

function outcomes(run, n) {
    return n === 0 ? null : pair(run(), outcomes(run, n - 1));
}

function all_are(xs, v) {
    return is_null(filter(x => x !== v, xs));
}

function some_are(xs, v) {
    return contains(xs, v);
}
`;

const serialBalances = 'list(35, 40, 45, 50)';

export const exercise_3_38: ExerciseSpec = {
  id: '3.38',
  prelude: sets,
  starter: `// The joint account holds $100, and three people use it at once:
//   Peter:  balance = balance + 10;
//   Paul:   balance = balance - 20;
//   Mary:   balance = balance - balance / 2;

// a. Every balance that can result when the three run one after another, in some order.
const serial_balances = list();

// b. At least three other balances that can result when their steps interleave.
const interleaved_balances = list();
`,
  tests: [
    { name: 'the balances of the serial orders', kind: 'value', expr: `same_values(serial_balances, ${serialBalances})`, expected: true },
    { name: 'at least three different interleaved balances', kind: 'value', expr: 'length(distinct(interleaved_balances)) >= 3', expected: true },
    {
      name: 'each interleaved balance can happen',
      kind: 'value',
      expr: 'subset(interleaved_balances, list(25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 110))',
      expected: true,
    },
    {
      name: 'no interleaved balance is a serial one',
      kind: 'value',
      expr: `is_null(filter(x => contains(${serialBalances}, x), interleaved_balances))`,
      expected: true,
    },
  ],
  solution: `// Peter, Paul, Mary: 110, 90, 45     Peter, Mary, Paul: 110, 55, 35
// Paul, Peter, Mary:  80, 90, 45     Paul, Mary, Peter:  80, 40, 50
// Mary, Peter, Paul:  50, 60, 40     Mary, Paul, Peter:  50, 30, 40
const serial_balances = list(45, 35, 50, 40);

// 110: Peter reads 100; Paul and Mary run (80, then 40); Peter writes 100 + 10.
//  80: Paul reads 100; Peter and Mary run; Paul writes 100 - 20.
//  55: Mary reads 100; Peter and Paul run (90); Mary reads 90 and writes 100 - 45.
const interleaved_balances = list(110, 80, 55);
`,
};

const run339 = `${serializerDefinitions}
function run_exercise_3_39() {
    let x = 10;
    const s = make_serializer();
    concurrent_execute(() => { x = s(() => x * x)(); },
                       s(() => { x = x + 1; }));
    return x;
}
`;

export const exercise_3_39: ExerciseSpec = {
  id: '3.39',
  prelude: `${sets}
${run339}`,
  seed: 339,
  budget: 400_000,
  starter: `// make_serializer is provided.
//   let x = 10;
//   const s = make_serializer();
//   concurrent_execute(() => { x = s(() => x * x)(); },
//                      s(() => { x = x + 1; }));
// Of the five values 101, 121, 110, 11 and 100, which can x still end with?
const remaining = list(101, 121, 110, 11, 100);
`,
  tests: [
    { name: 'exactly the values that remain', kind: 'value', expr: 'same_values(remaining, list(101, 121, 100, 11))', expected: true },
    {
      name: 'every value of 100 runs is on your list',
      kind: 'value',
      expr: 'subset(outcomes(run_exercise_3_39, 100), remaining)',
      expected: true,
    },
  ],
  solution: `// 101 and 121: one function runs entirely before the other.
// 100: the squaring computes 100 under the serializer; the increment then
//      runs entirely and sets 11; only then is x set to 100.
// 11:  the squaring computes 100 and leaves the serializer; the increment
//      reads 10 (x is not set yet), x is set to 100, then the increment sets 11.
// 110 is gone: x * x reads x twice inside the serializer, so the increment
// cannot change x between the two reads.
const remaining = list(101, 121, 100, 11);
`,
};

const run340 = `${serializerDefinitions}
function run_exercise_3_40(serialized) {
    let x = 10;
    const s = make_serializer();
    const p1 = () => { x = x * x; };
    const p2 = () => { x = x * x * x; };
    if (serialized) {
        concurrent_execute(s(p1), s(p2));
    } else {
        concurrent_execute(p1, p2);
    }
    return x;
}
`;

export const exercise_3_40: ExerciseSpec = {
  id: '3.40',
  prelude: `${sets}
${run340}`,
  seed: 340,
  budget: 600_000,
  starter: `//   let x = 10;
//   concurrent_execute(() => { x = x * x; },
//                      () => { x = x * x * x; });
// Every value x can end with:
const possible_values = list();

// ... and when both functions are serialized by one serializer s:
//   concurrent_execute(s(() => { x = x * x; }),
//                      s(() => { x = x * x * x; }));
const serialized_values = list();
`,
  tests: [
    {
      name: 'the possible values',
      kind: 'value',
      expr: 'same_values(possible_values, list(100, 1000, 10000, 100000, 1000000))',
      expected: true,
    },
    { name: 'the values left by serialization', kind: 'value', expr: 'same_values(serialized_values, list(1000000))', expected: true },
    {
      name: 'every value of 100 unserialized runs is on your list',
      kind: 'value',
      expr: 'subset(outcomes(() => run_exercise_3_40(false), 100), possible_values)',
      expected: true,
    },
    {
      name: 'every value of 40 serialized runs is on your list',
      kind: 'value',
      expr: 'subset(outcomes(() => run_exercise_3_40(true), 40), serialized_values)',
      expected: true,
    },
  ],
  solution: `// The squaring reads x twice and writes once; the cubing reads three times.
// x is 10 or the other's result at each read: the product of two reads
// is 100, 1000 or 10000 and of three reads 1000 up to 1000000; the last
// write wins. In all: 10^2, 10^3, 10^4, 10^5 and 10^6.
const possible_values = list(100, 1000, 10000, 100000, 1000000);

// Serialized, one runs entirely first: (10^2)^3 = (10^3)^2 = 10^6.
const serialized_values = list(1000000);
`,
};

export const exercise_3_41: ExerciseSpec = {
  id: '3.41',
  starter: `// Ben serializes reading the balance as well:
//   : m === "balance"
//   ? protect(() => balance)()

// Is he right that this is needed? true or false:
const ben_is_right = undefined;

// Why? Give the letter of the reason:
// "a": an unserialized read can see a withdrawal half done, so its value can be wrong.
// "b": a read of balance is one step, and a withdrawal or deposit changes balance in
//      one step, so a read sees the balance from before or after each of them.
// "c": two unserialized reads of the balance at the same time interfere.
const reason = undefined;
`,
  tests: [
    { name: 'whether Ben is right', kind: 'value', expr: 'ben_is_right', expected: false },
    { name: 'the reason', kind: 'value', expr: 'reason', expected: 'b' },
  ],
  solution: `const ben_is_right = false;
const reason = "b";
`,
};

export const exercise_3_42: ExerciseSpec = {
  id: '3.42',
  prelude: `${sets}
${serializerDefinitions}
function bank_day(make_account) {
    const account = make_account(100);
    concurrent_execute(() => account("withdraw")(10),
                       () => account("withdraw")(25),
                       () => account("deposit")(40));
    return account("balance");
}
`,
  seed: 342,
  budget: 600_000,
  starter: `// make_serializer is provided. Ben builds the protected functions once:
function make_account(balance) {
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
    const protect = make_serializer();
    // your answer: serialize these two, once for all requests
    const protected_withdraw = withdraw;
    const protected_deposit = deposit;
    function dispatch(m) {
        return m === "withdraw"
               ? protected_withdraw
               : m === "deposit"
               ? protected_deposit
               : m === "balance"
               ? balance
               : error(m, "unknown request -- make_account");
    }
    return dispatch;
}

// Is Ben's change safe? true or false:
const ben_is_safe = undefined;
// Does it allow or forbid any concurrency that the original did not? true or false:
const concurrency_differs = undefined;
`,
  tests: [
    {
      name: '60 days of three concurrent transactions all end at $105',
      kind: 'value',
      expr: 'all_are(outcomes(() => bank_day(make_account), 60), 105)',
      expected: true,
    },
    { name: 'whether the change is safe', kind: 'value', expr: 'ben_is_safe', expected: true },
    { name: 'whether the concurrency differs', kind: 'value', expr: 'concurrency_differs', expected: false },
  ],
  solution: `function make_account(balance) {
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
    const protect = make_serializer();
    const protected_withdraw = amount => protect(() => withdraw(amount))();
    const protected_deposit = amount => protect(() => deposit(amount))();
    function dispatch(m) {
        return m === "withdraw"
               ? protected_withdraw
               : m === "deposit"
               ? protected_deposit
               : m === "balance"
               ? balance
               : error(m, "unknown request -- make_account");
    }
    return dispatch;
}

// Every serialized function the account makes takes the same mutex,
// the one in protect, however many of them there are and whenever
// they were made.
const ben_is_safe = true;
const concurrency_differs = false;
`,
};

/** Accounts for exercise 3.43. They never refuse a withdrawal, as the exercise's argument assumes. */
const exchangeAccounts = `${serializerDefinitions}
function make_plain_account(balance) {
    function withdraw(amount) {
        balance = balance - amount;
        return balance;
    }
    function deposit(amount) {
        balance = balance + amount;
        return balance;
    }
    return m => m === "withdraw" ? withdraw
              : m === "deposit" ? deposit
              : m === "balance" ? balance
              : error(m, "unknown request -- make_plain_account");
}

function make_account(balance) {
    const plain = make_plain_account(balance);
    const protect = make_serializer();
    return m => m === "withdraw" ? amount => protect(() => plain("withdraw")(amount))()
              : m === "deposit" ? amount => protect(() => plain("deposit")(amount))()
              : plain(m);
}

function make_account_and_serializer(balance) {
    const plain = make_plain_account(balance);
    const balance_serializer = make_serializer();
    return m => m === "serializer" ? balance_serializer : plain(m);
}

${accountExchangeDefinitions}
function serialized_exchange(account1, account2) {
    const serializer1 = account1("serializer");
    const serializer2 = account2("serializer");
    return serializer1(serializer2(() => exchange(account1, account2)))();
}

function exchange_trials(make, exchange_function, check, n) {
    function trial() {
        const a = make(10);
        const b = make(20);
        const c = make(30);
        concurrent_execute(() => exchange_function(a, b),
                           () => exchange_function(b, c),
                           () => exchange_function(a, c));
        return check(a("balance"), b("balance"), c("balance"));
    }
    return outcomes(trial, n);
}
`;

export const exercise_3_43: ExerciseSpec = {
  id: '3.43',
  prelude: `${sets}
${exchangeAccounts}`,
  seed: 343,
  budget: 1_500_000,
  starter: `// Three accounts start with $10, $20 and $30, and processes exchange their
// balances. Classify the three balances a, b and c afterwards:
//   "in some order"  when they are 10, 20 and 30 in some order,
//   "same sum"       when they are not, but they still add up to 60,
//   "wrong sum"      otherwise.
function check_balances(a, b, c) {
    // your answer
}
`,
  tests: [
    {
      name: 'balances in some order',
      kind: 'value',
      expr: 'check_balances(30, 10, 20) === "in some order" && check_balances(10, 20, 30) === "in some order"',
      expected: true,
    },
    {
      name: 'the same sum',
      kind: 'value',
      expr: 'check_balances(20, 20, 20) === "same sum" && check_balances(40, 10, 10) === "same sum"',
      expected: true,
    },
    {
      name: 'a wrong sum',
      kind: 'value',
      expr: 'check_balances(10, 10, 30) === "wrong sum" && check_balances(10, 20, 20) === "wrong sum"',
      expected: true,
    },
    {
      name: 'serialized_exchange: 30 runs of three exchanges keep the balances',
      kind: 'value',
      expr: 'all_are(exchange_trials(make_account_and_serializer, serialized_exchange, check_balances, 30), "in some order")',
      expected: true,
    },
    {
      name: 'exchange with serialized accounts: 40 runs keep the sum but not always the balances',
      kind: 'value',
      expr: `(() => {
          const results = exchange_trials(make_account, exchange, check_balances, 40);
          return !some_are(results, "wrong sum") && some_are(results, "same sum");
      })()`,
      expected: true,
    },
    {
      name: 'exchange with unserialized accounts: in 40 runs the sum goes wrong',
      kind: 'value',
      expr: 'some_are(exchange_trials(make_plain_account, exchange, check_balances, 40), "wrong sum")',
      expected: true,
    },
  ],
  solution: `function check_balances(a, b, c) {
    const in_order = (a === 10 || a === 20 || a === 30)
                     && (b === 10 || b === 20 || b === 30)
                     && (c === 10 || c === 20 || c === 30)
                     && a !== b && b !== c && a !== c;
    return in_order
           ? "in some order"
           : a + b + c === 60
           ? "same sum"
           : "wrong sum";
}
`,
};

export const exercise_3_44: ExerciseSpec = {
  id: '3.44',
  prelude: `${sets}
${serializerDefinitions}
function make_account(balance) {
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
    const protect = make_serializer();
    return m => m === "withdraw" ? amount => protect(() => withdraw(amount))()
              : m === "deposit" ? amount => protect(() => deposit(amount))()
              : m === "balance" ? balance
              : error(m, "unknown request -- make_account");
}

function balances(a, b, c) {
    return stringify(a("balance")) + " " + stringify(b("balance")) + " " + stringify(c("balance"));
}

function one_transfer(transfer) {
    const a = make_account(100);
    const b = make_account(50);
    transfer(a, b, 30);
    return a("balance") === 70 && b("balance") === 80;
}

function ring_of_transfers(transfer) {
    const a = make_account(100);
    const b = make_account(100);
    const c = make_account(100);
    concurrent_execute(() => transfer(a, b, 10),
                       () => transfer(b, c, 20),
                       () => transfer(c, a, 30));
    return balances(a, b, c);
}
`,
  seed: 344,
  budget: 600_000,
  starter: `// make_account (with serialized withdraw and deposit) is provided.
// Move amount from one account to the other; from_account has enough.
function transfer(from_account, to_account, amount) {
    // your answer
}

// Louis thinks transfer needs a more sophisticated method, such as the
// serialized_exchange of the text. Is he right? true or false:
const louis_is_right = undefined;
`,
  tests: [
    { name: 'a transfer moves the money', kind: 'value', expr: 'one_transfer(transfer)', expected: true },
    {
      name: 'three concurrent transfers, 40 times: always 120, 90, 90',
      kind: 'value',
      expr: 'all_are(outcomes(() => ring_of_transfers(transfer), 40), "120 90 90")',
      expected: true,
    },
    { name: 'whether Louis is right', kind: 'value', expr: 'louis_is_right', expected: false },
  ],
  solution: `function transfer(from_account, to_account, amount) {
    from_account("withdraw")(amount);
    to_account("deposit")(amount);
}

// No. exchange computes the amount from both balances, and they can change
// before it is moved. transfer's amount is given, and each withdrawal and
// deposit is serialized on its own account, so they can interleave freely.
const louis_is_right = false;
`,
};

export const exercise_3_45: ExerciseSpec = {
  id: '3.45',
  starter: `// Louis serializes withdrawals and deposits automatically, and exports the serializer:
//   return m => m === "withdraw"
//               ? amount => balance_serializer(() => withdraw(amount))()
//               : m === "deposit"
//               ? amount => balance_serializer(() => deposit(amount))()
//               : m === "balance"
//               ? balance
//               : m === "serializer"
//               ? balance_serializer
//               : error(m, "unknown request -- make_account");
// and keeps serialized_exchange as it was.

// Does serialized_exchange(a, b) finish, even with no other process running? true or false:
const finishes_alone = undefined;

// Where does it get stuck, if it does? "balance", "withdraw" or "deposit":
const stuck_in = undefined;
`,
  tests: [
    { name: 'whether it finishes', kind: 'value', expr: 'finishes_alone', expected: false },
    { name: 'where it gets stuck', kind: 'value', expr: 'stuck_in', expected: 'withdraw' },
  ],
  solution: `// serialized_exchange holds a's serializer while exchange runs. exchange reads
// both balances (not serialized), then asks a to withdraw, and Louis's
// withdraw waits for a's serializer: for the mutex that this very process
// holds and will release only when exchange returns. It waits forever.
const finishes_alone = false;
const stuck_in = "withdraw";
`,
};

export const exercise_3_46: ExerciseSpec = {
  id: '3.46',
  prelude: `${sets}
function sequential_test_and_set(tas) {
    const cell = list(false);
    const first = tas(cell);
    const second = tas(cell);
    return first === false && second === true && head(cell) === true;
}

function both_acquire(tas) {
    const cell = list(false);
    let first = false;
    let second = false;
    concurrent_execute(() => { first = !tas(cell); },
                       () => { second = !tas(cell); });
    return first && second;
}
`,
  seed: 346,
  budget: 400_000,
  starter: `// The Laboratory's test_and_set is a primitive: one step, atomic.
// Write test_and_set as an ordinary function instead, as in the text,
// and two threads should be able to acquire the same mutex.
function non_atomic_test_and_set(cell) {
    // your answer
    return test_and_set(cell);
}
`,
  tests: [
    {
      name: 'alone, it still tests and sets',
      kind: 'value',
      expr: 'sequential_test_and_set(non_atomic_test_and_set)',
      expected: true,
    },
    {
      name: 'in 200 races, two threads both acquire at least once',
      kind: 'value',
      expr: 'some_are(outcomes(() => both_acquire(non_atomic_test_and_set), 200), true)',
      expected: true,
    },
  ],
  solution: `function non_atomic_test_and_set(cell) {
    if (head(cell)) {
        return true;
    } else {
        set_head(cell, true);
        return false;
    }
}
`,
};

/** Runs four workers through a semaphore of size n and returns the most that were inside at once. */
const semaphoreTrial = `${sets}
${mutexDefinitions}
function most_inside(make_semaphore, n) {
    const semaphore = make_semaphore(n);
    const guard = make_mutex();
    let inside = 0;
    let most = 0;
    function work(k) {
        return k === 0 ? true : work(k - 1);
    }
    function worker() {
        semaphore("acquire");
        guard("acquire");
        inside = inside + 1;
        most = math_max(most, inside);
        guard("release");
        work(5);
        guard("acquire");
        inside = inside - 1;
        guard("release");
        semaphore("release");
    }
    concurrent_execute(worker, worker, worker, worker);
    return most;
}

function most_of_runs(make_semaphore, n, runs) {
    return accumulate(math_max, 0, outcomes(() => most_inside(make_semaphore, n), runs));
}
`;

export const exercise_3_47: ExerciseSpec = {
  id: '3.47',
  prelude: semaphoreTrial,
  seed: 347,
  budget: 3_000_000,
  starter: `// make_mutex is provided. A semaphore of size n lets at most n processes hold it at once:
// semaphore("acquire") waits until fewer than n do, semaphore("release") lets one go.

// a. In terms of mutexes:
function make_semaphore(n) {
    // your answer
}

// b. In terms of test_and_set:
function make_semaphore_tas(n) {
    // your answer
}
`,
  tests: [
    { name: 'a. size 2, 4 workers, 25 runs: two at once, never three', kind: 'value', expr: 'most_of_runs(make_semaphore, 2, 25)', expected: 2 },
    { name: 'a. size 1, 4 workers, 20 runs: one at a time', kind: 'value', expr: 'most_of_runs(make_semaphore, 1, 20)', expected: 1 },
    { name: 'b. size 2, 4 workers, 25 runs: two at once, never three', kind: 'value', expr: 'most_of_runs(make_semaphore_tas, 2, 25)', expected: 2 },
    { name: 'b. size 1, 4 workers, 20 runs: one at a time', kind: 'value', expr: 'most_of_runs(make_semaphore_tas, 1, 20)', expected: 1 },
  ],
  solution: `function make_semaphore(n) {
    const guard = make_mutex();
    let taken = 0;
    function the_semaphore(m) {
        if (m === "acquire") {
            guard("acquire");
            if (taken < n) {
                taken = taken + 1;
                guard("release");
                return true;
            } else {
                guard("release");
                return the_semaphore("acquire");  // retry
            }
        } else if (m === "release") {
            guard("acquire");
            taken = taken - 1;
            guard("release");
            return true;
        } else {
            return error(m, "unknown request -- semaphore");
        }
    }
    return the_semaphore;
}

function make_semaphore_tas(n) {
    const cell = list(false);
    let taken = 0;
    function lock() {
        return test_and_set(cell) ? lock() : true;
    }
    function unlock() {
        set_head(cell, false);
    }
    function the_semaphore(m) {
        if (m === "acquire") {
            lock();
            if (taken < n) {
                taken = taken + 1;
                unlock();
                return true;
            } else {
                unlock();
                return the_semaphore("acquire");  // retry
            }
        } else if (m === "release") {
            lock();
            taken = taken - 1;
            unlock();
            return true;
        } else {
            return error(m, "unknown request -- semaphore");
        }
    }
    return the_semaphore;
}
`,
};

export const exercise_3_48: ExerciseSpec = {
  id: '3.48',
  prelude: `${sets}
${serializerDefinitions}
${accountExchangeDefinitions}
function balances(a, b) {
    return stringify(a("balance")) + " " + stringify(b("balance"));
}

function opposite_exchanges(make, serialized_exchange) {
    const a = make(10);
    const b = make(30);
    concurrent_execute(() => serialized_exchange(a, b),
                       () => serialized_exchange(b, a));
    return balances(a, b);
}

function ring_of_exchanges(make, serialized_exchange) {
    const a = make(10);
    const b = make(20);
    const c = make(30);
    concurrent_execute(() => serialized_exchange(a, b),
                       () => serialized_exchange(b, c),
                       () => serialized_exchange(c, a));
    const sum = a("balance") + b("balance") + c("balance");
    const product = a("balance") * b("balance") * c("balance");
    return sum === 60 && product === 6000;
}
`,
  seed: 348,
  budget: 500_000,
  starter: `// make_serializer and exchange are provided.
// Give each account a number, and make serialized_exchange take the
// serializer of the lower-numbered account first.
function make_account_and_serializer(balance) {
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
    const balance_serializer = make_serializer();
    return m => m === "withdraw"
                ? withdraw
                : m === "deposit"
                ? deposit
                : m === "balance"
                ? balance
                : m === "serializer"
                ? balance_serializer
                : error(m, "unknown request -- make_account");
}

function serialized_exchange(account1, account2) {
    const serializer1 = account1("serializer");
    const serializer2 = account2("serializer");
    return serializer1(serializer2(() => exchange(account1, account2)))();
}
`,
  tests: [
    {
      name: 'every account has its own number',
      kind: 'value',
      expr: 'make_account_and_serializer(5)("number") !== make_account_and_serializer(5)("number")',
      expected: true,
    },
    {
      name: 'opposite exchanges, 40 times: all finish, back where they started',
      kind: 'value',
      expr: 'all_are(outcomes(() => opposite_exchanges(make_account_and_serializer, serialized_exchange), 40), "10 30")',
      expected: true,
    },
    {
      name: 'three exchanges in a ring, 30 times: all finish, balances in some order',
      kind: 'value',
      expr: 'all_are(outcomes(() => ring_of_exchanges(make_account_and_serializer, serialized_exchange), 30), true)',
      expected: true,
    },
  ],
  solution: `let accounts_made = 0;

function make_account_and_serializer(balance) {
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
    const balance_serializer = make_serializer();
    accounts_made = accounts_made + 1;
    const number = accounts_made;
    return m => m === "withdraw"
                ? withdraw
                : m === "deposit"
                ? deposit
                : m === "balance"
                ? balance
                : m === "serializer"
                ? balance_serializer
                : m === "number"
                ? number
                : error(m, "unknown request -- make_account");
}

function serialized_exchange(account1, account2) {
    const first = account1("number") < account2("number") ? account1 : account2;
    const second = first === account1 ? account2 : account1;
    return first("serializer")(second("serializer")(() => exchange(account1, account2)))();
}
`,
};

export const exercise_3_49: ExerciseSpec = {
  id: '3.49',
  starter: `// Each account here also holds a "partner" account, which can change, so it
// may be read only while holding the account's own serializer. A transfer to
// the partner must therefore lock the account first and only then learn which
// second account to lock. Account 2's partner is account 1, and account 1's is 2.
// Thread A transfers from account 2 to its partner; thread B from account 1 to its partner.
// Replace each null.

// Does thread A have to hold account 2 before it knows it needs account 1? (true or false)
const must_lock_before_knowing = null;

// Can thread A still take the lower-numbered account first, as Exercise 3.48 requires,
// without letting go of account 2? (true or false)
const numbering_can_be_followed = null;

// After A holds 2 and B holds 1, can both wait for ever? (true or false)
const can_deadlock = null;
`,
  tests: [
    { name: 'the second resource is known only after the first is held', kind: 'value', expr: 'must_lock_before_knowing', expected: true },
    { name: 'so the order cannot be fixed in advance', kind: 'value', expr: 'numbering_can_be_followed', expected: false },
    { name: 'and the cycle can form', kind: 'value', expr: 'can_deadlock', expected: true },
  ],
  solution: `const must_lock_before_knowing = true;
const numbering_can_be_followed = false;
const can_deadlock = true;
`,
};
