import { describe, expect, it } from 'vitest';
import { evaluate, type Outcome } from '../evaluator/evaluate.ts';
import { stringify } from '../evaluator/values.ts';
import { createCallLogTracer } from '../inspect/callLog.ts';
import { analyzingPrelude } from './analyze.ts';
import { metacircularPrelude } from './metacircular.ts';
import * as programs from './metacircularPrograms.ts';
import { declaredNames, omit, pick } from './source.ts';

const BUDGET = 10_000_000;

const run = (source: string, prelude = metacircularPrelude): Outcome => evaluate(source, { budget: BUDGET, prelude });

const text = (source: string, prelude?: string): string => {
  const outcome = run(source, prelude);
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return outcome.text;
};

const errorOf = (source: string, prelude?: string): string => {
  const outcome = run(source, prelude);
  if (outcome.status !== 'error') throw new Error(`expected an error, got ${outcome.status}`);
  return outcome.error.message;
};

describe('parse (§4.1.2)', () => {
  it('returns the tagged lists of the book', () => {
    expect(text('parse("const size = 2; 5 * size;");', '')).toBe(
      stringify(
        list('sequence', list(
          list('constant_declaration', list('name', 'size'), list('literal', 2)),
          list('binary_operator_combination', '*', list('literal', 5), list('name', 'size')),
        )),
      ),
    );
  });

  it('gives a single statement as itself, and an expression body a return statement', () => {
    expect(text('parse("1;");', '')).toBe('["literal", [1, null]]');
    expect(text('parse("x => -x;");', '')).toBe(
      stringify(list('lambda_expression', list(list('name', 'x')), list('return_statement', list('unary_operator_combination', '-unary', list('name', 'x'))))),
    );
  });

  it('reports syntax errors in the string it is given', () => {
    expect(errorOf('parse("1 +");', '')).toMatch(/^Line 1: parse: Line 1: /);
  });
});

