import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { createStepTracer } from '../inspect/stepTrace.ts';
import {
  imperativeFactorialProgram,
  aliasedAccountProgram,
  makeAccountProgram,
  makeWithdrawProgram,
  monteCarloProgram,
  monteCarloSeriesProgram,
  newWithdrawProgram,
  randomGcdTestProgram,
  randProgram,
  separateAccountProgram,
  simplifiedWithdrawProgram,
  withdrawProgram,
} from './localState.ts';

const run = (source: string, budget = 100_000) => {
  const outcome = evaluate(source, { budget });
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return { value: outcome.value, output: outcome.output };
};

describe('section 3.1.1: local state variables', () => {
  it('withdraw remembers the balance between calls, so the same call gives different values', () => {
    expect(run(withdrawProgram)).toEqual({ value: 35, output: ['75', '50', '"Insufficient funds"'] });
  });

  it('new_withdraw behaves the same with the balance hidden inside it', () => {
    expect(run(newWithdrawProgram)).toEqual({ value: 35, output: ['75', '50', '"Insufficient funds"'] });
    // Nothing outside can reach it.
    expect(evaluate(`${newWithdrawProgram} balance;`)).toMatchObject({ status: 'error' });
  });

  it('assigns names declared with let, and refuses to assign constants', () => {
    expect(run('let x = 1; x = x + 1; x;').value).toBe(2);
    // An assignment is an expression whose value is the value assigned.
    expect(run('let x = 1; x = 5;').value).toBe(5);
    expect(evaluate('const x = 1; x = 2;')).toMatchObject({ status: 'error', error: { message: 'Line 1: Cannot assign to constant x' } });
  });

  it('runs each assignment in the withdrawal\'s own frame, which extends the frame holding balance', () => {
    const tracer = createStepTracer(newWithdrawProgram);
    evaluate(newWithdrawProgram, { hooks: [tracer.hooks] });
    const withdrawals = tracer.records.flatMap((r) => (r.event.kind === 'call' && r.event.name === 'lambda' ? [`${r.env} extends ${r.event.closureEnv}`] : []));
    expect(withdrawals).toEqual(['E3 extends E2', 'E4 extends E2', 'E5 extends E2', 'E6 extends E2']);
    const assigned = tracer.records.flatMap((r) =>
      r.event.kind === 'define' && r.event.assignment ? [`${r.event.symbol} = ${r.event.value} from ${r.env}`] : [],
    );
    // The third withdrawal (E5) is refused and assigns nothing.
    expect(assigned).toEqual(['balance = 75 from E3', 'balance = 50 from E4', 'balance = 35 from E6']);
  });

  it('W1 and W2 are independent objects, each with its own balance', () => {
    expect(run(makeWithdrawProgram)).toEqual({ value: 10, output: ['50', '30', '"Insufficient funds"'] });
  });

  it('make_account dispatches on a message, and both operations share one balance', () => {
    expect(run(makeAccountProgram)).toEqual({ value: 30, output: ['50', '"Insufficient funds"', '90'] });
    expect(evaluate(`${makeAccountProgram} acc("transfer");`)).toMatchObject({ status: 'error' });
  });
});

describe('section 3.1.2: the benefits of introducing assignment', () => {
  it('rand produces the sequence of rand_update from random_init', () => {
    const x1 = (48271 * 2026) % 2147483647;
    const x2 = (48271 * x1) % 2147483647;
    const x3 = (48271 * x2) % 2147483647;
    expect(run(randProgram)).toEqual({ value: x3, output: [String(x1), String(x2)] });
  });

  it('estimates π by the Cesàro test, the same way every time', () => {
    const { value } = run(monteCarloProgram, 1_000_000);
    expect(value).toBeCloseTo(3.1285664803324393, 12);
    expect(Math.abs((value as number) - Math.PI)).toBeLessThan(0.05);
  });

  it('the version without assignment gives exactly the same estimate, at the price of threading x by hand', () => {
    expect(run(randomGcdTestProgram, 1_000_000).value).toBe(run(monteCarloProgram, 1_000_000).value);
  });

  it('reports a running estimate every 25 trials, then π for comparison', () => {
    const { value, output } = run(monteCarloSeriesProgram, 1_000_000);
    expect(value).toBe(run(monteCarloProgram, 1_000_000).value);
    expect(output[0]).toBe('"estimate of π"');
    expect(output[41]).toBe('"π"');
    expect(output.length).toBe(82);
    expect(Number(output[40])).toBe(value);
  });
});

describe('section 3.1.3: the costs of introducing assignment', () => {
  it('make_simplified_withdraw answers differently to the same call; make_decrementer does not', () => {
    expect(run(simplifiedWithdrawProgram)).toEqual({ value: 15, output: ['5', '-5', '5'] });
  });

  it('two accounts made alike are different accounts; one account under two names is one', () => {
    expect(run(separateAccountProgram)).toEqual({ value: 60, output: ['90', '80'] });
    expect(run(aliasedAccountProgram)).toEqual({ value: 40, output: ['90', '70'] });
  });

  it('swapping the order of two assignments computes (n + 1)! instead of n!', () => {
    expect(run(imperativeFactorialProgram)).toEqual({ value: 720, output: ['120'] });
  });
});
