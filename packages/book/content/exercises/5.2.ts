import { factorialController, fibController, simulatorFunctions, simulatorSource, simulatorWithout } from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/**
 * Exercises of §5.2. Most of them change a few functions of the simulator
 * written in Source: the context is the rest of the simulator, declared in the
 * reader's own frame, so that it calls the reader's versions; the starter is
 * just the functions being changed. Helpers the tests use are named `check_…`.
 */

/** The controller list inside a `const … = controller(list(...));` declaration. */
const controllerList = (declaration: string): string =>
  declaration.slice(declaration.indexOf('list('), declaration.lastIndexOf(')')).trim();

const fibList = controllerList(fibController);
const factorialList = controllerList(factorialController);

const gcdList = `list(
          "test_b",
            test(list(op("="), reg("b"), constant(0))),
            branch(label("gcd_done")),
            assign("t", list(op("rem"), reg("a"), reg("b"))),
            assign("a", reg("b")),
            assign("b", reg("t")),
            go_to(label("test_b")),
          "gcd_done")`;

const gcdOps = `list(list("rem", (a, b) => a % b),
                list("=", (a, b) => a === b))`;
const fibOps = `list(list("<", (a, b) => a < b),
                list("-", (a, b) => a - b),
                list("+", (a, b) => a + b))`;
const factorialOps = `list(list("=", (a, b) => a === b),
                list("*", (a, b) => a * b),
                list("-", (a, b) => a - b))`;

/** Make and run the GCD machine with whatever `make_machine` is in scope. */
const checkGcd = `
function check_gcd_machine() {
    return make_machine(list("a", "b", "t"), ${gcdOps}, ${gcdList});
}

function check_gcd(a, b) {
    const m = check_gcd_machine();
    set_register_contents(m, "a", a);
    set_register_contents(m, "b", b);
    start(m);
    return get_register_contents(m, "a");
}
`;

const checkFib = `
function check_fib_controller() {
    return ${fibList};
}

function check_fib(n) {
    const m = make_machine(list("n", "val", "continue"), ${fibOps},
                           check_fib_controller());
    set_register_contents(m, "n", n);
    start(m);
    return get_register_contents(m, "val");
}
`;

const checkFactorial = `
function check_factorial(n) {
    const m = make_machine(list("n", "val", "continue"), ${factorialOps},
                           ${factorialList});
    set_register_contents(m, "n", n);
    start(m);
    return get_register_contents(m, "val");
}
`;

const BUDGET = 5_000_000;

const exptOps = `list(list("=", (a, b) => a === b),
             list("-", (a, b) => a - b),
             list("*", (a, b) => a * b))`;

export const exercise_5_7: ExerciseSpec = {
  id: '5.7',
  prelude: simulatorSource,
  context: `
function check_expt(machine, b, n) {
    set_register_contents(machine, "b", b);
    set_register_contents(machine, "n", n);
    start(machine);
    return get_register_contents(machine, "val");
}

function check_expt_stack(machine, b, n) {
    machine("stack")("initialize");
    check_expt(machine, b, n);
    machine("stack")("print_statistics");
}
`,
  starter: `// The two machines of exercise 5.4, for b to the power n. Each takes
// b and n in registers b and n and leaves the answer in val.
// make_machine here is the Source simulator of section 5.2.

const expt_recursive_machine =
    make_machine(
        list("b", "n", "val", "continue"),
        ${exptOps},
        list(
            // your controller: a recursive process
          "expt_done"));

const expt_iterative_machine =
    make_machine(
        list("b", "n", "val"),
        ${exptOps},
        list(
            // your controller: an iterative process
          "expt_done"));

set_register_contents(expt_recursive_machine, "b", 2);
set_register_contents(expt_recursive_machine, "n", 10);
start(expt_recursive_machine);
get_register_contents(expt_recursive_machine, "val");
`,
  tests: [
    { name: 'recursive: 2 to the 10th', kind: 'value', expr: 'check_expt(expt_recursive_machine, 2, 10)', expected: 1024 },
    { name: 'recursive: 3 to the 0th', kind: 'value', expr: 'check_expt(expt_recursive_machine, 3, 0)', expected: 1 },
    { name: 'recursive: 5 cubed', kind: 'value', expr: 'check_expt(expt_recursive_machine, 5, 3)', expected: 125 },
    { name: 'iterative: 2 to the 10th', kind: 'value', expr: 'check_expt(expt_iterative_machine, 2, 10)', expected: 1024 },
    { name: 'iterative: 3 to the 0th', kind: 'value', expr: 'check_expt(expt_iterative_machine, 3, 0)', expected: 1 },
    { name: 'iterative: 7 to the 4th', kind: 'value', expr: 'check_expt(expt_iterative_machine, 7, 4)', expected: 2401 },
    {
      name: 'the iterative machine never uses the stack',
      kind: 'output',
      call: 'check_expt_stack(expt_iterative_machine, 2, 10)',
      contains: ['total pushes = 0'],
    },
  ],
  budget: BUDGET,
  solution: `const expt_recursive_machine =
    make_machine(
        list("b", "n", "val", "continue"),
        ${exptOps},
        list(
            assign("continue", label("expt_done")),
          "expt_loop",
            test(list(op("="), reg("n"), constant(0))),
            branch(label("base_case")),
            save("continue"),
            assign("n", list(op("-"), reg("n"), constant(1))),
            assign("continue", label("after_expt")),
            go_to(label("expt_loop")),
          "after_expt",
            restore("continue"),
            assign("val", list(op("*"), reg("b"), reg("val"))),
            go_to(reg("continue")),
          "base_case",
            assign("val", constant(1)),
            go_to(reg("continue")),
          "expt_done"));

const expt_iterative_machine =
    make_machine(
        list("b", "n", "val"),
        ${exptOps},
        list(
            assign("val", constant(1)),
          "expt_loop",
            test(list(op("="), reg("n"), constant(0))),
            branch(label("expt_done")),
            assign("n", list(op("-"), reg("n"), constant(1))),
            assign("val", list(op("*"), reg("b"), reg("val"))),
            go_to(label("expt_loop")),
          "expt_done"));

set_register_contents(expt_recursive_machine, "b", 2);
set_register_contents(expt_recursive_machine, "n", 10);
start(expt_recursive_machine);
get_register_contents(expt_recursive_machine, "val");
`,
};

