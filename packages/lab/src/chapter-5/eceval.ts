import { evaluate } from '../evaluator/evaluate.ts';
import type { RegisterMachine } from '../machines/registerMachine.ts';

/**
 * Section 5.4: the explicit-control evaluator, as the book writes it, in the
 * register-machine language. Each fragment below is one of the book's code
 * blocks; `eceval_controller` strings them together.
 */

export const ecevalDriverLoop = `"read_evaluate_print_loop",
  perform(list(op("initialize_stack"))),
  assign("comp", list(op("user_read"), constant("EC-evaluate input:"))),
  test(list(op("is_null"), reg("comp"))),
  branch(label("evaluator_done")),
  assign("comp", list(op("parse"), reg("comp"))),
  assign("env", list(op("get_current_environment"))),
  assign("val", list(op("scan_out_declarations"), reg("comp"))),
  save("comp"),     // so we can use it to temporarily hold *unassigned* values
  assign("comp", list(op("list_of_unassigned"), reg("val"))),
  assign("env", list(op("extend_environment"),
                     reg("val"), reg("comp"), reg("env"))),
  perform(list(op("set_current_environment"), reg("env"))),
  restore("comp"),  // the program
  assign("continue", label("print_result")),
  go_to(label("eval_dispatch")),
"print_result",
  perform(list(op("print_stack_statistics"))),
  perform(list(op("user_print"),
               constant("EC-evaluate value:"), reg("val"))),
  go_to(label("read_evaluate_print_loop")),`;

export const ecevalDispatch = `"eval_dispatch",
  test(list(op("is_literal"), reg("comp"))),
  branch(label("ev_literal")),
  test(list(op("is_name"), reg("comp"))),
  branch(label("ev_name")),
  test(list(op("is_application"), reg("comp"))),
  branch(label("ev_application")),
  test(list(op("is_operator_combination"), reg("comp"))),
  branch(label("ev_operator_combination")),
  test(list(op("is_conditional"), reg("comp"))),
  branch(label("ev_conditional")),
  test(list(op("is_lambda_expression"), reg("comp"))),
  branch(label("ev_lambda")),
  test(list(op("is_sequence"), reg("comp"))),
  branch(label("ev_sequence")),
  test(list(op("is_block"), reg("comp"))),
  branch(label("ev_block")),
  test(list(op("is_return_statement"), reg("comp"))),
  branch(label("ev_return")),
  test(list(op("is_function_declaration"), reg("comp"))),
  branch(label("ev_function_declaration")),
  test(list(op("is_declaration"), reg("comp"))),
  branch(label("ev_declaration")),
  test(list(op("is_assignment"), reg("comp"))),
  branch(label("ev_assignment")),
  go_to(label("unknown_component_type")),`;

export const ecevalLiteral = `"ev_literal",
  assign("val", list(op("literal_value"), reg("comp"))),
  go_to(reg("continue")),`;

export const ecevalName = `"ev_name",
  assign("val", list(op("symbol_of_name"), reg("comp"))),
  assign("val", list(op("lookup_symbol_value"),
                     reg("val"), reg("env"))),
  go_to(reg("continue")),`;

export const ecevalLambda = `"ev_lambda",
  assign("unev", list(op("lambda_parameter_symbols"), reg("comp"))),
  assign("comp", list(op("lambda_body"), reg("comp"))),
  assign("val", list(op("make_function"),
                     reg("unev"), reg("comp"), reg("env"))),
  go_to(reg("continue")),`;

export const ecevalConditional = `"ev_conditional",
  save("comp"), // save conditional for later
  save("env"),
  save("continue"),
  assign("continue", label("ev_conditional_decide")),
  assign("comp", list(op("conditional_predicate"), reg("comp"))),
  go_to(label("eval_dispatch")), // evaluate the predicate
"ev_conditional_decide",
  restore("continue"),
  restore("env"),
  restore("comp"),
  test(list(op("is_falsy"), reg("val"))),
  branch(label("ev_conditional_alternative")),
"ev_conditional_consequent",
  assign("comp", list(op("conditional_consequent"), reg("comp"))),
  go_to(label("eval_dispatch")),
"ev_conditional_alternative",
  assign("comp", list(op("conditional_alternative"), reg("comp"))),
  go_to(label("eval_dispatch")),`;

