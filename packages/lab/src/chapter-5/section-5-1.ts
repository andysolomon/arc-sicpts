/**
 * Programs for the examples of section 5.1 that `machines.ts` does not
 * already provide. The machines themselves (GCD, factorial, Fibonacci) are in
 * `machines.ts`; these are the variants the pages show.
 */

/**
 * The GCD function of §1.2.5 next to the machine that carries it out (§5.1),
 * so the two answers can be compared.
 */
export const gcdFunctionAndMachineProgram = `function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

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
list(gcd(206, 40), get_register_contents(gcd_machine, "a"));
`;

/**
 * A machine that uses every instruction form of §5.1.5 but one (copying a
 * register, as in the GCD machine's assign("a", reg("b"))): the recursive sum
 * 1 + 2 + ... + n, built like the factorial machine of §5.1.4, displaying each
 * partial sum as the recursion unwinds.
 */
export const everyInstructionProgram = `const sum_machine =
    make_machine(
        list("n", "val", "continue"),
        list(list("=", (a, b) => a === b),
             list("-", (a, b) => a - b),
             list("+", (a, b) => a + b),
             list("display", display)),
        list(
            assign("continue", label("sum_done")),        // a label
          "sum_loop",
            test(list(op("="), reg("n"), constant(0))),   // a test
            branch(label("base_case")),                   // a conditional branch
            save("continue"),                             // the stack
            save("n"),
            assign("n", list(op("-"), reg("n"), constant(1))), // an operation
            assign("continue", label("after_sum")),
            go_to(label("sum_loop")),                     // an unconditional branch
          "after_sum",
            restore("n"),
            restore("continue"),
            assign("val", list(op("+"), reg("n"), reg("val"))),
            perform(list(op("display"), reg("val"))),     // an action
            go_to(reg("continue")),                       // through a register
          "base_case",
            assign("val", constant(0)),                   // a constant
            go_to(reg("continue")),
          "sum_done"));

set_register_contents(sum_machine, "n", 4);
start(sum_machine);
get_register_contents(sum_machine, "val");
`;