const ambiguousMachine = `make_machine(list("a"), list(), list(
    "start",
      go_to(label("here")),
    "here",
      assign("a", constant(3)),
      go_to(label("there")),
    "here",
      assign("a", constant(4)),
      go_to(label("there")),
    "there"))`;

export const exercise_5_8: ExerciseSpec = {
  id: '5.8',
  context: `${simulatorWithout(['extract_labels'])}
${checkGcd}
function check_two_labels() {
    const m = make_machine(list("a"), list(), list(
        go_to(label("second")),
      "first",
      "second",
        assign("a", constant(5))));
    start(m);
    return get_register_contents(m, "a");
}
`,
  starter: `// With the simulator as written, what is in register a when control
// reaches "there"? Work it out, then replace the 0.
const a_at_there = 0;

// Make extract_labels signal an error when a label name is used
// for two different places.
${simulatorFunctions(['extract_labels'])}
`,
  tests: [
    { name: 'the contents of a at there', kind: 'value', expr: 'a_at_there', expected: 3 },
    { name: 'a label defined twice is an error', kind: 'error', call: ambiguousMachine },
    { name: 'the GCD machine still works', kind: 'value', expr: 'check_gcd(206, 40)', expected: 2 },
    { name: 'two different labels may name one place', kind: 'value', expr: 'check_two_labels()', expected: 5 },
  ],
  budget: BUDGET,
  solution: `const a_at_there = 3;

function extract_labels(controller, receive) {
    return is_null(controller)
           ? receive(null, null)
           : extract_labels(
                 tail(controller),
                 (insts, labels) => {
                     const next_element = head(controller);
                     return is_string(next_element)
                            ? is_undefined(assoc(next_element, labels))
                              ? receive(insts,
                                        pair(make_label_entry(next_element,
                                                              insts),
                                             labels))
                              : error(next_element,
                                      "multiply defined label -- assemble")
                            : receive(pair(make_inst(next_element),
                                           insts),
                                      labels);
                 });
}
`,
};

export const exercise_5_9: ExerciseSpec = {
  id: '5.9',
  context: `${simulatorWithout(['make_operation_exp_ef'])}
${checkGcd}
${checkFactorial}
`,
  starter: `// Allow only registers and constants as the operands of an operation.
${simulatorFunctions(['make_operation_exp_ef'])}
`,
  tests: [
    {
      name: 'an operation applied to a label is an error',
      kind: 'error',
      call: 'make_machine(list("a"), list(list("id", x => x)), list("here", assign("a", list(op("id"), label("here")))))',
    },
    {
      name: 'also in a test',
      kind: 'error',
      call: 'make_machine(list("a"), list(list("id", x => x)), list("here", test(list(op("id"), label("here")))))',
    },
    { name: 'the GCD machine still works', kind: 'value', expr: 'check_gcd(206, 40)', expected: 2 },
    { name: 'labels can still be assigned to registers', kind: 'value', expr: 'check_factorial(5)', expected: 120 },
  ],
  budget: BUDGET,
  solution: `function make_operation_exp_ef(exp, machine, labels, operations) {
    const op = lookup_prim(operation_exp_op(exp), operations);
    const afuns = map(e => is_label_exp(e)
                           ? error(e, "label as an operand -- assemble")
                           : make_primitive_exp_ef(e, machine, labels),
                      operation_exp_operands(exp));
    return () => apply_in_underlying_javascript(
                     op, map(f => f(), afuns));
}
`,
};

const fibShort = fibList
  .replace(
    `          assign("n", reg("val")),      // n now contains Fib(n - 2)
          restore("val"),               // val now contains Fib(n - 1)
`,
    `          restore("n"),                 // n now contains Fib(n - 1)
`,
  )
  .replace('// Fib(n - 1) + Fib(n - 2)', '// Fib(n - 2) + Fib(n - 1)');
if (fibShort === fibList) throw new Error('exercise 5.10: the Fibonacci controller changed');

