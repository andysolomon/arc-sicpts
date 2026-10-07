import { evaluate } from '../evaluator/evaluate.ts';
import type { Value } from '../evaluator/values.ts';
import type { RegisterMachine } from '../machines/registerMachine.ts';
import { ecevalCompiledControllerSource, ecevalMachineSource, quote, readResults, type EcevalRun } from './eceval.ts';

/**
 * Section 5.5: the compiler, as the book writes it. Each export is the code of
 * one subsection; `compilerSource` is all of it, ready to be a prelude.
 */

export const compileDispatch = `function compile(component, target, linkage) {
    return is_literal(component)
           ? compile_literal(component, target, linkage)
           : is_name(component)
           ? compile_name(component, target, linkage)
           : is_application(component)
           ? compile_application(component, target, linkage)
           : is_operator_combination(component)
           ? compile(operator_combination_to_application(component),
                     target, linkage)
           : is_conditional(component)
           ? compile_conditional(component, target, linkage)
           : is_lambda_expression(component)
           ? compile_lambda_expression(component, target, linkage)
           : is_sequence(component)
           ? compile_sequence(sequence_statements(component),
                              target, linkage)
           : is_block(component)
           ? compile_block(component, target, linkage)
           : is_return_statement(component)
           ? compile_return_statement(component, target, linkage)
           : is_function_declaration(component)
           ? compile(function_decl_to_constant_decl(component),
                     target, linkage)
           : is_declaration(component)
           ? compile_declaration(component, target, linkage)
           : is_assignment(component)
           ? compile_assignment(component, target, linkage)
           : error(component, "unknown component type -- compile");
}

function make_instruction_sequence(needs, modifies, instructions) {
    return list(needs, modifies, instructions);
}
`;

export const compileLinkage = `function compile_linkage(linkage) {
    return linkage === "return"
           ? make_instruction_sequence(list("continue"), null,
                                       list(go_to(reg("continue"))))
           : linkage === "next"
           ? make_instruction_sequence(null, null, null)
           : make_instruction_sequence(null, null,
                                       list(go_to(label(linkage))));
}

function end_with_linkage(linkage, instruction_sequence) {
    return preserving(list("continue"),
                      instruction_sequence,
                      compile_linkage(linkage));
}
`;

export const compileSimple = `function compile_literal(component, target, linkage) {
    const literal = literal_value(component);
    return end_with_linkage(linkage,
               make_instruction_sequence(null, list(target),
                   list(assign(target, constant(literal)))));
}

function compile_name(component, target, linkage) {
    const symbol = symbol_of_name(component);
    return end_with_linkage(linkage,
               make_instruction_sequence(list("env"), list(target),
                   list(assign(target,
                               list(op("lookup_symbol_value"),
                                    constant(symbol),
                                    reg("env"))))));
}

function compile_assignment(component, target, linkage) {
    return compile_assignment_declaration(
               assignment_symbol(component),
               assignment_value_expression(component),
               reg("val"),
               target, linkage);
}

function compile_declaration(component, target, linkage) {
    return compile_assignment_declaration(
               declaration_symbol(component),
               declaration_value_expression(component),
               constant(undefined),
               target, linkage);
}

function compile_assignment_declaration(
             symbol, value_expression, final_value,
             target, linkage) {
    const get_value_code = compile(value_expression, "val", "next");
    return end_with_linkage(linkage,
               preserving(list("env"),
                   get_value_code,
                   make_instruction_sequence(list("env", "val"),
                                             list(target),
                       list(perform(list(op("assign_symbol_value"),
                                         constant(symbol),
                                         reg("val"),
                                         reg("env"))),
                            assign(target, final_value)))));
}
`;

export const compileLabels = `let label_counter = 0;

function new_label_number() {
    label_counter = label_counter + 1;
    return label_counter;
}

function make_label(string) {
    return string + stringify(new_label_number());
}
`;

