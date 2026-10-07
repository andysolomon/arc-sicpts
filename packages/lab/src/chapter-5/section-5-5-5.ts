import { compileAndGoPrelude, compileApplication, compileCombining, compilerSource } from './compiler.ts';
import { ecevalCompiledControllerSource, ecevalMachineSource, quote } from './eceval.ts';
import { factorialController, fibController } from './machines.ts';
import { onlyDeclarations, withoutDeclarations } from './pieces.ts';

/**
 * Programs for the examples of sections 5.5.5 to 5.5.7, and the Source text
 * that the exercises of those sections run the reader's code in.
 * `section-5-5-5.test.ts` asserts what the pages say about them.
 */

// §5.5.5 An Example of Compiled Code

/** The declaration the book compiles in §5.5.5. */
export const compiledCodeFactorialProgram = `function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}
`;

/** The declaration of exercise 5.36. */
export const compiledCodeAlternativeProgram = `function factorial_alt(n) {
    return n === 1
           ? 1
           : n * factorial_alt(n - 1);
}
`;

/** The iterative factorial of exercise 5.37. */
export const compiledCodeIterativeProgram = `function factorial(n) {
    function iter(product, counter) {
        return counter > n
               ? product
               : iter(product * counter, counter + 1);
    }
    return iter(1, 1);
}
`;

/** The program the code of exercise 5.38 was compiled from. */
export const compiledCodeMysteryProgram = `function f(x) {
    return x + g(x + 2);
}`;

/**
 * The code of the figure in exercise 5.38, one instruction per line, in the
 * notation of \`display_instructions\`. (The book's figure leaves out the
 * \`go_to\` that skips the function body.)
 */
export const compiledCodeFigure = `  assign("val", list(op("make_compiled_function"), label("entry1"), reg("env"))),
  go_to(label("after_lambda2")),
"entry1",
  assign("env", list(op("compiled_function_env"), reg("fun"))),
  assign("env", list(op("extend_environment"), constant(list("x")), reg("argl"), reg("env"))),
  revert_stack_to_marker(),
  restore("continue"),
  assign("fun", list(op("lookup_symbol_value"), constant("+"), reg("env"))),
  save("continue"),
  save("fun"),
  save("env"),
  assign("fun", list(op("lookup_symbol_value"), constant("g"), reg("env"))),
  save("fun"),
  assign("fun", list(op("lookup_symbol_value"), constant("+"), reg("env"))),
  assign("val", constant(2)),
  assign("argl", list(op("list"), reg("val"))),
  assign("val", list(op("lookup_symbol_value"), constant("x"), reg("env"))),
  assign("argl", list(op("pair"), reg("val"), reg("argl"))),
  test(list(op("is_primitive_function"), reg("fun"))),
  branch(label("primitive_branch3")),
"compiled_branch4",
  assign("continue", label("after_call5")),
  save("continue"),
  push_marker_to_stack(),
  assign("val", list(op("compiled_function_entry"), reg("fun"))),
  go_to(reg("val")),
"primitive_branch3",
  assign("val", list(op("apply_primitive_function"), reg("fun"), reg("argl"))),
"after_call5",
  assign("argl", list(op("list"), reg("val"))),
  restore("fun"),
  test(list(op("is_primitive_function"), reg("fun"))),
  branch(label("primitive_branch7")),
"compiled_branch8",
  assign("continue", label("after_call9")),
  save("continue"),
  push_marker_to_stack(),
  assign("val", list(op("compiled_function_entry"), reg("fun"))),
  go_to(reg("val")),
"primitive_branch7",
  assign("val", list(op("apply_primitive_function"), reg("fun"), reg("argl"))),
"after_call9",
  assign("argl", list(op("list"), reg("val"))),
  restore("env"),
  assign("val", list(op("lookup_symbol_value"), constant("x"), reg("env"))),
  assign("argl", list(op("pair"), reg("val"), reg("argl"))),
  restore("fun"),
  restore("continue"),
  test(list(op("is_primitive_function"), reg("fun"))),
  branch(label("primitive_branch11")),
"compiled_branch12",
  save("continue"),
  push_marker_to_stack(),
  assign("val", list(op("compiled_function_entry"), reg("fun"))),
  go_to(reg("val")),
"primitive_branch11",
  assign("val", list(op("apply_primitive_function"), reg("fun"), reg("argl"))),
  go_to(reg("continue")),
"after_call13",
"after_lambda2",
  perform(list(op("assign_symbol_value"), constant("f"), reg("val"), reg("env"))),
  assign("val", constant(undefined)),
`;