export const exercise_5_10: ExerciseSpec = {
  id: '5.10',
  // The Laboratory's own simulator, which restores whatever was saved last,
  // runs part (a) whatever the reader does to save and restore in part (b).
  prelude: 'const check_lab_make_machine = make_machine;',
  context: `${simulatorWithout(['make_save_ef', 'make_restore_ef'])}
function check_instructions(controller) {
    return length(filter(x => !is_string(x), controller));
}

function check_fib_with(make, controller, n) {
    const m = make(list("n", "val", "continue"), ${fibOps}, controller);
    set_register_contents(m, "n", n);
    start(m);
    return get_register_contents(m, "val");
}

function check_fib_short(n) {
    return check_fib_with(check_lab_make_machine, fib_controller_short, n);
}

function check_stack_machine(controller) {
    const m = make_machine(list("x", "y"), list(), controller);
    start(m);
    return get_register_contents(m, "y");
}
${checkFib}
`,
  starter: `// (a) The Fibonacci controller of section 5.1.4. Remove one instruction,
// relying on restore putting into its register whatever was saved last.
const fib_controller_short =
    ${fibList};

// (b) Make restore signal an error unless the value on top of the stack
// was saved from the same register.
${simulatorFunctions(['make_save_ef', 'make_restore_ef'])}
`,
  tests: [
    { name: '(a) one instruction fewer', kind: 'value', expr: 'check_instructions(fib_controller_short)', expected: 21 },
    { name: '(a) Fib(6)', kind: 'value', expr: 'check_fib_short(6)', expected: 8 },
    { name: '(a) Fib(10)', kind: 'value', expr: 'check_fib_short(10)', expected: 55 },
    {
      name: '(b) restoring y from a value saved from x is an error',
      kind: 'error',
      call: `check_stack_machine(list(assign("x", constant(1)), assign("y", constant(2)),
                                   save("y"), save("x"), restore("y")))`,
    },
    {
      name: '(b) restoring in the right order works',
      kind: 'value',
      expr: `check_stack_machine(list(assign("x", constant(1)), assign("y", constant(2)),
                                   save("y"), save("x"), restore("x"), restore("y")))`,
      expected: 2,
    },
    { name: '(b) the original Fibonacci machine still works', kind: 'value', expr: 'check_fib(8)', expected: 21 },
    {
      name: '(b) your simulator rejects your controller from (a)',
      kind: 'error',
      call: 'check_fib_with(make_machine, fib_controller_short, 6)',
    },
  ],
  budget: BUDGET,
  solution: `const fib_controller_short =
    ${fibShort};

function make_save_ef(inst, machine, stack, pc) {
    const name = stack_inst_reg_name(inst);
    const reg = get_register(machine, name);
    return () => {
               push(stack, pair(name, get_contents(reg)));
               advance_pc(pc);
           };
}

function make_restore_ef(inst, machine, stack, pc) {
    const name = stack_inst_reg_name(inst);
    const reg = get_register(machine, name);
    return () => {
               const saved = pop(stack);
               if (head(saved) === name) {
                   set_contents(reg, tail(saved));
                   advance_pc(pc);
               } else {
                   error(name, "restored from a value saved from " +
                         head(saved) + " -- restore");
               }
           };
}
`,
};

