import { fibController } from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §5.1. */

/**
 * Helpers the tests call, declared in the submission's frame so they can
 * reach the reader's machines. `check_run` gives a machine its inputs, as a
 * list of pairs of register name and value, runs it from a fresh stack and
 * returns the contents of one register.
 */
const checkHelpers = `function check_run(machine, inputs, result) {
    machine("stack")("initialize");
    for_each(input => set_register_contents(machine, head(input), tail(input)),
             inputs);
    start(machine);
    return get_register_contents(machine, result);
}
function check_statistics(machine, inputs) {
    check_run(machine, inputs, head(head(inputs)));
    return machine("stack")("statistics");
}
function check_operation_names(machine) {
    return filter(name => name !== "initialize_stack" &&
                          name !== "print_stack_statistics",
                  map(head, machine("operations")));
}
function check_only(names, allowed) {
    return accumulate((name, ok) => ok && !is_null(member(name, allowed)),
                      true, names);
}
function check_has(names, name) {
    return !is_null(member(name, names));
}
const check_arithmetic =
    list("+", "-", "*", "/", "%", "=", "===", "!==", "<", ">", "<=", ">=", "abs");
`;

const inputs = (pairs: Record<string, number>): string =>
  `list(${Object.entries(pairs)
    .map(([name, value]) => `pair("${name}", ${value})`)
    .join(', ')})`;

export const exercise_5_1: ExerciseSpec = {
  id: '5.1',
  context: checkHelpers,
  starter: `// The iterative factorial:
//
// function factorial(n) {
//     function iter(product, counter) {
//         return counter > n
//                ? product
//                : iter(counter * product, counter + 1);
//     }
//     return iter(1, 1);
// }

const factorial_machine =
    make_machine(
        list("n", "product", "counter"),
        list(list("*", (a, b) => a * b),
             list("+", (a, b) => a + b),
             list(">", (a, b) => a > b)),
        list(
          // your controller: n holds the input; leave n! in product
        ));
`,
  tests: [
    { name: '1! = 1', kind: 'value', expr: `check_run(factorial_machine, ${inputs({ n: 1 })}, "product")`, expected: 1 },
    { name: '5! = 120', kind: 'value', expr: `check_run(factorial_machine, ${inputs({ n: 5 })}, "product")`, expected: 120 },
    { name: '10! = 3628800', kind: 'value', expr: `check_run(factorial_machine, ${inputs({ n: 10 })}, "product")`, expected: 3628800 },
    {
      name: 'the machine can be run again',
      kind: 'value',
      expr: `check_run(factorial_machine, ${inputs({ n: 4 })}, "product") + check_run(factorial_machine, ${inputs({ n: 3 })}, "product")`,
      expected: 30,
    },
    {
      name: 'it never uses the stack',
      kind: 'value',
      expr: `equal(check_statistics(factorial_machine, ${inputs({ n: 6 })}), list(0, 0)) && get_register_contents(factorial_machine, "product") === 720`,
      expected: true,
    },
    {
      name: 'its operations are arithmetic and comparisons',
      kind: 'value',
      expr: 'check_only(check_operation_names(factorial_machine), check_arithmetic)',
      expected: true,
    },
  ],
  solution: `const factorial_machine =
    make_machine(
        list("n", "product", "counter"),
        list(list("*", (a, b) => a * b),
             list("+", (a, b) => a + b),
             list(">", (a, b) => a > b)),
        list(
            assign("product", constant(1)),
            assign("counter", constant(1)),
          "test_counter",
            test(list(op(">"), reg("counter"), reg("n"))),
            branch(label("factorial_done")),
            assign("product", list(op("*"), reg("counter"), reg("product"))),
            assign("counter", list(op("+"), reg("counter"), constant(1))),
            go_to(label("test_counter")),
          "factorial_done"));
`,
};

