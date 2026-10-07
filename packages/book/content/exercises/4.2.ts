import { lazyEvaluatorWithout, lazyPairs, metacircularEvaluator, omit, pick } from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §4.2. */

export const exercise_4_23: ExerciseSpec = {
  id: '4.23',
  starter: `function unless(condition, usual_value, exceptional_value) {
    return condition ? exceptional_value : usual_value;
}

function factorial(n) {
    return unless(n === 1,
                  n * factorial(n - 1),
                  1);
}

// Work these out before running anything.
// Does factorial(5) ever return a value in applicative order? true or false.
const returns_in_applicative_order = undefined;
// The value of factorial(5) in the lazy evaluator of section 4.2.2.
const lazy_value = undefined;
// How many times the lazy evaluator applies factorial to compute it.
const lazy_calls = undefined;
`,
  tests: [
    { name: 'applicative order', kind: 'value', expr: 'returns_in_applicative_order', expected: false },
    { name: 'the value in normal order', kind: 'value', expr: 'lazy_value', expected: 120 },
    { name: 'the calls in normal order', kind: 'value', expr: 'lazy_calls', expected: 5 },
  ],
  solution: `function unless(condition, usual_value, exceptional_value) {
    return condition ? exceptional_value : usual_value;
}

function factorial(n) {
    return unless(n === 1,
                  n * factorial(n - 1),
                  1);
}

// Applicative order evaluates n * factorial(n - 1) before unless is
// entered, even when n is 1, so the recursion never stops.
const returns_in_applicative_order = false;
// Lazily, factorial(1) takes the exceptional value 1 and the pending
// multiplications give 5 * 4 * 3 * 2 * 1.
const lazy_value = 120;
// factorial(5), (4), (3), (2) and (1): factorial(0) is never needed.
const lazy_calls = 5;
`,
};

/** `evaluate` of §4.1.1, catching `unless` before it would be taken for an application. */
const evaluateWithUnless = pick(metacircularEvaluator, 'evaluate').replace(
  '           : is_application(component)',
  `           : is_unless(component)
           ? evaluate(unless_to_conditional(component), env)
           : is_application(component)`,
);

export const exercise_4_24: ExerciseSpec = {
  id: '4.24',
  postlude: `${evaluateWithUnless}
${omit(metacircularEvaluator, 'evaluate')}`,
  starter: `// The applicative-order evaluator of section 4.1 is loaded after your
// code. Its evaluate has one new clause, before the one for applications:
//
//     : is_unless(component)
//     ? evaluate(unless_to_conditional(component), env)
//
// Write the two functions, so that unless(condition, usual, exceptional)
// is a derived component, like an operator combination.

function is_unless(component) {
    // your answer
}

function unless_to_conditional(component) {
    // your answer
}
`,
  tests: [
    {
      name: 'the usual value is not evaluated when the condition holds',
      kind: 'value',
      expr: 'evaluate_program("unless(1 === 1, head(null), 42);")',
      expected: 42,
    },
    {
      name: 'the exceptional value is not evaluated when it fails',
      kind: 'value',
      expr: 'evaluate_program("unless(1 === 2, 7, head(null));")',
      expected: 7,
    },
    {
      name: 'factorial written with unless',
      kind: 'value',
      expr: 'evaluate_program("function factorial(n) { return unless(n === 1, n * factorial(n - 1), 1); } factorial(5);")',
      expected: 120,
    },
    {
      name: 'other applications are unchanged',
      kind: 'value',
      expr: 'evaluate_program("function f(x) { return x + 1; } f(head(list(1)));")',
      expected: 2,
    },
  ],
  solution: `function is_unless(component) {
    return is_application(component) &&
           is_name(function_expression(component)) &&
           symbol_of_name(function_expression(component)) === "unless";
}

function unless_to_conditional(component) {
    const args = arg_expressions(component);
    return list("conditional_expression",
                list_ref(args, 0),
                list_ref(args, 2),
                list_ref(args, 1));
}
`,
};

export const exercise_4_25: ExerciseSpec = {
  id: '4.25',
  starter: `// Typed into the lazy evaluator:
//
//     let count = 0;
//     function id(x) {
//         count = count + 1;
//         return x;
//     }
//     const w = id(id(10));
//
// Give its responses to the three inputs that follow.

const count_after_declaring_w = undefined;  // count;
const value_of_w = undefined;               // w;
const count_after_w = undefined;            // count;
`,
  tests: [
    { name: 'count, after declaring w', kind: 'value', expr: 'count_after_declaring_w', expected: 1 },
    { name: 'w', kind: 'value', expr: 'value_of_w', expected: 10 },
    { name: 'count, after w is printed', kind: 'value', expr: 'count_after_w', expected: 2 },
  ],
  solution: `// Declaring w applies the outer id, which counts once and returns its
// argument unforced: w is a thunk for id(10).
const count_after_declaring_w = 1;
// Printing w forces the thunk, which applies the inner id.
const value_of_w = 10;
const count_after_w = 2;
`,
};