export const exercise_5_11: ExerciseSpec = {
  id: '5.11',
  context: `${simulatorWithout(['assemble', 'make_new_machine'])}
${checkFib}
${checkGcd}
function check_has(x, xs) {
    return !is_null(xs) && (equal(x, head(xs)) || check_has(x, tail(xs)));
}

function check_same_set(xs, ys) {
    return length(xs) === length(ys)
           && accumulate((x, so_far) => so_far && check_has(x, ys), true, xs)
           && accumulate((y, so_far) => so_far && check_has(y, xs), true, ys);
}

function check_distinct(xs) {
    return is_null(xs)
           ? null
           : pair(head(xs),
                  check_distinct(filter(y => !equal(y, head(xs)), tail(xs))));
}

function check_type_changes(insts) {
    return is_null(insts) || is_null(tail(insts))
           ? 0
           : (head(head(insts)) === head(head(tail(insts))) ? 0 : 1)
             + check_type_changes(tail(insts));
}

function check_fib_machine() {
    return make_machine(list("n", "val", "continue"), ${fibOps},
                        check_fib_controller());
}

function check_instructions() {
    return check_same_set(
               check_fib_machine()("instructions"),
               check_distinct(filter(x => !is_string(x),
                                     check_fib_controller())));
}

function check_sorted() {
    const insts = check_fib_machine()("instructions");
    return check_type_changes(insts)
           === length(check_distinct(map(head, insts))) - 1;
}

function check_sources(name, expected) {
    return check_same_set(check_fib_machine()("sources")(name), expected);
}
`,
  starter: `// Keep in the machine model, and answer these messages with:
//   "instructions"      every instruction once, grouped by type
//   "entry_registers"   the registers that go_to instructions jump to
//   "stack_registers"   the registers that are saved or restored
//   "sources"           a function from a register name to the
//                       expressions assigned to that register
${simulatorFunctions(['assemble', 'make_new_machine'])}
`,
  tests: [
    { name: 'every instruction of the Fibonacci machine, once', kind: 'value', expr: 'check_instructions()', expected: true },
    { name: 'instructions grouped by type', kind: 'value', expr: 'check_sorted()', expected: true },
    {
      name: 'entry-point registers',
      kind: 'value',
      expr: 'check_same_set(check_fib_machine()("entry_registers"), list("continue"))',
      expected: true,
    },
    {
      name: 'saved and restored registers',
      kind: 'value',
      expr: 'check_same_set(check_fib_machine()("stack_registers"), list("continue", "n", "val"))',
      expected: true,
    },
    {
      name: 'the sources of val',
      kind: 'value',
      expr: 'check_sources("val", list(reg("n"), list(op("+"), reg("val"), reg("n"))))',
      expected: true,
    },
    {
      name: 'the sources of n',
      kind: 'value',
      expr: 'check_sources("n", list(list(op("-"), reg("n"), constant(1)), list(op("-"), reg("n"), constant(2)), reg("val")))',
      expected: true,
    },
    {
      name: 'the sources of continue',
      kind: 'value',
      expr: 'check_sources("continue", list(label("fib_done"), label("afterfib_n_1"), label("afterfib_n_2")))',
      expected: true,
    },
    { name: 'the GCD machine has no entry-point registers', kind: 'value', expr: 'is_null(check_gcd_machine()("entry_registers"))', expected: true },
    { name: 'the Fibonacci machine still runs', kind: 'value', expr: 'check_fib(7)', expected: 13 },
  ],
  budget: BUDGET,
  solution: `function assemble(controller, machine) {
    return extract_labels(controller,
                          (insts, labels) => {
                              update_insts(insts, labels, machine);
                              machine("install_data_paths")(
                                  data_paths(map(inst_controller_instruction,
                                                 insts)));
                              return insts;
                          });
}

// The list without repeated elements, in order of first appearance.
function distinct(xs) {
    return is_null(xs)
           ? null
           : pair(head(xs),
                  distinct(filter(y => !equal(y, head(xs)), tail(xs))));
}

function data_paths(instructions) {
    const unique = distinct(instructions);
    const types = distinct(map(type, unique));
    const sorted = accumulate(append, null,
                              map(t => filter(i => type(i) === t, unique),
                                  types));
    const entry_registers =
        distinct(map(i => register_exp_reg(go_to_dest(i)),
                     filter(i => type(i) === "go_to" &&
                                 is_register_exp(go_to_dest(i)),
                            unique)));
    const stack_registers =
        distinct(map(stack_inst_reg_name,
                     filter(i => type(i) === "save" ||
                                 type(i) === "restore",
                            unique)));
    const assigns = filter(i => type(i) === "assign", unique);
    const sources =
        map(name => pair(name,
                         distinct(map(assign_value_exp,
                                      filter(i => assign_reg_name(i) === name,
                                             assigns)))),
            distinct(map(assign_reg_name, assigns)));
    return list(sorted, entry_registers, stack_registers, sources);
}

function make_new_machine() {
    const pc = make_register("pc");
    const flag = make_register("flag");
    const stack = make_stack();
    let the_instruction_sequence = null;
    let the_data_paths = list(null, null, null, null);
    let the_ops = list(list("initialize_stack",
                            () => stack("initialize")),
                       list("print_stack_statistics",
                            () => stack("print_statistics")));
    let register_table = list(list("pc", pc), list("flag", flag));
    function allocate_register(name) {
        if (is_undefined(assoc(name, register_table))) {
            register_table = pair(list(name, make_register(name)),
                                  register_table);
        } else {
            error(name, "multiply defined register");
        }
        return "register allocated";
    }
    function lookup_register(name) {
        const val = assoc(name, register_table);
        return is_undefined(val)
               ? error(name, "unknown register")
               : head(tail(val));
    }
    function sources(name) {
        const entry = assoc(name, list_ref(the_data_paths, 3));
        return is_undefined(entry) ? null : tail(entry);
    }
    function execute() {
        const insts = get_contents(pc);
        if (is_null(insts)) {
            return "done";
        } else {
            inst_execution_fun(head(insts))();
            return execute();
        }
    }
    function dispatch(message) {
        function start() {
            set_contents(pc, the_instruction_sequence);
            return execute();
        }
        return message === "start"
               ? start()
               : message === "install_instruction_sequence"
               ? seq => { the_instruction_sequence = seq; }
               : message === "allocate_register"
               ? allocate_register
               : message === "get_register"
               ? lookup_register
               : message === "install_operations"
               ? ops => { the_ops = append(the_ops, ops); }
               : message === "stack"
               ? stack
               : message === "operations"
               ? the_ops
               : message === "install_data_paths"
               ? paths => { the_data_paths = paths; }
               : message === "instructions"
               ? list_ref(the_data_paths, 0)
               : message === "entry_registers"
               ? list_ref(the_data_paths, 1)
               : message === "stack_registers"
               ? list_ref(the_data_paths, 2)
               : message === "sources"
               ? sources
               : error(message, "unknown request -- machine");
    }
    return dispatch;
}
`,
};

export const exercise_5_12: ExerciseSpec = {
  id: '5.12',
  context: `${simulatorWithout(['make_machine', 'make_new_machine'])}
function check_gcd(a, b) {
    const m = make_machine(${gcdOps}, ${gcdList});
    set_register_contents(m, "a", a);
    set_register_contents(m, "b", b);
    start(m);
    return get_register_contents(m, "a");
}

function check_factorial(n) {
    const m = make_machine(${factorialOps}, ${factorialList});
    set_register_contents(m, "n", n);
    start(m);
    return get_register_contents(m, "val");
}
`,
  starter: `// make_machine(ops, controller): the registers are the ones the
// controller mentions, allocated as the assembler meets them.
${simulatorFunctions(['make_machine', 'make_new_machine'])}
`,
  tests: [
    { name: 'the GCD machine, without a list of registers', kind: 'value', expr: 'check_gcd(206, 40)', expected: 2 },
    { name: 'the factorial machine, without a list of registers', kind: 'value', expr: 'check_factorial(6)', expected: 720 },
  ],
  budget: BUDGET,
  solution: `function make_machine(ops, controller) {
    const machine = make_new_machine();
    machine("install_operations")(ops);
    machine("install_instruction_sequence")
           (assemble(controller, machine));
    return machine;
}

function make_new_machine() {
    const pc = make_register("pc");
    const flag = make_register("flag");
    const stack = make_stack();
    let the_instruction_sequence = null;
    let the_ops = list(list("initialize_stack",
                            () => stack("initialize")),
                       list("print_stack_statistics",
                            () => stack("print_statistics")));
    let register_table = list(list("pc", pc), list("flag", flag));
    function allocate_register(name) {
        if (is_undefined(assoc(name, register_table))) {
            register_table = pair(list(name, make_register(name)),
                                  register_table);
        } else {
            error(name, "multiply defined register");
        }
        return "register allocated";
    }
    // A register is allocated the first time it is looked up, which
    // is when the assembler first meets it in the controller.
    function lookup_register(name) {
        const val = assoc(name, register_table);
        if (is_undefined(val)) {
            allocate_register(name);
            return lookup_register(name);
        } else {
            return head(tail(val));
        }
    }
    function execute() {
        const insts = get_contents(pc);
        if (is_null(insts)) {
            return "done";
        } else {
            inst_execution_fun(head(insts))();
            return execute();
        }
    }
    function dispatch(message) {
        function start() {
            set_contents(pc, the_instruction_sequence);
            return execute();
        }
        return message === "start"
               ? start()
               : message === "install_instruction_sequence"
               ? seq => { the_instruction_sequence = seq; }
               : message === "allocate_register"
               ? allocate_register
               : message === "get_register"
               ? lookup_register
               : message === "install_operations"
               ? ops => { the_ops = append(the_ops, ops); }
               : message === "stack"
               ? stack
               : message === "operations"
               ? the_ops
               : error(message, "unknown request -- machine");
    }
    return dispatch;
}
`,
};