export const exercise_5_3: ExerciseSpec = {
  id: '5.3',
  context: checkHelpers,
  starter: `// Newton's method, as in §1.1.7:
//
// function sqrt(x) {
//     function is_good_enough(guess) {
//         return math_abs(square(guess) - x) < 0.001;
//     }
//     function improve(guess) {
//         return average(guess, x / guess);
//     }
//     function sqrt_iter(guess) {
//         return is_good_enough(guess)
//                ? guess
//                : sqrt_iter(improve(guess));
//     }
//     return sqrt_iter(1);
// }

// First version: good_enough and improve are primitive operations.
const sqrt_machine_1 =
    make_machine(
        list("x", "guess"),
        list(list("good_enough",
                  (guess, x) => math_abs(guess * guess - x) < 0.001),
             list("improve", (guess, x) => (guess + x / guess) / 2)),
        list(
          // your controller: x holds the input; leave its root in guess
        ));

// Second version: arithmetic operations only. Add the registers you need.
const sqrt_machine_2 =
    make_machine(
        list("x", "guess"),
        list(),
        list(
          // your controller
        ));
`,
  tests: [
    {
      name: 'first machine: √2',
      kind: 'value',
      expr: close(`check_run(sqrt_machine_1, ${inputs({ x: 2 })}, "guess")`, 1.41421356, 0.001),
      expected: true,
    },
    {
      name: 'first machine: √9',
      kind: 'value',
      expr: close(`check_run(sqrt_machine_1, ${inputs({ x: 9 })}, "guess")`, 3, 0.001),
      expected: true,
    },
    {
      name: 'first machine uses good_enough and improve',
      kind: 'value',
      expr: 'check_has(check_operation_names(sqrt_machine_1), "good_enough") && check_has(check_operation_names(sqrt_machine_1), "improve")',
      expected: true,
    },
    {
      name: 'second machine: √2',
      kind: 'value',
      expr: close(`check_run(sqrt_machine_2, ${inputs({ x: 2 })}, "guess")`, 1.41421356, 0.001),
      expected: true,
    },
    {
      name: 'second machine: √144',
      kind: 'value',
      expr: close(`check_run(sqrt_machine_2, ${inputs({ x: 144 })}, "guess")`, 12, 0.001),
      expected: true,
    },
    {
      name: 'second machine uses arithmetic only',
      kind: 'value',
      expr: 'check_only(check_operation_names(sqrt_machine_2), check_arithmetic)',
      expected: true,
    },
  ],
  solution: `const sqrt_machine_1 =
    make_machine(
        list("x", "guess"),
        list(list("good_enough",
                  (guess, x) => math_abs(guess * guess - x) < 0.001),
             list("improve", (guess, x) => (guess + x / guess) / 2)),
        list(
            assign("guess", constant(1)),
          "sqrt_loop",
            test(list(op("good_enough"), reg("guess"), reg("x"))),
            branch(label("sqrt_done")),
            assign("guess", list(op("improve"), reg("guess"), reg("x"))),
            go_to(label("sqrt_loop")),
          "sqrt_done"));

const sqrt_machine_2 =
    make_machine(
        list("x", "guess", "t"),
        list(list("*", (a, b) => a * b),
             list("-", (a, b) => a - b),
             list("/", (a, b) => a / b),
             list("+", (a, b) => a + b),
             list("<", (a, b) => a < b),
             list("abs", math_abs)),
        list(
            assign("guess", constant(1)),
          "sqrt_loop",
            // good_enough: |guess² - x| < 0.001
            assign("t", list(op("*"), reg("guess"), reg("guess"))),
            assign("t", list(op("-"), reg("t"), reg("x"))),
            assign("t", list(op("abs"), reg("t"))),
            test(list(op("<"), reg("t"), constant(0.001))),
            branch(label("sqrt_done")),
            // improve: (guess + x / guess) / 2
            assign("t", list(op("/"), reg("x"), reg("guess"))),
            assign("t", list(op("+"), reg("guess"), reg("t"))),
            assign("guess", list(op("/"), reg("t"), constant(2))),
            go_to(label("sqrt_loop")),
          "sqrt_done"));
`,
};

const exptOperations = `list(list("=", (a, b) => a === b),
             list("-", (a, b) => a - b),
             list("*", (a, b) => a * b))`;

export const exercise_5_4: ExerciseSpec = {
  id: '5.4',
  context: checkHelpers,
  starter: `// Recursive: leave b to the power n in val.
const expt_recursive_machine =
    make_machine(
        list("b", "n", "val", "continue"),
        ${exptOperations},
        list(
          // your controller
        ));

// Iterative: leave b to the power n in product.
const expt_iterative_machine =
    make_machine(
        list("b", "n", "counter", "product"),
        ${exptOperations},
        list(
          // your controller
        ));
`,
  tests: [
    {
      name: 'recursive: 3 to the 4th',
      kind: 'value',
      expr: `check_run(expt_recursive_machine, ${inputs({ b: 3, n: 4 })}, "val")`,
      expected: 81,
    },
    {
      name: 'recursive: 2 to the 0th and 10th',
      kind: 'value',
      expr: `check_run(expt_recursive_machine, ${inputs({ b: 2, n: 0 })}, "val") + check_run(expt_recursive_machine, ${inputs({ b: 2, n: 10 })}, "val")`,
      expected: 1025,
    },
    {
      name: 'recursive: the stack grows with n',
      kind: 'value',
      expr: `list_ref(check_statistics(expt_recursive_machine, ${inputs({ b: 2, n: 8 })}), 1) >= 8 && list_ref(check_statistics(expt_recursive_machine, ${inputs({ b: 2, n: 8 })}), 1) > list_ref(check_statistics(expt_recursive_machine, ${inputs({ b: 2, n: 4 })}), 1)`,
      expected: true,
    },
    {
      name: 'iterative: 3 to the 4th',
      kind: 'value',
      expr: `check_run(expt_iterative_machine, ${inputs({ b: 3, n: 4 })}, "product")`,
      expected: 81,
    },
    {
      name: 'iterative: 2 to the 0th and 10th',
      kind: 'value',
      expr: `check_run(expt_iterative_machine, ${inputs({ b: 2, n: 0 })}, "product") + check_run(expt_iterative_machine, ${inputs({ b: 2, n: 10 })}, "product")`,
      expected: 1025,
    },
    {
      name: 'iterative: no stack',
      kind: 'value',
      expr: `equal(check_statistics(expt_iterative_machine, ${inputs({ b: 2, n: 10 })}), list(0, 0)) && get_register_contents(expt_iterative_machine, "product") === 1024`,
      expected: true,
    },
  ],
  solution: `const expt_recursive_machine =
    make_machine(
        list("b", "n", "val", "continue"),
        ${exptOperations},
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
        list("b", "n", "counter", "product"),
        ${exptOperations},
        list(
            assign("counter", reg("n")),
            assign("product", constant(1)),
          "expt_loop",
            test(list(op("="), reg("counter"), constant(0))),
            branch(label("expt_done")),
            assign("counter", list(op("-"), reg("counter"), constant(1))),
            assign("product", list(op("*"), reg("b"), reg("product"))),
            go_to(label("expt_loop")),
          "expt_done"));
`,
};

