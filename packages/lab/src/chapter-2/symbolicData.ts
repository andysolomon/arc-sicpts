/**
 * Programs of §2.3, symbolic data: strings as data, symbolic differentiation,
 * sets as lists and trees, and Huffman encoding trees. The Book shows these
 * texts in its editors; `symbolicData.test.ts` asserts what they compute.
 */

/* §2.3.1 Strings */

/** Names against strings: the same letters, quoted or not. */
export const quotationProgram = `const a = 1;
const b = 2;

const values = list(a, b);
const strings = list("a", "b");
const mixed = list("a", b);

display_list(values);
display_list(strings);
display_list(mixed);
`;

export const memberDefinition = `function member(item, x) {
  return is_null(x)
    ? null
    : item === head(x)
      ? x
      : member(item, tail(x));
}
`;

export const memberProgram = `${memberDefinition}
const fruit = list("x", "y", "apple", "pear");

display(member("apple", list("pear", "banana", "prune")));
member("apple", fruit);
`;

/* §2.3.2 Symbolic differentiation */

/** The predicates and selectors of the prefix representation. */
export const derivSelectorDefinitions = `function is_variable(x) {
  return is_string(x);
}

function is_same_variable(v1, v2) {
  return is_variable(v1) && is_variable(v2) && v1 === v2;
}

function is_sum(x) {
  return is_pair(x) && head(x) === "+";
}

function addend(s) {
  return head(tail(s));
}

function augend(s) {
  return head(tail(tail(s)));
}

function is_product(x) {
  return is_pair(x) && head(x) === "*";
}

function multiplier(s) {
  return head(tail(s));
}

function multiplicand(s) {
  return head(tail(tail(s)));
}
`;

export const derivDefinition = `function deriv(exp, variable) {
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
          : error(exp, "unknown expression type -- deriv");
}
`;

export const simplifyingConstructorDefinitions = `function number_equal(exp, num) {
  return is_number(exp) && exp === num;
}

function make_sum(a1, a2) {
  return number_equal(a1, 0)
    ? a2
    : number_equal(a2, 0)
      ? a1
      : is_number(a1) && is_number(a2)
        ? a1 + a2
        : list("+", a1, a2);
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
          : list("*", m1, m2);
}
`;

/** The differentiator with the plainest constructors: correct, and unsimplified. */
export const derivProgram = `${derivDefinition}
${derivSelectorDefinitions}
function make_sum(a1, a2) {
  return list("+", a1, a2);
}

function make_product(m1, m2) {
  return list("*", m1, m2);
}

display_list(deriv(list("+", "x", 3), "x"));
display_list(deriv(list("*", "x", "y"), "x"));

const expression = list("*", list("*", "x", "y"), list("+", "x", 3));
deriv(expression, "x");
`;

/** New constructors, the same \`deriv\`; the selectors come from a prelude. */
export const simplifyingDerivProgram = `${simplifyingConstructorDefinitions}
${derivDefinition}
display_list(deriv(list("+", "x", 3), "x"));
display_list(deriv(list("*", "x", "y"), "x"));

const expression = list("*", list("*", "x", "y"), list("+", "x", 3));
deriv(expression, "x");
`;

/* §2.3.3 Sets */

export const unorderedSetDefinitions = `function is_element_of_set(x, set) {
  return is_null(set)
    ? false
    : equal(x, head(set))
      ? true
      : is_element_of_set(x, tail(set));
}

function adjoin_set(x, set) {
  return is_element_of_set(x, set)
    ? set
    : pair(x, set);
}

function intersection_set(set1, set2) {
  return is_null(set1) || is_null(set2)
    ? null
    : is_element_of_set(head(set1), set2)
      ? pair(head(set1), intersection_set(tail(set1), set2))
      : intersection_set(tail(set1), set2);
}
`;

export const unorderedSetProgram = `${unorderedSetDefinitions}
const set1 = adjoin_set(4, list(1, 2, 3));
const set2 = adjoin_set(3, list(3, 4, 5, 6));

display(is_element_of_set(list("a", 1), list("b", list("a", 1))));
intersection_set(set1, set2);
`;

export const orderedSetDefinitions = `function is_element_of_set(x, set) {
  return is_null(set)
    ? false
    : x === head(set)
      ? true
      : x < head(set)
        ? false
        : is_element_of_set(x, tail(set));
}

function intersection_set(set1, set2) {
  if (is_null(set1) || is_null(set2)) {
    return null;
  } else {
    const x1 = head(set1);
    const x2 = head(set2);
    return x1 === x2
      ? pair(x1, intersection_set(tail(set1), tail(set2)))
      : x1 < x2
        ? intersection_set(tail(set1), set2)
        : intersection_set(set1, tail(set2));
  }
}
`;