/** The figure as \`check_code_text\` prints it: one instruction per line, no indentation or commas. */
export const compiledCodeFigureText = compiledCodeFigure
  .split('\n')
  .filter((line) => line !== '')
  .map((line) => `${line.trim().replace(/,$/, '')}\n`)
  .join('');

/** For exercise 5.38: compiling a program from a fresh label counter and comparing it with the figure. */
export const compiledCodeCompareHelpers = `function check_code_text(program) {
    label_counter = 0;
    return accumulate((instruction, rest) =>
                          stringify_instruction(instruction) + "\\n" + rest,
                      "",
                      instructions(compile(parse(program), "val", "next")));
}
`;

/** Exercise 5.38: the compiler, and a check that a program compiles to the figure's code. */
export const compiledCodeFigurePrelude = `${compilerSource}
${compiledCodeCompareHelpers}
const check_figure = ${quote(compiledCodeFigureText)};

function check_same_code(program) {
    return check_code_text(program) === check_figure;
}
`;

/** Counting instructions of a kind (`"save"`, `"restore"`) in compiled code. */
export const compiledCodeCountHelpers = `function check_count(kind, program) {
    return length(filter(instruction => is_pair(instruction) &&
                                        head(instruction) === kind,
                         instructions(compile(parse(program),
                                              "val", "next"))));
}
`;

/**
 * Running a program with \`compile_and_go\` on the inputs, and returning what
 * the evaluator last printed (the value left in \`val\`).
 */
export const compileAndGoHelpers = `function check_compile_and_go(program, inputs) {
    set_inputs(inputs);
    compile_and_go(parse(program));
    return get_register_contents(eceval, "val");
}
`;

/** Exercise 5.39: the compiler and evaluator without the functions that build argument lists. */
export const argumentOrderContext = `${withoutDeclarations(compileAndGoPrelude, ['construct_arglist', 'code_to_get_rest_args'])}
${compileAndGoHelpers}`;

/** The two functions exercise 5.39 changes, as §5.5.3 has them. */
export const argumentOrderFunctions = onlyDeclarations(compileApplication, ['construct_arglist', 'code_to_get_rest_args']);

/** Exercise 5.40: everything but `preserving`. */
export const alwaysPreservingContext = `${withoutDeclarations(compileAndGoPrelude, ['preserving'])}
${compileAndGoHelpers}
${compiledCodeCountHelpers}`;

/** `preserving` as §5.5.4 has it. */
export const preservingFunction = onlyDeclarations(compileCombining, ['preserving']);

/**
 * Exercise 5.41: the evaluator machine with argument registers `arg1` and
 * `arg2` and the machine operations `+`, `-`, `*` and `===`; compiled
 * function calls now modify the argument registers too.
 */
export const openCodingMachine = `const all_regs = list("env", "fun", "val", "argl", "continue",
                        "arg1", "arg2");

const eceval =
    make_machine(list("comp", "env", "val", "fun",
                      "argl", "continue", "unev", "arg1", "arg2"),
                 append(eceval_operations,
                        list(list("+", (x, y) => x + y),
                             list("-", (x, y) => x - y),
                             list("*", (x, y) => x * y),
                             list("===", (x, y) => x === y))),
                 eceval_controller);
`;

/** Which names compiled code looks up with `lookup_symbol_value`. */
export const lookupHelpers = `function check_looks_up(symbol, program) {
    label_counter = 0;
    return ! is_null(filter(instruction =>
                                is_pair(instruction) &&
                                head(instruction) === "assign" &&
                                is_pair(head(tail(tail(instruction)))) &&
                                equal(head(head(tail(tail(instruction)))),
                                      op("lookup_symbol_value")) &&
                                equal(head(tail(head(tail(tail(instruction))))),
                                      constant(symbol)),
                            instructions(compile(parse(program),
                                                 "val", "next"))));
}
`;

export const openCodingContext = `${withoutDeclarations(compileAndGoPrelude, ['compile', 'all_regs', 'eceval'])}
${openCodingMachine}
${compileAndGoHelpers}
${lookupHelpers}`;

/** `compile` as §5.5.1 has it. */
export const compileFunction = onlyDeclarations(compilerSource, ['compile']);

/**
 * Exercise 5.50: the evaluator with a register `compapp` holding the label
 * `compound_apply`, set before anything else runs.
 */
