import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import type { Value } from '../evaluator/values.ts';
import { createStepTracer, type StepRecord } from '../inspect/stepTrace.ts';
import {
  envModelAssignmentProgram,
  envModelFactorialIterativeDefinition,
  envModelFactorialRecursiveDefinition,
  envModelInternalSqrtProgram,
  envModelMakeAccountProgram,
  envModelMakeWithdrawProgram,
  envModelMutualRecursionProgram,
  envModelSquareProgram,
  envModelSumOfSquaresProgram,
  envModelTooEarlyProgram,
  envModelTwoWithdrawsProgram,
} from './environmentModel.ts';

const traced = (source: string): { outcome: ReturnType<typeof evaluate>; records: StepRecord[] } => {
  const tracer = createStepTracer(source, 4000);
  const outcome = evaluate(source, { hooks: [tracer.hooks] });
  return { outcome, records: tracer.records };
};

const calls = (records: StepRecord[]) =>
  records.flatMap((r) => (r.event.kind === 'call' ? [{ frame: r.env, ...r.event }] : []));

const defines = (records: StepRecord[]) =>
  records.flatMap((r) => (r.event.kind === 'define' ? [{ frame: r.env, ...r.event }] : []));

describe('section 3.2.1: the rules for evaluation', () => {
  it('square(5) makes one frame, binding x, that extends the program frame where square was made', () => {
    const { outcome, records } = traced(envModelSquareProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 25 });
    expect(defines(records)).toEqual([expect.objectContaining({ symbol: 'square', value: 'fn[E0]', frame: 'E0' })]);
    expect(calls(records)).toEqual([expect.objectContaining({ frame: 'E1', closureEnv: 'E0', params: ['x'], args: ['5'] })]);
  });

  it('an assignment changes the binding in the first frame that has the name', () => {
    const { outcome, records } = traced(envModelAssignmentProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 11 });
    // The assignments run in the frames of bump(1) and bump(10), but count is in E0.
    const assignments = defines(records).filter((d) => d.assignment);
    expect(assignments.map((a) => [a.frame, a.value])).toEqual([
      ['E1', '1'],
      ['E2', '11'],
    ]);
    expect(evaluate(`${envModelAssignmentProgram} count;`)).toMatchObject({ value: 11 });
  });

  it('assigning to an undeclared name or a constant is an error', () => {
    expect(evaluate('function f() { total = 1; return total; }\nf();')).toMatchObject({ status: 'error' });
    expect(evaluate(envModelAssignmentProgram.replace('let count', 'const count'))).toMatchObject({ status: 'error' });
  });
});

describe('section 3.2.2: applying simple functions', () => {
  it('f(5) makes four frames, each extending the program frame', () => {
    const { outcome, records } = traced(envModelSumOfSquaresProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 136 });
    expect(calls(records).map((c) => [c.frame, c.name, c.args.join(', '), c.closureEnv])).toEqual([
      ['E1', 'f', '5', 'E0'],
      ['E2', 'sum_of_squares', '6, 10', 'E0'],
      ['E3', 'square', '6', 'E0'],
      ['E4', 'square', '10', 'E0'],
    ]);
  });

  it('exercise 3.9: factorial(6) makes 6 frames recursively and 8 iteratively, all extending the program frame', () => {
    const recursive = calls(traced(`${envModelFactorialRecursiveDefinition}factorial(6);`).records);
    expect(recursive).toHaveLength(6);
    expect(Math.max(...recursive.map((c) => c.depth))).toBe(6);
    const iterative = calls(traced(`${envModelFactorialIterativeDefinition}factorial(6);`).records);
    expect(iterative).toHaveLength(8);
    expect(iterative.map((c) => c.args.join(', ')).slice(1)).toEqual(['1, 1, 6', '1, 2, 6', '2, 3, 6', '6, 4, 6', '24, 5, 6', '120, 6, 6', '720, 7, 6']);
    // Tail calls: every call replaces its caller, so only one frame is ever pending.
    expect(Math.max(...iterative.map((c) => c.depth))).toBe(1);
    expect(new Set([...recursive, ...iterative].map((c) => c.closureEnv))).toEqual(new Set(['E0']));
  });
});