export const ecevalSequence = `"ev_sequence",
  assign("unev", list(op("sequence_statements"), reg("comp"))),
  test(list(op("is_empty_sequence"), reg("unev"))),
  branch(label("ev_sequence_empty")),
  save("continue"),
"ev_sequence_next",
  assign("comp", list(op("first_statement"), reg("unev"))),
  test(list(op("is_last_statement"), reg("unev"))),
  branch(label("ev_sequence_last_statement")),
  save("unev"),
  save("env"),
  assign("continue", label("ev_sequence_continue")),
  go_to(label("eval_dispatch")),
"ev_sequence_continue",
  restore("env"),
  restore("unev"),
  assign("unev", list(op("rest_statements"), reg("unev"))),
  go_to(label("ev_sequence_next")),
"ev_sequence_last_statement",
  restore("continue"),
  go_to(label("eval_dispatch")),
"ev_sequence_empty",
  assign("val", constant(undefined)),
  go_to(reg("continue")),`;

export const ecevalApplication = `"ev_operator_combination",
  assign("comp", list(op("operator_combination_to_application"),
                      reg("comp"))),
"ev_application",
  save("continue"),
  save("env"),
  assign("unev", list(op("arg_expressions"), reg("comp"))),
  save("unev"),
  assign("comp", list(op("function_expression"), reg("comp"))),
  assign("continue", label("ev_appl_did_function_expression")),
  go_to(label("eval_dispatch")),
"ev_appl_did_function_expression",
  restore("unev"), // the argument expressions
  restore("env"),
  assign("argl", list(op("empty_arglist"))),
  assign("fun", reg("val")), // the function
  test(list(op("is_null"), reg("unev"))),
  branch(label("apply_dispatch")),
  save("fun"),
"ev_appl_argument_expression_loop",
  save("argl"),
  assign("comp", list(op("head"), reg("unev"))),
  test(list(op("is_last_argument_expression"), reg("unev"))),
  branch(label("ev_appl_last_arg")),
  save("env"),
  save("unev"),
  assign("continue", label("ev_appl_accumulate_arg")),
  go_to(label("eval_dispatch")),
"ev_appl_accumulate_arg",
  restore("unev"),
  restore("env"),
  restore("argl"),
  assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
  assign("unev", list(op("tail"), reg("unev"))),
  go_to(label("ev_appl_argument_expression_loop")),
"ev_appl_last_arg",
  assign("continue", label("ev_appl_accum_last_arg")),
  go_to(label("eval_dispatch")),
"ev_appl_accum_last_arg",
  restore("argl"),
  assign("argl", list(op("adjoin_arg"), reg("val"), reg("argl"))),
  restore("fun"),
  go_to(label("apply_dispatch")),`;

const applyDispatch = (compiled: boolean): string => `"apply_dispatch",
  test(list(op("is_primitive_function"), reg("fun"))),
  branch(label("primitive_apply")),
  test(list(op("is_compound_function"), reg("fun"))),
  branch(label("compound_apply")),${
    compiled
      ? `
  test(list(op("is_compiled_function"), reg("fun"))),
  branch(label("compiled_apply")),`
      : ''
  }
  go_to(label("unknown_function_type")),${
    compiled
      ? `
"compiled_apply",
  push_marker_to_stack(),
  assign("val", list(op("compiled_function_entry"), reg("fun"))),
  go_to(reg("val")),`
      : ''
  }
"primitive_apply",
  assign("val", list(op("apply_primitive_function"),
                     reg("fun"), reg("argl"))),
  restore("continue"),
  go_to(reg("continue")),`;

export const ecevalCompoundApply = `"compound_apply",
  assign("unev", list(op("function_parameters"), reg("fun"))),
  assign("env", list(op("function_environment"), reg("fun"))),
  assign("env", list(op("extend_environment"),
                     reg("unev"), reg("argl"), reg("env"))),
  assign("comp", list(op("function_body"), reg("fun"))),
  push_marker_to_stack(),
  assign("continue", label("return_undefined")),
  go_to(label("eval_dispatch")),`;

export const ecevalApplyDispatch = applyDispatch(false);
export const ecevalCompiledApplyDispatch = applyDispatch(true);

export const ecevalReturn = `"ev_return",
  revert_stack_to_marker(),
  restore("continue"),
  assign("comp", list(op("return_expression"), reg("comp"))),
  go_to(label("eval_dispatch")),`;

