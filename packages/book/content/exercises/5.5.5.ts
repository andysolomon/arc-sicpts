import {
  alwaysPreservingContext,
  argumentOrderContext,
  argumentOrderFunctions,
  compappContext,
  compileAndGoPrelude,
  compiledCodeFigurePrelude,
  compileFunction,
  compileFunctionCallFunction,
  lexicalAddressEnvironment,
  openCodingContext,
  preservingFunction,
  quote,
} from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/**
 * Exercises of §5.5.5 to §5.5.7. The compiler exercises run the reader's
 * functions in place of the book's: the context is the compiler, the
 * evaluator of §5.5.7 and `compile_and_go` without those functions, plus
 * `check_` helpers (`section-5-5-5.ts` in the Laboratory).
 */

/** Steps for compiling in Source and running the result. */
const BUDGET = 5_000_000;

const recursiveFactorial = 'function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }';
const alternativeFactorial = 'function factorial_alt(n) { return n === 1 ? 1 : n * factorial_alt(n - 1); }';

/** A Source expression running `program` with `compile_and_go` and then each input; its value is the last value printed. */
const compileAndGo = (program: string, inputs: string[]): string =>
  `check_compile_and_go(${quote(program)}, ${inputs.length === 0 ? 'null' : `list(${inputs.map(quote).join(', ')})`})`;

// §5.5.5

export const exercise_5_36: ExerciseSpec = {
  id: '5.36',
  starter: `// Which register does each function's code save on the stack
// around its recursive call? ("env", "fun", "argl", "val" or "continue")
const factorial_saves = "";
const factorial_alt_saves = "";

// Which one runs more efficiently: "factorial", "factorial_alt" or "neither"?
const more_efficient = "";
`,
  tests: [
    { name: 'factorial saves its partial argument list', kind: 'value', expr: 'factorial_saves', expected: 'argl' },
    { name: 'factorial_alt saves its environment', kind: 'value', expr: 'factorial_alt_saves', expected: 'env' },
    { name: 'neither is more efficient', kind: 'value', expr: 'more_efficient', expected: 'neither' },
  ],
  solution: `const factorial_saves = "argl";
const factorial_alt_saves = "env";
const more_efficient = "neither";
`,
};

export const exercise_5_37: ExerciseSpec = {
  id: '5.37',
  prelude: compileAndGoPrelude,
  budget: BUDGET,
  starter: `// The maximum stack depth for computing factorial(n), n ≥ 2,
// with the compiled recursive and iterative functions.
// To measure, run for instance
//   set_inputs(list("factorial(3);", "factorial(4);"));
//   compile_and_go(parse(\`function factorial(n) { ... }\`));
function recursive_depth(n) {
    // your answer
}

function iterative_depth(n) {
    // your answer
}
`,
  tests: [
    { name: 'recursive, n = 2', kind: 'value', expr: 'recursive_depth(2)', expected: 5 },
    { name: 'recursive, n = 5', kind: 'value', expr: 'recursive_depth(5)', expected: 14 },
    { name: 'recursive, n = 10', kind: 'value', expr: 'recursive_depth(10)', expected: 29 },
    { name: 'iterative, n = 2', kind: 'value', expr: 'iterative_depth(2)', expected: 3 },
    { name: 'iterative, n = 10', kind: 'value', expr: 'iterative_depth(10)', expected: 3 },
  ],
  solution: `function recursive_depth(n) {
    return 3 * n - 1;
}

function iterative_depth(n) {
    return 3;
}
`,
};

export const exercise_5_38: ExerciseSpec = {
  id: '5.38',
  prelude: compiledCodeFigurePrelude,
  budget: BUDGET,
  starter: `// The program, as a string; the checker compiles it with target "val"
// and linkage "next".
const program = \`
\`;
`,
  tests: [
    { name: 'the program declares f', kind: 'value', expr: 'equal(scan_out_declarations(parse(program)), list("f"))', expected: true },
    { name: 'it compiles to the code of the figure', kind: 'value', expr: 'check_same_code(program)', expected: true },
  ],
  solution: `const program = \`
function f(x) {
    return x + g(x + 2);
}\`;
`,
};

const orderProgram = 'let order = null; function note(x) { order = pair(x, order); return x; } list(note(1), note(2), note(3)); order;';

