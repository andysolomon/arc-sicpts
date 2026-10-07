import { describe, expect, it } from 'vitest';
import { evaluate, type Outcome } from '../evaluator/evaluate.ts';
import { createCallLogTracer } from '../inspect/callLog.ts';
import {
  lazierProgram,
  lazyEvaluator,
  lazyEvaluatorChanges,
  lazyEvaluatorWithout,
  lazyListPrelude,
  lazyListsProgram,
  lazyPairs,
  memoProgram,
  solveProgram,
  thunkProgram,
  tryMeProgram,
  tryMeStrictProgram,
  unlessProgram,
  unmemoizedLazyEvaluator,
} from './lazy.ts';
import { metacircularEvaluator } from './metacircular.ts';
import { declaredNames } from './source.ts';

const run = (source: string, prelude = lazyEvaluator, budget = 50_000_000): Outcome =>
  evaluate(source, { prelude, budget });

/** What the driver loop printed for each input, without the prompt. */
const printed = (outcome: Outcome): string[] =>
  outcome.output.filter((line) => line.startsWith('L-evaluate value: ')).map((line) => line.slice(18));

/** Feed inputs to the lazy driver loop. */
const loop = (inputs: string[], prelude = lazyEvaluator): Outcome =>
  run(`driver_loop(the_global_environment, list(${inputs.map((input) => JSON.stringify(input)).join(', ')}));`, prelude);

describe('the lazy evaluator is the metacircular evaluator with §4.2.2’s changes', () => {
  it('declares every name of §4.1’s evaluator once, plus the thunk functions', () => {
    const names = declaredNames(lazyEvaluator);
    expect(new Set(names).size).toBe(names.length);
    for (const name of declaredNames(metacircularEvaluator).filter((n) => n !== 'list_of_values')) {
      expect(names).toContain(name);
    }
    expect(declaredNames(lazyEvaluatorChanges)).toEqual([
      'evaluate',
      'actual_value',
      'apply',
      'list_of_arg_values',
      'list_of_delayed_args',
      'eval_conditional',
      'delay_it',
      'is_thunk',
      'thunk_exp',
      'thunk_env',
      'is_evaluated_thunk',
      'thunk_value',
      'force_it',
      'input_prompt',
      'output_prompt',
      'driver_loop',
      'evaluate_program',
    ]);
  });

  it('can leave out declarations for an exercise to supply', () => {
    const names = declaredNames(lazyEvaluatorWithout('apply', 'force_it', 'eval_sequence'));
    expect(names).not.toContain('apply');
    expect(names).not.toContain('force_it');
    expect(names).not.toContain('eval_sequence');
    expect(names.at(-1)).toBe('the_global_environment');
  });
});

describe('section 4.2.1: normal order and applicative order', () => {
  it('applicative order evaluates head(null) before try_me is entered', () => {
    const outcome = evaluate(tryMeStrictProgram);
    expect(outcome.status).toBe('error');
    expect(outcome.status === 'error' && outcome.error.message).toContain('head expects a pair, got null');
  });

  it('the lazy evaluator never evaluates it, unless b is the value', () => {
    const outcome = run(tryMeProgram);
    expect(outcome.status).toBe('done');
    expect(printed(outcome)).toEqual(['undefined', '1']);
    expect(outcome.steps).toBeLessThan(100_000);
    const forced = run(tryMeProgram.replace('try_me(0,', 'try_me(5,'));
    expect(forced.status === 'error' && forced.error.message).toContain('head expects a pair, got null');
  });

  it('unless is an ordinary function there', () => {
    const outcome = run(unlessProgram);
    expect(outcome.output).toEqual([
      'L-evaluate value: undefined',
      'L-evaluate value: undefined',
      '"error: xs should not be null"',
      'L-evaluate value: "error: xs should not be null"',
      'L-evaluate value: 7',
      '"evaluator terminated"',
    ]);
  });

  it('exercise 4.23: factorial with unless returns 120 lazily, applying factorial five times', () => {
    const outcome = loop([
      'let calls = 0;',
      'function unless(condition, usual_value, exceptional_value) { return condition ? exceptional_value : usual_value; }',
      'function factorial(n) { calls = calls + 1; return unless(n === 1, n * factorial(n - 1), 1); }',
      'factorial(5);',
      'calls;',
    ]);
    expect(printed(outcome).slice(3)).toEqual(['120', '5']);
    const strict = evaluate(
      `function unless(condition, usual_value, exceptional_value) { return condition ? exceptional_value : usual_value; }
       function factorial(n) { return unless(n === 1, n * factorial(n - 1), 1); }
       factorial(5);`,
      { budget: 1_000_000 },
    );
    expect(strict.status).not.toBe('done');
  });
});

