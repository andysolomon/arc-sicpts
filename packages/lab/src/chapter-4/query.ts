import { metacircularEvaluator } from './metacircular.ts';

/**
 * The query system of §4.4.4, as a Source program, following the book's
 * JavaScript version: queries are written in JavaScript syntax, `parse`d, and
 * turned into the query language's own representation by
 * `convert_to_query_syntax`. Each part is the code of one subsection, so a page
 * or an exercise can show or replace one part and keep the rest hidden.
 *
 * The system needs `parse` and the syntax functions of §4.1.2, and its
 * `javascript_predicate` evaluates with the metacircular evaluator, so it runs
 * on top of `metacircularEvaluator`.
 */

/** §3.3.3: two-dimensional tables, for `put` and `get`. */
export const queryTable = `function assoc(key, records) {
    return is_null(records)
           ? undefined
           : equal(key, head(head(records)))
           ? head(records)
           : assoc(key, tail(records));
}

function make_table() {
    const local_table = list("*table*");
    function lookup(key_1, key_2) {
        const subtable = assoc(key_1, tail(local_table));
        if (is_undefined(subtable)) {
            return undefined;
        } else {
            const record = assoc(key_2, tail(subtable));
            return is_undefined(record)
                   ? undefined
                   : tail(record);
        }
    }
    function insert(key_1, key_2, value) {
        const subtable = assoc(key_1, tail(local_table));
        if (is_undefined(subtable)) {
            set_tail(local_table,
                     pair(list(key_1, pair(key_2, value)),
                          tail(local_table)));
        } else {
            const record = assoc(key_2, tail(subtable));
            if (is_undefined(record)) {
                set_tail(subtable,
                         pair(pair(key_2, value), tail(subtable)));
            } else {
                set_tail(record, value);
            }
        }
    }
    function dispatch(m) {
        return m === "lookup"
               ? lookup
               : m === "insert"
               ? insert
               : error(m, "unknown operation -- table");
    }
    return dispatch;
}

const operation_table = make_table();
const get = operation_table("lookup");
const put = operation_table("insert");
`;

/** §4.4.4.2: the evaluator. */
export const queryEval = `function evaluate_query(query, frame_stream) {
    const qfun = get(type(query), "evaluate_query");
    return is_undefined(qfun)
           ? simple_query(query, frame_stream)
           : qfun(contents(query), frame_stream);
}

function simple_query(query_pattern, frame_stream) {
    return stream_flatmap(
               frame =>
                 stream_append_delayed(
                     find_assertions(query_pattern, frame),
                     () => apply_rules(query_pattern, frame)),
               frame_stream);
}

function conjoin(conjuncts, frame_stream) {
    return is_empty_conjunction(conjuncts)
           ? frame_stream
           : conjoin(rest_conjuncts(conjuncts),
                     evaluate_query(first_conjunct(conjuncts),
                                    frame_stream));
}
put("and", "evaluate_query", conjoin);

function disjoin(disjuncts, frame_stream) {
    return is_empty_disjunction(disjuncts)
           ? null
           : interleave_delayed(
                 evaluate_query(first_disjunct(disjuncts), frame_stream),
                 () => disjoin(rest_disjuncts(disjuncts), frame_stream));
}
put("or", "evaluate_query", disjoin);

function negate(exps, frame_stream) {
    return stream_flatmap(
               frame =>
                 is_null(evaluate_query(negated_query(exps),
                                        singleton_stream(frame)))
                 ? singleton_stream(frame)
                 : null,
               frame_stream);
}
put("not", "evaluate_query", negate);

function javascript_predicate(exps, frame_stream) {
    return stream_flatmap(
               frame =>
                 evaluate(instantiate_expression(
                              javascript_predicate_expression(exps),
                              frame),
                          the_global_environment)
                 ? singleton_stream(frame)
                 : null,
               frame_stream);
}
put("javascript_predicate", "evaluate_query", javascript_predicate);

function always_true(ignore, frame_stream) {
    return frame_stream;
}
put("always_true", "evaluate_query", always_true);
`;

