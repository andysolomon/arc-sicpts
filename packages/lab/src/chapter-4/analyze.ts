import { metacircularEvaluator } from './metacircular.ts';
import { omit } from './source.ts';

/**
 * The evaluator of §4.1.7, which analyzes each component once and returns an
 * execution function that only needs an environment. It keeps the syntax,
 * data structures and setup of §4.1.2–§4.1.4 and replaces the core of §4.1.1.
 */

export const analyzingCore = `function evaluate(component, env) {
    return analyze(component)(env);
}

function analyze(component) {
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

function analyze_literal(component) {
    return env => literal_value(component);
}

function analyze_name(component) {
    return env => lookup_symbol_value(symbol_of_name(component), env);
}

function analyze_application(component) {
    const ffun = analyze(function_expression(component));
    const afuns = map(analyze, arg_expressions(component));
    return env => execute_application(ffun(env),
                                      map(afun => afun(env), afuns));
}
function execute_application(fun, args) {
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
}

function analyze_conditional(component) {
    const pfun = analyze(conditional_predicate(component));
    const cfun = analyze(conditional_consequent(component));
    const afun = analyze(conditional_alternative(component));
    return env => is_truthy(pfun(env)) ? cfun(env) : afun(env);
}

function analyze_lambda_expression(component) {
    const params = lambda_parameter_symbols(component);
    const bfun = analyze(lambda_body(component));
    return env => make_function(params, bfun, env);
}

function analyze_sequence(stmts) {
    function sequentially(fun1, fun2) {
        return env => {
                   const fun1_val = fun1(env);
                   return is_return_value(fun1_val)
                          ? fun1_val
                          : fun2(env);
               };
    }
    function loop(first_fun, rest_funs) {
        return is_null(rest_funs)
               ? first_fun
               : loop(sequentially(first_fun, head(rest_funs)),
                      tail(rest_funs));
    }
    const funs = map(analyze, stmts);
    return is_null(funs)
           ? env => undefined
           : loop(head(funs), tail(funs));
}

function analyze_block(component) {
    const body = block_body(component);
    const bfun = analyze(body);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return env => bfun(extend_environment(locals, unassigneds, env));
}

function analyze_return_statement(component) {
    const rfun = analyze(return_expression(component));
    return env => make_return_value(rfun(env));
}

function analyze_assignment(component) {
    const symbol = assignment_symbol(component);
    const vfun = analyze(assignment_value_expression(component));
    return env => {
               const value = vfun(env);
               assign_symbol_value(symbol, value, env);
               return value;
           };
}
function analyze_declaration(component) {
    const symbol = declaration_symbol(component);
    const vfun = analyze(declaration_value_expression(component));
    return env => {
               assign_symbol_value(symbol, vfun(env), env);
               return undefined;
           };
}
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
