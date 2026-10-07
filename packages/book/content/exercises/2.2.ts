import { flatmapDefinitions, louisQueensDefinition, queensBoardDefinitions, queensDefinition } from '@sicp/lab';
import { type ExerciseSpec } from './spec.ts';

/** Exercises of §2.2.1 – §2.2.3. */

const square = `function square(x) {
  return x * x;
}
`;

const plusTimes = `function plus(x, y) {
  return x + y;
}

function times(x, y) {
  return x * y;
}
`;

// §2.2.1

export const exercise_2_17: ExerciseSpec = {
  id: '2.17',
  starter: `// The list that holds only the last element of a nonempty list.
function last_pair(items) {
  // your answer
}

last_pair(list(23, 72, 149, 34));
`,
  tests: [
    { name: 'last_pair(list(23, 72, 149, 34))', kind: 'value', expr: 'equal(last_pair(list(23, 72, 149, 34)), list(34))', expected: true },
    { name: 'a list of one', kind: 'value', expr: 'equal(last_pair(list("only")), list("only"))', expected: true },
    { name: 'the last pair itself, not a copy', kind: 'value', expr: '(xs => last_pair(xs) === tail(tail(xs)))(list(1, 2, 3))', expected: true },
  ],
  solution: `function last_pair(items) {
  return is_null(tail(items))
    ? items
    : last_pair(tail(items));
}

last_pair(list(23, 72, 149, 34));
`,
};

export const exercise_2_18: ExerciseSpec = {
  id: '2.18',
  starter: `// Your reverse takes the place of the library's.
function reverse(items) {
  // your answer
}

reverse(list(1, 4, 9, 16, 25));
`,
  tests: [
    { name: 'reverse(list(1, 4, 9, 16, 25))', kind: 'value', expr: 'equal(reverse(list(1, 4, 9, 16, 25)), list(25, 16, 9, 4, 1))', expected: true },
    { name: 'the empty list', kind: 'value', expr: 'reverse(null)', expected: null },
    { name: 'only the top level is reversed', kind: 'value', expr: 'equal(reverse(list(list(1, 2), 3)), list(3, list(1, 2)))', expected: true },
  ],
  solution: `function reverse(items) {
  function iter(rest, reversed) {
    return is_null(rest)
      ? reversed
      : iter(tail(rest), pair(head(rest), reversed));
  }
  return iter(items, null);
}

reverse(list(1, 4, 9, 16, 25));
`,
};

const ccWithLists = `function cc(amount, coin_values) {
  return amount === 0
    ? 1
    : amount < 0 || no_more(coin_values)
    ? 0
    : cc(amount, except_first_denomination(coin_values)) +
      cc(amount - first_denomination(coin_values), coin_values);
}

const us_coins = list(50, 25, 10, 5, 1);
const uk_coins = list(100, 50, 20, 10, 5, 2, 1);
`;

export const exercise_2_19: ExerciseSpec = {
  id: '2.19',
  starter: `${ccWithLists}
function first_denomination(coin_values) {
  // your answer
}

function except_first_denomination(coin_values) {
  // your answer
}

function no_more(coin_values) {
  // your answer
}

// Does the order of coin_values affect the answer? true or false.
const order_matters = undefined;

cc(100, us_coins);
`,
  tests: [
    { name: 'a dollar in US coins', kind: 'value', expr: 'cc(100, us_coins)', expected: 292 },
    { name: 'fifty pence in UK coins', kind: 'value', expr: 'cc(50, uk_coins)', expected: 451 },
    { name: 'the coins in another order', kind: 'value', expr: 'cc(100, reverse(us_coins))', expected: 292 },
    { name: 'does the order matter?', kind: 'value', expr: 'order_matters', expected: false },
  ],
  budget: 3_000_000,
  solution: `${ccWithLists}
function first_denomination(coin_values) {
  return head(coin_values);
}

function except_first_denomination(coin_values) {
  return tail(coin_values);
}

function no_more(coin_values) {
  return is_null(coin_values);
}

const order_matters = false;

cc(100, us_coins);
`,
};

const plusCurried = `function plus_curried(x) {
  return y => x + y;
}
`;

export const exercise_2_20: ExerciseSpec = {
  id: '2.20',
  starter: `${plusCurried}
// Apply the curried function f to the arguments in args, one by one.
function brooks(f, args) {
  // your answer
}

// brooks, curried: brooks_curried(list(f, a, b, ...)).
function brooks_curried(xs) {
  // your answer
}

// Predict these before you evaluate them.
// result_1: brooks_curried(list(brooks_curried, list(plus_curried, 3, 4)))
// result_2: brooks_curried(list(brooks_curried, list(brooks_curried, list(plus_curried, 3, 4))))
const result_1 = undefined;
const result_2 = undefined;
`,
  tests: [
    { name: 'brooks(plus_curried, list(3, 4))', kind: 'value', expr: 'brooks(plus_curried, list(3, 4))', expected: 7 },
    { name: 'three arguments, in order', kind: 'value', expr: 'brooks(x => y => z => x * y - z, list(5, 4, 3))', expected: 17 },
    { name: 'no arguments leave f as it is', kind: 'value', expr: 'brooks(plus_curried, null) === plus_curried', expected: true },
    { name: 'brooks_curried(list(plus_curried, 3, 4))', kind: 'value', expr: 'brooks_curried(list(plus_curried, 3, 4))', expected: 7 },
    { name: 'brooks_curried applied to itself', kind: 'value', expr: 'brooks_curried(list(brooks_curried, list(brooks_curried, list(plus_curried, 3, 4))))', expected: 7 },
    { name: 'the two predictions', kind: 'value', expr: 'result_1 === 7 && result_2 === 7', expected: true },
  ],
  solution: `${plusCurried}
function brooks(f, args) {
  return is_null(args)
    ? f
    : brooks(f(head(args)), tail(args));
}

function brooks_curried(xs) {
  return brooks(head(xs), tail(xs));
}

const result_1 = 7;
const result_2 = 7;
`,
};