/** §4.4.4.3: finding assertions by pattern matching. */
export const queryAssertions = `function find_assertions(pattern, frame) {
    return stream_flatmap(
               datum => check_an_assertion(datum, pattern, frame),
               fetch_assertions(pattern, frame));
}

function check_an_assertion(assertion, query_pat, query_frame) {
    const match_result = pattern_match(query_pat, assertion,
                                       query_frame);
    return match_result === "failed"
           ? null
           : singleton_stream(match_result);
}

function pattern_match(pattern, data, frame) {
    return frame === "failed"
           ? "failed"
           : equal(pattern, data)
           ? frame
           : is_variable(pattern)
           ? extend_if_consistent(pattern, data, frame)
           : is_pair(pattern) && is_pair(data)
           ? pattern_match(tail(pattern),
                           tail(data),
                           pattern_match(head(pattern),
                                         head(data),
                                         frame))
           : "failed";
}

function extend_if_consistent(variable, data, frame) {
    const binding = binding_in_frame(variable, frame);
    return is_undefined(binding)
           ? extend(variable, data, frame)
           : pattern_match(binding_value(binding), data, frame);
}
`;

/** §4.4.4.4: rules and unification. */
export const queryRules = `function apply_rules(pattern, frame) {
    return stream_flatmap(rule => apply_a_rule(rule, pattern, frame),
                          fetch_rules(pattern, frame));
}

function apply_a_rule(rule, query_pattern, query_frame) {
    const clean_rule = rename_variables_in(rule);
    const unify_result = unify_match(query_pattern,
                                     conclusion(clean_rule),
                                     query_frame);
    return unify_result === "failed"
           ? null
           : evaluate_query(rule_body(clean_rule),
                            singleton_stream(unify_result));
}

function rename_variables_in(rule) {
    const rule_application_id = new_rule_application_id();
    function tree_walk(exp) {
        return is_variable(exp)
               ? make_new_variable(exp, rule_application_id)
               : is_pair(exp)
               ? pair(tree_walk(head(exp)),
                      tree_walk(tail(exp)))
               : exp;
    }
    return tree_walk(rule);
}

function unify_match(p1, p2, frame) {
    return frame === "failed"
           ? "failed"
           : equal(p1, p2)
           ? frame
           : is_variable(p1)
           ? extend_if_possible(p1, p2, frame)
           : is_variable(p2)
           ? extend_if_possible(p2, p1, frame)
           : is_pair(p1) && is_pair(p2)
           ? unify_match(tail(p1),
                         tail(p2),
                         unify_match(head(p1),
                                     head(p2),
                                     frame))
           : "failed";
}

function extend_if_possible(variable, value, frame) {
    const binding = binding_in_frame(variable, frame);
    if (! is_undefined(binding)) {
        return unify_match(binding_value(binding),
                           value, frame);
    } else if (is_variable(value)) {
        const binding = binding_in_frame(value, frame);
        return ! is_undefined(binding)
               ? unify_match(variable,
                             binding_value(binding),
                             frame)
               : extend(variable, value, frame);
    } else if (depends_on(value, variable, frame)) {
        return "failed";
    } else {
        return extend(variable, value, frame);
    }
}

function depends_on(expression, variable, frame) {
    function tree_walk(e) {
        if (is_variable(e)) {
            if (equal(variable, e)) {
                return true;
            } else {
                const b = binding_in_frame(e, frame);
                return is_undefined(b)
                       ? false
                       : tree_walk(binding_value(b));
            }
        } else {
            return is_pair(e)
                   ? tree_walk(head(e)) || tree_walk(tail(e))
                   : false;
        }
    }
    return tree_walk(expression);
}
`;

/** §4.4.4.5: maintaining the data base. */
export const queryDataBase = `function fetch_assertions(pattern, frame) {
    return get_indexed_assertions(pattern);
}
function get_indexed_assertions(pattern) {
    return get_stream(index_key_of(pattern), "assertion-stream");
}

function get_stream(key1, key2) {
    const s = get(key1, key2);
    return is_undefined(s) ? null : s;
}

function fetch_rules(pattern, frame) {
    return get_indexed_rules(pattern);
}
function get_indexed_rules(pattern) {
    return get_stream(index_key_of(pattern), "rule-stream");
}

function add_rule_or_assertion(assertion) {
    return is_rule(assertion)
           ? add_rule(assertion)
           : add_assertion(assertion);
}
function add_assertion(assertion) {
    store_assertion_in_index(assertion);
    return "ok";
}
function add_rule(rule) {
    store_rule_in_index(rule);
    return "ok";
}

function store_assertion_in_index(assertion) {
    const key = index_key_of(assertion);
    const current_assertion_stream =
                get_stream(key, "assertion-stream");
    put(key, "assertion-stream",
        pair(assertion, () => current_assertion_stream));
}
function store_rule_in_index(rule) {
    const pattern = conclusion(rule);
    const key = index_key_of(pattern);
    const current_rule_stream =
                get_stream(key, "rule-stream");
    put(key, "rule-stream",
        pair(rule, () => current_rule_stream));
}

function index_key_of(pattern) { return head(pattern); }
`;

