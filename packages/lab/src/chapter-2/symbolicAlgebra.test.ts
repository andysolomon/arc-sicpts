import { describe, expect, it } from 'vitest';
import { evaluate, type Outcome } from '../evaluator/evaluate.ts';
import {
  nestedCoefficientsProgram,
  polynomialDefinitions,
  polynomialProgram,
  symbolicArithmeticDefinitions,
  termListsProgram,
  twoVariablesProgram,
} from './symbolicAlgebra.ts';

const run = (source: string, prelude?: string): Outcome =>
  evaluate(source, { budget: 1_000_000, ...(prelude !== undefined && { prelude }) });

const text = (source: string, prelude?: string): string => {
  const outcome = run(source, prelude);
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return outcome.text;
};

const notation = (expr: string, prelude: string): string => text(`list_to_string(${expr});`, prelude);

describe('section 2.5.3: the generic system it stands on', () => {
  it('dispatches on type tags, with numbers untagged', () => {
    expect(text('add(3, 4) + mul(2, 5);', symbolicArithmeticDefinitions)).toBe('17');
    expect(text('add(make_rational(1, 2), make_rational(1, 3));', symbolicArithmeticDefinitions)).toBe('["rational", [5, 6]]');
    expect(text('is_equal_to_zero(sub(5, 5));', symbolicArithmeticDefinitions)).toBe('true');
  });

  it('lets a later put hide an earlier one', () => {
    expect(text('put("add", list("javascript_number", "javascript_number"), (x, y) => x * y); add(3, 4);', symbolicArithmeticDefinitions)).toBe('12');
  });
});

describe('section 2.5.3: arithmetic on polynomials', () => {
  it('adds and multiplies 5x² + 3x + 7 and x² − 3x', () => {
    const program = `${polynomialProgram} list_to_string(sum) + " " + list_to_string(mul(p, q));`;
    expect(text(program, symbolicArithmeticDefinitions)).toBe(
      '"list(\\"polynomial\\", \\"x\\", list(2, 6), list(0, 7)) list(\\"polynomial\\", \\"x\\", list(4, 5), list(3, -12), list(2, -2), list(1, -21))"',
    );
  });

  it('drops the x term of the sum, whose coefficient is zero', () => {
    expect(text(`${polynomialProgram} length(term_list(contents(sum)));`, symbolicArithmeticDefinitions)).toBe('2');
  });

  it('multiplies polynomials whose coefficients are polynomials in y', () => {
    const outcome = run(nestedCoefficientsProgram, polynomialDefinitions);
    expect(outcome).toMatchObject({ status: 'done', output: ['list(3, list("polynomial", "y", list(2, 1), list(1, -1), list(0, -2)))'] });
    const coefficients = text(
      `${nestedCoefficientsProgram} list_to_string(map(t => list_to_string(coeff(t)), term_list(contents(product))));`,
      polynomialDefinitions,
    );
    // (y² − y − 2)x³ + (y⁴ + 2y³ − 2y² + 8y + 5)x² + (y⁵ + y³ + 8y² − 3y + 9)x + (y⁴ − y³ + 7y − 7)
    expect(coefficients).toContain('list(4, 1), list(3, 2), list(2, -2), list(1, 8), list(0, 5)');
    expect(coefficients).toContain('list(5, 1), list(3, 1), list(2, 8), list(1, -3), list(0, 9)');
    expect(coefficients).toContain('list(4, 1), list(3, -1), list(1, 7), list(0, -7)');
  });

  it('fits the nested product within the budget the pairs scene traces', () => {
    expect(run(nestedCoefficientsProgram, polynomialDefinitions).steps).toBeLessThan(200_000);
  });

  it('cannot adjoin a polynomial coefficient without a zero test for polynomials', () => {
    const withoutZeroTest = nestedCoefficientsProgram.replace(/put\("is_equal_to_zero"[^;]*;/, '');
    const outcome = run(withoutZeroTest, polynomialDefinitions);
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.error.message).toContain('is_equal_to_zero');
  });
});

describe('section 2.5.3: representing term lists', () => {
  it('stores B in 3 terms sparse and 101 coefficients dense', () => {
    expect(run(termListsProgram)).toMatchObject({ status: 'done', value: 101, output: ['3'] });
    expect(notation('A_sparse', termListsProgram.replace(/display[^]*$/, ''))).toBe(
      '"list(list(5, 1), list(4, 2), list(2, 3), list(1, -2), list(0, -5))"',
    );
    expect(text(`${termListsProgram} list_ref(B_dense, 98);`)).toBe('2');
  });
});

describe('section 2.5.3: hierarchies of types', () => {
  it('writes one polynomial two ways that are not equal, and cannot add them', () => {
    const outcome = run(twoVariablesProgram, polynomialDefinitions);
    expect(outcome.output).toEqual(['false']);
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.error.message).toContain('polys not in same var -- add_poly');
  });
});