const readingFactorial = `// The factorial machine of section 5.1.4, on the Laboratory's simulator,
// made to read n again and again, and to print n!, the total pushes and
// the maximum depth for each. When the inputs run out, it stops.
set_inputs(list("2", "3", "4", "5", "6"));

const factorial_machine =
    make_machine(
        list("n", "val", "continue"),
        list(list("=", (a, b) => a === b),
             list("*", (a, b) => a * b),
             list("-", (a, b) => a - b),
             list("read", () => {
                              const input = prompt("n:");
                              return is_null(input)
                                     ? null
                                     : parse_int(input, 10);
                          }),
             list("is_null", is_null),
             list("display", display)),
        list(
          "read_n",
            perform(list(op("initialize_stack"))),
            assign("n", list(op("read"))),
            test(list(op("is_null"), reg("n"))),
            branch(label("finished")),
            assign("continue", label("fact_done")),
          "fact_loop",
            test(list(op("="), reg("n"), constant(1))),
            branch(label("base_case")),
            save("continue"),
            save("n"),
            assign("n", list(op("-"), reg("n"), constant(1))),
            assign("continue", label("after_fact")),
            go_to(label("fact_loop")),
          "after_fact",
            restore("n"),
            restore("continue"),
            assign("val", list(op("*"), reg("n"), reg("val"))),
            go_to(reg("continue")),
          "base_case",
            assign("val", constant(1)),
            go_to(reg("continue")),
          "fact_done",
            perform(list(op("display"), reg("val"))),
            perform(list(op("print_stack_statistics"))),
            go_to(label("read_n")),
          "finished"));
start(factorial_machine);
`;

export const exercise_5_13: ExerciseSpec = {
  id: '5.13',
  starter: `${readingFactorial}
// From the statistics, formulas in n for n > 1.
function factorial_pushes(n) {
    return 0;
}

function factorial_depth(n) {
    return 0;
}
`,
  tests: [
    { name: 'total pushes for 2', kind: 'value', expr: 'factorial_pushes(2)', expected: 2 },
    { name: 'total pushes for 7', kind: 'value', expr: 'factorial_pushes(7)', expected: 12 },
    { name: 'total pushes for 50', kind: 'value', expr: 'factorial_pushes(50)', expected: 98 },
    { name: 'maximum depth for 2', kind: 'value', expr: 'factorial_depth(2)', expected: 2 },
    { name: 'maximum depth for 7', kind: 'value', expr: 'factorial_depth(7)', expected: 12 },
    { name: 'maximum depth for 50', kind: 'value', expr: 'factorial_depth(50)', expected: 98 },
  ],
  solution: `${readingFactorial}
function factorial_pushes(n) {
    return 2 * (n - 1);
}

function factorial_depth(n) {
    return 2 * (n - 1);
}
`,
};

/** The basic machine with instruction counting (5.14) and tracing (5.15). */
const countingTracingMachine = `function make_new_machine() {
    const pc = make_register("pc");
    const flag = make_register("flag");
    const stack = make_stack();
    let the_instruction_sequence = null;
    let instruction_count = 0;
    let tracing = false;
    let the_ops = list(list("initialize_stack",
                            () => stack("initialize")),
                       list("print_stack_statistics",
                            () => stack("print_statistics")));
    let register_table = list(list("pc", pc), list("flag", flag));
    function allocate_register(name) {
        if (is_undefined(assoc(name, register_table))) {
            register_table = pair(list(name, make_register(name)),
                                  register_table);
        } else {
            error(name, "multiply defined register");
        }
        return "register allocated";
    }
    function lookup_register(name) {
        const val = assoc(name, register_table);
        return is_undefined(val)
               ? error(name, "unknown register")
               : head(tail(val));
    }
    function execute() {
        const insts = get_contents(pc);
        if (is_null(insts)) {
            return "done";
        } else {
            const inst = head(insts);
            if (tracing) {
                display(inst_controller_instruction(inst));
            } else {}
            instruction_count = instruction_count + 1;
            inst_execution_fun(inst)();
            return execute();
        }
    }
    function read_instruction_count() {
        const count = instruction_count;
        instruction_count = 0;
        return count;
    }
    function trace(on) {
        tracing = on;
        return "done";
    }
    function dispatch(message) {
        function start() {
            set_contents(pc, the_instruction_sequence);
            return execute();
        }
        return message === "start"
               ? start()
               : message === "install_instruction_sequence"
               ? seq => { the_instruction_sequence = seq; }
               : message === "allocate_register"
               ? allocate_register
               : message === "get_register"
               ? lookup_register
               : message === "install_operations"
               ? ops => { the_ops = append(the_ops, ops); }
               : message === "stack"
               ? stack
               : message === "operations"
               ? the_ops
               : message === "instruction_count"
               ? read_instruction_count()
               : message === "trace_on"
               ? trace(true)
               : message === "trace_off"
               ? trace(false)
               : error(message, "unknown request -- machine");
    }
    return dispatch;
}
`;