/** §4.4.4.6: stream operations. */
export const queryStreams = `function stream_append_delayed(s1, delayed_s2) {
    return is_null(s1)
           ? delayed_s2()
           : pair(head(s1),
                  () => stream_append_delayed(stream_tail(s1),
                                              delayed_s2));
}
function interleave_delayed(s1, delayed_s2) {
    return is_null(s1)
           ? delayed_s2()
           : pair(head(s1),
                  () => interleave_delayed(delayed_s2(),
                                           () => stream_tail(s1)));
}

function stream_flatmap(fun, s) {
    return flatten_stream(stream_map(fun, s));
}
function flatten_stream(stream) {
    return is_null(stream)
           ? null
           : interleave_delayed(
                 head(stream),
                 () => flatten_stream(stream_tail(stream)));
}

function singleton_stream(x) {
    return pair(x, () => null);
}
`;

/** §4.4.4.7: query syntax functions and instantiation. */
export const querySyntax = `// The book uses a primitive char_at here. Comparing strings does the same
// job: a symbol starts with "$" exactly when it lies between "$" and "%".
function is_variable(exp) {
    return is_name(exp) && symbol_of_name(exp) >= "$"
                        && symbol_of_name(exp) < "%";
}

let rule_counter = 0;

function new_rule_application_id() {
    rule_counter = rule_counter + 1;
    return rule_counter;
}
function make_new_variable(variable, rule_application_id) {
    return make_name(symbol_of_name(variable) + "_" +
                     stringify(rule_application_id));
}

function convert_to_query_syntax(exp) {
    if (is_application(exp)) {
        const function_symbol = symbol_of_name(function_expression(exp));
        if (function_symbol === "javascript_predicate") {
            return pair(function_symbol, arg_expressions(exp));
        } else {
            const processed_args = map(convert_to_query_syntax,
                                       arg_expressions(exp));
            return function_symbol === "pair"
                   ? pair(head(processed_args), head(tail(processed_args)))
                   : function_symbol === "list"
                   ? processed_args
                   : pair(function_symbol, processed_args);
        }
    } else if (is_variable(exp)) {
        return exp;
    } else { // exp is literal
        return literal_value(exp);
    }
}

function instantiate_expression(expression, frame) {
    return is_variable(expression)
           ? convert(instantiate_term(expression, frame))
           : is_pair(expression)
           ? pair(instantiate_expression(head(expression), frame),
                  instantiate_expression(tail(expression), frame))
           : expression;
}

function instantiate_term(term, frame) {
    if (is_variable(term)) {
        const binding = binding_in_frame(term, frame);
        return is_undefined(binding)
               ? term  // leave unbound variable as is
               : instantiate_term(binding_value(binding), frame);
    } else if (is_pair(term)) {
        return pair(instantiate_term(head(term), frame),
                    instantiate_term(tail(term), frame));
    } else { // term is a primitive value
        return term;
    }
}

function convert(term) {
    return is_variable(term)
           ? term
           : is_pair(term)
           ? make_application(make_name("pair"),
                              list(convert(head(term)),
                                   convert(tail(term))))
           : // term is a primitive value
             make_literal(term);
}

function unparse(exp) {
    return is_literal(exp)
           ? unparse_literal(literal_value(exp))
           : is_name(exp)
           ? symbol_of_name(exp)
           : is_list_construction(exp)
           ? unparse(make_application(make_name("list"),
                                      element_expressions(exp)))
           : is_application(exp) && is_name(function_expression(exp))
           ? symbol_of_name(function_expression(exp)) +
                 "(" +
                 comma_separated(map(unparse, arg_expressions(exp))) +
                 ")"
           : is_binary_operator_combination(exp)
           ? "(" + unparse(first_operand(exp)) +
             " " + operator_symbol(exp) +
             " " + unparse(second_operand(exp)) +
             ")"
           : error(exp, "unknown syntax -- unparse");
}

// The book stringifies every literal. An answer is itself displayed as a
// string, which puts it in double quotes, so the strings inside it get single
// quotes to stay readable.
function unparse_literal(value) {
    return is_string(value)
           ? "'" + value + "'"
           : stringify(value);
}

function comma_separated(strings) {
    return accumulate((s, acc) => s + (acc === "" ? "" : ", " + acc),
                      "",
                      strings);
}

function is_list_construction(exp) {
    return (is_literal(exp) && is_null(literal_value(exp))) ||
           (is_application(exp) && is_name(function_expression(exp)) &&
            symbol_of_name(function_expression(exp)) === "pair" &&
            is_list_construction(head(tail(arg_expressions(exp)))));
}

function element_expressions(list_constr) {
    return is_literal(list_constr)
           ? null // list_constr is literal null
           :      // list_constr is application of pair
             pair(head(arg_expressions(list_constr)),
                  element_expressions(
                      head(tail(arg_expressions(list_constr)))));
}

function type(exp) {
    return is_pair(exp)
           ? head(exp)
           : error(exp, "unknown expression type");
}
function contents(exp) {
    return is_pair(exp)
           ? tail(exp)
           : error(exp, "unknown expression contents");
}

function is_assertion(exp) {
    return type(exp) === "assert";
}
function assertion_body(exp) { return head(contents(exp)); }

function is_empty_conjunction(exps) { return is_null(exps); }

function first_conjunct(exps) { return head(exps); }

function rest_conjuncts(exps) { return tail(exps); }

function is_empty_disjunction(exps) { return is_null(exps); }

function first_disjunct(exps) { return head(exps); }

function rest_disjuncts(exps) { return tail(exps); }

function negated_query(exps) { return head(exps); }

function javascript_predicate_expression(exps) { return head(exps); }

function is_rule(assertion) {
    return is_tagged_list(assertion, "rule");
}
function conclusion(rule) { return head(tail(rule)); }

function rule_body(rule) {
    return is_null(tail(tail(rule)))
           ? list("always_true")
           : head(tail(tail(rule)));
}
`;

