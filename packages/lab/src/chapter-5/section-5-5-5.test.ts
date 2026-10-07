import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { listToArray, type Value } from '../evaluator/values.ts';
import { instructionText } from '../machines/controller.ts';
import { compileProgram, runCompiled } from './compiler.ts';
import { runEceval } from './eceval.ts';
import {
  compiledCodeAlternativeProgram,
  compiledCodeFactorialProgram,
  compiledCodeFigure,
  compiledCodeFigurePrelude,
  compiledCodeFigureText,
  compiledCodeIterativeProgram,
  compiledCodeMysteryProgram,
  interfacingCompareProgram,
  interfacingCompileAndGoProgram,
  interfacingFibCompareProgram,
  interfacingSpecialFactorial,
  interfacingSpecialFib,
  lexicalAddressingFramesProgram,
  lexicalAddressingSearchProgram,
  openCodingContext,
  alwaysPreservingContext,
} from './section-5-5-5.ts';
import { compileAndGoPrelude } from './compiler.ts';

const lines = (program: string): string[] =>
  (listToArray(compileProgram(program)) ?? []).map((item) => (typeof item === 'string' ? `"${item}"` : instructionText(item)));
const count = (code: string[], kind: string) => code.filter((line) => line.startsWith(`${kind}(`)).length;

const alternative = compiledCodeAlternativeProgram;

const factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];
const fibs = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const ns = [1, 2, 3, 4, 5, 6, 10];
const measured = (run: { results: { totalPushes: number; maximumDepth: number; value: string }[] }) =>
  run.results.slice(1).map((r) => [r.value, r.totalPushes, r.maximumDepth]);

function special(program: string, sizes: number[]): number[][] {
  const outcome = evaluate(`list(${sizes.map((n) => `special_statistics(${n})`).join(', ')});`, { prelude: program, budget: 5_000_000 });
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return (listToArray(outcome.value) ?? []).map((entry) => (listToArray(entry as Value) ?? []).map(Number));
}

describe('section 5.5.5: an example of compiled code', () => {
  it('compiles factorial to 72 instructions and 17 labels, with 10 saves and 7 restores', () => {
    const code = lines(compiledCodeFactorialProgram);
    expect(code.filter((line) => line.startsWith('"'))).toHaveLength(17);
    expect(code.filter((line) => !line.startsWith('"'))).toHaveLength(72);
    expect([count(code, 'save'), count(code, 'restore')]).toEqual([10, 7]);
  });

  it('exercise 5.36: factorial_alt has as many instructions, saving env instead of argl around the call', () => {
    const code = lines(compiledCodeFactorialProgram);
    const alt = lines(alternative);
    expect(alt).toHaveLength(code.length);
    expect([count(alt, 'save'), count(alt, 'restore')]).toEqual([10, 7]);
    // The saves between looking up * and looking up the function called recursively.
    const savedAroundCall = (c: string[], name: string) => {
      const from = c.findIndex((line) => line.includes('constant("*")'));
      const to = c.findIndex((line) => line.includes(`constant("${name}")`));
      return c.slice(from, to).filter((line) => line.startsWith('save('));
    };
    expect(savedAroundCall(code, 'factorial')).toEqual(['save("continue")', 'save("fun")', 'save("argl")']);
    expect(savedAroundCall(alt, 'factorial_alt')).toEqual(['save("continue")', 'save("fun")', 'save("env")']);
    const run = runCompiled(alternative, ns.map((n) => `factorial_alt(${n});`));
    expect(measured(run)).toEqual(measured(runCompiled(compiledCodeFactorialProgram, ns.map((n) => `factorial(${n});`))));
  });

  it('exercise 5.37: recursive factorial uses 7n + 1 pushes and depth 3n − 1, iterative 7n + 9 and depth 3', () => {
    const recursive = runCompiled(compiledCodeFactorialProgram, ns.map((n) => `factorial(${n});`));
    const iterative = runCompiled(compiledCodeIterativeProgram, [...ns, 20].map((n) => `factorial(${n});`));
    for (const [i, n] of ns.entries()) {
      expect(recursive.results[i + 1]).toMatchObject({ totalPushes: 7 * n + 1, maximumDepth: n === 1 ? 3 : 3 * n - 1 });
      expect(iterative.results[i + 1]).toMatchObject({ totalPushes: 7 * n + 9, maximumDepth: 3 });
    }
    expect(iterative.results.at(-1)).toMatchObject({ value: '2432902008176640000', maximumDepth: 3 });
  });

  it('exercise 5.38: f(x) = x + g(x + 2) compiles to the figure, which the check recognizes', () => {
    expect(lines(compiledCodeMysteryProgram).join('\n')).toBe(
      compiledCodeFigure
        .trim()
        .split('\n')
        .map((line) => line.trim().replace(/,$/, ''))
        .join('\n'),
    );
    const outcome = evaluate(`check_same_code(${JSON.stringify(compiledCodeMysteryProgram)}) && ! check_same_code("function f(x) { return g(x + 2) + x; }");`, {
      prelude: compiledCodeFigurePrelude,
      budget: 5_000_000,
    });
    expect(outcome).toMatchObject({ status: 'done', value: true });
    expect(compiledCodeFigureText.split('\n')).toHaveLength(63);
  });
});

