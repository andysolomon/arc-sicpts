/**
 * The programs of §4.1's pages. Each runs with the metacircular evaluator (or,
 * in §4.1.7, the analyzing evaluator) in its prelude, so a page shows only
 * the part the reader should look at.
 */

/** §4.1.1: one application, followed through `evaluate` and `apply`. */
export const evalApplyProgram = `evaluate_program(
    "function square(x) {" +
    "    return x * x;" +
    "}" +
    "square(3) + 1;");
`;

/** §4.1.1: a return value stops the sequence it is in. */
export const returnProgram = `evaluate_program(
    "function first_positive(a, b) {" +
    "    if (a > 0) {" +
    "        return a;" +
    "    } else {}" +
    "    display(\\"a was not positive\\");" +
    "    return b;" +
    "}" +
    "first_positive(5, 7) + first_positive(-1, 7);");
`;

/** §4.1.2: program text to tagged lists. */
export const parseProgram = `parse("const size = 2; 5 * size;");
`;

/** §4.1.2: syntax selectors, and an operator combination as a derived component. */
export const selectorsProgram = `const program = parse("const size = 2; 5 * size;");
const statements = sequence_statements(program);
const declaration = first_statement(statements);
const product = first_statement(rest_statements(statements));

display(declaration_symbol(declaration));
display(literal_value(declaration_value_expression(declaration)));
operator_combination_to_application(product);
`;

/** §4.1.3: an environment as a list of frames, each a pair of lists. */
export const environmentProgram = `const outer = extend_environment(list("x"), list(3),
                                 the_empty_environment);
const env = extend_environment(list("x", "y"), list(1, 2), outer);

display(lookup_symbol_value("x", env));
display(lookup_symbol_value("x", outer));
assign_symbol_value("y", 20, env);
first_frame(env);
`;

/** §4.1.3: what a compound function is, to the evaluator. */
export const functionObjectProgram = `const f = evaluate_program("x => x * x;");

display(head(f));
display(function_parameters(f));
display(function_body(f));
length(function_environment(f));
`;

/** §4.1.4: the driver loop, fed a list of inputs instead of a prompt. */
export const driverLoopProgram = `driver_loop(the_global_environment,
            list("function append(xs, ys) {" +
                 "    return is_null(xs)" +
                 "           ? ys" +
                 "           : pair(head(xs), append(tail(xs), ys));" +
                 "}",
                 'append(list("a", "b", "c"), list("d", "e", "f"));'));
`;

/** §4.1.4: any function of the underlying language can be a primitive. */
export const newPrimitiveProgram = `const env = extend_environment(
                list("square", "map"),
                list(list("primitive", x => x * x),
                     list("primitive", map)),
                the_global_environment);

display(evaluate(parse("square(5) + 1;"), env));
evaluate(parse("map(x => x + 1, list(1, 2, 3));"), env);
`;

/** §4.1.5: a program built as data, never written as text. */
export const dataAsProgramProgram = `const program =
    make_application(make_name("*"),
                     list(make_literal(5), make_literal(5)));

display(program);
evaluate(program, the_global_environment);
`;

/** §4.1.5: the evaluator, configured by its input as a factorial machine. */
export const factorialMachineProgram = `evaluate_program(
    "function factorial(n) {" +
    "    return n === 1" +
    "           ? 1" +
    "           : factorial(n - 1) * n;" +
    "}" +
    "factorial(5);");
`;

/** §4.1.6: mutually recursive internal declarations. */
export const mutualRecursionProgram = `evaluate_program(
    "function f(x) {" +
    "    function is_even(n) {" +
    "        return n === 0 ? true : is_odd(n - 1);" +
    "    }" +
    "    function is_odd(n) {" +
    "        return n === 0 ? false : is_even(n - 1);" +
    "    }" +
    "    return is_even(x);" +
    "}" +
    "f(7);");
`;

/** §4.1.6: a name used before its declaration has been evaluated (Exercise 4.19). */
export const scopeQuestionProgram = `evaluate_program(
    "const a = 1;" +
    "function f(x) {" +
    "    const b = a + x;" +
    "    const a = 5;" +
    "    return a + b;" +
    "}" +
    "f(10);");
`;

/** §4.1.6: the same program, run by the Laboratory's own evaluator. */
export const scopeQuestionDirectProgram = `const a = 1;
function f(x) {
    const b = a + x;
    const a = 5;
    return a + b;
}
f(10);
`;

/** §4.1.6: recursion without declarations or assignment. */
export const selfApplicationProgram = `(n => (fact => fact(fact, n))
      ((ft, k) => k === 1
                  ? 1
                  : k * ft(ft, k - 1)))(10);
`;

/** §4.1.7: the same program for both evaluators, so their step counts compare. */
export const analysisComparisonProgram = `evaluate_program(
    "function factorial(n) {" +
    "    return n === 1" +
    "           ? 1" +
    "           : factorial(n - 1) * n;" +
    "}" +
    "factorial(10);");
`;
