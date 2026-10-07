import type { HeapPair, HeapSnapshot, HeapValue } from '@sicp/lab';

/**
 * Box-and-pointer diagrams (§3.3) laid out from the Laboratory's heap
 * snapshots. Each pair is a box of two cells; a list runs to the right along
 * its tails, and a pair in a head hangs below. A pair reached twice is drawn
 * once, with two arrows into it, and a pointer back along a list (a cycle)
 * loops underneath. Pure functions, tested in node.
 */

export const CELL = 34;
export const BOX_W = CELL * 2;
export const BOX_H = 26;
export const COL_W = BOX_W + 38;
/** Room above each row for the names of the pairs in it. */
export const LABEL = 18;
export const ROW_H = BOX_H + LABEL + 26;
export const PAD = 14;
const CHAR_W = 7.1;

export interface PlacedBox {
  id: number;
  col: number;
  row: number;
  /** Top-left corner. */
  x: number;
  y: number;
  head: HeapValue;
  tail: HeapValue;
}

export interface PlacedPointer {
  /** `3:head`, `3:tail`, or `name:x`. */
  key: string;
  /** SVG path data, from the cell's dot (or the name) to the box pointed at. */
  d: string;
  target: number;
}

export interface PlacedName {
  /** Every name bound to this pair, in declaration order. */
  names: string[];
  target: number;
  /** Where the text sits: left of a box in the first column, above any other. */
  x: number;
  y: number;
  /** `left` of a box in the first column, with an arrow; `above` any other box. */
  side: 'left' | 'above';
}

export interface BoxPointerLayout {
  boxes: PlacedBox[];
  pointers: PlacedPointer[];
  names: PlacedName[];
  /** Bindings whose value is not a pair, as `name: text`. */
  others: { name: string; text: string }[];
  width: number;
  height: number;
}

const isPairRef = (value: HeapValue): value is Extract<HeapValue, { kind: 'pair' }> => value.kind === 'pair';

/**
 * True when `p` is a pair of two pointers into the same list, the tail one at
 * or beyond the head one: a queue (§3.3.2), or `pair(x, x)`. Its list is hung
 * underneath it rather than continued to its right.
 */
function isPointerPair(p: HeapPair, byId: ReadonlyMap<number, HeapPair>): boolean {
  if (!isPairRef(p.head) || !isPairRef(p.tail)) return false;
  const seen = new Set<number>();
  for (let at: HeapPair | undefined = byId.get(p.head.id); at !== undefined && !seen.has(at.id); ) {
    if (at.id === p.tail.id) return true;
    seen.add(at.id);
    at = isPairRef(at.tail) ? byId.get(at.tail.id) : undefined;
  }
  return false;
}

/** Grid positions: lists along rows, heads hanging below, each structure in a band of its own. */
export function placePairs(snapshot: Pick<HeapSnapshot, 'bindings' | 'pairs'>): Map<number, { col: number; row: number }> {
  const byId = new Map(snapshot.pairs.map((p) => [p.id, p]));
  const at = new Map<number, { col: number; row: number }>();
  const occupied = new Set<string>();
  let rows = 0;
  const cell = (col: number, row: number): string => `${col},${row}`;
  const put = (id: number, col: number, row: number): void => {
    at.set(id, { col, row });
    occupied.add(cell(col, row));
    rows = Math.max(rows, row + 1);
  };

  /** The pairs `id`'s chain would take: along tails while they are new, stopping after a queue's pointer pair. */
  const chainFrom = (id: number): HeapPair[] => {
    const chain: HeapPair[] = [];
    const taken = new Set<number>();
    for (let p = byId.get(id); p !== undefined && !at.has(p.id) && !taken.has(p.id); ) {
      chain.push(p);
      taken.add(p.id);
      if (isPointerPair(p, byId)) break;
      p = isPairRef(p.tail) ? byId.get(p.tail.id) : undefined;
    }
    return chain;
  };

  const placeChain = (id: number, col: number, row: number): void => {
    const chain = chainFrom(id);
    chain.forEach((p, i) => put(p.id, col + i, row));
    // Right to left, so that each hanging list starts left of the ones already
    // hung and the arrow down to it never crosses them.
    for (let i = chain.length - 1; i >= 0; i--) {
      const p = chain[i] as HeapPair;
      if (!isPairRef(p.head) || at.has(p.head.id)) continue;
      const below = chainFrom(p.head.id).length;
      placeChain(p.head.id, col + i, freeRow(col + i, row, below));
    }
  };

  /** The first row under `row` with `length` free cells from `col` and a clear way down to it. */
  const freeRow = (col: number, row: number, length: number): number => {
    for (let r = row + 1; ; r++) {
      let free = true;
      for (let c = col; c < col + length && free; c++) free = !occupied.has(cell(c, r));
      if (free) return r;
      if (occupied.has(cell(col, r))) return rows;
    }
  };

  for (const binding of snapshot.bindings) {
    if (isPairRef(binding.value) && !at.has(binding.value.id) && byId.has(binding.value.id)) placeChain(binding.value.id, 0, rows);
  }
  return at;
}

