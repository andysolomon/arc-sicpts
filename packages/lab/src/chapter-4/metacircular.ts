
/**
 * The metacircular evaluator of §4.1, as a Source program. Each part is the
 * code of one subsection, so a page can show the part it is about and keep
 * the rest in its prelude. `metacircularEvaluator` is all of them in order;
 * it declares `the_global_environment` last, once everything it needs exists.
 */

/** §4.1.1: `evaluate`, `apply` and the functions they hand work to. */
export const evaluatorCore = `function evaluate(component, env) {
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

function apply(fun, args) {
    if (is_primitive_function(fun)) {
        return apply_primitive_function(fun, args);
    } else if (is_compound_function(fun)) {
        const result = evaluate(function_body(fun),
                                extend_environment(
                                    function_parameters(fun),
                                    args,
                                    function_environment(fun)));
        return is_return_value(result)
               ? return_value_content(result)
               : undefined;
    } else {
        return error(fun, "unknown function type -- apply");
    }
}

function list_of_values(exps, env) {
    return map(arg => evaluate(arg, env), exps);
}

function eval_conditional(component, env) {
    return is_truthy(evaluate(conditional_predicate(component), env))
           ? evaluate(conditional_consequent(component), env)
           : evaluate(conditional_alternative(component), env);
}

function eval_sequence(stmts, env) {
    if (is_empty_sequence(stmts)) {
        return undefined;
    } else if (is_last_statement(stmts)) {
        return evaluate(first_statement(stmts), env);
    } else {
        const first_stmt_value =
            evaluate(first_statement(stmts), env);
        if (is_return_value(first_stmt_value)) {
            return first_stmt_value;
        } else {
            return eval_sequence(rest_statements(stmts), env);
        }
    }
}

function eval_block(component, env) {
    const body = block_body(component);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return evaluate(body, extend_environment(locals,
                                             unassigneds,
                                             env));
}
function list_of_unassigned(symbols) {
    return map(symbol => "*unassigned*", symbols);
}

function scan_out_declarations(component) {
    return is_sequence(component)
           ? accumulate(append,
                        null,
                        map(scan_out_declarations,
                            sequence_statements(component)))
           : is_declaration(component)
           ? list(declaration_symbol(component))
           : null;
}

function eval_return_statement(component, env) {
    return make_return_value(evaluate(return_expression(component),
                                      env));
}

function eval_assignment(component, env) {
    const value = evaluate(assignment_value_expression(component),
                           env);
    assign_symbol_value(assignment_symbol(component), value, env);
    return value;
}

function eval_declaration(component, env) {
    assign_symbol_value(
        declaration_symbol(component),
        evaluate(declaration_value_expression(component), env),
        env);
    return undefined;
}
`;