export const compappController = ecevalCompiledControllerSource.replace(
  'branch(label("external_entry")), // branches if flag is set',
  'assign("compapp", label("compound_apply")),\n  branch(label("external_entry")), // branches if flag is set',
);

export const compappContext = `${withoutDeclarations(compileAndGoPrelude, ['compile_function_call', 'eceval_controller', 'eceval'])}
${compappController}
${ecevalMachineSource.replace('"unev")', '"unev", "compapp")')}
${compileAndGoHelpers}`;

/** `compile_function_call` as §5.5.3 has it. */
export const compileFunctionCallFunction = onlyDeclarations(compileApplication, ['compile_function_call']);

// §5.5.6 Lexical Addressing

/** The book's example, applied so that the innermost body runs. */
export const lexicalAddressingFramesProgram = `((x, y) =>
   (a, b, c, d, e) =>
     ((y, z) => x * y * z)(a * b * x, c + d + x))(3, 4)(1, 2, 3, 4, 5);
`;

/** The runtime environment at the point where `x * y * z` is evaluated, and the cost of looking `x` up in it. */
export const lexicalAddressingSearchProgram = `const env =
    extend_environment(list("y", "z"), list(6, 10),
        extend_environment(list("a", "b", "c", "d", "e"),
                           list(1, 2, 3, 4, 5),
            extend_environment(list("x", "y"), list(3, 4),
                               the_global_environment)));

// How many symbols lookup_symbol_value compares before it finds one.
function comparisons(symbol, env) {
    function scan(symbols, count, env) {
        return is_null(symbols)
               ? scan(frame_symbols(first_frame(enclosing_environment(env))),
                      count, enclosing_environment(env))
               : head(symbols) === symbol
               ? count + 1
               : scan(tail(symbols), count + 1, env);
    }
    return scan(frame_symbols(first_frame(env)), 0, env);
}

display(lookup_symbol_value("x", env));
comparisons("x", env);
`;

/** Exercise 5.42: a runtime environment with an unassigned name in it. */
export const lexicalAddressEnvironment = `function check_environment() {
    return extend_environment(list("y", "z"), list(6, 10),
               extend_environment(list("a", "b", "c", "d", "e"),
                                  list(1, 2, 3, 4, "*unassigned*"),
                   extend_environment(list("x", "y"), list(3, 4),
                                      the_global_environment)));
}

function check_assign_then_lookup(address, value) {
    const env = check_environment();
    lexical_address_assign(address, value, env);
    return lexical_address_lookup(address, env);
}
`;

// §5.5.7 Interfacing Compiled Code to the Evaluator

/** The book's first use of `compile_and_go`, followed by a call typed at the evaluator. */
export const interfacingCompileAndGoProgram = `set_inputs(list("factorial(5);"));
compile_and_go(parse(\`
function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}\`));
`;

export const interfacingCompareProgram = `function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}
factorial(2);
factorial(4);
factorial(6);
factorial(8);
factorial(10);
`;

/** The special-purpose factorial machine of §5.1.4, measured as the compare scene asks. */
export const interfacingSpecialFactorial = `${factorialController}
const factorial_machine =
    make_machine(list("n", "val", "continue"),
                 list(list("=", (a, b) => a === b),
                      list("*", (a, b) => a * b),
                      list("-", (a, b) => a - b)),
                 controller_sequence(factorial_recursive_controller));

function special_statistics(n) {
    factorial_machine("stack")("initialize");
    set_register_contents(factorial_machine, "n", n);
    start(factorial_machine);
    const statistics = factorial_machine("stack")("statistics");
    return list(get_register_contents(factorial_machine, "val"),
                head(statistics), head(tail(statistics)));
}
`;

export const interfacingFibCompareProgram = `function fib(n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
fib(2);
fib(4);
fib(6);
fib(8);
fib(10);
`;

/** The special-purpose Fibonacci machine of §5.1.4, measured as the compare scene asks. */
export const interfacingSpecialFib = `${fibController}
const fib_machine =
    make_machine(list("n", "val", "continue"),
                 list(list("<", (a, b) => a < b),
                      list("-", (a, b) => a - b),
                      list("+", (a, b) => a + b)),
                 controller_sequence(fib_recursive_controller));

function special_statistics(n) {
    fib_machine("stack")("initialize");
    set_register_contents(fib_machine, "n", n);
    start(fib_machine);
    const statistics = fib_machine("stack")("statistics");
    return list(get_register_contents(fib_machine, "val"),
                head(statistics), head(tail(statistics)));
}
`;
