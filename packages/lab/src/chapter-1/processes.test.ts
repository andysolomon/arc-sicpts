import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { maxDepth, processShape, type ProcessRun } from '../inspect/processShape.ts';
import { exptGrowthProgram, fastExptProgram } from './exponentiation.ts';
import { factorialDefinitions, factorialProgram } from './factorial.ts';
import { gcdProgram, lameProgram } from './gcd.ts';
import { growthProgram, sineDefinitions } from './growth.ts';
import { fermatProgram, primalityGrowthProgram, smallestDivisorProgram } from './primality.ts';
import { countChangeProgram, fibCompareProgram, fibProgram } from './treeRecursion.ts';

const runs = (source: string): ProcessRun[] => processShape(source, { budget: 2_000_000 }).snapshot.runs;
const calls = (source: string): Record<string, number> =>
  Object.fromEntries(runs(source).map((run) => [run.label, run.calls]));
const value = (source: string, budget = 100_000): unknown => {
  const outcome = evaluate(source, { budget });
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return outcome.value;
};

describe('section 1.2.1: linear recursion and iteration', () => {
  it('factorial builds a chain of deferred multiplications as deep as n', () => {
    expect(maxDepth(`${factorialDefinitions} factorial(6);`)).toBe(6);
    expect(maxDepth(`${factorialDefinitions} factorial(25);`)).toBe(25);
  });

  it('fact_iter runs in constant space', () => {
    expect(maxDepth(`${factorialDefinitions} fact_iter(1, 1, 6);`)).toBe(1);
    expect(maxDepth(`${factorialDefinitions} fact_iter(1, 1, 25);`)).toBe(1);
  });

  it('records one run per top-level statement that makes calls', () => {
    const { snapshot, outcome } = processShape(factorialProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 720 });
    expect(snapshot.runs).toEqual([
      {
        label: 'factorial(6)',
        samples: [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1],
        maxDepth: 6,
        calls: 6,
        kind: 'recursive',
        truncated: false,
      },
      {
        label: 'fact_iter(1, 1, 6)',
        samples: [1, 1, 1, 1, 1, 1, 1, 1],
        maxDepth: 1,
        calls: 7,
        kind: 'iterative',
        truncated: false,
      },
    ]);
  });

  it('does not mistake a helper call for recursion', () => {
    const { snapshot } = processShape(`
      function square(x) { return x * x; }
      function sum_of_squares(a, b) { return square(a) + square(b); }
      sum_of_squares(3, 4);`);
    expect(snapshot.runs[0]).toMatchObject({ kind: 'iterative', maxDepth: 2, calls: 3 });
  });

  it('stops sampling at the limit but keeps counting', () => {
    const { snapshot } = processShape(`${factorialDefinitions} factorial(50);`, { maxSamplesPerRun: 10 });
    expect(snapshot.runs[0]).toMatchObject({ truncated: true, maxDepth: 50, calls: 50 });
    expect(snapshot.runs[0]?.samples).toHaveLength(10);
  });
});

describe('section 1.2.2: tree recursion', () => {
  it('fib(5) makes 15 calls but is never more than 5 deep', () => {
    expect(runs(fibProgram)).toMatchObject([{ label: 'fib(5)', calls: 15, maxDepth: 5, kind: 'recursive' }]);
  });

  it('the tree-recursive fib(15) makes 1973 calls where fib_iter makes 16', () => {
    expect(runs(fibCompareProgram)).toMatchObject([
      { label: 'fib(5)', calls: 15, maxDepth: 5, kind: 'recursive' },
      { label: 'fib(10)', calls: 177, maxDepth: 10, kind: 'recursive' },
      { label: 'fib(15)', calls: 1973, maxDepth: 15, kind: 'recursive' },
      { label: 'fib_iter(1, 0, 5)', calls: 6, maxDepth: 1, kind: 'iterative' },
      { label: 'fib_iter(1, 0, 10)', calls: 11, maxDepth: 1, kind: 'iterative' },
      { label: 'fib_iter(1, 0, 15)', calls: 16, maxDepth: 1, kind: 'iterative' },
    ]);
    expect(value(fibCompareProgram)).toBe(610);
  });

  it('there are 292 ways to change a dollar', () => {
    expect(value(countChangeProgram, 1_000_000)).toBe(292);
  });
});

describe('section 1.2.3: orders of growth', () => {
  it('factorial grows linearly while fib grows by a factor of about φ⁵ ≈ 11 per step of five', () => {
    expect(calls(growthProgram)).toEqual({
      'factorial(5)': 5,
      'factorial(10)': 10,
      'factorial(15)': 15,
      'factorial(20)': 20,
      'fib(5)': 15,
      'fib(10)': 177,
      'fib(15)': 1973,
      'fib(20)': 21891,
    });
  });

  it('exercise 1.15: sine(12.15) applies p five times', () => {
    const shape = runs(`${sineDefinitions} sine(12.15);`)[0];
    // Each application of p calls cube once: sine is called six times, p and cube five each.
    expect(shape).toMatchObject({ calls: 16, maxDepth: 6 });
  });
});

describe('section 1.2.4: exponentiation', () => {
  it('doubling n adds one call to expt per unit of n, but only three to fast_expt', () => {
    expect(calls(exptGrowthProgram)).toEqual({
      'expt(2, 8)': 9,
      'expt(2, 16)': 17,
      'expt(2, 32)': 33,
      'expt(2, 64)': 65,
      'fast_expt(2, 8)': 12,
      'fast_expt(2, 16)': 15,
      'fast_expt(2, 32)': 18,
      'fast_expt(2, 64)': 21,
    });
    expect(value(fastExptProgram)).toBe(1024);
  });
});

describe('section 1.2.5: greatest common divisors', () => {
  it('gcd(206, 40) is 2, reached by an iterative process in five calls', () => {
    expect(runs(gcdProgram)).toMatchObject([{ calls: 5, maxDepth: 1, kind: 'iterative' }]);
    expect(value(gcdProgram)).toBe(2);
  });

  it('takes five more steps for each Fibonacci pair about 11 times larger', () => {
    expect(Object.values(calls(lameProgram))).toEqual([10, 15, 20, 25]);
  });
});

describe('section 1.2.6: testing for primality', () => {
  it('finds the smallest divisor of 91', () => {
    expect(value(smallestDivisorProgram)).toBe(7);
  });

  it('the divisor search grows like √n and expmod like log n', () => {
    const measured = calls(primalityGrowthProgram);
    const search = [101, 1009, 10007, 100003].map((n) => measured[`smallest_divisor(${n})`] ?? 0);
    const fermat = [
      'expmod(2, 100, 101)',
      'expmod(2, 1008, 1009)',
      'expmod(2, 10006, 10007)',
      'expmod(2, 100002, 100003)',
    ].map((label) => measured[label] ?? 0);
    // Ten times the input: about √10 ≈ 3.2 times the search, and a constant amount more expmod.
    for (let i = 1; i < 4; i++) {
      expect((search[i] ?? 0) / (search[i - 1] ?? 1)).toBeGreaterThan(2.8);
      expect((search[i] ?? 0) / (search[i - 1] ?? 1)).toBeLessThan(3.5);
      expect((fermat[i] ?? 0) - (fermat[i - 1] ?? 0)).toBeLessThan(16);
    }
  });

  it('the Fermat test accepts 1009, rejects 1001 and is fooled by 561', () => {
    const outcome = evaluate(fermatProgram);
    expect(outcome).toMatchObject({ status: 'done', value: true, output: ['true', 'false'] });
  });
});