/** A path from a cell's dot to the box it points at, routed by where that box is. */
export function pointerPath(from: { x: number; y: number }, target: { x: number; y: number }, sameRowBetween: boolean): string {
  const { x: fx, y: fy } = from;
  const tx = target.x;
  const ty = target.y;
  const headX = tx + CELL / 2;
  if (Math.abs(ty - (fy - BOX_H / 2)) < 1) {
    // The same row.
    if (tx > fx && !sameRowBetween) return `M ${fx} ${fy} L ${tx} ${ty + BOX_H / 2}`;
    if (tx > fx) {
      const lift = ty - LABEL - 4;
      return `M ${fx} ${fy} C ${fx} ${lift}, ${headX} ${lift}, ${headX} ${ty}`;
    }
    // Back along the row, or to itself: loop underneath.
    const drop = ty + BOX_H + 22;
    return `M ${fx} ${fy} C ${fx + 10} ${drop}, ${headX} ${drop}, ${headX} ${ty + BOX_H}`;
  }
  if (ty > fy) {
    if (Math.abs(headX - fx) < 1) return `M ${fx} ${fy} L ${headX} ${ty}`;
    const mid = (fy + ty) / 2;
    return `M ${fx} ${fy} C ${fx} ${mid}, ${headX} ${mid}, ${headX} ${ty}`;
  }
  // Up to a box in an earlier band: enter it from below.
  const mid = (fy + ty + BOX_H) / 2;
  return `M ${fx} ${fy} C ${fx} ${mid}, ${headX} ${mid}, ${headX} ${ty + BOX_H}`;
}

export function layoutBoxPointer(snapshot: Pick<HeapSnapshot, 'bindings' | 'pairs'>): BoxPointerLayout {
  const grid = placePairs(snapshot);
  const pairNames = new Map<number, string[]>();
  const others: { name: string; text: string }[] = [];
  for (const binding of snapshot.bindings) {
    if (binding.value.kind === 'pair') {
      if (grid.has(binding.value.id)) pairNames.set(binding.value.id, [...(pairNames.get(binding.value.id) ?? []), binding.name]);
    } else if (binding.value.kind !== 'function') {
      others.push({ name: binding.name, text: binding.value.kind === 'null' ? 'null' : binding.value.text });
    }
  }

  // Names of pairs in the first column sit in a gutter to the left.
  const leftNames = [...pairNames].filter(([id]) => grid.get(id)?.col === 0).map(([, names]) => names.join(', '));
  const gutter = leftNames.length === 0 ? 0 : Math.max(...leftNames.map((text) => text.length)) * CHAR_W + 26;

  const boxes: PlacedBox[] = snapshot.pairs.flatMap((p) => {
    const spot = grid.get(p.id);
    if (spot === undefined) return [];
    return [{ id: p.id, col: spot.col, row: spot.row, x: PAD + gutter + spot.col * COL_W, y: PAD + LABEL + spot.row * ROW_H, head: p.head, tail: p.tail }];
  });
  const byId = new Map(boxes.map((box) => [box.id, box]));
  const occupied = new Set(boxes.map((box) => `${box.col},${box.row}`));

  const pointers: PlacedPointer[] = [];
  for (const box of boxes) {
    for (const part of ['head', 'tail'] as const) {
      const value = box[part];
      if (!isPairRef(value)) continue;
      const target = byId.get(value.id);
      if (target === undefined) continue;
      let between = false;
      if (target.row === box.row) for (let c = box.col + 1; c < target.col && !between; c++) between = occupied.has(`${c},${box.row}`);
      const from = { x: box.x + (part === 'head' ? CELL / 2 : CELL * 1.5), y: box.y + BOX_H / 2 };
      pointers.push({ key: `${box.id}:${part}`, d: pointerPath(from, target, between), target: target.id });
    }
  }

  const names: PlacedName[] = [];
  for (const [id, list] of pairNames) {
    const box = byId.get(id);
    if (box === undefined) continue;
    if (box.col === 0) {
      const y = box.y + BOX_H / 2;
      names.push({ names: list, target: id, x: box.x - 22, y, side: 'left' });
      pointers.push({ key: `name:${list.join(',')}`, d: `M ${box.x - 18} ${y} L ${box.x} ${y}`, target: id });
    } else {
      names.push({ names: list, target: id, x: box.x + BOX_W, y: box.y - 6, side: 'above' });
    }
  }

  const cols = Math.max(1, ...boxes.map((box) => box.col + 1));
  const rows = Math.max(1, ...boxes.map((box) => box.row + 1));
  const width = PAD * 2 + gutter + cols * COL_W - (COL_W - BOX_W);
  const height = PAD * 2 + LABEL + rows * ROW_H - (ROW_H - BOX_H) + 24;
  return { boxes, pointers, names, others, width, height };
}