describe('section 5.5.6: lexical addressing', () => {
  it('runs the book’s nested lambda: x * y * z is 3 * 6 * 10', () => {
    expect(evaluate(lexicalAddressingFramesProgram)).toMatchObject({ status: 'done', value: 180 });
  });

  it('finds x after comparing it with 7 other symbols', () => {
    const outcome = evaluate(lexicalAddressingSearchProgram);
    expect(outcome).toMatchObject({ status: 'done', value: 8, output: ['3'] });
  });

  it('compiles the nested lambda with 15 name lookups, 3 of them for x', () => {
    const code = lines(lexicalAddressingFramesProgram);
    expect(code.filter((line) => line.includes('op("lookup_symbol_value")'))).toHaveLength(15);
    expect(code.filter((line) => line.includes('lookup_symbol_value"), constant("x")'))).toHaveLength(3);
  });
});

describe('section 5.5.7: interfacing compiled code to the evaluator', () => {
  it('runs compile_and_go as the book shows', () => {
    const outcome = evaluate(interfacingCompileAndGoProgram, { prelude: compileAndGoPrelude, budget: 5_000_000 });
    expect(outcome.status).toBe('done');
    expect(outcome.output).toEqual([
      'total pushes = 0',
      'maximum depth = 0',
      'EC-evaluate value: undefined',
      'total pushes = 36',
      'maximum depth = 14',
      'EC-evaluate value: 120',
    ]);
  });

  it('exercise 5.48: compiled, interpreted and special-purpose factorial', () => {
    const sizes = [2, 4, 6, 8, 10];
    expect(interfacingCompareProgram).toContain('factorial(10);');
    const definition = compiledCodeFactorialProgram;
    const interpreted = runEceval([definition, ...sizes.map((n) => `factorial(${n});`)]).results.slice(1);
    const compiled = runCompiled(definition, sizes.map((n) => `factorial(${n});`)).results.slice(1);
    const machine = special(interfacingSpecialFactorial, sizes);
    for (const [i, n] of sizes.entries()) {
      expect(interpreted[i]).toMatchObject({ totalPushes: 32 * n - 15, maximumDepth: 5 * n + 3 });
      expect(compiled[i]).toMatchObject({ totalPushes: 7 * n + 1, maximumDepth: 3 * n - 1 });
      expect(machine[i]).toEqual([factorials[n], 2 * (n - 1), 2 * (n - 1)]);
    }
  });

  it('exercise 5.49: fib compiled uses 12 Fib(n + 1) − 4 pushes and depth 3n − 1', () => {
    const sizes = [0, 1, 2, 3, 4, 5, 6, 8, 10, 15];
    const fib = `function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}`;
    expect(interfacingFibCompareProgram).toContain(fib);
    const compiled = runCompiled(fib, sizes.map((n) => `fib(${n});`)).results.slice(1);
    const machine = special(interfacingSpecialFib, sizes);
    for (const [i, n] of sizes.entries()) {
      const next = fibs[n + 1] ?? 0;
      expect(compiled[i]).toMatchObject({ value: String(fibs[n]), totalPushes: 12 * next - 4 });
      if (n >= 2) expect(compiled[i]?.maximumDepth).toBe(3 * n - 1);
      expect(machine[i]?.[0]).toBe(fibs[n]);
      expect(machine[i]?.[1]).toBe(4 * (next - 1));
      if (n >= 2) expect(machine[i]?.[2]).toBe(2 * (n - 1));
    }
  });

  it('exercise 5.40: saving unconditionally, factorial(5) takes 167 pushes', () => {
    const outcome = evaluate(
      `${alwaysPreservingContext}
${alwaysPreservingSolution}
set_inputs(list("factorial(5);"));
compile_and_go(parse("function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }"));`,
      { budget: 5_000_000 },
    );
    expect(outcome.output.slice(3)).toEqual(['total pushes = 167', 'maximum depth = 18', 'EC-evaluate value: 120']);
  });

  it('exercise 5.41: open-coded factorial has 37 instructions and 9 labels', () => {
    const outcome = evaluate(
      `${openCodingContext}
${openCodingSolution}
const code = instructions(compile(parse("function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }"), "val", "next"));
list(length(code), length(filter(is_string, code)));`,
      { budget: 5_000_000 },
    );
    expect(outcome).toMatchObject({ status: 'done', value: [46, [9, null]] });
  });

  it('exercise 5.48 (b): with open coding (exercise 5.41) compiled factorial uses 3n + 3 pushes and depth 2n − 1', () => {
    const outcome = evaluate(
      `${openCodingContext}
${openCodingSolution}
set_inputs(list("factorial(5);", "factorial(10);"));
compile_and_go(parse("function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }"));`,
      { budget: 5_000_000 },
    );
    expect(outcome.status).toBe('done');
    expect(outcome.output.slice(3)).toEqual([
      'total pushes = 18',
      'maximum depth = 9',
      'EC-evaluate value: 120',
      'total pushes = 33',
      'maximum depth = 19',
      'EC-evaluate value: 3628800',
    ]);
  });
});

