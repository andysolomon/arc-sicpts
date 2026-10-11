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

  it('offers random numbers and a clock for §1.2.6', () => {
    const r = value('math_random();');
    expect(typeof r === 'number' && r >= 0 && r < 1).toBe(true);
    expect(value('const start = get_time(); get_time() - start >= 0;')).toBe(true);
  });

  it('evaluates a prelude in a frame the program can see', () => {
    const outcome = evaluate('inc(dec(5));', {
      prelude: 'function inc(x) { return x + 1; } function dec(x) { return x - 1; }',
    });
    expect(outcome).toMatchObject({ status: 'done', value: 5 });
  });

  it('runs typed programs exactly as the same programs without types', () => {
    expect(value('const square = (x: number): number => x * x;\nsquare(square(3));')).toBe(81);
    expect(value('type Op = (x: number) => number;\nconst twice = (f: Op): Op => (x: number): number => f(f(x));\ntwice(x => x + 3)(1);')).toBe(7);
  });

  it('collects rest parameters into a list and spreads lists into arguments', () => {
    expect(value('const f = (a: number, ...rest: List<number>): number => a + length(rest);\nf(10, 1, 2, 3);')).toBe(13);
    expect(value('const f = (...rest: List<number>): List<number> => rest;\nf();')).toBe(null);
    expect(value('const xs = list(3, 1, 2);\nmath_max(...xs) + math_min(...xs);')).toBe(4);
    expect(value('const xs = list(2, 3);\nlist_to_string(list(1, ...xs, 4));')).toBe('list(1, 2, 3, 4)');
    expect(errorOf('const f = (a: number, ...rest: List<number>): number => a;\nf();')).toContain('f expects at least 1 argument(s), got 0');
    expect(errorOf('math_max(...5);')).toContain('... expects a list to spread into arguments, got number');
  });

  it('coalesces only null and undefined, leaving the right operand unevaluated otherwise', () => {
    expect(value('list_to_string(list(null ?? 1, undefined ?? 2, 0 ?? 3, false ?? 4, "" ?? 5));')).toBe('list(1, 2, 0, false, "")');
    expect(value('let n = 0;\n1 ?? (n = 1);\nn;')).toBe(0);
  });

  it('skips an optional call, and the rest of its chain, when the function is null or undefined', () => {
    expect(value('const f = null;\nf?.(1);')).toBe(undefined);
    expect(value('const f = undefined;\nf?.(1)(2)(3);')).toBe(undefined);
    expect(value('let n = 0;\nconst f = null;\nf?.(n = 1);\nn;')).toBe(0);
    expect(value('const f = (x: number): number => x + 1;\nf?.(1);')).toBe(2);
    expect(errorOf('const f = null;\n(f?.(1))(2);')).toContain('Cannot apply undefined');
  });

  it('runs an async function up to its first await and resumes it once the stack is empty', () => {
    const outcome = evaluate(`const task = async (name: string): Promise<string> => {
  display(name, "start");
  await null;
  display(name, "end");
  return name;
};
const a = task("a");
const b = task("b");
display("main", "sync");
await a;
await b;`);
    expect(outcome).toMatchObject({ status: 'done', value: 'b' });
    expect(outcome.output).toEqual(['start "a"', 'start "b"', 'sync "main"', 'end "a"', 'end "b"']);
  });

  it('interleaves async functions only where they await', () => {
    const lostUpdate = `let balance = 100;
const withdraw = async (amount: number): Promise<undefined> => {
  const current = balance;
  await null;
  balance = current - amount;
};
const peter = withdraw(10);
const paul = withdraw(20);
await peter;
await paul;
balance;`;
    expect(value(lostUpdate)).toBe(80);
    expect(value(lostUpdate.replace('  const current = balance;\n  await null;\n', '  await null;\n  const current = balance;\n'))).toBe(70);
  });

  it('fulfils a promise with the value of a promise its function returns', () => {
    expect(value('const a = async (): Promise<number> => 1;\nconst b = async (): Promise<number> => a();\nawait b();')).toBe(1);
    expect(value('const a = async (): Promise<number> => 1;\nstringify(a());')).toBe('promise[1]');
    expect(value('const loop = async (n: number): Promise<number> => n === 0 ? 0 : loop(n - 1);\nawait loop(5000);')).toBe(0);
  });

  it('reports a program that waits for a promise nothing will fulfil', () => {
    expect(errorOf(`let q = null;
const f = async (): Promise<number> => {
  await null;
  await q;
  return 1;
};
q = f();
await q;`)).toBe('Line 8: The program is waiting for a promise that is never fulfilled');
  });

  it('gives parse the stripped program, and refuses syntax the tagged lists of §4.1.2 cannot express', () => {
    expect(value('equal(parse("const f = (x: number): number => x;"), parse("const f = x => x;"));')).toBe(true);
    expect(errorOf('parse("a ?? b;");')).toContain('nullish coalescing (??) has no tagged-list representation');
    expect(errorOf('parse("f(...xs);");')).toContain('a spread argument (...) has no tagged-list representation');
    expect(errorOf('parse("async () => 1;");')).toContain('an async function has no tagged-list representation');
  });
});
