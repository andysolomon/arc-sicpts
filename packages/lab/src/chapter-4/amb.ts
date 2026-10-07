import { evaluatorCore, evaluatorData, evaluatorSetup, evaluatorSyntax } from './metacircular.ts';
import { pick } from './source.ts';

/**
 * The amb evaluator of §4.3.3, as a Source program: the analyzing evaluator of
 * §4.1.7 with execution functions that take a success and a failure
 * continuation. It keeps the syntax and data structures of §4.1.2 and §4.1.3.
 *
 * Programs for it are strings, since the Laboratory runs Source and the amb
 * evaluator is a Source program; a long one may be given as a list of its
 * lines. The book's driver loop reads with `prompt`; here `driver_loop` takes
 * its inputs as a list, `"retry"` among them, and `amb_solutions` collects the
 * first n values of a program.
 */

/** §4.3.3: recognizing `amb`, which `parse` reads as an application. */
export const ambSyntax = `function is_amb(component) {
    return is_tagged_list(component, "application") &&
           is_name(function_expression(component)) &&
           symbol_of_name(function_expression(component)) === "amb";
}
function amb_choices(component) {
    return arg_expressions(component);
}

// Not in the book's evaluator: && and || as derived conditional
// expressions, as in exercise 4.4, so that requirements can use them.
function is_logical_composition(component) {
    return is_tagged_list(component, "logical_composition");
}
function logical_composition_to_conditional(component) {
    const operator = list_ref(component, 1);
    const left = list_ref(component, 2);
    const right = list_ref(component, 3);
    return operator === "&&"
           ? list("conditional_expression", left, right,
                  make_literal(false))
           : list("conditional_expression", left,
                  make_literal(true), right);
}
`;

/** §4.3.3: the execution function for `amb`, the heart of the evaluator. */
export const analyzeAmb = `function analyze_amb(component) {
    const cfuns = map(analyze, amb_choices(component));
    return (env, succeed, fail) => {
               function try_next(choices) {
                   return is_null(choices)
                          ? fail()
                          : head(choices)(env,
                                          succeed,
                                          () =>
                                            try_next(tail(choices)));
               }
               return try_next(cfuns);
           };
}`;