export const exercise_2_21: ExerciseSpec = {
  id: '2.21',
  prelude: square,
  starter: `// square is provided. Replace each undefined.

function square_list(items) {
  return is_null(items)
    ? null
    : pair(undefined, undefined);
}

function square_list_map(items) {
  return map(undefined, undefined);
}

square_list(list(1, 2, 3, 4));
`,
  tests: [
    { name: 'square_list', kind: 'value', expr: 'equal(square_list(list(1, 2, 3, 4)), list(1, 4, 9, 16))', expected: true },
    { name: 'square_list_map', kind: 'value', expr: 'equal(square_list_map(list(1, 2, 3, 4)), list(1, 4, 9, 16))', expected: true },
    { name: 'square_list_map uses map', kind: 'calls', call: 'square_list_map(list(1, 2, 3))', fn: 'map', atMost: 4 },
    { name: 'square_list recurses once per element', kind: 'calls', call: 'square_list(list(1, 2, 3))', fn: 'square_list', atMost: 4 },
  ],
  solution: `function square_list(items) {
  return is_null(items)
    ? null
    : pair(square(head(items)), square_list(tail(items)));
}

function square_list_map(items) {
  return map(square, items);
}

square_list(list(1, 2, 3, 4));
`,
};

export const exercise_2_22: ExerciseSpec = {
  id: '2.22',
  prelude: square,
  starter: `// square is provided.

// Louis's first attempt.
function square_list_louis(items) {
  function iter(things, answer) {
    return is_null(things)
      ? answer
      : iter(tail(things),
             pair(square(head(things)),
                  answer));
  }
  return iter(items, null);
}

// What square_list_louis(list(1, 2, 3)) returns, written out with list(...).
const louis_result = undefined;

// An iterative square_list that gets the order right.
function square_list(items) {
  // your answer
}
`,
  tests: [
    { name: 'Louis’s result', kind: 'value', expr: 'equal(louis_result, list(9, 4, 1))', expected: true },
    { name: 'square_list in order', kind: 'value', expr: 'equal(square_list(list(1, 2, 3, 4)), list(1, 4, 9, 16))', expected: true },
    { name: 'the empty list', kind: 'value', expr: 'square_list(null)', expected: null },
    { name: 'an iterative process', kind: 'shape', expr: '"iterative"', call: 'square_list(list(1, 2, 3, 4, 5, 6, 7, 8))' },
  ],
  solution: `function square_list_louis(items) {
  function iter(things, answer) {
    return is_null(things)
      ? answer
      : iter(tail(things),
             pair(square(head(things)),
                  answer));
  }
  return iter(items, null);
}

const louis_result = list(9, 4, 1);

// Louis's iteration on the reversed list puts the squares back in order.
function square_list(items) {
  return square_list_louis(reverse(items));
}
`,
};

export const exercise_2_23: ExerciseSpec = {
  id: '2.23',
  starter: `// Your for_each takes the place of the library's.
function for_each(f, items) {
  // your answer
}

for_each(x => display(x), list(57, 321, 88));
`,
  tests: [
    {
      name: 'applies f to each element, left to right',
      kind: 'value',
      expr: '(() => { let seen = ""; for_each(x => { seen = seen + stringify(x) + " "; }, list(57, 321, 88)); return seen; })()',
      expected: '57 321 88 ',
    },
    { name: 'returns true', kind: 'value', expr: 'for_each(x => x, list(1, 2))', expected: true },
    { name: 'the empty list', kind: 'value', expr: 'for_each(x => error("never"), null)', expected: true },
  ],
  solution: `function for_each(f, items) {
  if (is_null(items)) {
    return true;
  } else {
    f(head(items));
    return for_each(f, tail(items));
  }
}

for_each(x => display(x), list(57, 321, 88));
`,
};

// §2.2.2

export const exercise_2_24: ExerciseSpec = {
  id: '2.24',
  starter: `// Work these out by hand, then check by evaluating the expression.
// list(1, list(2, list(3, 4)))

// What the interpreter prints, in box notation.
const printed = "";

// How many pairs the structure is made of.
const pairs_used = 0;
`,
  tests: [
    { name: 'the printed result', kind: 'value', expr: 'printed', expected: '[1, [[2, [[3, [4, null]], null]], null]]' },
    { name: 'the number of pairs', kind: 'value', expr: 'pairs_used', expected: 6 },
  ],
  solution: `const printed = "[1, [[2, [[3, [4, null]], null]], null]]";

const pairs_used = 6;
`,
};

