import { envModelMakeAccountDefinition } from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §3.2. Each export is an ExerciseSpec (see ./spec.ts). */

export const exercise_3_9: ExerciseSpec = {
  id: '3.9',
  starter: `// The two factorials of section 1.2.1:
//
// function factorial(n) {               // recursive
//   return n === 1 ? 1 : n * factorial(n - 1);
// }
//
// function factorial(n) {               // iterative
//   return fact_iter(1, 1, n);
// }
// function fact_iter(product, counter, max_count) {
//   return counter > max_count
//          ? product
//          : fact_iter(counter * product, counter + 1, max_count);
// }

// How many frames does evaluating factorial(n) create, for n >= 1?
function frames_recursive(n) {
  return 0; // your answer
}

function frames_iterative(n) {
  return 0; // your answer
}

// Which frame does every one of those frames extend? "program", or the
// frame of the call that made it ("caller")?
const enclosing = ""; // your answer

// In this Laboratory, at most how many of the frames made by factorial(6)
// are waiting for a value at the same time?
const most_pending_recursive = 0; // your answer
const most_pending_iterative = 0; // your answer
`,
  tests: [
    { name: 'recursive frames for factorial(6)', kind: 'value', expr: 'frames_recursive(6)', expected: 6 },
    { name: 'recursive frames for factorial(1) and factorial(10)', kind: 'value', expr: 'frames_recursive(1) === 1 && frames_recursive(10) === 10', expected: true },
    { name: 'iterative frames for factorial(6)', kind: 'value', expr: 'frames_iterative(6)', expected: 8 },
    { name: 'iterative frames for factorial(1) and factorial(10)', kind: 'value', expr: 'frames_iterative(1) === 3 && frames_iterative(10) === 12', expected: true },
    { name: 'the enclosing environment', kind: 'value', expr: 'enclosing', expected: 'program' },
    { name: 'frames pending at once', kind: 'value', expr: 'most_pending_recursive * 100 + most_pending_iterative', expected: 601 },
  ],
  solution: `function frames_recursive(n) {
  return n;
}

function frames_iterative(n) {
  // one for factorial(n), then fact_iter with counter = 1, 2, ..., n + 1
  return 1 + (n + 1);
}

const enclosing = "program";

const most_pending_recursive = 6;
const most_pending_iterative = 1;
`,
};

export const exercise_3_10: ExerciseSpec = {
  id: '3.10',
  starter: `// Rewrite make_withdraw so that its parameter is initial_amount and
// balance is created separately, by applying a lambda expression
// with parameter balance to initial_amount.
function make_withdraw(balance) {
  return amount => {
           if (balance >= amount) {
             balance = balance - amount;
             return balance;
           } else {
             return "insufficient funds";
           }
         };
}

// How many frames does evaluating make_withdraw(100) now create?
const frames_per_make_withdraw = 0; // your answer

// The name bound in the frame that W1's environment pointer points at:
const pointed_at_frame_binds = ""; // your answer

// The name bound in the frame that frame extends:
const its_enclosing_frame_binds = ""; // your answer
`,
  tests: [
    { name: 'W1(50) leaves 50', kind: 'value', expr: 'make_withdraw(100)(50)', expected: 50 },
    {
      name: 'two withdrawals from one W1, and W2 untouched',
      kind: 'value',
      expr: '(W1 => W2 => W1(50) + W1(30) * 1000 + W2(10) * 1000000)(make_withdraw(100))(make_withdraw(100))',
      expected: 90020050,
    },
    { name: 'insufficient funds', kind: 'value', expr: 'make_withdraw(10)(20)', expected: 'insufficient funds' },
    { name: 'balance comes from applying a lambda expression', kind: 'calls', call: 'make_withdraw(100)', fn: 'lambda', atMost: 1 },
    { name: 'frames per make_withdraw', kind: 'value', expr: 'frames_per_make_withdraw', expected: 2 },
    { name: 'the frames W1 reaches', kind: 'value', expr: 'pointed_at_frame_binds + " in " + its_enclosing_frame_binds', expected: 'balance in initial_amount' },
  ],
  solution: `function make_withdraw(initial_amount) {
  return (balance =>
            amount => {
              if (balance >= amount) {
                balance = balance - amount;
                return balance;
              } else {
                return "insufficient funds";
              }
            })(initial_amount);
}

const frames_per_make_withdraw = 2;
const pointed_at_frame_binds = "balance";
const its_enclosing_frame_binds = "initial_amount";
`,
};

export const exercise_3_11: ExerciseSpec = {
  id: '3.11',
  prelude: envModelMakeAccountDefinition,
  starter: `// make_account, as in section 3.1.1, is provided. Run in your head
// (or in an editor above, with the frames drawn):
//
// const acc = make_account(50);
// acc("deposit")(40);    // 90
// acc("withdraw")(60);   // 30
// const acc2 = make_account(100);

// 1. How many frames does make_account(50) create in this Laboratory?
const frames_per_account = 0;

// 2. How many frames does acc("deposit")(40) create?
const frames_per_transaction = 0;

// 3. The names bound in the frame whose binding of balance acc changes,
//    and in the frame acc's environment pointer points at, as one string
//    with the names in the order they are declared, separated by spaces:
const state_frame = "";
const functions_frame = "";

// 4. How many frames of the program (counting the program frame itself)
//    are part of both acc's environment and acc2's?
const shared_frames = 0;
`,
  tests: [
    { name: 'frames per account', kind: 'value', expr: 'frames_per_account', expected: 2 },
    { name: 'frames per transaction', kind: 'value', expr: 'frames_per_transaction', expected: 2 },
    { name: 'where the balance is kept', kind: 'value', expr: 'state_frame', expected: 'balance' },
    { name: 'where acc points', kind: 'value', expr: 'functions_frame', expected: 'withdraw deposit dispatch' },
    { name: 'what acc and acc2 share', kind: 'value', expr: 'shared_frames', expected: 1 },
  ],
  solution: `const frames_per_account = 2;
const frames_per_transaction = 2;
const state_frame = "balance";
const functions_frame = "withdraw deposit dispatch";
const shared_frames = 1;
`,
};