export const exercise_5_14: ExerciseSpec = {
  id: '5.14',
  context: `${simulatorWithout(['make_new_machine'])}
${checkGcd}
function check_count_gcd(a, b) {
    const m = check_gcd_machine();
    set_register_contents(m, "a", a);
    set_register_contents(m, "b", b);
    start(m);
    return m("instruction_count");
}

function check_count_reset() {
    const m = check_gcd_machine();
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    start(m);
    const first = m("instruction_count");
    const after_reading = m("instruction_count");
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    start(m);
    return list(first, after_reading, m("instruction_count"));
}

function check_count_factorial(n) {
    const m = make_machine(list("n", "val", "continue"), ${factorialOps},
                           ${factorialList});
    set_register_contents(m, "n", n);
    start(m);
    return m("instruction_count");
}
`,
  starter: `// Count the instructions the machine executes. The message
// "instruction_count" returns the count and resets it to zero.
${simulatorFunctions(['make_new_machine'])}
`,
  tests: [
    { name: 'GCD of 206 and 40', kind: 'value', expr: 'check_count_gcd(206, 40)', expected: 26 },
    { name: 'reading the count resets it', kind: 'value', expr: 'equal(check_count_reset(), list(26, 0, 26))', expected: true },
    { name: 'factorial of 4', kind: 'value', expr: 'check_count_factorial(4)', expected: 38 },
  ],
  budget: BUDGET,
  solution: countingTracingMachine
    .replace('    let tracing = false;\n', '')
    .replace(
      `            if (tracing) {
                display(inst_controller_instruction(inst));
            } else {}
`,
      '',
    )
    .replace(
      `    function trace(on) {
        tracing = on;
        return "done";
    }
`,
      '',
    )
    .replace(
      `               : message === "trace_on"
               ? trace(true)
               : message === "trace_off"
               ? trace(false)
`,
      '',
    ),
};

export const exercise_5_15: ExerciseSpec = {
  id: '5.15',
  context: `${simulatorWithout(['make_new_machine'])}
${checkGcd}
function check_traced_gcd(a, b, on) {
    const m = check_gcd_machine();
    m(on ? "trace_on" : "trace_off");
    set_register_contents(m, "a", a);
    set_register_contents(m, "b", b);
    start(m);
    return get_register_contents(m, "a");
}

function check_trace_on_then_off() {
    const m = check_gcd_machine();
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    m("trace_on");
    start(m);
    m("trace_off");
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    start(m);
}
`,
  starter: `// Before each instruction is executed, display it, when tracing is on.
// The messages "trace_on" and "trace_off" turn tracing on and off.
${simulatorFunctions(['make_new_machine'])}
`,
  tests: [
    {
      name: 'tracing on: one line per instruction executed',
      kind: 'output',
      call: 'check_traced_gcd(206, 40, true)',
      count: 26,
      contains: ['test', 'branch', 'assign', 'go_to'],
    },
    { name: 'tracing off: nothing', kind: 'output', call: 'check_traced_gcd(206, 40, false)', count: 0 },
    { name: 'trace_off stops the trace', kind: 'output', call: 'check_trace_on_then_off()', count: 26 },
    { name: 'the machine still computes', kind: 'value', expr: 'check_traced_gcd(48, 18, true)', expected: 6 },
  ],
  budget: BUDGET,
  solution: countingTracingMachine
    .replace('    let instruction_count = 0;\n', '')
    .replace('            instruction_count = instruction_count + 1;\n', '')
    .replace(
      `    function read_instruction_count() {
        const count = instruction_count;
        instruction_count = 0;
        return count;
    }
`,
      '',
    )
    .replace(
      `               : message === "instruction_count"
               ? read_instruction_count()
`,
      '',
    ),
};

const instructionFunctions = ['extract_labels', 'make_inst', 'inst_controller_instruction', 'inst_execution_fun', 'set_inst_execution_fun'];

