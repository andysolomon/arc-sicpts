import { describe, expect, it } from 'vitest';
import { evaluate, prepare } from '../evaluator/evaluate.ts';
import { stringify } from '../evaluator/values.ts';
import { processShape } from '../inspect/processShape.ts';
import {
  decodeProgram,
  derivProgram,
  derivSelectorDefinitions,
  encodeDefinitions,
  figureHuffmanTreeDefinition,
  generateHuffmanDefinitions,
  huffmanTreeDefinitions,
  leafSetDefinitions,
  leafSetProgram,
  lookupProgram,
  memberProgram,
  quotationProgram,
  setGrowthProgram,
  simplifyingDerivProgram,
  treeSetProgram,
  unbalancedTreeProgram,
  unorderedSetProgram,
} from './symbolicData.ts';

/** The value of a program in box notation, and what it displayed. */
const run = (source: string, prelude?: string): { value: string; output: readonly string[] } => {
  const outcome = evaluate(source, { ...(prelude !== undefined && { prelude }) });
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return { value: stringify(outcome.value), output: outcome.output };
};

/** `expr` evaluated after `source`, in list notation. */
const after = (source: string, expr: string, prelude?: string): string => {
  const outcome = evaluate(`${source}\nlist_to_string(${expr});`, { ...(prelude !== undefined && { prelude }) });
  if (outcome.status !== 'done') throw new Error(`${outcome.status}: ${JSON.stringify(outcome)}`);
  return String(outcome.value);
};

/** How many times `fn` is applied while `call` is evaluated after `source`. */
const applications = (source: string, call: string, fn: string): number => {
  const session = prepare(source, { budget: 5_000_000 });
  session.machine.run();
  let count = 0;
  const machine = session.follow(`${call};`, { budget: 5_000_000, hooks: [{ onCall: (info) => void (info.name === fn && count++) }] });
  machine.run();
  if (machine.status !== 'done') throw new Error(machine.status);
  return count;
};

describe('section 2.3.1: strings', () => {
  it('tells names from strings', () => {
    expect(run(quotationProgram).output).toEqual(['list(1, 2)', 'list("a", "b")', 'list("a", 2)']);
  });

  it('member returns null or the sublist from the first occurrence', () => {
    const { value, output } = run(memberProgram);
    expect(output).toEqual(['null']);
    expect(value).toBe('["apple", ["pear", null]]');
  });

  it('compares strings by their characters', () => {
    expect(evaluate(`'"' === "";`)).toMatchObject({ status: 'done', value: false });
    expect(evaluate(`'say "your name" aloud' === "say 'your name' aloud";`)).toMatchObject({ value: false });
    expect(evaluate(`"ab" === "a" + "b";`)).toMatchObject({ value: true });
  });
});

