import { metacircularEvaluator } from './metacircular.ts';
import { declaredNames, omit } from './source.ts';

/**
 * The lazy evaluator of §4.2.2, as a Source program: the metacircular
 * evaluator of §4.1 with the declarations the book changes replaced. Compound
 * functions are non-strict in every argument, primitives stay strict, and
 * thunks are memoized.
 */

/** `evaluate` with the one clause that changes: applications pass argument expressions and the environment. */
export const lazyEvaluate = `const evaluate = (component: Component, env: Environment): unknown =>
    is_literal(component)
           ? literal_value(component)
           : is_name(component)
           ? lookup_symbol_value(symbol_of_name(component), env)
           : is_application(component)
           ? apply(actual_value(function_expression(component), env),
                   arg_expressions(component), env)
           : is_operator_combination(component)
           ? evaluate(operator_combination_to_application(component),
                      env)
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
`;

/** `actual_value`, the new `apply` and the two ways of handling arguments. */
export const lazyApply = `const actual_value = (exp: Component, env: Environment): unknown =>
    force_it(evaluate(exp, env));

const apply = (fun: PrimitiveFunction | CompoundFunction, args: List<Component>, env: Environment): unknown => {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(
                   fun,
                   list_of_arg_values(args, env));              // changed
    } else if (is_compound_function(fun)) {
        const result = evaluate(
                           function_body(fun),
                           extend_environment(
                               function_parameters(fun),
                               list_of_delayed_args(args, env), // changed
                               function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- apply");
    }
};

const list_of_arg_values = (exps: List<Component>, env: Environment): List<unknown> =>
    map(exp => actual_value(exp, env), exps);
const list_of_delayed_args = (exps: List<Component>, env: Environment): List<Thunk> =>
    map(exp => delay_it(exp, env), exps);

const eval_conditional = (component: Component, env: Environment): unknown =>
    is_truthy(actual_value(conditional_predicate(component), env))
           ? evaluate(conditional_consequent(component), env)
           : evaluate(conditional_alternative(component), env);
`;

/** Thunks: an expression with its environment, replaced by its value when first forced. */
export const thunks = `// A thunk: an expression and its environment, tagged "thunk";
// once forced, the tag "evaluated_thunk" and the value.
type Thunk = List<unknown>;

const delay_it = (exp: Component, env: Environment): Thunk =>
    list("thunk", exp, env);
const is_thunk = (obj: unknown): boolean =>
    is_tagged_list(obj, "thunk");
const thunk_exp = (thunk: Thunk): Component => head(tail(thunk));

const thunk_env = (thunk: Thunk): Environment => head(tail(tail(thunk)));

const is_evaluated_thunk = (obj: unknown): boolean =>
    is_tagged_list(obj, "evaluated_thunk");
const thunk_value = (evaluated_thunk: Thunk): unknown =>
    head(tail(evaluated_thunk));

const force_it = (obj: unknown): unknown => {
    if (is_thunk(obj)) {
        const result = actual_value(thunk_exp(obj), thunk_env(obj));
        set_head(obj, "evaluated_thunk");
        set_head(tail(obj), result);  // replace exp with its value
        set_tail(tail(obj), null);    // forget unneeded env
        return result;
    } else if (is_evaluated_thunk(obj)) {
        return thunk_value(obj);
    } else {
        return obj;
    }
};
`;

/** The first `force_it` of §4.2.2, which evaluates a thunk's expression every time it is forced. */
export const unmemoizedForceIt = `const force_it = (obj: unknown): unknown =>
    is_thunk(obj)
           ? actual_value(thunk_exp(obj), thunk_env(obj))
           : obj;
`;

/** The driver loop forces what it prints. Like §4.1.4's, it takes its inputs from a list. */
export const lazyDriverLoop = `const input_prompt = "L-evaluate input:";
const output_prompt = "L-evaluate value:";

const driver_loop = (env: Environment, inputs: List<string>): void => {
    if (is_null(inputs)) {
        display("evaluator terminated");
    } else {
        const program = parse(head(inputs));
        const locals = scan_out_declarations(program);
        const unassigneds = list_of_unassigned(locals);
        const program_env = extend_environment(locals, unassigneds, env);
        const output = actual_value(program, program_env);
        user_print(output_prompt, output);
        return driver_loop(program_env, tail(inputs));
    }
};

// One program, evaluated as the driver loop would, giving its value.
const evaluate_program = (input: string): unknown => {
    const program = parse(input);
    const locals = scan_out_declarations(program);
    const program_env = extend_environment(
                            locals, list_of_unassigned(locals),
                            the_global_environment);
    const output = actual_value(program, program_env);
    return is_return_value(output)
           ? return_value_content(output)
           : output;
};
`;

/** Everything §4.2.2 declares anew, in the order the page shows it. */
export const lazyEvaluatorChanges = [lazyEvaluate, lazyApply, thunks, lazyDriverLoop].join('\n');

/** The declarations of §4.1 that the lazy evaluator replaces, or no longer needs. */
const replaced = [
  'evaluate',
  'apply',
  'list_of_values',
  'eval_conditional',
  'input_prompt',
  'output_prompt',
  'driver_loop',
  'evaluate_program',
  'the_global_environment',
];

/** The parts of the metacircular evaluator that §4.2.2 leaves as they were. */
export const lazyEvaluatorUnchanged = omit(metacircularEvaluator, ...replaced);


/**
 * The lazy evaluator without the named declarations, and without the list
 * library: an exercise's postlude, when the reader writes those declarations.
 * It declares `the_global_environment` last.
 */