describe('section 3.2.3: frames as the repository of local state', () => {
  it('W1 points at E1, which holds balance; W1(50) changes it there', () => {
    const { outcome, records } = traced(envModelMakeWithdrawProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 50 });
    expect(defines(records).find((d) => d.symbol === 'W1')).toMatchObject({ frame: 'E0', value: 'fn[E1]' });
    expect(calls(records).at(-1)).toMatchObject({ frame: 'E2', closureEnv: 'E1', params: ['amount'] });
    expect(defines(records).find((d) => d.assignment)).toMatchObject({ symbol: 'balance', frame: 'E2', value: '50' });
  });

  it('W1 and W2 share their code but not their environments', () => {
    const closures = new Map<string, Value>();
    const outcome = evaluate(envModelTwoWithdrawsProgram, {
      hooks: [{ onDefine: (symbol, value) => void closures.set(symbol, value) }],
    });
    expect(outcome).toMatchObject({ status: 'done', value: 10 });
    const w1 = closures.get('W1');
    const w2 = closures.get('W2');
    if (typeof w1 !== 'object' || w1 === null || !('tag' in w1) || w1.tag !== 'closure') throw new Error('W1 is not a function');
    if (typeof w2 !== 'object' || w2 === null || !('tag' in w2) || w2.tag !== 'closure') throw new Error('W2 is not a function');
    expect(w1.lambda).toBe(w2.lambda);
    expect(w1.env).not.toBe(w2.env);
    expect([w1.env.frame.bindings.get('balance')?.value, w2.env.frame.bindings.get('balance')?.value]).toEqual([10, 30]);
  });
});

describe('section 3.2.4: internal declarations', () => {
  it('sqrt’s internal functions live in a block frame E2 that extends the frame E1 of x', () => {
    const { outcome, records } = traced(envModelInternalSqrtProgram);
    expect(outcome.status).toBe('done');
    if (outcome.status === 'done') expect(outcome.value as number).toBeCloseTo(Math.SQRT2, 3);
    const local = defines(records).filter((d) => ['is_good_enough', 'improve', 'sqrt_iter'].includes(d.symbol));
    expect(local.map((d) => [d.symbol, d.frame, d.value, d.parentEnv])).toEqual([
      ['is_good_enough', 'E2', 'fn[E2]', 'E1'],
      ['improve', 'E2', 'fn[E2]', 'E1'],
      ['sqrt_iter', 'E2', 'fn[E2]', 'E1'],
    ]);
    const first = calls(records).find((c) => c.name === 'is_good_enough');
    expect(first).toMatchObject({ closureEnv: 'E2', args: ['1'] });
  });

  it('internal functions may call ones declared after them', () => {
    expect(evaluate(envModelMutualRecursionProgram)).toMatchObject({ status: 'done', value: false });
  });

  it('a block’s names are scanned out first, so using one too early is an error, not the outer name', () => {
    const outcome = evaluate(envModelTooEarlyProgram);
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.error.message).toContain('Name z used before its declaration was evaluated');
  });

  it('exercise 3.11: each account keeps balance in its own call frame, its functions in a block frame', () => {
    const { outcome, records } = traced(envModelMakeAccountProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 90 });
    const declared = defines(records);
    expect(declared.find((d) => d.symbol === 'acc')).toMatchObject({ value: 'fn[E2]' });
    expect(declared.find((d) => d.symbol === 'acc2')).toMatchObject({ value: 'fn[E8]' });
    // acc("deposit")(40) applies dispatch, then deposit: two frames.
    expect(calls(records).slice(1, 3).map((c) => [c.name, c.closureEnv])).toEqual([
      ['dispatch', 'E2'],
      ['deposit', 'E2'],
    ]);
    expect(declared.filter((d) => d.assignment).map((d) => d.value)).toEqual(['90', '30', '90']);
  });
});