export const exercise_2_25: ExerciseSpec = {
  id: '2.25',
  starter: `// Using only head and tail, pick out the element where 7 stands.

// list(1, 3, list(5, 7), 9)
function pick_a(xs) {
  // your answer
}

// list(list(7))
function pick_b(xs) {
  // your answer
}

// list(1, list(2, list(3, list(4, list(5, list(6, 7))))))
function pick_c(xs) {
  // your answer
}
`,
  tests: [
    { name: 'the first list', kind: 'value', expr: 'pick_a(list(1, 3, list(5, 7), 9))', expected: 7 },
    { name: 'the first shape, another value', kind: 'value', expr: 'pick_a(list(1, 3, list(5, 8), 9))', expected: 8 },
    { name: 'the second list', kind: 'value', expr: 'pick_b(list(list(7))) * 10 + pick_b(list(list(8)))', expected: 78 },
    { name: 'the third list', kind: 'value', expr: 'pick_c(list(1, list(2, list(3, list(4, list(5, list(6, 7)))))))', expected: 7 },
    { name: 'the third shape, another value', kind: 'value', expr: 'pick_c(list(1, list(2, list(3, list(4, list(5, list(6, 9)))))))', expected: 9 },
  ],
  solution: `function pick_a(xs) {
  return head(tail(head(tail(tail(xs)))));
}

function pick_b(xs) {
  return head(head(xs));
}

function pick_c(xs) {
  return head(tail(head(tail(head(tail(head(tail(head(tail(head(tail(xs))))))))))));
}
`,
};

export const exercise_2_26: ExerciseSpec = {
  id: '2.26',
  starter: `const x = list(1, 2, 3);
const y = list(4, 5, 6);

// Write each result out with list(...), without using x or y.
const append_result = undefined;  // append(x, y)
const pair_result = undefined;    // pair(x, y)
const list_result = undefined;    // list(x, y)

// The lengths of pair(x, y) and list(x, y).
const pair_length = 0;
const list_length = 0;
`,
  tests: [
    { name: 'append(x, y)', kind: 'value', expr: 'equal(append_result, list(1, 2, 3, 4, 5, 6))', expected: true },
    { name: 'pair(x, y)', kind: 'value', expr: 'equal(pair_result, list(list(1, 2, 3), 4, 5, 6))', expected: true },
    { name: 'list(x, y)', kind: 'value', expr: 'equal(list_result, list(list(1, 2, 3), list(4, 5, 6)))', expected: true },
    { name: 'the lengths', kind: 'value', expr: 'pair_length * 10 + list_length', expected: 42 },
  ],
  solution: `const x = list(1, 2, 3);
const y = list(4, 5, 6);

const append_result = list(1, 2, 3, 4, 5, 6);
const pair_result = list(list(1, 2, 3), 4, 5, 6);
const list_result = list(list(1, 2, 3), list(4, 5, 6));

const pair_length = 4;
const list_length = 2;
`,
};

export const exercise_2_27: ExerciseSpec = {
  id: '2.27',
  starter: `const x = list(list(1, 2), list(3, 4));

// Reverse the list, and every sublist within it.
function deep_reverse(items) {
  // your answer
}

deep_reverse(x);
`,
  tests: [
    { name: 'deep_reverse(x)', kind: 'value', expr: 'equal(deep_reverse(x), list(list(4, 3), list(2, 1)))', expected: true },
    { name: 'x is unchanged', kind: 'value', expr: 'equal(x, list(list(1, 2), list(3, 4)))', expected: true },
    { name: 'deeper nesting', kind: 'value', expr: 'equal(deep_reverse(list(1, list(2, list(3, 4)), 5)), list(5, list(list(4, 3), 2), 1))', expected: true },
    { name: 'the empty list', kind: 'value', expr: 'deep_reverse(null)', expected: null },
  ],
  solution: `const x = list(list(1, 2), list(3, 4));

function deep_reverse(items) {
  function iter(rest, reversed) {
    return is_null(rest)
      ? reversed
      : iter(tail(rest),
             pair(is_pair(head(rest)) ? deep_reverse(head(rest)) : head(rest),
                  reversed));
  }
  return iter(items, null);
}

deep_reverse(x);
`,
};

export const exercise_2_28: ExerciseSpec = {
  id: '2.28',
  starter: `const x = list(list(1, 2), list(3, 4));

// The leaves of a tree, left to right.
function fringe(tree) {
  // your answer
}

fringe(x);
`,
  tests: [
    { name: 'fringe(x)', kind: 'value', expr: 'equal(fringe(x), list(1, 2, 3, 4))', expected: true },
    { name: 'fringe(list(x, x))', kind: 'value', expr: 'equal(fringe(list(x, x)), list(1, 2, 3, 4, 1, 2, 3, 4))', expected: true },
    { name: 'deeper and uneven', kind: 'value', expr: 'equal(fringe(list(1, list(2, list(3, null, 4)), 5)), list(1, 2, 3, 4, 5))', expected: true },
  ],
  solution: `const x = list(list(1, 2), list(3, 4));

function fringe(tree) {
  return is_null(tree)
    ? null
    : ! is_pair(tree)
    ? list(tree)
    : append(fringe(head(tree)), fringe(tail(tree)));
}

fringe(x);
`,
};