export const compileConditional = `function compile_conditional(component, target, linkage) {
    const t_branch = make_label("true_branch");
    const f_branch = make_label("false_branch");
    const after_cond = make_label("after_cond");
    const consequent_linkage =
            linkage === "next" ? after_cond : linkage;
    const p_code = compile(conditional_predicate(component),
                           "val", "next");
    const c_code = compile(conditional_consequent(component),
                           target, consequent_linkage);
    const a_code = compile(conditional_alternative(component),
                           target, linkage);
    return preserving(list("env", "continue"),
             p_code,
             append_instruction_sequences(
               make_instruction_sequence(list("val"), null,
                 list(test(list(op("is_falsy"), reg("val"))),
                      branch(label(f_branch)))),
               append_instruction_sequences(
                 parallel_instruction_sequences(
                   append_instruction_sequences(t_branch, c_code),
                   append_instruction_sequences(f_branch, a_code)),
                 after_cond)));
}
`;

export const compileSequence = `function compile_sequence(seq, target, linkage) {
    return is_empty_sequence(seq)
           ? compile_literal(make_literal(undefined), target, linkage)
           : is_last_statement(seq) ||
                 is_return_statement(first_statement(seq))
           ? compile(first_statement(seq), target, linkage)
           : preserving(list("env", "continue"),
                 compile(first_statement(seq), target, "next"),
                 compile_sequence(rest_statements(seq),
                                  target, linkage));
}

function compile_block(stmt, target, linkage) {
    const body = block_body(stmt);
    const locals = scan_out_declarations(body);
    const unassigneds = list_of_unassigned(locals);
    return append_instruction_sequences(
               make_instruction_sequence(list("env"), list("env"),
                   list(assign("env", list(op("extend_environment"),
                                           constant(locals),
                                           constant(unassigneds),
                                           reg("env"))))),
               compile(body, target, linkage));
}
`;

export const compileLambda = `function compile_lambda_expression(exp, target, linkage) {
    const fun_entry = make_label("entry");
    const after_lambda = make_label("after_lambda");
    const lambda_linkage =
            linkage === "next" ? after_lambda : linkage;
    return append_instruction_sequences(
               tack_on_instruction_sequence(
                   end_with_linkage(lambda_linkage,
                       make_instruction_sequence(list("env"),
                                                 list(target),
                           list(assign(target,
                                    list(op("make_compiled_function"),
                                         label(fun_entry),
                                         reg("env")))))),
                   compile_lambda_body(exp, fun_entry)),
               after_lambda);
}

function compile_lambda_body(exp, fun_entry) {
    const params  = lambda_parameter_symbols(exp);
    return append_instruction_sequences(
        make_instruction_sequence(list("env", "fun", "argl"),
                                  list("env"),
            list(fun_entry,
                 assign("env",
                        list(op("compiled_function_env"),
                             reg("fun"))),
                 assign("env",
                        list(op("extend_environment"),
                             constant(params),
                             reg("argl"),
                             reg("env"))))),
        compile(append_return_undefined(lambda_body(exp)),
                "val", "next"));
}

function append_return_undefined(body) {
    return list("sequence", list(body,
                                 list("return_statement",
                                      list("literal", undefined))));
}
`;