/** §4.4.4.8: frames and bindings. */
export const queryFrames = `function make_binding(variable, value) {
    return pair(variable, value);
}
function binding_variable(binding) {
    return head(binding);
}
function binding_value(binding) {
    return tail(binding);
}
function binding_in_frame(variable, frame) {
    return assoc(variable, frame);
}
function extend(variable, value, frame) {
    return pair(make_binding(variable, value), frame);
}
`;

/**
 * §4.4.4.1, for the Laboratory. The book's `query_driver_loop` reads each input
 * with a prompt; here `query` takes the input as a string, adds it to the data
 * base when it is an `assert`, and otherwise displays every answer as it is
 * found and returns how many there were. The other functions give the answers
 * as data, for programs and checks that compute with them.
 */
export const queryDriver = `function query(input) {
    const expression = parse(input + ";");
    const query_syntax = convert_to_query_syntax(expression);
    if (is_assertion(query_syntax)) {
        add_rule_or_assertion(assertion_body(query_syntax));
        display("Assertion added to data base.");
        return undefined;
    } else {
        return display_answers(
                   stream_map(
                       frame =>
                         unparse(instantiate_expression(expression, frame)),
                       evaluate_query(query_syntax, singleton_stream(null))));
    }
}

function display_answers(answers) {
    function display_next(s, count) {
        if (is_null(s)) {
            return count;
        } else {
            display(head(s));
            return display_next(stream_tail(s), count + 1);
        }
    }
    return display_next(answers, 0);
}

// Each of the strings, an assertion or a rule, added to the data base.
function assert_all(inputs) {
    return for_each(input => add_rule_or_assertion(
                                 convert_to_query_syntax(
                                     parse(input + ";"))),
                    inputs);
}

// A pattern written in JavaScript syntax, in the query language's form.
function pattern_of(input) {
    return convert_to_query_syntax(parse(input + ";"));
}

// A frame as text, one variable = value for each binding, oldest first.
function frame_text(frame) {
    return frame === "failed"
           ? "failed"
           : is_null(frame)
           ? "the empty frame"
           : comma_separated(
                 map(binding =>
                       symbol_of_name(binding_variable(binding)) + " = " +
                       unparse(convert(binding_value(binding))),
                     reverse(frame)));
}

// The stream of frames that satisfy a query.
function query_frames(input) {
    return evaluate_query(convert_to_query_syntax(parse(input + ";")),
                          singleton_stream(null));
}

// The answers to a query, as unparsed strings.
function answers(input) {
    const expression = parse(input + ";");
    return map(frame => unparse(instantiate_expression(expression, frame)),
               stream_to_list(query_frames(input)));
}

// The value of a pattern variable, such as "$x", in each answer.
function values_of(variable, input) {
    return map(frame => instantiate_term(make_name(variable), frame),
               stream_to_list(query_frames(input)));
}

// For each answer, the list of the values of the given variables.
function bindings_of(variables, input) {
    return map(frame => map(variable => instantiate_term(make_name(variable),
                                                         frame),
                            variables),
               stream_to_list(query_frames(input)));
}

// The values of one variable, for the first n answers only, when there may
// be infinitely many.
function first_values_of(n, variable, input) {
    function take(s, k) {
        return k === 0 || is_null(s)
               ? null
               : pair(instantiate_term(make_name(variable), head(s)),
                      k === 1 ? null : take(stream_tail(s), k - 1));
    }
    return take(query_frames(input), n);
}

function count_answers(input) {
    return length(stream_to_list(query_frames(input)));
}

// True when xs and ys hold the same elements, in any order, counting repeats.
function same_elements(xs, ys) {
    function remove_one(x, items) {
        return is_null(items)
               ? undefined
               : equal(x, head(items))
               ? tail(items)
               : is_undefined(remove_one(x, tail(items)))
               ? undefined
               : pair(head(items), remove_one(x, tail(items)));
    }
    return is_null(xs)
           ? is_null(ys)
           : ! is_undefined(remove_one(head(xs), ys)) &&
             same_elements(tail(xs), remove_one(head(xs), ys));
}
`;