const mobiles = `function make_mobile(left, right) {
  return list(left, right);
}

function make_branch(length, structure) {
  return list(length, structure);
}
`;

/** Two 1-weights on rods of 1: balanced, weight 2. */
const small = 'make_mobile(make_branch(1, 1), make_branch(1, 1))';

export const exercise_2_29: ExerciseSpec = {
  id: '2.29',
  starter: `${mobiles}
function left_branch(mobile) {
  // your answer
}

function right_branch(mobile) {
  // your answer
}

function branch_length(branch) {
  // your answer
}

function branch_structure(branch) {
  // your answer
}

function total_weight(mobile) {
  // your answer
}

function is_balanced(mobile) {
  // your answer
}

// If the constructors used pair instead of list, which of the functions
// above would have to change? A list of their names, as strings.
const changes = null;
`,
  tests: [
    {
      name: 'the selectors',
      kind: 'value',
      expr: 'branch_length(left_branch(make_mobile(make_branch(2, 3), make_branch(4, 5)))) * 1000 + branch_structure(left_branch(make_mobile(make_branch(2, 3), make_branch(4, 5)))) * 100 + branch_length(right_branch(make_mobile(make_branch(2, 3), make_branch(4, 5)))) * 10 + branch_structure(right_branch(make_mobile(make_branch(2, 3), make_branch(4, 5))))',
      expected: 2345,
    },
    { name: 'total weight', kind: 'value', expr: `total_weight(make_mobile(make_branch(2, 3), make_branch(3, ${small})))`, expected: 5 },
    { name: 'a balanced mobile', kind: 'value', expr: `is_balanced(make_mobile(make_branch(2, 3), make_branch(3, ${small})))`, expected: true },
    { name: 'unequal torques', kind: 'value', expr: 'is_balanced(make_mobile(make_branch(2, 3), make_branch(2, 4)))', expected: false },
    {
      name: 'balanced at the top, not below',
      kind: 'value',
      expr: 'is_balanced(make_mobile(make_branch(2, 4), make_branch(2, make_mobile(make_branch(1, 1), make_branch(2, 3)))))',
      expected: false,
    },
    {
      name: 'what changes with pair',
      kind: 'value',
      expr: 'length(changes) === 2 && !is_null(member("right_branch", changes)) && !is_null(member("branch_structure", changes))',
      expected: true,
    },
  ],
  solution: `${mobiles}
function left_branch(mobile) {
  return head(mobile);
}

function right_branch(mobile) {
  return head(tail(mobile));
}

function branch_length(branch) {
  return head(branch);
}

function branch_structure(branch) {
  return head(tail(branch));
}

function branch_weight(branch) {
  const structure = branch_structure(branch);
  return is_number(structure) ? structure : total_weight(structure);
}

function total_weight(mobile) {
  return branch_weight(left_branch(mobile)) + branch_weight(right_branch(mobile));
}

function is_balanced(mobile) {
  function torque(branch) {
    return branch_length(branch) * branch_weight(branch);
  }
  function branch_balanced(branch) {
    const structure = branch_structure(branch);
    return is_number(structure) || is_balanced(structure);
  }
  return torque(left_branch(mobile)) === torque(right_branch(mobile)) &&
         branch_balanced(left_branch(mobile)) &&
         branch_balanced(right_branch(mobile));
}

// With pair, the right part is the tail itself.
const changes = list("right_branch", "branch_structure");
`,
};

const sampleTree = 'list(1, list(2, list(3, 4), 5), list(6, 7))';
const squaredTree = 'list(1, list(4, list(9, 16), 25), list(36, 49))';

export const exercise_2_30: ExerciseSpec = {
  id: '2.30',
  prelude: square,
  starter: `// square is provided.

// Directly, without higher-order functions.
function square_tree(tree) {
  // your answer
}

// With map and recursion.
function square_tree_map(tree) {
  // your answer
}

square_tree(${sampleTree});
`,
  tests: [
    { name: 'square_tree', kind: 'value', expr: `equal(square_tree(${sampleTree}), ${squaredTree})`, expected: true },
    { name: 'square_tree_map', kind: 'value', expr: `equal(square_tree_map(${sampleTree}), ${squaredTree})`, expected: true },
    { name: 'the empty tree', kind: 'value', expr: 'is_null(square_tree(null)) && is_null(square_tree_map(null))', expected: true },
    { name: 'square_tree_map uses map', kind: 'calls', call: 'square_tree_map(list(1, list(2, 3)))', fn: 'map', atMost: 6 },
  ],
  solution: `function square_tree(tree) {
  return is_null(tree)
    ? null
    : ! is_pair(tree)
    ? square(tree)
    : pair(square_tree(head(tree)), square_tree(tail(tree)));
}

function square_tree_map(tree) {
  return map(sub_tree => is_pair(sub_tree)
                         ? square_tree_map(sub_tree)
                         : square(sub_tree),
             tree);
}

square_tree(${sampleTree});
`,
};