export const exercise_5_16: ExerciseSpec = {
  id: '5.16',
  context: `${simulatorWithout([...instructionFunctions, 'make_new_machine'])}
${checkGcd}
function check_traced_gcd() {
    const m = check_gcd_machine();
    m("trace_on");
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    start(m);
    return m("instruction_count");
}

function check_two_labels() {
    const m = make_machine(list("a"), list(), list(
        go_to(label("first")),
      "first",
      "second",
        assign("a", constant(1))));
    m("trace_on");
    start(m);
}
`,
  starter: `// The machine of exercises 5.14 and 5.15, which counts and traces.
// When tracing, print the labels just before an instruction ahead of it,
// without changing what the instruction count counts.
${countingTracingMachine}
${simulatorFunctions(instructionFunctions)}
`,
  tests: [
    {
      name: 'the trace of GCD 206, 40: 26 instructions and 5 labels',
      kind: 'output',
      call: 'check_traced_gcd()',
      count: 31,
      contains: ['test_b'],
    },
    { name: 'labels are not counted as instructions', kind: 'value', expr: 'check_traced_gcd()', expected: 26 },
    {
      name: 'two labels before one instruction',
      kind: 'output',
      call: 'check_two_labels()',
      count: 4,
      contains: ['first', 'second'],
    },
    { name: 'the GCD machine still computes', kind: 'value', expr: 'check_gcd(48, 18)', expected: 6 },
  ],
  budget: BUDGET,
  solution: countingTracingMachine.replace(
    `            if (tracing) {
                display(inst_controller_instruction(inst));`,
    `            if (tracing) {
                for_each(display, inst_labels(inst));
                display(inst_controller_instruction(inst));`,
  ) +
    `
function extract_labels(controller, receive) {
    return is_null(controller)
           ? receive(null, null)
           : extract_labels(
                 tail(controller),
                 (insts, labels) => {
                     const next_element = head(controller);
                     if (is_string(next_element)) {
                         if (!is_null(insts)) {
                             add_inst_label(head(insts), next_element);
                         } else {}
                         return receive(insts,
                                        pair(make_label_entry(next_element,
                                                              insts),
                                             labels));
                     } else {
                         return receive(pair(make_inst(next_element),
                                             insts),
                                        labels);
                     }
                 });
}

// An instruction is now a controller instruction, the labels just
// before it, and its execution function.
function make_inst(inst_controller_instruction) {
    return pair(inst_controller_instruction, pair(null, null));
}

function inst_controller_instruction(inst) {
    return head(inst);
}

function inst_labels(inst) {
    return head(tail(inst));
}

function add_inst_label(inst, label_name) {
    set_head(tail(inst), pair(label_name, inst_labels(inst)));
}

function inst_execution_fun(inst) {
    return tail(tail(inst));
}

function set_inst_execution_fun(inst, fun) {
    set_tail(tail(inst), fun);
}
`,
};

export const exercise_5_17: ExerciseSpec = {
  id: '5.17',
  context: `${simulatorWithout(['make_register', 'make_new_machine'])}
${checkGcd}
function check_traced_register(name) {
    const m = check_gcd_machine();
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    m("trace_register_on")(name);
    start(m);
}

function check_trace_on_then_off() {
    const m = check_gcd_machine();
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    m("trace_register_on")("a");
    start(m);
    m("trace_register_off")("a");
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    start(m);
}
`,
  starter: `// A traced register displays, on one line, its name, its old contents
// and its new contents whenever it is assigned. Registers accept
// "trace_on" and "trace_off"; the machine accepts
// "trace_register_on" and "trace_register_off", each followed by a
// register name: machine("trace_register_on")("a").
${simulatorFunctions(['make_register', 'make_new_machine'])}
`,
  tests: [
    {
      name: 'a traced: four assignments',
      kind: 'output',
      call: 'check_traced_register("a")',
      count: 4,
      contains: ['206', '40', '2'],
    },
    {
      name: 't traced: its first old contents are *unassigned*',
      kind: 'output',
      call: 'check_traced_register("t")',
      count: 4,
      contains: ['unassigned', '6'],
    },
    { name: 'trace_register_off stops the trace', kind: 'output', call: 'check_trace_on_then_off()', count: 4 },
    { name: 'untraced registers are silent', kind: 'output', call: 'check_gcd(206, 40)', count: 0 },
    { name: 'the GCD machine still computes', kind: 'value', expr: 'check_gcd(206, 40)', expected: 2 },
  ],
  budget: BUDGET,
  solution: `function make_register(name) {
    let contents = "*unassigned*";
    let tracing = false;
    function set(value) {
        if (tracing) {
            display(name + ": " + stringify(contents) +
                    " -> " + stringify(value));
        } else {}
        contents = value;
    }
    function trace(on) {
        tracing = on;
        return "done";
    }
    function dispatch(message) {
        return message === "get"
               ? contents
               : message === "set"
               ? set
               : message === "trace_on"
               ? trace(true)
               : message === "trace_off"
               ? trace(false)
               : error(message, "unknown request -- make_register");
    }
    return dispatch;
}
${simulatorFunctions(['make_new_machine']).replace(
  `               : message === "operations"
               ? the_ops
`,
  `               : message === "operations"
               ? the_ops
               : message === "trace_register_on"
               ? name => lookup_register(name)("trace_on")
               : message === "trace_register_off"
               ? name => lookup_register(name)("trace_off")
`,
)}
`,
};