/** §4.1.2: predicates, selectors and constructors over `parse`'s tagged lists. */
export const evaluatorSyntax = `function is_tagged_list(component, the_tag) {
    return is_pair(component) && head(component) === the_tag;
}

// literals
function is_literal(component) {
    return is_tagged_list(component, "literal");
}
function literal_value(component) {
    return head(tail(component));
}
function make_literal(value) {
    return list("literal", value);
}

// names
function is_name(component) {
    return is_tagged_list(component, "name");
}
function symbol_of_name(component) {
    return head(tail(component));
}
function make_name(symbol) {
    return list("name", symbol);
}

// function applications
function is_application(component) {
    return is_tagged_list(component, "application");
}
function function_expression(component) {
    return head(tail(component));
}
function arg_expressions(component) {
    return head(tail(tail(component)));
}
function make_application(function_expression, argument_expressions) {
    return list("application",
                function_expression, argument_expressions);
}

// conditionals
function is_conditional(component) {
    return is_tagged_list(component, "conditional_expression") ||
           is_tagged_list(component, "conditional_statement");
}
function conditional_predicate(component) {
    return list_ref(component, 1);
}
function conditional_consequent(component) {
    return list_ref(component, 2);
}
function conditional_alternative(component) {
    return list_ref(component, 3);
}

// lambda expressions
function is_lambda_expression(component) {
    return is_tagged_list(component, "lambda_expression");
}
function lambda_parameter_symbols(component) {
    return map(symbol_of_name, head(tail(component)));
}
function lambda_body(component) {
    return head(tail(tail(component)));
}
function make_lambda_expression(parameters, body) {
    return list("lambda_expression", parameters, body);
}

// sequences
function is_sequence(stmt) {
    return is_tagged_list(stmt, "sequence");
}
function sequence_statements(stmt) {
    return head(tail(stmt));
}
function first_statement(stmts) { return head(stmts); }

function rest_statements(stmts) { return tail(stmts); }

function is_empty_sequence(stmts) { return is_null(stmts); }

function is_last_statement(stmts) { return is_null(tail(stmts)); }

// blocks
function is_block(component) {
    return is_tagged_list(component, "block");
}
function block_body(component) {
    return head(tail(component));
}

// return statements
function is_return_statement(component) {
    return is_tagged_list(component, "return_statement");
}
function return_expression(component) {
    return head(tail(component));
}

// assignments
function is_assignment(component) {
    return is_tagged_list(component, "assignment");
}
function assignment_symbol(component) {
    return symbol_of_name(head(tail(component)));
}
function assignment_value_expression(component) {
    return head(tail(tail(component)));
}

// constant, variable and function declarations
function is_declaration(component) {
    return is_tagged_list(component, "constant_declaration") ||
           is_tagged_list(component, "variable_declaration") ||
           is_tagged_list(component, "function_declaration");
}
function declaration_symbol(component) {
    return symbol_of_name(head(tail(component)));
}
function declaration_value_expression(component) {
    return head(tail(tail(component)));
}
function make_constant_declaration(name, value_expression) {
    return list("constant_declaration", name, value_expression);
}
function is_function_declaration(component) {
    return is_tagged_list(component, "function_declaration");
}
function function_declaration_name(component) {
    return list_ref(component, 1);
}
function function_declaration_parameters(component) {
    return list_ref(component, 2);
}
function function_declaration_body(component) {
    return list_ref(component, 3);
}
function function_decl_to_constant_decl(component) {
    return make_constant_declaration(
               function_declaration_name(component),
               make_lambda_expression(
                   function_declaration_parameters(component),
                   function_declaration_body(component)));
}

// operator combinations, as derived components
function is_operator_combination(component) {
    return is_unary_operator_combination(component) ||
           is_binary_operator_combination(component);
}
function is_unary_operator_combination(component) {
    return is_tagged_list(component, "unary_operator_combination");
}
function is_binary_operator_combination(component) {
    return is_tagged_list(component, "binary_operator_combination");
}
function operator_symbol(component) {
    return list_ref(component, 1);
}
function first_operand(component) {
    return list_ref(component, 2);
}
function second_operand(component) {
    return list_ref(component, 3);
}
function operator_combination_to_application(component) {
    const operator = operator_symbol(component);
    return is_unary_operator_combination(component)
           ? make_application(make_name(operator),
                              list(first_operand(component)))
           : make_application(make_name(operator),
                              list(first_operand(component),
                                   second_operand(component)));
}
`;

/** §4.1.3: truth, functions, return values and environments. */
export const evaluatorData = `function is_truthy(x) {
    return is_boolean(x)
           ? x
           : error(x, "boolean expected, received");
}
function is_falsy(x) { return ! is_truthy(x); }

function make_function(parameters, body, env) {
    return list("compound_function", parameters, body, env);
}
function is_compound_function(f) {
    return is_tagged_list(f, "compound_function");
}
function function_parameters(f) { return list_ref(f, 1); }

function function_body(f) { return list_ref(f, 2); }

function function_environment(f) { return list_ref(f, 3); }

function make_return_value(content) {
    return list("return_value", content);
}
function is_return_value(value) {
    return is_tagged_list(value, "return_value");
}
function return_value_content(value) {
    return head(tail(value));
}

function enclosing_environment(env) { return tail(env); }

function first_frame(env) { return head(env); }

const the_empty_environment = null;

function make_frame(symbols, values) { return pair(symbols, values); }

function frame_symbols(frame) { return head(frame); }

function frame_values(frame) { return tail(frame); }

function extend_environment(symbols, vals, base_env) {
    return length(symbols) === length(vals)
           ? pair(make_frame(symbols, vals), base_env)
           : error(pair(symbols, vals),
                   length(symbols) < length(vals)
                   ? "too many arguments supplied"
                   : "too few arguments supplied");
}

function lookup_symbol_value(symbol, env) {
    function env_loop(env) {
        function scan(symbols, vals) {
            return is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? head(vals)
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
            return error(symbol, "unbound name -- assignment");
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_values(frame));
        }
    }
    return env_loop(env);
}
`;