export const exercise_2_31: ExerciseSpec = {
  id: '2.31',
  prelude: square,
  starter: `// square is provided.

// Apply f to every leaf of the tree, keeping its shape.
function tree_map(f, tree) {
  // your answer
}

function square_tree(tree) {
  return tree_map(square, tree);
}

square_tree(${sampleTree});
`,
  tests: [
    { name: 'square_tree', kind: 'value', expr: `equal(square_tree(${sampleTree}), ${squaredTree})`, expected: true },
    { name: 'any function', kind: 'value', expr: `equal(tree_map(x => x * 10, ${sampleTree}), list(10, list(20, list(30, 40), 50), list(60, 70)))`, expected: true },
    { name: 'strings as leaves', kind: 'value', expr: 'equal(tree_map(s => s + "!", list("a", list("b"))), list("a!", list("b!")))', expected: true },
  ],
  solution: `function tree_map(f, tree) {
  return map(sub_tree => is_pair(sub_tree)
                         ? tree_map(f, sub_tree)
                         : f(sub_tree),
             tree);
}

function square_tree(tree) {
  return tree_map(square, tree);
}

square_tree(${sampleTree});
`,
};

export const exercise_2_32: ExerciseSpec = {
  id: '2.32',
  starter: `function subsets(s) {
  if (is_null(s)) {
    return list(null);
  } else {
    const rest = subsets(tail(s));
    // your answer: replace undefined with the function to map over rest
    return append(rest, map(undefined, rest));
  }
}

subsets(list(1, 2, 3));
`,
  tests: [
    {
      name: 'the subsets of list(1, 2, 3)',
      kind: 'value',
      expr: 'equal(subsets(list(1, 2, 3)), list(null, list(3), list(2), list(2, 3), list(1), list(1, 3), list(1, 2), list(1, 2, 3)))',
      expected: true,
    },
    { name: 'the empty set', kind: 'value', expr: 'equal(subsets(null), list(null))', expected: true },
    { name: '2⁶ subsets of six elements', kind: 'value', expr: 'length(subsets(list(1, 2, 3, 4, 5, 6)))', expected: 64 },
  ],
  solution: `function subsets(s) {
  if (is_null(s)) {
    return list(null);
  } else {
    const rest = subsets(tail(s));
    return append(rest, map(subset => pair(head(s), subset), rest));
  }
}

subsets(list(1, 2, 3));
`,
};

// §2.2.3

export const exercise_2_33: ExerciseSpec = {
  id: '2.33',
  starter: `// These take the place of the library's map, append and length.
// accumulate is the library's, with the book's argument order.
// Replace each undefined.

function map(f, sequence) {
  return accumulate((x, y) => undefined, null, sequence);
}

function append(seq1, seq2) {
  return accumulate(pair, undefined, undefined);
}

function length(sequence) {
  return accumulate(undefined, 0, sequence);
}
`,
  tests: [
    { name: 'map', kind: 'value', expr: 'equal(map(x => x * x, list(1, 2, 3)), list(1, 4, 9))', expected: true },
    { name: 'append', kind: 'value', expr: 'equal(append(list(1, 2), list(3, 4, 5)), list(1, 2, 3, 4, 5))', expected: true },
    { name: 'length', kind: 'value', expr: 'length(list(5, 6, 7, 8, 9))', expected: 5 },
    { name: 'length is an accumulation', kind: 'calls', call: 'length(list(1, 2, 3))', fn: 'accumulate', atMost: 4 },
    { name: 'append is an accumulation', kind: 'calls', call: 'append(list(1, 2), list(3))', fn: 'accumulate', atMost: 3 },
  ],
  solution: `function map(f, sequence) {
  return accumulate((x, y) => pair(f(x), y), null, sequence);
}

function append(seq1, seq2) {
  return accumulate(pair, seq2, seq1);
}

function length(sequence) {
  return accumulate((x, y) => y + 1, 0, sequence);
}
`,
};

export const exercise_2_34: ExerciseSpec = {
  id: '2.34',
  starter: `// Coefficients from a_0 up to a_n. Replace undefined.
function horner_eval(x, coefficient_sequence) {
  return accumulate((this_coeff, higher_terms) => undefined,
                    0,
                    coefficient_sequence);
}

// 1 + 3x + 5x³ + x⁵ at x = 2
horner_eval(2, list(1, 3, 0, 5, 0, 1));
`,
  tests: [
    { name: '1 + 3x + 5x³ + x⁵ at 2', kind: 'value', expr: 'horner_eval(2, list(1, 3, 0, 5, 0, 1))', expected: 79 },
    { name: '1 + x + x² at 3', kind: 'value', expr: 'horner_eval(3, list(1, 1, 1))', expected: 13 },
    { name: 'a constant', kind: 'value', expr: 'horner_eval(10, list(4))', expected: 4 },
  ],
  solution: `function horner_eval(x, coefficient_sequence) {
  return accumulate((this_coeff, higher_terms) => this_coeff + x * higher_terms,
                    0,
                    coefficient_sequence);
}

horner_eval(2, list(1, 3, 0, 5, 0, 1));
`,
};

