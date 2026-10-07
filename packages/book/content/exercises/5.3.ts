import type { ExerciseSpec } from './spec.ts';

/** Exercises of §5.3. */

export const exercise_5_19: ExerciseSpec = {
  id: '5.19',
  starter: `// const x = pair(1, 2);
// const y = list(x, x);
// with free starting at p1.

// Indices 1, 2 and 3 of each vector, as pointers such as "n1", "p2" or "e0".
const the_heads = list("", "", "");
const the_tails = list("", "", "");

// The final value of free, as a pair pointer such as "p7".
const free = "";

// The pointers that represent the values of x and y.
const x_pointer = "";
const y_pointer = "";
`,
  tests: [
    { name: 'the_heads at 1, 2 and 3', kind: 'value', expr: 'equal(the_heads, list("n1", "p1", "p1"))', expected: true },
    { name: 'the_tails at 1, 2 and 3', kind: 'value', expr: 'equal(the_tails, list("n2", "e0", "p2"))', expected: true },
    { name: 'the final value of free', kind: 'value', expr: 'free', expected: 'p4' },
    { name: 'the pointer of x', kind: 'value', expr: 'x_pointer', expected: 'p1' },
    { name: 'the pointer of y', kind: 'value', expr: 'y_pointer', expected: 'p3' },
  ],
  solution: `// x is the pair at index 1. list(x, x) is pair(x, pair(x, null)):
// the inner pair is made first, at index 2, and the outer one at 3.
const the_heads = list("n1", "p1", "p1");
const the_tails = list("n2", "e0", "p2");

const free = "p4";

const x_pointer = "p1";
const y_pointer = "p3";
`,
};

/** Runs a machine of exercise 5.20 on a tree, with statistics from a fresh stack. */
const countLeavesChecks = `function check_count_leaves(machine, tree) {
    set_register_contents(machine, "tree", tree);
    machine("stack")("initialize");
    start(machine);
    return get_register_contents(machine, "val");
}

function check_pushes(machine, tree) {
    check_count_leaves(machine, tree);
    return head(machine("stack")("statistics"));
}

function check_only_operations(machine, allowed) {
    const builtin = list("initialize_stack", "print_stack_statistics");
    return accumulate((op, ok) => ok &&
                                  (! is_null(member(head(op), allowed)) ||
                                   ! is_null(member(head(op), builtin))),
                      true,
                      machine("operations"));
}`;

const countLeavesOperations = `list(list("is_null", is_null),
             list("is_pair", is_pair),
             list("head", head),
             list("tail", tail),
             list("+", (a, b) => a + b))`;

const allowedForCounting = 'list("is_null", "is_pair", "head", "tail", "+")';

const trees: [string, number][] = [
  ['null', 0],
  ['7', 1],
  ['list(1, 2, 3)', 3],
  ['list(list(1, 2), 3, 4)', 4],
  ['list(list(list(1, 2), 3, 4), list(list(1, 2), 3, 4))', 8],
  ['list(1, list(2, list(3, 4)), pair(5, 6))', 6],
];

