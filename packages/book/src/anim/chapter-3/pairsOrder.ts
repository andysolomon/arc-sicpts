/**
 * The order in which a stream of pairs of integers produces its pairs
 * (§3.5.3): read from what a program printed, and computed by two models,
 * `pairs` with `interleave` and `pairs` with `stream_append`, to compare it with.
 */

export type IntPair = readonly [i: number, j: number];

const LIST = /^list\((-?\d+), (-?\d+)\)$/;
const NESTED = /^\[(-?\d+), \[(-?\d+), null\]\]$/;
const PAIR = /^\[(-?\d+), (-?\d+)\]$/;

/**
 * The pairs of integers among the lines a program printed, in order. A pair
 * may be printed as `display_list` does (`list(1, 2)`) or as `display` does
 * (`[1, [2, null]]`, or `[1, 2]` for a pair that is not a list). Other lines
 * are ignored.
 */
export function pairsFromOutput(lines: readonly string[]): IntPair[] {
  const found: IntPair[] = [];
  for (const line of lines) {
    const match = LIST.exec(line.trim()) ?? NESTED.exec(line.trim()) ?? PAIR.exec(line.trim());
    if (match !== null) found.push([Number(match[1]), Number(match[2])]);
  }
  return found;
}

/** A lazy stream, as in the book: a head and a function that computes the rest. */
interface Lazy<T> {
  head: T;
  tail: () => Lazy<T> | null;
}

function interleave<T>(s1: Lazy<T> | null, s2: () => Lazy<T> | null): Lazy<T> | null {
  if (s1 === null) return s2();
  return { head: s1.head, tail: () => interleave(s2(), () => s1.tail()) };
}

function row(i: number, from: number): Lazy<IntPair> {
  return { head: [i, from], tail: () => row(i, from + 1) };
}

function interleavedFrom(i: number): Lazy<IntPair> {
  return { head: [i, i], tail: () => interleave(row(i, i + 1), () => interleavedFrom(i + 1)) };
}

function take<T>(s: Lazy<T> | null, n: number): T[] {
  const out: T[] = [];
  let current = s;
  while (current !== null && out.length < n) {
    out.push(current.head);
    current = current.tail();
  }
  return out;
}

/** The first `n` pairs of `pairs(integers, integers)` built with `interleave`. */
export const interleavedPairs = (n: number): IntPair[] => take(interleavedFrom(1), n);

/**
 * The first `n` pairs when the rows are joined with `stream_append`: the first
 * row is infinite, so nothing after it ever comes out.
 */
export const appendedPairs = (n: number): IntPair[] => Array.from({ length: Math.max(0, n) }, (_, k): IntPair => [1, k + 1]);

/** How many pairs precede (i, j), i ≤ j, in the interleaved stream (exercise 3.66). */
export function precedingCount(i: number, j: number): number {
  return i === j ? 2 ** i - 2 : 2 ** i * (j - i) + 2 ** (i - 1) - 2;
}

export type OrderName = 'interleave' | 'append' | 'other';

const samePairs = (a: readonly IntPair[], b: readonly IntPair[]): boolean =>
  a.length === b.length && a.every(([i, j], k) => b[k]?.[0] === i && b[k]?.[1] === j);

/** Which model, if either, produced these pairs. */
export function orderOf(pairs: readonly IntPair[]): OrderName {
  if (pairs.length === 0) return 'other';
  if (samePairs(pairs, interleavedPairs(pairs.length))) return 'interleave';
  if (samePairs(pairs, appendedPairs(pairs.length))) return 'append';
  return 'other';
}

/** The grid that shows the pairs: rows i and columns j from 1, at least 4 × 6, at most 6 × 10. */
export function gridSize(pairs: readonly IntPair[]): { rows: number; cols: number } {
  const maxI = Math.max(0, ...pairs.map(([i]) => i));
  const maxJ = Math.max(0, ...pairs.map(([, j]) => j));
  const rows = Math.min(6, Math.max(4, maxI));
  const cols = Math.min(10, Math.max(6, rows, maxJ));
  return { rows, cols };
}

/** How many of the pairs come from each row, for rows 1 to `rows`. */
export function rowShares(pairs: readonly IntPair[], rows: number): number[] {
  const counts = Array.from({ length: rows }, () => 0);
  for (const [i] of pairs) if (i >= 1 && i <= rows) counts[i - 1] = (counts[i - 1] ?? 0) + 1;
  return counts;
}