export const exercise_2_35: ExerciseSpec = {
  id: '2.35',
  prelude: plusTimes,
  starter: `// plus and times are provided. Replace each undefined.
function count_leaves(t) {
  return accumulate(undefined, undefined, map(undefined, undefined));
}

const x = pair(list(1, 2), list(3, 4));
count_leaves(x);
`,
  tests: [
    { name: 'count_leaves(x)', kind: 'value', expr: 'count_leaves(x)', expected: 4 },
    { name: 'count_leaves(list(x, x))', kind: 'value', expr: 'count_leaves(list(x, x))', expected: 8 },
    { name: 'deeper', kind: 'value', expr: 'count_leaves(list(1, list(2, list(3, 4)), 5))', expected: 5 },
    { name: 'an accumulation', kind: 'calls', call: 'count_leaves(list(1, 2, 3))', fn: 'accumulate', atMost: 8 },
  ],
  solution: `function count_leaves(t) {
  return accumulate(plus, 0, map(sub => is_pair(sub) ? count_leaves(sub) : 1, t));
}

const x = pair(list(1, 2), list(3, 4));
count_leaves(x);
`,
};

const accumulateN = `function accumulate_n(op, init, seqs) {
  return is_null(head(seqs))
    ? null
    : pair(accumulate(op, init, map(head, seqs)),
           accumulate_n(op, init, map(tail, seqs)));
}
`;

export const exercise_2_36: ExerciseSpec = {
  id: '2.36',
  prelude: plusTimes,
  starter: `// plus and times are provided. Replace each undefined.
function accumulate_n(op, init, seqs) {
  return is_null(head(seqs))
    ? null
    : pair(accumulate(op, init, undefined),
           accumulate_n(op, init, undefined));
}

const s = list(list(1, 2, 3), list(4, 5, 6), list(7, 8, 9), list(10, 11, 12));
accumulate_n(plus, 0, s);
`,
  tests: [
    { name: 'accumulate_n(plus, 0, s)', kind: 'value', expr: 'equal(accumulate_n(plus, 0, s), list(22, 26, 30))', expected: true },
    { name: 'products of columns', kind: 'value', expr: 'equal(accumulate_n(times, 1, list(list(1, 2), list(3, 4))), list(3, 8))', expected: true },
    { name: 'columns as lists', kind: 'value', expr: 'equal(accumulate_n(pair, null, list(list(1, 2), list(3, 4))), list(list(1, 3), list(2, 4)))', expected: true },
  ],
  solution: `${accumulateN}
const s = list(list(1, 2, 3), list(4, 5, 6), list(7, 8, 9), list(10, 11, 12));
accumulate_n(plus, 0, s);
`,
};

const matrix = 'list(list(1, 2, 3, 4), list(4, 5, 6, 6), list(6, 7, 8, 9))';

export const exercise_2_37: ExerciseSpec = {
  id: '2.37',
  prelude: `${plusTimes}
${accumulateN}
function dot_product(v, w) {
  return accumulate(plus, 0, accumulate_n(times, 1, list(v, w)));
}`,
  starter: `// plus, times, accumulate_n and dot_product are provided. Replace each undefined.

function matrix_times_vector(m, v) {
  return map(undefined, m);
}

function transpose(mat) {
  return accumulate_n(undefined, undefined, mat);
}

function matrix_times_matrix(m, n) {
  const cols = transpose(n);
  return map(undefined, m);
}

const m = ${matrix};
matrix_times_vector(m, list(1, 2, 3, 4));
`,
  tests: [
    { name: 'matrix_times_vector', kind: 'value', expr: 'equal(matrix_times_vector(m, list(1, 2, 3, 4)), list(30, 56, 80))', expected: true },
    { name: 'transpose', kind: 'value', expr: 'equal(transpose(m), list(list(1, 4, 6), list(2, 5, 7), list(3, 6, 8), list(4, 6, 9)))', expected: true },
    {
      name: 'matrix_times_matrix',
      kind: 'value',
      expr: 'equal(matrix_times_matrix(m, transpose(m)), list(list(30, 56, 80), list(56, 113, 161), list(80, 161, 230)))',
      expected: true,
    },
    {
      name: 'the order of the factors matters',
      kind: 'value',
      expr: 'equal(matrix_times_matrix(list(list(1, 2), list(0, 1)), list(list(1, 0), list(3, 1))), list(list(7, 2), list(3, 1)))',
      expected: true,
    },
  ],
  solution: `function matrix_times_vector(m, v) {
  return map(row => dot_product(row, v), m);
}

function transpose(mat) {
  return accumulate_n(pair, null, mat);
}

function matrix_times_matrix(m, n) {
  const cols = transpose(n);
  return map(row => matrix_times_vector(cols, row), m);
}

const m = ${matrix};
matrix_times_vector(m, list(1, 2, 3, 4));
`,
};

const folds = `${plusTimes}
function minus(x, y) {
  return x - y;
}

function divide(x, y) {
  return x / y;
}

function fold_right(op, initial, sequence) {
  return accumulate(op, initial, sequence);
}

function fold_left(op, initial, sequence) {
  function iter(result, rest) {
    return is_null(rest)
      ? result
      : iter(op(result, head(rest)),
             tail(rest));
  }
  return iter(initial, sequence);
}
`;