/** The whole query evaluator of §4.4.4.2–4.4.4.8, without its table and driver. */
export const queryEvaluator = [queryEval, queryAssertions, queryRules, queryDataBase, queryStreams, querySyntax, queryFrames].join('\n');

/** The query system, ready to receive assertions: libraries, `evaluate`, the table, the evaluator and the driver. */
export const querySystem = [metacircularEvaluator, queryTable, queryEvaluator, queryDriver].join('\n');

/**
 * The personnel data base of Gargle (§4.4.1), with the rules the section
 * introduces, one assertion or rule per string. `store_assertion_in_index`
 * puts new entries in front, so the prelude adds them last to first and they
 * come back in the order written here, as in the book's printed answers.
 */
export const gargleAssertions: readonly string[] = [
  'address(list("Bitdiddle", "Ben"), list("Slumerville", list("Ridge", "Road"), 10))',
  'job(list("Bitdiddle", "Ben"), list("computer", "wizard"))',
  'salary(list("Bitdiddle", "Ben"), 122000)',
  'address(list("Hacker", "Alyssa", "P"), list("Cambridge", list("Mass", "Ave"), 78))',
  'job(list("Hacker", "Alyssa", "P"), list("computer", "programmer"))',
  'salary(list("Hacker", "Alyssa", "P"), 81000)',
  'supervisor(list("Hacker", "Alyssa", "P"), list("Bitdiddle", "Ben"))',
  'address(list("Fect", "Cy", "D"), list("Cambridge", list("Ames", "Street"), 3))',
  'job(list("Fect", "Cy", "D"), list("computer", "programmer"))',
  'salary(list("Fect", "Cy", "D"), 70000)',
  'supervisor(list("Fect", "Cy", "D"), list("Bitdiddle", "Ben"))',
  'address(list("Tweakit", "Lem", "E"), list("Boston", list("Bay", "State", "Road"), 22))',
  'job(list("Tweakit", "Lem", "E"), list("computer", "technician"))',
  'salary(list("Tweakit", "Lem", "E"), 51000)',
  'supervisor(list("Tweakit", "Lem", "E"), list("Bitdiddle", "Ben"))',
  'address(list("Reasoner", "Louis"), list("Slumerville", list("Pine", "Tree", "Road"), 80))',
  'job(list("Reasoner", "Louis"), list("computer", "programmer", "trainee"))',
  'salary(list("Reasoner", "Louis"), 62000)',
  'supervisor(list("Reasoner", "Louis"), list("Hacker", "Alyssa", "P"))',
  'supervisor(list("Bitdiddle", "Ben"), list("Warbucks", "Oliver"))',
  'address(list("Warbucks", "Oliver"), list("Swellesley", list("Top", "Heap", "Road")))',
  'job(list("Warbucks", "Oliver"), list("administration", "big", "wheel"))',
  'salary(list("Warbucks", "Oliver"), 314159)',
  'address(list("Scrooge", "Eben"), list("Weston", list("Shady", "Lane"), 10))',
  'job(list("Scrooge", "Eben"), list("accounting", "chief", "accountant"))',
  'salary(list("Scrooge", "Eben"), 141421)',
  'supervisor(list("Scrooge", "Eben"), list("Warbucks", "Oliver"))',
  'address(list("Cratchit", "Robert"), list("Allston", list("N", "Harvard", "Street"), 16))',
  'job(list("Cratchit", "Robert"), list("accounting", "scrivener"))',
  'salary(list("Cratchit", "Robert"), 26100)',
  'supervisor(list("Cratchit", "Robert"), list("Scrooge", "Eben"))',
  'address(list("Aull", "DeWitt"), list("Slumerville", list("Onion", "Square"), 5))',
  'job(list("Aull", "DeWitt"), list("administration", "assistant"))',
  'salary(list("Aull", "DeWitt"), 42195)',
  'supervisor(list("Aull", "DeWitt"), list("Warbucks", "Oliver"))',
  'can_do_job(list("computer", "wizard"), list("computer", "programmer"))',
  'can_do_job(list("computer", "wizard"), list("computer", "technician"))',
  'can_do_job(list("computer", "programmer"), list("computer", "programmer", "trainee"))',
  'can_do_job(list("administration", "assistant"), list("administration", "big", "wheel"))',
  'rule(lives_near($person_1, $person_2), and(address($person_1, pair($town, $rest_1)), address($person_2, pair($town, $rest_2)), not(same($person_1, $person_2))))',
  'rule(same($x, $x))',
  'rule(wheel($person), and(supervisor($middle_manager, $person), supervisor($x, $middle_manager)))',
  'rule(outranked_by($staff_person, $boss), or(supervisor($staff_person, $boss), and(supervisor($staff_person, $middle_manager), outranked_by($middle_manager, $boss))))',
  'rule(append_to_form(null, $y, $y))',
  'rule(append_to_form(pair($u, $v), $y, pair($u, $z)), append_to_form($v, $y, $z))',
];

