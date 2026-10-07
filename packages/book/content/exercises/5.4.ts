import {
  ecevalCompoundApply,
  ecevalControllerSource,
  ecevalControllerWithout,
  ecevalReturn,
  ecevalReturnUndefined,
  quote,
  simulatorFunctions,
  simulatorWithout,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §5.4. */

const recursiveFactorial = 'function factorial(n) { return n === 1 ? 1 : factorial(n - 1) * n; }';
const iterativeFactorial = `function factorial(n) {
    function iter(product, counter) {
        return counter > n ? product : iter(counter * product, counter + 1);
    }
    return iter(1, 1);
}`;
const sign = 'function sign(x) { if (x < 0) { return -1; } else { } return 1; }';
const noReturn = 'function g(x) { x + 1; }';
const twice = 'function inc(x) { return x + 1; } function twice(x) { const y = inc(x); return inc(y); }';

/** The programs the checks give the evaluator. */
const checkPrograms = `const check_recursive_factorial = ${quote(recursiveFactorial)};
const check_iterative_factorial = ${quote(iterativeFactorial)};
const check_sign = ${quote(sign)};
const check_no_return = ${quote(noReturn)};
const check_twice = ${quote(twice)};
`;

/**
 * Run the evaluator, built by `eceval_controller_with(fragment)`, on a list of
 * inputs, and return what it printed for each, as `list(value, total_pushes,
 * maximum_depth)`. The Laboratory's simulator installs operations in order,
 * so the recording `print_stack_statistics` and `user_print` given last
 * replace the evaluator's own.
 */
const checkRun = `${checkPrograms}
function check_run(fragment, operations, inputs) {
    let check_statistics = list(0, 0);
    let check_printed = null;
    const check_machine =
        make_machine(list("comp", "env", "val", "fun", "argl", "continue", "unev"),
                     append(operations,
                            list(list("print_stack_statistics",
                                      () => {
                                          check_statistics = check_machine("stack")("statistics");
                                      }),
                                 list("user_print",
                                      (prompt, value) => {
                                          check_printed = pair(pair(value, check_statistics),
                                                               check_printed);
                                      }))),
                     eceval_controller_with(fragment));
    set_inputs(inputs);
    start(check_machine);
    return reverse(check_printed);
}

function check_last(fragment, operations, inputs) {
    return head(reverse(check_run(fragment, operations, inputs)));
}

function check_uses(fragment, instruction_name) {
    return !is_null(filter(item => is_pair(item) && head(item) === instruction_name,
                           fragment));
}
`;

export const exercise_5_22: ExerciseSpec = {
  id: '5.22',
  starter: `// Two versions of count that stop at k. count(1, k) displays 1, 2, ..., k.
//
// function count(n, k) {                    function count(n, k) {
//     display(n);                               display(n);
//     return n === k ? n : count(n + 1, k);     n === k ? n : count(n + 1, k);
// }                                         }
//
// The maximum stack depth the evaluator reaches in evaluating count(1, k),
// as a function of k, for k >= 2:

function depth_with_return(k) {
    // your answer
}

function depth_without_return(k) {
    // your answer
}
`,
  tests: [
    { name: 'with return, k = 2', kind: 'value', expr: 'depth_with_return(2)', expected: 10 },
    { name: 'with return, k = 7', kind: 'value', expr: 'depth_with_return(7)', expected: 10 },
    { name: 'with return, k = 25', kind: 'value', expr: 'depth_with_return(25)', expected: 10 },
    { name: 'without return, k = 2', kind: 'value', expr: 'depth_without_return(2)', expected: 11 },
    { name: 'without return, k = 7', kind: 'value', expr: 'depth_without_return(7)', expected: 16 },
    { name: 'without return, k = 25', kind: 'value', expr: 'depth_without_return(25)', expected: 34 },
  ],
  solution: `function depth_with_return(k) {
    return 10;
}

function depth_without_return(k) {
    return k + 9;
}
`,
};

const markerBlocks = ['compound_apply', 'ev_return', 'return_undefined'];

export const exercise_5_23: ExerciseSpec = {
  id: '5.23',
  context: `${ecevalControllerWithout(markerBlocks)}
${checkRun}
function check_value(inputs) {
    return head(check_last(fragment,
                           append(eceval_operations, extra_operations),
                           inputs));
}

function check_depth(inputs) {
    return list_ref(check_last(fragment,
                               append(eceval_operations, extra_operations),
                               inputs),
                    2);
}
`,
  starter: `// Replace push_marker_to_stack and revert_stack_to_marker in these three
// blocks by saves and restores of a marker value. Operations the evaluator
// does not already have go in extra_operations, as list(name, function).

const marker = list("marker");

const extra_operations = list();

const fragment = list(
${[ecevalCompoundApply, ecevalReturn, ecevalReturnUndefined].join('\n').replace(/,\s*$/, '')}
);
`,
  tests: [
    {
      name: 'recursive factorial of 5',
      kind: 'value',
      expr: `check_value(list(check_recursive_factorial, "factorial(5);"))`,
      expected: 120,
    },
    {
      name: 'a return from the middle of a sequence of statements',
      kind: 'value',
      expr: `check_value(list(check_sign, "sign(-5) + 10 * sign(5);"))`,
      expected: 9,
    },
    {
      name: 'a body that ends without return',
      kind: 'value',
      expr: `is_undefined(check_value(list(check_no_return, "g(1);")))`,
      expected: true,
    },
    {
      name: 'calls nested inside a body',
      kind: 'value',
      expr: `check_value(list(check_twice, "twice(5);"))`,
      expected: 7,
    },
    {
      name: 'still tail-recursive: iterative factorial of 3 and of 8 reach the same depth',
      kind: 'value',
      expr: `check_depth(list(check_iterative_factorial, "factorial(3);")) === check_depth(list(check_iterative_factorial, "factorial(8);"))`,
      expected: true,
    },
    {
      name: 'no push_marker_to_stack or revert_stack_to_marker in the fragment',
      kind: 'value',
      expr: 'check_uses(fragment, "push_marker_to_stack") || check_uses(fragment, "revert_stack_to_marker")',
      expected: false,
    },
  ],
  solution: `const marker = list("marker");

const extra_operations = list(list("===", (x, y) => x === y));

const fragment = list(
"compound_apply",
  assign("unev", list(op("function_parameters"), reg("fun"))),
  assign("env", list(op("function_environment"), reg("fun"))),
  assign("env", list(op("extend_environment"),
                     reg("unev"), reg("argl"), reg("env"))),
  assign("comp", list(op("function_body"), reg("fun"))),
  assign("val", constant(marker)),
  save("val"),                       // the marker
  assign("continue", label("return_undefined")),
  go_to(label("eval_dispatch")),
"ev_return",
  restore("val"),                    // pop until the marker is popped
  test(list(op("==="), reg("val"), constant(marker))),
  branch(label("ev_return_marker_found")),
  go_to(label("ev_return")),
"ev_return_marker_found",
  restore("continue"),
  assign("comp", list(op("return_expression"), reg("comp"))),
  go_to(label("eval_dispatch")),
"return_undefined",
  restore("val"),
  test(list(op("==="), reg("val"), constant(marker))),
  branch(label("return_undefined_marker_found")),
  go_to(label("return_undefined")),
"return_undefined_marker_found",
  restore("continue"),
  assign("val", constant(undefined)),
  go_to(reg("continue")));
`,
};

/** The parts of the simulator of §5.2 that know about markers. */
const markerFunctions = [
  'make_stack',
  'push_marker',
  'pop_marker',
  'make_execution_function',
  'make_push_marker_to_stack_ef',
  'make_revert_stack_to_marker_ef',
];

/** Run a small controller on the reader's simulator and return the contents of a register. */
const checkMarkers = `function check_marker_run(controller, register_names) {
    const machine = make_machine(list("a", "b", "c"), list(), controller);
    start(machine);
    return map(name => get_register_contents(machine, name), register_names);
}

function check_marker_statistics(controller) {
    const machine = make_machine(list("a", "b", "c"), list(), controller);
    start(machine);
    machine("stack")("print_statistics");
}

function check_eceval(inputs) {
    let check_value = null;
    const machine =
        make_machine(list("comp", "env", "val", "fun", "argl", "continue", "unev"),
                     pair(list("user_print", (prompt, value) => { check_value = value; }),
                          eceval_operations),
                     eceval_controller);
    set_inputs(inputs);
    start(machine);
    return check_value;
}
`;

export const exercise_5_24: ExerciseSpec = {
  id: '5.24',
  prelude: ecevalControllerSource,
  context: `${simulatorWithout(markerFunctions)}
${checkPrograms}
${checkMarkers}`,
  starter: `// The rest of the simulator of section 5.2 is in place. Add the two
// instructions, the stack operations push_marker and pop_marker, and
// whatever state the stack needs to support them.

function make_stack() {
    let stack = null;
    let number_pushes = 0;
    let max_depth = 0;
    let current_depth = 0;
    function push(x) {
        stack = pair(x, stack);
        number_pushes = number_pushes + 1;
        current_depth = current_depth + 1;
        max_depth = math_max(current_depth, max_depth);
        return "done";
    }
    function pop() {
        if (is_null(stack)) {
            error("empty stack -- pop");
        } else {
            const top = head(stack);
            stack = tail(stack);
            current_depth = current_depth - 1;
            return top;
        }
    }
    function initialize() {
        stack = null;
        number_pushes = 0;
        max_depth = 0;
        current_depth = 0;
        return "done";
    }
    function print_statistics() {
        display("total pushes = " + stringify(number_pushes));
        display("maximum depth = " + stringify(max_depth));
    }
    function dispatch(message) {
        return message === "push"
               ? push
               : message === "pop"
               ? pop()
               : message === "initialize"
               ? initialize()
               : message === "print_statistics"
               ? print_statistics()
               : error(message, "unknown request -- stack");
    }
    return dispatch;
}

function push_marker(stack) {
    // your answer
}

function pop_marker(stack) {
    // your answer
}

function make_execution_function(inst, labels, machine,
                                 pc, flag, stack, ops) {
    return type(inst) === "assign"
           ? make_assign_ef(inst, machine, labels, ops, pc)
           : type(inst) === "test"
           ? make_test_ef(inst, machine, labels, ops, flag, pc)
           : type(inst) === "branch"
           ? make_branch_ef(inst, machine, labels, flag, pc)
           : type(inst) === "go_to"
           ? make_go_to_ef(inst, machine, labels, pc)
           : type(inst) === "save"
           ? make_save_ef(inst, machine, stack, pc)
           : type(inst) === "restore"
           ? make_restore_ef(inst, machine, stack, pc)
           : type(inst) === "perform"
           ? make_perform_ef(inst, machine, labels, ops, pc)
           : error(inst, "unknown instruction type -- assemble");
}

function make_push_marker_to_stack_ef(machine, stack, pc) {
    // your answer
}

function make_revert_stack_to_marker_ef(machine, stack, pc) {
    // your answer
}
`,
  tests: [
    {
      name: 'revert_stack_to_marker discards what was saved after the marker',
      kind: 'value',
      expr: `head(check_marker_run(list(assign("a", constant(1)), save("a"),
                                   push_marker_to_stack(),
                                   assign("a", constant(2)), save("a"), save("a"),
                                   revert_stack_to_marker(),
                                   restore("b")),
                              list("b")))`,
      expected: 1,
    },
    {
      name: 'a marker with nothing saved after it',
      kind: 'value',
      expr: `head(check_marker_run(list(assign("a", constant(1)), save("a"),
                                   push_marker_to_stack(),
                                   revert_stack_to_marker(),
                                   restore("b")),
                              list("b")))`,
      expected: 1,
    },
    {
      name: 'nested markers are reverted innermost first',
      kind: 'value',
      expr: `equal(check_marker_run(list(assign("a", constant(1)), save("a"),
                                   push_marker_to_stack(),
                                   assign("a", constant(2)), save("a"),
                                   push_marker_to_stack(),
                                   assign("a", constant(3)), save("a"),
                                   revert_stack_to_marker(),
                                   restore("b"),
                                   revert_stack_to_marker(),
                                   restore("c")),
                              list("b", "c")),
                   list(2, 1))`,
      expected: true,
    },
    {
      name: 'the statistics count depth from the reverted stack',
      kind: 'output',
      call: `check_marker_statistics(list(assign("a", constant(1)), save("a"),
                                          push_marker_to_stack(),
                                          save("a"), save("a"),
                                          revert_stack_to_marker(),
                                          save("a"), save("a"), save("a")))`,
      contains: ['total pushes = 6', 'maximum depth = 4'],
    },
    {
      name: 'the evaluator of section 5.4 runs on your simulator',
      kind: 'value',
      expr: `check_eceval(list(check_recursive_factorial, check_sign, "factorial(4) + sign(-1);"))`,
      expected: 23,
    },
  ],
  budget: 5_000_000,
  solution: `${simulatorFunctions(markerFunctions)}
`,
};

const returnBlock = ['ev_return'];

export const exercise_5_29: ExerciseSpec = {
  id: '5.29',
  context: `${ecevalControllerWithout(returnBlock)}
${checkRun}
function check_value(inputs) {
    return head(check_last(fragment, eceval_operations, inputs));
}

function check_depth(inputs) {
    return list_ref(check_last(fragment, eceval_operations, inputs), 2);
}
`,
  starter: `// Change ev_return so that it evaluates the return expression first and
// reverts the stack afterwards.

const fragment = list(
${ecevalReturn.replace(/,\s*$/, '')}
);
`,
  tests: [
    {
      name: 'recursive factorial of 5',
      kind: 'value',
      expr: `check_value(list(check_recursive_factorial, "factorial(5);"))`,
      expected: 120,
    },
    {
      name: 'iterative factorial of 6',
      kind: 'value',
      expr: `check_value(list(check_iterative_factorial, "factorial(6);"))`,
      expected: 720,
    },
    {
      name: 'a return from the middle of a sequence of statements',
      kind: 'value',
      expr: `check_value(list(check_sign, "sign(-5) + 10 * sign(5);"))`,
      expected: 9,
    },
    {
      name: 'iterative factorial now needs more stack for 8 than for 3',
      kind: 'value',
      expr: `check_depth(list(check_iterative_factorial, "factorial(8);")) > check_depth(list(check_iterative_factorial, "factorial(3);"))`,
      expected: true,
    },
  ],
  solution: `const fragment = list(
"ev_return",  // alternative implementation: not tail-recursive
  assign("comp", list(op("return_expression"), reg("comp"))),
  assign("continue", label("ev_restore_stack")),
  go_to(label("eval_dispatch")),
"ev_restore_stack",
  revert_stack_to_marker(),    // undo saves in current function
  restore("continue"),         // undo save at ev_application
  go_to(reg("continue")));
`,
};

export const exercise_5_27: ExerciseSpec = {
  id: '5.27',
  starter: `// For the iterative factorial, evaluated by the monitored evaluator:

// the maximum stack depth for factorial(n)
function iterative_depth(n) {
    // your answer
}

// the total number of pushes for factorial(n), for n >= 1
function iterative_pushes(n) {
    // your answer
}
`,
  tests: [
    { name: 'depth for n = 1', kind: 'value', expr: 'iterative_depth(1)', expected: 10 },
    { name: 'depth for n = 20', kind: 'value', expr: 'iterative_depth(20)', expected: 10 },
    { name: 'pushes for n = 1', kind: 'value', expr: 'iterative_pushes(1)', expected: 67 },
    { name: 'pushes for n = 5', kind: 'value', expr: 'iterative_pushes(5)', expected: 207 },
    { name: 'pushes for n = 20', kind: 'value', expr: 'iterative_pushes(20)', expected: 732 },
  ],
  solution: `function iterative_depth(n) {
    return 10;
}

function iterative_pushes(n) {
    return 35 * n + 32;
}
`,
};

export const exercise_5_28: ExerciseSpec = {
  id: '5.28',
  starter: `// For the recursive factorial, evaluated by the monitored evaluator,
// for n >= 1:

function recursive_depth(n) {
    // your answer
}

function recursive_pushes(n) {
    // your answer
}
`,
  tests: [
    { name: 'depth for n = 1', kind: 'value', expr: 'recursive_depth(1)', expected: 8 },
    { name: 'depth for n = 5', kind: 'value', expr: 'recursive_depth(5)', expected: 28 },
    { name: 'depth for n = 20', kind: 'value', expr: 'recursive_depth(20)', expected: 103 },
    { name: 'pushes for n = 1', kind: 'value', expr: 'recursive_pushes(1)', expected: 17 },
    { name: 'pushes for n = 5', kind: 'value', expr: 'recursive_pushes(5)', expected: 145 },
    { name: 'pushes for n = 20', kind: 'value', expr: 'recursive_pushes(20)', expected: 625 },
  ],
  solution: `function recursive_depth(n) {
    return 5 * n + 3;
}

function recursive_pushes(n) {
    return 32 * n - 15;
}
`,
};

export const exercise_5_30: ExerciseSpec = {
  id: '5.30',
  starter: `// For the tree-recursive fib, evaluated by the monitored evaluator:

// the maximum stack depth for fib(n), for n >= 2
function fib_depth(n) {
    // your answer
}

// S(n) = S(n - 1) + S(n - 2) + k, for n >= 2
const k = 0;

// S(n) = a Fib(n + 1) + b
const a = 0;
const b = 0;

// the total number of pushes for fib(n), for n >= 0
function fib_pushes(n) {
    // your answer
}
`,
  tests: [
    { name: 'depth for n = 2', kind: 'value', expr: 'fib_depth(2)', expected: 13 },
    { name: 'depth for n = 12', kind: 'value', expr: 'fib_depth(12)', expected: 63 },
    { name: 'the overhead k', kind: 'value', expr: 'k', expected: 39 },
    { name: 'a and b', kind: 'value', expr: 'a === 56 && b === -39', expected: true },
    { name: 'pushes for n = 0 and n = 1', kind: 'value', expr: 'fib_pushes(0) + fib_pushes(1)', expected: 34 },
    { name: 'pushes for n = 5', kind: 'value', expr: 'fib_pushes(5)', expected: 409 },
    { name: 'pushes for n = 12', kind: 'value', expr: 'fib_pushes(12)', expected: 13009 },
  ],
  solution: `function fib_depth(n) {
    return 5 * n + 3;
}

const k = 39;

const a = 56;
const b = -39;

function fib_pushes(n) {
    return n < 2 ? 17 : fib_pushes(n - 1) + fib_pushes(n - 2) + k;
}
`,
};
