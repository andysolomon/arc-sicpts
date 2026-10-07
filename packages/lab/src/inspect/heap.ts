import type { Environment } from '../evaluator/environment.ts';
import type { MachineHooks } from '../evaluator/machine.ts';
import { isPair, stringify, type Pair, type Value } from '../evaluator/values.ts';
import type { Loc, Node, Statement } from '../syntax/ast.ts';
import { excerpt } from './sourceText.ts';

/**
 * Snapshots of the program frame's bindings as a graph of values, for
 * box-and-pointer diagrams (§3.3). A pair is a node with an identity that
 * stays the same from snapshot to snapshot, so a picture can tell a new pair
 * from an old one whose tail was changed. Sharing and cycles survive: a pair
 * reached twice is listed once and referred to by its id. Everything is plain
 * JSON, so snapshots cross `postMessage` unchanged.
 */

/** What a binding or a cell of a pair holds. */
export type HeapValue =
  | { kind: 'pair'; id: number }
  | { kind: 'null' }
  /** A number, string (quoted), boolean or undefined, in its text form. */
  | { kind: 'atom'; text: string }
  /** A function, in its text form such as `fn[E0]`. Its environment is not followed. */
  | { kind: 'function'; text: string };

export interface HeapPair {
  id: number;
  head: HeapValue;
  tail: HeapValue;
}

export interface HeapBinding {
  name: string;
  value: HeapValue;
}

export interface HeapSnapshot {
  /** Index of the top-level statement that has just finished. */
  statement: number;
  /** What that statement was. */
  node: { kind: Node['kind']; loc: Loc; text: string } | null;
  /** How many step records had been logged when the snapshot was taken (0 without a step log). */
  records: number;
  /** The program frame's assigned bindings, in declaration order. */
  bindings: HeapBinding[];
  /** Every pair reachable from the bindings, each once, in the order first reached. */
  pairs: HeapPair[];
  /** True when more pairs were reachable than the inspector's limit. */
  truncated: boolean;
}

export interface HeapInspectorOptions {
  /** Pairs per snapshot; the rest are left out and `truncated` is set. Defaults to 160. */
  maxPairs?: number;
  /** Snapshots kept; later statements are not recorded. Defaults to 80. */
  maxSnapshots?: number;
  /** The length of the step log, when there is one, for `HeapSnapshot.records`. */
  records?: () => number;
}

export interface HeapInspector {
  hooks: MachineHooks;
  snapshots: HeapSnapshot[];
  /** Record the state after the last statement; call once the machine has stopped. */
  finish(): void;
}

/** Gives each pair a number the first time it is seen, and the same number ever after. */
export interface PairIds {
  of(pair: Pair): number;
}

export function createPairIds(): PairIds {
  const ids = new WeakMap<Pair, number>();
  let next = 1;
  return {
    of(pair) {
      let id = ids.get(pair);
      if (id === undefined) {
        id = next++;
        ids.set(pair, id);
      }
      return id;
    },
  };
}

/** The graph of `env`'s own bindings, without the frames it extends. */
export function heapGraph(
  env: Environment,
  ids: PairIds = createPairIds(),
  maxPairs = 160,
): Pick<HeapSnapshot, 'bindings' | 'pairs' | 'truncated'> {
  const pairs: HeapPair[] = [];
  const listed = new Set<Pair>();
  let truncated = false;
  // Depth first without recursion, so a long list cannot overflow the stack.
  const pending: Pair[] = [];

  const ref = (value: Value): HeapValue => {
    if (value === null) return { kind: 'null' };
    if (isPair(value)) {
      if (!listed.has(value)) pending.push(value);
      return { kind: 'pair', id: ids.of(value) };
    }
    if (typeof value === 'object') return { kind: 'function', text: stringify(value) };
    return { kind: 'atom', text: stringify(value) };
  };

  const drain = (): void => {
    while (pending.length > 0) {
      const pair = pending.pop() as Pair;
      if (listed.has(pair)) continue;
      if (pairs.length >= maxPairs) {
        truncated = true;
        pending.length = 0;
        return;
      }
      listed.add(pair);
      const node: HeapPair = { id: ids.of(pair), head: { kind: 'null' }, tail: { kind: 'null' } };
      pairs.push(node);
      // The tail is pushed first so that the head is followed first.
      node.tail = ref(pair[1]);
      node.head = ref(pair[0]);
    }
  };

  const bindings: HeapBinding[] = [];
  for (const [name, binding] of env.frame.bindings) {
    if (!binding.assigned) continue;
    bindings.push({ name, value: ref(binding.value) });
    drain();
  }
  return { bindings, pairs, truncated };
}

/**
 * Hooks that snapshot the program frame after each top-level statement.
 * `programEnv` is asked for at snapshot time, so the hooks can be handed to
 * `prepare` before the machine exists.
 */
export function createHeapInspector(
  source: string,
  programEnv: () => Environment | null,
  options: HeapInspectorOptions = {},
): HeapInspector {
  const { maxPairs = 160, maxSnapshots = 80, records = () => 0 } = options;
  const ids = createPairIds();
  const snapshots: HeapSnapshot[] = [];
  let previous: { index: number; node: Statement } | null = null;

  const snapshot = (): void => {
    const env = programEnv();
    if (env === null || previous === null || snapshots.length >= maxSnapshots) return;
    const { index, node } = previous;
    snapshots.push({
      statement: index,
      node: { kind: node.kind, loc: node.loc, text: excerpt(source, node, 60) },
      records: records(),
      ...heapGraph(env, ids, maxPairs),
    });
  };

  return {
    snapshots,
    hooks: {
      onTopLevelStatement(index, node) {
        snapshot();
        previous = { index, node };
      },
    },
    finish() {
      snapshot();
      previous = null;
    },
  };
}