export const exercise_5_18: ExerciseSpec = {
  id: '5.18',
  context: `${simulatorWithout(['assemble', 'make_new_machine'])}
${checkGcd}
function check_gcd_registers(m) {
    return list(get_register_contents(m, "a"),
                get_register_contents(m, "b"),
                get_register_contents(m, "t"));
}

function check_started(a, b) {
    const m = check_gcd_machine();
    set_register_contents(m, "a", a);
    set_register_contents(m, "b", b);
    set_breakpoint(m, "test_b", 4);
    start(m);
    return m;
}

function check_at_breakpoint() {
    return check_gcd_registers(check_started(206, 40));
}

function check_proceed() {
    const m = check_started(206, 40);
    proceed_machine(m);
    return check_gcd_registers(m);
}

function check_cancel() {
    const m = check_started(206, 40);
    cancel_breakpoint(m, "test_b", 4);
    proceed_machine(m);
    return get_register_contents(m, "a");
}

function check_cancel_all() {
    const m = check_started(206, 40);
    set_breakpoint(m, "test_b", 1);
    cancel_all_breakpoints(m);
    proceed_machine(m);
    return get_register_contents(m, "a");
}

function check_change_state() {
    const m = check_gcd_machine();
    set_register_contents(m, "a", 206);
    set_register_contents(m, "b", 40);
    set_breakpoint(m, "test_b", 1);
    start(m);
    set_register_contents(m, "a", 48);
    set_register_contents(m, "b", 18);
    cancel_all_breakpoints(m);
    proceed_machine(m);
    return get_register_contents(m, "a");
}
`,
  starter: `// set_breakpoint(machine, label, n) stops the machine just before the
// nth instruction after label, printing the label and n.
${simulatorFunctions(['assemble', 'make_new_machine'])}

function set_breakpoint(machine, label, n) {
    // your answer
}

function proceed_machine(machine) {
    // your answer
}

function cancel_breakpoint(machine, label, n) {
    // your answer
}

function cancel_all_breakpoints(machine) {
    // your answer
}
`,
  tests: [
    { name: 'stops before the assignment to a', kind: 'value', expr: 'equal(check_at_breakpoint(), list(206, 40, 6))', expected: true },
    { name: 'prints the label and the offset', kind: 'output', call: 'check_started(206, 40)', count: 1, contains: ['test_b', '4'] },
    { name: 'proceed_machine stops at the breakpoint again', kind: 'value', expr: 'equal(check_proceed(), list(40, 6, 4))', expected: true },
    { name: 'cancel_breakpoint', kind: 'value', expr: 'check_cancel()', expected: 2 },
    { name: 'cancel_all_breakpoints', kind: 'value', expr: 'check_cancel_all()', expected: 2 },
    { name: 'registers can be changed at a breakpoint', kind: 'value', expr: 'check_change_state()', expected: 6 },
    { name: 'without breakpoints the machine runs to the end', kind: 'value', expr: 'check_gcd(206, 40)', expected: 2 },
  ],
  budget: BUDGET,
  solution: `function assemble(controller, machine) {
    return extract_labels(controller,
                          (insts, labels) => {
                              update_insts(insts, labels, machine);
                              machine("install_labels")(labels);
                              return insts;
                          });
}

function make_new_machine() {
    const pc = make_register("pc");
    const flag = make_register("flag");
    const stack = make_stack();
    let the_instruction_sequence = null;
    let the_labels = null;
    // Each breakpoint: list(instruction, label, n).
    let breakpoints = null;
    let the_ops = list(list("initialize_stack",
                            () => stack("initialize")),
                       list("print_stack_statistics",
                            () => stack("print_statistics")));
    let register_table = list(list("pc", pc), list("flag", flag));
    function allocate_register(name) {
        if (is_undefined(assoc(name, register_table))) {
            register_table = pair(list(name, make_register(name)),
                                  register_table);
        } else {
            error(name, "multiply defined register");
        }
        return "register allocated";
    }
    function lookup_register(name) {
        const val = assoc(name, register_table);
        return is_undefined(val)
               ? error(name, "unknown register")
               : head(tail(val));
    }
    function breakpoint_at(inst) {
        const found = filter(b => head(b) === inst, breakpoints);
        return is_null(found) ? null : head(found);
    }
    // When resuming, the instruction at the breakpoint runs first.
    function execute(resuming) {
        const insts = get_contents(pc);
        if (is_null(insts)) {
            return "done";
        } else {
            const inst = head(insts);
            const b = breakpoint_at(inst);
            if (!resuming && !is_null(b)) {
                display("breakpoint at " + list_ref(b, 1) + " + " +
                        stringify(list_ref(b, 2)));
                return "stopped";
            } else {
                inst_execution_fun(inst)();
                return execute(false);
            }
        }
    }
    function set_breakpoint(label_name, n) {
        const inst = list_ref(lookup_label(the_labels, label_name), n - 1);
        breakpoints = pair(list(inst, label_name, n), breakpoints);
        return "done";
    }
    function cancel_breakpoint(label_name, n) {
        breakpoints = filter(b => !(list_ref(b, 1) === label_name &&
                                    list_ref(b, 2) === n),
                             breakpoints);
        return "done";
    }
    function cancel_all_breakpoints() {
        breakpoints = null;
        return "done";
    }
    function dispatch(message) {
        function start() {
            set_contents(pc, the_instruction_sequence);
            return execute(false);
        }
        return message === "start"
               ? start()
               : message === "install_instruction_sequence"
               ? seq => { the_instruction_sequence = seq; }
               : message === "allocate_register"
               ? allocate_register
               : message === "get_register"
               ? lookup_register
               : message === "install_operations"
               ? ops => { the_ops = append(the_ops, ops); }
               : message === "stack"
               ? stack
               : message === "operations"
               ? the_ops
               : message === "install_labels"
               ? labels => { the_labels = labels; }
               : message === "set_breakpoint"
               ? set_breakpoint
               : message === "cancel_breakpoint"
               ? cancel_breakpoint
               : message === "cancel_all_breakpoints"
               ? cancel_all_breakpoints()
               : message === "proceed"
               ? execute(true)
               : error(message, "unknown request -- machine");
    }
    return dispatch;
}

function set_breakpoint(machine, label, n) {
    return machine("set_breakpoint")(label, n);
}

function proceed_machine(machine) {
    return machine("proceed");
}

function cancel_breakpoint(machine, label, n) {
    return machine("cancel_breakpoint")(label, n);
}

function cancel_all_breakpoints(machine) {
    return machine("cancel_all_breakpoints");
}
`,
};
