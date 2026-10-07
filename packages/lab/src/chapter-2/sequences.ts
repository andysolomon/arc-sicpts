/**
 * Programs of §2.2.1 – §2.2.3, hierarchical data and sequences.
 */

// §2.2.1: the closure property and representing sequences.

/** Figures 2.2 and 2.3: a pair, and two ways to combine 1, 2, 3 and 4 with pairs. */
export const closurePropertyProgram = `const one_and_two = pair(1, 2);
const pairs_of_pairs = pair(pair(1, 2), pair(3, 4));
const another_way = pair(pair(1, pair(2, 3)), 4);

pair(pairs_of_pairs, another_way);
`;

/** Figure 2.4: the sequence 1, 2, 3, 4 as a chain of pairs. */
export const oneThroughFourProgram = `const one_through_four = list(1, 2, 3, 4);

display(one_through_four);
display(head(one_through_four));
display_list(tail(one_through_four));
display(head(tail(one_through_four)));

const ten_through_four = pair(10, one_through_four);
display_list(ten_through_four);

equal(one_through_four, pair(1, pair(2, pair(3, pair(4, null)))));
`;

/** Walking down a list with `tail`: `list_ref` and `length`. */
export const listRefProgram = `function list_ref(items, n) {
  return n === 0
    ? head(items)
    : list_ref(tail(items), n - 1);
}

function length(items) {
  return is_null(items)
    ? 0
    : 1 + length(tail(items));
}

const squares = list(1, 4, 9, 16, 25);
const odds = list(1, 3, 5, 7);

display(list_ref(squares, 3));
length(odds);
`;

/** Building an answer with `pair` while walking down with `tail`. */
export const appendProgram = `function append(list1, list2) {
  return is_null(list1)
    ? list2
    : pair(head(list1), append(tail(list1), list2));
}

const squares = list(1, 4, 9, 16, 25);
const odds = list(1, 3, 5, 7);

const squares_then_odds = append(squares, odds);
append(odds, squares);
`;

/** `scale_list`, and the pattern behind it captured as `map`. */
export const mapProgram = `function scale_list(items, factor) {
  return is_null(items)
    ? null
    : pair(head(items) * factor,
           scale_list(tail(items), factor));
}

function map(fun, items) {
  return is_null(items)
    ? null
    : pair(fun(head(items)),
           map(fun, tail(items)));
}

const scaled = scale_list(list(1, 2, 3, 4, 5), 10);
const absolutes = map(math_abs, list(-10, 2.5, -11.6, 17));
map(x => x * x, list(1, 2, 3, 4));
`;

// §2.2.2: hierarchical structures.

/** Figure 2.5: a list whose first item is itself a list. */
export const hierarchyProgram = `const x = pair(list(1, 2), list(3, 4));
const x_twice = list(x, x);

display(length(x));
length(x_twice);
`;

export const countLeavesDefinition = `function count_leaves(x) {
  return is_null(x)
    ? 0
    : ! is_pair(x)
    ? 1
    : count_leaves(head(x)) + count_leaves(tail(x));
}
`;

/** Counting leaves: the recursion follows the tree. */
export const countLeavesProgram = `${countLeavesDefinition}
const x = pair(list(1, 2), list(3, 4));
count_leaves(x);
`;

/** Mapping over a tree with recursion on head and tail. */
export const scaleTreeProgram = `function scale_tree(tree, factor) {
  return is_null(tree)
    ? null
    : ! is_pair(tree)
    ? tree * factor
    : pair(scale_tree(head(tree), factor),
           scale_tree(tail(tree), factor));
}

const tree = list(1, list(2, list(3, 4), 5), list(6, 7));
scale_tree(tree, 10);
`;

/** The same, treating a tree as a sequence of subtrees and using `map`. */
export const scaleTreeMapProgram = `function scale_tree(tree, factor) {
  return map(sub_tree => is_pair(sub_tree)
                         ? scale_tree(sub_tree, factor)
                         : sub_tree * factor,
             tree);
}

scale_tree(list(1, list(2, 3), 4), 10);
`;

// §2.2.3: sequences as conventional interfaces.

const squareAndOdd = `function square(x) {
  return x * x;
}

function is_odd(n) {
  return n % 2 === 1;
}
`;

/** `sum_odd_squares` written as a tree recursion, with its stages mingled. */
export const sumOddSquaresProgram = `${squareAndOdd}
function sum_odd_squares(tree) {
  return is_null(tree)
    ? 0
    : ! is_pair(tree)
    ? is_odd(tree) ? square(tree) : 0
    : sum_odd_squares(head(tree)) +
      sum_odd_squares(tail(tree));
}

sum_odd_squares(list(1, list(2, list(3, 4)), 5));
`;

