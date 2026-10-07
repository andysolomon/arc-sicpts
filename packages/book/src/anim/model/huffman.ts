import { listItems, structuresOf, type Datum } from './pairs.ts';
import type { Trace } from '../useTrace.ts';

/**
 * Huffman code trees (§2.3.4) read back from the values a program builds. A
 * leaf is `list("leaf", symbol, weight)` and a general tree
 * `list("code_tree", left, right, symbols, weight)`; anything else is not a
 * Huffman tree. A list whose items are all trees or leaves is a set of nodes,
 * such as `make_leaf_set` returns, and is drawn as a forest.
 */

export type HuffNode =
  | { kind: 'leaf'; symbol: string; weight: string }
  | { kind: 'tree'; left: HuffNode; right: HuffNode; symbols: string[]; weight: string };

/** `"A"` → `A`; other atoms as they are. */
const unquote = (text: string): string => (text.length >= 2 && text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text);

export function huffmanOf(d: Datum): HuffNode | null {
  const items = listItems(d);
  if (items === null) return null;
  const [tag, ...rest] = items;
  if (tag?.kind !== 'atom') return null;
  if (tag.text === '"leaf"' && rest.length === 2) {
    const [symbol, weight] = rest;
    if (symbol?.kind !== 'atom' || weight?.kind !== 'atom') return null;
    return { kind: 'leaf', symbol: unquote(symbol.text), weight: weight.text };
  }
  if (tag.text === '"code_tree"' && rest.length === 4) {
    const [l, r, syms, weight] = rest;
    const left = l === undefined ? null : huffmanOf(l);
    const right = r === undefined ? null : huffmanOf(r);
    const symbols = syms === undefined ? null : listItems(syms);
    if (left === null || right === null || symbols === null || weight?.kind !== 'atom') return null;
    return { kind: 'tree', left, right, symbols: symbols.map((s) => (s.kind === 'atom' ? unquote(s.text) : '?')), weight: weight.text };
  }
  return null;
}

/** A non-empty list of Huffman nodes, or null. */
export function forestOf(d: Datum): HuffNode[] | null {
  const items = listItems(d);
  if (items === null || items.length === 0) return null;
  const nodes = items.map(huffmanOf);
  return nodes.every((n): n is HuffNode => n !== null) ? nodes : null;
}

export const leafCount = (n: HuffNode): number => (n.kind === 'leaf' ? 1 : leafCount(n.left) + leafCount(n.right));

/** The bits that lead from `node` to the leaf for `symbol`, or null when it is not there. */
export function codeOf(node: HuffNode, symbol: string): string | null {
  if (node.kind === 'leaf') return node.symbol === symbol ? '' : null;
  const left = codeOf(node.left, symbol);
  if (left !== null) return `0${left}`;
  const right = codeOf(node.right, symbol);
  return right === null ? null : `1${right}`;
}

export interface HuffmanFrame {
  /** The name the structure is bound to, or `value of the program`. */
  label: string;
  /** One tree, or the members of a set of nodes. */
  nodes: HuffNode[];
  /** Whether `nodes` came from a list of nodes rather than a single tree. */
  forest: boolean;
  /** A symbol being traced from the root, and its code. */
  path: { symbol: string; bits: string } | null;
  caption: string;
}

const spaced = (bits: string): string => bits.split('').join(' ');
const directions = (bits: string): string => bits.split('').map((b) => (b === '0' ? 'left' : 'right')).join(', ');

/**
 * One keyframe per Huffman tree or set of nodes the program names. When the
 * program's value is a list of symbols, such as `decode` returns, the last
 * tree is followed by one keyframe per symbol, tracing its path from the root.
 */
export function huffmanFrames(trace: Trace | null): HuffmanFrame[] {
  const frames: HuffmanFrame[] = [];
  let last: HuffNode | null = null;
  let message: string[] | null = null;
  for (const s of structuresOf(trace)) {
    const tree = huffmanOf(s.datum);
    if (tree !== null) {
      last = tree;
      frames.push({
        label: s.label,
        nodes: [tree],
        forest: false,
        path: null,
        caption:
          tree.kind === 'leaf'
            ? `\`${s.label}\` is a single leaf, ${tree.symbol} of weight ${tree.weight}.`
            : `\`${s.label}\` is a Huffman tree of ${leafCount(tree)} leaves and weight ${tree.weight}. Each node shows the symbols below it and their total weight; a left branch is a 0, a right branch a 1.`,
      });
      continue;
    }
    const forest = forestOf(s.datum);
    if (forest !== null) {
      frames.push({
        label: s.label,
        nodes: forest,
        forest: true,
        path: null,
        caption: `\`${s.label}\` is a set of ${forest.length} node${forest.length === 1 ? '' : 's'}, in order of weight: ${forest
          .map((n) => (n.kind === 'leaf' ? `${n.symbol} ${n.weight}` : `${n.symbols.join(' ')} ${n.weight}`))
          .join(', ')}.`,
      });
      continue;
    }
    const items = s.label === 'value of the program' ? listItems(s.datum) : null;
    if (items !== null && items.length > 0 && items.every((d) => d.kind === 'atom' && d.text.startsWith('"'))) {
      message = items.map((d) => (d.kind === 'atom' ? unquote(d.text) : ''));
    }
  }
  if (last !== null && message !== null && message.length <= 40) {
    const tree = last;
    const codes = message.map((symbol) => codeOf(tree, symbol));
    if (codes.every((c): c is string => c !== null)) {
      const label = frames[frames.length - 1]?.label ?? 'tree';
      message.forEach((symbol, i) => {
        const bits = codes[i]!;
        frames.push({
          label,
          nodes: [tree],
          forest: false,
          path: { symbol, bits },
          caption: `${symbol} is ${spaced(bits)}: ${directions(bits)} from the root.`,
        });
      });
      const total = codes.reduce((sum, c) => sum + c.length, 0);
      frames.push({
        label,
        nodes: [tree],
        forest: false,
        path: null,
        caption: `The value of the program is the message ${message.join(' ')}: ${message.length} symbol${message.length === 1 ? '' : 's'} in ${total} bits, ${codes.join(' ')}.`,
      });
    }
  }
  return frames;
}
