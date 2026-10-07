import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { listToArray } from '../evaluator/values.ts';
import { instructionText } from '../machines/controller.ts';
import { compileProgram, compilerSource, runCompiled } from './compiler.ts';
import { ecevalControllerWithout, quote, runEceval } from './eceval.ts';
import { withoutDeclarations } from './pieces.ts';
import {
  compilationOverviewProgram,
  compiledArgumentsProgram,
  compiledConditionalProgram,
  compiledFunctionProgram,
  compiledLambdaProgram,
  compiledTailCallProgram,
  ecevalApplicationFragment,
  funTargetProgram,
  instructionSequenceProgram,
  nameApplicationFragment,
  nameLinkageProgram,
  preservingProgram,
  preservingSequenceProgram,
  smarterAppendReturnUndefined,
} from './section-5-5.ts';

/** The compiled code of `program`, one string per instruction or label. */
const code = (program: string, target = 'val', linkage = 'next'): string[] =>
  (listToArray(compileProgram(program, target, linkage)) ?? []).map(instructionText);

const isLabel = (line: string) => line.startsWith('"');
/** The registers saved, in order. */
const saves = (lines: string[]) => lines.flatMap((line) => /^save\("(\w+)"\)$/.exec(line)?.[1] ?? []);
/** The saves outside the `save("continue")` of each compiled branch. */
const preservingSaves = (lines: string[]) =>
  lines.flatMap((line, i) => {
    const register = /^save\("(\w+)"\)$/.exec(line)?.[1];
    if (register === undefined) return [];
    return register === 'continue' && lines[i + 1] === 'push_marker_to_stack()' ? [] : [register];
  });

/** What a program run with the compiler as prelude displays, strings unquoted. */
function displayed(program: string, prelude = compilerSource): string[] {
  const outcome = evaluate(program, { prelude, budget: 5_000_000 });
  expect(outcome.status).toBe('done');
  return outcome.output.map((line) => (line.startsWith('"') ? (JSON.parse(line) as string) : line));
}

/** Needed and modified registers of compile(parse(program), target, linkage). */
function registers(program: string, target = 'val', linkage = 'next'): { needs: string; modifies: string } {
  const [needs = '', modifies = ''] = displayed(
    `const s = compile(parse(${quote(program)}), ${quote(target)}, ${quote(linkage)});
display_list(registers_needed(s));
display_list(registers_modified(s));`,
  );
  return { needs, modifies };
}

const recursiveFactorial = `function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}`;

describe('section 5.5: overview', () => {
  it('compiles math_max(96, 22) without saving anything the evaluator saves', () => {
    const lines = code(compilationOverviewProgram);
    expect(lines.filter((line) => !isLabel(line))).toHaveLength(13);
    expect(lines.filter(isLabel)).toHaveLength(3);
    expect(lines[0]).toBe('assign("fun", list(op("lookup_symbol_value"), constant("math_max"), reg("env")))');
    expect(saves(lines)).toEqual(['continue']);
    expect(lines.indexOf('save("continue")')).toBeGreaterThan(lines.indexOf('"compiled_branch2"'));
    expect(lines.indexOf('save("continue")')).toBeLessThan(lines.indexOf('"primitive_branch1"'));
  });

  it('measures 9 pushes interpreted (one by the driver loop) and none compiled', () => {
    expect(runEceval(['math_max(96, 22);']).results).toMatchObject([{ value: '96', totalPushes: 9 }]);
    expect(runCompiled(compilationOverviewProgram, []).results).toMatchObject([{ value: '96', totalPushes: 0, maximumDepth: 0 }]);
  });

  it('saves fun, and only fun, when the last argument is a call', () => {
    expect(preservingSaves(code('math_max(96, math_abs(22));'))).toEqual(['fun']);
  });
});

describe('section 5.5.1: structure of the compiler', () => {
  it('builds the book’s sequence for x with linkage "return"', () => {
    expect(displayed(instructionSequenceProgram)).toEqual([
      'list("env", "continue")',
      'list("val")',
      'assign("val", list(op("lookup_symbol_value"), constant("x"), reg("env"))),',
      'go_to(reg("continue")),',
    ]);
  });

  it('saves env around the first statement only when the second needs it', () => {
    expect(preservingSaves(code(preservingSequenceProgram))).toEqual(['env']);
    expect(saves(code(preservingSequenceProgram))).toEqual(['env', 'continue', 'continue']);
    expect(preservingSaves(code(preservingSequenceProgram.replace('math_PI * 2;', '5;')))).toEqual([]);
  });
});