/** §4.1.4: primitives, the global environment and a driver loop. */
export const evaluatorSetup = `function is_primitive_function(fun) {
    return is_tagged_list(fun, "primitive");
}

function primitive_implementation(fun) { return head(tail(fun)); }

const primitive_functions = list(
       list("head",    head             ),
       list("tail",    tail             ),
       list("pair",    pair             ),
       list("list",    list             ),
       list("is_null", is_null          ),
       list("is_pair", is_pair          ),
       list("display", display          ),
       list("error",   error            ),
       list("math_abs",math_abs         ),
       list("+",       (x, y) => x + y  ),
       list("-",       (x, y) => x - y  ),
       list("-unary",   x     =>   - x  ),
       list("*",       (x, y) => x * y  ),
       list("/",       (x, y) => x / y  ),
       list("%",       (x, y) => x % y  ),
       list("===",     (x, y) => x === y),
       list("!==",     (x, y) => x !== y),
       list("<",       (x, y) => x <   y),
       list("<=",      (x, y) => x <=  y),
       list(">",       (x, y) => x >   y),
       list(">=",      (x, y) => x >=  y),
       list("!",        x     =>   ! x  )
);
const primitive_function_symbols =
    map(f => head(f), primitive_functions);
const primitive_function_objects =
    map(f => list("primitive", head(tail(f))),
        primitive_functions);

const primitive_constants = list(list("undefined", undefined),
                                 list("math_PI",   math_PI)
                                );
const primitive_constant_symbols =
    map(c => head(c), primitive_constants);
const primitive_constant_values =
    map(c => head(tail(c)), primitive_constants);

function apply_primitive_function(fun, arglist) {
    return apply_in_underlying_javascript(
               primitive_implementation(fun), arglist);
}

function setup_environment() {
    return extend_environment(append(primitive_function_symbols,
                                     primitive_constant_symbols),
                              append(primitive_function_objects,
                                     primitive_constant_values),
                              the_empty_environment);
}

const input_prompt = "M-evaluate input:";
const output_prompt = "M-evaluate value:";

// The inputs come from a list, one program each, instead of from a prompt.
function driver_loop(env, inputs) {
    if (is_null(inputs)) {
       display("evaluator terminated");
    } else {
       const program = parse(head(inputs));
       const locals = scan_out_declarations(program);
       const unassigneds = list_of_unassigned(locals);
       const program_env = extend_environment(locals, unassigneds, env);
       const output = evaluate(program, program_env);
       user_print(output_prompt, output);
       return driver_loop(program_env, tail(inputs));
    }
}

function user_print(string, object) {
    function prepare(object) {
        return is_compound_function(object)
               ? "< compound-function >"
               : is_primitive_function(object)
               ? "< primitive-function >"
               : is_pair(object)
               ? pair(prepare(head(object)),
                      prepare(tail(object)))
               : object;
    }
    display(prepare(object), string);
}

// One program, evaluated as the driver loop would, giving its value.
function evaluate_program(input) {
    const program = parse(input);
    const locals = scan_out_declarations(program);
    const program_env = extend_environment(
                            locals, list_of_unassigned(locals),
                            the_global_environment);
    const output = evaluate(program, program_env);
    return is_return_value(output)
           ? return_value_content(output)
           : output;
}

const the_global_environment = setup_environment();
`;

export const metacircularEvaluator = [evaluatorCore, evaluatorSyntax, evaluatorData, evaluatorSetup].join('\n');

/** The evaluator with the list functions it uses, ready to be a page's prelude. */
export const metacircularPrelude = `${metacircularEvaluator}`;