export const ecevalReturnUndefined = `"return_undefined",
  revert_stack_to_marker(),
  restore("continue"),
  assign("val", constant(undefined)),
  go_to(reg("continue")),`;

export const ecevalBlock = `"ev_block",
  assign("comp", list(op("block_body"), reg("comp"))),
  assign("val", list(op("scan_out_declarations"), reg("comp"))),
  save("comp"),    // so we can use it to temporarily hold *unassigned* values
  assign("comp", list(op("list_of_unassigned"), reg("val"))),
  assign("env", list(op("extend_environment"),
                     reg("val"), reg("comp"), reg("env"))),
  restore("comp"), // the block body
  go_to(label("eval_dispatch")),`;

export const ecevalAssignment = `"ev_assignment",
  assign("unev", list(op("assignment_symbol"), reg("comp"))),
  save("unev"), // save variable for later
  assign("comp", list(op("assignment_value_expression"), reg("comp"))),
  save("env"),
  save("continue"),
  assign("continue", label("ev_assignment_install")),
  go_to(label("eval_dispatch")), // evaluate assignment value
"ev_assignment_install",
  restore("continue"),
  restore("env"),
  restore("unev"),
  perform(list(op("assign_symbol_value"),
               reg("unev"), reg("val"), reg("env"))),
  go_to(reg("continue")),`;

export const ecevalDeclaration = `"ev_function_declaration",
  assign("comp",
         list(op("function_decl_to_constant_decl"), reg("comp"))),
"ev_declaration",
  assign("unev", list(op("declaration_symbol"), reg("comp"))),
  save("unev"), // save declared name
  assign("comp",
         list(op("declaration_value_expression"), reg("comp"))),
  save("env"),
  save("continue"),
  assign("continue", label("ev_declaration_assign")),
  go_to(label("eval_dispatch")), // evaluate declaration value
"ev_declaration_assign",
  restore("continue"),
  restore("env"),
  restore("unev"),
  perform(list(op("assign_symbol_value"),
               reg("unev"), reg("val"), reg("env"))),
  assign("val", constant(undefined)),
  go_to(reg("continue")),`;

export const ecevalErrors = `"unknown_component_type",
  assign("val", constant("unknown syntax")),
  go_to(label("signal_error")),
"unknown_function_type",
  restore("continue"), // clean up stack (from apply_dispatch)
  assign("val", constant("unknown function type")),
  go_to(label("signal_error")),
"signal_error",
  perform(list(op("user_print"),
               constant("EC-evaluator error:"), reg("val"))),
  go_to(label("read_evaluate_print_loop")),`;

/** The entry for compiled code that `compile_and_go` starts at (§5.5.7). */
export const ecevalExternalEntry = `"external_entry",
  perform(list(op("initialize_stack"))),
  assign("env", list(op("get_current_environment"))),
  assign("continue", label("print_result")),
  go_to(reg("val")),`;

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

function controllerSource(name: string, fragments: string[]): string {
  return `const ${name} = list(
${indent([...fragments, '"evaluator_done"'].join('\n'))}
);
`;
}

/**
 * The blocks of the controller, by the label each begins with, in the order
 * the book presents them. Every block ends in an unconditional jump, so any
 * block can be left out and replaced by one supplied elsewhere.
 */
export const ecevalBlocks: Readonly<Record<string, string>> = {
  read_evaluate_print_loop: ecevalDriverLoop,
  eval_dispatch: ecevalDispatch,
  ev_literal: ecevalLiteral,
  ev_name: ecevalName,
  ev_lambda: ecevalLambda,
  ev_conditional: ecevalConditional,
  ev_sequence: ecevalSequence,
  ev_operator_combination: ecevalApplication,
  apply_dispatch: ecevalApplyDispatch,
  compound_apply: ecevalCompoundApply,
  ev_return: ecevalReturn,
  return_undefined: ecevalReturnUndefined,
  ev_block: ecevalBlock,
  ev_assignment: ecevalAssignment,
  ev_function_declaration: ecevalDeclaration,
  unknown_component_type: ecevalErrors,
};

/** The evaluator of §5.4, monitored as in §5.4.4, as one declaration of `eceval_controller`. */
export const ecevalControllerSource = controllerSource('eceval_controller', Object.values(ecevalBlocks));

