import { evaluate, factorialProgram, fastExptProgram, gcdProgram, smallestDivisorProgram, sumProgram } from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { print, substitution, tokens } from '../src/anim/model/substitution.ts';

const compound = `function square(x) { return x * x; }
function sum_of_squares(x, y) { return square(x) + square(y); }
function f(a) { return sum_of_squares(a + 1, a * 2); }
f(5);`;

const orderTest = `function p() { return p(); }
function test(x, y) { return x === 0 ? 0 : y; }
test(0, p());`;

const finalValue = (source: string, order: 'applicative' | 'normal' = 'applicative'): string | null => {
  const result = substitution(source, { order });
  const last = result.statements.at(-1)?.steps.at(-1);
  return last === undefined ? null : print(last.term);
};

const machineValue = (source: string): string => {
  const outcome = evaluate(source);
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return String(outcome.value);
};

describe('the substitution model', () => {
  it('agrees with the evaluator on the value of every program in §1.1 and §1.2.1', () => {
    for (const source of [
      compound,
      factorialProgram,
      '137 + 349; 1000 - 334; 5 * 99; 2.7 + 10; (3 * 5) + (10 - 6);',
      '3 * (2 * 4 + (3 + 5)) + (10 - 7 + 6);',
      'const pi = 3.14159; const radius = 10; const c = 2 * pi * radius; c;',
      'function abs(x) { return x >= 0 ? x : -x; } abs(-12);',
      'function is_between(x, low, high) { return x >= low && x <= high; } is_between(5, 1, 10);',
    ]) {
      expect(finalValue(source), source).toBe(machineValue(source));
      expect(finalValue(source, 'normal'), source).toBe(machineValue(source));
    }
  });

  it('agrees with the evaluator on the programs it animates in §1.2 and §1.3', () => {
    // Only applicative order: in normal order `square` copies its unevaluated
    // argument, and fast_expt's rewriting grows past the step limit.
    for (const source of [gcdProgram, fastExptProgram, smallestDivisorProgram, sumProgram]) {
      expect(finalValue(source), source).toBe(machineValue(source));
    }
    expect(finalValue(gcdProgram, 'normal')).toBe('2');
  });

  it('rewrites f(5) the way §1.1.5 does, in applicative order', () => {
    const [statement] = substitution(compound).statements;
    expect(statement?.steps.map((step) => print(step.term))).toEqual([
      'f(5)',
      'sum_of_squares(5 + 1, 5 * 2)',
      'sum_of_squares(6, 5 * 2)',
      'sum_of_squares(6, 10)',
      'square(6) + square(10)',
      '6 * 6 + square(10)',
      '36 + square(10)',
      '36 + 10 * 10',
      '36 + 100',
      '136',
    ]);
    expect(statement?.steps[1]?.caption).toBe('Apply `f`: replace `a` by `5` in its return expression, giving `sum_of_squares(5 + 1, 5 * 2)`.');
    expect(statement?.steps.at(-1)?.rule).toBe('done');
  });

  it('computes 5 + 1 twice in normal order', () => {
    const [statement] = substitution(compound, { order: 'normal' }).statements;
    const texts = statement?.steps.map((step) => print(step.term)) ?? [];
    expect(texts).toContain('(5 + 1) * (5 + 1) + square(5 * 2)');
    expect(texts.filter((text) => text.includes('5 + 1')).length).toBeGreaterThan(texts.indexOf('(5 + 1) * (5 + 1) + square(5 * 2)'));
    expect(texts.at(-1)).toBe('136');
  });

  it('never finishes test(0, p()) in applicative order but answers 0 in normal order', () => {
    const applicative = substitution(orderTest, { maxSteps: 10 }).statements[0];
    expect(applicative?.truncated).toBe(true);
    expect(applicative?.steps).toHaveLength(11);
    expect(applicative?.steps.every((step) => print(step.term) === 'test(0, p())')).toBe(true);
    const normal = substitution(orderTest, { order: 'normal' }).statements[0];
    expect(normal?.truncated).toBe(false);
    expect(normal?.steps.map((step) => print(step.term))).toEqual(['test(0, p())', '0 === 0 ? 0 : p()', 'true ? 0 : p()', '0']);
    expect(normal?.steps.at(-1)?.caption).toContain('drop `p()`, which is never evaluated');
  });

  it('shows the chain of deferred multiplications for factorial and none for fact_iter', () => {
    const [recursive, iterative] = substitution(factorialProgram, { maxSteps: 200 }).statements;
    const widest = (steps: { term: Parameters<typeof print>[0] }[]) => Math.max(...steps.map((s) => print(s.term).length));
    expect(recursive?.steps.map((s) => print(s.term))).toContain('6 * (5 * (4 * (3 * (2 * 1))))');
    expect(iterative?.steps.map((s) => print(s.term))).toContain('fact_iter(120, 6, 6)');
    expect(widest(iterative?.steps ?? [])).toBeLessThan(widest(recursive?.steps ?? []));
  });

  it('binds constants and reports lookups', () => {
    const result = substitution('const size = 2; 5 * size;');
    expect(result.statements.map((s) => s.label)).toEqual(['const size = …', '5 * size']);
    expect(result.statements[0]?.steps[0]?.caption).toBe('The declaration binds `size` to 2.');
    expect(result.statements[1]?.steps.map((s) => s.caption)).toEqual([
      'Evaluate `5 * size`.',
      '`size` names 2: look it up in the environment.',
      'Apply the primitive `*` to 5 and 2: `5 * 2` → 10. Nothing is left to rewrite: the value is 10.',
    ]);
  });

  it('prints with the fewest parentheses that keep the structure', () => {
    const texts = (source: string) => substitution(source).statements[0]?.steps.map((s) => print(s.term)) ?? [];
    expect(texts('1 - (2 - 3);')).toEqual(['1 - (2 - 3)', '1 - (-1)', '2']);
    expect(texts('-(3 - 5) * 2;')).toEqual(['-(3 - 5) * 2', '-(-2) * 2', '2 * 2', '4']);
    expect(texts('6 / 2 / 3;')[0]).toBe('6 / 2 / 3');
  });

  it('keeps token identity for text that survives a rewrite', () => {
    const steps = substitution('1 + 2 * 3;').statements[0]?.steps ?? [];
    const before = tokens(steps[0]!.term).map((t) => t.key);
    const after = tokens(steps[1]!.term).map((t) => t.key);
    // `1`, ` + ` survive; `2 * 3` becomes a fresh literal.
    expect(after.filter((key) => before.includes(key))).toHaveLength(2);
    expect(print(steps[1]!.term)).toBe('1 + 6');
  });

  it('stops at a parse error, an unknown name, or a body the model does not describe', () => {
    expect(substitution('1 +;').error).toMatch(/expected/i);
    expect(substitution('x;').statements[0]?.stuck).toBe('Name x not declared');
    const opaque = substitution('function f(x) { display(x); return x; } f(1);').statements[0];
    expect(opaque?.steps.at(-1)?.caption).toContain('more than a single return');
  });

  it('records what display prints', () => {
    const [statement] = substitution('display(5 * 2);').statements;
    expect(statement?.steps.at(-1)?.output).toEqual(['10']);
    expect(statement?.steps.at(-1)?.caption).toContain('It prints 10');
  });

  it('passes functions by name, as §1.3.1 does', () => {
    const [statement] = substitution(sumProgram).statements;
    expect(statement?.steps.slice(0, 5).map((step) => print(step.term))).toEqual([
      'sum_cubes(1, 3)',
      'sum(cube, 1, inc, 3)',
      '1 > 3 ? 0 : cube(1) + sum(cube, inc(1), inc, 3)',
      'false ? 0 : cube(1) + sum(cube, inc(1), inc, 3)',
      'cube(1) + sum(cube, inc(1), inc, 3)',
    ]);
    expect(statement?.steps.at(-1)?.rule).toBe('done');
  });

  it('counts the 18 remainders of normal-order gcd that Exercise 1.20 asks for', () => {
    const remainders = (order: 'normal' | 'applicative'): number =>
      (substitution(gcdProgram, { order }).statements[0]?.steps ?? []).filter((step) => step.caption.includes('primitive `%`')).length;
    expect(remainders('normal')).toBe(18);
    expect(remainders('applicative')).toBe(4);
  });
});