export const exercise_5_39: ExerciseSpec = {
  id: '5.39',
  context: argumentOrderContext,
  budget: BUDGET,
  starter: `// In which order does the compiler evaluate the arguments of an
// application: "left to right", "right to left" or "some other order"?
const argument_order = "";

// Change these two functions so that arguments are evaluated from left
// to right.
${argumentOrderFunctions}
`,
  tests: [
    { name: 'the order of the compiler of §5.5.3', kind: 'value', expr: 'argument_order', expected: 'right to left' },
    { name: 'arguments are now evaluated from left to right', kind: 'value', expr: `equal(${compileAndGo(orderProgram, [])}, list(3, 2, 1))`, expected: true },
    { name: 'compiled factorial still computes 5!', kind: 'value', expr: compileAndGo(recursiveFactorial, ['factorial(5);']), expected: 120 },
    { name: 'arguments arrive in their places', kind: 'value', expr: compileAndGo('function f(a, b, c) { return a - b * c; } f(20, 3, 4);', []), expected: 8 },
    { name: 'a call without arguments', kind: 'value', expr: compileAndGo('function seven() { return 7; } seven();', []), expected: 7 },
  ],
  solution: `const argument_order = "right to left";

function construct_arglist(arg_codes) {
    if (is_null(arg_codes)) {
        return make_instruction_sequence(null, list("argl"),
                   list(assign("argl", constant(null))));
    } else {
        const code_to_get_first_arg =
            append_instruction_sequences(
                head(arg_codes),
                make_instruction_sequence(list("val"), list("argl"),
                    list(assign("argl",
                                list(op("list"), reg("val"))))));
        return is_null(tail(arg_codes))
               ? code_to_get_first_arg
               : preserving(list("env"),
                     code_to_get_first_arg,
                     code_to_get_rest_args(tail(arg_codes)));
    }
}

function code_to_get_rest_args(arg_codes) {
    const code_for_next_arg =
        preserving(list("argl"),
            head(arg_codes),
            make_instruction_sequence(list("val", "argl"), list("argl"),
                list(assign("argl", list(op("adjoin_arg"),
                                         reg("val"), reg("argl"))))));
    return is_null(tail(arg_codes))
           ? code_for_next_arg
           : preserving(list("env"),
                        code_for_next_arg,
                        code_to_get_rest_args(tail(arg_codes)));
}
`,
};

export const exercise_5_40: ExerciseSpec = {
  id: '5.40',
  context: alwaysPreservingContext,
  budget: BUDGET,
  starter: `// Make preserving save and restore every register in regs around seq1,
// whether or not seq1 modifies it and seq2 needs it.
${preservingFunction}
`,
  tests: [
    { name: 'compiled factorial has 45 saves', kind: 'value', expr: `check_count("save", ${quote(recursiveFactorial)})`, expected: 45 },
    { name: 'and 42 restores', kind: 'value', expr: `check_count("restore", ${quote(recursiveFactorial)})`, expected: 42 },
    { name: 'it still computes 5!', kind: 'value', expr: compileAndGo(recursiveFactorial, ['factorial(5);']), expected: 120 },
    { name: 'and 10!', kind: 'value', expr: compileAndGo(recursiveFactorial, ['factorial(10);']), expected: 3628800 },
  ],
  solution: `function preserving(regs, seq1, seq2) {
    if (is_null(regs)) {
        return append_instruction_sequences(seq1, seq2);
    } else {
        const first_reg = head(regs);
        return preserving(tail(regs),
                   make_instruction_sequence(
                       list_union(list(first_reg),
                                  registers_needed(seq1)),
                       list_difference(registers_modified(seq1),
                                       list(first_reg)),
                       append(list(save(first_reg)),
                              append(instructions(seq1),
                                     list(restore(first_reg))))),
                   seq2);
    }
}
`,
};

