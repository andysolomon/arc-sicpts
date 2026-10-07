/**
 * Programs for the examples of section 5.5 (its introduction and §5.5.1 to
 * §5.5.4). The compiler itself is in `compiler.ts`; the editors that call
 * `compile` run with `compilerSource` as their prelude, and the ones under a
 * `compiled` animation hold plain programs, which the scene compiles with
 * target `val` and linkage `"next"`.
 */

import { ecevalApplication } from './eceval.ts';

/** The overview's application, with a primitive so that it also runs: no register needs saving. */
export const compilationOverviewProgram = `math_max(96, 22);
`;

/** §5.5.1: the three parts of an instruction sequence, for the book's lookup of x with a "return" linkage. */
export const instructionSequenceProgram = `const seq = compile(parse("x;"), "val", "return");

display_list(registers_needed(seq));
display_list(registers_modified(seq));
display_instructions(instructions(seq));
`;

/** §5.5.1: `preserving` saves env around the first statement only because the second needs it. */
export const preservingSequenceProgram = `display("first");
math_PI * 2;
`;

/** §5.5.2: a name compiled with a linkage the reader can change. */
export const nameLinkageProgram = `// The name x, compiled with target "val" and linkage "next".
// Try the linkage "return", a label such as "after_call",
// or another target such as "fun".
display_instructions(instructions(compile(parse("x;"), "val", "next")));
`;

/** §5.5.2: a conditional whose predicate is an application, so env is saved around it. */
export const compiledConditionalProgram = `const n = 3;
n === 0 ? 1 : n * 2;
`;

/** §5.5.2: a function whose body returns on every path, still followed by the appended return of undefined. */
export const compiledFunctionProgram = `function abs(x) {
    if (x < 0) {
        return -x;
    } else {
        return x;
    }
}
`;

/** §5.5.3: an argument list in which one argument is an application. */
export const compiledArgumentsProgram = `math_max(1, math_abs(5), 3);
`;

/** §5.5.3: a function expression that is itself an application is compiled with target fun. */
export const funTargetProgram = `// The function expression f() is compiled with target "fun":
// after its call returns, the value is copied from val to fun.
display_instructions(instructions(compile(parse("f()(x);"), "val", "next")));
`;

/** §5.5.3: a call in a return statement is compiled with linkage "return". */
export const compiledTailCallProgram = `function count_down(n) {
    return n === 0 ? "done" : count_down(n - 1);
}
count_down(3);
`;

/** §5.5.4: `preserving` used directly on two instruction sequences. */
export const preservingProgram = `const call = compile(parse("math_abs(x);"), "val", "next");
const look_up = compile(parse("y;"), "val", "return");

display_list(registers_needed(call));
display_list(registers_modified(call));
display_list(registers_needed(look_up));

const both = preserving(list("env", "continue"), call, look_up);
display_list(registers_needed(both));
display_instructions(instructions(both));
`;

/** §5.5.4: a lambda expression (tack_on_instruction_sequence) with a conditional body (parallel sequences). */
export const compiledLambdaProgram = `x => x < 0 ? -x : x;
`;

/** Exercise 5.33: the evaluator's application block as a list, the starting point. */
export const ecevalApplicationFragment = `const application_fragment = list(
  ${ecevalApplication.replace(/,\s*$/, '').split('\n').join('\n  ')});
`;

/**
 * Exercise 5.33: the application block of the evaluator, with applications
 * whose function expression is a name looked up directly into fun, without
 * saving env and unev around the evaluation of the function expression.
 */
export const nameApplicationFragment = `const application_fragment = list(
  "ev_operator_combination",
    assign("comp", list(op("operator_combination_to_application"),
                        reg("comp"))),
  "ev_application",
    save("continue"),
    assign("unev", list(op("arg_expressions"), reg("comp"))),
    assign("comp", list(op("function_expression"), reg("comp"))),
    test(list(op("is_name"), reg("comp"))),
    branch(label("ev_appl_name_function_expression")),
    save("env"),
    save("unev"),
    assign("continue", label("ev_appl_did_function_expression")),
    go_to(label("eval_dispatch")),
  "ev_appl_name_function_expression",
    assign("fun", list(op("symbol_of_name"), reg("comp"))),
    assign("fun", list(op("lookup_symbol_value"),
                       reg("fun"), reg("env"))),
    go_to(label("ev_appl_have_function")),
  "ev_appl_did_function_expression",
    restore("unev"), // the argument expressions
    restore("env"),
    assign("fun", reg("val")), // the function
  "ev_appl_have_function",
    assign("argl", list(op("empty_arglist"))),
    test(list(op("is_null"), reg("unev"))),
    branch(label("apply_dispatch")),
    save("fun"),
  "ev_appl_argument_expression_loop",
    save("argl"),
    assign("comp", list(op("head"), reg("unev"))),
    test(list(op("is_last_argument_expression"), reg("unev"))),
    branch(label("ev_appl_last_arg")),
    save("env"),
    save("unev"),
    assign("continue", label("ev_appl_accumulate_arg")),
    go_to(label("eval_dispatch")),
  "ev_appl_accumulate_arg",
    restore("unev"),
    restore("env"),
    restore("argl"),
    assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
    assign("unev", list(op("tail"), reg("unev"))),
    go_to(label("ev_appl_argument_expression_loop")),
  "ev_appl_last_arg",
    assign("continue", label("ev_appl_accum_last_arg")),
    go_to(label("eval_dispatch")),
  "ev_appl_accum_last_arg",
    restore("argl"),
    assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
    restore("fun"),
    go_to(label("apply_dispatch")));
`;

/** Exercise 5.35: a version of append_return_undefined that adds a return only where a path lacks one. */
export const smarterAppendReturnUndefined = `function always_returns(stmt) {
    return is_return_statement(stmt)
           ? true
           : is_sequence(stmt)
           ? accumulate((s, found) => found || always_returns(s),
                        false, sequence_statements(stmt))
           : is_block(stmt)
           ? always_returns(block_body(stmt))
           : is_conditional(stmt)
           ? always_returns(conditional_consequent(stmt)) &&
             always_returns(conditional_alternative(stmt))
           : false;
}

function append_return_undefined(body) {
    return always_returns(body)
           ? body
           : list("sequence", list(body,
                                   list("return_statement",
                                        list("literal", undefined))));
}
`;
