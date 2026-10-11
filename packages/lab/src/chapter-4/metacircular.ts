
/**
 * The metacircular evaluator of §4.1, as a Source program. Each part is the
 * code of one subsection, so a page can show the part it is about and keep
 * the rest in its prelude. `metacircularEvaluator` is all of them in order;
 * it declares `the_global_environment` last, once everything it needs exists.
 */

/** §4.1.1: `evaluate`, `apply` and the functions they hand work to. */
export const evaluatorCore = `const evaluate = (component, env) =>
    is_literal(component)
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

const apply = (fun, args) => {
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
};

const list_of_values = (exps, env) =>
    map(arg => evaluate(arg, env), exps);

const eval_conditional = (component, env) =>
    is_truthy(evaluate(conditional_predicate(component), env))
           ? evaluate(conditional_consequent(component), env)
           : evaluate(conditional_alternative(component), env);

const eval_sequence = (stmts, env) => {
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
};

const eval_block = (component, env) => {
    const body = block_body(component);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return evaluate(body, extend_environment(locals,
                                             unassigneds,
                                             env));
};
const list_of_unassigned = (symbols) =>
    map(symbol => "*unassigned*", symbols);

const scan_out_declarations = (component) =>
    is_sequence(component)
           ? accumulate(append,
                        null,
                        map(scan_out_declarations,
                            sequence_statements(component)))
           : is_declaration(component)
           ? list(declaration_symbol(component))
           : null;

const eval_return_statement = (component, env) =>
    make_return_value(evaluate(return_expression(component),
                                      env));

const eval_assignment = (component, env) => {
    const value = evaluate(assignment_value_expression(component),
                           env);
    assign_symbol_value(assignment_symbol(component), value, env);
    return value;
};

const eval_declaration = (component, env) => {
    assign_symbol_value(
        declaration_symbol(component),
        evaluate(declaration_value_expression(component), env),
        env);
    return undefined;
};
`;

/** §4.1.2: predicates, selectors and constructors over `parse`'s tagged lists. */
export const evaluatorSyntax = `const is_tagged_list = (component, the_tag) =>
    is_pair(component) && head(component) === the_tag;

// literals
const is_literal = (component) =>
    is_tagged_list(component, "literal");
const literal_value = (component) =>
    head(tail(component));
const make_literal = (value) =>
    list("literal", value);

// names
const is_name = (component) =>
    is_tagged_list(component, "name");
const symbol_of_name = (component) =>
    head(tail(component));
const make_name = (symbol) =>
    list("name", symbol);

// function applications
const is_application = (component) =>
    is_tagged_list(component, "application");
const function_expression = (component) =>
    head(tail(component));
const arg_expressions = (component) =>
    head(tail(tail(component)));
const make_application = (function_expression, argument_expressions) =>
    list("application",
                function_expression, argument_expressions);

// conditionals
const is_conditional = (component) =>
    is_tagged_list(component, "conditional_expression") ||
           is_tagged_list(component, "conditional_statement");
const conditional_predicate = (component) =>
    list_ref(component, 1);
const conditional_consequent = (component) =>
    list_ref(component, 2);
const conditional_alternative = (component) =>
    list_ref(component, 3);

// lambda expressions
const is_lambda_expression = (component) =>
    is_tagged_list(component, "lambda_expression");
const lambda_parameter_symbols = (component) =>
    map(symbol_of_name, head(tail(component)));
const lambda_body = (component) =>
    head(tail(tail(component)));
const make_lambda_expression = (parameters, body) =>
    list("lambda_expression", parameters, body);

// sequences
const is_sequence = (stmt) =>
    is_tagged_list(stmt, "sequence");
const sequence_statements = (stmt) =>
    head(tail(stmt));
const first_statement = (stmts) => head(stmts);

const rest_statements = (stmts) => tail(stmts);

const is_empty_sequence = (stmts) => is_null(stmts);

const is_last_statement = (stmts) => is_null(tail(stmts));

// blocks
const is_block = (component) =>
    is_tagged_list(component, "block");
const block_body = (component) =>
    head(tail(component));

// return statements
const is_return_statement = (component) =>
    is_tagged_list(component, "return_statement");
const return_expression = (component) =>
    head(tail(component));

// assignments
const is_assignment = (component) =>
    is_tagged_list(component, "assignment");
const assignment_symbol = (component) =>
    symbol_of_name(head(tail(component)));
const assignment_value_expression = (component) =>
    head(tail(tail(component)));

// constant, variable and function declarations
const is_declaration = (component) =>
    is_tagged_list(component, "constant_declaration") ||
           is_tagged_list(component, "variable_declaration") ||
           is_tagged_list(component, "function_declaration");
const declaration_symbol = (component) =>
    symbol_of_name(head(tail(component)));
const declaration_value_expression = (component) =>
    head(tail(tail(component)));
const make_constant_declaration = (name, value_expression) =>
    list("constant_declaration", name, value_expression);
const is_function_declaration = (component) =>
    is_tagged_list(component, "function_declaration");
const function_declaration_name = (component) =>
    list_ref(component, 1);
const function_declaration_parameters = (component) =>
    list_ref(component, 2);
const function_declaration_body = (component) =>
    list_ref(component, 3);
const function_decl_to_constant_decl = (component) =>
    make_constant_declaration(
               function_declaration_name(component),
               make_lambda_expression(
                   function_declaration_parameters(component),
                   function_declaration_body(component)));

// operator combinations, as derived components
const is_operator_combination = (component) =>
    is_unary_operator_combination(component) ||
           is_binary_operator_combination(component);
const is_unary_operator_combination = (component) =>
    is_tagged_list(component, "unary_operator_combination");
const is_binary_operator_combination = (component) =>
    is_tagged_list(component, "binary_operator_combination");
const operator_symbol = (component) =>
    list_ref(component, 1);
const first_operand = (component) =>
    list_ref(component, 2);
const second_operand = (component) =>
    list_ref(component, 3);
const operator_combination_to_application = (component) => {
    const operator = operator_symbol(component);
    return is_unary_operator_combination(component)
           ? make_application(make_name(operator),
                              list(first_operand(component)))
           : make_application(make_name(operator),
                              list(first_operand(component),
                                   second_operand(component)));
};
`;