/** The lazy evaluator, counting the function expressions whose values are thunks. */
const countingFunctionThunks = `${lazyEvaluatorWithout().replace(
  'apply(actual_value(function_expression(component), env),',
  'apply(function_value(function_expression(component), env),',
)}
let function_thunks = 0;

function function_value(exp, env) {
    const value = evaluate(exp, env);
    function_thunks = is_thunk(value) || is_evaluated_thunk(value)
                      ? function_thunks + 1
                      : function_thunks;
    return force_it(value);
}

function thunks_applied(program) {
    function_thunks = 0;
    evaluate_program(program);
    return function_thunks;
}
`;

export const exercise_4_26: ExerciseSpec = {
  id: '4.26',
  prelude: countingFunctionThunks,
  budget: 2_000_000,
  starter: `// A program, as a string, that the lazy evaluator runs correctly only
// because evaluate forces the value of a function expression before
// handing it to apply.
const example = "";
`,
  tests: [
    { name: 'the example runs in the lazy evaluator', kind: 'value', expr: 'is_number(thunks_applied(example))', expected: true },
    { name: 'it applies a function that is a thunk', kind: 'value', expr: 'thunks_applied(example) > 0', expected: true },
  ],
  solution: `// Inside apply_to_one, f names a thunk for the lambda expression.
// Without actual_value, apply would be handed the thunk and report
// "unknown function type".
const example = "function apply_to_one(f) { return f(1); } apply_to_one(x => x + 1);";
`,
};

/** The lazy evaluator with memoization switchable, counting calls of `evaluate`. */
const switchableMemo = `${lazyEvaluatorWithout('force_it').replace(
  'function evaluate(component, env) {\n',
  'function evaluate(component, env) {\n    evaluations = evaluations + 1;\n',
)}
let memoize = true;
let evaluations = 0;

function force_it(obj) {
    if (is_thunk(obj)) {
        const result = actual_value(thunk_exp(obj), thunk_env(obj));
        if (memoize) {
            set_head(obj, "evaluated_thunk");
            set_head(tail(obj), result);
            set_tail(tail(obj), null);
        } else {}
        return result;
    } else if (is_evaluated_thunk(obj)) {
        return thunk_value(obj);
    } else {
        return obj;
    }
}

function work(program, memoizing) {
    memoize = memoizing;
    evaluations = 0;
    evaluate_program(program);
    return evaluations;
}

function same_value(program) {
    memoize = true;
    const with_memo = evaluate_program(program);
    memoize = false;
    return equal(with_memo, evaluate_program(program));
}
`;

export const exercise_4_27: ExerciseSpec = {
  id: '4.27',
  prelude: switchableMemo,
  budget: 20_000_000,
  starter: `// A program, as a string, that the lazy evaluator runs much more slowly
// without memoization than with it.
const slow_without_memo = "";

// With id as in exercise 4.25 and count starting at 0:
//
//     function square(x) {
//         return x * x;
//     }
//     square(id(10));
//     count;
//
// Give the two responses, with memoization and without.
const value_of_square = undefined;
const count_with_memo = undefined;
const count_without_memo = undefined;
`,
  tests: [
    { name: 'the program has the same value either way', kind: 'value', expr: 'same_value(slow_without_memo)', expected: true },
    {
      name: 'without memoization it does ten times the work',
      kind: 'value',
      expr: 'work(slow_without_memo, false) >= 10 * work(slow_without_memo, true) && work(slow_without_memo, true) > 0',
      expected: true,
    },
    { name: 'square(id(10))', kind: 'value', expr: 'value_of_square', expected: 100 },
    { name: 'count, memoizing', kind: 'value', expr: 'count_with_memo', expected: 1 },
    { name: 'count, not memoizing', kind: 'value', expr: 'count_without_memo', expected: 2 },
  ],
  solution: `// Each square forces its x twice. Without memoization each forcing
// evaluates the square inside it again, so the work doubles with every
// level: the innermost square(2) is evaluated 2 to the 6th = 64 times.
const slow_without_memo =
    "function square(x) { return x * x; }" +
    "square(square(square(square(square(square(square(2)))))));";

// x * x forces x twice. Memoized, id(10) is evaluated once; otherwise twice.
const value_of_square = 100;
const count_with_memo = 1;
const count_without_memo = 2;
`,
};