export const compileApplication = `function compile_application(exp, target, linkage) {
    const fun_code = compile(function_expression(exp), "fun", "next");
    const argument_codes = map(arg => compile(arg, "val", "next"),
                               arg_expressions(exp));
    return preserving(list("env", "continue"),
                      fun_code,
                      preserving(list("fun", "continue"),
                          construct_arglist(argument_codes),
                          compile_function_call(target, linkage)));
}

function construct_arglist(arg_codes) {
    if (is_null(arg_codes)) {
        return make_instruction_sequence(null, list("argl"),
                   list(assign("argl", constant(null))));
    } else {
        const rev_arg_codes = reverse(arg_codes);
        const code_to_get_last_arg =
            append_instruction_sequences(
                head(rev_arg_codes),
                make_instruction_sequence(list("val"), list("argl"),
                    list(assign("argl",
                                list(op("list"), reg("val"))))));
        return is_null(tail(rev_arg_codes))
               ? code_to_get_last_arg
               : preserving(list("env"),
                     code_to_get_last_arg,
                     code_to_get_rest_args(tail(rev_arg_codes)));
    }
}

function code_to_get_rest_args(arg_codes) {
    const code_for_next_arg =
        preserving(list("argl"),
            head(arg_codes),
            make_instruction_sequence(list("val", "argl"), list("argl"),
                list(assign("argl", list(op("pair"),
                                         reg("val"), reg("argl"))))));
    return is_null(tail(arg_codes))
           ? code_for_next_arg
           : preserving(list("env"),
                        code_for_next_arg,
                        code_to_get_rest_args(tail(arg_codes)));
}

function compile_function_call(target, linkage) {
    const primitive_branch = make_label("primitive_branch");
    const compiled_branch = make_label("compiled_branch");
    const after_call = make_label("after_call");
    const compiled_linkage = linkage === "next" ? after_call : linkage;
    return append_instruction_sequences(
        make_instruction_sequence(list("fun"), null,
            list(test(list(op("is_primitive_function"), reg("fun"))),
                 branch(label(primitive_branch)))),
        append_instruction_sequences(
            parallel_instruction_sequences(
                append_instruction_sequences(
                    compiled_branch,
                    compile_fun_appl(target, compiled_linkage)),
                append_instruction_sequences(
                    primitive_branch,
                    end_with_linkage(linkage,
                        make_instruction_sequence(list("fun", "argl"),
                                                  list(target),
                            list(assign(
                                   target,
                                   list(op("apply_primitive_function"),
                                        reg("fun"), reg("argl")))))))),
            after_call));
}

const all_regs = list("env", "fun", "val", "argl", "continue");

function compile_fun_appl(target, linkage) {
    const fun_return = make_label("fun_return");
    return target === "val" && linkage !== "return"
           ? make_instruction_sequence(list("fun"), all_regs,
                 list(assign("continue", label(linkage)),
                      save("continue"),
                      push_marker_to_stack(),
                      assign("val", list(op("compiled_function_entry"),
                                         reg("fun"))),
                      go_to(reg("val"))))
           : target !== "val" && linkage !== "return"
           ? make_instruction_sequence(list("fun"), all_regs,
                 list(assign("continue", label(fun_return)),
                      save("continue"),
                      push_marker_to_stack(),
                      assign("val", list(op("compiled_function_entry"),
                                         reg("fun"))),
                      go_to(reg("val")),
                      fun_return,
                      assign(target, reg("val")),
                      go_to(label(linkage))))
           : target === "val" && linkage === "return"
           ? make_instruction_sequence(list("fun", "continue"),
                                       all_regs,
                 list(save("continue"),
                      push_marker_to_stack(),
                      assign("val", list(op("compiled_function_entry"),
                                         reg("fun"))),
                      go_to(reg("val"))))
           : // target !== "val" && linkage === "return"
             error(target, "return linkage, target not val -- compile");
}

function compile_return_statement(stmt, target, linkage) {
    return append_instruction_sequences(
               make_instruction_sequence(null, list("continue"),
                   list(revert_stack_to_marker(),
                        restore("continue"))),
               compile(return_expression(stmt), "val", "return"));
}
`;

export const compileCombining = `function registers_needed(s) {
    return is_string(s) ? null : head(s);
}
function registers_modified(s) {
    return is_string(s) ? null : head(tail(s));
}
function instructions(s) {
    return is_string(s) ? list(s) : head(tail(tail(s)));
}

function needs_register(seq, reg) {
    return ! is_null(member(reg, registers_needed(seq)));
}
function modifies_register(seq, reg) {
    return ! is_null(member(reg, registers_modified(seq)));
}

function append_instruction_sequences(seq1, seq2) {
    return make_instruction_sequence(
               list_union(registers_needed(seq1),
                          list_difference(registers_needed(seq2),
                                          registers_modified(seq1))),
               list_union(registers_modified(seq1),
                          registers_modified(seq2)),
               append(instructions(seq1), instructions(seq2)));
}

function list_union(s1, s2) {
    return is_null(s1)
           ? s2
           : is_null(member(head(s1), s2))
           ? pair(head(s1), list_union(tail(s1), s2))
           : list_union(tail(s1), s2);
}
function list_difference(s1, s2) {
    return is_null(s1)
           ? null
           : is_null(member(head(s1), s2))
           ? pair(head(s1), list_difference(tail(s1), s2))
           : list_difference(tail(s1), s2);
}

function preserving(regs, seq1, seq2) {
    if (is_null(regs)) {
        return append_instruction_sequences(seq1, seq2);
    } else {
        const first_reg = head(regs);
        return needs_register(seq2, first_reg) &&
               modifies_register(seq1, first_reg)
               ? preserving(tail(regs),
                     make_instruction_sequence(
                         list_union(list(first_reg),
                                    registers_needed(seq1)),
                         list_difference(registers_modified(seq1),
                                         list(first_reg)),
                         append(list(save(first_reg)),
                                append(instructions(seq1),
                                       list(restore(first_reg))))),
                     seq2)
               : preserving(tail(regs), seq1, seq2);
    }
}

function tack_on_instruction_sequence(seq, body_seq) {
    return make_instruction_sequence(
               registers_needed(seq),
               registers_modified(seq),
               append(instructions(seq), instructions(body_seq)));
}

function parallel_instruction_sequences(seq1, seq2) {
    return make_instruction_sequence(
               list_union(registers_needed(seq1),
                          registers_needed(seq2)),
               list_union(registers_modified(seq1),
                          registers_modified(seq2)),
               append(instructions(seq1), instructions(seq2)));
}
`;