describe('exercise 5.32', () => {
  it('keeps only the saves of argl and fun in the last two applications', () => {
    expect(preservingSaves(code('f("x", "y");'))).toEqual([]);
    expect(preservingSaves(code('f()("x", "y");'))).toEqual([]);
    expect(new Set(preservingSaves(code('f(g("x"), y);')))).toEqual(new Set(['argl', 'fun']));
    expect(new Set(preservingSaves(code('f(g("x"), "y");')))).toEqual(new Set(['argl', 'fun']));
  });
});

describe('exercise 5.33', () => {
  const controller = (fragment: string) => `${ecevalControllerWithout(['ev_operator_combination'])}
${fragment}
const eceval_controller = eceval_controller_with(application_fragment);`;

  it('rebuilds the original evaluator from the starter: 145 pushes for factorial(5)', () => {
    const { results } = runEceval([recursiveFactorial, 'factorial(5);'], { controller: controller(ecevalApplicationFragment) });
    expect(results[1]).toMatchObject({ value: '120', totalPushes: 145 });
  });

  it('looks names up directly: 109 pushes for factorial(5), 2 fewer per application', () => {
    const { results } = runEceval([recursiveFactorial, 'factorial(5);', '(x => x + 1)(2);', 'function g() { return math_max; } g()(1, 7);'], {
      controller: controller(nameApplicationFragment),
    });
    expect(results.map((r) => r.value)).toEqual(['undefined', '120', '3', '7']);
    expect(results[1]?.totalPushes).toBe(145 - 2 * 18);
  });
});

describe('section 5.5.2: compiling components', () => {
  it('compiles a name with each linkage', () => {
    const lookup = 'assign("val", list(op("lookup_symbol_value"), constant("x"), reg("env"))),';
    expect(displayed(nameLinkageProgram)).toEqual([lookup]);
    expect(displayed(nameLinkageProgram.replace('"val", "next"))', '"val", "return"))'))).toEqual([lookup, 'go_to(reg("continue")),']);
    expect(displayed(nameLinkageProgram.replace('"val", "next"))', '"val", "after_call"))'))).toEqual([lookup, 'go_to(label("after_call")),']);
  });

  it('saves env, not continue, around the predicate of the conditional', () => {
    expect(preservingSaves(code(compiledConditionalProgram))).toEqual(['env']);
    expect(code(compiledConditionalProgram)).toContain('go_to(label("after_cond3"))');
    expect(preservingSaves(code(compiledConditionalProgram.replace('n * 2', '2')))).toEqual([]);
  });

  it('compiles abs with four unreachable instructions after its conditional', () => {
    const lines = code(compiledFunctionProgram);
    expect(lines.slice(0, 3)).toEqual([
      'assign("val", list(op("make_compiled_function"), label("entry1"), reg("env")))',
      'go_to(label("after_lambda2"))',
      '"entry1"',
    ]);
    const after = lines.indexOf('"after_cond5"');
    expect(lines.slice(after + 1, lines.indexOf('"after_lambda2"'))).toEqual([
      'revert_stack_to_marker()',
      'restore("continue")',
      'assign("val", constant(undefined))',
      'go_to(reg("continue"))',
    ]);
  });
});

describe('exercise 5.35', () => {
  const prelude = `${withoutDeclarations(compilerSource, ['append_return_undefined'])}\n${smarterAppendReturnUndefined}`;
  const smarter = (program: string): string[] => {
    const outcome = evaluate(`instructions(compile(parse(${quote(program)}), "val", "next"));`, { prelude, budget: 5_000_000 });
    expect(outcome.status).toBe('done');
    return (listToArray(outcome.status === 'done' ? outcome.value : null) ?? []).map(instructionText);
  };

  it('compiles abs without the unreachable return', () => {
    const lines = smarter(compiledFunctionProgram);
    const after = lines.indexOf('"after_cond5"');
    expect(lines[after + 1]).toBe('"after_lambda2"');
    expect(lines.length).toBe(code(compiledFunctionProgram).length - 4);
  });
});