export const exercise_4_28: ExerciseSpec = {
  id: '4.28',
  starter: `// In the lazy evaluator:
//
//     function f1(x) {
//         x = pair(x, list(2));
//         return x;
//     }
//
//     function f2(x) {
//         function f(e) {
//             e;
//             return x;
//         }
//         return f(x = pair(x, list(2)));
//     }
//
// The values of f1(1) and f2(1), with the text's eval_sequence and with
// Cy's, which forces every statement of a sequence.
const f1_text = undefined;
const f2_text = undefined;
const f1_cy = undefined;
const f2_cy = undefined;
`,
  tests: [
    { name: 'f1(1), as in the text', kind: 'value', expr: 'equal(f1_text, list(1, 2))', expected: true },
    { name: 'f2(1), as in the text', kind: 'value', expr: 'equal(f2_text, 1)', expected: true },
    { name: 'f1(1), with Cy’s change', kind: 'value', expr: 'equal(f1_cy, list(1, 2))', expected: true },
    { name: 'f2(1), with Cy’s change', kind: 'value', expr: 'equal(f2_cy, list(1, 2))', expected: true },
  ],
  solution: `// In f1 the assignment is a statement of the body, evaluated in turn, and
// pair is a primitive, so x is forced and reassigned either way.
const f1_text = list(1, 2);
// In f2 the assignment is an argument of f, so it becomes a thunk. The
// statement e; only looks the thunk up, so x is never reassigned.
const f2_text = 1;
const f1_cy = list(1, 2);
// Cy's eval_sequence forces e, which performs the assignment.
const f2_cy = list(1, 2);
`,
};

export const exercise_4_29: ExerciseSpec = {
  id: '4.29',
  postlude: lazyEvaluatorWithout('apply', 'delay_it', 'force_it'),
  budget: 2_000_000,
  starter: `// The lazy evaluator of section 4.2.2 is loaded after your code, without
// apply, delay_it and force_it: write them. A function body may begin with
//
//     parameters("strict", "lazy", "strict", "lazy_memo");
//
// one kind per parameter. Without it every parameter is strict. Your apply
// must not evaluate the parameters(...) statement itself. Primitives stay
// strict, and the evaluator's is_thunk, thunk_exp, thunk_env,
// is_evaluated_thunk and thunk_value can be used.

function apply(fun, args, env) {
    // your answer
}

function delay_it(exp, env, memoize) {
    // your answer
}

function force_it(obj) {
    // your answer
}
`,
  tests: [
    {
      name: 'parameters are strict by default',
      kind: 'value',
      expr: 'evaluate_program("let count = 0; function f(a) { return 1; } f(count = count + 1); count;")',
      expected: 1,
    },
    {
      name: 'a strict argument is evaluated even when it is not used',
      kind: 'error',
      call: 'evaluate_program("function f(a, b) { parameters(\\"lazy\\", \\"strict\\"); return 1; } f(1, head(null));")',
      message: 'head',
    },
    {
      name: 'a lazy argument is not evaluated unless it is used',
      kind: 'value',
      expr: 'evaluate_program("function try_me(a, b) { parameters(\\"strict\\", \\"lazy\\"); return a === 0 ? 1 : b; } try_me(0, head(null));")',
      expected: 1,
    },
    {
      name: 'a lazy argument is evaluated each time it is used',
      kind: 'value',
      expr: 'evaluate_program("let count = 0; function id(x) { count = count + 1; return x; } function square(x) { parameters(\\"lazy\\"); return x * x; } square(id(10)) + count;")',
      expected: 102,
    },
    {
      name: 'a lazy_memo argument is evaluated once',
      kind: 'value',
      expr: 'evaluate_program("let count = 0; function id(x) { count = count + 1; return x; } function square(x) { parameters(\\"lazy_memo\\"); return x * x; } square(id(10)) + count;")',
      expected: 101,
    },
    {
      name: 'ordinary recursive functions still work',
      kind: 'value',
      expr: 'evaluate_program("function factorial(n) { return n === 1 ? 1 : n * factorial(n - 1); } factorial(6);")',
      expected: 720,
    },
  ],
  solution: `// The parameters(...) application that begins a function body, or null.
function parameter_declaration(body) {
    if (is_block(body) && is_sequence(block_body(body))) {
        const statements = sequence_statements(block_body(body));
        if (is_null(statements)) {
            return null;
        } else {
            const first = head(statements);
            return is_application(first) &&
                   is_name(function_expression(first)) &&
                   symbol_of_name(function_expression(first)) === "parameters"
                   ? first
                   : null;
        }
    } else {
        return null;
    }
}

function body_after_declaration(body) {
    return list("block",
                list("sequence", tail(sequence_statements(block_body(body)))));
}

function list_of_args(kinds, exps, env) {
    if (is_null(exps)) {
        return null;
    } else {
        const kind = is_null(kinds) ? "strict" : head(kinds);
        return pair(kind === "strict"
                    ? actual_value(head(exps), env)
                    : delay_it(head(exps), env, kind === "lazy_memo"),
                    list_of_args(is_null(kinds) ? null : tail(kinds),
                                 tail(exps), env));
    }
}

function apply(fun, args, env) {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(fun, list_of_arg_values(args, env));
    } else if (is_compound_function(fun)) {
        const body = function_body(fun);
        const declaration = parameter_declaration(body);
        const kinds = is_null(declaration)
                      ? null
                      : map(literal_value, arg_expressions(declaration));
        const result = evaluate(
                           is_null(declaration)
                           ? body
                           : body_after_declaration(body),
                           extend_environment(
                               function_parameters(fun),
                               list_of_args(kinds, args, env),
                               function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- apply");
    }
}

// A plain thunk is evaluated whenever it is forced; a memo thunk once.
function delay_it(exp, env, memoize) {
    return list(memoize ? "memo_thunk" : "thunk", exp, env);
}

function force_it(obj) {
    if (is_thunk(obj)) {
        return actual_value(thunk_exp(obj), thunk_env(obj));
    } else if (is_tagged_list(obj, "memo_thunk")) {
        const result = actual_value(thunk_exp(obj), thunk_env(obj));
        set_head(obj, "evaluated_thunk");
        set_head(tail(obj), result);
        set_tail(tail(obj), null);
        return result;
    } else if (is_evaluated_thunk(obj)) {
        return thunk_value(obj);
    } else {
        return obj;
    }
}
`,
};

