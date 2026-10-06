import {
  averageDampProgram,
  dampedProgram,
  fibProgram,
  fixedPointProgram,
  growthProgram,
  halfIntervalProgram,
  integralProgram,
  newtonProgram,
  oscillatingProgram,
  processShape,
} from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { callTree } from '../src/anim/model/calls.ts';
import { environmentStates } from '../src/anim/model/environment.ts';
import { factor, growth, scale, sizeOf } from '../src/anim/model/growth.ts';
import { callsOf, findMethodCall, fmt, guessesOf, sampler } from '../src/anim/model/plot.ts';
import { traceOf } from './traceHelper.ts';

describe('tree recursion', () => {
  it('marks the calls that repeat an earlier call exactly', () => {
    const tree = callTree(fibProgram, traceOf(fibProgram));
    expect(tree).toMatchObject({ calls: 15, repeats: 9 });
    const [fib5] = tree.root.children;
    const [fib4, fib3] = fib5?.children ?? [];
    expect(fib4?.data).toMatchObject({ label: 'fib(4)', name: 'fib', args: ['4'], repeatOf: null });
    // fib(3) under fib(5) was already computed under fib(4).
    expect(fib3?.data.repeatOf).toBe(fib4?.children[0]?.data.id);
    expect(tree.keyframes.some((k) => k.caption.includes('fib(3) was already computed once'))).toBe(true);
  });
});

describe('growth', () => {
  it('reads the size of a call from its last numeric argument', () => {
    expect(sizeOf('fib(15)')).toEqual({ name: 'fib', n: 15 });
    expect(sizeOf('expmod(2, 1008, 1009)')).toEqual({ name: 'expmod', n: 1009 });
    expect(sizeOf('display(fib(5))')).toBeNull();
    expect(sizeOf('8 * pi_sum(1, 1000)')).toBeNull();
  });

  it('groups measurements into one series per function, in size order', () => {
    const model = growth(processShape(growthProgram, { budget: 2_000_000 }).snapshot);
    expect(model.series.map((s) => s.name)).toEqual(['factorial', 'fib']);
    const fib = model.series[1];
    expect(fib?.points.map((p) => [p.n, p.calls, p.depth])).toEqual([
      [5, 15, 5],
      [10, 177, 10],
      [15, 1973, 15],
      [20, 21891, 20],
    ]);
    expect(fib && factor(fib, 'calls')?.times).toBeCloseTo(1459.4, 1);
  });

  it('turns logarithmic when the data spans orders of magnitude', () => {
    const linear = scale([5, 10, 15, 20], [0, 100]);
    expect(linear.log).toBe(false);
    expect(linear(10)).toBe(50);
    const log = scale([5, 21891], [0, 100]);
    expect(log.log).toBe(true);
    expect(log.ticks).toEqual([1, 10, 100, 1000, 10000, 100000]);
    // 100 003 does not stretch the axis to a million.
    expect(scale([101, 100003], [0, 1], { logRatio: 20 }).ticks.at(-1)).toBe(100000);
  });
});

describe('general methods', () => {
  it('finds the method call and the function it was handed', () => {
    expect(findMethodCall(halfIntervalProgram, 'half_interval_method')).toMatchObject({ fn: 'math_sin', args: [2, 4] });
    expect(findMethodCall(oscillatingProgram, 'fixed_point')?.fn).toBe('y => x / y');
    expect(findMethodCall(fibProgram, 'fixed_point')).toBeNull();
  });

  it("samples a function using only the program's declarations", () => {
    const f = sampler(oscillatingProgram, 'y => x / y');
    expect(f?.(4)).toBe(0.5);
    expect(sampler(dampedProgram, 'y => average(y, x / y)')?.(1)).toBe(1.5);
    // A function that fails at a point has no value there.
    expect(sampler(fixedPointProgram, 'x => 1 / undefined_name')?.(1)).toBeNull();
  });

  it('reads the intervals of a half-interval search from the trace', () => {
    const trace = traceOf(halfIntervalProgram, 4000);
    const intervals = callsOf(trace, 'search').map((c) => [Number(c.args[1]), Number(c.args[2])]);
    expect(intervals[0]).toEqual([4, 2]);
    expect(intervals[1]).toEqual([4, 3]);
    expect(intervals).toHaveLength(12);
  });

  it('reads the guesses of a fixed-point search from the trace', () => {
    expect(guessesOf(traceOf(dampedProgram, 4000)).map(fmt)).toEqual(['1', '1.5', '1.41667', '1.41422']);
    expect(guessesOf(traceOf(fixedPointProgram, 4000)).length).toBeGreaterThan(20);
    expect(guessesOf(traceOf(newtonProgram, 4000))[1]).toBeCloseTo(1.5, 5);
    const oscillating = guessesOf(traceOf(oscillatingProgram, 4000));
    expect(oscillating.slice(0, 4)).toEqual([1, 2, 1, 2]);
  });

  it('records where the integrand was evaluated', () => {
    const tree = callTree(integralProgram, traceOf(integralProgram, 4000));
    const cubes: string[] = [];
    const visit = (node: typeof tree.root): void => {
      if (node.data.name === 'cube') cubes.push(node.data.args[0] ?? '');
      node.children.forEach(visit);
    };
    visit(tree.root);
    expect(cubes).toHaveLength(20);
    expect(cubes[0]).toBe('0.025');
  });
});

describe('returned functions', () => {
  it("keeps the frame a returned function was made in, since the function's calls extend it", () => {
    const trace = traceOf(averageDampProgram);
    const last = environmentStates(averageDampProgram, trace).at(-1);
    const call = last?.frames.find((f) => f.label === 'lambda(10)');
    expect(last?.frames.find((f) => f.id === call?.parent)?.label).toBe('average_damp(fn[E0])');
  });
});
