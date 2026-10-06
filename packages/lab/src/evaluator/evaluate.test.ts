import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.ts';

const value = (source: string): unknown => {
  const outcome = evaluate(source);
  if (outcome.status !== 'done') throw new Error(`${outcome.status}: ${JSON.stringify(outcome)}`);
  return outcome.value;
};

const errorOf = (source: string): string => {
  const outcome = evaluate(source);
  if (outcome.status !== 'error') throw new Error(`expected an error, got ${outcome.status}`);
  return outcome.error.message;
};

describe('evaluate', () => {
  it('evaluates operator combinations', () => {
    expect(value('(3 + 5) * (10 - 6) / 2;')).toBe(16);
    expect(value('"abc" + "def";')).toBe('abcdef');
    expect(value('!(1 < 2) || 2 >= 2;')).toBe(true);
  });

  it('gives a program the value of its last non-declaration statement', () => {
    expect(value('const size = 2; 5 * size;')).toBe(10);
    expect(value('1; const x = 2;')).toBe(1);
    expect(value('const x = 2;')).toBe(undefined);
  });

  it('applies compound functions, including lambdas and local declarations', () => {
    expect(value('function square(x) { return x * x; } square(square(3));')).toBe(81);
    expect(value('const twice = f => x => f(f(x)); twice(x => x + 3)(1);')).toBe(7);
    expect(value('function f(x) { const y = x + 1; return y * 2; } f(4);')).toBe(10);
  });

  it('returns undefined from a body that falls off its end', () => {
    expect(value('function f() { 1; } f();')).toBe(undefined);
  });

  it('supports conditional statements and early return', () => {
    const abs = 'function abs(x) { if (x >= 0) { return x; } else { return -x; } }';
    expect(value(`${abs} abs(-5);`)).toBe(5);
    expect(value(`${abs} abs(5);`)).toBe(5);
  });

  it('keeps assignment to let variables and rejects assignment to constants', () => {
    expect(value('let total = 1; total = total + 4; total;')).toBe(5);
    expect(errorOf('const k = 1; k = 2;')).toBe('Line 1: Cannot assign to constant k');
  });

  it('closes over the defining environment', () => {
    const source = `
      function make_withdraw(balance) {
        return amount => {
          balance = balance - amount;
          return balance;
        };
      }
      const W1 = make_withdraw(100);
      W1(50);
      W1(20);`;
    expect(value(source)).toBe(30);
  });

  it('runs a tail-recursive loop in constant stack space', () => {
    const outcome = evaluate('function loop(n) { return n === 0 ? "done" : loop(n - 1); } loop(20000);', {
      budget: 1_000_000,
    });
    expect(outcome).toMatchObject({ status: 'done', value: 'done' });
  });

  it('reports runtime errors with their line', () => {
    expect(errorOf('const x = 1;\ny;')).toBe('Line 2: Name y not declared');
    expect(errorOf('x; const x = 1;')).toBe('Line 1: Name x used before its declaration was evaluated');
    expect(errorOf('1 + "a";')).toBe('Line 1: + expects two numbers or two strings, got number and string');
    expect(errorOf('1 ? 2 : 3;')).toBe('Line 1: Expected a boolean as the test, got number');
    expect(errorOf('const f = 3; f(1);')).toBe('Line 1: Cannot apply 3: it is not a function');
    expect(errorOf('function f(a) { return a; }\nf(1, 2);')).toBe('Line 2: f expects 1 argument(s), got 2');
    expect(errorOf('\n\nerror("boom", 42);')).toBe('Line 3: boom 42');
  });

  it('reports syntax errors as outcomes rather than throwing', () => {
    const outcome = evaluate('const = 3;');
    expect(outcome).toMatchObject({ status: 'error', steps: 0, error: { phase: 'parse' } });
  });

  it('stops when the step budget is exhausted', () => {
    const outcome = evaluate('function forever(n) { return forever(n + 1); } forever(0);', { budget: 500 });
    expect(outcome).toEqual({ status: 'budget-exhausted', steps: 500, budget: 500, output: [] });
  });

  it('collects display output and builds lists from pairs', () => {
    const outcome = evaluate('display(list(1, 2)); display("hi"); tail(pair(1, 2));');
    expect(outcome).toMatchObject({ status: 'done', value: 2, output: ['[1, [2, null]]', '"hi"'] });
  });

  it('evaluates a prelude in a frame the program can see', () => {
    const outcome = evaluate('inc(dec(5));', {
      prelude: 'function inc(x) { return x + 1; } function dec(x) { return x - 1; }',
    });
    expect(outcome).toMatchObject({ status: 'done', value: 5 });
  });
});
