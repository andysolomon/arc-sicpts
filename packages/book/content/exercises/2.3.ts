import {
  decodeDefinitions,
  derivDefinition,
  derivSelectorDefinitions,
  encodeDefinitions,
  figureHuffmanTreeDefinition,
  figureTreesDefinitions,
  generateHuffmanDefinitions,
  huffmanTreeDefinitions,
  leafSetDefinitions,
  simplifyingConstructorDefinitions,
  treeDefinitions,
  unorderedSetDefinitions,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §2.3. */

/* §2.3.1 Strings */

export const exercise_2_53: ExerciseSpec = {
  id: '2.53',
  starter: `// Write what display_list prints for each expression, as a string.
// A string in single quotation marks may contain double ones: 'list("a")'.

// list("a", "b", "c")
const printed_1 = "";

// list(list("george"))
const printed_2 = "";

// tail(list(list("x1", "x2"), list("y1", "y2")))
const printed_3 = "";

// tail(head(list(list("x1", "x2"), list("y1", "y2"))))
const printed_4 = "";

// member("red", list("blue", "shoes", "yellow", "socks"))
const printed_5 = "";

// member("red", list("red", "shoes", "blue", "socks"))
const printed_6 = "";

// The third expression once more, in box notation, as display prints it.
const boxed_3 = "";
`,
  tests: [
    { name: 'a list of strings', kind: 'value', expr: 'printed_1 === list_to_string(list("a", "b", "c"))', expected: true },
    { name: 'a list inside a list', kind: 'value', expr: 'printed_2 === list_to_string(list(list("george")))', expected: true },
    {
      name: 'the tail of a list of lists',
      kind: 'value',
      expr: 'printed_3 === list_to_string(tail(list(list("x1", "x2"), list("y1", "y2"))))',
      expected: true,
    },
    {
      name: 'the tail of its head',
      kind: 'value',
      expr: 'printed_4 === list_to_string(tail(head(list(list("x1", "x2"), list("y1", "y2")))))',
      expected: true,
    },
    {
      name: 'member finds nothing',
      kind: 'value',
      expr: 'printed_5 === list_to_string(member("red", list("blue", "shoes", "yellow", "socks")))',
      expected: true,
    },
    {
      name: 'member finds the first item',
      kind: 'value',
      expr: 'printed_6 === list_to_string(member("red", list("red", "shoes", "blue", "socks")))',
      expected: true,
    },
    {
      name: 'box notation',
      kind: 'value',
      expr: 'boxed_3 === stringify(tail(list(list("x1", "x2"), list("y1", "y2"))))',
      expected: true,
    },
  ],
  solution: `const printed_1 = 'list("a", "b", "c")';
const printed_2 = 'list(list("george"))';
const printed_3 = 'list(list("y1", "y2"))';
const printed_4 = 'list("x2")';
const printed_5 = "null";
const printed_6 = 'list("red", "shoes", "blue", "socks")';
const boxed_3 = '[["y1", ["y2", null]], null]';
`,
};

export const exercise_2_54: ExerciseSpec = {
  id: '2.54',
  starter: `// Your equal replaces the library's.
function equal(a, b) {
  // your answer
}
`,
  tests: [
    {
      name: 'the same list',
      kind: 'value',
      expr: 'equal(list("this", "is", "a", "list"), list("this", "is", "a", "list"))',
      expected: true,
    },
    {
      name: 'a list with a sublist',
      kind: 'value',
      expr: 'equal(list("this", "is", "a", "list"), list("this", list("is", "a"), "list"))',
      expected: false,
    },
    {
      name: 'numbers and strings',
      kind: 'value',
      expr: 'equal(1, 1) && equal("a", "a") && !equal(1, "1") && !equal("a", "b") && equal(null, null)',
      expected: true,
    },
    {
      name: 'lengths and nesting',
      kind: 'value',
      expr: '!equal(list(1, 2), list(1, 2, 3)) && !equal(list(1, 2, 3), list(1, 2)) && !equal(list(1), 1) && equal(list(list(1, "a"), null), list(list(1, "a"), null))',
      expected: true,
    },
  ],
  solution: `function equal(a, b) {
  return is_pair(a)
    ? is_pair(b) && equal(head(a), head(b)) && equal(tail(a), tail(b))
    : a === b;
}
`,
};

export const exercise_2_55: ExerciseSpec = {
  id: '2.55',
  starter: `// Work these out by reading, then replace each null.

// The value of  '"' === ""
const answer = null;

// How many characters are in the string on the left of ===, and on the right?
const left_length = null;
const right_length = null;
`,
  tests: [
    { name: 'the value of the comparison', kind: 'value', expr: 'answer', expected: false },
    { name: 'the left string', kind: 'value', expr: 'left_length', expected: 1 },
    { name: 'the right string', kind: 'value', expr: 'right_length', expected: 0 },
  ],
  solution: `const answer = false;
const left_length = 1;
const right_length = 0;
`,
};

/* §2.3.2 Symbolic differentiation */

/** The value of a prefix expression for given values of "x" and "y"; sums and products may have any number of terms. */
const prefixValueAt = `function value_at(exp, x, y) {
  function value(e) {
    return is_number(e)
      ? e
      : e === "x"
        ? x
        : e === "y"
          ? y
          : head(e) === "+"
            ? accumulate((term, sum) => value(term) + sum, 0, tail(e))
            : head(e) === "*"
              ? accumulate((factor, product) => value(factor) * product, 1, tail(e))
              : head(e) === "**"
                ? math_pow(value(head(tail(e))), value(head(tail(tail(e)))))
                : error(e, "unknown expression -- value_at");
  }
  return value(exp);
}
`;

/** The value of an infix expression, with * binding more tightly than +. */
const infixValueAt = `function value_at(exp, x, y) {
  function value(e) {
    return is_number(e)
      ? e
      : e === "x"
        ? x
        : e === "y"
          ? y
          : terms(tail(e), value(head(e)), 0);
  }
  // product: the product being built; total: the sum of the finished products
  function terms(rest, product, total) {
    return is_null(rest)
      ? total + product
      : head(rest) === "*"
        ? terms(tail(tail(rest)), product * value(head(tail(rest))), total)
        : terms(tail(tail(rest)), value(head(tail(rest))), total + product);
  }
  return value(exp);
}
`;

const derivWithExp = `function deriv(exp, variable) {
  return is_number(exp)
    ? 0
    : is_variable(exp)
      ? is_same_variable(exp, variable) ? 1 : 0
      : is_sum(exp)
        ? make_sum(deriv(addend(exp), variable),
                   deriv(augend(exp), variable))
        : is_product(exp)
          ? make_sum(make_product(multiplier(exp),
                                  deriv(multiplicand(exp), variable)),
                     make_product(deriv(multiplier(exp), variable),
                                  multiplicand(exp)))
          : is_exp(exp)
            ? make_product(make_product(exponent(exp),
                                        make_exp(base(exp), exponent(exp) - 1)),
                           deriv(base(exp), variable))
            : error(exp, "unknown expression type -- deriv");
}
`;

export const exercise_2_56: ExerciseSpec = {
  id: '2.56',
  prelude: `${derivSelectorDefinitions}
${simplifyingConstructorDefinitions}
${prefixValueAt}`,
  starter: `// The predicates and selectors for variables, sums and products are provided,
// with number_equal and the simplifying make_sum and make_product. So is
// value_at(exp, x, y), the value of an expression when "x" and "y" have the
// values x and y.

${derivDefinition}
// your answer: a clause in deriv for exponentiation, and these four
function is_exp(x) {
}

function base(e) {
}

function exponent(e) {
}

function make_exp(b, e) {
}
`,
  tests: [
    { name: 'powers 0 and 1 are built in', kind: 'value', expr: 'make_exp("x", 0) === 1 && make_exp("x", 1) === "x"', expected: true },
    {
      name: 'selectors read what make_exp builds',
      kind: 'value',
      expr: 'is_exp(make_exp("x", 3)) && base(make_exp("x", 3)) === "x" && exponent(make_exp("x", 3)) === 3 && !is_exp(list("*", "x", 3))',
      expected: true,
    },
    { name: 'x cubed, at x = 2', kind: 'value', expr: 'value_at(deriv(list("**", "x", 3), "x"), 2, 0)', expected: 12 },
    { name: 'x to the first', kind: 'value', expr: 'deriv(list("**", "x", 1), "x")', expected: 1 },
    { name: 'the chain rule', kind: 'value', expr: 'value_at(deriv(list("**", list("+", list("*", 2, "x"), 1), 3), "x"), 1, 0)', expected: 54 },
    { name: 'a power of another variable', kind: 'value', expr: 'deriv(list("**", "y", 5), "x")', expected: 0 },
  ],
  solution: `${derivWithExp}
function is_exp(x) {
  return is_pair(x) && head(x) === "**";
}

function base(e) {
  return head(tail(e));
}

function exponent(e) {
  return head(tail(tail(e)));
}

function make_exp(b, e) {
  return number_equal(e, 0)
    ? 1
    : number_equal(e, 1)
      ? b
      : list("**", b, e);
}
`,
};

export const exercise_2_57: ExerciseSpec = {
  id: '2.57',
  prelude: prefixValueAt,
  starter: `// value_at(exp, x, y) is provided: the value of an expression, with sums
// and products of any number of terms, when "x" and "y" have the values x and y.

${derivDefinition}
// your answer: change the representation below, and leave deriv alone
${derivSelectorDefinitions}
${simplifyingConstructorDefinitions}`,
  tests: [
    { name: 'the example of the text', kind: 'value', expr: 'value_at(deriv(list("*", "x", "y", list("+", "x", 3)), "x"), 2, 5)', expected: 35 },
    { name: 'a sum of three terms', kind: 'value', expr: 'deriv(list("+", "x", "x", "x"), "x")', expected: 3 },
    { name: 'a product of four factors', kind: 'value', expr: 'value_at(deriv(list("*", "x", "x", "x", "x"), "x"), 2, 0)', expected: 32 },
    {
      name: 'longer sums of longer products',
      kind: 'value',
      expr: 'value_at(deriv(list("+", list("*", 3, "x", "y"), "y", list("*", "x", "x")), "x"), 1, 2)',
      expected: 8,
    },
    { name: 'two terms still work', kind: 'value', expr: 'deriv(list("*", "x", "y"), "x")', expected: 'y' },
  ],
  solution: `${derivDefinition}
${derivSelectorDefinitions.replace(
  `function augend(s) {
  return head(tail(tail(s)));
}`,
  `// The sum of the rest of the terms.
function augend(s) {
  return accumulate(make_sum, 0, tail(tail(s)));
}`,
).replace(
  `function multiplicand(s) {
  return head(tail(tail(s)));
}`,
  `// The product of the rest of the factors.
function multiplicand(s) {
  return accumulate(make_product, 1, tail(tail(s)));
}`,
)}
${simplifyingConstructorDefinitions}`,
};

export const exercise_2_58: ExerciseSpec = {
  id: '2.58',
  prelude: infixValueAt,
  starter: `// value_at(exp, x, y) is provided: the value of an infix expression, with
// * binding more tightly than +, when "x" and "y" have the values x and y.

${derivDefinition}
// your answer: change the representation below to infix, and leave deriv alone.
// Part (a) needs fully parenthesized expressions; part (b) the usual precedence.
${derivSelectorDefinitions}
${simplifyingConstructorDefinitions}`,
  tests: [
    {
      name: '(a) the example of the text',
      kind: 'value',
      expr: 'value_at(deriv(list("x", "+", list(3, "*", list("x", "+", list("y", "+", 2)))), "x"), 1, 1)',
      expected: 4,
    },
    { name: '(a) a product of a product and a sum', kind: 'value', expr: 'value_at(deriv(list(list("x", "*", "y"), "*", list("x", "+", 3)), "x"), 2, 5)', expected: 35 },
    { name: '(a) x times y', kind: 'value', expr: 'deriv(list("x", "*", "y"), "x")', expected: 'y' },
    {
      name: '(b) the example of the text',
      kind: 'value',
      expr: 'value_at(deriv(list("x", "+", 3, "*", list("x", "+", "y", "+", 2)), "x"), 1, 1)',
      expected: 4,
    },
    { name: '(b) * before +', kind: 'value', expr: 'value_at(deriv(list("x", "*", "x", "+", 3, "*", "x"), "x"), 2, 0)', expected: 7 },
    { name: '(b) a longer product', kind: 'value', expr: 'value_at(deriv(list("x", "*", "y", "*", "x", "+", "y"), "x"), 3, 2)', expected: 12 },
  ],
  solution: `${derivDefinition}
function is_variable(x) {
  return is_string(x);
}

function is_same_variable(v1, v2) {
  return is_variable(v1) && is_variable(v2) && v1 === v2;
}

// The items of an expression before the first occurrence of op.
function before(op, items) {
  return head(items) === op
    ? null
    : pair(head(items), before(op, tail(items)));
}

// A list of one item stands for that item.
function unwrap(items) {
  return is_null(tail(items)) ? head(items) : items;
}

// A sum when + appears at the top level: * binds more tightly.
function is_sum(x) {
  return is_pair(x) && !is_null(member("+", x));
}

function addend(s) {
  return unwrap(before("+", s));
}

function augend(s) {
  return unwrap(tail(member("+", s)));
}

function is_product(x) {
  return is_pair(x) && !is_sum(x) && !is_null(member("*", x));
}

function multiplier(p) {
  return unwrap(before("*", p));
}

function multiplicand(p) {
  return unwrap(tail(member("*", p)));
}

function number_equal(exp, num) {
  return is_number(exp) && exp === num;
}

function make_sum(a1, a2) {
  return number_equal(a1, 0)
    ? a2
    : number_equal(a2, 0)
      ? a1
      : is_number(a1) && is_number(a2)
        ? a1 + a2
        : list(a1, "+", a2);
}

function make_product(m1, m2) {
  return number_equal(m1, 0) || number_equal(m2, 0)
    ? 0
    : number_equal(m1, 1)
      ? m2
      : number_equal(m2, 1)
        ? m1
        : is_number(m1) && is_number(m2)
          ? m1 * m2
          : list(m1, "*", m2);
}
`,
};

/* §2.3.3 Sets */

/** Membership by `equal`, for checking answers without trusting the submission's own. */
const appearsIn = `function appears_in(x, xs) {
  return !is_null(xs) && (equal(x, head(xs)) || appears_in(x, tail(xs)));
}
`;

export const exercise_2_59: ExerciseSpec = {
  id: '2.59',
  prelude: `${unorderedSetDefinitions}
// True when s has no duplicates and the same elements as t.
function is_same_set(s, t) {
  function no_duplicates(s) {
    return is_null(s) || (!is_element_of_set(head(s), tail(s)) && no_duplicates(tail(s)));
  }
  return no_duplicates(s)
    && length(s) === length(t)
    && accumulate((x, so_far) => so_far && is_element_of_set(x, t), true, s);
}
`,
  starter: `// is_element_of_set, adjoin_set and intersection_set of the
// unordered representation are provided.

function union_set(set1, set2) {
  // your answer
}
`,
  tests: [
    { name: 'overlapping sets', kind: 'value', expr: 'is_same_set(union_set(list(1, 2, 3), list(3, 4, 2)), list(1, 2, 3, 4))', expected: true },
    { name: 'equal sets', kind: 'value', expr: 'is_same_set(union_set(list(1, 2, 3), list(3, 1, 2)), list(1, 2, 3))', expected: true },
    {
      name: 'the empty set',
      kind: 'value',
      expr: 'is_same_set(union_set(null, list("a", "b")), list("a", "b")) && is_same_set(union_set(list("a"), null), list("a"))',
      expected: true,
    },
    {
      name: 'lists as elements',
      kind: 'value',
      expr: 'is_same_set(union_set(list(list(1, 2), 3), list(list(1, 2), 4)), list(list(1, 2), 3, 4))',
      expected: true,
    },
  ],
  solution: `function union_set(set1, set2) {
  return is_null(set1)
    ? set2
    : union_set(tail(set1), adjoin_set(head(set1), set2));
}
`,
};

export const exercise_2_60: ExerciseSpec = {
  id: '2.60',
  prelude: appearsIn,
  starter: `// A set is now a list that may hold duplicates:
// list(2, 3, 2, 1, 3, 2, 2) is the set {1, 2, 3}.

function is_element_of_set(x, set) {
  // your answer
}

function adjoin_set(x, set) {
  // your answer
}

function union_set(set1, set2) {
  // your answer
}

function intersection_set(set1, set2) {
  // your answer
}
`,
  tests: [
    {
      name: 'membership',
      kind: 'value',
      expr: 'is_element_of_set(3, list(2, 3, 2, 1, 3, 2, 2)) && !is_element_of_set(4, list(2, 3, 2, 1, 3, 2, 2)) && is_element_of_set(list(1), list(2, list(1)))',
      expected: true,
    },
    { name: 'adjoin', kind: 'value', expr: '(s => appears_in(5, s) && appears_in(2, s) && appears_in(3, s))(adjoin_set(5, list(2, 3, 2)))', expected: true },
    {
      name: 'union',
      kind: 'value',
      expr: '(u => appears_in(1, u) && appears_in(2, u) && appears_in(4, u) && !appears_in(5, u))(union_set(list(1, 2, 1), list(2, 4)))',
      expected: true,
    },
    {
      name: 'intersection',
      kind: 'value',
      expr: '(i => appears_in(2, i) && appears_in(3, i) && !appears_in(1, i) && !appears_in(5, i))(intersection_set(list(2, 3, 2, 1, 3, 2, 2), list(3, 2, 2, 5)))',
      expected: true,
    },
    {
      name: 'adjoining does not search the set',
      kind: 'calls',
      call: 'is_element_of_set(100, adjoin_set(100, enum_list(1, 99)))',
      fn: 'is_element_of_set',
      atMost: 1,
    },
    { name: 'union does not go element by element', kind: 'calls', call: 'union_set(enum_list(1, 50), enum_list(1, 50))', fn: 'union_set', atMost: 1 },
  ],
  solution: `function is_element_of_set(x, set) {
  return is_null(set)
    ? false
    : equal(x, head(set))
      ? true
      : is_element_of_set(x, tail(set));
}

function adjoin_set(x, set) {
  return pair(x, set);
}

function union_set(set1, set2) {
  return append(set1, set2);
}

function intersection_set(set1, set2) {
  return is_null(set1) || is_null(set2)
    ? null
    : is_element_of_set(head(set1), set2)
      ? pair(head(set1), intersection_set(tail(set1), set2))
      : intersection_set(tail(set1), set2);
}
`,
};

export const exercise_2_61: ExerciseSpec = {
  id: '2.61',
  starter: `// Sets of numbers, as lists in increasing order.
// Stop as soon as you reach the place where x belongs.
function adjoin_set(x, set) {
  // your answer
}
`,
  tests: [
    { name: 'in the middle', kind: 'value', expr: 'equal(adjoin_set(5, list(1, 3, 6, 10)), list(1, 3, 5, 6, 10))', expected: true },
    {
      name: 'at either end',
      kind: 'value',
      expr: 'equal(adjoin_set(0, list(1, 3)), list(0, 1, 3)) && equal(adjoin_set(20, list(1, 3)), list(1, 3, 20))',
      expected: true,
    },
    { name: 'already there', kind: 'value', expr: 'equal(adjoin_set(3, list(1, 3, 6)), list(1, 3, 6))', expected: true },
    { name: 'the empty set', kind: 'value', expr: 'equal(adjoin_set(7, null), list(7))', expected: true },
    { name: 'stops where x belongs', kind: 'calls', call: 'adjoin_set(4.5, enum_list(1, 1000))', fn: 'adjoin_set', atMost: 5 },
  ],
  solution: `function adjoin_set(x, set) {
  return is_null(set)
    ? list(x)
    : x === head(set)
      ? set
      : x < head(set)
        ? pair(x, set)
        : pair(head(set), adjoin_set(x, tail(set)));
}
`,
};

const orderedUnion = `function union_set(set1, set2) {
  if (is_null(set1)) {
    return set2;
  } else if (is_null(set2)) {
    return set1;
  } else {
    const x1 = head(set1);
    const x2 = head(set2);
    return x1 === x2
      ? pair(x1, union_set(tail(set1), tail(set2)))
      : x1 < x2
        ? pair(x1, union_set(tail(set1), set2))
        : pair(x2, union_set(set1, tail(set2)));
  }
}
`;

export const exercise_2_62: ExerciseSpec = {
  id: '2.62',
  starter: `// Sets of numbers, as lists in increasing order.
function union_set(set1, set2) {
  // your answer
}
`,
  tests: [
    { name: 'overlapping sets', kind: 'value', expr: 'equal(union_set(list(1, 3, 5), list(2, 3, 4, 6)), list(1, 2, 3, 4, 5, 6))', expected: true },
    {
      name: 'the empty set',
      kind: 'value',
      expr: 'equal(union_set(null, list(1, 2)), list(1, 2)) && equal(union_set(list(1, 2), null), list(1, 2))',
      expected: true,
    },
    { name: 'a short set first', kind: 'calls', call: 'union_set(list(1), enum_list(2, 200))', fn: 'union_set', atMost: 3 },
    {
      name: 'Θ(n) on two interleaved sets of 300',
      kind: 'value',
      expr: 'length(union_set(build_list(i => 2 * i, 300), build_list(i => 2 * i + 1, 300)))',
      expected: 600,
    },
  ],
  budget: 200_000,
  solution: orderedUnion,
};

const listToTreeDefinitions = `function list_to_tree(elements) {
  return head(partial_tree(elements, length(elements)));
}

function partial_tree(elts, n) {
  if (n === 0) {
    return pair(null, elts);
  } else {
    const left_size = math_floor((n - 1) / 2);
    const left_result = partial_tree(elts, left_size);
    const left_tree = head(left_result);
    const non_left_elts = tail(left_result);
    const right_size = n - (left_size + 1);
    const this_entry = head(non_left_elts);
    const right_result = partial_tree(tail(non_left_elts), right_size);
    const right_tree = head(right_result);
    const remaining_elts = tail(right_result);
    return pair(make_tree(this_entry, left_tree, right_tree),
                remaining_elts);
  }
}
`;

const treeToListDefinitions = `function tree_to_list_1(tree) {
  return is_null(tree)
    ? null
    : append(tree_to_list_1(left_branch(tree)),
             pair(entry(tree),
                  tree_to_list_1(right_branch(tree))));
}

function tree_to_list_2(tree) {
  function copy_to_list(tree, result_list) {
    return is_null(tree)
      ? result_list
      : copy_to_list(left_branch(tree),
                     pair(entry(tree),
                          copy_to_list(right_branch(tree), result_list)));
  }
  return copy_to_list(tree, null);
}
`;

export const exercise_2_63: ExerciseSpec = {
  id: '2.63',
  prelude: `${treeDefinitions}
${figureTreesDefinitions}
${listToTreeDefinitions}`,
  starter: `// make_tree and its selectors are provided, and so are tree_a, tree_b and
// tree_c, the three trees of figure 2.16, and list_to_tree of exercise 2.64.

${treeToListDefinitions}
// Do the two functions give the same list for every tree? true or false.
const same_results = null;

// Which has the more slowly growing number of steps on balanced trees?
// "tree_to_list_1" or "tree_to_list_2".
const grows_more_slowly = null;

// How many times is append applied, counting its own recursive applications,
// when tree_to_list_1(tree) is evaluated? Work it out from the shape of the
// tree, without calling tree_to_list_1.
function append_calls(tree) {
  // your answer
}
`,
  tests: [
    { name: 'same results', kind: 'value', expr: 'same_results', expected: true },
    { name: 'which grows more slowly', kind: 'value', expr: 'grows_more_slowly', expected: 'tree_to_list_2' },
    { name: 'append in tree_a', kind: 'value', expr: 'append_calls(tree_a)', expected: 10 },
    { name: 'append in tree_b and tree_c', kind: 'value', expr: 'append_calls(tree_b) * 100 + append_calls(tree_c)', expected: 810 },
    { name: 'append in a balanced tree of 255', kind: 'value', expr: 'append_calls(list_to_tree(enum_list(1, 255)))', expected: 1024 },
  ],
  budget: 300_000,
  solution: `${treeToListDefinitions}
const same_results = true;
const grows_more_slowly = "tree_to_list_2";

function size(tree) {
  return is_null(tree)
    ? 0
    : 1 + size(left_branch(tree)) + size(right_branch(tree));
}

// Each node appends its left subtree's list: one application per element, and one for null.
function append_calls(tree) {
  return is_null(tree)
    ? 0
    : size(left_branch(tree)) + 1
      + append_calls(left_branch(tree)) + append_calls(right_branch(tree));
}
`,
};

export const exercise_2_64: ExerciseSpec = {
  id: '2.64',
  prelude: treeDefinitions,
  starter: `// make_tree and its selectors are provided.

${listToTreeDefinitions}
// The tree that list_to_tree(list(1, 3, 5, 7, 9, 11)) produces,
// written out with make_tree.
const drawn = null;

// How many times is partial_tree applied when list_to_tree converts a list
// of n elements? A formula in n.
function partial_tree_calls(n) {
  // your answer
}
`,
  tests: [
    { name: 'the tree for list(1, 3, 5, 7, 9, 11)', kind: 'value', expr: 'equal(drawn, list_to_tree(list(1, 3, 5, 7, 9, 11)))', expected: true },
    { name: 'the empty list', kind: 'value', expr: 'partial_tree_calls(0)', expected: 1 },
    { name: 'six elements', kind: 'value', expr: 'partial_tree_calls(6)', expected: 13 },
    { name: 'a thousand elements', kind: 'value', expr: 'partial_tree_calls(1000)', expected: 2001 },
  ],
  solution: `${listToTreeDefinitions}
const drawn = make_tree(5,
                        make_tree(1, null, make_tree(3, null, null)),
                        make_tree(9, make_tree(7, null, null),
                                     make_tree(11, null, null)));

// Each application with n > 0 makes two more, on n - 1 elements between them.
function partial_tree_calls(n) {
  return 2 * n + 1;
}
`,
};

export const exercise_2_65: ExerciseSpec = {
  id: '2.65',
  prelude: `${treeDefinitions}
${listToTreeDefinitions}
function tree_to_list(tree) {
  function copy_to_list(tree, result_list) {
    return is_null(tree)
      ? result_list
      : copy_to_list(left_branch(tree),
                     pair(entry(tree),
                          copy_to_list(right_branch(tree), result_list)));
  }
  return copy_to_list(tree, null);
}

function depth(tree) {
  return is_null(tree)
    ? 0
    : 1 + math_max(depth(left_branch(tree)), depth(right_branch(tree)));
}
`,
  starter: `// Provided: make_tree and its selectors, tree_to_list (the Θ(n)
// tree_to_list_2 of exercise 2.63), list_to_tree (exercise 2.64), and
// depth(tree), the number of levels in a tree.

function union_set(set1, set2) {
  // your answer
}

function intersection_set(set1, set2) {
  // your answer
}
`,
  tests: [
    {
      name: 'union',
      kind: 'value',
      expr: 'equal(tree_to_list(union_set(list_to_tree(list(1, 3, 5, 7)), list_to_tree(list(2, 3, 6)))), list(1, 2, 3, 5, 6, 7))',
      expected: true,
    },
    {
      name: 'intersection',
      kind: 'value',
      expr: 'equal(tree_to_list(intersection_set(list_to_tree(list(1, 3, 5, 7)), list_to_tree(list(2, 3, 6, 7)))), list(3, 7))',
      expected: true,
    },
    {
      name: 'the union is balanced',
      kind: 'value',
      expr: 'depth(union_set(list_to_tree(build_list(i => 2 * i, 100)), list_to_tree(build_list(i => 2 * i + 1, 100))))',
      expected: 8,
    },
    {
      name: 'Θ(n) union of two sets of 300',
      kind: 'value',
      expr: 'length(tree_to_list(union_set(list_to_tree(build_list(i => 2 * i, 300)), list_to_tree(build_list(i => 2 * i + 1, 300)))))',
      expected: 600,
    },
    {
      name: 'Θ(n) intersection of two sets of 300',
      kind: 'value',
      expr: 'length(tree_to_list(intersection_set(list_to_tree(enum_list(1, 300)), list_to_tree(build_list(i => 3 * i, 300)))))',
      expected: 100,
    },
  ],
  budget: 1_000_000,
  solution: `function union_list(set1, set2) {
  if (is_null(set1)) {
    return set2;
  } else if (is_null(set2)) {
    return set1;
  } else {
    const x1 = head(set1);
    const x2 = head(set2);
    return x1 === x2
      ? pair(x1, union_list(tail(set1), tail(set2)))
      : x1 < x2
        ? pair(x1, union_list(tail(set1), set2))
        : pair(x2, union_list(set1, tail(set2)));
  }
}

function intersection_list(set1, set2) {
  if (is_null(set1) || is_null(set2)) {
    return null;
  } else {
    const x1 = head(set1);
    const x2 = head(set2);
    return x1 === x2
      ? pair(x1, intersection_list(tail(set1), tail(set2)))
      : x1 < x2
        ? intersection_list(tail(set1), set2)
        : intersection_list(set1, tail(set2));
  }
}

function union_set(set1, set2) {
  return list_to_tree(union_list(tree_to_list(set1), tree_to_list(set2)));
}

function intersection_set(set1, set2) {
  return list_to_tree(intersection_list(tree_to_list(set1), tree_to_list(set2)));
}
`,
};

export const exercise_2_66: ExerciseSpec = {
  id: '2.66',
  prelude: `${treeDefinitions}
${listToTreeDefinitions}
function make_record(key, data) {
  return pair(key, data);
}

function key(record) {
  return head(record);
}

function data(record) {
  return tail(record);
}

// 1000 records with keys 0, 3, 6, ..., 2997, as a balanced tree.
const staff = list_to_tree(build_list(i => make_record(3 * i, i), 1000));
`,
  starter: `// Provided: make_record(key, data) and the selectors key and data; make_tree
// and its selectors; list_to_tree; and staff, a tree of 1000 records with
// keys 0, 3, 6, ..., 2997, ordered by key.

function lookup(given_key, set_of_records) {
  // your answer
}
`,
  tests: [
    {
      name: 'a small tree',
      kind: 'value',
      expr: 'equal(lookup(2, list_to_tree(list(make_record(1, "a"), make_record(2, "b"), make_record(3, "c")))), make_record(2, "b"))',
      expected: true,
    },
    { name: 'a record in staff', kind: 'value', expr: 'equal(lookup(42, staff), make_record(42, 14))', expected: true },
    { name: 'missing keys', kind: 'value', expr: 'lookup(43, staff) === false && lookup(1, null) === false', expected: true },
    { name: 'one path down the tree', kind: 'calls', call: 'lookup(2997, staff)', fn: 'lookup', atMost: 11 },
  ],
  solution: `function lookup(given_key, set_of_records) {
  if (is_null(set_of_records)) {
    return false;
  } else {
    const record = entry(set_of_records);
    return given_key === key(record)
      ? record
      : given_key < key(record)
        ? lookup(given_key, left_branch(set_of_records))
        : lookup(given_key, right_branch(set_of_records));
  }
}
`,
};

/* §2.3.4 Huffman encoding trees */

const sampleTreeDefinitions = `const sample_tree = make_code_tree(make_leaf("A", 4),
                                   make_code_tree(make_leaf("B", 2),
                                                  make_code_tree(make_leaf("D", 1),
                                                                 make_leaf("C", 1))));
const sample_message = list(0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0);
`;

export const exercise_2_67: ExerciseSpec = {
  id: '2.67',
  prelude: `${huffmanTreeDefinitions}
${decodeDefinitions}`,
  starter: `// make_leaf, make_code_tree, their selectors, and decode are provided.

${sampleTreeDefinitions}
// Decode the message by hand, following the tree from the root, and write the
// result as a list of symbols. Then check it with decode.
const decoded = null;
`,
  tests: [{ name: 'the decoded message', kind: 'value', expr: 'equal(decoded, decode(sample_message, sample_tree))', expected: true }],
  solution: `${sampleTreeDefinitions}
const decoded = list("A", "D", "A", "B", "B", "C", "A");
`,
};

const encodeFunction = `function encode(message, tree) {
  return is_null(message)
    ? null
    : append(encode_symbol(head(message), tree),
             encode(tail(message), tree));
}
`;

export const exercise_2_68: ExerciseSpec = {
  id: '2.68',
  prelude: `${huffmanTreeDefinitions}
${decodeDefinitions}
${sampleTreeDefinitions}
${figureHuffmanTreeDefinition.replace('const tree', 'const figure_tree')}`,
  starter: `// Provided: the representation of Huffman trees, decode, sample_tree and
// sample_message of exercise 2.67, and figure_tree, the tree of figure 2.18.

${encodeFunction}
// The list of bits for one symbol; an error if the symbol is not in the tree.
function encode_symbol(symbol, tree) {
  // your answer
}
`,
  tests: [
    { name: 'one symbol', kind: 'value', expr: 'equal(encode_symbol("D", sample_tree), list(1, 1, 0))', expected: true },
    {
      name: 'the sample message, decoded and encoded again',
      kind: 'value',
      expr: 'equal(encode(decode(sample_message, sample_tree), sample_tree), sample_message)',
      expected: true,
    },
    { name: 'figure 2.18', kind: 'value', expr: 'equal(encode(list("B", "A", "C"), figure_tree), list(1, 0, 0, 0, 1, 0, 1, 0))', expected: true },
    { name: 'a symbol not in the tree is an error', kind: 'error', call: 'encode_symbol("Z", sample_tree)' },
  ],
  solution: encodeDefinitions,
};

export const exercise_2_69: ExerciseSpec = {
  id: '2.69',
  prelude: `${huffmanTreeDefinitions}
${decodeDefinitions}
${leafSetDefinitions}
${encodeDefinitions}`,
  starter: `// Provided: the representation of Huffman trees, adjoin_set (ordered by
// weight), make_leaf_set, encode and decode.

function generate_huffman_tree(pairs) {
  return successive_merge(make_leaf_set(pairs));
}

function successive_merge(set) {
  // your answer
}
`,
  tests: [
    {
      name: 'the tree of exercise 2.67',
      kind: 'value',
      expr: '(t => weight(t) === 8 && length(encode(list("A"), t)) === 1 && length(encode(list("B"), t)) === 2 && length(encode(list("D"), t)) === 3)(generate_huffman_tree(list(list("A", 4), list("B", 2), list("C", 1), list("D", 1))))',
      expected: true,
    },
    {
      name: 'the message of the text in 42 bits',
      kind: 'value',
      expr: 'length(encode(list("B", "A", "C", "A", "D", "A", "E", "A", "F", "A", "B", "B", "A", "A", "A", "G", "A", "H"), generate_huffman_tree(list(list("A", 8), list("B", 3), list("C", 1), list("D", 1), list("E", 1), list("F", 1), list("G", 1), list("H", 1)))))',
      expected: 42,
    },
    {
      name: 'decoding undoes encoding',
      kind: 'value',
      expr: '(t => equal(decode(encode(list("C", "A", "B", "E"), t), t), list("C", "A", "B", "E")))(generate_huffman_tree(list(list("A", 5), list("B", 1), list("C", 2), list("D", 7), list("E", 3))))',
      expected: true,
    },
    { name: 'one symbol is a leaf', kind: 'value', expr: 'is_leaf(generate_huffman_tree(list(list("A", 3))))', expected: true },
  ],
  solution: `function generate_huffman_tree(pairs) {
  return successive_merge(make_leaf_set(pairs));
}

// The set is ordered by weight, so the two lightest come first; the merged
// tree goes back in its place by weight.
function successive_merge(set) {
  return is_null(tail(set))
    ? head(set)
    : successive_merge(adjoin_set(make_code_tree(head(set), head(tail(set))),
                                  tail(tail(set))));
}
`,
};

const fullHuffmanPrelude = `${huffmanTreeDefinitions}
${decodeDefinitions}
${leafSetDefinitions}
${generateHuffmanDefinitions}`;

const rockStarter = `const rock_pairs = list(list("A", 2), list("NA", 16), list("BOOM", 1), list("SHA", 3),
                        list("GET", 2), list("YIP", 9), list("JOB", 2), list("WAH", 1));
const rock_tree = generate_huffman_tree(rock_pairs);
`;

const songList = `list("GET", "A", "JOB",
                  "SHA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA",
                  "GET", "A", "JOB",
                  "SHA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA",
                  "WAH", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP",
                  "SHA", "BOOM")`;

export const exercise_2_70: ExerciseSpec = {
  id: '2.70',
  prelude: `${fullHuffmanPrelude}
${encodeDefinitions}`,
  starter: `// Provided: generate_huffman_tree, encode and decode.

${rockStarter}
// The song, as a list of symbols.
const song = null;

// How many bits does rock_tree use to encode the song?
const huffman_bits = 0;

// How many would the shortest fixed-length code for eight symbols use?
const fixed_bits = 0;
`,
  tests: [
    { name: 'the song', kind: 'value', expr: `equal(song, ${songList.replace(/\s+/g, ' ')})`, expected: true },
    { name: 'bits with the Huffman code', kind: 'value', expr: 'huffman_bits', expected: 84 },
    { name: 'bits with a fixed-length code', kind: 'value', expr: 'fixed_bits', expected: 108 },
  ],
  solution: `${rockStarter}
const song = ${songList};

const huffman_bits = length(encode(song, rock_tree));

// Eight symbols need three bits each.
const fixed_bits = 3 * length(song);
`,
};

const powersOfTwo = `// The pairs list(list("s0", 1), list("s1", 2), ..., list("s<n-1>", 2^(n-1))).
function powers_of_two(n) {
  return build_list(i => list("s" + stringify(i), math_pow(2, i)), n);
}
`;

export const exercise_2_71: ExerciseSpec = {
  id: '2.71',
  prelude: `${fullHuffmanPrelude}
${encodeDefinitions}
${powersOfTwo}`,
  starter: `// Provided: generate_huffman_tree, encode, and powers_of_two(n), the pairs
// list(list("s0", 1), list("s1", 2), ..., list("s<n-1>", 2^(n-1))).
// Look at generate_huffman_tree(powers_of_two(5)) and the tree for 10.

// For any n >= 2: how many bits encode the most frequent symbol?
function most_frequent_bits(n) {
  // your answer
}

// And the least frequent?
function least_frequent_bits(n) {
  // your answer
}
`,
  tests: [
    { name: 'most frequent, n = 5', kind: 'value', expr: 'most_frequent_bits(5)', expected: 1 },
    { name: 'least frequent, n = 5', kind: 'value', expr: 'least_frequent_bits(5)', expected: 4 },
    { name: 'least frequent, n = 10', kind: 'value', expr: 'least_frequent_bits(10)', expected: 9 },
    {
      name: 'as encode measures it, n = 13',
      kind: 'value',
      expr: '(t => most_frequent_bits(13) === length(encode(list("s12"), t)) && least_frequent_bits(13) === length(encode(list("s0"), t)))(generate_huffman_tree(powers_of_two(13)))',
      expected: true,
    },
  ],
  solution: `function most_frequent_bits(n) {
  return 1;
}

function least_frequent_bits(n) {
  return n - 1;
}
`,
};

export const exercise_2_72: ExerciseSpec = {
  id: '2.72',
  prelude: `${fullHuffmanPrelude}
${powersOfTwo}`,
  starter: `// Provided: generate_huffman_tree and powers_of_two of exercise 2.71.
// This is the encoder of exercise 2.68; contains is the search it makes
// at each node it passes.

${encodeDefinitions}
// In generate_huffman_tree(powers_of_two(n)), how many times is contains
// applied to encode the most frequent symbol? The least frequent? Formulas in n.
function searches_for_most_frequent(n) {
  // your answer
}

function searches_for_least_frequent(n) {
  // your answer
}
`,
  tests: [
    { name: 'most frequent, n = 5', kind: 'value', expr: 'searches_for_most_frequent(5)', expected: 6 },
    { name: 'most frequent, n = 10', kind: 'value', expr: 'searches_for_most_frequent(10)', expected: 11 },
    { name: 'least frequent, n = 5', kind: 'value', expr: 'searches_for_least_frequent(5)', expected: 4 },
    { name: 'least frequent, n = 10', kind: 'value', expr: 'searches_for_least_frequent(10)', expected: 9 },
  ],
  solution: `${encodeDefinitions}
// At the root, the search of the left branch's n - 1 symbols fails (n
// applications), then the right branch, a single leaf, matches (one more).
function searches_for_most_frequent(n) {
  return n + 1;
}

// The least frequent symbol is first in every left branch's list, so each of
// the n - 1 nodes on the way down costs one application.
function searches_for_least_frequent(n) {
  return n - 1;
}
`,
};
