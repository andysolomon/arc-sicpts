
/**
 * The metacircular evaluator of §4.1, as a Source program. Each part is the
 * code of one subsection, so a page can show the part it is about and keep
 * the rest in its prelude. `metacircularEvaluator` is all of them in order;
 * it declares `the_global_environment` last, once everything it needs exists.
 */

/** §4.1.1: `evaluate`, `apply` and the functions they hand work to. */
export const evaluatorCore = `const evaluate = (component: Component, env: Environment): unknown =>
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

const apply = (fun: PrimitiveFunction | CompoundFunction, args: List<unknown>): unknown => {
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

const list_of_values = (exps: List<Component>, env: Environment): List<unknown> =>
    map(arg => evaluate(arg, env), exps);

const eval_conditional = (component: Component, env: Environment): unknown =>
    is_truthy(evaluate(conditional_predicate(component), env))
           ? evaluate(conditional_consequent(component), env)
           : evaluate(conditional_alternative(component), env);

const eval_sequence = (stmts: List<Component>, env: Environment): unknown => {
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

const eval_block = (component: Component, env: Environment): unknown => {
    const body = block_body(component);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return evaluate(body, extend_environment(locals,
                                             unassigneds,
                                             env));
};
const list_of_unassigned = (symbols: List<string>): List<"*unassigned*"> =>
    map(symbol => "*unassigned*", symbols);

const scan_out_declarations = (component: Component): List<string> =>
    is_sequence(component)
           ? accumulate(append,
                        null,
                        map(scan_out_declarations,
                            sequence_statements(component)))
           : is_declaration(component)
           ? list(declaration_symbol(component))
           : null;

const eval_return_statement = (component: Component, env: Environment): ReturnValue =>
    make_return_value(evaluate(return_expression(component),
                                      env));

const eval_assignment = (component: Component, env: Environment): unknown => {
    const value = evaluate(assignment_value_expression(component),
                           env);
    assign_symbol_value(assignment_symbol(component), value, env);
    return value;
};

const eval_declaration = (component: Component, env: Environment): undefined => {
    assign_symbol_value(
        declaration_symbol(component),
        evaluate(declaration_value_expression(component), env),
        env);
    return undefined;
};
`;

/** §4.1.2: predicates, selectors and constructors over `parse`'s tagged lists. */
export const evaluatorSyntax = `// A component of a program: a tagged list made by parse.
type Component = List<unknown>;

const is_tagged_list = (component: unknown, the_tag: string): boolean =>
    is_pair(component) && head(component) === the_tag;

// literals
const is_literal = (component: Component): boolean =>
    is_tagged_list(component, "literal");
const literal_value = (component: Component): unknown =>
    head(tail(component));
const make_literal = (value: unknown): Component =>
    list("literal", value);

// names
const is_name = (component: Component): boolean =>
    is_tagged_list(component, "name");
const symbol_of_name = (component: Component): string =>
    head(tail(component));
const make_name = (symbol: string): Component =>
    list("name", symbol);

// function applications
const is_application = (component: Component): boolean =>
    is_tagged_list(component, "application");
const function_expression = (component: Component): Component =>
    head(tail(component));
const arg_expressions = (component: Component): List<Component> =>
    head(tail(tail(component)));
const make_application = (function_expression: Component, argument_expressions: List<Component>): Component =>
    list("application",
                function_expression, argument_expressions);

// conditionals
const is_conditional = (component: Component): boolean =>
    is_tagged_list(component, "conditional_expression") ||
           is_tagged_list(component, "conditional_statement");
const conditional_predicate = (component: Component): Component =>
    list_ref(component, 1);
const conditional_consequent = (component: Component): Component =>
    list_ref(component, 2);
const conditional_alternative = (component: Component): Component =>
    list_ref(component, 3);

// lambda expressions
const is_lambda_expression = (component: Component): boolean =>
    is_tagged_list(component, "lambda_expression");
const lambda_parameter_symbols = (component: Component): List<string> =>
    map(symbol_of_name, head(tail(component)));
const lambda_body = (component: Component): Component =>
    head(tail(tail(component)));
const make_lambda_expression = (parameters: List<Component>, body: Component): Component =>
    list("lambda_expression", parameters, body);

// sequences
const is_sequence = (stmt: Component): boolean =>
    is_tagged_list(stmt, "sequence");
const sequence_statements = (stmt: Component): List<Component> =>
    head(tail(stmt));
const first_statement = (stmts: List<Component>): Component => head(stmts);

const rest_statements = (stmts: List<Component>): List<Component> => tail(stmts);

const is_empty_sequence = (stmts: List<Component>): boolean => is_null(stmts);

const is_last_statement = (stmts: List<Component>): boolean => is_null(tail(stmts));

// blocks
const is_block = (component: Component): boolean =>
    is_tagged_list(component, "block");
const block_body = (component: Component): Component =>
    head(tail(component));

// return statements
const is_return_statement = (component: Component): boolean =>
    is_tagged_list(component, "return_statement");
const return_expression = (component: Component): Component =>
    head(tail(component));

// assignments
const is_assignment = (component: Component): boolean =>
    is_tagged_list(component, "assignment");
const assignment_symbol = (component: Component): string =>
    symbol_of_name(head(tail(component)));
const assignment_value_expression = (component: Component): Component =>
    head(tail(tail(component)));

// constant, variable and function declarations
const is_declaration = (component: Component): boolean =>
    is_tagged_list(component, "constant_declaration") ||
           is_tagged_list(component, "variable_declaration") ||
           is_tagged_list(component, "function_declaration");
const declaration_symbol = (component: Component): string =>
    symbol_of_name(head(tail(component)));
const declaration_value_expression = (component: Component): Component =>
    head(tail(tail(component)));
const make_constant_declaration = (name: Component, value_expression: Component): Component =>
    list("constant_declaration", name, value_expression);
const is_function_declaration = (component: Component): boolean =>
    is_tagged_list(component, "function_declaration");
const function_declaration_name = (component: Component): Component =>
    list_ref(component, 1);
const function_declaration_parameters = (component: Component): List<Component> =>
    list_ref(component, 2);
const function_declaration_body = (component: Component): Component =>
    list_ref(component, 3);
const function_decl_to_constant_decl = (component: Component): Component =>
    make_constant_declaration(
               function_declaration_name(component),
               make_lambda_expression(
                   function_declaration_parameters(component),
                   function_declaration_body(component)));

// operator combinations, as derived components
const is_operator_combination = (component: Component): boolean =>
    is_unary_operator_combination(component) ||
           is_binary_operator_combination(component);
const is_unary_operator_combination = (component: Component): boolean =>
    is_tagged_list(component, "unary_operator_combination");
const is_binary_operator_combination = (component: Component): boolean =>
    is_tagged_list(component, "binary_operator_combination");
const operator_symbol = (component: Component): string =>
    list_ref(component, 1);
const first_operand = (component: Component): Component =>
    list_ref(component, 2);
const second_operand = (component: Component): Component =>
    list_ref(component, 3);
const operator_combination_to_application = (component: Component): Component => {
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
export const evaluatorData = `const is_truthy = (x: unknown): boolean =>
    is_boolean(x)
           ? x
           : error(x, "boolean expected, received");