/** Source that adds the given assertions and rules, in the order given. */
export function assertAll(assertions: readonly string[]): string {
  const strings = assertions.map((a) => `    '${a}'`).join(',\n');
  return `assert_all(reverse(list(\n${strings})));\n`;
}

/** Everything a query example needs: the query system with the Gargle data base loaded. */
export const queryPrelude = `${querySystem}\n${assertAll(gargleAssertions)}`;

/**
 * §4.4.4, exercise 4.68: Louis Reasoner's `simple_query` and `disjoin`, which
 * do without the delayed second arguments, in an otherwise unchanged system.
 */
export const louisSimpleQuery = `function simple_query(query_pattern, frame_stream) {
    return stream_flatmap(
               frame =>
                 stream_append(find_assertions(query_pattern, frame),
                               apply_rules(query_pattern, frame)),
               frame_stream);
}
function disjoin(disjuncts, frame_stream) {
    return is_empty_disjunction(disjuncts)
           ? null
           : interleave(
                 evaluate_query(first_disjunct(disjuncts), frame_stream),
                 disjoin(rest_disjuncts(disjuncts), frame_stream));
}
function interleave(s1, s2) {
    return is_null(s1)
           ? s2
           : pair(head(s1),
                  () => interleave(s2, stream_tail(s1)));
}
`;

// The programs of the section's pages. Each runs with `queryPrelude`.

/** §4.4.1: a simple query. */
export const simpleQueryProgram = `query('job($x, list("computer", "programmer"))');
`;

/** §4.4.1: \`pair\` matches a list of any length beginning with "computer". */
export const pairPatternProgram = `query('job($x, pair("computer", $type))');
`;

/** §4.4.1: \`and\` of two simple queries. */
export const andQueryProgram = `query('and(job($person, list("computer", "programmer")), address($person, $where))');
`;