/** §4.3.3: `ambeval`, `analyze` and the execution functions with continuations. */
export const ambAnalyze = `function ambeval(component, env, succeed, fail) {
    return analyze(component)(env, succeed, fail);
}

function analyze(component) {
    return is_literal(component)
           ? analyze_literal(component)
           : is_name(component)
           ? analyze_name(component)
           : is_amb(component)
           ? analyze_amb(component)
           : is_application(component)
           ? analyze_application(component)
           : is_operator_combination(component)
           ? analyze(operator_combination_to_application(component))
           : is_logical_composition(component)
           ? analyze(logical_composition_to_conditional(component))
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
    return (env, succeed, fail) =>
             succeed(literal_value(component), fail);
}

function analyze_name(component) {
    return (env, succeed, fail) =>
             succeed(lookup_symbol_value(symbol_of_name(component),
                                         env),
                     fail);
}

function analyze_lambda_expression(component) {
    const params = lambda_parameter_symbols(component);
    const bfun = analyze(lambda_body(component));
    return (env, succeed, fail) =>
             succeed(make_function(params, bfun, env),
                     fail);
}

function analyze_conditional(component) {
    const pfun = analyze(conditional_predicate(component));
    const cfun = analyze(conditional_consequent(component));
    const afun = analyze(conditional_alternative(component));
    return (env, succeed, fail) =>
             pfun(env,
                  // success continuation for evaluating the predicate
                  // to obtain pred_value
                  (pred_value, fail2) =>
                    is_truthy(pred_value)
                    ? cfun(env, succeed, fail2)
                    : afun(env, succeed, fail2),
                  // failure continuation for evaluating the predicate
                  fail);
}

function analyze_sequence(stmts) {
    function sequentially(a, b) {
        return (env, succeed, fail) =>
                 a(env,
                   // success continuation for calling a
                   (a_value, fail2) =>
                     is_return_value(a_value)
                     ? succeed(a_value, fail2)
                     : b(env, succeed, fail2),
                   // failure continuation for calling a
                   fail);
    }
    function loop(first_fun, rest_funs) {
        return is_null(rest_funs)
               ? first_fun
               : loop(sequentially(first_fun, head(rest_funs)),
                      tail(rest_funs));
    }
    const funs = map(analyze, stmts);
    // The book has env => undefined here, which never calls succeed:
    // an empty block, such as the else {} of require, must succeed.
    return is_null(funs)
           ? (env, succeed, fail) => succeed(undefined, fail)
           : loop(head(funs), tail(funs));
}

function analyze_declaration(component) {
    const symbol = declaration_symbol(component);
    const vfun = analyze(declaration_value_expression(component));
    return (env, succeed, fail) =>
             vfun(env,
                  (val, fail2) => {
                      assign_symbol_value(symbol, val, env);
                      return succeed(undefined, fail2);
                  },
                  fail);
}

function analyze_assignment(component) {
    const symbol = assignment_symbol(component);
    const vfun = analyze(assignment_value_expression(component));
    return (env, succeed, fail) =>
             vfun(env,
                  (val, fail2) => {              // *1*
                      const old_value = lookup_symbol_value(symbol,
                                                            env);
                      assign_symbol_value(symbol, val, env);
                      return succeed(val,
                                     () => {     // *2*
                                         assign_symbol_value(symbol,
                                                             old_value,
                                                             env);
                                         return fail2();
                                     });
                  },
                  fail);
}

function analyze_return_statement(component) {
    const rfun = analyze(return_expression(component));
    return (env, succeed, fail) =>
             rfun(env,
                  (val, fail2) =>
                    succeed(make_return_value(val), fail2),
                  fail);
}

function analyze_block(component) {
    const body = block_body(component);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    const bfun = analyze(body);
    return (env, succeed, fail) =>
             bfun(extend_environment(locals, unassigneds, env),
                  succeed,
                  fail);
}

function analyze_application(component) {
    const ffun = analyze(function_expression(component));
    const afuns = map(analyze, arg_expressions(component));
    return (env, succeed, fail) =>
             ffun(env,
                  (fun, fail2) =>
                    get_args(afuns,
                             env,
                             (args, fail3) =>
                               execute_application(fun,
                                                   args,
                                                   succeed,
                                                   fail3),
                             fail2),
                  fail);
}

function get_args(afuns, env, succeed, fail) {
    return is_null(afuns)
           ? succeed(null, fail)
           : head(afuns)(env,
                         // success continuation for this afun
                         (arg, fail2) =>
                           get_args(tail(afuns),
                                    env,
                                    // success continuation for
                                    // recursive call to get_args
                                    (args, fail3) =>
                                      succeed(pair(arg, args),
                                              fail3),
                                    fail2),
                         fail);
}

function execute_application(fun, args, succeed, fail) {
    return is_primitive_function(fun)
           ? succeed(apply_primitive_function(fun, args),
                     fail)
           : is_compound_function(fun)
           ? function_body(fun)(
                 extend_environment(function_parameters(fun),
                                    args,
                                    function_environment(fun)),
                 (body_result, fail2) =>
                   succeed(is_return_value(body_result)
                           ? return_value_content(body_result)
                           : undefined,
                           fail2),
                 fail)
           : error(fun, "unknown function type - execute_application");
}

${analyzeAmb}
`;

/**
 * §4.3.2: `distinct`, from the book's footnote. It makes no choices, so the
 * evaluator gets it as a primitive: the puzzles then spend their steps on
 * the search rather than on comparing lists.
 */
export const ambDistinct = `function distinct(items) {
    return is_null(items)
           ? true
           : is_null(tail(items))
           ? true
           : is_null(member(head(items), tail(items)))
           ? distinct(tail(items))
           : false;
}
`;

/**
 * The primitives of §4.1.4 and a few more that the programs of §4.3 use, the
 * most frequently looked up first: names are found by scanning frames.
 */
const ambPrimitives = `const primitive_functions = list(
       list("is_null", is_null          ),
       list("head",    head             ),
       list("tail",    tail             ),
       list("list",    list             ),
       list("member",  member           ),
       list("!",        x     =>   ! x  ),
       list("pair",    pair             ),
       list("===",     (x, y) => x === y),
       list("!==",     (x, y) => x !== y),
       list(">",       (x, y) => x >   y),
       list("<",       (x, y) => x <   y),
       list("+",       (x, y) => x + y  ),
       list("-",       (x, y) => x - y  ),
       list("math_abs",math_abs         ),
       list(">=",      (x, y) => x >=  y),
       list("<=",      (x, y) => x <=  y),
       list("*",       (x, y) => x * y  ),
       list("/",       (x, y) => x / y  ),
       list("%",       (x, y) => x % y  ),
       list("-unary",   x     =>   - x  ),
       list("is_pair", is_pair          ),
       list("length",  length           ),
       list("append",  append           ),
       list("reverse", reverse          ),
       list("list_ref",list_ref         ),
       list("equal",   equal            ),
       list("distinct",distinct         ),
       list("display", display          ),
       list("error",   error            ),
       list("math_sqrt",math_sqrt       ),
       list("math_floor",math_floor     ),
       list("math_random",math_random   ),
       list("is_integer", x => is_number(x) && math_floor(x) === x)
);
`;