/** The sequence operations of §2.2.3 as the book declares them. */
export const sequenceOperationDefinitions = `function plus(x, y) {
  return x + y;
}

function times(x, y) {
  return x * y;
}

function filter(predicate, sequence) {
  return is_null(sequence)
    ? null
    : predicate(head(sequence))
    ? pair(head(sequence),
           filter(predicate, tail(sequence)))
    : filter(predicate, tail(sequence));
}

function accumulate(op, initial, sequence) {
  return is_null(sequence)
    ? initial
    : op(head(sequence),
         accumulate(op, initial, tail(sequence)));
}

function enumerate_interval(low, high) {
  return low > high
    ? null
    : pair(low,
           enumerate_interval(low + 1, high));
}

function enumerate_tree(tree) {
  return is_null(tree)
    ? null
    : ! is_pair(tree)
    ? list(tree)
    : append(enumerate_tree(head(tree)),
             enumerate_tree(tail(tree)));
}
`;

/** `sum_odd_squares` as a signal flowing through enumerate, filter, map and accumulate. */
export const signalFlowProgram = `${squareAndOdd}
${sequenceOperationDefinitions}
const tree = list(1, list(2, list(3, 4)), 5);

const leaves = enumerate_tree(tree);
const odd_leaves = filter(is_odd, leaves);
const odd_squares = map(square, odd_leaves);
accumulate(plus, 0, odd_squares);
`;

/** The same components, mixed and matched. */
export const mixAndMatchProgram = `${squareAndOdd}
${sequenceOperationDefinitions}
function is_even(n) {
  return n % 2 === 0;
}

function fib(n) {
  function fib_iter(a, b, count) {
    return count === 0
      ? b
      : fib_iter(a + b, a, count - 1);
  }
  return fib_iter(1, 0, n);
}

function even_fibs(n) {
  return accumulate(pair,
                    null,
                    filter(is_even,
                           map(fib,
                               enumerate_interval(0, n))));
}

function list_fib_squares(n) {
  return accumulate(pair,
                    null,
                    map(square,
                        map(fib,
                            enumerate_interval(0, n))));
}

function product_of_squares_of_odd_elements(sequence) {
  return accumulate(times,
                    1,
                    map(square,
                        filter(is_odd, sequence)));
}

display(product_of_squares_of_odd_elements(list(1, 2, 3, 4, 5)));
const evens = even_fibs(12);
list_fib_squares(10);
`;

/** `flatmap`, `enumerate_interval` and a primality test, for nested mappings. */
export const flatmapDefinitions = `function enumerate_interval(low, high) {
  return low > high
    ? null
    : pair(low, enumerate_interval(low + 1, high));
}

function flatmap(f, seq) {
  return accumulate(append, null, map(f, seq));
}

function is_prime(n) {
  function find_divisor(d) {
    return d * d > n ? n : n % d === 0 ? d : find_divisor(d + 1);
  }
  return n > 1 && find_divisor(2) === n;
}
`;

/** Pairs (i, j) with 1 ≤ j < i ≤ n whose sum is prime. */
export const primeSumPairsProgram = `${flatmapDefinitions}
function is_prime_sum(pair) {
  return is_prime(head(pair) + head(tail(pair)));
}

function make_pair_sum(pair) {
  return list(head(pair), head(tail(pair)),
              head(pair) + head(tail(pair)));
}

function prime_sum_pairs(n) {
  return map(make_pair_sum,
             filter(is_prime_sum,
                    flatmap(i => map(j => list(i, j),
                                     enumerate_interval(1, i - 1)),
                            enumerate_interval(1, n))));
}

const all_pairs = flatmap(i => map(j => list(i, j),
                                   enumerate_interval(1, i - 1)),
                          enumerate_interval(1, 4));
prime_sum_pairs(6);
`;

/** All the orderings of a set, by nested mapping. */
export const permutationsProgram = `function flatmap(f, seq) {
  return accumulate(append, null, map(f, seq));
}

function remove(item, sequence) {
  return filter(x => ! (x === item),
                sequence);
}

function permutations(s) {
  return is_null(s)             // empty set?
    ? list(null)                // sequence containing empty set
    : flatmap(x => map(p => pair(x, p),
                       permutations(remove(x, s))),
              s);
}

permutations(list(1, 2, 3));
`;

/** A representation of board positions for the queens puzzle (Exercise 2.42): a list of rows, newest column first. */
export const queensBoardDefinitions = `${flatmapDefinitions}
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
`;

/** The function `queens` as the book declares it. */
export const queensDefinition = `function queens(board_size) {
  function queen_cols(k) {
    return k === 0
      ? list(empty_board)
      : filter(positions => is_safe(k, positions),
               flatmap(rest_of_queens =>
                         map(new_row =>
                               adjoin_position(new_row, k,
                                               rest_of_queens),
                             enumerate_interval(1, board_size)),
                       queen_cols(k - 1)));
  }
  return queen_cols(board_size);
}
`;

/** Louis Reasoner's version (Exercise 2.43), with the nested mappings interchanged. */
export const louisQueensDefinition = `function louis_queens(board_size) {
  function queen_cols(k) {
    return k === 0
      ? list(empty_board)
      : filter(positions => is_safe(k, positions),
               flatmap(new_row =>
                         map(rest_of_queens =>
                               adjoin_position(new_row, k,
                                               rest_of_queens),
                             queen_cols(k - 1)),
                       enumerate_interval(1, board_size)));
  }
  return queen_cols(board_size);
}
`;