/** Printing instruction sequences in the notation of the book (§5.5.7). */
export const displayInstructionsSource = `function stringify_list(xs) {
    return is_null(member(head(xs),
                   list("assign", "perform", "op", "label", "branch",
                        "go_to", "save", "restore", "reg", "constant",
                        "test", "push_marker_to_stack",
                        "revert_stack_to_marker")))
           ? "list(" + comma_separated(xs) + ")"
           : head(xs) + "(" + comma_separated(tail(xs)) + ")";
}
function comma_separated(elements) {
    return accumulate((s, acc) => stringify_instruction(s) +
                                  (acc === "" ? "" : ", " + acc),
                      "", elements);
}
function stringify_instruction(x) {
    return is_string(x) || is_number(x) || is_undefined(x) || is_null(x)
           ? stringify(x)
           : stringify_list(x);
}
function display_instructions(instructions) {
    return for_each(i => { display(stringify_instruction(i) + ","); },
                    instructions);
}
`;

/** The whole compiler of §5.5.1 to §5.5.4. */
export const compilerSource = [
  compileDispatch,
  compileLinkage,
  compileSimple,
  compileLabels,
  compileConditional,
  compileSequence,
  compileLambda,
  compileApplication,
  compileCombining,
  displayInstructionsSource,
].join('\n');

export const compileAndGoSource = `function compile_and_go(program) {
    const instrs = assemble(instructions(compile(program,
                                                 "val", "return")),
                            eceval);
    const toplevel_names = scan_out_declarations(program);
    const unassigneds = list_of_unassigned(toplevel_names);
    set_current_environment(extend_environment(
                               toplevel_names,
                               unassigneds,
                               the_global_environment));
    set_register_contents(eceval, "val", instrs);
    set_register_contents(eceval, "flag", true);
    return start(eceval);
}
`;

/** Everything a page needs to run `compile_and_go`: the compiler, the evaluator machine and the interface. */
export const compileAndGoPrelude = `${compilerSource}
${ecevalCompiledControllerSource}
${ecevalMachineSource}
${compileAndGoSource}`;

const BUDGET = 5_000_000;

/** The instruction list `compile(parse(program), target, linkage)` produces. */
export function compileProgram(program: string, target = 'val', linkage = 'next'): Value {
  const outcome = evaluate(`instructions(compile(parse(${quote(program)}), ${quote(target)}, ${quote(linkage)}));`, {
    prelude: compilerSource,
    budget: BUDGET,
  });
  if (outcome.status !== 'done') {
    throw new Error(outcome.status === 'error' ? outcome.error.message : 'the compiler ran out of steps');
  }
  return outcome.value;
}

/**
 * Compile `program` with `compile_and_go`, then let the evaluator read each of
 * `inputs`, as in §5.5.7. The first result is the compiled program's own.
 */
export function runCompiled(
  program: string,
  inputs: readonly string[],
  options: { onMachine?: (machine: RegisterMachine) => void } = {},
): EcevalRun {
  let machine: RegisterMachine | null = null;
  const outcome = evaluate(
    `set_inputs(list(${inputs.map(quote).join(', ')}));
compile_and_go(parse(${quote(program)}));`,
    {
      prelude: compileAndGoPrelude,
      budget: BUDGET,
      onMachine: (made) => {
        machine = made;
        options.onMachine?.(made);
      },
    },
  );
  const { results, output } = readResults(outcome.output);
  return {
    results,
    output,
    failure: outcome.status === 'done' ? null : outcome.status === 'error' ? outcome.error.message : 'budget exhausted',
    machine,
  };
}
