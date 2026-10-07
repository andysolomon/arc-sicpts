import {
  compilerSource,
  ecevalApplicationFragment,
  ecevalCompiledControllerSource,
  ecevalControllerWithout,
  nameApplicationFragment,
  onlyDeclarations,
  smarterAppendReturnUndefined,
  withoutDeclarations,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §5.5.1 to §5.5.4. */

export const exercise_5_32: ExerciseSpec = {
  id: '5.32',
  prelude: `function check_same_set(xs, ys) {
    function within(as, bs) {
        return accumulate((a, ok) => ok && ! is_null(member(a, bs)), true, as);
    }
    return is_list(xs) && within(xs, ys) && within(ys, xs);
}`,
  starter: `// For each application, list the registers among "env", "argl"
// and "fun" that the compiled code still saves and restores
// (null if it saves none of them). The evaluator saves all three.
const saves_1 = list("env", "argl", "fun"); // f("x", "y")
const saves_2 = list("env", "argl", "fun"); // f()("x", "y")
const saves_3 = list("env", "argl", "fun"); // f(g("x"), y)
const saves_4 = list("env", "argl", "fun"); // f(g("x"), "y")
`,
  tests: [
    { name: 'f("x", "y")', kind: 'value', expr: 'check_same_set(saves_1, null)', expected: true },
    { name: 'f()("x", "y")', kind: 'value', expr: 'check_same_set(saves_2, null)', expected: true },
    { name: 'f(g("x"), y)', kind: 'value', expr: 'check_same_set(saves_3, list("argl", "fun"))', expected: true },
    { name: 'f(g("x"), "y")', kind: 'value', expr: 'check_same_set(saves_4, list("argl", "fun"))', expected: true },
  ],
  solution: `const saves_1 = null;                 // f("x", "y")
const saves_2 = null;                 // f()("x", "y")
const saves_3 = list("argl", "fun");  // f(g("x"), y)
const saves_4 = list("argl", "fun");  // f(g("x"), "y")
`,
};

const recursiveFactorial = `function factorial(n) {
    return n === 1
           ? 1
           : factorial(n - 1) * n;
}`;

/** Runs the evaluator built with the reader's application block, recording what it prints. */
const ecevalChecks = `${ecevalControllerWithout(['ev_operator_combination'])}
let check_values = null;
let check_statistics = null;
function check_run(inputs) {
    check_values = null;
    check_statistics = null;
    const machine = make_machine(
        list("comp", "env", "val", "fun", "argl", "continue", "unev"),
        append(eceval_operations,
               list(list("user_print",
                         (prompt, value) => {
                             check_values = pair(value, check_values);
                         }),
                    list("print_stack_statistics",
                         () => {
                             check_statistics =
                                 pair(machine("stack")("statistics"),
                                      check_statistics);
                         }))),
        eceval_controller_with(application_fragment));
    set_inputs(inputs);
    start(machine);
    return check_values;
}
function check_value(inputs) {
    check_run(inputs);
    return head(check_values);
}
function check_pushes(inputs) {
    check_run(inputs);
    return head(head(check_statistics));
}
`;

const quoted = (text: string) => JSON.stringify(text);

export const exercise_5_33: ExerciseSpec = {
  id: '5.33',
  context: ecevalChecks,
  starter: `// The application block of the evaluator, from ev_operator_combination
// to ev_appl_accum_last_arg. Change it so that an application whose
// function expression is a name looks the name up directly, without
// saving and restoring env and unev around it.
${ecevalApplicationFragment}`,
  tests: [
    {
      name: 'factorial(5) is 120',
      kind: 'value',
      expr: `check_value(list(${quoted(recursiveFactorial)}, "factorial(5);"))`,
      expected: 120,
    },
    {
      name: 'factorial(5) takes fewer than 145 pushes',
      kind: 'value',
      expr: `check_pushes(list(${quoted(recursiveFactorial)}, "factorial(5);")) < 145`,
      expected: true,
    },
    { name: 'a lambda expression as function expression', kind: 'value', expr: 'check_value(list("(x => x + 1)(2);"))', expected: 3 },
    {
      name: 'an application as function expression',
      kind: 'value',
      expr: 'check_value(list("function g() { return math_max; } g()(1, 7);"))',
      expected: 7,
    },
    { name: 'no arguments', kind: 'value', expr: 'check_value(list("function f() { return 5; } f();"))', expected: 5 },
    { name: 'a primitive function', kind: 'value', expr: 'check_value(list("math_abs(-4) + 1;"))', expected: 5 },
  ],
  budget: 5_000_000,
  solution: nameApplicationFragment,
};

const tBody = `function t(b) {
    if (b) {
        display("s1");
    } else {
        display("s2");
    }
}`;
const wBody = `function w(b) {
    if (b) {
        return 1;
    } else {
        display("s1");
    }
}`;
const mBody = `function m(b) {
    if (b) {
        return 1;
    } else {
        return 2;
    }
}`;
const hBody = `function h(b1, b2) {
    if (b1) {
        return 1;
    } else {
        if (b2) {
            display("s1");
        } else {
            return 2;
        }
    }
}`;

/** The compiler without append_return_undefined, the evaluator of §5.5.7, and helpers that count and run. */
const compilerChecks = `${withoutDeclarations(compilerSource, ['append_return_undefined'])}
${ecevalCompiledControllerSource}
const check_t = ${quoted(tBody)};
const check_w = ${quoted(wBody)};
const check_m = ${quoted(mBody)};
const check_h = ${quoted(hBody)};
function check_count_undefined_returns(component) {
    return is_return_statement(component)
           ? (is_literal(return_expression(component)) &&
              is_undefined(literal_value(return_expression(component)))
              ? 1 : 0)
           : is_sequence(component)
           ? accumulate((s, n) => check_count_undefined_returns(s) + n,
                        0, sequence_statements(component))
           : is_block(component)
           ? check_count_undefined_returns(block_body(component))
           : is_conditional(component)
           ? check_count_undefined_returns(conditional_consequent(component)) +
             check_count_undefined_returns(conditional_alternative(component))
           : 0;
}
function check_added(declaration) {
    const body = lambda_body(declaration_value_expression(
                     function_decl_to_constant_decl(parse(declaration))));
    return check_count_undefined_returns(append_return_undefined(body));
}
let check_printed = null;
function check_run(program, input) {
    check_printed = null;
    const machine = make_machine(
        list("comp", "env", "val", "fun", "argl", "continue", "unev"),
        append(eceval_operations,
               list(list("user_print",
                         (prompt, value) => { check_printed = value; }))),
        eceval_controller);
    const component = parse(program);
    const instrs = assemble(instructions(compile(component, "val", "return")),
                            machine);
    const names = scan_out_declarations(component);
    set_current_environment(extend_environment(names,
                                               list_of_unassigned(names),
                                               the_global_environment));
    set_register_contents(machine, "val", instrs);
    set_register_contents(machine, "flag", true);
    set_inputs(list(input));
    start(machine);
    return check_printed;
}
`;

export const exercise_5_35: ExerciseSpec = {
  id: '5.35',
  context: compilerChecks,
  starter: `// The book's version: rewrite it so that it adds return undefined;
// only at the end of paths that do not already return.
${onlyDeclarations(compilerSource, ['append_return_undefined'])}
`,
  tests: [
    { name: 't gets one or two returns', kind: 'value', expr: 'check_added(check_t) === 1 || check_added(check_t) === 2', expected: true },
    { name: 'w gets one return', kind: 'value', expr: 'check_added(check_w)', expected: 1 },
    { name: 'm gets no return', kind: 'value', expr: 'check_added(check_m)', expected: 0 },
    { name: 'h gets one return', kind: 'value', expr: 'check_added(check_h)', expected: 1 },
    { name: 'a body that is a return statement gets none', kind: 'value', expr: 'check_added("function f(x) { return x; }")', expected: 0 },
    {
      name: 'a body with declarations',
      kind: 'value',
      expr: 'check_added("function f(x) { const y = x; display(y); }")',
      expected: 1,
    },
    { name: 'compiled t returns undefined', kind: 'value', expr: 'check_run(check_t, "t(true);") === undefined', expected: true },
    { name: 'compiled w returns', kind: 'value', expr: 'check_run(check_w, "w(true);")', expected: 1 },
    { name: 'compiled w falls off the end', kind: 'value', expr: 'check_run(check_w, "w(false);") === undefined', expected: true },
    { name: 'compiled m', kind: 'value', expr: 'check_run(check_m, "m(false);")', expected: 2 },
    { name: 'compiled h, first branch', kind: 'value', expr: 'check_run(check_h, "h(true, true);")', expected: 1 },
    { name: 'compiled h, falling off the end', kind: 'value', expr: 'check_run(check_h, "h(false, true);") === undefined', expected: true },
    { name: 'compiled h, last return', kind: 'value', expr: 'check_run(check_h, "h(false, false);")', expected: 2 },
    {
      name: 'compiled factorial still works',
      kind: 'value',
      expr: `check_run(${quoted(recursiveFactorial)}, "factorial(5);")`,
      expected: 120,
    },
  ],
  budget: 5_000_000,
  solution: smarterAppendReturnUndefined,
};