export const exercise_2_38: ExerciseSpec = {
  id: '2.38',
  starter: `${folds}
// Work these out first:
// fold_right(divide, 1, list(1, 2, 3))
// fold_left(divide, 1, list(1, 2, 3))
// fold_right(list, null, list(1, 2, 3))
// fold_left(list, null, list(1, 2, 3))
const right_divide = 0;
const left_divide = 0;
const right_list = undefined;  // written out with list and null
const left_list = undefined;   // written out with list and null

// Which of "plus", "minus", "times", "divide" and "math_max" make
// fold_right and fold_left agree on every sequence?
const same_both_ways = null;
`,
  tests: [
    { name: 'fold_right(divide, …)', kind: 'value', expr: 'right_divide', expected: 1.5 },
    { name: 'fold_left(divide, …)', kind: 'value', expr: 'math_abs(left_divide - 1 / 6) < 1e-12', expected: true },
    { name: 'fold_right(list, …)', kind: 'value', expr: 'equal(right_list, list(1, list(2, list(3, null))))', expected: true },
    { name: 'fold_left(list, …)', kind: 'value', expr: 'equal(left_list, list(list(list(null, 1), 2), 3))', expected: true },
    {
      name: 'the operations that agree',
      kind: 'value',
      expr: 'length(same_both_ways) === 3 && !is_null(member("plus", same_both_ways)) && !is_null(member("times", same_both_ways)) && !is_null(member("math_max", same_both_ways))',
      expected: true,
    },
  ],
  solution: `${folds}
const right_divide = 1 / (2 / (3 / 1));
const left_divide = ((1 / 1) / 2) / 3;
const right_list = list(1, list(2, list(3, null)));
const left_list = list(list(list(null, 1), 2), 3);

// Associative and commutative.
const same_both_ways = list("plus", "times", "math_max");
`,
};

export const exercise_2_39: ExerciseSpec = {
  id: '2.39',
  prelude: folds,
  starter: `// fold_right and fold_left are provided. Replace each undefined.

function reverse_right(sequence) {
  return fold_right((x, y) => undefined, null, sequence);
}

function reverse_left(sequence) {
  return fold_left((x, y) => undefined, null, sequence);
}

reverse_left(list(1, 2, 3, 4));
`,
  tests: [
    { name: 'reverse_right', kind: 'value', expr: 'equal(reverse_right(list(1, 2, 3, 4)), list(4, 3, 2, 1))', expected: true },
    { name: 'reverse_left', kind: 'value', expr: 'equal(reverse_left(list(1, 2, 3, 4)), list(4, 3, 2, 1))', expected: true },
    { name: 'the empty list', kind: 'value', expr: 'is_null(reverse_right(null)) && is_null(reverse_left(null))', expected: true },
    { name: 'reverse_right folds right', kind: 'calls', call: 'reverse_right(list(1, 2))', fn: 'fold_right', atMost: 1 },
    { name: 'reverse_left folds left', kind: 'calls', call: 'reverse_left(list(1, 2))', fn: 'fold_left', atMost: 1 },
  ],
  solution: `function reverse_right(sequence) {
  return fold_right((x, y) => append(y, list(x)), null, sequence);
}

function reverse_left(sequence) {
  return fold_left((x, y) => pair(y, x), null, sequence);
}

reverse_left(list(1, 2, 3, 4));
`,
};

const primeSumParts = `function is_prime_sum(pair) {
  return is_prime(head(pair) + head(tail(pair)));
}

function make_pair_sum(pair) {
  return list(head(pair), head(tail(pair)),
              head(pair) + head(tail(pair)));
}
`;

export const exercise_2_40: ExerciseSpec = {
  id: '2.40',
  prelude: `${flatmapDefinitions}
${primeSumParts}`,
  starter: `// enumerate_interval, flatmap, is_prime, is_prime_sum and make_pair_sum
// are provided.

// The pairs list(i, j) with 1 <= j < i <= n.
function unique_pairs(n) {
  // your answer
}

function prime_sum_pairs(n) {
  // your answer, using unique_pairs
}

prime_sum_pairs(6);
`,
  tests: [
    { name: 'unique_pairs(3)', kind: 'value', expr: 'equal(unique_pairs(3), list(list(2, 1), list(3, 1), list(3, 2)))', expected: true },
    { name: '45 pairs below 10', kind: 'value', expr: 'length(unique_pairs(10))', expected: 45 },
    {
      name: 'prime_sum_pairs(6)',
      kind: 'value',
      expr: 'equal(prime_sum_pairs(6), list(list(2, 1, 3), list(3, 2, 5), list(4, 1, 5), list(4, 3, 7), list(5, 2, 7), list(6, 1, 7), list(6, 5, 11)))',
      expected: true,
    },
    { name: 'prime_sum_pairs uses unique_pairs', kind: 'calls', call: 'prime_sum_pairs(4)', fn: 'unique_pairs', atMost: 1 },
  ],
  solution: `function unique_pairs(n) {
  return flatmap(i => map(j => list(i, j),
                          enumerate_interval(1, i - 1)),
                 enumerate_interval(1, n));
}

function prime_sum_pairs(n) {
  return map(make_pair_sum,
             filter(is_prime_sum, unique_pairs(n)));
}

prime_sum_pairs(6);
`,
};