export const exercise_5_20: ExerciseSpec = {
  id: '5.20',
  prelude: countLeavesChecks,
  starter: `// Both machines find the tree in register tree and leave the count in val.
// Add any registers you need.

const count_leaves_machine =
    make_machine(
        list("tree", "val", "continue"),
        ${countLeavesOperations},
        list(
          // the recursive count_leaves
          "count_leaves_done"));

const count_leaves_iter_machine =
    make_machine(
        list("tree", "n", "val", "continue"),
        ${countLeavesOperations},
        list(
          // count_leaves with an explicit counter n
          "count_iter_done"));
`,
  tests: [
    ...trees.map(([tree, count]): ExerciseSpec['tests'][number] => ({
      name: `recursive: ${tree}`,
      kind: 'value',
      expr: `check_count_leaves(count_leaves_machine, ${tree})`,
      expected: count,
    })),
    ...trees.map(([tree, count]): ExerciseSpec['tests'][number] => ({
      name: `with a counter: ${tree}`,
      kind: 'value',
      expr: `check_count_leaves(count_leaves_iter_machine, ${tree})`,
      expected: count,
    })),
    {
      name: 'the recursive machine uses the stack',
      kind: 'value',
      expr: 'check_pushes(count_leaves_machine, list(list(1, 2), 3, 4)) > 0',
      expected: true,
    },
    {
      name: 'the machines use only the list operations and +',
      kind: 'value',
      expr: `check_only_operations(count_leaves_machine, ${allowedForCounting}) && check_only_operations(count_leaves_iter_machine, ${allowedForCounting})`,
      expected: true,
    },
  ],
  solution: `const count_leaves_machine =
    make_machine(
        list("tree", "val", "continue", "temp"),
        ${countLeavesOperations},
        list(
            assign("continue", label("count_leaves_done")),
          "count_loop",
            test(list(op("is_null"), reg("tree"))),
            branch(label("empty_tree")),
            test(list(op("is_pair"), reg("tree"))),
            branch(label("count_pair")),
            assign("val", constant(1)),         // a leaf
            go_to(reg("continue")),
          "empty_tree",
            assign("val", constant(0)),
            go_to(reg("continue")),
          "count_pair",
            // count the head, keeping the tree and where to go afterwards
            save("continue"),
            save("tree"),
            assign("tree", list(op("head"), reg("tree"))),
            assign("continue", label("after_head")),
            go_to(label("count_loop")),
          "after_head",
            // count the tail, keeping the count of the head
            restore("tree"),
            assign("tree", list(op("tail"), reg("tree"))),
            save("val"),
            assign("continue", label("after_tail")),
            go_to(label("count_loop")),
          "after_tail",
            assign("temp", reg("val")),
            restore("val"),
            assign("val", list(op("+"), reg("val"), reg("temp"))),
            restore("continue"),
            go_to(reg("continue")),
          "count_leaves_done"));

const count_leaves_iter_machine =
    make_machine(
        list("tree", "n", "val", "continue"),
        ${countLeavesOperations},
        list(
            assign("n", constant(0)),
            assign("continue", label("count_iter_done")),
          "iter_loop",
            test(list(op("is_null"), reg("tree"))),
            branch(label("empty_tree")),
            test(list(op("is_pair"), reg("tree"))),
            branch(label("iter_pair")),
            assign("n", list(op("+"), reg("n"), constant(1))),
            go_to(reg("continue")),
          "empty_tree",
            go_to(reg("continue")),
          "iter_pair",
            // n becomes count_iter(head(tree), n)
            save("continue"),
            save("tree"),
            assign("tree", list(op("head"), reg("tree"))),
            assign("continue", label("after_head")),
            go_to(label("iter_loop")),
          "after_head",
            // then count_iter(tail(tree), n) is a tail call: nothing to save
            restore("tree"),
            restore("continue"),
            assign("tree", list(op("tail"), reg("tree"))),
            go_to(label("iter_loop")),
          "count_iter_done",
            assign("val", reg("n"))));
`,
};

/** Runs a machine of exercise 5.21 on x and y, and the checks of identity the exercise needs. */
const appendChecks = `function check_run(machine, x, y) {
    set_register_contents(machine, "x", x);
    set_register_contents(machine, "y", y);
    machine("stack")("initialize");
    start(machine);
    return get_register_contents(machine, "val");
}

function check_pushes(machine, x, y) {
    check_run(machine, x, y);
    return head(machine("stack")("statistics"));
}

function check_append_copies(machine) {
    const x = list(1, 2);
    const y = list(3, 4);
    const result = check_run(machine, x, y);
    return equal(result, list(1, 2, 3, 4)) &&
           equal(x, list(1, 2)) &&
           result !== x &&
           tail(result) !== tail(x) &&
           tail(tail(result)) === y;
}

function check_append_splices(machine) {
    const x = list(1, 2);
    const y = list(3, 4);
    const result = check_run(machine, x, y);
    return result === x &&
           equal(x, list(1, 2, 3, 4)) &&
           tail(tail(x)) === y;
}

function check_only_operations(machine, allowed) {
    const builtin = list("initialize_stack", "print_stack_statistics");
    return accumulate((op, ok) => ok &&
                                  (! is_null(member(head(op), allowed)) ||
                                   ! is_null(member(head(op), builtin))),
                      true,
                      machine("operations"));
}`;

const listOperations = 'list("is_null", "is_pair", "pair", "head", "tail", "set_head", "set_tail")';