export function lazyEvaluatorWithout(...names: string[]): string {
  const shared = new Set(declaredNames(lazyEvaluatorUnchanged));
  const unchanged = names.filter((name) => shared.has(name));
  const changed = names.filter((name) => !shared.has(name));
  return `${unchanged.length === 0 ? lazyEvaluatorUnchanged : omit(lazyEvaluatorUnchanged, ...unchanged)}
${changed.length === 0 ? lazyEvaluatorChanges : omit(lazyEvaluatorChanges, ...changed)}
const the_global_environment = setup_environment();
`;
}

/**
 * The complete lazy evaluator, with the list library it is written with. It
 * declares `the_global_environment` last, so a program can call
 * `driver_loop(the_global_environment, list(...))` or `evaluate_program(text)`.
 */
export const lazyEvaluator = `${lazyEvaluatorWithout()}`;

/** The same evaluator with the unmemoized `force_it`: call by name instead of call by need. */
export const unmemoizedLazyEvaluator = `${lazyEvaluatorWithout('force_it')}
${unmemoizedForceIt}`;

/** §4.2.1: in ordinary, applicative-order Source, `head(null)` is evaluated before `try_me` is entered. */
export const tryMeStrictProgram = `const try_me = (a: number, b: number): number =>
    a === 0 ? 1 : b;

try_me(0, head(null));
`;

/** §4.2.1 and §4.2.2: the same function in the lazy evaluator, where `b` is never needed. */
export const tryMeProgram = `driver_loop(the_global_environment,
            list(\`const try_me = (a: number, b: number): number =>
                      a === 0 ? 1 : b;\`,
                 "try_me(0, head(null));"));
`;

/** §4.2.1: `unless` as an ordinary function, usable only because its arguments are delayed. */
export const unlessProgram = `driver_loop(the_global_environment,
            list(\`const unless = <T>(condition: boolean, usual_value: T, exceptional_value: T): T =>
                      condition ? exceptional_value : usual_value;\`,
                 "const xs = null;",
                 'unless(is_null(xs), head(xs), display("error: xs should not be null"));',
                 "unless(is_null(list(7)), head(list(7)), head(null));"));
`;

/** §4.2.2: a thunk is a list, and forcing it turns it into an evaluated thunk. */
export const thunkProgram = `const t = delay_it(parse("1 + 2;"), the_global_environment);

display(head(t));
display(force_it(t));
display(head(t));
t;
`;

/** §4.2.2: `x * x` forces the thunk for `id(10)` once, then reuses its value. */
export const memoProgram = `driver_loop(the_global_environment,
            list("let count = 0;",
                 \`const id = <T>(x: T): T => {
                      count = count + 1;
                      return x;
                  };\`,
                 \`const square = (x: number): number =>
                      x * x;\`,
                 "square(id(10));",
                 "count;"));
`;

/**
 * §4.2.3: pairs as functions, so that `pair` is non-strict and lists are
 * streams. A Source string expression, to be placed before a lazy program.
 */
export const lazyPairs = `\`
type Pair<H, T> = <R>(m: (x: H, y: T) => R) => R;
type List<T> = null | (<R>(m: (x: T, y: List<T>) => R) => R);

const pair = <H, T>(x: H, y: T): Pair<H, T> =>
    m => m(x, y);
const head = <H, T>(z: Pair<H, T>): H =>
    z((p, q) => p);
const tail = <H, T>(z: Pair<H, T>): T =>
    z((p, q) => q);
\``;

/** §4.2.3: the list operations of chapter 2, unchanged, as a Source string expression. */
export const lazyListOperations = `\`
const list_ref = <T>(items: List<T>, n: number): T =>
    n === 0
           ? head(items)
           : list_ref(tail(items), n - 1);
const map = <A, B>(fun: (x: A) => B, items: List<A>): List<B> =>
    is_null(items)
           ? null
           : pair(fun(head(items)),
                  map(fun, tail(items)));
const scale_list = (items: List<number>, factor: number): List<number> =>
    map(x => x * factor, items);
const add_lists = (list1: List<number>, list2: List<number>): List<number> =>
    is_null(list1)
           ? list2
           : is_null(list2)
           ? list1
           : pair(head(list1) + head(list2),
                  add_lists(tail(list1), tail(list2)));
\``;

/**
 * The lazy evaluator, with §4.2.3's lazy pairs and list operations as the
 * strings `lazy_pairs` and `list_operations`, ready to be typed at its driver loop.
 */
export const lazyListPrelude = `${lazyEvaluator}
const lazy_pairs = ${lazyPairs};

const list_operations = ${lazyListOperations};
`;

/** §4.2.3: `ones` and `integers` as infinite lists, with no streams in sight. */
export const lazyListsProgram = `driver_loop(the_global_environment,
            list(lazy_pairs,
                 list_operations,
                 "const ones = pair(1, ones);",
                 "const integers = pair(1, add_lists(ones, integers));",
                 "list_ref(integers, 17);"));
`;

/** §4.2.3: lazier than streams: neither the head nor the tail of a pair is evaluated until needed. */
export const lazierProgram = `driver_loop(the_global_environment,
            list(lazy_pairs,
                 "const p = pair(head(null), 2 + 3);",
                 "tail(p);"));
`;

/** §4.2.3: `integral` and `solve` as §3.5.4 first wanted them, with no explicit delays. */
export const solveProgram = `const solver = \`
const integral = (integrand: List<number>, initial_value: number, dt: number): List<number> => {
    const int = pair(initial_value,
                     add_lists(scale_list(integrand, dt), int));
    return int;
};
const solve = (f: (y: number) => number, y0: number, dt: number): List<number> => {
    const y = integral(dy, y0, dt);
    const dy = map(f, y);
    return y;
};
\`;

driver_loop(the_global_environment,
            list(lazy_pairs,
                 list_operations,
                 solver,
                 "list_ref(solve(x => x, 1, 0.01), 100);"));
`;
