import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import {
  functionalPairProgram,
  intervalProgram,
  intervalRepresentationDefinitions,
  pairGlueProgram,
  parallelResistorsProgram,
  ratAccessReductionProgram,
  ratLayersProgram,
  ratLowestTermsProgram,
  ratOnFunctionalPairsProgram,
  ratProgram,
} from './dataAbstraction.ts';

const done = (source: string, prelude?: string) => {
  const outcome = evaluate(source, prelude === undefined ? {} : { prelude });
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return outcome;
};

describe('section 2.1.1: rational numbers', () => {
  it('glues values into pairs and pairs into pairs', () => {
    expect(done(pairGlueProgram)).toMatchObject({ text: '3', output: ['1', '2', '1'] });
  });

  it('adds and multiplies rationals, without reducing them', () => {
    expect(done(ratProgram)).toMatchObject({ text: '[6, 9]', output: ['"5 / 6"', '"1 / 6"'] });
  });

  it('reduces to lowest terms once make_rat uses gcd, and nothing else changes', () => {
    expect(done(ratLowestTermsProgram)).toMatchObject({ text: '[2, 3]', output: ['"5 / 6"', '"1 / 6"'] });
  });

  it('gets the sign wrong with a negative argument, the bug of Exercise 2.1', () => {
    expect(done(`${ratLowestTermsProgram} gcd(-3, 6);`).value).toBe(-3);
    expect(done(`${ratLowestTermsProgram} make_rat(-3, 6);`).text).toBe('[1, -2]');
  });
});

describe('section 2.1.2: abstraction barriers', () => {
  it('reduces at selection time instead: stored as 6 / 9, printed as 2 / 3', () => {
    expect(done(ratAccessReductionProgram)).toMatchObject({ text: '[6, 9]', output: ['"2 / 3"', 'true'] });
  });

  it('runs the program the layers diagram is drawn from', () => {
    expect(done(ratLayersProgram).value).toBe(true);
  });
});

describe('section 2.1.3: what is meant by data', () => {
  it('builds pairs from functions alone', () => {
    expect(done(functionalPairProgram)).toMatchObject({ value: 2, output: ['1'] });
  });

  it('keeps x and y in the frame of pair(1, 2), which dispatch remembers', () => {
    const { value } = done(`${functionalPairProgram.replace(/display[^]*$/, '')}x;`);
    if (typeof value !== 'object' || value === null || Array.isArray(value) || value.tag !== 'closure') {
      throw new Error('pair(1, 2) is not a function');
    }
    // dispatch was declared in the body block of the call, which extends the call's frame.
    const call = value.env.parent!.frame;
    expect(call.label).toBe('pair(1, 2)');
    expect(call.bindings.get('x')?.value).toBe(1);
    expect(call.bindings.get('y')?.value).toBe(2);
  });

  it('runs the rational package unchanged on functional pairs', () => {
    expect(done(ratOnFunctionalPairsProgram).output).toEqual(['"5 / 6"']);
  });
});

describe('section 2.1.4: interval arithmetic', () => {
  it('finds the parallel resistance between about 2.58 and 2.97 ohms', () => {
    const outcome = done(intervalProgram, intervalRepresentationDefinitions);
    expect(outcome.output).toEqual(['[2.581558809636278, 2.97332259363673]']);
    expect(outcome.text).toBe('[27.3258, 36.9138]');
  });

  it('gives two answers for two algebraically equal formulas', () => {
    const outcome = done(parallelResistorsProgram, intervalRepresentationDefinitions);
    const [width1, width2] = outcome.output.map(Number);
    expect(width1).toBeCloseTo(0.6432, 4);
    expect(width2).toBeCloseTo(0.1959, 4);
    // par1 is more than three times as uncertain as par2.
    expect(width1! / width2!).toBeGreaterThan(3);
    const bounds = (name: string) => {
      const [lower, upper] = done(`${parallelResistorsProgram} ${name};`, intervalRepresentationDefinitions).value as [number, number];
      return [lower, upper];
    };
    expect(bounds('by_par1')[0]).toBeCloseTo(2.2, 2);
    expect(bounds('by_par1')[1]).toBeCloseTo(3.49, 2);
    expect(bounds('by_par2')).toEqual([2.581558809636278, 2.97332259363673]);
  });
});
