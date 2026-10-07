import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import {
  exchangeDeadlockProgram,
  interleavingCountProgram,
  jointAccountProgram,
  mutexCounterProgram,
  peterPaulDepositProgram,
  serializedAccountProgram,
  serializedExchangeProgram,
  serializedSquareIncrementProgram,
  serializerDefinitions,
  squareIncrementProgram,
  unserializedExchangeProgram,
} from './concurrency.ts';

/** The final value of each of `runs` seeded runs, as text, or the way the run ended. */
function outcomes(source: string, runs = 200, budget = 20_000): string[] {
  return Array.from({ length: runs }, (_, i) => {
    const outcome = evaluate(source, { seed: i + 1, budget });
    if (outcome.status === 'done') return outcome.text;
    return outcome.status === 'error' ? `error: ${outcome.error.message}` : outcome.status;
  });
}

const kinds = (values: readonly string[]): string[] => [...new Set(values)].sort();

/**
 * Every final value a set of threads can produce, when each thread is a list of
 * reads of one shared variable followed by one write computed from them: the
 * granularity at which the machine interleaves `x = x * x` and its kin.
 */
type Op = { read: true } | { write: (reads: number[]) => number };
function possible(start: number, threads: Op[][]): number[] {
  const finals = new Set<number>();
  function go(x: number, pcs: number[], reads: number[][]): void {
    let moved = false;
    threads.forEach((ops, i) => {
      const op = ops[pcs[i] ?? 0];
      if (op === undefined) return;
      moved = true;
      const next = pcs.map((pc, j) => (j === i ? pc + 1 : pc));
      if ('read' in op) go(x, next, reads.map((r, j) => (j === i ? [...r, x] : r)));
      else go(op.write(reads[i] ?? []), next, reads);
    });
    if (!moved) finals.add(x);
  }
  go(start, threads.map(() => 0), threads.map(() => []));
  return [...finals].sort((a, b) => a - b);
}
const READ: Op = { read: true };
const at = (reads: number[], i: number): number => reads[i] ?? Number.NaN;

describe('section 3.4.1: the nature of time in concurrent systems', () => {
  it("Peter and Paul's withdrawals end at 65, or lose one of them (75 or 90)", () => {
    expect(kinds(outcomes(jointAccountProgram))).toEqual(['65', '75', '90']);
  });

  it('a deposit and a halving have two right answers, and interleaving gives three wrong ones', () => {
    const seen = kinds(outcomes(peterPaulDepositProgram, 300));
    const all = possible(100, [
      [READ, { write: (r) => at(r, 0) + 40 }],
      [READ, READ, { write: (r) => at(r, 0) - at(r, 1) / 2 }],
    ]);
    expect(all).toEqual([30, 50, 70, 90, 140]);
    expect(seen).toEqual(all.map(String).sort());
  });

  it('exercise 3.38: four serial balances, and nine more from interleaving, all of which occur', () => {
    const all = possible(100, [
      [READ, { write: (r) => at(r, 0) + 10 }],
      [READ, { write: (r) => at(r, 0) - 20 }],
      [READ, READ, { write: (r) => at(r, 0) - at(r, 1) / 2 }],
    ]);
    expect(all).toEqual([25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 110]);
    const program = `let balance = 100;
      concurrent_execute(() => { balance = balance + 10; },
                         () => { balance = balance - 20; },
                         () => { balance = balance - balance / 2; });
      balance;`;
    const seen = kinds(outcomes(program, 3000)).map(Number);
    expect(seen.every((v) => all.includes(v))).toBe(true);
    expect(seen).toEqual(expect.arrayContaining([35, 40, 45, 50, 55, 80, 110]));
  });
});

