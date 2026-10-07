import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { ecevalControllerSource, ecevalControllerWithout, ecevalMachineSource, readResults, runEceval } from './eceval.ts';
import {
  ecevalAppendProgram,
  ecevalArgumentsProgram,
  ecevalBlockProgram,
  ecevalCountProgram,
  ecevalFactorialProgram,
  ecevalParseProgram,
  ecevalSimpleProgram,
  ecevalStatisticsProgram,
  ecevalTailProgram,
} from './section-5-4.ts';

/** Run a page's program with the evaluator as its prelude, as the Example does. */
function run(program: string) {
  const outcome = evaluate(ecevalControllerSource + ecevalMachineSource + program, { budget: 1_000_000 });
  expect(outcome.status).toBe('done');
  return readResults(outcome.output);
}

const summary = (program: string) => run(program).results.map((r) => [r.value, r.totalPushes, r.maximumDepth]);

const count = (body: string) => `function count(n, k) { display(n); ${body} }`;
const withReturn = count('return n === k ? n : count(n + 1, k);');
const withoutReturn = count('n === k ? n : count(n + 1, k);');

const iterativeFactorial = `function factorial(n) {
    function iter(product, counter) {
        return counter > n ? product : iter(counter * product, counter + 1);
    }
    return iter(1, 1);
}`;
const recursiveFactorial = 'function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }';

describe('section 5.4: programs as data', () => {
  it('parses the book’s example into tagged lists and takes it apart', () => {
    const outcome = evaluate(ecevalParseProgram);
    expect(outcome).toMatchObject({ status: 'done', text: '["literal", [2, null]]' });
    if (outcome.status !== 'done') return;
    expect(outcome.output).toEqual([
      'list("sequence", list(list("constant_declaration", list("name", "size"), list("literal", 2)), list("binary_operator_combination", "*", list("literal", 5), list("name", "size"))))',
      'true',
      '"size"',
    ]);
  });

  it('runs the evaluator on factorial(3): 81 pushes, depth 18', () => {
    expect(summary(ecevalFactorialProgram)).toEqual([
      ['undefined', 4, 3],
      ['6', 81, 18],
    ]);
  });
});

describe('section 5.4.1: the dispatcher and basic evaluation', () => {
  it('evaluates a literal and a conditional in sequence: 7 pushes, depth 3', () => {
    expect(summary(ecevalSimpleProgram)).toEqual([[String(Math.PI), 7, 3]]);
  });
});

describe('section 5.4.2: evaluating function applications', () => {
  it('evaluates math_max(3, 4 + 1): 17 pushes, depth 8', () => {
    expect(summary(ecevalArgumentsProgram)).toEqual([['5', 17, 8]]);
  });

  it('runs count(1, 3) in depth 10, displaying 1, 2, 3', () => {
    const { results, output } = run(ecevalCountProgram);
    expect(results.map((r) => [r.value, r.maximumDepth])).toEqual([
      ['undefined', 3],
      ['3', 10],
    ]);
    expect(output).toEqual(['1', '2', '3']);
  });

  it('exercise 5.22: depth 10 with return, k + 9 without, the same 35k − 7 pushes', () => {
    const ks = [2, 3, 4, 7, 10, 25];
    const measure = (definition: string) =>
      runEceval([definition, ...ks.map((k) => `count(1, ${k});`)]).results.slice(1);
    for (const [i, result] of measure(withReturn).entries()) {
      const k = ks[i] ?? 0;
      expect(result).toMatchObject({ value: String(k), maximumDepth: 10, totalPushes: 35 * k - 7 });
    }
    for (const [i, result] of measure(withoutReturn).entries()) {
      const k = ks[i] ?? 0;
      expect(result).toMatchObject({ value: 'undefined', maximumDepth: k + 9, totalPushes: 35 * k - 7 });
    }
  });

  it('runs count(1, 300) in depth 10 as well', () => {
    const { results } = runEceval([withReturn, 'count(1, 300);']);
    expect(results[1]).toMatchObject({ value: '300', maximumDepth: 10 });
  });
});