/** The reference answer of exercise 5.40 (book/content/exercises/5.5.5.ts), for the measurement above. */
const alwaysPreservingSolution = `function preserving(regs, seq1, seq2) {
    if (is_null(regs)) {
        return append_instruction_sequences(seq1, seq2);
    } else {
        const first_reg = head(regs);
        return preserving(tail(regs),
                   make_instruction_sequence(
                       list_union(list(first_reg), registers_needed(seq1)),
                       list_difference(registers_modified(seq1), list(first_reg)),
                       append(list(save(first_reg)),
                              append(instructions(seq1), list(restore(first_reg))))),
                   seq2);
    }
}
`;

/** The reference answer of exercise 5.41 (book/content/exercises/5.5.5.ts), for the measurement above. */
const openCodingSolution = `function is_open_coded(component) {
    return is_application(component) &&
           is_name(function_expression(component)) &&
           ! is_null(member(symbol_of_name(function_expression(component)),
                            list("===", "*", "-", "+"))) &&
           length(arg_expressions(component)) === 2;
}
function spread_arguments(argument_expressions) {
    const arg1_code = compile(head(argument_expressions), "arg1", "next");
    const arg2_code = compile(head(tail(argument_expressions)), "arg2", "next");
    return preserving(list("env"), arg1_code,
               preserving(list("arg1"), arg2_code,
                   make_instruction_sequence(list("arg1"), null, null)));
}
function compile_open_coded(component, target, linkage) {
    const operator = symbol_of_name(function_expression(component));
    return end_with_linkage(linkage,
               append_instruction_sequences(
                   spread_arguments(arg_expressions(component)),
                   make_instruction_sequence(list("arg1", "arg2"), list(target),
                       list(assign(target, list(op(operator), reg("arg1"), reg("arg2")))))));
}
function compile(component, target, linkage) {
    return is_literal(component) ? compile_literal(component, target, linkage)
         : is_name(component) ? compile_name(component, target, linkage)
         : is_open_coded(component) ? compile_open_coded(component, target, linkage)
         : is_application(component) ? compile_application(component, target, linkage)
         : is_operator_combination(component)
         ? compile(operator_combination_to_application(component), target, linkage)
         : is_conditional(component) ? compile_conditional(component, target, linkage)
         : is_lambda_expression(component) ? compile_lambda_expression(component, target, linkage)
         : is_sequence(component) ? compile_sequence(sequence_statements(component), target, linkage)
         : is_block(component) ? compile_block(component, target, linkage)
         : is_return_statement(component) ? compile_return_statement(component, target, linkage)
         : is_function_declaration(component)
         ? compile(function_decl_to_constant_decl(component), target, linkage)
         : is_declaration(component) ? compile_declaration(component, target, linkage)
         : is_assignment(component) ? compile_assignment(component, target, linkage)
         : error(component, "unknown component type -- compile");
}
`;