/** Drivers that take their inputs as arguments instead of from a prompt. */
const ambDrivers = `const input_prompt = "amb-evaluate input:";
const output_prompt = "amb-evaluate value:";

// A program is a string, or a list of programs that are its lines.
function program_text(input) {
    return is_string(input)
           ? input
           : accumulate((line, rest) => program_text(line) + "\\n" + rest,
                        "", input);
}

// The frame a program's own declarations live in, as the driver loop
// makes it for each new problem.
function program_environment(program, env) {
    const locals = scan_out_declarations(program);
    return extend_environment(locals, list_of_unassigned(locals), env);
}

// The book's driver loop, reading from the list inputs instead of from a
// prompt: each input is a program, or "retry" for its next value.
function driver_loop(env, inputs) {
    let unread = inputs;
    function user_read(prompt_string) {
        if (is_null(unread)) {
            return null;
        } else {
            const input = program_text(head(unread));
            unread = tail(unread);
            display(input, prompt_string);
            return input;
        }
    }
    function internal_loop(retry) {
        const input = user_read(input_prompt);
        if (is_null(input)) {
            display("evaluator terminated");
        } else if (input === "retry") {
            return retry();
        } else {
            display("Starting a new problem");
            const program = parse(input);
            const program_env = program_environment(program, env);
            return ambeval(
                       program,
                       program_env,
                       // ambeval success
                       (val, next_alternative) => {
                           user_print(output_prompt, val);
                           return internal_loop(next_alternative);
                       },
                       // ambeval failure
                       () => {
                           display("There are no more values of");
                           display(input);
                           return driver_loop(program_env, unread);
                       });
        }
    }
    return internal_loop(() => {
                             display("There is no current problem");
                             return driver_loop(env, unread);
                         });
}

// The first n values of a program, as a list: a new problem, then retry
// until there are n values or no more.
function amb_solutions(input, n) {
    const program = parse(program_text(input));
    let values = null;
    let count = 0;
    function solution_found(value, next_alternative) {
        values = pair(value, values);
        count = count + 1;
        return count < n
               ? next_alternative()
               : reverse(values);
    }
    return ambeval(program,
                   program_environment(program, the_global_environment),
                   solution_found,
                   () => reverse(values));
}

// The environment env with the declarations of an amb program added.
function with_declarations(env, input) {
    const program = parse(program_text(input));
    const program_env = program_environment(program, env);
    return ambeval(program,
                   program_env,
                   (value, fail) => program_env,
                   () => error(input, "no value for declarations"));
}
`;

/**
 * §4.3.1: what the book declares in the nondeterministic language itself
 * before running its examples.
 */
export const ambLibrary = `function require(p) {
    if (! p) {
        amb();
    } else {}
}

function an_element_of(items) {
    require(! is_null(items));
    return amb(head(items), an_element_of(tail(items)));
}

function an_integer_starting_from(n) {
    return amb(n, an_integer_starting_from(n + 1));
}
`;

/**
 * The amb evaluator with `the_global_environment` holding the primitives,
 * `ambLibrary` and then the given amb programs' declarations.
 */
export function ambEvaluatorWith(...programs: string[]): string {
  // One program, so one frame: every lookup of a primitive passes through it.
  const declarations = JSON.stringify([ambLibrary, ...programs].join('\n'));
  return [
    evaluatorSyntax,
    evaluatorData,
    pick(evaluatorCore, 'scan_out_declarations', 'list_of_unassigned'),
    pick(
      evaluatorSetup,
      'is_primitive_function',
      'primitive_implementation',
    ),
    ambDistinct,
    ambPrimitives,
    pick(
      evaluatorSetup,
      'primitive_function_symbols',
      'primitive_function_objects',
      'primitive_constants',
      'primitive_constant_symbols',
      'primitive_constant_values',
      'apply_primitive_function',
      'setup_environment',
      'user_print',
    ),
    ambSyntax,
    ambAnalyze,
    ambDrivers,
    `const the_global_environment =\n    with_declarations(setup_environment(), ${declarations});\n`,
  ].join('\n');
}

/** The amb evaluator with only the library of §4.3.1 declared. */
export const ambEvaluator = ambEvaluatorWith();

