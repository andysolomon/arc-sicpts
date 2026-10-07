/**
 * Programs for the examples of section 5.4. Except for the first, each runs
 * the explicit-control evaluator: the page supplies `eceval_controller` and
 * `eceval` (`ecevalControllerSource + ecevalMachineSource`) as the prelude,
 * and the program queues the inputs the driver loop reads and starts it.
 */

/** §5.4: a program as the tagged list `parse` makes of it, and the syntax functions that take it apart. */
export const ecevalParseProgram = `const program = parse("const size = 2; 5 * size;");
display_list(program);

const declaration = first_statement(sequence_statements(program));
display(is_declaration(declaration));
display(declaration_symbol(declaration));
declaration_value_expression(declaration);
`;

/** §5.4: the evaluator reads a function declaration and an application, and evaluates them. */
export const ecevalFactorialProgram = `set_inputs(list(\`function factorial(n) {
    return n === 1 ? 1 : factorial(n - 1) * n;
}\`, "factorial(3);"));
start(eceval);
`;

/** §5.4.1: a sequence of a literal and a conditional whose alternative is a name. */
export const ecevalSimpleProgram = `set_inputs(list(\`"one"; false ? 1 : math_PI;\`));
start(eceval);
`;

/** §5.4.2: an application of a primitive function with an operator combination as argument. */
export const ecevalArgumentsProgram = `set_inputs(list("math_max(3, 4 + 1);"));
start(eceval);
`;

/** §5.4.2: a function that calls itself in a return statement, as \`count\` does, but stops at k. */
export const ecevalCountProgram = `set_inputs(list(\`function count(n, k) {
    display(n);
    return n === k ? n : count(n + 1, k);
}\`, "count(1, 3);"));
start(eceval);
`;

/** §5.4.3: a declaration, a block that declares a name and assigns to another, and a lookup. */
export const ecevalBlockProgram = `set_inputs(list("let x = 1;",
                "{ const y = 2; x = x + y; }",
                "x;"));
start(eceval);
`;

/** §5.4.4: the book's interaction with the evaluator. */
export const ecevalAppendProgram = `set_inputs(list(\`function append(x, y) {
    return is_null(x)
           ? y
           : pair(head(x), append(tail(x), y));
}\`, \`append(list("a", "b", "c"), list("d", "e", "f"));\`));
start(eceval);
`;

/** §5.4.4: the monitored evaluator on recursive factorial for n from 1 to 5. */
export const ecevalStatisticsProgram = `set_inputs(list(\`function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}\`, "factorial(1);", "factorial(2);", "factorial(3);",
     "factorial(4);", "factorial(5);"));
start(eceval);
`;

/** §5.4.4: iterative factorial, then recursive factorial, of 4, in one run. */
export const ecevalTailProgram = `set_inputs(list(\`function factorial(n) {
    function iter(product, counter) {
        return counter > n
               ? product
               : iter(counter * product, counter + 1);
    }
    return iter(1, 1);
}\`, "factorial(4);",
\`function fact_rec(n) {
    return n === 1 ? 1 : fact_rec(n - 1) * n;
}\`, "fact_rec(4);"));
start(eceval);
`;