describe('section 5.4.3: blocks, assignments and declarations', () => {
  it('assigns to x from inside a block that declares y', () => {
    expect(summary(ecevalBlockProgram).map(([value]) => value)).toEqual(['undefined', '3', '3']);
  });

  it('assigns to the block’s own x when the block declares one', () => {
    const { results } = runEceval(['let x = 1;', '{ let x = 2; x = x + 1; }', 'x;']);
    expect(results.map((r) => r.value)).toEqual(['undefined', '3', '1']);
  });
});

describe('section 5.4.4: running the evaluator', () => {
  it('runs the book’s interaction with append', () => {
    expect(summary(ecevalAppendProgram)).toEqual([
      ['undefined', 4, 3],
      ['["a", ["b", ["c", ["d", ["e", ["f", null]]]]]]', 141, 17],
    ]);
  });

  it('prints statistics for factorial of 1 to 5, 145 pushes and depth 28 for 5!', () => {
    expect(summary(ecevalStatisticsProgram)).toEqual([
      ['undefined', 4, 3],
      ['1', 17, 8],
      ['2', 49, 13],
      ['6', 81, 18],
      ['24', 113, 23],
      ['120', 145, 28],
    ]);
  });

  it('computes 4! iteratively, then recursively', () => {
    expect(summary(ecevalTailProgram)).toEqual([
      ['undefined', 4, 3],
      ['24', 172, 10],
      ['undefined', 4, 3],
      ['24', 113, 23],
    ]);
  });

  it('reports logical compositions as unknown syntax', () => {
    expect(runEceval(['true && false;']).results[0]).toMatchObject({ value: '"unknown syntax"', error: true });
  });

  it('exercise 5.29: without tail recursion, depth n + 11 and 6n + 3, pushes unchanged', () => {
    const nonTail = `${ecevalControllerWithout(['ev_return'])}
const eceval_controller = eceval_controller_with(list(
"ev_return",
  assign("comp", list(op("return_expression"), reg("comp"))),
  assign("continue", label("ev_restore_stack")),
  go_to(label("eval_dispatch")),
"ev_restore_stack",
  revert_stack_to_marker(),
  restore("continue"),
  go_to(reg("continue"))));`;
    const ns = [1, 2, 3, 5, 8];
    const measure = (definition: string) =>
      runEceval([definition, ...ns.map((n) => `factorial(${n});`)], { controller: nonTail }).results.slice(1);
    for (const [i, result] of measure(iterativeFactorial).entries()) {
      const n = ns[i] ?? 0;
      expect(result).toMatchObject({ maximumDepth: n + 11, totalPushes: 35 * n + 32 });
    }
    for (const [i, result] of measure(recursiveFactorial).entries()) {
      const n = ns[i] ?? 0;
      expect(result).toMatchObject({ maximumDepth: 6 * n + 3, totalPushes: 32 * n - 15 });
    }
  });

  it('exercise 5.30: S(0) = S(1) = 17 pushes', () => {
    const { results } = runEceval(['function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }', 'fib(0);', 'fib(1);']);
    expect(results.slice(1).map((r) => r.totalPushes)).toEqual([17, 17]);
  });
});

describe('the Laboratory simulator’s operations', () => {
  it('lets an operation given later in the list replace one given earlier, and the built-in ones', () => {
    const outcome = evaluate(`
let recorded = null;
const m = make_machine(list("a"),
                       list(list("f", x => x + 1), list("f", x => x * 10),
                            list("print_stack_statistics", () => { recorded = "replaced"; })),
                       list(assign("a", list(op("f"), constant(4))),
                            perform(list(op("print_stack_statistics")))));
start(m);
list(get_register_contents(m, "a"), recorded);`);
    expect(outcome).toMatchObject({ status: 'done', text: '[40, ["replaced", null]]' });
    if (outcome.status === 'done') expect(outcome.output).toEqual([]);
  });
});
