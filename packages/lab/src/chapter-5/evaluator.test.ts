import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { listToArray } from '../evaluator/values.ts';
import { parseComponent, unparse } from '../machines/components.ts';
import { instructionText } from '../machines/controller.ts';
import { compileProgram, runCompiled } from './compiler.ts';
import { ecevalControllerSource, ecevalControllerWithout, runEceval } from './eceval.ts';

const recursiveFactorial = `function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}`;

const iterativeFactorial = `function factorial(n) {
    function iter(product, counter) {
        return counter > n
               ? product
               : iter(counter * product,
                      counter + 1);
    }
    return iter(1, 1);
}`;

const fib = `function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}`;

const ns = [1, 2, 3, 4, 5, 6, 10];
const stats = (definition: string, call: string) =>
  runEceval([definition, ...ns.map((n) => `${call}(${n});`)]).results.slice(1);

describe('section 4.1.2: programs as tagged lists', () => {
  it('parses as the book shows', () => {
    const text = (source: string) => evaluate(`parse(${JSON.stringify(source)});`);
    expect(text('const size = 2; 5 * size;')).toMatchObject({
      text: '["sequence", [[["constant_declaration", [["name", ["size", null]], [["literal", [2, null]], null]]], [["binary_operator_combination", ["*", [["literal", [5, null]], [["name", ["size", null]], null]]]], null]], null]]',
    });
    expect(text('1;')).toMatchObject({ text: '["literal", [1, null]]' });
  });

  it('represents a block by its statements unless it declares names', () => {
    expect(unparse(parseComponent('function f(x) { return x; }'))).toBe('function f(x) { return x; }');
    expect(unparse(parseComponent('x => { const y = x; return y; };'))).toBe('x => { { const y = x; return y; } }');
    expect(unparse(parseComponent('a * (b + c) - -d;'))).toBe('a * (b + c) - -d');
  });
});

describe('section 5.4: the explicit-control evaluator', () => {
  it('evaluates declarations, blocks, assignments and conditionals', () => {
    const { results } = runEceval([
      'const x = 1; x + 2;',
      '{ let y = 2; y = y + 1; y; }',
      'function abs(x) { if (x < 0) { return -x; } else { return x; } } abs(-4);',
      '(x => x * x)(7);',
      'math_abs(-2) + 1;',
      'x && true;',
    ]);
    expect(results.map((r) => r.value)).toEqual(['3', '3', '4', '49', '3', '"unknown syntax"']);
    expect(results[5]?.error).toBe(true);
  });

  it('measures recursive factorial: 32n − 15 pushes, depth 5n + 3', () => {
    for (const [i, result] of stats(recursiveFactorial, 'factorial').entries()) {
      const n = ns[i] ?? 0;
      expect(result).toMatchObject({ totalPushes: 32 * n - 15, maximumDepth: 5 * n + 3 });
    }
  });

  it('is tail-recursive: iterative factorial runs in depth 10 with 35n + 32 pushes', () => {
    for (const [i, result] of stats(iterativeFactorial, 'factorial').entries()) {
      const n = ns[i] ?? 0;
      expect(result).toMatchObject({ totalPushes: 35 * n + 32, maximumDepth: 10 });
    }
  });

  it('measures tree-recursive fib: depth 5n + 3, pushes 56 Fib(n + 1) − 39', () => {
    const fibs = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    for (const [i, result] of stats(fib, 'fib').entries()) {
      const n = ns[i] ?? 0;
      expect(result.value).toBe(String(fibs[n]));
      if (n >= 2) expect(result.maximumDepth).toBe(5 * n + 3);
      expect(result.totalPushes).toBe(56 * (fibs[n + 1] ?? 0) - 39);
    }
  });
});

describe('replacing blocks of the evaluator', () => {
  it('rebuilds the same controller, or one with a block of the reader’s', () => {
    const nonTail = `const fragment = list(
      "ev_return",
        assign("comp", list(op("return_expression"), reg("comp"))),
        assign("continue", label("ev_restore_stack")),
        go_to(label("eval_dispatch")),
      "ev_restore_stack",
        revert_stack_to_marker(),
        restore("continue"),
        go_to(reg("continue")));
const eceval_controller = eceval_controller_with(fragment);`;
    const depths = (controller: string) =>
      runEceval([iterativeFactorial, 'factorial(3);', 'factorial(8);'], { controller }).results.slice(1).map((r) => r.maximumDepth);
    const same = `${ecevalControllerWithout([])}\nconst eceval_controller = eceval_controller_with(null);`;
    expect(depths(same)).toEqual(depths(ecevalControllerSource));
    const [small, large] = depths(`${ecevalControllerWithout(['ev_return'])}\n${nonTail}`);
    expect(large).toBeGreaterThan(small ?? 0);
  });
});

describe('section 5.5: the compiler', () => {
  it('compiles the factorial declaration of §5.5.5 into the book’s code', () => {
    const code = (listToArray(compileProgram(recursiveFactorial)) ?? []).map(instructionText);
    expect(code[0]).toBe('assign("val", list(op("make_compiled_function"), label("entry1"), reg("env")))');
    expect(code).toContain('"primitive_branch6"');
    expect(code.at(-1)).toBe('assign("val", constant(undefined))');
    expect(code).toHaveLength(89);
  });

  it('runs compiled factorial with the book’s figures: 36 pushes, depth 14 for 5!', () => {
    const { results, failure } = runCompiled(recursiveFactorial, ['factorial(5);', 'factorial(10);']);
    expect(failure).toBeNull();
    expect(results.map((r) => [r.value, r.totalPushes, r.maximumDepth])).toEqual([
      ['undefined', 0, 0],
      ['120', 36, 14],
      ['3628800', 71, 29],
    ]);
  });

  it('lets interpreted code call compiled functions, but not yet the reverse (exercise 5.50)', () => {
    const forward = runCompiled(`function twice(f, x) { return f(f(x)); }`, ['twice(math_abs, -5);', 'twice(x => x, 3);']);
    expect(forward.results.map((r) => r.value)).toEqual(['undefined', '5']);
    expect(forward.failure).toMatch(/go_to\(reg\("val"\)\) needs a label/);
  });
});