describe('the metacircular evaluator (§4.1.1–§4.1.4)', () => {
  it('runs the cycle of §4.1.1: 17 calls of evaluate and 3 of apply for square(3) + 1', () => {
    const log = createCallLogTracer(['evaluate', 'apply']);
    const outcome = evaluate(programs.evalApplyProgram, { budget: BUDGET, prelude: metacircularPrelude, hooks: [log.hooks] });
    expect(outcome.status === 'done' && outcome.text).toBe('10');
    expect(log.calls.filter((c) => c.name === 'evaluate')).toHaveLength(17);
    expect(log.calls.filter((c) => c.name === 'apply')).toHaveLength(3);
  });

  it('stops a sequence at a return value', () => {
    const outcome = run(programs.returnProgram);
    expect(outcome.status === 'done' && outcome.text).toBe('12');
    expect(outcome.output).toEqual(['"a was not positive"']);
  });

  it('represents environments as lists of frames', () => {
    const outcome = run(programs.environmentProgram);
    expect(outcome.output).toEqual(['1', '3']);
    expect(outcome.status === 'done' && outcome.text).toBe('[["x", ["y", null]], [1, [20, null]]]');
  });

  it('represents a compound function as parameters, body and environment', () => {
    const outcome = run(programs.functionObjectProgram);
    expect(outcome.output[0]).toBe('"compound_function"');
    expect(outcome.output[1]).toBe('["x", null]');
    expect(outcome.status === 'done' && outcome.text).toBe('2');
  });

  it('drives the evaluator from a list of inputs', () => {
    expect(run(programs.driverLoopProgram).output).toEqual([
      'M-evaluate value: undefined',
      'M-evaluate value: ["a", ["b", ["c", ["d", ["e", ["f", null]]]]]]',
      '"evaluator terminated"',
    ]);
  });

  it('can use any function as a primitive, but not one that applies functions (exercise 4.14)', () => {
    const outcome = run(programs.newPrimitiveProgram);
    expect(outcome.output).toEqual(['26']);
    expect(outcome.status === 'error' && outcome.error.message).toMatch(/Cannot apply \["compound_function"/);
  });

  it('evaluates a program built as data, and configures itself as a factorial machine (§4.1.5)', () => {
    expect(text(programs.dataAsProgramProgram)).toBe('25');
    expect(text(programs.factorialMachineProgram)).toBe('120');
  });

  it('handles mutually recursive internal declarations (§4.1.6)', () => {
    expect(text(programs.mutualRecursionProgram)).toBe('false');
  });

  it('meets exercise 4.19 with "*unassigned*", where the Laboratory reports the name', () => {
    expect(errorOf(programs.scopeQuestionProgram)).toMatch(/^Hidden prelude, line \d+: \+ expects two numbers or two strings, got string and number$/);
    expect(errorOf(programs.scopeQuestionDirectProgram, '')).toBe('Line 3: Name a used before its declaration was evaluated');
    expect(text(programs.selfApplicationProgram, '')).toBe('3628800');
  });
});

describe('the analyzing evaluator (§4.1.7)', () => {
  it('computes the same value in almost two fifths fewer steps', () => {
    const plain = run(programs.analysisComparisonProgram);
    const analyzed = run(programs.analysisComparisonProgram, analyzingPrelude);
    if (plain.status !== 'done' || analyzed.status !== 'done') throw new Error('did not finish');
    expect(analyzed.text).toBe('3628800');
    expect(plain.text).toBe('3628800');
    // The numbers of the page and of exercise 4.22.
    expect([plain.steps, analyzed.steps]).toEqual([76_076, 46_980]);
    expect(analyzed.steps / plain.steps).toBeGreaterThan(0.55);
    expect(analyzed.steps / plain.steps).toBeLessThan(0.7);
  });

  it('runs programs that declare and assign', () => {
    expect(text('evaluate_program("let k = 0; function f(n) { k = k + n; return k; } f(2); f(3);");', analyzingPrelude)).toBe('5');
  });
});

describe('Laboratory support for Chapter 4', () => {
  it('applies compound functions through apply_in_underlying_javascript', () => {
    expect(text('apply_in_underlying_javascript((x, y) => x - y, list(10, 3));', '')).toBe('7');
    expect(text('apply_in_underlying_javascript(math_max, list(1, 5, 2));', '')).toBe('5');
  });

  it('has the list functions the evaluators use', () => {
    expect(text('const p = list(1, 2, 3); set_head(tail(p), 20); list(length(p), list_ref(p, 1), append(p, list(4)), member(3, p), equal(p, list(1, 20, 3)));', '')).toBe(
      '[3, [20, [[1, [20, [3, [4, null]]]], [[3, null], [true, null]]]]]',
    );
    expect(text('map(x => x * x, enum_list(1, 3));', '')).toBe('[1, [4, [9, null]]]');
  });

  it('displays with a prefix and reads error(value, message) as Source does', () => {
    expect(evaluate('display(1, "value:");').output).toEqual(['value: 1']);
    expect(errorOf('error("x", "unbound name");', '')).toBe('Line 1: unbound name "x"');
  });

  it('keeps the text of a circular structure finite', () => {
    const outcome = evaluate('const p = list(1, 2); set_tail(tail(p), p); p;');
    expect(outcome.status === 'done' && outcome.text.length).toBeLessThan(10_010);
  });

  it('says when an error happened in a hidden prelude', () => {
    expect(errorOf('f(1);', 'function f(x) {\n  return x + "a" * 2;\n}')).toBe('Hidden prelude, line 2: * expects two numbers, got string and number');
  });

  it('logs the calls of named functions with their results', () => {
    const log = createCallLogTracer(['fact']);
    evaluate('function fact(n) { return n === 0 ? 1 : n * fact(n - 1); } fact(2);', { hooks: [log.hooks] });
    expect(log.calls.map((c) => [c.args.join(), c.value, c.parent])).toEqual([
      ['2', '2', null],
      ['1', '1', 0],
      ['0', '1', 1],
    ]);
  });

  it('omits and picks top-level declarations', () => {
    const source = 'function a() { return 1; }\nconst b = 2;\nfunction c() { return b; }\n';
    expect(declaredNames(source)).toEqual(['a', 'b', 'c']);
    expect(omit(source, 'b')).toBe('function a() { return 1; }\nfunction c() { return b; }\n');
    expect(pick(source, 'c', 'a')).toBe('function c() { return b; }\nfunction a() { return 1; }');
    expect(() => omit(source, 'd')).toThrow('omit: d is not declared');
  });
});

function list(...items: unknown[]): never {
  return items.reduceRight<unknown>((rest, item) => [item, rest], null) as never;
}