export interface BoxPointerFrame {
  snapshot: HeapSnapshot;
  layout: BoxPointerLayout;
  /** Pairs that were not in the previous keyframe. */
  added: Set<number>;
  /** Cells whose contents changed since the previous keyframe, as `id:head` or `id:tail`. */
  changed: Set<string>;
  /** Pairs of the previous keyframe that nothing reaches any more. */
  dropped: number;
  caption: string;
  /** The step record the keyframe follows, for step-mode editors. */
  at: number;
}

const same = (a: HeapValue, b: HeapValue): boolean => JSON.stringify(a) === JSON.stringify(b);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

function describe(text: string, added: number, changed: number, dropped: number, reassigned: string[]): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`${plural(added, 'new pair', 'new pairs')}`);
  if (changed > 0) parts.push(`${plural(changed, 'pointer', 'pointers')} changed in place`);
  if (reassigned.length > 0) parts.push(`${reassigned.map((n) => `\`${n}\``).join(', ')} now ${reassigned.length === 1 ? 'names' : 'name'} something else`);
  if (dropped > 0) parts.push(`${plural(dropped, 'pair', 'pairs')} no longer reachable`);
  return `\`${text}\`: ${parts.length === 0 ? 'no pair changed' : parts.join('; ')}.`;
}

/**
 * One keyframe per top-level statement that is not a function declaration,
 * each with what the statement did to the pairs: made new ones, changed a
 * head or tail of an old one, or left some unreachable.
 */
export function boxPointerFrames(heap: readonly HeapSnapshot[] | undefined): BoxPointerFrame[] {
  const frames: BoxPointerFrame[] = [];
  let previous: HeapSnapshot | null = null;
  for (const snapshot of heap ?? []) {
    if (snapshot.node?.kind === 'function') continue;
    const before = new Map((previous?.pairs ?? []).map((p) => [p.id, p]));
    const now = new Set(snapshot.pairs.map((p) => p.id));
    const added = new Set<number>();
    const changed = new Set<string>();
    for (const p of snapshot.pairs) {
      const old = before.get(p.id);
      if (old === undefined) {
        added.add(p.id);
        continue;
      }
      if (!same(old.head, p.head)) changed.add(`${p.id}:head`);
      if (!same(old.tail, p.tail)) changed.add(`${p.id}:tail`);
    }
    const dropped = [...before.keys()].filter((id) => !now.has(id)).length;
    const oldBindings = new Map((previous?.bindings ?? []).map((b) => [b.name, b.value]));
    const reassigned = snapshot.bindings.filter((b) => {
      const old = oldBindings.get(b.name);
      return old !== undefined && !same(old, b.value) && b.value.kind !== 'function';
    });
    frames.push({
      snapshot,
      layout: layoutBoxPointer(snapshot),
      added,
      changed,
      dropped,
      caption:
        describe(snapshot.node?.text ?? 'the program', added.size, changed.size, dropped, reassigned.map((b) => b.name)) +
        (snapshot.truncated ? ' Only the first pairs are drawn.' : ''),
      at: snapshot.records,
    });
    previous = snapshot;
  }
  return frames;
}

/** Text for an atom in a cell, shortened to fit. */
export function cellText(value: HeapValue, max = 5): string | null {
  if (value.kind === 'atom') return value.text.length <= max ? value.text : `${value.text.slice(0, max - 1)}…`;
  if (value.kind === 'function') return 'ƒ';
  return null;
}