export const exercise_2_41: ExerciseSpec = {
  id: '2.41',
  prelude: flatmapDefinitions,
  starter: `// enumerate_interval and flatmap are provided.

// The triples list(i, j, k) with n >= i > j > k >= 1.
function unique_triples(n) {
  // your answer
}

// Those triples whose elements sum to s.
function triples_with_sum(n, s) {
  // your answer
}

triples_with_sum(6, 10);
`,
  tests: [
    { name: 'unique_triples(3)', kind: 'value', expr: 'equal(unique_triples(3), list(list(3, 2, 1)))', expected: true },
    { name: 'C(5, 3) triples', kind: 'value', expr: 'length(unique_triples(5))', expected: 10 },
    { name: 'three triples sum to 10 below 6', kind: 'value', expr: 'length(triples_with_sum(6, 10))', expected: 3 },
    {
      name: 'each one sums to s, in decreasing order',
      kind: 'value',
      expr: 'accumulate((t, ok) => ok && head(t) + head(tail(t)) + head(tail(tail(t))) === 15 && head(t) > head(tail(t)) && head(tail(t)) > head(tail(tail(t))), true, triples_with_sum(10, 15))',
      expected: true,
    },
    { name: 'and none is missed', kind: 'value', expr: 'length(triples_with_sum(10, 15))', expected: 10 },
  ],
  solution: `function unique_pairs(n) {
  return flatmap(i => map(j => list(i, j),
                          enumerate_interval(1, i - 1)),
                 enumerate_interval(1, n));
}

function unique_triples(n) {
  return flatmap(i => map(jk => pair(i, jk),
                          unique_pairs(i - 1)),
                 enumerate_interval(1, n));
}

function triples_with_sum(n, s) {
  return filter(t => head(t) + head(tail(t)) + head(tail(tail(t))) === s,
                unique_triples(n));
}

triples_with_sum(6, 10);
`,
};

export const exercise_2_42: ExerciseSpec = {
  id: '2.42',
  prelude: flatmapDefinitions,
  starter: `// enumerate_interval and flatmap are provided.

${queensDefinition}
// Your representation of a set of board positions.
const empty_board = undefined;

function adjoin_position(row, col, positions) {
  // your answer
}

// Is the queen in column k safe from the others?
function is_safe(k, positions) {
  // your answer
}

length(queens(6));
`,
  tests: [
    { name: 'one queen', kind: 'value', expr: 'length(queens(1))', expected: 1 },
    { name: 'no solution for 3', kind: 'value', expr: 'length(queens(3))', expected: 0 },
    { name: 'two solutions for 4', kind: 'value', expr: 'length(queens(4))', expected: 2 },
    { name: 'ten for 5', kind: 'value', expr: 'length(queens(5))', expected: 10 },
    { name: 'four for 6', kind: 'value', expr: 'length(queens(6))', expected: 4 },
  ],
  budget: 2_000_000,
  solution: `${queensDefinition}
// A set of positions is the list of rows, newest column first.
const empty_board = null;

function adjoin_position(row, col, positions) {
  return pair(row, positions);
}

function is_safe(k, positions) {
  const new_row = head(positions);
  function safe_from(rest, distance) {
    return is_null(rest)
      ? true
      : head(rest) !== new_row &&
        math_abs(head(rest) - new_row) !== distance &&
        safe_from(tail(rest), distance + 1);
  }
  return safe_from(tail(positions), 1);
}

length(queens(6));
`,
};

const louisQueens = louisQueensDefinition.replace('function louis_queens(', 'function queens(');

export const exercise_2_43: ExerciseSpec = {
  id: '2.43',
  prelude: queensBoardDefinitions,
  starter: `// enumerate_interval, flatmap, empty_board, adjoin_position and is_safe
// are provided, as in Exercise 2.42.

// Louis's queens: fix it.
${louisQueens}
// How many times does Louis's version apply queen_cols on an n × n board?
function louis_calls(n) {
  // your answer
}

// Louis's time for eight queens, in units of T.
const louis_estimate = 0;

length(queens(4));
`,
  tests: [
    { name: 'queens still works', kind: 'value', expr: 'length(queens(6))', expected: 4 },
    { name: 'queen_cols once per column', kind: 'calls', call: 'queens(6)', fn: 'queen_cols', atMost: 7 },
    { name: 'louis_calls(3)', kind: 'value', expr: 'louis_calls(3)', expected: 40 },
    { name: 'louis_calls(8)', kind: 'value', expr: 'louis_calls(8)', expected: 19173961 },
    { name: 'an estimate of Louis’s time', kind: 'value', expr: 'louis_estimate >= 1000 && louis_estimate <= 10000', expected: true },
  ],
  budget: 1_000_000,
  solution: `${queensDefinition}
// queen_cols(k) applies queen_cols(k - 1) once for each of the n rows,
// so queen_cols(k) is applied n^(n - k) times: 1 + n + ... + n^n in all.
function louis_calls(n) {
  return (math_pow(n, n + 1) - 1) / (n - 1);
}

// The original tries 15 720 positions on the 8 × 8 board; Louis's tries the
// positions of column k again 8^(8 - k) times, about 51 million in all.
const louis_estimate = 3200;

length(queens(4));
`,
};