/** §4.3: `prime_sum_pair` and the `is_prime` it assumes. */
export const ambPrimeSumPair = `function is_prime(n) {
    function divides(d) {
        return d * d > n
               ? false
               : n % d === 0 || divides(d + 1);
    }
    return n > 1 && ! divides(2);
}

function prime_sum_pair(list1, list2) {
    const a = an_element_of(list1);
    const b = an_element_of(list2);
    require(is_prime(a + b));
    return list(a, b);
}
`;

/** Exercise 4.33: Pythagorean triples between two bounds, with its solution. */
export const ambPythagoreanTriples = `function an_integer_between(low, high) {
    require(low <= high);
    return amb(low, an_integer_between(low + 1, high));
}

function a_pythagorean_triple_between(low, high) {
    const i = an_integer_between(low, high);
    const j = an_integer_between(i, high);
    const k = an_integer_between(j, high);
    require(i * i + j * j === k * k);
    return list(i, j, k);
}
`;

/** §4.3.2: the office-move puzzle, as the book first writes it. */
export const ambOfficeMove = `function office_move() {
    const alyssa = amb(1, 2, 3, 4, 5);
    const ben = amb(1, 2, 3, 4, 5);
    const cy = amb(1, 2, 3, 4, 5);
    const lem = amb(1, 2, 3, 4, 5);
    const louis = amb(1, 2, 3, 4, 5);
    require(distinct(list(alyssa, ben, cy, lem, louis)));
    require(alyssa !== 5);
    require(ben !== 1);
    require(cy !== 5);
    require(cy !== 1);
    require(lem > ben);
    require(math_abs(louis - cy) !== 1);
    require(math_abs(cy - ben) !== 1);
    return list(list("alyssa", alyssa),
                list("ben", ben),
                list("cy", cy),
                list("lem", lem),
                list("louis", louis));
}
`;

/** §4.3.2: the parser of simple sentences, the book's final grammar. */
export const ambSentenceParser = `const nouns = list("noun", "student", "professor", "cat", "class");

const verbs = list("verb", "studies", "lectures", "eats", "sleeps");

const articles = list("article", "the", "a");

const prepositions = list("prep", "for", "to", "in", "by", "with");

function parse_word(word_list) {
    require(! is_null(not_yet_parsed));
    require(! is_null(member(head(not_yet_parsed), tail(word_list))));
    const found_word = head(not_yet_parsed);
    not_yet_parsed = tail(not_yet_parsed);
    return list(head(word_list), found_word);
}

let not_yet_parsed = null;

function parse_input(input) {
    not_yet_parsed = input;
    const sent = parse_sentence();
    require(is_null(not_yet_parsed));
    return sent;
}

function parse_prepositional_phrase() {
    return list("prep-phrase",
                parse_word(prepositions),
                parse_noun_phrase());
}

function parse_sentence() {
    return list("sentence",
                parse_noun_phrase(),
                parse_verb_phrase());
}

function parse_verb_phrase() {
    function maybe_extend(verb_phrase) {
        return amb(verb_phrase,
                   maybe_extend(list("verb-phrase",
                                     verb_phrase,
                                     parse_prepositional_phrase())));
    }
    return maybe_extend(parse_word(verbs));
}

function parse_simple_noun_phrase() {
    return list("simple-noun-phrase",
                parse_word(articles),
                parse_word(nouns));
}

function parse_noun_phrase() {
    function maybe_extend(noun_phrase) {
        return amb(noun_phrase,
                   maybe_extend(list("noun-phrase",
                                     noun_phrase,
                                     parse_prepositional_phrase())));
    }
    return maybe_extend(parse_simple_noun_phrase());
}
`;

/**
 * For the search-tree animation: \`analyze_amb\` with three calls added that
 * do nothing but can be watched in the call log. \`amb_tried\` marks the
 * start of each alternative, \`amb_chose\` the value an alternative
 * produced, and \`amb_exhausted\` a choice point that has none left, \`amb()\`
 * among them. Choice points are numbered as they are reached.
 */
