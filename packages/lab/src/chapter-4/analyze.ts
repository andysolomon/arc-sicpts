import { metacircularEvaluator } from './metacircular.ts';
import { omit } from './source.ts';

/**
 * The evaluator of §4.1.7, which analyzes each component once and returns an
 * execution function that only needs an environment. It keeps the syntax,
 * data structures and setup of §4.1.2–§4.1.4 and replaces the core of §4.1.1.
 */

export const analyzingCore = `// What analysis makes of a component: a function that only needs an environment.
type Execution = (env: Environment) => unknown;

const evaluate = (component: Component, env: Environment): unknown =>
    analyze(component)(env);

const analyze = (component: Component): Execution =>
    is_literal(component)
    ? analyze_literal(component)
    : is_name(component)
    ? analyze_name(component)
    : is_application(component)
    ? analyze_application(component)
    : is_operator_combination(component)
    ? analyze(operator_combination_to_application(component))
    : is_conditional(component)
    ? analyze_conditional(component)
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

const analyze_literal = (component: Component): Execution =>
    env => literal_value(component);

const analyze_name = (component: Component): Execution =>
    env => lookup_symbol_value(symbol_of_name(component), env);

const analyze_application = (component: Component): Execution => {
    const ffun = analyze(function_expression(component));
    const afuns = map(analyze, arg_expressions(component));
    return env => execute_application(ffun(env),
                                      map(afun => afun(env), afuns));
};
const execute_application = (fun: PrimitiveFunction | CompoundFunction, args: List<unknown>): unknown => {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(fun, args);
    } else if (is_compound_function(fun)) {
        const result = function_body(fun)
                       (extend_environment(function_parameters(fun),
                                           args,
                                           function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- execute_application");
    }
};

const analyze_conditional = (component: Component): Execution => {
    const pfun = analyze(conditional_predicate(component));
    const cfun = analyze(conditional_consequent(component));
    const afun = analyze(conditional_alternative(component));
    return env => is_truthy(pfun(env)) ? cfun(env) : afun(env);
};

const analyze_lambda_expression = (component: Component): Execution => {
    const params = lambda_parameter_symbols(component);
    const bfun = analyze(lambda_body(component));
    return env => make_function(params, bfun, env);
};

const analyze_sequence = (stmts: List<Component>): Execution => {
    const sequentially = (fun1: Execution, fun2: Execution): Execution =>
        env => {
            const fun1_val = fun1(env);
            return is_return_value(fun1_val)
                   ? fun1_val
                   : fun2(env);
        };
    const loop = (first_fun: Execution, rest_funs: List<Execution>): Execution =>
        is_null(rest_funs)
        ? first_fun
        : loop(sequentially(first_fun, head(rest_funs)),
               tail(rest_funs));
    const funs = map(analyze, stmts);
    return is_null(funs)
           ? env => undefined
           : loop(head(funs), tail(funs));
};

const analyze_block = (component: Component): Execution => {
    const body = block_body(component);
    const bfun = analyze(body);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return env => bfun(extend_environment(locals, unassigneds, env));
};

const analyze_return_statement = (component: Component): Execution => {
    const rfun = analyze(return_expression(component));
    return env => make_return_value(rfun(env));
};

const analyze_assignment = (component: Component): Execution => {
    const symbol = assignment_symbol(component);
    const vfun = analyze(assignment_value_expression(component));
    return env => {
               const value = vfun(env);
               assign_symbol_value(symbol, value, env);
               return value;
           };
};
const analyze_declaration = (component: Component): Execution => {
    const symbol = declaration_symbol(component);
    const vfun = analyze(declaration_value_expression(component));
    return env => {
               assign_symbol_value(symbol, vfun(env), env);
               return undefined;
           };
};
`;

/** The declarations of §4.1.1 that analysis replaces. */
const replaced = [
  'evaluate',
  'apply',
  'list_of_values',
  'eval_conditional',
  'eval_sequence',
  'eval_block',
  'eval_return_statement',
  'eval_assignment',
  'eval_declaration',
];

export const analyzingEvaluator = `${analyzingCore}\n${omit(metacircularEvaluator, ...replaced)}`;

/** The analyzing evaluator with the list functions it uses, ready to be a page's prelude. */
export const analyzingPrelude = `${analyzingEvaluator}`;