export const exercise_5_5: ExerciseSpec = {
  id: '5.5',
  starter: `// Each stack as a list, top first, labels written as strings.

// The factorial machine, n = 3, when it first reaches base_case:
const factorial_stack_at_base_case = list();

// The Fibonacci machine, n = 3, when it first reaches immediate_answer:
const fib_stack_at_immediate_answer = list();

// The Fibonacci machine, n = 3, when it first reaches afterfib_n_2:
const fib_stack_at_afterfib_n_2 = list();
`,
  tests: [
    {
      name: 'factorial at base_case',
      kind: 'value',
      expr: 'equal(factorial_stack_at_base_case, list(2, "after_fact", 3, "fact_done"))',
      expected: true,
    },
    {
      name: 'Fibonacci at the first immediate_answer',
      kind: 'value',
      expr: 'equal(fib_stack_at_immediate_answer, list(2, "afterfib_n_1", 3, "fib_done"))',
      expected: true,
    },
    {
      name: 'Fibonacci at the first afterfib_n_2',
      kind: 'value',
      expr: 'equal(fib_stack_at_afterfib_n_2, list(1, "afterfib_n_1", 3, "fib_done"))',
      expected: true,
    },
  ],
  solution: `const factorial_stack_at_base_case = list(2, "after_fact", 3, "fact_done");

const fib_stack_at_immediate_answer = list(2, "afterfib_n_1", 3, "fib_done");

const fib_stack_at_afterfib_n_2 = list(1, "afterfib_n_1", 3, "fib_done");
`,
};

const fibMachine = (controller: string): string => `${controller}
const fib_machine =
    make_machine(
        list("n", "val", "continue"),
        list(list("<", (a, b) => a < b),
             list("-", (a, b) => a - b),
             list("+", (a, b) => a + b)),
        controller_sequence(fib_recursive_controller));
`;

export const exercise_5_6: ExerciseSpec = {
  id: '5.6',
  context: checkHelpers,
  starter: fibMachine(fibController),
  tests: [
    {
      name: 'Fib(0) to Fib(10)',
      kind: 'value',
      expr: `equal(map(n => check_run(fib_machine, list(pair("n", n)), "val"), enum_list(0, 10)), list(0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55))`,
      expected: true,
    },
    {
      name: 'fewer than the 352 pushes of the book’s machine for Fib(10)',
      kind: 'value',
      expr: `head(check_statistics(fib_machine, ${inputs({ n: 10 })})) < 352 && get_register_contents(fib_machine, "val") === 55`,
      expected: true,
    },
  ],
  budget: 1_000_000,
  solution: fibMachine(`const fib_recursive_controller =
    controller(
      list(
          assign("continue", label("fib_done")),
        "fib_loop",
          test(list(op("<"), reg("n"), constant(2))),
          branch(label("immediate_answer")),
          save("continue"),
          assign("continue", label("afterfib_n_1")),
          save("n"),
          assign("n", list(op("-"), reg("n"), constant(1))),
          go_to(label("fib_loop")),
        "afterfib_n_1",
          restore("n"),
          // the caller's continue stays on the stack until afterfib_n_2
          assign("n", list(op("-"), reg("n"), constant(2))),
          assign("continue", label("afterfib_n_2")),
          save("val"),
          go_to(label("fib_loop")),
        "afterfib_n_2",
          assign("n", reg("val")),
          restore("val"),
          restore("continue"),
          assign("val", list(op("+"), reg("val"), reg("n"))),
          go_to(reg("continue")),
        "immediate_answer",
          assign("val", reg("n")),
          go_to(reg("continue")),
        "fib_done"));
`),
};