/** §4.4.1: \`not\` as a filter. */
export const notQueryProgram = `query('and(supervisor($x, list("Bitdiddle", "Ben")), not(job($x, list("computer", "programmer"))))');
`;

/** §4.4.1: \`javascript_predicate\`. */
export const predicateQueryProgram = `query('and(salary($person, $amount), javascript_predicate($amount > 100000))');
`;

/** §4.4.1: a rule in use. */
export const livesNearProgram = `query('lives_near($x, list("Bitdiddle", "Ben"))');
`;

/** §4.4.1: adding a rule of one's own. */
export const assertRuleProgram = `query('assert(rule(big_earner($person), and(salary($person, $amount), javascript_predicate($amount > 100000))))');

query('big_earner($who)');
`;

/** §4.4.1: one relation, used backwards. */
export const appendToFormProgram = `query('append_to_form($x, $y, list("a", "b", "c", "d"))');
`;

/** §4.4.2: the pattern matcher on its own. */
export const patternMatchProgram = `const datum = list(list("a", "b"), "c", list("a", "b"));

display(frame_text(pattern_match(pattern_of('list($x, "c", $x)'), datum, null)));
display(frame_text(pattern_match(pattern_of('list($x, $y, $z)'), datum, null)));
display(frame_text(pattern_match(pattern_of('list(list($x, $y), "c", list($x, $y))'), datum, null)));
frame_text(pattern_match(pattern_of('list($x, "a", $y)'), datum, null));
`;

/** §4.4.2: \`and\` as a series combination. */
export const andSeriesProgram = `query('and(can_do_job($x, list("computer", "programmer", "trainee")), job($person, $x))');
`;

/** §4.4.2: the unifier on its own. */
export const unifyProgram = `display(frame_text(unify_match(pattern_of('list($x, "a", $y)'),
                               pattern_of('list($y, $z, "a")'), null)));
display(frame_text(unify_match(pattern_of('list($x, $y, "a")'),
                               pattern_of('list($x, "b", $y)'), null)));
display(frame_text(unify_match(pattern_of('list($x, "a")'),
                               pattern_of('list(list("b", $y), $z)'), null)));

const frame = unify_match(pattern_of('list($x, $x)'),
                          pattern_of('list(list("a", $y, "c"), list("a", "b", $z))'),
                          null);
display(frame_text(frame));
unparse(convert(instantiate_term(pattern_of('$x'), frame)));
`;

/** §4.4.2: applying a rule. */
export const ruleApplicationProgram = `query('lives_near($x, list("Hacker", "Alyssa", "P"))');
`;

/** §4.4.3: the clause that narrows most goes first. */
export const clauseOrderProgram = `query('and(job($x, list("computer", "programmer")), supervisor($x, $y))');
`;

/** §4.4.3: a rule that sends the system into a loop. */
export const marriedProgram = `query('assert(married("Minnie", "Mickey"))');
query('assert(rule(married($x, $y), married($y, $x)))');

query('married("Mickey", $who)');
`;

/** §4.4.3: \`not\` is a filter, and its place in an \`and\` matters. */
export const notOrderProgram = `display(query('and(supervisor($x, $y), not(job($x, list("computer", "programmer"))))'),
        "answers:");
display(query('and(not(job($x, list("computer", "programmer"))), supervisor($x, $y))'),
        "answers:");
`;

/** §4.4.3: the closed world assumption. */
export const closedWorldProgram = `query('not(baseball_fan(list("Bitdiddle", "Ben")))');
`;

/** §4.4.4: a query through the driver's steps, one at a time. */
export const driverStepsProgram = `const expression = parse('job($x, list("computer", "wizard"));');
const query_syntax = convert_to_query_syntax(expression);
display(query_syntax);

const frames = evaluate_query(query_syntax, singleton_stream(null));
display(frame_text(head(frames)));

unparse(instantiate_expression(expression, head(frames)));
`;

/** §4.4.4: the unifier refuses to bind a variable to a pattern containing it. */
export const dependsOnProgram = `const frame = unify_match(pattern_of('list($x, $x)'),
                          pattern_of('list($y, list("f", $y))'), null);
display(frame_text(frame));

display(depends_on(pattern_of('list("f", $y)'), pattern_of('$y'), null));
display(frame_text(unify_match(pattern_of('list($x, $x)'),
                               pattern_of('list($y, $y)'), null)));
`;