/**
 * Intersection in both list representations, measured at four sizes each.
 * The unordered version is renamed so that both can live in one program.
 */
export const setGrowthProgram = `function is_element_of_unordered(x, set) {
  return is_null(set)
    ? false
    : equal(x, head(set))
      ? true
      : is_element_of_unordered(x, tail(set));
}

function intersection_unordered(set1, set2) {
  return is_null(set1) || is_null(set2)
    ? null
    : is_element_of_unordered(head(set1), set2)
      ? pair(head(set1), intersection_unordered(tail(set1), set2))
      : intersection_unordered(tail(set1), set2);
}

function intersection_ordered(set1, set2) {
  if (is_null(set1) || is_null(set2)) {
    return null;
  } else {
    const x1 = head(set1);
    const x2 = head(set2);
    return x1 === x2
      ? pair(x1, intersection_ordered(tail(set1), tail(set2)))
      : x1 < x2
        ? intersection_ordered(tail(set1), set2)
        : intersection_ordered(set1, tail(set2));
  }
}

// The intersection of {1, ..., n} with itself, in each representation.
function unordered(n) {
  return length(intersection_unordered(enum_list(1, n), enum_list(1, n)));
}

function ordered(n) {
  return length(intersection_ordered(enum_list(1, n), enum_list(1, n)));
}

unordered(10);
unordered(20);
unordered(40);
unordered(80);
ordered(10);
ordered(20);
ordered(40);
ordered(80);
`;

export const treeDefinitions = `function entry(tree) {
  return head(tree);
}

function left_branch(tree) {
  return head(tail(tree));
}

function right_branch(tree) {
  return head(tail(tail(tree)));
}

function make_tree(entry, left, right) {
  return list(entry, left, right);
}
`;

export const treeSetDefinitions = `${treeDefinitions}
function is_element_of_set(x, set) {
  return is_null(set)
    ? false
    : x === entry(set)
      ? true
      : x < entry(set)
        ? is_element_of_set(x, left_branch(set))
        : is_element_of_set(x, right_branch(set));
}

function adjoin_set(x, set) {
  return is_null(set)
    ? make_tree(x, null, null)
    : x === entry(set)
      ? set
      : x < entry(set)
        ? make_tree(entry(set),
                    adjoin_set(x, left_branch(set)),
                    right_branch(set))
        : make_tree(entry(set),
                    left_branch(set),
                    adjoin_set(x, right_branch(set)));
}
`;

/** The three trees of figure 2.16, each the set {1, 3, 5, 7, 9, 11}. */
export const figureTreesDefinitions = `function leaf(x) {
  return make_tree(x, null, null);
}

const tree_a = make_tree(7, make_tree(3, leaf(1), leaf(5)),
                            make_tree(9, null, leaf(11)));
const tree_b = make_tree(3, leaf(1),
                            make_tree(7, leaf(5),
                                         make_tree(9, null, leaf(11))));
const tree_c = make_tree(5, make_tree(3, leaf(1), null),
                            make_tree(9, leaf(7), leaf(11)));
`;

export const treeSetProgram = `${treeSetDefinitions}
${figureTreesDefinitions}
is_element_of_set(11, tree_a) && is_element_of_set(11, tree_b)
  && !is_element_of_set(4, tree_c);
`;

/** Figure 2.17: adjoining 1 through 7 in order makes a tree that is really a list. */
export const unbalancedTreeProgram = `${treeSetDefinitions}
function adjoin_all(elements, set) {
  return is_null(elements)
    ? set
    : adjoin_all(tail(elements), adjoin_set(head(elements), set));
}

function depth(tree) {
  return is_null(tree)
    ? 0
    : 1 + math_max(depth(left_branch(tree)), depth(right_branch(tree)));
}

const unbalanced = adjoin_all(list(1, 2, 3, 4, 5, 6, 7), null);
const balanced = adjoin_all(list(4, 2, 6, 1, 3, 5, 7), null);

display(depth(unbalanced));
depth(balanced);
`;

export const lookupProgram = `function make_record(key, name, salary) {
  return list(key, name, salary);
}

function key(record) {
  return head(record);
}

function lookup(given_key, set_of_records) {
  return is_null(set_of_records)
    ? false
    : equal(given_key, key(head(set_of_records)))
      ? head(set_of_records)
      : lookup(given_key, tail(set_of_records));
}

const personnel = list(make_record(17, "Ben Bitdiddle", 60000),
                       make_record(4, "Alyssa P. Hacker", 40000),
                       make_record(23, "Cy D. Fect", 35000));

display(lookup(5, personnel));
lookup(4, personnel);
`;

