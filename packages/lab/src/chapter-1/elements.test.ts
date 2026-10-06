import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { createStepTracer } from '../inspect/stepTrace.ts';

const value = (source: string): unknown => {
  const outcome = evaluate(source);
  if (outcome.status !== 'done') throw new Error(JSON.stringify(outcome));
  return outcome.value;
};

const sqrt = `
function abs(x) { return x >= 0 ? x : -x; }
function square(x) { return x * x; }
function average(x, y) { return (x + y) / 2; }
function is_good_enough(guess, x) { return abs(square(guess) - x) < 0.001; }
function improve(guess, x) { return average(guess, x / guess); }
function sqrt_iter(guess, x) {
  return is_good_enough(guess, x) ? guess : sqrt_iter(improve(guess, x), x);
}
function sqrt(x) { return sqrt_iter(1, x); }
`;

describe('section 1.1: the elements of programming', () => {
  it('1.1.2 names refer to values in the environment', () => {
    expect(value('const pi = 3.14159; const radius = 10; pi * radius * radius;')).toBeCloseTo(314.159);
  });

  it('1.1.4 compound functions are used exactly like primitive ones', () => {
    const source = `
      function square(x) { return x * x; }
      function sum_of_squares(x, y) { return square(x) + square(y); }
      function f(a) { return sum_of_squares(a + 1, a * 2); }
      f(5);`;
    expect(value(source)).toBe(136);
  });

  it('1.1.5 arguments are evaluated before the function is applied', () => {
    const source = 'const square = x => x * x;\nsquare(2 + 3);';
    const tracer = createStepTracer(source);
    evaluate(source, { hooks: [tracer.hooks] });
    const texts = tracer.records.map((r) => r.text);
    const operand = texts.indexOf('2 + 3 → 5');
    const apply = texts.indexOf('apply fn[E0] → extend E0 with {x: 5} = E1');
    expect(operand).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(operand);
    expect(texts.at(-1)).toBe('square(2 + 3) → 25');
  });

  it('1.1.6 conditionals evaluate only the branch they choose', () => {
    expect(value('function p() { return p(); } true ? 1 : p();')).toBe(1);
    expect(value('false && error("not evaluated");')).toBe(false);
  });

  it("1.1.7 Newton's method converges on the square root", () => {
    expect(value(`${sqrt} sqrt(9);`)).toBeCloseTo(3, 3);
    expect(value(`${sqrt} sqrt(2);`)).toBeCloseTo(Math.SQRT2, 3);
  });

  it('1.1.8 internal declarations can use the enclosing parameters', () => {
    const source = `
      function sqrt(x) {
        function is_good_enough(guess) { return math_abs(guess * guess - x) < 0.001; }
        function improve(guess) { return (guess + x / guess) / 2; }
        function sqrt_iter(guess) {
          return is_good_enough(guess) ? guess : sqrt_iter(improve(guess));
        }
        return sqrt_iter(1);
      }
      sqrt(144);`;
    expect(value(source)).toBeCloseTo(12, 3);
  });
});
