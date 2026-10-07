import type { Trace } from '../useTrace.ts';

/**
 * Box-and-pointer diagrams (§2.2). The evaluator reports values in box
 * notation, `[1, [2, null]]`, so a diagram can be rebuilt from the text of a
 * value. What the text cannot show is sharing: a pair reached twice is drawn
 * twice.
 */

export type Datum = { kind: 'pair'; head: Datum; tail: Datum } | { kind: 'atom'; text: string };

/** Read a value in the evaluator's text form; `null` when the text is not one. */
export function parseValue(text: string): Datum | null {
  let i = 0;
  const skip = () => {
    while (text[i] === ' ') i++;
  };
  const read = (): Datum | null => {
    skip();
    if (text[i] === '[') {
      if (text.startsWith('[...]', i)) {
        i += 5;
        return { kind: 'atom', text: '…' };
      }
      i++;
      const head = read();
      skip();
      if (head === null || text[i] !== ',') return null;
      i++;
      const tail = read();
      skip();
      if (tail === null || text[i] !== ']') return null;
      i++;
      return { kind: 'pair', head, tail };
    }
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      if (j >= text.length) return null;
      const atom = text.slice(i, j + 1);
      i = j + 1;
      return { kind: 'atom', text: atom };
    }
    // Numbers, booleans, null, undefined, fn[E1] and primitive[name].
    const match = /^(?:fn\[[^\]]*\]|primitive\[[^\]]*\]|[^,\]\s]+)/.exec(text.slice(i));
    if (match === null) return null;
    i += match[0].length;
    return { kind: 'atom', text: match[0] };
  };
  const datum = read();
  skip();
  return datum !== null && i === text.length ? datum : null;
}

export const isNull = (d: Datum): boolean => d.kind === 'atom' && d.text === 'null';

export function countPairs(d: Datum): number {
  return d.kind === 'pair' ? 1 + countPairs(d.head) + countPairs(d.tail) : 0;
}

/** The elements of a proper list, or `null` when the tail chain does not end in null. */
export function listItems(d: Datum): Datum[] | null {
  const items: Datum[] = [];
  let at = d;
  while (at.kind === 'pair') {
    items.push(at.head);
    at = at.tail;
  }
  return isNull(at) ? items : null;
}

/** List notation for a value, e.g. `list(1, list(2, 3))`, as `display_list` prints it. */
export function listNotation(d: Datum): string {
  if (d.kind === 'atom') return d.text;
  const items = listItems(d);
  if (items !== null) return `list(${items.map(listNotation).join(', ')})`;
  return `pair(${listNotation(d.head)}, ${listNotation(d.tail)})`;
}

/* Layout. A pair is two cells; tails point right, heads point down. */

export const CELL = 22;
export const PAIR_WIDTH = CELL * 2;
export const ROW = 62;
export const GAP = 30;
const CHAR = 7.4;

export const atomWidth = (text: string): number => Math.max(CELL, Math.min(text.length, 18) * CHAR + 12);
export const atomLabel = (text: string): string => (text.length > 18 ? `${text.slice(0, 17)}…` : text);

export interface PairBox {
  id: string;
  x: number;
  y: number;
  /** The head cell holds a slash when the head is null. */
  headNull: boolean;
  tailNull: boolean;
}

export interface AtomBox {
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
}

export interface Pointer {
  id: string;
  from: [number, number];
  to: [number, number];
}

export interface Diagram {
  pairs: PairBox[];
  atoms: AtomBox[];
  pointers: Pointer[];
  width: number;
  height: number;
  /** True when the value had more pairs than are drawn. */
  clipped: boolean;
}

export const MAX_PAIRS = 80;

/**
 * Lay a value out as boxes and arrows. Each list element gets a column as
 * wide as whatever hangs below it, so nothing overlaps.
 */
export function layout(datum: Datum, maxPairs = MAX_PAIRS): Diagram {
  const pairs: PairBox[] = [];
  const atoms: AtomBox[] = [];
  const pointers: Pointer[] = [];
  let clipped = false;
  let bottom = 0;

  /** Draw `d` with its top-left at (x, y); return the width it took. */
  const place = (d: Datum, x: number, y: number, path: string): number => {
    bottom = Math.max(bottom, y + CELL);
    if (d.kind === 'atom' || pairs.length >= maxPairs) {
      if (d.kind === 'pair') clipped = true;
      const text = d.kind === 'atom' ? atomLabel(d.text) : '…';
      const width = atomWidth(text);
      atoms.push({ id: path, x, y, width, text });
      return width;
    }
    const box: PairBox = { id: path, x, y, headNull: isNull(d.head), tailNull: isNull(d.tail) };
    pairs.push(box);

    let column = PAIR_WIDTH;
    if (!box.headNull) {
      const below = place(d.head, x, y + ROW, `${path}h`);
      pointers.push({ id: `${path}h`, from: [x + CELL / 2, y + CELL / 2], to: [x + CELL / 2, y + ROW] });
      column = Math.max(column, below);
    }
    if (box.tailNull) return column;
    const right = x + column + GAP;
    pointers.push({ id: `${path}t`, from: [x + CELL * 1.5, y + CELL / 2], to: [right, y + CELL / 2] });
    return column + GAP + place(d.tail, right, y, `${path}t`);
  };

  const width = place(datum, 0, 0, 'p');
  return { pairs, atoms, pointers, width, height: bottom, clipped };
}

/** One value worth drawing: a top-level name bound to a pair, or the program's value. */
export interface Structure {
  label: string;
  text: string;
  datum: Datum;
  statement: number | null;
}

/**
 * The structures a program builds, in the order it builds them: every
 * top-level declaration whose value is a pair, then the program's own value
 * when that is a pair too.
 */
export function structuresOf(trace: Trace | null, programFrame = 'E0'): Structure[] {
  if (trace === null) return [];
  const found: Structure[] = [];
  for (const record of trace.records) {
    const { event } = record;
    if (event.kind !== 'define' || record.env !== programFrame || !event.value.startsWith('[')) continue;
    const datum = parseValue(event.value);
    if (datum === null) continue;
    found.push({
      label: event.assignment ? `${event.symbol} (assigned)` : event.symbol,
      text: event.value,
      datum,
      statement: record.statement,
    });
  }
  const { outcome } = trace;
  if (outcome.status === 'done' && outcome.value.startsWith('[')) {
    const datum = parseValue(outcome.value);
    const last = found[found.length - 1];
    if (datum !== null && last?.text !== outcome.value) {
      found.push({ label: 'value of the program', text: outcome.value, datum, statement: null });
    }
  }
  return found;
}