export const exercise_5_21: ExerciseSpec = {
  id: '5.21',
  prelude: appendChecks,
  starter: `// Both machines find their lists in registers x and y and leave the
// result in val. Add any registers you need.

// function append(x, y) {
//     return is_null(x)
//            ? y
//            : pair(head(x), append(tail(x), y));
// }
const append_machine =
    make_machine(
        list("x", "y", "val", "continue"),
        list(list("is_null", is_null),
             list("pair", pair),
             list("head", head),
             list("tail", tail)),
        list(
          // your controller
          "append_done"));

// function append_mutator(x, y) {
//     set_tail(last_pair(x), y);
//     return x;
// }
// function last_pair(x) {
//     return is_null(tail(x)) ? x : last_pair(tail(x));
// }
const append_mutator_machine =
    make_machine(
        list("x", "y", "val"),
        list(list("is_null", is_null),
             list("tail", tail),
             list("set_tail", set_tail)),
        list(
          // your controller
          "append_mutator_done"));
`,
  tests: [
    {
      name: 'append(list(1, 2), list(3, 4))',
      kind: 'value',
      expr: 'equal(check_run(append_machine, list(1, 2), list(3, 4)), list(1, 2, 3, 4))',
      expected: true,
    },
    {
      name: 'append(null, list(3))',
      kind: 'value',
      expr: 'equal(check_run(append_machine, null, list(3)), list(3))',
      expected: true,
    },
    {
      name: 'append of a longer list',
      kind: 'value',
      expr: 'equal(check_run(append_machine, list(1, 2, 3, 4, 5), list(6)), list(1, 2, 3, 4, 5, 6))',
      expected: true,
    },
    {
      name: 'append makes new pairs, leaves x alone and ends in y',
      kind: 'value',
      expr: 'check_append_copies(append_machine)',
      expected: true,
    },
    {
      name: 'append_mutator(list(1), list(2, 3))',
      kind: 'value',
      expr: 'equal(check_run(append_mutator_machine, list(1), list(2, 3)), list(1, 2, 3))',
      expected: true,
    },
    {
      name: 'append_mutator of a longer list',
      kind: 'value',
      expr: 'equal(check_run(append_mutator_machine, list(1, 2, 3, 4), list(5, 6)), list(1, 2, 3, 4, 5, 6))',
      expected: true,
    },
    {
      name: 'append_mutator returns x itself, with y spliced on',
      kind: 'value',
      expr: 'check_append_splices(append_mutator_machine)',
      expected: true,
    },
    {
      name: 'append_mutator needs no stack',
      kind: 'value',
      expr: 'check_pushes(append_mutator_machine, list(1, 2, 3), list(4))',
      expected: 0,
    },
    {
      name: 'the machines use only list-structure operations',
      kind: 'value',
      expr: `check_only_operations(append_machine, ${listOperations}) && check_only_operations(append_mutator_machine, ${listOperations})`,
      expected: true,
    },
  ],
  solution: `const append_machine =
    make_machine(
        list("x", "y", "val", "continue", "temp"),
        list(list("is_null", is_null),
             list("pair", pair),
             list("head", head),
             list("tail", tail)),
        list(
            assign("continue", label("append_done")),
          "append_loop",
            test(list(op("is_null"), reg("x"))),
            branch(label("base_case")),
            // append the tail first, keeping x for its head
            save("continue"),
            save("x"),
            assign("x", list(op("tail"), reg("x"))),
            assign("continue", label("after_append")),
            go_to(label("append_loop")),
          "after_append",
            restore("x"),
            restore("continue"),
            assign("temp", list(op("head"), reg("x"))),
            assign("val", list(op("pair"), reg("temp"), reg("val"))),
            go_to(reg("continue")),
          "base_case",
            assign("val", reg("y")),
            go_to(reg("continue")),
          "append_done"));

const append_mutator_machine =
    make_machine(
        list("x", "y", "val", "last", "rest"),
        list(list("is_null", is_null),
             list("tail", tail),
             list("set_tail", set_tail)),
        list(
            assign("last", reg("x")),
          "last_pair_loop",
            assign("rest", list(op("tail"), reg("last"))),
            test(list(op("is_null"), reg("rest"))),
            branch(label("splice")),
            assign("last", reg("rest")),
            go_to(label("last_pair_loop")),
          "splice",
            perform(list(op("set_tail"), reg("last"), reg("y"))),
            assign("val", reg("x")),
          "append_mutator_done"));
`,
};