export const exercise_5_41: ExerciseSpec = {
  id: '5.41',
  context: openCodingContext,
  budget: BUDGET,
  starter: `// Compile the argument expressions to arg1 and arg2.
function spread_arguments(argument_expressions) {
    // your answer
}

// Code for an application of ===, *, - or + to two arguments.
function compile_open_coded(component, target, linkage) {
    // your answer
}

// Make compile dispatch to compile_open_coded.
${compileFunction}
`,
  tests: [
    { name: 'factorial no longer looks up ===', kind: 'value', expr: `check_looks_up("===", ${quote(recursiveFactorial)})`, expected: false },
    { name: 'nor *', kind: 'value', expr: `check_looks_up("*", ${quote(recursiveFactorial)})`, expected: false },
    { name: 'nor -', kind: 'value', expr: `check_looks_up("-", ${quote(recursiveFactorial)})`, expected: false },
    { name: 'but still looks up factorial', kind: 'value', expr: `check_looks_up("factorial", ${quote(recursiveFactorial)})`, expected: true },
    { name: 'compiled factorial computes 5!', kind: 'value', expr: compileAndGo(recursiveFactorial, ['factorial(5);']), expected: 120 },
    { name: 'and factorial_alt too', kind: 'value', expr: compileAndGo(alternativeFactorial, ['factorial_alt(6);']), expected: 720 },
    { name: 'open-coded arguments of open-coded operators', kind: 'value', expr: compileAndGo('(1 + 2) * (3 + 4) - (10 - 2 * 3);', []), expected: 17 },
  ],
  solution: `function is_open_coded(component) {
    return is_application(component) &&
           is_name(function_expression(component)) &&
           ! is_null(member(symbol_of_name(function_expression(component)),
                            list("===", "*", "-", "+"))) &&
           length(arg_expressions(component)) === 2;
}

function spread_arguments(argument_expressions) {
    const arg1_code = compile(head(argument_expressions), "arg1", "next");
    const arg2_code = compile(head(tail(argument_expressions)),
                              "arg2", "next");
    return preserving(list("env"),
               arg1_code,
               preserving(list("arg1"),
                   arg2_code,
                   make_instruction_sequence(list("arg1"), null, null)));
}

function compile_open_coded(component, target, linkage) {
    const operator = symbol_of_name(function_expression(component));
    return end_with_linkage(linkage,
               append_instruction_sequences(
                   spread_arguments(arg_expressions(component)),
                   make_instruction_sequence(list("arg1", "arg2"),
                                             list(target),
                       list(assign(target,
                                   list(op(operator),
                                        reg("arg1"), reg("arg2")))))));
}

function compile(component, target, linkage) {
    return is_literal(component)
           ? compile_literal(component, target, linkage)
           : is_name(component)
           ? compile_name(component, target, linkage)
           : is_open_coded(component)
           ? compile_open_coded(component, target, linkage)
           : is_application(component)
           ? compile_application(component, target, linkage)
           : is_operator_combination(component)
           ? compile(operator_combination_to_application(component),
                     target, linkage)
           : is_conditional(component)
           ? compile_conditional(component, target, linkage)
           : is_lambda_expression(component)
           ? compile_lambda_expression(component, target, linkage)
           : is_sequence(component)
           ? compile_sequence(sequence_statements(component),
                              target, linkage)
           : is_block(component)
           ? compile_block(component, target, linkage)
           : is_return_statement(component)
           ? compile_return_statement(component, target, linkage)
           : is_function_declaration(component)
           ? compile(function_decl_to_constant_decl(component),
                     target, linkage)
           : is_declaration(component)
           ? compile_declaration(component, target, linkage)
           : is_assignment(component)
           ? compile_assignment(component, target, linkage)
           : error(component, "unknown component type -- compile");
}
`,
};

// §5.5.6

export const exercise_5_42: ExerciseSpec = {
  id: '5.42',
  context: lexicalAddressEnvironment,
  starter: `// An address is list(frame_number, displacement_number).
function lexical_address_lookup(address, env) {
    // your answer
}

function lexical_address_assign(address, value, env) {
    // your answer
}
`,
  tests: [
    { name: 'x two frames out', kind: 'value', expr: 'lexical_address_lookup(list(2, 0), check_environment())', expected: 3 },
    { name: 'the inner y', kind: 'value', expr: 'lexical_address_lookup(list(0, 0), check_environment())', expected: 6 },
    { name: 'the outer y', kind: 'value', expr: 'lexical_address_lookup(list(2, 1), check_environment())', expected: 4 },
    { name: 'c', kind: 'value', expr: 'lexical_address_lookup(list(1, 2), check_environment())', expected: 3 },
    { name: 'an unassigned name is an error', kind: 'error', call: 'lexical_address_lookup(list(1, 4), check_environment())' },
    { name: 'assigning an unassigned name', kind: 'value', expr: 'check_assign_then_lookup(list(1, 4), 9)', expected: 9 },
    { name: 'assigning the outer y', kind: 'value', expr: 'check_assign_then_lookup(list(2, 1), 40)', expected: 40 },
  ],
  solution: `function lexical_address_values(address, env) {
    function frame(n, env) {
        return n === 0
               ? first_frame(env)
               : frame(n - 1, enclosing_environment(env));
    }
    function drop(k, values) {
        return k === 0 ? values : drop(k - 1, tail(values));
    }
    return drop(head(tail(address)),
                frame_values(frame(head(address), env)));
}

function lexical_address_lookup(address, env) {
    const value = head(lexical_address_values(address, env));
    return value === "*unassigned*"
           ? error(address, "unassigned name")
           : value;
}

function lexical_address_assign(address, value, env) {
    set_head(lexical_address_values(address, env), value);
}
`,
};