describe('section 3.4.2: mechanisms for controlling concurrency', () => {
  it('two processes of three steps each interleave in 20 orders', () => {
    const outcome = evaluate(interleavingCountProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 20 });
    expect(new Set(outcome.output).size).toBe(20);
    expect(outcome.output[0]).toBe('"abcxyz"');
  });

  it('x = x * x and x = x + 1 leave one of five values, as the book says', () => {
    const all = possible(10, [
      [READ, READ, { write: (r) => at(r, 0) * at(r, 1) }],
      [READ, { write: (r) => at(r, 0) + 1 }],
    ]);
    expect(all).toEqual([11, 100, 101, 110, 121]);
    expect(kinds(outcomes(squareIncrementProgram, 300))).toEqual(all.map(String).sort());
  });

  it('serialized, the same two leave only 101 or 121', () => {
    expect(kinds(outcomes(serializedSquareIncrementProgram))).toEqual(['101', '121']);
  });

  it('exercise 3.39: serializing only the squaring and the increment leaves 101, 121, 100 and 11: only 110 is gone', () => {
    const program = `${serializerDefinitions}
      let x = 10;
      const s = make_serializer();
      concurrent_execute(() => { x = s(() => x * x)(); },
                         s(() => { x = x + 1; }));
      x;`;
    expect(kinds(outcomes(program, 400))).toEqual(['100', '101', '11', '121']);
  });

  it('exercise 3.40: five values unserialized, one serialized', () => {
    const all = possible(10, [
      [READ, READ, { write: (r) => at(r, 0) * at(r, 1) }],
      [READ, READ, READ, { write: (r) => at(r, 0) * at(r, 1) * at(r, 2) }],
    ]);
    expect(all).toEqual([100, 1000, 10000, 100000, 1000000]);
    const threads = '() => { x = x * x; }, () => { x = x * x * x; }';
    expect(kinds(outcomes(`let x = 10; concurrent_execute(${threads}); x;`, 1000))).toEqual(all.map(String).sort());
    const serialized = `${serializerDefinitions} let x = 10; const s = make_serializer();
      concurrent_execute(s(() => { x = x * x; }), s(() => { x = x * x * x; })); x;`;
    expect(kinds(outcomes(serialized, 100))).toEqual(['1000000']);
  });

  it('a serialized account never loses a withdrawal', () => {
    expect(kinds(outcomes(serializedAccountProgram))).toEqual(['65']);
  });

  it('three increments serialized by a mutex on test_and_set always count to 3', () => {
    expect(kinds(outcomes(mutexCounterProgram))).toEqual(['3']);
  });

  it('exchange over individually serialized accounts keeps the sum but not the balances', () => {
    const seen = kinds(outcomes(unserializedExchangeProgram, 100));
    const sums = seen.map((text) => JSON.parse(text).split(' ').map(Number).reduce((a: number, b: number) => a + b, 0));
    expect(new Set(sums)).toEqual(new Set([60]));
    expect(seen).toContain('"40 10 10"');
  });

  it('serialized_exchange leaves the balances 10, 20, 30 in one of the two serial orders', () => {
    expect(kinds(outcomes(serializedExchangeProgram))).toEqual(['"20 30 10"', '"30 10 20"']);
  });

  it('opposite serialized exchanges sometimes deadlock: neither finishes within the budget', () => {
    const seen = kinds(outcomes(exchangeDeadlockProgram, 60));
    expect(seen).toEqual(['"10 20"', 'budget-exhausted']);
  });

  it("exercise 3.45: Louis's automatically serialized account deadlocks even alone", () => {
    const louis = `${serializerDefinitions}
      function make_account_and_serializer(balance) {
          function withdraw(amount) { balance = balance - amount; return balance; }
          function deposit(amount) { balance = balance + amount; return balance; }
          const balance_serializer = make_serializer();
          return m => m === "withdraw" ? amount => balance_serializer(() => withdraw(amount))()
                    : m === "deposit" ? amount => balance_serializer(() => deposit(amount))()
                    : m === "balance" ? balance
                    : balance_serializer;
      }
      function exchange(account1, account2) {
          const difference = account1("balance") - account2("balance");
          account1("withdraw")(difference);
          account2("deposit")(difference);
      }
      function serialized_exchange(account1, account2) {
          const serializer1 = account1("serializer");
          const serializer2 = account2("serializer");
          return serializer1(serializer2(() => exchange(account1, account2)))();
      }
      serialized_exchange(make_account_and_serializer(10), make_account_and_serializer(20));`;
    expect(evaluate(louis, { budget: 50_000 }).status).toBe('budget-exhausted');
  });
});