const is_falsy = (x: unknown): boolean => ! is_truthy(x);

// A compound function: its parameters, body and environment, tagged.
type CompoundFunction = List<unknown>;

const make_function = (parameters: List<string>, body: Component, env: Environment): CompoundFunction =>
    list("compound_function", parameters, body, env);
const is_compound_function = (f: unknown): boolean =>
    is_tagged_list(f, "compound_function");
const function_parameters = (f: CompoundFunction): List<string> => list_ref(f, 1);

const function_body = (f: CompoundFunction): Component => list_ref(f, 2);

const function_environment = (f: CompoundFunction): Environment => list_ref(f, 3);

type ReturnValue = List<unknown>;

const make_return_value = (content: unknown): ReturnValue =>
    list("return_value", content);
const is_return_value = (value: unknown): boolean =>
    is_tagged_list(value, "return_value");
const return_value_content = (value: ReturnValue): unknown =>
    head(tail(value));

// A frame pairs a list of names with the list of their values.
type Frame = Pair<List<string>, List<unknown>>;
type Environment = List<Frame>;

const enclosing_environment = (env: Environment): Environment => tail(env);

const first_frame = (env: Environment): Frame => head(env);

const the_empty_environment = null;

const make_frame = (symbols: List<string>, values: List<unknown>): Frame => pair(symbols, values);

const frame_symbols = (frame: Frame): List<string> => head(frame);

const frame_values = (frame: Frame): List<unknown> => tail(frame);

const extend_environment = (symbols: List<string>, vals: List<unknown>, base_env: Environment): Environment =>
    length(symbols) === length(vals)
           ? pair(make_frame(symbols, vals), base_env)
           : error(pair(symbols, vals),
                   length(symbols) < length(vals)
                   ? "too many arguments supplied"
                   : "too few arguments supplied");

const lookup_symbol_value = (symbol: string, env: Environment): unknown => {
    const env_loop = (env: Environment): unknown => {
        const scan = (symbols: List<string>, vals: List<unknown>): unknown =>
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

const assign_symbol_value = (symbol: string, val: unknown, env: Environment): void => {
    const env_loop = (env: Environment): void => {
        const scan = (symbols: List<string>, vals: List<unknown>): void =>
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
export const evaluatorSetup = `// A primitive function: the tag "primitive" and its implementation.
type PrimitiveFunction = List<unknown>;

const is_primitive_function = (fun: unknown): boolean =>
    is_tagged_list(fun, "primitive");

const primitive_implementation = (fun: PrimitiveFunction): ((...args: List<unknown>) => unknown) =>
    head(tail(fun));

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

const apply_primitive_function = (fun: PrimitiveFunction, arglist: List<unknown>): unknown =>
    primitive_implementation(fun)(...arglist);

const setup_environment = (): Environment =>
    extend_environment(append(primitive_function_symbols,
                                     primitive_constant_symbols),
                              append(primitive_function_objects,
                                     primitive_constant_values),
                              the_empty_environment);

const input_prompt = "M-evaluate input:";
const output_prompt = "M-evaluate value:";

// The inputs come from a list, one program each, instead of from a prompt.
const driver_loop = (env: Environment, inputs: List<string>): void => {
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

const user_print = (string: string, object: unknown): void => {
    const prepare = (object: unknown): unknown =>
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
const evaluate_program = (input: string): unknown => {
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