describe('section 5.5.3: compiling applications', () => {
  it('saves fun and argl, not env, around the arguments of math_max', () => {
    expect(preservingSaves(code(compiledArgumentsProgram))).toEqual(['fun', 'argl']);
    expect(preservingSaves(code(compiledArgumentsProgram.replace('(1,', '(math_PI,')))).toEqual(['fun', 'env', 'argl']);
  });

  it('compiles the function expression f() with target fun', () => {
    const lines = displayed(funTargetProgram);
    expect(lines[0]).toBe('save("env"),');
    expect(lines).toContain('assign("continue", label("fun_return4")),');
    expect(lines.slice(lines.indexOf('"fun_return4",') + 1, lines.indexOf('"fun_return4",') + 3)).toEqual([
      'assign("fun", reg("val")),',
      'go_to(label("after_call3")),',
    ]);
    expect(lines).toContain('assign("fun", list(op("apply_primitive_function"), reg("fun"), reg("argl"))),');
    expect(preservingSaves(code('f()(1);'))).toEqual([]);
  });

  it('compiles the call in count_down’s return statement without setting continue', () => {
    const lines = code(compiledTailCallProgram);
    expect(lines.slice(4, 10)).toEqual([
      'assign("env", list(op("extend_environment"), constant(list("n")), reg("argl"), reg("env")))',
      'revert_stack_to_marker()',
      'restore("continue")',
      'save("continue")',
      'save("env")',
      'assign("fun", list(op("lookup_symbol_value"), constant("==="), reg("env")))',
    ]);
    const tail = lines.indexOf('"compiled_branch15"');
    expect(lines.slice(tail + 1, tail + 3)).toEqual(['save("continue")', 'push_marker_to_stack()']);
    const call = lines.indexOf('"compiled_branch19"');
    expect(lines[call + 1]).toBe('assign("continue", label("after_call20"))');
  });

  it('runs compiled count_down in constant space, and the non-tail version in linear space', () => {
    const tail = runCompiled(compiledTailCallProgram, ['count_down(10);', 'count_down(100);']);
    expect(tail.results.slice(1).map((r) => [r.value, r.totalPushes, r.maximumDepth])).toEqual([
      ['"done"', 5 * 10 + 8, 3],
      ['"done"', 5 * 100 + 8, 3],
    ]);
    const nonTail = runCompiled(
      `function count_down(n) {
    return n === 0 ? 0 : 1 + count_down(n - 1);
}`,
      ['count_down(10);', 'count_down(100);'],
    );
    expect(nonTail.results.slice(1).map((r) => r.maximumDepth)).toEqual([2 * 10 + 2, 2 * 100 + 2]);
  });
});

describe('section 5.5.4: combining instruction sequences', () => {
  it('preserves env and continue around a call followed by a returning lookup', () => {
    const lines = displayed(preservingProgram);
    expect(lines.slice(0, 4)).toEqual([
      'list("env")',
      'list("env", "fun", "argl", "continue", "val")',
      'list("env", "continue")',
      'list("env", "continue")',
    ]);
    expect(lines.slice(4, 6)).toEqual(['save("continue"),', 'save("env"),']);
    expect(lines.slice(-4)).toEqual([
      'restore("env"),',
      'restore("continue"),',
      'assign("val", list(op("lookup_symbol_value"), constant("y"), reg("env"))),',
      'go_to(reg("continue")),',
    ]);
    const without = displayed(preservingProgram.replace('"val", "return")', '"val", "next")'));
    expect(without.filter((line) => line.startsWith('save('))).toEqual(['save("env"),', 'save("continue"),']);
  });

  it('counts argl as needed by a function call, because of the primitive branch', () => {
    expect(displayed('display_list(registers_needed(compile_function_call("val", "next")));')).toEqual(['list("fun", "argl")']);
  });

  it('tacks the body on: the lambda expression needs env and modifies val', () => {
    expect(registers(compiledLambdaProgram)).toEqual({ needs: 'list("env")', modifies: 'list("val")' });
    const lines = code(compiledLambdaProgram);
    expect(preservingSaves(lines)).toEqual(['continue', 'env']);
  });
});

