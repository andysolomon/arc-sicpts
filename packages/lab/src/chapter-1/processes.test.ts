import { describe, expect, it } from 'vitest';
import { maxDepth, processShape } from '../inspect/processShape.ts';
import { factorialDefinitions, factorialProgram } from './factorial.ts';

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