/* §2.3.4 Huffman encoding trees */

export const huffmanTreeDefinitions = `function make_leaf(symbol, weight) {
  return list("leaf", symbol, weight);
}

function is_leaf(object) {
  return head(object) === "leaf";
}

function symbol_leaf(x) {
  return head(tail(x));
}

function weight_leaf(x) {
  return head(tail(tail(x)));
}

function make_code_tree(left, right) {
  return list("code_tree", left, right,
              append(symbols(left), symbols(right)),
              weight(left) + weight(right));
}

function left_branch(tree) {
  return head(tail(tree));
}

function right_branch(tree) {
  return head(tail(tail(tree)));
}

function symbols(tree) {
  return is_leaf(tree)
    ? list(symbol_leaf(tree))
    : head(tail(tail(tail(tree))));
}

function weight(tree) {
  return is_leaf(tree)
    ? weight_leaf(tree)
    : head(tail(tail(tail(tail(tree)))));
}
`;

export const decodeDefinitions = `function decode(bits, tree) {
  function decode_1(bits, current_branch) {
    if (is_null(bits)) {
      return null;
    } else {
      const next_branch = choose_branch(head(bits), current_branch);
      return is_leaf(next_branch)
        ? pair(symbol_leaf(next_branch), decode_1(tail(bits), tree))
        : decode_1(tail(bits), next_branch);
    }
  }
  return decode_1(bits, tree);
}

function choose_branch(bit, branch) {
  return bit === 0
    ? left_branch(branch)
    : bit === 1
      ? right_branch(branch)
      : error(bit, "bad bit -- choose_branch");
}
`;

/** The tree of figure 2.18, built by hand in the order the algorithm merged it. */
export const figureHuffmanTreeDefinition = `const tree = make_code_tree(
  make_leaf("A", 8),
  make_code_tree(
    make_code_tree(make_leaf("B", 3),
                   make_code_tree(make_leaf("C", 1), make_leaf("D", 1))),
    make_code_tree(make_code_tree(make_leaf("E", 1), make_leaf("F", 1)),
                   make_code_tree(make_leaf("G", 1), make_leaf("H", 1)))));
`;

export const decodeProgram = `${huffmanTreeDefinitions}
${decodeDefinitions}
${figureHuffmanTreeDefinition}
decode(list(1, 0, 0, 0, 1, 0, 1, 0), tree);
`;

export const leafSetDefinitions = `function adjoin_set(x, set) {
  return is_null(set)
    ? list(x)
    : weight(x) < weight(head(set))
      ? pair(x, set)
      : pair(head(set), adjoin_set(x, tail(set)));
}

function make_leaf_set(pairs) {
  if (is_null(pairs)) {
    return null;
  } else {
    const first_pair = head(pairs);
    return adjoin_set(make_leaf(head(first_pair),         // symbol
                                head(tail(first_pair))),  // frequency
                      make_leaf_set(tail(pairs)));
  }
}
`;

export const leafSetProgram = `${huffmanTreeDefinitions}
${leafSetDefinitions}
make_leaf_set(list(list("A", 4), list("B", 2), list("C", 1), list("D", 1)));
`;

/** Exercise 2.68's \`encode\` with one way of writing \`encode_symbol\`. */
export const encodeDefinitions = `function encode(message, tree) {
  return is_null(message)
    ? null
    : append(encode_symbol(head(message), tree),
             encode(tail(message), tree));
}

function contains(symbol, symbols) {
  return !is_null(symbols) && (symbol === head(symbols) || contains(symbol, tail(symbols)));
}

function encode_symbol(symbol, tree) {
  return is_leaf(tree)
    ? null
    : contains(symbol, symbols(left_branch(tree)))
      ? pair(0, encode_symbol(symbol, left_branch(tree)))
      : contains(symbol, symbols(right_branch(tree)))
        ? pair(1, encode_symbol(symbol, right_branch(tree)))
        : error(symbol, "symbol not in tree -- encode_symbol");
}
`;

/** Exercise 2.69's \`successive_merge\`, and the generator built on it. */
export const generateHuffmanDefinitions = `function successive_merge(set) {
  return is_null(tail(set))
    ? head(set)
    : successive_merge(adjoin_set(make_code_tree(head(set), head(tail(set))),
                                  tail(tail(set))));
}

function generate_huffman_tree(pairs) {
  return successive_merge(make_leaf_set(pairs));
}
`;