const compileTimeEnvironment = 'list(list("y", "z"), list("a", "b", "c", "d", "e"), list("x", "y"))';

export const exercise_5_44: ExerciseSpec = {
  id: '5.44',
  starter: `function find_symbol(symbol, compile_time_environment) {
    // your answer
}
`,
  tests: [
    { name: 'c is at (1, 2)', kind: 'value', expr: `equal(find_symbol("c", ${compileTimeEnvironment}), list(1, 2))`, expected: true },
    { name: 'x is at (2, 0)', kind: 'value', expr: `equal(find_symbol("x", ${compileTimeEnvironment}), list(2, 0))`, expected: true },
    { name: 'w is not found', kind: 'value', expr: `find_symbol("w", ${compileTimeEnvironment})`, expected: 'not found' },
    { name: 'the innermost y', kind: 'value', expr: `equal(find_symbol("y", ${compileTimeEnvironment}), list(0, 0))`, expected: true },
    { name: 'the empty environment', kind: 'value', expr: 'find_symbol("x", null)', expected: 'not found' },
  ],
  solution: `function find_symbol(symbol, compile_time_environment) {
    function scan(symbols, frame_number, displacement, frames) {
        return is_null(symbols)
               ? search(tail(frames), frame_number + 1)
               : head(symbols) === symbol
               ? list(frame_number, displacement)
               : scan(tail(symbols), frame_number, displacement + 1, frames);
    }
    function search(frames, frame_number) {
        return is_null(frames)
               ? "not found"
               : scan(head(frames), frame_number, 0, frames);
    }
    return search(compile_time_environment, 0);
}
`,
};

// §5.5.7

export const exercise_5_48: ExerciseSpec = {
  id: '5.48',
  prelude: compileAndGoPrelude,
  budget: BUDGET,
  starter: `// Stack use of compiled factorial(n): total pushes, and maximum depth
// for n ≥ 2.
function compiled_pushes(n) {
    // your answer
}

function compiled_depth(n) {
    // your answer
}

// The limits, as n grows, of compiled / interpreted
// and of special-purpose machine / interpreted.
const compiled_pushes_ratio = 0;
const compiled_depth_ratio = 0;
const special_pushes_ratio = 0;
const special_depth_ratio = 0;
`,
  tests: [
    { name: 'pushes for 1!', kind: 'value', expr: 'compiled_pushes(1)', expected: 8 },
    { name: 'pushes for 5!', kind: 'value', expr: 'compiled_pushes(5)', expected: 36 },
    { name: 'pushes for 20!', kind: 'value', expr: 'compiled_pushes(20)', expected: 141 },
    { name: 'depth for 2!', kind: 'value', expr: 'compiled_depth(2)', expected: 5 },
    { name: 'depth for 20!', kind: 'value', expr: 'compiled_depth(20)', expected: 59 },
    { name: 'compiled / interpreted pushes', kind: 'value', expr: close('compiled_pushes_ratio', 7 / 32, 1e-9), expected: true },
    { name: 'compiled / interpreted depth', kind: 'value', expr: close('compiled_depth_ratio', 3 / 5, 1e-9), expected: true },
    { name: 'special-purpose / interpreted pushes', kind: 'value', expr: close('special_pushes_ratio', 2 / 32, 1e-9), expected: true },
    { name: 'special-purpose / interpreted depth', kind: 'value', expr: close('special_depth_ratio', 2 / 5, 1e-9), expected: true },
  ],
  solution: `function compiled_pushes(n) {
    return 7 * n + 1;
}

function compiled_depth(n) {
    return 3 * n - 1;
}

const compiled_pushes_ratio = 7 / 32;
const compiled_depth_ratio = 3 / 5;
const special_pushes_ratio = 2 / 32;
const special_depth_ratio = 2 / 5;
`,
};

const fibDeclaration = `function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
`;

