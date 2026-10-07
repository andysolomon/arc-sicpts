/**
 * Section 5.1: the machines the chapter designs, as programs that build and
 * run them. Each `...Controller` is the declaration of a controller; each
 * `...Program` makes the machine, gives it inputs and runs it.
 */

export const gcdController = `const gcd_controller =
    controller(
      list(
        "test_b",
          test(list(op("="), reg("b"), constant(0))),
          branch(label("gcd_done")),
          assign("t", list(op("rem"), reg("a"), reg("b"))),
          assign("a", reg("b")),
          assign("b", reg("t")),
          go_to(label("test_b")),
        "gcd_done"));
`;

export const gcdControllerProgram = `${gcdController}
const gcd_machine =
    make_machine(
        list("a", "b", "t"),
        list(list("rem", (a, b) => a % b),
             list("=", (a, b) => a === b)),
        controller_sequence(gcd_controller));
set_register_contents(gcd_machine, "a", 206);
set_register_contents(gcd_machine, "b", 40);
start(gcd_machine);
get_register_contents(gcd_machine, "a");
`;

/** The same machine, written out in one piece as §5.2 does. */
export const gcdMachineProgram = `const gcd_machine =
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

/** GCD that reads its inputs and prints its result, forever (§5.1.1). */
export const gcdWithPromptProgram = `const gcd_with_prompt_controller =
    controller(
      list(
        "gcd_loop",
          assign("a", list(op("prompt"))),
          assign("b", list(op("prompt"))),
        "test_b",
          test(list(op("="), reg("b"), constant(0))),
          branch(label("gcd_done")),
          assign("t", list(op("rem"), reg("a"), reg("b"))),
          assign("a", reg("b")),
          assign("b", reg("t")),
          go_to(label("test_b")),
        "gcd_done",
          perform(list(op("display"), reg("a"))),
          go_to(label("gcd_loop"))));

// prompt() reads the next of these instead of asking; when they run out it
// returns null, and the machine stops at the first operation that needs a number.
set_inputs(list("206", "40", "48", "18"));

const gcd_with_prompt_machine =
    make_machine(
        list("a", "b", "t"),
        list(list("rem", (a, b) => a % b),
             list("=", (a, b) => a === b),
             list("prompt", () => {
                                    const input = prompt("enter number:");
                                    return is_null(input)
                                           ? error("no more input")
                                           : parse_int(input, 10);
                                }),
             list("display", display)),
        controller_sequence(gcd_with_prompt_controller));
start(gcd_with_prompt_machine);
`;

/** Remainder by repeated subtraction, inside the GCD machine (§5.1.2). */
export const gcdElaboratedProgram = `const gcd_elaborated_controller =
    controller(
      list(
        "test_b",
          test(list(op("="), reg("b"), constant(0))),
          branch(label("gcd_done")),
          assign("t", reg("a")),
        "rem_loop",
          test(list(op("<"), reg("t"), reg("b"))),
          branch(label("rem_done")),
          assign("t", list(op("-"), reg("t"), reg("b"))),
          go_to(label("rem_loop")),
        "rem_done",
          assign("a", reg("b")),
          assign("b", reg("t")),
          go_to(label("test_b")),
        "gcd_done"));

const gcd_elaborated_machine =
    make_machine(
        list("a", "b", "t"),
        list(list("=", (a, b) => a === b),
             list("<", (a, b) => a < b),
             list("-", (a, b) => a - b)),
        controller_sequence(gcd_elaborated_controller));
set_register_contents(gcd_elaborated_machine, "a", 206);
set_register_contents(gcd_elaborated_machine, "b", 40);
start(gcd_elaborated_machine);
get_register_contents(gcd_elaborated_machine, "a");
`;

/** One GCD subroutine shared by two callers, with the return address in `continue` (§5.1.3). */
export const gcdSubroutineProgram = `const two_gcds =
    make_machine(
        list("a", "b", "t", "continue", "first", "second"),
        list(list("rem", (a, b) => a % b),
             list("=", (a, b) => a === b)),
        list(
            assign("a", constant(206)),
            assign("b", constant(40)),
            assign("continue", label("after_gcd_1")),
            go_to(label("gcd")),
          "after_gcd_1",
            assign("first", reg("a")),
            assign("a", constant(48)),
            assign("b", constant(18)),
            assign("continue", label("after_gcd_2")),
            go_to(label("gcd")),
          "after_gcd_2",
            assign("second", reg("a")),
            go_to(label("done")),
          "gcd",
            test(list(op("="), reg("b"), constant(0))),
            branch(label("gcd_done")),
            assign("t", list(op("rem"), reg("a"), reg("b"))),
            assign("a", reg("b")),
            assign("b", reg("t")),
            go_to(label("gcd")),
          "gcd_done",
            go_to(reg("continue")),
          "done"));
