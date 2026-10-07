/**
 * Programs for the examples of section 5.2. Every one of them runs on the
 * simulator written in Source (`simulatorSource`, given as the Example's
 * prelude), whose declarations shadow the Laboratory's own `make_machine`.
 */

/** §5.2: the GCD machine of §5.1.1 on the simulator this section writes. */
export const simulatorGcdProgram = `// make_machine, start and the register functions used here are
// the Source declarations of sections 5.2.1 to 5.2.3, not the
// Laboratory's own simulator.
const gcd_machine =
    make_machine(
        list("a", "b", "t"),
        list(list("rem", (a, b) => a % b),
             list("=", (a, b) => a === b)),
        list(
          "test_b",
            test(list(op("="), reg("b"), constant(0))),
            branch(label("gcd_done")),
            assign("t", list(op("rem"), reg("a"), reg("b"))),
            assign("a", reg("b")),
            assign("b", reg("t")),
            go_to(label("test_b")),
          "gcd_done"));
set_register_contents(gcd_machine, "a", 206);
set_register_contents(gcd_machine, "b", 40);
start(gcd_machine);
get_register_contents(gcd_machine, "a");
`;

/** §5.2.1: a register, a stack and a bare machine, used by hand. */
export const machineModelProgram = `const a = make_register("a");
display(get_contents(a));
set_contents(a, 206);
display(get_contents(a));

const s = make_stack();
push(s, 1);
push(s, 2);
display(pop(s));
display(pop(s));

const m = make_new_machine();
m("allocate_register")("b");
set_register_contents(m, "b", 40);
display(map(head, m("operations")));
get_register_contents(m, "b");
`;

/** §5.2.2: what extract_labels hands to its continuation. */
export const extractLabelsProgram = `const gcd_controller =
    list(
      "test_b",
        test(list(op("="), reg("b"), constant(0))),
        branch(label("gcd_done")),
        assign("t", list(op("rem"), reg("a"), reg("b"))),
        assign("a", reg("b")),
        assign("b", reg("t")),
        go_to(label("test_b")),
      "gcd_done");

extract_labels(
    gcd_controller,
    (insts, labels) => {
        display(length(insts));
        display(map(head, labels));
        // Each label entry points into the list of instructions.
        display(tail(head(labels)) === insts);
        display(tail(head(tail(labels))));
        // No execution function yet: update_insts fills it in.
        display(inst_execution_fun(head(insts)));
        return inst_controller_instruction(head(insts));
    });
`;

/** §5.2.3: one execution function, made and called by hand. */
export const executionFunctionProgram = `const m = make_machine(list("a", "b"),
                       list(list("+", (x, y) => x + y)),
                       null);
set_register_contents(m, "a", 3);
set_register_contents(m, "b", 4);

const pc = get_register(m, "pc");
const add_b_to_a =
    make_execution_function(
        assign("a", list(op("+"), reg("a"), reg("b"))),
        null, m, pc, get_register(m, "flag"),
        m("stack"), m("operations"));

set_contents(pc, list("first", "second", "third"));
add_b_to_a();
display(get_register_contents(m, "a"));
add_b_to_a();
display(get_register_contents(m, "a"));
get_contents(pc);
`;

/** §5.2.3: the assembler rejects an instruction the machine would never reach. */
export const assemblyTimeErrorProgram = `const m =
    make_machine(
        list("a"),
        list(list("+", (x, y) => x + y)),
        list(
            go_to(label("done")),
            assign("a", list(op("*"), reg("a"), reg("a"))),
          "done"));
display("assembled");
`;

/** §5.2.4: the monitored stack by itself. */
export const monitoredStackProgram = `const s = make_stack();
push(s, 1);
push(s, 2);
pop(s);
push(s, 3);
push(s, 4);
s("print_statistics");
s("initialize");
s("print_statistics");
`;