export const exercise_5_49: ExerciseSpec = {
  id: '5.49',
  prelude: `${compileAndGoPrelude}
${fibDeclaration}`,
  budget: BUDGET,
  starter: `// fib is provided, as in §1.2.2.
// Stack use of compiled fib(n): total pushes, and maximum depth for n ≥ 2.
function compiled_fib_pushes(n) {
    // your answer
}

function compiled_fib_depth(n) {
    // your answer
}

// The limit, as n grows, of compiled / interpreted pushes.
const fib_pushes_ratio = 0;
`,
  tests: [
    { name: 'pushes for fib(0)', kind: 'value', expr: 'compiled_fib_pushes(0)', expected: 8 },
    { name: 'pushes for fib(5)', kind: 'value', expr: 'compiled_fib_pushes(5)', expected: 92 },
    { name: 'pushes for fib(10)', kind: 'value', expr: 'compiled_fib_pushes(10)', expected: 1064 },
    { name: 'pushes for fib(15)', kind: 'value', expr: 'compiled_fib_pushes(15)', expected: 11840 },
    { name: 'depth for fib(2)', kind: 'value', expr: 'compiled_fib_depth(2)', expected: 5 },
    { name: 'depth for fib(15)', kind: 'value', expr: 'compiled_fib_depth(15)', expected: 44 },
    { name: 'compiled / interpreted pushes', kind: 'value', expr: close('fib_pushes_ratio', 12 / 56, 1e-9), expected: true },
  ],
  solution: `function compiled_fib_pushes(n) {
    return 12 * fib(n + 1) - 4;
}

function compiled_fib_depth(n) {
    return 3 * n - 1;
}

const fib_pushes_ratio = 12 / 56;
`,
};

export const exercise_5_50: ExerciseSpec = {
  id: '5.50',
  context: compappContext,
  budget: BUDGET,
  starter: `// Add a branch for compound (interpreted) functions, which jumps to
// the evaluator's compound_apply through the register compapp.
${compileFunctionCallFunction}
`,
  tests: [
    {
      name: 'compiled f calls interpreted g',
      kind: 'value',
      expr: compileAndGo('function f(g, x) { return g(x) + 1; }', ['function g(x) { return x * 2; }', 'f(g, 5);']),
      expected: 11,
    },
    {
      name: 'a tail call to an interpreted function',
      kind: 'value',
      expr: compileAndGo('let g = null; function h(x) { return g(x); }', ['g = x => x * 3;', 'h(5);']),
      expected: 15,
    },
    {
      name: 'an interpreted function computing the function to call',
      kind: 'value',
      expr: compileAndGo('function k(pick, x) { return pick()(x); }', ['function pick() { return y => y + 100; }', 'k(pick, 1);']),
      expected: 101,
    },
    {
      name: 'a call whose value is not returned',
      kind: 'value',
      expr: compileAndGo('function f(g, x) { g(x); return x; }', ['function g(x) { return x; }', 'f(g, 7);']),
      expected: 7,
    },
    { name: 'compiled factorial still computes 5!', kind: 'value', expr: compileAndGo(recursiveFactorial, ['factorial(5);']), expected: 120 },
  ],
  solution: `function compile_function_call(target, linkage) {
    const primitive_branch = make_label("primitive_branch");
    const compiled_branch = make_label("compiled_branch");
    const compound_branch = make_label("compound_branch");
    const after_call = make_label("after_call");
    const compiled_linkage = linkage === "next" ? after_call : linkage;
    return append_instruction_sequences(
        make_instruction_sequence(list("fun"), null,
            list(test(list(op("is_primitive_function"), reg("fun"))),
                 branch(label(primitive_branch)),
                 test(list(op("is_compound_function"), reg("fun"))),
                 branch(label(compound_branch)))),
        append_instruction_sequences(
            parallel_instruction_sequences(
                append_instruction_sequences(
                    compiled_branch,
                    compile_fun_appl(target, compiled_linkage)),
                parallel_instruction_sequences(
                    append_instruction_sequences(
                        compound_branch,
                        compound_fun_appl(target, compiled_linkage)),
                    append_instruction_sequences(
                        primitive_branch,
                        end_with_linkage(linkage,
                            make_instruction_sequence(list("fun", "argl"),
                                                      list(target),
                                list(assign(
                                       target,
                                       list(op("apply_primitive_function"),
                                            reg("fun"), reg("argl"))))))))),
            after_call));
}

function compound_fun_appl(target, linkage) {
    const fun_return = make_label("fun_return");
    return target === "val" && linkage !== "return"
           ? make_instruction_sequence(list("fun", "argl", "compapp"),
                                       all_regs,
                 list(assign("continue", label(linkage)),
                      save("continue"),
                      go_to(reg("compapp"))))
           : target !== "val" && linkage !== "return"
           ? make_instruction_sequence(list("fun", "argl", "compapp"),
                                       all_regs,
                 list(assign("continue", label(fun_return)),
                      save("continue"),
                      go_to(reg("compapp")),
                      fun_return,
                      assign(target, reg("val")),
                      go_to(label(linkage))))
           : target === "val" && linkage === "return"
           ? make_instruction_sequence(list("fun", "argl", "continue",
                                            "compapp"),
                                       all_regs,
                 list(save("continue"),
                      go_to(reg("compapp"))))
           : error(target, "return linkage, target not val -- compile");
}
`,
};