/** §4.1.3: truth, functions, return values and environments. */
export const evaluatorData = `const is_truthy = (x) =>
    is_boolean(x)
           ? x
           : error(x, "boolean expected, received");
const is_falsy = (x) => ! is_truthy(x);

const make_function = (parameters, body, env) =>
    list("compound_function", parameters, body, env);
const is_compound_function = (f) =>
    is_tagged_list(f, "compound_function");
const function_parameters = (f) => list_ref(f, 1);

const function_body = (f) => list_ref(f, 2);

const function_environment = (f) => list_ref(f, 3);

const make_return_value = (content) =>
    list("return_value", content);
const is_return_value = (value) =>
    is_tagged_list(value, "return_value");
const return_value_content = (value) =>
    head(tail(value));

const enclosing_environment = (env) => tail(env);

const first_frame = (env) => head(env);

const the_empty_environment = null;

const make_frame = (symbols, values) => pair(symbols, values);

const frame_symbols = (frame) => head(frame);

const frame_values = (frame) => tail(frame);

const extend_environment = (symbols, vals, base_env) =>
    length(symbols) === length(vals)
           ? pair(make_frame(symbols, vals), base_env)
           : error(pair(symbols, vals),
                   length(symbols) < length(vals)
                   ? "too many arguments supplied"
                   : "too few arguments supplied");

const lookup_symbol_value = (symbol, env) => {
    const env_loop = (env) => {
        const scan = (symbols, vals) =>
            is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? head(vals)
                   : scan(tail(symbols), tail(vals));
        if (env === the_empty_environment) {
            return error(symbol, "unbound name");
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_values(frame));
        }
    };
    return env_loop(env);
};

const assign_symbol_value = (symbol, val, env) => {
    const env_loop = (env) => {
        const scan = (symbols, vals) =>
            is_null(symbols)
                   ? env_loop(enclosing_environment(env))
                   : symbol === head(symbols)
                   ? set_head(vals, val)
                   : scan(tail(symbols), tail(vals));
        if (env === the_empty_environment) {
            return error(symbol, "unbound name -- assignment");
        } else {
            const frame = first_frame(env);
            return scan(frame_symbols(frame), frame_values(frame));
        }
    };
    return env_loop(env);
};
`;

/** §4.1.4: primitives, the global environment and a driver loop. */
export const evaluatorSetup = `const is_primitive_function = (fun) =>
    is_tagged_list(fun, "primitive");

const primitive_implementation = (fun) => head(tail(fun));

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

const apply_primitive_function = (fun, arglist) =>
    apply_in_underlying_javascript(
               primitive_implementation(fun), arglist);

const setup_environment = () =>
    extend_environment(append(primitive_function_symbols,
                                     primitive_constant_symbols),
                              append(primitive_function_objects,
                                     primitive_constant_values),
                              the_empty_environment);

const input_prompt = "M-evaluate input:";
const output_prompt = "M-evaluate value:";

// The inputs come from a list, one program each, instead of from a prompt.
const driver_loop = (env, inputs) => {
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
};

const user_print = (string, object) => {
    const prepare = (object) =>
        is_compound_function(object)
               ? "< compound-function >"
               : is_primitive_function(object)
               ? "< primitive-function >"
               : is_pair(object)
               ? pair(prepare(head(object)),
                      prepare(tail(object)))
               : object;
    display(prepare(object), string);
};

// One program, evaluated as the driver loop would, giving its value.
const evaluate_program = (input) => {
    const program = parse(input);
    const locals = scan_out_declarations(program);
    const program_env = extend_environment(
                            locals, list_of_unassigned(locals),
                            the_global_environment);
    const output = evaluate(program, program_env);
    return is_return_value(output)
           ? return_value_content(output)
           : output;
};

const the_global_environment = setup_environment();
`;

export const metacircularEvaluator = [evaluatorCore, evaluatorSyntax, evaluatorData, evaluatorSetup].join('\n');

/** The evaluator with the list functions it uses, ready to be a page's prelude. */
export const metacircularPrelude = `${metacircularEvaluator}`;