start(two_gcds);
list(get_register_contents(two_gcds, "first"),
     get_register_contents(two_gcds, "second"));
`;

export const factorialController = `const factorial_recursive_controller =
    controller(
      list(
          assign("continue", label("fact_done")), // set up final return address
        "fact_loop",
          test(list(op("="), reg("n"), constant(1))),
          branch(label("base_case")),
          // Set up for recursive call by saving n and continue.
          // Set up continue so that the computation will continue
          // at after_fact when the subroutine returns.
          save("continue"),
          save("n"),
          assign("n", list(op("-"), reg("n"), constant(1))),
          assign("continue", label("after_fact")),
          go_to(label("fact_loop")),
        "after_fact",
          restore("n"),
          restore("continue"),
          assign("val",                 // val now contains n(n - 1)!
                 list(op("*"), reg("n"), reg("val"))),
          go_to(reg("continue")),       // return to caller
        "base_case",
          assign("val", constant(1)),   // base case: 1! = 1
          go_to(reg("continue")),       // return to caller
        "fact_done"));
`;

export const factorialMachineProgram = `${factorialController}
const factorial_recursive_machine =
    make_machine(
        list("n", "val", "continue"),
        list(list("=", (a, b) => a === b),
             list("*", (a, b) => a * b),
             list("-", (a, b) => a - b)),
        controller_sequence(factorial_recursive_controller));
set_register_contents(factorial_recursive_machine, "n", 4);
start(factorial_recursive_machine);
get_register_contents(factorial_recursive_machine, "val");
`;

export const fibController = `const fib_recursive_controller =
    controller(
      list(
          assign("continue", label("fib_done")),
        "fib_loop",
          test(list(op("<"), reg("n"), constant(2))),
          branch(label("immediate_answer")),
          // set up to compute Fib(n - 1)
          save("continue"),
          assign("continue", label("afterfib_n_1")),
          save("n"),                    // save old value of n
          assign("n", list(op("-"), reg("n"), constant(1))), // clobber n to n - 1
          go_to(label("fib_loop")),     // perform recursive call
        "afterfib_n_1",                 // upon return, val contains Fib(n - 1)
          restore("n"),
          restore("continue"),
          // set up to compute Fib(n - 2)
          assign("n", list(op("-"), reg("n"), constant(2))),
          save("continue"),
          assign("continue", label("afterfib_n_2")),
          save("val"),                  // save Fib(n - 1)
          go_to(label("fib_loop")),
        "afterfib_n_2",                 // upon return, val contains Fib(n - 2)
          assign("n", reg("val")),      // n now contains Fib(n - 2)
          restore("val"),               // val now contains Fib(n - 1)
          restore("continue"),
          assign("val",                 // Fib(n - 1) + Fib(n - 2)
                 list(op("+"), reg("val"), reg("n"))),
          go_to(reg("continue")),       // return to caller, answer in val
        "immediate_answer",
          assign("val", reg("n")),      // base case: Fib(n) = n
          go_to(reg("continue")),
        "fib_done"));
`;

export const fibMachineProgram = `${fibController}
const fib_recursive_machine =
    make_machine(
        list("n", "val", "continue"),
        list(list("<", (a, b) => a < b),
             list("-", (a, b) => a - b),
             list("+", (a, b) => a + b)),
        controller_sequence(fib_recursive_controller));
set_register_contents(fib_recursive_machine, "n", 6);
start(fib_recursive_machine);
get_register_contents(fib_recursive_machine, "val");
`;

/** The factorial machine with the stack monitored (§5.2.4). */
export const monitoredFactorialProgram = `${factorialController}
const factorial_machine =
    make_machine(
        list("n", "val", "continue"),
        list(list("=", (a, b) => a === b),
             list("*", (a, b) => a * b),
             list("-", (a, b) => a - b)),
        controller_sequence(factorial_recursive_controller));

function factorial_statistics(n) {
    factorial_machine("stack")("initialize");
    set_register_contents(factorial_machine, "n", n);
    start(factorial_machine);
    display("factorial(" + stringify(n) + ") = " +
            stringify(get_register_contents(factorial_machine, "val")));
    factorial_machine("stack")("print_statistics");
}
factorial_statistics(3);
factorial_statistics(6);
`;
