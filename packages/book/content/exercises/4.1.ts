import {
  analyzingEvaluator,
  evaluatorCore,
  evaluatorSyntax,
  metacircularEvaluator,
  omit,
  pick,
  type TestSpec,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/**
 * Exercises of §4.1. Most of them change the metacircular evaluator: the
 * reader's editor holds the functions to change, and the rest of the evaluator
 * follows in the postlude, in the same frame, so that it calls the reader's
 * versions. Tests then run programs through the changed evaluator.
 */

/** Enough steps for a few programs run by an evaluator that is itself being evaluated. */
const BUDGET = 5_000_000;

/** The rest of the evaluator, without the declarations the reader writes. */
const rest = (...names: string[]): string => omit(metacircularEvaluator, ...names);

/** The book's declarations of the named functions, as the reader starts from them. */
const book = (...names: string[]): string => `${pick(metacircularEvaluator, ...names)}\n`;

const run = (program: string): string => `evaluate_program(${JSON.stringify(program)})`;

export const exercise_4_1: ExerciseSpec = {
  id: '4.1',
  postlude: `${rest('list_of_values')}
let list_of_values_in_use = list_of_values_left_to_right;
function list_of_values(exps, env) {
    return list_of_values_in_use(exps, env);
}
function evaluate_in_order(order, program) {
    list_of_values_in_use = order;
    return evaluate_program(program);
}`,
  starter: `// The rest of the evaluator is provided; both functions are used in place
// of list_of_values. evaluate, head, tail, pair and is_null are available.

function list_of_values_left_to_right(exps, env) {
    // your answer
}

function list_of_values_right_to_left(exps, env) {
    // your answer
}
`,
  tests: [
    {
      name: 'left to right',
      kind: 'value',
      expr: `equal(evaluate_in_order(list_of_values_left_to_right, "let x = 1; function f(a, b) { return list(a, b); } f(x = x + 1, x = x * 10);"), list(2, 20))`,
      expected: true,
    },
    {
      name: 'right to left',
      kind: 'value',
      expr: `equal(evaluate_in_order(list_of_values_right_to_left, "let x = 1; function f(a, b) { return list(a, b); } f(x = x + 1, x = x * 10);"), list(11, 10))`,
      expected: true,
    },
    {
      name: 'right to left still applies functions to their arguments in order',
      kind: 'value',
      expr: `evaluate_in_order(list_of_values_right_to_left, "function f(a, b, c) { return a - b * c; } f(10, 2, 3);")`,
      expected: 4,
    },
    { name: 'no arguments', kind: 'value', expr: `evaluate_in_order(list_of_values_right_to_left, "(() => 7)();")`, expected: 7 },
  ],
  budget: BUDGET,
  solution: `function list_of_values_left_to_right(exps, env) {
    if (is_null(exps)) {
        return null;
    } else {
        const first = evaluate(head(exps), env);
        const rest = list_of_values_left_to_right(tail(exps), env);
        return pair(first, rest);
    }
}

function list_of_values_right_to_left(exps, env) {
    if (is_null(exps)) {
        return null;
    } else {
        const rest = list_of_values_right_to_left(tail(exps), env);
        const first = evaluate(head(exps), env);
        return pair(first, rest);
    }
}
`,
};

/** True when `unparse` turns a program back into text that parses to the same tagged list. */
const roundTrip = `function round_trips(text) {
    const component = parse(text);
    const statement = is_sequence(component) || is_block(component) ||
                      is_declaration(component) || is_return_statement(component) ||
                      is_tagged_list(component, "conditional_statement");
    const back = unparse(component);
    return equal(parse(statement ? back : back + ";"), component);
}`;

export const exercise_4_2: ExerciseSpec = {
  id: '4.2',
  prelude: `${evaluatorSyntax}`,
  postlude: roundTrip,
  starter: `// The syntax functions of §4.1.2 are provided. unparse(component) should
// return text that parse turns back into the same component: an expression
// gives the text of the expression, a statement the text of the statement.
// A lambda expression whose body is a return statement was written with an
// expression as its body.

function unparse(component) {
    // your answer
}
`,
  tests: [
    { name: 'literals and names', kind: 'value', expr: 'round_trips("\\"hello\\";") && round_trips("null;") && round_trips("size;")', expected: true },
    { name: 'precedence', kind: 'value', expr: 'round_trips("(1 + 2) * 3;") && round_trips("1 + 2 * 3 - -x;")', expected: true },
    { name: 'declarations and sequences', kind: 'value', expr: 'round_trips("const size = 2; let n = 5 * size; n = n + 1; !(n > 3);")', expected: true },
    {
      name: 'functions, conditionals and returns',
      kind: 'value',
      expr: 'round_trips("function f(x) { if (x > 0) { return x; } else { return x === 0 ? 1 : -x; } } f(3);")',
      expected: true,
    },
    { name: 'lambda expressions and applications', kind: 'value', expr: 'round_trips("(x => x * x)(f(1, 2)) && (() => { const y = 1; return y; })();")', expected: true },
  ],
  solution: `function comma_separated(strings) {
    return is_null(strings)
           ? ""
           : is_null(tail(strings))
           ? head(strings)
           : head(strings) + ", " + comma_separated(tail(strings));
}

function unparse_statement(component) {
    const is_statement = is_sequence(component) || is_block(component) ||
                         is_declaration(component) || is_return_statement(component) ||
                         is_tagged_list(component, "conditional_statement");
    return is_statement ? unparse(component) : unparse(component) + ";";
}

// A body or branch in braces: parse leaves out the block when it declares nothing.
function unparse_body(component) {
    return is_block(component)
           ? unparse(component)
           : "{ " + unparse_statement(component) + " }";
}

function unparse(component) {
    return is_literal(component)
           ? stringify(literal_value(component))
           : is_name(component)
           ? symbol_of_name(component)
           : is_application(component)
           ? unparse(function_expression(component)) + "(" +
             comma_separated(map(unparse, arg_expressions(component))) + ")"
           : is_unary_operator_combination(component)
           ? "(" + (operator_symbol(component) === "-unary" ? "-" : "!") +
             unparse(first_operand(component)) + ")"
           : is_binary_operator_combination(component) ||
             is_tagged_list(component, "logical_composition")
           ? "(" + unparse(first_operand(component)) + " " +
             operator_symbol(component) + " " +
             unparse(second_operand(component)) + ")"
           : is_tagged_list(component, "conditional_expression")
           ? "(" + unparse(conditional_predicate(component)) + " ? " +
             unparse(conditional_consequent(component)) + " : " +
             unparse(conditional_alternative(component)) + ")"
           : is_tagged_list(component, "conditional_statement")
           ? "if (" + unparse(conditional_predicate(component)) + ") " +
             unparse_body(conditional_consequent(component)) + " else " +
             (is_tagged_list(conditional_alternative(component), "conditional_statement")
              ? unparse(conditional_alternative(component))
              : unparse_body(conditional_alternative(component)))
           : is_lambda_expression(component)
           ? "((" + comma_separated(lambda_parameter_symbols(component)) + ") => " +
             (is_return_statement(lambda_body(component))
              ? unparse(return_expression(lambda_body(component)))
              : unparse_body(lambda_body(component))) + ")"
           : is_sequence(component)
           ? accumulate((s, rest) => s + " " + rest, "",
                        map(unparse_statement, sequence_statements(component)))
           : is_block(component)
           ? "{ " + unparse_statement(block_body(component)) + " }"
           : is_return_statement(component)
           ? "return " + unparse(return_expression(component)) + ";"
           : is_function_declaration(component)
           ? "function " + symbol_of_name(function_declaration_name(component)) +
             "(" + comma_separated(map(symbol_of_name,
                                       function_declaration_parameters(component))) +
             ") " + unparse_body(function_declaration_body(component))
           : is_declaration(component)
           ? (is_tagged_list(component, "constant_declaration") ? "const " : "let ") +
             declaration_symbol(component) + " = " +
             unparse(declaration_value_expression(component)) + ";"
           : is_assignment(component)
           ? "(" + assignment_symbol(component) + " = " +
             unparse(assignment_value_expression(component)) + ")"
           : error(component, "unknown syntax -- unparse");
}
`,
};

const table = `let the_table = null;
function put(op, type, item) {
    the_table = pair(pair(pair(op, type), item), the_table);
}
function get(op, type) {
    function find(entries) {
        return is_null(entries)
               ? undefined
               : head(head(head(entries))) === op &&
                 tail(head(head(entries))) === type
               ? tail(head(entries))
               : find(tail(entries));
    }
    return find(the_table);
}`;

export const exercise_4_3: ExerciseSpec = {
  id: '4.3',
  prelude: `${table}`,
  postlude: `${rest('evaluate')}
function evaluate_double(n) {
    put("evaluate", "double",
        (component, env) => 2 * evaluate(head(tail(component)), env));
    return evaluate(list("double", make_literal(n)), the_global_environment);
}`,
  starter: `// put(op, type, item) and get(op, type) are provided; get gives undefined
// when nothing was put. The rest of the evaluator is provided too. Make
// evaluate look up what to do under ("evaluate", tag), where the tag is
// head(component), and install a function (component, env) => ... for
// each kind of component. The evaluator's own functions are declared after
// your code, so refer to them only inside the functions you install.

${book('evaluate')}`,
  tests: [
    { name: 'literals, names and applications', kind: 'value', expr: run('math_abs(-2) + 1;'), expected: 3 },
    {
      name: 'declarations, conditionals, recursion',
      kind: 'value',
      expr: run('function fact(n) { return n === 0 ? 1 : n * fact(n - 1); } fact(5);'),
      expected: 120,
    },
    {
      name: 'blocks, assignment and conditional statements',
      kind: 'value',
      expr: run('let k = 0; function f(x) { if (x > 0) { k = k + x; return k; } else { return -1; } } f(2); f(3);'),
      expected: 5,
    },
    { name: 'a new syntactic form needs no change to evaluate', kind: 'value', expr: 'evaluate_double(21)', expected: 42 },
  ],
  budget: BUDGET,
  solution: `function evaluate(component, env) {
    const handler = get("evaluate", head(component));
    return is_undefined(handler)
           ? error(component, "unknown syntax -- evaluate")
           : handler(component, env);
}

put("evaluate", "literal", (component, env) => literal_value(component));
put("evaluate", "name",
    (component, env) => lookup_symbol_value(symbol_of_name(component), env));
put("evaluate", "application",
    (component, env) => apply(evaluate(function_expression(component), env),
                              list_of_values(arg_expressions(component), env)));
put("evaluate", "unary_operator_combination",
    (component, env) => evaluate(operator_combination_to_application(component), env));
put("evaluate", "binary_operator_combination",
    (component, env) => evaluate(operator_combination_to_application(component), env));
put("evaluate", "conditional_expression",
    (component, env) => eval_conditional(component, env));
put("evaluate", "conditional_statement",
    (component, env) => eval_conditional(component, env));
put("evaluate", "lambda_expression",
    (component, env) => make_function(lambda_parameter_symbols(component),
                                      lambda_body(component), env));
put("evaluate", "sequence",
    (component, env) => eval_sequence(sequence_statements(component), env));
put("evaluate", "block",
    (component, env) => eval_block(component, env));
put("evaluate", "return_statement",
    (component, env) => eval_return_statement(component, env));
put("evaluate", "function_declaration",
    (component, env) => evaluate(function_decl_to_constant_decl(component), env));
put("evaluate", "constant_declaration",
    (component, env) => eval_declaration(component, env));
put("evaluate", "variable_declaration",
    (component, env) => eval_declaration(component, env));
put("evaluate", "assignment",
    (component, env) => eval_assignment(component, env));
`,
};

export const exercise_4_4: ExerciseSpec = {
  id: '4.4',
  postlude: rest('evaluate'),
  starter: `// The rest of the evaluator is provided. parse represents a && b as
// list("logical_composition", "&&", a, b), and a || b likewise with "||".

${book('evaluate')}`,
  tests: [
    { name: 'conjunction', kind: 'value', expr: run('1 < 2 && 2 > 3;'), expected: false },
    { name: 'disjunction', kind: 'value', expr: run('1 > 2 || 2 < 3;'), expected: true },
    { name: '&& does not evaluate its second operand when the first is false', kind: 'value', expr: run('false && error("evaluated");'), expected: false },
    { name: '|| does not evaluate its second operand when the first is true', kind: 'value', expr: run('true || no_such_name;'), expected: true },
    { name: 'nested', kind: 'value', expr: run('const a = true; const b = false; (a && !b) || (!a && b);'), expected: true },
  ],
  budget: BUDGET,
  solution: `function evaluate(component, env) {
    return is_literal(component)
           ? literal_value(component)
           : is_name(component)
           ? lookup_symbol_value(symbol_of_name(component), env)
           : is_application(component)
           ? apply(evaluate(function_expression(component), env),
                   list_of_values(arg_expressions(component), env))
           : is_operator_combination(component)
           ? evaluate(operator_combination_to_application(component),
                      env)
           : is_logical_composition(component)
           ? (logical_operation(component) === "&&"
              ? eval_and(component, env)
              : eval_or(component, env))
           : is_conditional(component)
           ? eval_conditional(component, env)
           : is_lambda_expression(component)
           ? make_function(lambda_parameter_symbols(component),
                           lambda_body(component), env)
           : is_sequence(component)
           ? eval_sequence(sequence_statements(component), env)
           : is_block(component)
           ? eval_block(component, env)
           : is_return_statement(component)
           ? eval_return_statement(component, env)
           : is_function_declaration(component)
           ? evaluate(function_decl_to_constant_decl(component), env)
           : is_declaration(component)
           ? eval_declaration(component, env)
           : is_assignment(component)
           ? eval_assignment(component, env)
           : error(component, "unknown syntax -- evaluate");
}

function is_logical_composition(component) {
    return is_tagged_list(component, "logical_composition");
}
function logical_operation(component) { return list_ref(component, 1); }
function first_conjunct(component) { return list_ref(component, 2); }
function second_conjunct(component) { return list_ref(component, 3); }

function eval_and(component, env) {
    return is_truthy(evaluate(first_conjunct(component), env))
           ? evaluate(second_conjunct(component), env)
           : false;
}
function eval_or(component, env) {
    return is_truthy(evaluate(first_conjunct(component), env))
           ? true
           : evaluate(second_conjunct(component), env);
}
`,
};

const duplicateLambda = 'list("lambda_expression", list(make_name("x"), make_name("x")), list("return_statement", make_name("x")))';

export const exercise_4_5: ExerciseSpec = {
  id: '4.5',
  prelude: `${evaluatorSyntax}\n${pick(evaluatorCore, 'scan_out_declarations')}`,
  starter: `// The syntax functions of §4.1.2 and scan_out_declarations are provided.
// verify(component) is true when no lambda expression or function
// declaration in the component has two equal parameters, or a parameter
// that is also declared directly in its body block; false otherwise.

function verify(component) {
    // your answer
}
`,
  tests: [
    { name: 'a correct program', kind: 'value', expr: 'verify(parse("function f(x, y) { return x + y; } f(1, (a, b) => a);"))', expected: true },
    { name: 'duplicate parameters', kind: 'value', expr: `verify(${duplicateLambda})`, expected: false },
    { name: 'duplicate parameters deep inside an application', kind: 'value', expr: `verify(make_application(make_name("g"), list(make_literal(1), ${duplicateLambda})))`, expected: false },
    { name: 'a parameter declared again in the body', kind: 'value', expr: 'verify(parse("function f(x) { const x = 1; return x; }"))', expected: false },
    { name: 'the same in a lambda expression', kind: 'value', expr: 'verify(parse("const g = (a, b) => { let b = 2; return a; };"))', expected: false },
    { name: 'an inner block may reuse the name', kind: 'value', expr: 'verify(parse("function f(x) { if (x > 0) { const x = 1; return x; } else { return x; } }"))', expected: true },
  ],
  solution: `function has_duplicates(symbols) {
    return !is_null(symbols) &&
           (!is_null(member(head(symbols), tail(symbols))) ||
            has_duplicates(tail(symbols)));
}

function verify_function(parameters, body) {
    const symbols = map(symbol_of_name, parameters);
    const declared = is_block(body) ? scan_out_declarations(block_body(body)) : null;
    return !has_duplicates(symbols) &&
           is_null(filter(name => !is_null(member(name, symbols)), declared)) &&
           verify(body);
}

// Checking the whole program before evaluating it finds every mistake,
// including those in functions that are never applied; checking in apply
// finds them late, and again at every application.
function verify(component) {
    return is_lambda_expression(component)
           ? verify_function(head(tail(component)), lambda_body(component))
           : is_function_declaration(component)
           ? verify_function(function_declaration_parameters(component),
                             function_declaration_body(component))
           : is_pair(component)
           ? verify(head(component)) && verify(tail(component))
           : true;
}
`,
};

const letStar = `function let_star(text) {
    function convert(component) {
        return !is_pair(component)
               ? component
               : head(component) === "variable_declaration"
               ? pair("let_star_declaration", convert(tail(component)))
               : pair(convert(head(component)), convert(tail(component)));
    }
    return convert(parse(text));
}
function evaluate_let_star(text) {
    const program = let_star_to_nested_let(let_star(text));
    const locals = scan_out_declarations(program);
    const output = evaluate(program,
                            extend_environment(locals, list_of_unassigned(locals),
                                               the_global_environment));
    return is_return_value(output) ? return_value_content(output) : output;
}`;

export const exercise_4_6: ExerciseSpec = {
  id: '4.6',
  postlude: `${metacircularEvaluator}\n${letStar}`,
  starter: `// We represent  let* name = expression;  as
//     list("let_star_declaration", list("name", symbol), expression)
// The checker writes programs with let and turns every let into a let*
// before calling your function; the evaluator and its syntax functions are
// provided. Return a program in which each let* has become a let at the
// start of a new block holding the rest of its statement sequence.

function let_star_to_nested_let(component) {
    // your answer
}
`,
  tests: [
    { name: 'the program of the text displays 39', kind: 'value', expr: 'evaluate_let_star("let x = 3; let y = x + 2; let z = x + y + 5; x * z;")', expected: 39 },
    { name: 'inside a function body', kind: 'value', expr: 'evaluate_let_star("function f(a) { let b = a + 1; let c = b * 2; return c; } f(3);")', expected: 8 },
    {
      name: 'a later let* shadows, so earlier functions keep the earlier binding',
      kind: 'value',
      expr: 'evaluate_let_star("let x = 1; function get() { return x; } let x = 2; get() * 10 + x;")',
      expected: 12,
    },
  ],
  budget: BUDGET,
  solution: `function is_let_star(component) {
    return is_tagged_list(component, "let_star_declaration");
}

function let_star_to_let(component) {
    return list("variable_declaration",
                head(tail(component)),
                let_star_to_nested_let(head(tail(tail(component)))));
}

// A let* and the statements after it become a block.
function nest_statements(stmts) {
    return is_null(stmts)
           ? null
           : is_let_star(head(stmts))
           ? list(list("block",
                       list("sequence",
                            pair(let_star_to_let(head(stmts)),
                                 nest_statements(tail(stmts))))))
           : pair(let_star_to_nested_let(head(stmts)),
                  nest_statements(tail(stmts)));
}

function let_star_to_nested_let(component) {
    return is_sequence(component)
           ? list("sequence", nest_statements(sequence_statements(component)))
           : is_let_star(component)
           ? list("block", let_star_to_let(component))
           : is_pair(component)
           ? pair(let_star_to_nested_let(head(component)),
                  let_star_to_nested_let(tail(component)))
           : component;
}
`,
};

export const exercise_4_7: ExerciseSpec = {
  id: '4.7',
  starter: `// while_loop(predicate, body) applies body as long as predicate()
// is true, and should generate an iterative process.
function while_loop(predicate, body) {
    // your answer
}

function factorial(n) {
    let product = 1;
    let counter = 1;
    while_loop(() => counter <= n,
               () => {
                   product = counter * product;
                   counter = counter + 1;
               });
    return product;
}
`,
  tests: [
    { name: 'factorial', kind: 'value', expr: 'factorial(10)', expected: 3628800 },
    { name: 'a loop whose body never runs', kind: 'value', expr: 'factorial(0)', expected: 1 },
    { name: 'a sum', kind: 'value', expr: '(() => { let i = 0; let s = 0; while_loop(() => i < 100, () => { i = i + 1; s = s + i; }); return s; })()', expected: 5050 },
    { name: 'an iterative process', kind: 'shape', expr: '"iterative"', call: 'factorial(40)' },
  ],
  solution: `function while_loop(predicate, body) {
    if (predicate()) {
        body();
        return while_loop(predicate, body);
    } else {
        return undefined;
    }
}

function factorial(n) {
    let product = 1;
    let counter = 1;
    while_loop(() => counter <= n,
               () => {
                   product = counter * product;
                   counter = counter + 1;
               });
    return product;
}
`,
};

export const exercise_4_8: ExerciseSpec = {
  id: '4.8',
  postlude: rest('eval_sequence'),
  starter: `// The values of the four programs, by the specification above.
const value_1 = null; // 1; 2; 3;
const value_2 = null; // 1; { if (true) {} else { 2; } }
const value_3 = null; // 1; const x = 2;
const value_4 = null; // 1; { let x = 2; { x = x + 3; } }

// The rest of the evaluator is provided. Change eval_sequence (and add
// what it needs) so that the evaluator follows the specification.
${book('eval_sequence')}`,
  tests: [
    { name: 'the four values', kind: 'value', expr: 'value_1 === 3 && is_undefined(value_2) && value_3 === 1 && value_4 === 5', expected: true },
    { name: 'a declaration produces no value', kind: 'value', expr: run('1; const x = 2;'), expected: 1 },
    { name: 'nor does a block of declarations', kind: 'value', expr: run('1; { const y = 2; } const z = 3;'), expected: 1 },
    { name: 'a conditional statement does', kind: 'value', expr: `is_undefined(${run('1; { if (true) {} else { 2; } }')})`, expected: true },
    { name: 'the last value-producing statement wins', kind: 'value', expr: run('1; { let x = 2; { x = x + 3; } }'), expected: 5 },
    { name: 'functions still return what they return', kind: 'value', expr: run('function f() { 1; return 2; } function g() { 3; } f() + (g() === undefined ? 10 : 20);'), expected: 12 },
  ],
  budget: BUDGET,
  solution: `const value_1 = 3;
const value_2 = undefined;
const value_3 = 1;
const value_4 = 5;

function is_value_producing(component) {
    return is_declaration(component)
           ? false
           : is_block(component)
           ? is_value_producing(block_body(component))
           : is_sequence(component)
           ? accumulate((stmt, any) => is_value_producing(stmt) || any,
                        false, sequence_statements(component))
           : true;
}

function eval_sequence(stmts, env) {
    function loop(stmts, last) {
        if (is_empty_sequence(stmts)) {
            return last;
        } else {
            const stmt = first_statement(stmts);
            const value = evaluate(stmt, env);
            return is_return_value(value)
                   ? value
                   : loop(rest_statements(stmts),
                          is_value_producing(stmt) ? value : last);
        }
    }
    return loop(stmts, undefined);
}
`,
};

const environmentFunctions = ['make_frame', 'frame_symbols', 'frame_values', 'extend_environment', 'lookup_symbol_value', 'assign_symbol_value'];

const recursion: TestSpec = {
  name: 'recursion',
  kind: 'value',
  expr: run('function fact(n) { return n === 0 ? 1 : n * fact(n - 1); } fact(6);'),
  expected: 720,
};
const correctness: TestSpec[] = [
  recursion,
  {
    name: 'assignment and closures',
    kind: 'value',
    expr: run('let count = 0; function inc() { count = count + 1; return count; } inc(); inc(); inc();'),
    expected: 3,
  },
];

export const exercise_4_9: ExerciseSpec = {
  id: '4.9',
  postlude: rest(...environmentFunctions),
  starter: `// The rest of the evaluator is provided and uses only these functions to
// make and search environments. Change them so that a frame is a list of
// bindings, each binding a pair of a symbol and its value.

${book(...environmentFunctions)}`,
  tests: [
    ...correctness,
    {
      name: 'a frame is a list of bindings',
      kind: 'value',
      expr: 'head(head(head(the_global_environment))) === "head" && head(tail(head(head(the_global_environment)))) === "primitive"',
      expected: true,
    },
  ],
  budget: BUDGET,
  solution: `function make_frame(symbols, values) {
    return is_null(symbols)
           ? null
           : pair(pair(head(symbols), head(values)),
                  make_frame(tail(symbols), tail(values)));
}
function frame_symbols(frame) { return map(head, frame); }

function frame_values(frame) { return map(tail, frame); }

function extend_environment(symbols, vals, base_env) {
    return length(symbols) === length(vals)
           ? pair(make_frame(symbols, vals), base_env)
           : error(pair(symbols, vals),
                   length(symbols) < length(vals)
                   ? "too many arguments supplied"
                   : "too few arguments supplied");
}

function find_binding(symbol, frame) {
    return is_null(frame)
           ? null
           : head(head(frame)) === symbol
           ? head(frame)
           : find_binding(symbol, tail(frame));
}

function lookup_symbol_value(symbol, env) {
    if (env === the_empty_environment) {
        return error(symbol, "unbound name");
    } else {
        const binding = find_binding(symbol, first_frame(env));
        return is_null(binding)
               ? lookup_symbol_value(symbol, enclosing_environment(env))
               : tail(binding);
    }
}

function assign_symbol_value(symbol, val, env) {
    if (env === the_empty_environment) {
        return error(symbol, "unbound name -- assignment");
    } else {
        const binding = find_binding(symbol, first_frame(env));
        return is_null(binding)
               ? assign_symbol_value(symbol, val, enclosing_environment(env))
               : set_tail(binding, val);
    }
}
`,
};

export const exercise_4_10: ExerciseSpec = {
  id: '4.10',
  postlude: rest('lookup_symbol_value', 'assign_symbol_value'),
  starter: `// Declare scan_environment(symbol, env, found, unbound_message): it finds
// the innermost frame binding symbol and returns found(vals), where vals is
// the frame's list of values starting at the symbol's value; if no frame
// binds symbol, it signals an error with unbound_message. Then declare
// lookup_symbol_value and assign_symbol_value with it.

function scan_environment(symbol, env, found, unbound_message) {
    // your answer
}

${book('lookup_symbol_value', 'assign_symbol_value')}`,
  tests: [
    ...correctness,
    { name: 'lookup_symbol_value uses scan_environment', kind: 'calls', call: 'lookup_symbol_value("head", the_global_environment)', fn: 'scan_environment', atMost: 1 },
    {
      name: 'assign_symbol_value uses scan_environment',
      kind: 'calls',
      call: 'assign_symbol_value("x", 2, extend_environment(list("x"), list(1), the_global_environment))',
      fn: 'scan_environment',
      atMost: 1,
    },
    { name: 'unbound names are still errors', kind: 'error', call: run('no_such_name;'), message: 'unbound name' },
  ],
  budget: BUDGET,
  solution: `function scan_environment(symbol, env, found, unbound_message) {
    function env_loop(env) {
        function scan(symbols, vals) {
            return is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? found(vals)
                   : scan(tail(symbols), tail(vals));
        }
        if (env === the_empty_environment) {
            return error(symbol, unbound_message);
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_values(frame));
        }
    }
    return env_loop(env);
}

function lookup_symbol_value(symbol, env) {
    return scan_environment(symbol, env, vals => head(vals), "unbound name");
}

function assign_symbol_value(symbol, val, env) {
    return scan_environment(symbol, env, vals => set_head(vals, val),
                            "unbound name -- assignment");
}
`,
};

const constantFunctions = ['scan_out_declarations', 'make_frame', 'frame_symbols', 'frame_values', 'assign_symbol_value', 'eval_declaration'];

export const exercise_4_11: ExerciseSpec = {
  id: '4.11',
  postlude: rest(...constantFunctions),
  starter: `// The rest of the evaluator is provided, including extend_environment,
// lookup_symbol_value, eval_block, apply and evaluate_program, which use the
// functions below. Change these functions (and add new ones) so that
// assigning to a constant is an error, while declarations and assignments
// to variables and parameters keep working.

${book(...constantFunctions)}`,
  tests: [
    { name: 'assignment to a constant', kind: 'error', call: run('const x = 1; x = 2;') },
    { name: 'function names are constants', kind: 'error', call: run('function g() { return 1; } g = 5;') },
    { name: 'constants in a function body', kind: 'error', call: run('function h() { const c = 1; c = 2; return c; } h();') },
    { name: 'variables can be assigned', kind: 'value', expr: run('let y = 1; y = y + 1; y;'), expected: 2 },
    { name: 'parameters can be assigned', kind: 'value', expr: run('function f(x) { x = x + 1; return x; } f(1);'), expected: 2 },
    recursion,
  ],
  budget: BUDGET,
  solution: `// A declared name is either a string (a variable) or pair("const", string).
function scan_out_declarations(component) {
    return is_sequence(component)
           ? accumulate(append,
                        null,
                        map(scan_out_declarations,
                            sequence_statements(component)))
           : is_tagged_list(component, "variable_declaration")
           ? list(declaration_symbol(component))
           : is_declaration(component)
           ? list(pair("const", declaration_symbol(component)))
           : null;
}

// A frame keeps the kind of each name beside the names.
function make_frame(symbols, values) {
    return pair(pair(map(s => is_pair(s) ? tail(s) : s, symbols),
                     map(s => is_pair(s) ? "const" : "let", symbols)),
                values);
}
function frame_symbols(frame) { return head(head(frame)); }

function frame_kinds(frame) { return tail(head(frame)); }

function frame_values(frame) { return tail(frame); }

function assign_in_frames(symbol, val, env, check) {
    function env_loop(env) {
        function scan(symbols, kinds, vals) {
            return is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? (check && head(kinds) === "const"
                      ? error(symbol, "assignment to constant")
                      : set_head(vals, val))
                   : scan(tail(symbols), tail(kinds), tail(vals));
        }
        if (env === the_empty_environment) {
            return error(symbol, "unbound name -- assignment");
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_kinds(frame), frame_values(frame));
        }
    }
    return env_loop(env);
}

function assign_symbol_value(symbol, val, env) {
    return assign_in_frames(symbol, val, env, true);
}

function assign_constant_value(symbol, val, env) {
    return assign_in_frames(symbol, val, env, false);
}

function eval_declaration(component, env) {
    assign_constant_value(
        declaration_symbol(component),
        evaluate(declaration_value_expression(component), env),
        env);
    return undefined;
}
`,
};

export const exercise_4_12: ExerciseSpec = {
  id: '4.12',
  postlude: rest('lookup_symbol_value', 'eval_assignment'),
  starter: `// The rest of the evaluator is provided. Signal errors whose messages
// mention "unassigned".

${book('lookup_symbol_value', 'eval_assignment')}`,
  tests: [
    {
      name: 'using a name before its declaration',
      kind: 'error',
      call: run('const a = 1; function f(x) { const b = a + x; const a = 5; return a + b; } f(10);'),
      message: 'unassigned',
    },
    { name: 'assigning before the let declaration', kind: 'error', call: run('x = 1; let x = 2;'), message: 'unassigned' },
    { name: 'declared variables can be assigned', kind: 'value', expr: run('let y = 1; y = y + 1; y;'), expected: 2 },
    recursion,
  ],
  budget: BUDGET,
  solution: `function lookup_symbol_value(symbol, env) {
    function env_loop(env) {
        function scan(symbols, vals) {
            return is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? (head(vals) === "*unassigned*"
                      ? error(symbol, "unassigned name")
                      : head(vals))
                   : scan(tail(symbols), tail(vals));
        }
        if (env === the_empty_environment) {
            return error(symbol, "unbound name");
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_values(frame));
        }
    }
    return env_loop(env);
}

// Looking the name up first signals the error for a name still unassigned.
function eval_assignment(component, env) {
    lookup_symbol_value(assignment_symbol(component), env);
    const value = evaluate(assignment_value_expression(component),
                           env);
    assign_symbol_value(assignment_symbol(component), value, env);
    return value;
}
`,
};

const varFunctions = ['scan_out_declarations', 'eval_block', 'apply', 'assign_symbol_value'];

export const exercise_4_13: ExerciseSpec = {
  id: '4.13',
  postlude: rest(...varFunctions),
  starter: `// The rest of the evaluator is provided. Give const and let the scope
// rules of var, and let assignment to an undeclared name add a binding to
// the global environment, the_global_environment.

${book(...varFunctions)}`,
  tests: [
    { name: 'a declaration in a block is visible in the whole function', kind: 'value', expr: run('function f() { { const y = 2; } return y; } f();'), expected: 2 },
    { name: 'blocks do not shadow', kind: 'value', expr: run('const x = 1; { const x = 2; } x;'), expected: 2 },
    { name: 'assignment to an undeclared name declares it globally', kind: 'value', expr: run('function g() { z = 5; return 1; } g() + z;'), expected: 6 },
    recursion,
  ],
  budget: BUDGET,
  solution: `// Declarations anywhere in a function body, but not in nested functions.
function scan_out_declarations(component) {
    return is_sequence(component)
           ? accumulate(append,
                        null,
                        map(scan_out_declarations,
                            sequence_statements(component)))
           : is_declaration(component)
           ? list(declaration_symbol(component))
           : is_block(component)
           ? scan_out_declarations(block_body(component))
           : is_tagged_list(component, "conditional_statement")
           ? append(scan_out_declarations(conditional_consequent(component)),
                    scan_out_declarations(conditional_alternative(component)))
           : null;
}

// A block no longer has a frame of its own.
function eval_block(component, env) {
    return evaluate(block_body(component), env);
}

// The function's frame holds its parameters and every name in its body.
function apply(fun, args) {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(fun, args);
    } else if (is_compound_function(fun)) {
        const body = function_body(fun);
        const locals = scan_out_declarations(body);
        const result = evaluate(body,
                                extend_environment(
                                    append(function_parameters(fun), locals),
                                    append(args, list_of_unassigned(locals)),
                                    function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- apply");
    }
}

function assign_symbol_value(symbol, val, env) {
    function env_loop(env) {
        function scan(symbols, vals) {
            return is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? set_head(vals, val)
                   : scan(tail(symbols), tail(vals));
        }
        if (env === the_empty_environment) {
            const frame = first_frame(the_global_environment);
            set_head(frame, pair(symbol, head(frame)));
            set_tail(frame, pair(val, tail(frame)));
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_values(frame));
        }
    }
    return env_loop(env);
}
`,
};

export const exercise_4_16: ExerciseSpec = {
  id: '4.16',
  postlude: rest('apply'),
  starter: `// The rest of the evaluator is provided. Make the application of a
// compound function create one frame for its parameters and the names
// declared directly in its body block.

${book('apply')}`,
  tests: [
    {
      name: 'one frame fewer',
      kind: 'value',
      expr: `length(function_environment(${run('function f(x) { const y = x + 1; return () => x * y; } f(1);')}))`,
      expected: 3,
    },
    { name: 'parameters and local names are both visible', kind: 'value', expr: run('function f(x) { const y = x + 1; return x * y; } f(3);'), expected: 12 },
    { name: 'lambda expressions with expression bodies', kind: 'value', expr: run('(x => x + 1)(2);'), expected: 3 },
    recursion,
  ],
  budget: BUDGET,
  solution: `function apply(fun, args) {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(fun, args);
    } else if (is_compound_function(fun)) {
        const body = function_body(fun);
        const locals = is_block(body)
                       ? scan_out_declarations(block_body(body))
                       : null;
        const result = evaluate(is_block(body) ? block_body(body) : body,
                                extend_environment(
                                    append(function_parameters(fun), locals),
                                    append(args, list_of_unassigned(locals)),
                                    function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- apply");
    }
}
`,
};

export const exercise_4_17: ExerciseSpec = {
  id: '4.17',
  postlude: rest('evaluate'),
  starter: `// The rest of the evaluator is provided. Make every function declaration
// take effect at the start of the block, or program, it appears in.

${book('evaluate')}`,
  tests: [
    { name: 'a function used before its declaration', kind: 'value', expr: run('const a = f(2); function f(x) { return x * 10; } a;'), expected: 20 },
    { name: 'in a block', kind: 'value', expr: run('function g() { const r = h(); function h() { return 7; } return r; } g();'), expected: 7 },
    recursion,
  ],
  budget: BUDGET,
  solution: `function hoist(stmts) {
    return append(filter(is_function_declaration, stmts),
                  filter(stmt => !is_function_declaration(stmt), stmts));
}

function evaluate(component, env) {
    return is_literal(component)
           ? literal_value(component)
           : is_name(component)
           ? lookup_symbol_value(symbol_of_name(component), env)
           : is_application(component)
           ? apply(evaluate(function_expression(component), env),
                   list_of_values(arg_expressions(component), env))
           : is_operator_combination(component)
           ? evaluate(operator_combination_to_application(component),
                      env)
           : is_conditional(component)
           ? eval_conditional(component, env)
           : is_lambda_expression(component)
           ? make_function(lambda_parameter_symbols(component),
                           lambda_body(component), env)
           : is_sequence(component)
           ? eval_sequence(hoist(sequence_statements(component)), env)
           : is_block(component)
           ? eval_block(component, env)
           : is_return_statement(component)
           ? eval_return_statement(component, env)
           : is_function_declaration(component)
           ? evaluate(function_decl_to_constant_decl(component), env)
           : is_declaration(component)
           ? eval_declaration(component, env)
           : is_assignment(component)
           ? eval_assignment(component, env)
           : error(component, "unknown syntax -- evaluate");
}
`,
};

export const exercise_4_18: ExerciseSpec = {
  id: '4.18',
  starter: `// Fibonacci numbers, in the manner of the factorial expression above:
// no declarations or assignments inside.
const fib = n => /* your answer */ undefined;

function f(x) {
    return ((is_even, is_odd) => is_even(is_even, is_odd, x))
           ((is_ev, is_od, n) => n === 0 ? true : is_od(/* ?? */),
            (is_ev, is_od, n) => n === 0 ? false : is_ev(/* ?? */));
}
`,
  tests: [
    { name: 'fib(1) and fib(2)', kind: 'value', expr: 'fib(1) + fib(2)', expected: 2 },
    { name: 'fib(10)', kind: 'value', expr: 'fib(10)', expected: 55 },
    { name: 'fib(20)', kind: 'value', expr: 'fib(20)', expected: 6765 },
    { name: 'f of an even number', kind: 'value', expr: 'f(10)', expected: true },
    { name: 'f of an odd number', kind: 'value', expr: 'f(7)', expected: false },
  ],
  budget: 3_000_000,
  solution: `const fib = n => (fib => fib(fib, n))
                ((fb, k) => k < 2 ? k : fb(fb, k - 1) + fb(fb, k - 2));

function f(x) {
    return ((is_even, is_odd) => is_even(is_even, is_odd, x))
           ((is_ev, is_od, n) => n === 0 ? true : is_od(is_ev, is_od, n - 1),
            (is_ev, is_od, n) => n === 0 ? false : is_ev(is_ev, is_od, n - 1));
}
`,
};

const whileHelpers = `// loop_while(predicate, () => { body }) is parsed as a while loop.
function with_while_loops(component) {
    return is_application(component) &&
           is_name(function_expression(component)) &&
           symbol_of_name(function_expression(component)) === "loop_while"
           ? list("while_loop",
                  with_while_loops(head(arg_expressions(component))),
                  with_while_loops(lambda_body(head(tail(arg_expressions(component))))))
           : is_pair(component)
           ? pair(with_while_loops(head(component)), with_while_loops(tail(component)))
           : component;
}
function evaluate_with_while(input) {
    const program = with_while_loops(parse(input));
    const locals = scan_out_declarations(program);
    const output = evaluate(program,
                            extend_environment(locals, list_of_unassigned(locals),
                                               the_global_environment));
    return is_return_value(output) ? return_value_content(output) : output;
}`;

export const exercise_4_20: ExerciseSpec = {
  id: '4.20',
  postlude: `${omit(analyzingEvaluator, 'analyze')}\n${whileHelpers}`,
  starter: `// The rest of the analyzing evaluator is provided. A while loop is
//     list("while_loop", predicate, body)
// where body is a block. (Our parse has no while, so the checker writes
// loop_while(predicate, () => { body }) and turns it into this.)

${pick(analyzingEvaluator, 'analyze')}
`,
  tests: [
    {
      name: 'a loop',
      kind: 'value',
      expr: 'evaluate_with_while("let i = 0; let sum = 0; loop_while(i < 5, () => { sum = sum + i; i = i + 1; }); sum;")',
      expected: 10,
    },
    {
      name: 'return from inside a loop',
      kind: 'value',
      expr: 'evaluate_with_while("function f() { let i = 0; loop_while(true, () => { if (i === 3) { return i; } else {} i = i + 1; }); return 99; } f();")',
      expected: 3,
    },
    {
      name: 'a long loop',
      kind: 'value',
      expr: 'evaluate_with_while("let i = 0; loop_while(i < 2000, () => { i = i + 1; }); i;")',
      expected: 2000,
    },
  ],
  budget: 20_000_000,
  solution: `function analyze(component) {
    return is_literal(component)
           ? analyze_literal(component)
           : is_name(component)
           ? analyze_name(component)
           : is_application(component)
           ? analyze_application(component)
           : is_operator_combination(component)
           ? analyze(operator_combination_to_application(component))
           : is_conditional(component)
           ? analyze_conditional(component)
           : is_while_loop(component)
           ? analyze_while_loop(component)
           : is_lambda_expression(component)
           ? analyze_lambda_expression(component)
           : is_sequence(component)
           ? analyze_sequence(sequence_statements(component))
           : is_block(component)
           ? analyze_block(component)
           : is_return_statement(component)
           ? analyze_return_statement(component)
           : is_function_declaration(component)
           ? analyze(function_decl_to_constant_decl(component))
           : is_declaration(component)
           ? analyze_declaration(component)
           : is_assignment(component)
           ? analyze_assignment(component)
           : error(component, "unknown syntax -- analyze");
}

function is_while_loop(component) {
    return is_tagged_list(component, "while_loop");
}
function while_predicate(component) { return list_ref(component, 1); }

function while_body(component) { return list_ref(component, 2); }

function analyze_while_loop(component) {
    const pfun = analyze(while_predicate(component));
    const bfun = analyze(while_body(component));
    function loop(env) {
        if (is_truthy(pfun(env))) {
            const result = bfun(env);
            return is_return_value(result) ? result : loop(env);
        } else {
            return undefined;
        }
    }
    return loop;
}
`,
};

export const exercise_4_14: ExerciseSpec = {
  id: '4.14',
  prelude: `${metacircularEvaluator}`,
  starter: `// What does Louis's map receive as its function argument when the
// evaluator evaluates map(x => x + 1, list(1, 2, 3))? One of
//   "a function of the underlying JavaScript"
//   "a list tagged compound_function"
const louis_map_receives = "";

// Then repair Louis's idea: return env extended by a primitive map that
// works for both compound and primitive function arguments.
function install_map(env) {
    // your answer
}
`,
  tests: [
    { name: 'what map is given', kind: 'value', expr: 'louis_map_receives === "a list tagged compound_function"', expected: true },
    {
      name: 'map of a compound function',
      kind: 'value',
      expr: 'equal(evaluate(parse("map(x => x * x, list(1, 2, 3));"), install_map(the_global_environment)), list(1, 4, 9))',
      expected: true,
    },
    {
      name: 'map of a primitive function',
      kind: 'value',
      expr: 'equal(evaluate(parse("map(math_abs, list(-2, 3));"), install_map(the_global_environment)), list(2, 3))',
      expected: true,
    },
  ],
  budget: BUDGET,
  solution: `const louis_map_receives = "a list tagged compound_function";

// The implementation applies its argument with the evaluator's apply, which
// knows both representations of functions.
function install_map(env) {
    return extend_environment(
               list("map"),
               list(list("primitive",
                         (f, xs) => map(x => apply(f, list(x)), xs))),
               env);
}
`,
};

export const exercise_4_15: ExerciseSpec = {
  id: '4.15',
  starter: `// Suppose halts(f, a) existed, and consider strange(strange).
// outcome(answer) is what strange(strange) does when halts(strange, strange)
// returns answer: "runs forever" or "halts".
function outcome(answer) {
    // your answer
}

// Does that outcome agree with the answer halts gave? true or false.
function agrees(answer) {
    // your answer
}

// Can halts exist?
const halts_can_exist = true;
`,
  tests: [
    { name: 'if halts says strange halts', kind: 'value', expr: 'outcome(true) === "runs forever" && agrees(true) === false', expected: true },
    { name: 'if halts says strange runs forever', kind: 'value', expr: 'outcome(false) === "halts" && agrees(false) === false', expected: true },
    { name: 'the conclusion', kind: 'value', expr: 'halts_can_exist', expected: false },
  ],
  solution: `function outcome(answer) {
    return answer ? "runs forever" : "halts";
}

function agrees(answer) {
    return (outcome(answer) === "halts") === answer;
}

const halts_can_exist = false;
`,
};

export const exercise_4_19: ExerciseSpec = {
  id: '4.19',
  starter: `// The result of f(10) in each view: a number, or "error".
const ben = undefined;
const alyssa = undefined;
const eva = undefined;

// Whose view does JavaScript take: "ben", "alyssa" or "eva"?
const javascript = "";

// One way to do what Eva wants, for declarations whose value expressions
// do not call functions: evaluate them in an order in which each comes
// after the declarations it uses. Given a list of pairs (name, list of the
// names its value expression uses), return the names in such an order.
function declaration_order(uses) {
    // your answer
}
`,
  tests: [
    { name: 'the three views', kind: 'value', expr: 'ben === 16 && alyssa === "error" && eva === 20', expected: true },
    { name: 'JavaScript', kind: 'value', expr: 'javascript', expected: 'alyssa' },
    {
      name: 'the declarations of f, ordered',
      kind: 'value',
      expr: 'equal(declaration_order(list(pair("b", list("a", "x")), pair("a", null))), list("a", "b"))',
      expected: true,
    },
    {
      name: 'a longer chain',
      kind: 'value',
      expr: 'equal(declaration_order(list(pair("c", list("b")), pair("b", list("a")), pair("a", null))), list("a", "b", "c"))',
      expected: true,
    },
  ],
  solution: `const ben = 16;
const alyssa = "error";
const eva = 20;

const javascript = "alyssa";

// Repeatedly take a declaration none of whose names is still waiting.
function declaration_order(uses) {
    const names = map(head, uses);
    function ready(entry, waiting) {
        return is_null(filter(name => !is_null(member(name, waiting)) &&
                                      name !== head(entry),
                              tail(entry)));
    }
    function order(waiting_entries) {
        if (is_null(waiting_entries)) {
            return null;
        } else {
            const waiting = map(head, waiting_entries);
            const next = head(filter(entry => ready(entry, waiting),
                                     waiting_entries));
            return pair(head(next),
                        order(filter(entry => entry !== next, waiting_entries)));
        }
    }
    return order(uses);
}
`,
};

export const exercise_4_21: ExerciseSpec = {
  id: '4.21',
  starter: `// Each time a function whose body is a sequence of n statements is
// applied (n at least 2; parse gives a single statement as itself):
// how many times does Alyssa's version apply execute_sequence?
function alyssa_calls(n) {
    // your answer
}
// How many of the functions made by sequentially does the text's apply?
function text_calls(n) {
    // your answer
}
// Which version tests is_null and takes head and tail at execution time:
// "alyssa" or "text"?
const loops_at_execution = "";
`,
  tests: [
    { name: 'two statements', kind: 'value', expr: 'alyssa_calls(2) === 2 && text_calls(2) === 1', expected: true },
    { name: 'ten statements', kind: 'value', expr: 'alyssa_calls(10) === 10 && text_calls(10) === 9', expected: true },
    { name: 'the work left to execution', kind: 'value', expr: 'loops_at_execution', expected: 'alyssa' },
  ],
  solution: `function alyssa_calls(n) {
    return n;
}
function text_calls(n) {
    return n - 1;
}
const loops_at_execution = "alyssa";
`,
};

export const exercise_4_22: ExerciseSpec = {
  id: '4.22',
  starter: `// Run both editors above on factorial(10), then on factorial(20), and
// read the steps from their output headers. The share of the original
// evaluator's steps that analysis saves estimates the fraction of its time
// spent in analysis.
function analysis_fraction(original_steps, analyzing_steps) {
    // your answer
}
const fraction_for_10 = analysis_fraction(0, 0); // your measurements
const fraction_for_20 = analysis_fraction(0, 0); // your measurements

// Does the fraction grow as n grows? true or false
const grows = undefined;
`,
  tests: [
    { name: 'the formula', kind: 'value', expr: 'analysis_fraction(100, 60)', expected: 0.4 },
    { name: 'factorial(10)', kind: 'value', expr: 'math_abs(fraction_for_10 - 0.382) < 0.02', expected: true },
    { name: 'factorial(20)', kind: 'value', expr: 'math_abs(fraction_for_20 - 0.421) < 0.02', expected: true },
    { name: 'growth', kind: 'value', expr: 'grows', expected: true },
  ],
  solution: `function analysis_fraction(original_steps, analyzing_steps) {
    return (original_steps - analyzing_steps) / original_steps;
}
const fraction_for_10 = analysis_fraction(76076, 46980);
const fraction_for_20 = analysis_fraction(152836, 88540);

const grows = true;
`,
};