/** The evaluator extended to run compiled code (§5.5.7). */
export const ecevalCompiledControllerSource = controllerSource('eceval_controller', [
  `branch(label("external_entry")), // branches if flag is set`,
  ...Object.values({ ...ecevalBlocks, apply_dispatch: ecevalCompiledApplyDispatch }),
  ecevalExternalEntry,
]);

/**
 * For exercises that change the evaluator: a function
 * `eceval_controller_with(fragment)` that builds the controller from every
 * block except those named, with the reader's `fragment` (a list of labels
 * and instructions) in their place.
 */
export function ecevalControllerWithout(blocks: readonly string[], { compiled = false } = {}): string {
  const all = compiled ? { ...ecevalBlocks, apply_dispatch: ecevalCompiledApplyDispatch } : ecevalBlocks;
  const kept = Object.entries(all)
    .filter(([name]) => !blocks.includes(name))
    .map(([, text]) => text);
  const head = compiled ? [`branch(label("external_entry")),`] : [];
  const tail = compiled ? [ecevalExternalEntry] : [];
  return `function eceval_controller_with(fragment) {
    return append(list(
${indent(indent([...head, ...kept, ...tail].join('\n').replace(/,\s*$/, '')))}
           ),
           append(fragment, list("evaluator_done")));
}
`;
}

export const ECEVAL_REGISTERS = ['comp', 'env', 'val', 'fun', 'argl', 'continue', 'unev'] as const;

export const ecevalMachineSource = `const eceval =
    make_machine(list("comp", "env", "val", "fun",
                      "argl", "continue", "unev"),
                 eceval_operations,
                 eceval_controller);
`;

/** A Source string literal for `text`. */
export const quote = (text: string): string => JSON.stringify(text);

/** A program that runs the evaluator on `inputs`, one after another. */
export function ecevalProgram(inputs: readonly string[], controller = ecevalControllerSource): string {
  return `${controller}
${ecevalMachineSource}
set_inputs(list(${inputs.map(quote).join(', ')}));
start(eceval);
`;
}

/** What the evaluator printed for one input. */
export interface EcevalResult {
  /** The text after `EC-evaluate value:`, or after `EC-evaluator error:`. */
  value: string;
  error: boolean;
  totalPushes: number;
  maximumDepth: number;
}

export interface EcevalRun {
  results: EcevalResult[];
  /** Lines the evaluated programs displayed themselves. */
  output: string[];
  /** Set when the run stopped with an error of the simulation itself. */
  failure: string | null;
  machine: RegisterMachine | null;
}

/** Parse what the monitored driver loop printed, one result per input. */
export function readResults(lines: readonly string[]): { results: EcevalResult[]; output: string[] } {
  const results: EcevalResult[] = [];
  const output: string[] = [];
  let pushes = 0;
  let depth = 0;
  for (const line of lines) {
    const text = line.startsWith('"') ? (JSON.parse(line) as string) : line;
    const pushesMatch = /^total pushes = (\d+)$/.exec(text);
    const depthMatch = /^maximum depth = (\d+)$/.exec(text);
    if (pushesMatch !== null) pushes = Number(pushesMatch[1]);
    else if (depthMatch !== null) depth = Number(depthMatch[1]);
    else if (text.startsWith('EC-evaluate value: ')) {
      results.push({ value: text.slice('EC-evaluate value: '.length), error: false, totalPushes: pushes, maximumDepth: depth });
    } else if (text.startsWith('EC-evaluator error: ')) {
      results.push({ value: text.slice('EC-evaluator error: '.length), error: true, totalPushes: pushes, maximumDepth: depth });
    } else output.push(line);
  }
  return { results, output };
}

export interface EcevalOptions {
  controller?: string;
  /** Evaluator steps for the Source part of the run; the machine itself is bounded by its instruction limit. */
  budget?: number;
  onMachine?: (machine: RegisterMachine) => void;
}

/** Run the explicit-control evaluator on each input and collect what it printed. */
export function runEceval(inputs: readonly string[], options: EcevalOptions = {}): EcevalRun {
  let machine: RegisterMachine | null = null;
  const outcome = evaluate(ecevalProgram(inputs, options.controller), {
    budget: options.budget ?? 1_000_000,
    onMachine: (made) => {
      machine = made;
      options.onMachine?.(made);
    },
  });
  const { results, output } = readResults(outcome.output);
  return {
    results,
    output,
    failure: outcome.status === 'done' ? null : outcome.status === 'error' ? outcome.error.message : 'budget exhausted',
    machine,
  };
}