const probedAnalyzeAmb = `let amb_points = 0;
function amb_tried(point, index, count, amb_text, choice_text) {
    return undefined;
}
function amb_chose(point, index, value) {
    return undefined;
}
function amb_exhausted(point, count) {
    return undefined;
}
function amb_text_of(component) {
    function texts(components) {
        return is_null(components)
               ? ""
               : is_null(tail(components))
               ? amb_text_of(head(components))
               : amb_text_of(head(components)) + ", " +
                 texts(tail(components));
    }
    return is_literal(component)
           ? stringify(literal_value(component))
           : is_name(component)
           ? symbol_of_name(component)
           : is_application(component)
           ? amb_text_of(function_expression(component)) +
             "(" + texts(arg_expressions(component)) + ")"
           : is_binary_operator_combination(component)
           ? amb_text_of(first_operand(component)) + " " +
             operator_symbol(component) + " " +
             amb_text_of(second_operand(component))
           : is_unary_operator_combination(component)
           ? (operator_symbol(component) === "!" ? "!" : "-") +
             amb_text_of(first_operand(component))
           : "…";
}
function analyze_amb(component) {
    const cfuns = map(analyze, amb_choices(component));
    const texts = map(amb_text_of, amb_choices(component));
    const amb_text = amb_text_of(component);
    const count = length(cfuns);
    return (env, succeed, fail) => {
               amb_points = amb_points + 1;
               const point = amb_points;
               function try_next(choices, texts, index) {
                   if (is_null(choices)) {
                       amb_exhausted(point, count);
                       return fail();
                   } else {
                       amb_tried(point, index, count, amb_text, head(texts));
                       return head(choices)(
                                  env,
                                  (value, fail2) => {
                                      amb_chose(point, index, value);
                                      return succeed(value, fail2);
                                  },
                                  () => try_next(tail(choices), tail(texts),
                                                 index + 1));
                   }
               }
               return try_next(cfuns, texts, 0);
           };
}`;

/** The functions the search-tree animation watches. */
export const ambProbeNames = ['amb_tried', 'amb_chose', 'amb_exhausted', 'solution_found', 'user_print'] as const;

/**
 * The amb evaluator \`prelude\` with the watched \`analyze_amb\`, or \`null\` when
 * the prelude is not an amb evaluator.
 */
export function withSearchProbe(prelude: string): string | null {
  return prelude.includes(analyzeAmb) ? prelude.replace(analyzeAmb, probedAnalyzeAmb) : null;
}

/** The evaluator for the examples of §4.3.1. */
export const ambPrelude = ambEvaluatorWith(ambPrimeSumPair);

/** §4.3.1: an \`amb\` expression's possible values. */
export const ambChoicesProgram = `amb_solutions('list(amb(1, 2, 3), amb("a", "b"));', 10);
`;

/** §4.3.1: a small search, for the search tree. */
export const ambSearchProgram = `const program = list(
    "const x = amb(1, 2, 3);",
    "const y = amb(4, 5);",
    "require(x + y === 7);",
    "list(x, y);");

amb_solutions(program, 10);
`;

/** §4.3.1: the book's interaction with the driver loop. */
export const primeSumPairProgram = `driver_loop(the_global_environment, list(
    "prime_sum_pair(list(1, 3, 5, 8), list(20, 35, 110));",
    "retry",
    "retry",
    "retry",
    "prime_sum_pair(list(19, 27, 30), list(11, 36, 58));"));
`;

/** §4.3.1: an infinite range of choices, of which we ask for a few. */
export const integersProgram = `amb_solutions(list(
    "const n = an_integer_starting_from(1);",
    "require(n * n > 50);",
    "n;"), 3);
`;

/** The evaluators for the examples of §4.3.2, the puzzle and the parser. */
export const ambOfficePrelude = ambEvaluatorWith(ambOfficeMove);
export const ambParserPrelude = ambEvaluatorWith(ambSentenceParser);

/** §4.3.2: the office-move puzzle. */
export const officeMoveProgram = `amb_solutions("office_move();", 1);
`;

/** §4.3.2: a sentence with two parses, and the driver loop's retry. */
export const ambiguousSentenceProgram = `const sentence = "list('the', 'professor', 'lectures', 'to', " +
                 "'the', 'student', 'with', 'the', 'cat')";

driver_loop(the_global_environment,
            list("parse_input(" + sentence + ");", "retry", "retry"));
`;

/** §4.3.2: a sentence with one parse. */
export const sentenceProgram = `amb_solutions(list(
    'parse_input(list("the", "student", "with", "the", "cat",',
    '                 "sleeps", "in", "the", "class"));'), 2);
`;

/** §4.3.3: \`ambeval\` called with continuations of our own. */
export const ambevalProgram = `function first_value(input) {
    const program = parse(input);
    return ambeval(program,
                   program_environment(program, the_global_environment),
                   (value, fail) => value,
                   () => "failed");
}

display(first_value("amb(1, 2, 3);"));
display(first_value("const x = amb(1, 2, 3); require(x > 1); x * 10;"));
first_value("amb();");
`;

/** §4.3.3: an assignment undone by backtracking. */
export const undoProgram = `amb_solutions(list(
    "let count = 0;",
    "const x = amb(1, 2, 3);",
    "count = count + 1;",
    "require(x === 3);",
    "list(x, count);"), 1);
`;