/** Hidden declarations for §4.2.3's exercises: the list library and the text's lazy pairs. */
const lazyPairsPrelude = `const lazy_pairs = ${lazyPairs};
`;

export const exercise_4_31: ExerciseSpec = {
  id: '4.31',
  prelude: lazyPairsPrelude,
  postlude: lazyEvaluatorWithout('apply'),
  budget: 2_000_000,
  starter: `// The lazy evaluator is loaded after your code, without apply. The tests
// type the text's pair, head and tail (the string lazy_pairs) before
// their programs, then use list. Change apply so that the primitive list
// makes lists of those lazy pairs.

function apply(fun, args, env) {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(
                   fun,
                   list_of_arg_values(args, env));
    } else if (is_compound_function(fun)) {
        const result = evaluate(
                           function_body(fun),
                           extend_environment(
                               function_parameters(fun),
                               list_of_delayed_args(args, env),
                               function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- apply");
    }
}
`,
  tests: [
    {
      name: 'head of a list',
      kind: 'value',
      expr: `evaluate_program(lazy_pairs + 'head(list("a", "b", "c"));')`,
      expected: 'a',
    },
    {
      name: 'deeper into a list',
      kind: 'value',
      expr: `evaluate_program(lazy_pairs + 'head(tail(tail(list("a", "b", "c"))));')`,
      expected: 'c',
    },
    {
      name: 'a list ends in null',
      kind: 'value',
      expr: `evaluate_program(lazy_pairs + "is_null(tail(tail(list(1, 2))));")`,
      expected: true,
    },
    {
      name: 'the elements are delayed',
      kind: 'value',
      expr: `evaluate_program(lazy_pairs + "head(tail(list(head(null), 2)));")`,
      expected: 2,
    },
    {
      name: 'without lazy pairs, lists are as before',
      kind: 'value',
      expr: 'evaluate_program("head(tail(list(1, 2)));")',
      expected: 2,
    },
  ],
  solution: `// list(a, b, c) becomes pair(a, pair(b, pair(c, null))), evaluated in the
// environment of the application, so pair is whatever pair is there: the
// lazy one, once it has been declared. The arguments stay unevaluated.
function list_to_pairs(exps) {
    return is_null(exps)
           ? list("literal", null)
           : list("application",
                  list("name", "pair"),
                  list(head(exps), list_to_pairs(tail(exps))));
}

function apply(fun, args, env) {
    if (is_primitive_function(fun) && primitive_implementation(fun) === list) {
        return actual_value(list_to_pairs(args), env);
    } else if (is_primitive_function(fun)) {
        return apply_primitive_function(
                   fun,
                   list_of_arg_values(args, env));
    } else if (is_compound_function(fun)) {
        const result = evaluate(
                           function_body(fun),
                           extend_environment(
                               function_parameters(fun),
                               list_of_delayed_args(args, env),
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

export const exercise_4_32: ExerciseSpec = {
  id: '4.32',
  prelude: lazyPairsPrelude,
  postlude: lazyEvaluatorWithout(),
  budget: 5_000_000,
  starter: `// The lazy evaluator is loaded after your code. Write print_form, which
// the driver loop's user_print could display instead of its argument:
//   - a lazy pair (made by the pair of the string lazy_pairs) becomes an
//     ordinary list of its forced elements, at most 10 of them, followed
//     by the string "..." if the list goes on;
//   - a lazy pair whose tail is not a list ends in that forced tail;
//   - any other value is left as it is.

function print_form(object) {
    // your answer
}
`,
  tests: [
    {
      name: 'a finite lazy list',
      kind: 'value',
      expr: 'equal(print_form(evaluate_program(lazy_pairs + "pair(1, pair(2, pair(3, null)));")), list(1, 2, 3))',
      expected: true,
    },
    {
      name: 'elements are forced',
      kind: 'value',
      expr: 'equal(print_form(evaluate_program(lazy_pairs + "pair(1 + 1, null);")), list(2))',
      expected: true,
    },
    {
      name: 'an infinite lazy list',
      kind: 'value',
      expr: 'equal(print_form(evaluate_program(lazy_pairs + "const ones = pair(1, ones); ones;")), list(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, "..."))',
      expected: true,
    },
    {
      name: 'a lazy pair that is not a list',
      kind: 'value',
      expr: 'equal(print_form(evaluate_program(lazy_pairs + "pair(1, 2);")), pair(1, 2))',
      expected: true,
    },
    { name: 'other values', kind: 'value', expr: 'print_form(evaluate_program("6 * 7;"))', expected: 42 },
  ],
  solution: `// The text's lazy pair is a compound function m => m(x, y). Applying it
// to the expression (p, q) => p gives the head, still to be forced.
function is_lazy_pair(object) {
    return is_compound_function(object) &&
           equal(function_parameters(object), list("m"));
}

function lazy_part(object, selector) {
    return force_it(apply(object, list(parse(selector)),
                          the_global_environment));
}

function print_form(object) {
    function elements(object, n) {
        return is_null(object)
               ? null
               : !is_lazy_pair(object)
               ? object
               : n === 0
               ? list("...")
               : pair(lazy_part(object, "(p, q) => p;"),
                      elements(lazy_part(object, "(p, q) => q;"), n - 1));
    }
    return is_lazy_pair(object) ? elements(object, 10) : object;
}
`,
};

export const exercise_4_30: ExerciseSpec = {
  id: '4.30',
  starter: `// In the lazy evaluator, after the text's pair, head and tail:
//     head(tail(pair(head(null), pair(2, null))));
const lazy_value = undefined; // the value, or "error"

// With the streams of chapter 3, in the Laboratory itself:
//     head(stream_tail(pair(head(null), () => pair(2, () => null))));
const stream_value = undefined; // the value, or "error"

// Which part of a pair is delayed: "head", "tail" or "both"?
const delayed_in_a_stream = "";
const delayed_in_a_lazy_list = "";

// A tree whose leaves are delayed can be searched, measured or mapped
// over without computing its leaves. How many leaves, never computed,
// does counting the leaves of a lazy tree force? A number.
const leaves_forced_by_counting = undefined;
`,
  tests: [
    { name: 'a lazy list', kind: 'value', expr: 'lazy_value', expected: 2 },
    { name: 'a stream', kind: 'value', expr: 'stream_value', expected: 'error' },
    { name: 'what is delayed', kind: 'value', expr: 'delayed_in_a_stream === "tail" && delayed_in_a_lazy_list === "both"', expected: true },
    { name: 'taking advantage', kind: 'value', expr: 'leaves_forced_by_counting', expected: 0 },
  ],
  solution: `const lazy_value = 2;
const stream_value = "error";
const delayed_in_a_stream = "tail";
const delayed_in_a_lazy_list = "both";
const leaves_forced_by_counting = 0;
`,
};