describe('section 2.3.2: symbolic differentiation', () => {
  it('differentiates correctly, without simplifying', () => {
    const { value, output } = run(derivProgram);
    expect(output).toEqual(['list("+", 1, 0)', 'list("+", list("*", "x", 0), list("*", 1, "y"))']);
    expect(after(derivProgram, 'deriv(expression, "x")')).toBe(
      'list("+", list("*", list("*", "x", "y"), list("+", 1, 0)), list("*", list("+", list("*", "x", 0), list("*", 1, "y")), list("+", "x", 3)))',
    );
    // 27 pairs for what is really xy + y(x + 3).
    expect(value.match(/\[/g)).toHaveLength(27);
  });

  it('simplifies in the constructors, with deriv unchanged', () => {
    const { output } = run(simplifyingDerivProgram, derivSelectorDefinitions);
    expect(output).toEqual(['1', '"y"']);
    expect(after(simplifyingDerivProgram, 'deriv(expression, "x")', derivSelectorDefinitions)).toBe(
      'list("+", list("*", "x", "y"), list("*", "y", list("+", "x", 3)))',
    );
  });
});

describe('section 2.3.3: sets', () => {
  it('unordered sets compare elements with equal', () => {
    const { value, output } = run(unorderedSetProgram);
    expect(output).toEqual(['true']);
    expect(value).toBe('[4, [3, null]]');
    expect(after(unorderedSetProgram, 'set1')).toBe('list(4, 1, 2, 3)');
    expect(after(unorderedSetProgram, 'set2')).toBe('list(3, 4, 5, 6)');
  });

  it('intersection takes Θ(n²) calls unordered and Θ(n) ordered', () => {
    const { snapshot, outcome } = processShape(setGrowthProgram, { budget: 1_000_000 });
    expect(outcome.status).toBe('done');
    expect(snapshot.runs.map((r) => `${r.label}: ${r.calls}`)).toEqual([
      'unordered(10): 156',
      'unordered(20): 506',
      'unordered(40): 1806',
      'unordered(80): 6806',
      'ordered(10): 46',
      'ordered(20): 86',
      'ordered(40): 166',
      'ordered(80): 326',
    ]);
  });

  it('the trees of figure 2.16 each hold the same set', () => {
    expect(run(treeSetProgram).value).toBe('true');
    for (const tree of ['tree_a', 'tree_b', 'tree_c']) {
      const inOrder = `${treeSetProgram}
function flatten(t) {
  return is_null(t) ? null : append(flatten(head(tail(t))), pair(head(t), flatten(head(tail(tail(t))))));
}`;
      expect(after(inOrder, `flatten(${tree})`)).toBe('list(1, 3, 5, 7, 9, 11)');
    }
  });

  it('adjoining 1 to 7 in order makes a tree of depth 7; another order gives depth 3', () => {
    const { value, output } = run(unbalancedTreeProgram);
    expect(output).toEqual(['7']);
    expect(value).toBe('3');
    expect(after(unbalancedTreeProgram, 'unbalanced')).toBe(
      'list(1, null, list(2, null, list(3, null, list(4, null, list(5, null, list(6, null, list(7, null, null)))))))',
    );
  });

  it('looks records up by key', () => {
    const { value, output } = run(lookupProgram);
    expect(output).toEqual(['false']);
    expect(value).toBe('[4, ["Alyssa P. Hacker", [40000, null]]]');
  });
});

describe('section 2.3.4: Huffman encoding trees', () => {
  it('decodes 10001010 as BAC with the tree of figure 2.18', () => {
    expect(run(decodeProgram).value).toBe('["B", ["A", ["C", null]]]');
    expect(after(decodeProgram, 'symbols(tree)')).toBe('list("A", "B", "C", "D", "E", "F", "G", "H")');
    expect(after(decodeProgram, 'weight(tree)')).toBe('17');
  });

  it('orders the leaf set by weight, lightest first', () => {
    expect(after(leafSetProgram, 'map(symbol_leaf, make_leaf_set(list(list("A", 4), list("B", 2), list("C", 1), list("D", 1))))')).toBe(
      'list("D", "C", "B", "A")',
    );
  });

  const huffman = `${huffmanTreeDefinitions}
${leafSetDefinitions}
${generateHuffmanDefinitions}
${encodeDefinitions}
${figureHuffmanTreeDefinition}`;

  it('encodes the message of the text in 42 bits, against 54 for three bits a symbol', () => {
    const message = 'list("B", "A", "C", "A", "D", "A", "E", "A", "F", "A", "B", "B", "A", "A", "A", "G", "A", "H")';
    expect(after(huffman, `length(encode(${message}, tree))`)).toBe('42');
    expect(after(huffman, `3 * length(${message})`)).toBe('54');
    expect(after(huffman, 'encode(list("D"), tree)')).toBe('list(1, 0, 1, 1)');
  });

  it('encodes the rock song in 84 bits, against 108 for a fixed-length code', () => {
    const song = `list("GET", "A", "JOB", "SHA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA",
      "GET", "A", "JOB", "SHA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA",
      "WAH", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "YIP", "SHA", "BOOM")`;
    const pairs = 'list(list("A", 2), list("NA", 16), list("BOOM", 1), list("SHA", 3), list("GET", 2), list("YIP", 9), list("JOB", 2), list("WAH", 1))';
    expect(after(huffman, `length(encode(${song}, generate_huffman_tree(${pairs})))`)).toBe('84');
    expect(after(huffman, `length(${song})`)).toBe('36');
  });

  it('frequencies 1, 2, 4, …, 2ⁿ⁻¹ make a vine: 1 bit for the most frequent, n − 1 for the least', () => {
    const powers = `${huffman}
function powers_of_two(n) {
  return build_list(i => list("s" + stringify(i), math_pow(2, i)), n);
}`;
    for (const n of [5, 10]) {
      expect(after(powers, `length(encode(list("s${n - 1}"), generate_huffman_tree(powers_of_two(${n}))))`)).toBe('1');
      expect(after(powers, `length(encode(list("s0"), generate_huffman_tree(powers_of_two(${n}))))`)).toBe(String(n - 1));
      // Exercise 2.72: n + 1 searches for the most frequent symbol, n − 1 for the least.
      expect(applications(powers, `encode_symbol("s${n - 1}", generate_huffman_tree(powers_of_two(${n})))`, 'contains')).toBe(n + 1);
      expect(applications(powers, `encode_symbol("s0", generate_huffman_tree(powers_of_two(${n})))`, 'contains')).toBe(n - 1);
    }
  });
});