describe('section 4.2.2: an interpreter with lazy evaluation', () => {
  it('a thunk is a tagged list that forcing turns into an evaluated thunk', () => {
    const outcome = run(thunkProgram);
    expect(outcome.output).toEqual(['"thunk"', '3', '"evaluated_thunk"']);
    expect(outcome.status === 'done' && outcome.text).toBe('["evaluated_thunk", [3, null]]');
  });

  it('memoization: square(id(10)) counts once, or twice without it (exercise 4.27)', () => {
    expect(printed(run(memoProgram)).slice(3)).toEqual(['100', '1']);
    expect(printed(run(memoProgram, unmemoizedLazyEvaluator)).slice(3)).toEqual(['100', '2']);
  });

  it('memoization: the thunk for id(10) is forced once and reused once', () => {
    const tracer = createCallLogTracer(['delay_it', 'force_it']);
    evaluate(memoProgram, { prelude: lazyEvaluator, budget: 1_000_000, hooks: [tracer.hooks] });
    const delayed = tracer.calls.filter((c) => c.name === 'delay_it').map((c) => c.args[0]);
    const forced = tracer.calls.filter((c) => c.name === 'force_it' && c.args[0]?.startsWith('["thunk"'));
    const reused = tracer.calls.filter((c) => c.name === 'force_it' && c.args[0]?.startsWith('["evaluated_thunk"'));
    // id(10) for square's x, then 10 for id's x.
    expect(delayed).toHaveLength(2);
    expect(forced).toHaveLength(2);
    expect(reused.map((c) => c.value)).toEqual(['10']);
  });

  it('exercise 4.27: under n squares, an argument is evaluated once, or 2ⁿ times without memoization', () => {
    const inputs = [
      'let count = 0;',
      'function id(x) { count = count + 1; return x; }',
      'function square(x) { return x * x; }',
      'square(square(square(id(2))));',
      'count;',
    ];
    expect(printed(loop(inputs)).slice(3)).toEqual(['256', '1']);
    expect(printed(loop(inputs, unmemoizedLazyEvaluator)).slice(3)).toEqual(['256', '8']);
  });

  it('exercise 4.25: count is 1, w is 10, then count is 2', () => {
    const outcome = loop([
      'let count = 0;',
      'function id(x) { count = count + 1; return x; }',
      'const w = id(id(10));',
      'count;',
      'w;',
      'count;',
    ]);
    expect(printed(outcome).slice(3)).toEqual(['1', '10', '2']);
  });

  it('exercise 4.26: without forcing, a function passed as an argument cannot be applied', () => {
    const inputs = ['function apply_to_one(f) { return f(1); }', 'apply_to_one(x => x + 1);'];
    expect(printed(loop(inputs))).toEqual(['undefined', '2']);
    const unforced = lazyEvaluator.replace(
      'apply(actual_value(function_expression(component), env),',
      'apply(evaluate(function_expression(component), env),',
    );
    const outcome = loop(inputs, unforced);
    expect(outcome.status === 'error' && outcome.error.message).toContain('unknown function type -- apply ["thunk"');
  });

  it('exercise 4.28: f2(1) is 1 with the text’s eval_sequence, list(1, 2) with Cy’s', () => {
    const inputs = [
      'function f1(x) { x = pair(x, list(2)); return x; }',
      'function f2(x) { function f(e) { e; return x; } return f(x = pair(x, list(2))); }',
      'f1(1);',
      'f2(1);',
    ];
    expect(printed(loop(inputs)).slice(2)).toEqual(['[1, [2, null]]', '1']);
    const cy = `${lazyEvaluatorWithout('eval_sequence')}
function eval_sequence(stmts, env) {
    if (is_empty_sequence(stmts)) {
        return undefined;
    } else if (is_last_statement(stmts)) {
        return actual_value(first_statement(stmts), env);
    } else {
        const first_stmt_value =
            actual_value(first_statement(stmts), env);
        if (is_return_value(first_stmt_value)) {
            return first_stmt_value;
        } else {
            return eval_sequence(rest_statements(stmts), env);
        }
    }
}`;
    expect(printed(loop(inputs, cy)).slice(2)).toEqual(['[1, [2, null]]', '[1, [2, null]]']);
  });

  it('exercise 4.28: for_each displays every element with either eval_sequence', () => {
    const outcome = loop([
      'function for_each(fun, items) { if (is_null(items)) { return "done"; } else { fun(head(items)); for_each(fun, tail(items)); } }',
      'for_each(display, list(57, 321, 88));',
    ]);
    expect(outcome.output.slice(1, 4)).toEqual(['57', '321', '88']);
  });
});

describe('section 4.2.3: streams as lazy lists', () => {
  it('integers is an infinite list, and its 17th element is 18', () => {
    const outcome = run(lazyListsProgram, lazyListPrelude, 3_000_000);
    expect(printed(outcome).at(-1)).toBe('18');
    expect(outcome.steps).toBeLessThan(1_500_000);
  });

  it('neither the head nor the tail of a lazy pair is evaluated until needed', () => {
    expect(printed(run(lazierProgram, lazyListPrelude)).at(-1)).toBe('5');
    // Forcing the head evaluates head(null) with the lazy head, which applies null.
    const head = run(lazierProgram.replace('"tail(p);"', '"head(p);"'), lazyListPrelude);
    expect(head.status === 'error' && head.error.message).toContain('unknown function type -- apply null');
  });

  it('solve finds e from the differential equation dy/dt = y', () => {
    const outcome = run(solveProgram, lazyListPrelude, 20_000_000);
    expect(printed(outcome).at(-1)).toBe('2.704813829421526');
    expect(Math.abs(2.704813829421526 - Math.pow(1.01, 100))).toBeLessThan(1e-12);
    expect(outcome.steps).toBeLessThan(12_000_000);
    // The work is proportional to the number of steps of the method.
    const half = run(solveProgram.replace('0.01), 100', '0.02), 50'), lazyListPrelude, 20_000_000);
    expect(outcome.steps / half.steps).toBeCloseTo(2, 1);
  });

  it('exercise 4.31: the primitive list makes ordinary pairs, which the lazy head cannot take apart', () => {
    const outcome = run(`evaluate_program(${lazyPairs} + 'head(list("a", "b", "c"));');`);
    expect(outcome.status === 'error' && outcome.error.message).toContain('unknown function type -- apply');
  });

  it('exercise 4.32: a lazy pair prints as a compound function', () => {
    const pairs = run(`driver_loop(the_global_environment, list(${lazyPairs}, "pair(1, 2);"));`);
    expect(printed(pairs).at(-1)).toBe('"< compound-function >"');
  });
});
