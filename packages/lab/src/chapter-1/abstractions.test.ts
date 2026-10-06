import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { processShape } from '../inspect/processShape.ts';
import { createStepTracer } from '../inspect/stepTrace.ts';
import {
  dampedProgram,
  fixedPointProgram,
  halfIntervalProgram,
  oscillatingProgram,
} from './generalMethods.ts';
import { conditionalStatementProgram, lambdaProgram, localNamesProgram } from './lambdas.ts';
import { averageDampProgram, newtonProgram, transformProgram } from './returnedValues.ts';
import { integralProgram, piSumProgram, sumDefinitions, sumProgram } from './sums.ts';

const value = (source: string): unknown => {
  const outcome = evaluate(source);
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return outcome.value;
};

describe('section 1.3.1: functions as arguments', () => {
  it('one sum serves cubes, integers and π/8', () => {
    expect(value(sumProgram)).toBe(36);
    expect(value(`${sumProgram} sum_cubes(1, 10);`)).toBe(3025);
    expect(value(`${sumProgram} sum_integers(1, 10);`)).toBe(55);
    expect(value(piSumProgram)).toBeCloseTo(3.139592655589783, 12);
  });

  it('the midpoint rule integrates cube from 0 to 1 to within dx²', () => {
    expect(value(integralProgram)).toBeCloseTo(0.2496875, 12);
    expect(value(integralProgram.replace('0.05);', '0.01);'))).toBeCloseTo(0.2499875, 9);
  });

  it('sum is a recursive process, one pending addition per term', () => {
    expect(processShape(`${sumDefinitions} sum(x => x, 1, x => x + 1, 10);`).snapshot.runs[0]).toMatchObject({
      kind: 'recursive',
      maxDepth: 11,
    });
  });
});

describe('section 1.3.2: lambda expressions and local names', () => {
  it('applies a lambda expression without naming it', () => {
    expect(evaluate(lambdaProgram)).toMatchObject({ status: 'done', value: 12, output: ['7'] });
  });

  it('gives local constants a frame of their own inside the call', () => {
    const tracer = createStepTracer(localNamesProgram);
    expect(evaluate(localNamesProgram, { hooks: [tracer.hooks] })).toMatchObject({ value: 78 });
    const declared = tracer.records.flatMap((r) => (r.event.kind === 'define' ? [`${r.event.symbol} in ${r.env}`] : []));
    // E1 is the call frame of f(2, 3); E2 is the block frame that holds a and b.
    expect(declared).toContain('a in E2');
    expect(declared).toContain('b in E2');
  });

  it('runs expmod written with conditional statements', () => {
    expect(value(conditionalStatementProgram)).toBe(3);
  });
});

describe('section 1.3.3: functions as general methods', () => {
  it('finds π between 2 and 4 as a root of sin', () => {
    expect(value(halfIntervalProgram)).toBe(3.14111328125);
    expect(value(halfIntervalProgram.replace('math_sin, 2, 4', 'x => x * x * x - 2 * x - 3, 1, 2'))).toBe(1.89306640625);
  });

  it('finds the fixed point of cosine', () => {
    expect(value(fixedPointProgram)).toBeCloseTo(0.7390822985224023, 12);
  });

  it('does not converge on √2 without damping, and does with it', () => {
    expect(evaluate(oscillatingProgram, { budget: 20_000 }).status).toBe('budget-exhausted');
    expect(value(dampedProgram)).toBeCloseTo(Math.SQRT2, 9);
  });
});

describe('section 1.3.4: functions as returned values', () => {
  it('average_damp returns a function', () => {
    expect(value(averageDampProgram)).toBe(55);
  });

  it("differentiates numerically and finds √2 by Newton's method", () => {
    expect(evaluate(newtonProgram)).toMatchObject({ status: 'done', output: ['75.00014999664018'] });
    expect(value(newtonProgram)).toBeCloseTo(Math.SQRT2, 9);
  });

  it('expresses both square roots as fixed points of a transformed function', () => {
    const outcome = evaluate(transformProgram);
    expect(outcome.status).toBe('done');
    if (outcome.status !== 'done') return;
    expect(Number(outcome.output[0])).toBeCloseTo(Math.SQRT2, 9);
    expect(outcome.value).toBeCloseTo(Math.SQRT2, 9);
  });
});
