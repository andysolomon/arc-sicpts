import type { WatchedCall } from '@sicp/lab';

/**
 * The search tree of an amb program, rebuilt from the calls the probed amb
 * evaluator makes (`withSearchProbe` in the Laboratory): each alternative an
 * `amb` tries is a node under the alternative that was current when the `amb`
 * was reached, `amb()` is a dead end, and each value the driver receives is a
 * success. Chronological backtracking means that trying the next alternative
 * of a choice point abandons everything below that choice point.
 */

export type SearchNodeKind = 'root' | 'choice' | 'dead' | 'solution';

export interface SearchNode {
  id: number;
  kind: SearchNodeKind;
  parent: number | null;
  children: number[];
  /** The choice point's number, for choices. */
  point: number | null;
  /** Position of the alternative in its `amb`, from 0. */
  index: number;
  /** The alternative's text, such as `an_element_of(tail(items))`. */
  text: string;
  /** The `amb` it belongs to, such as `amb(1, 2, 3)`. */
  ambText: string;
}

export type SearchStepKind = 'try' | 'value' | 'dead' | 'exhausted' | 'solution';

export interface SearchStep {
  kind: SearchStepKind;
  /** The node the step is about. */
  focus: number;
  /** Nodes that exist once this step is done: ids below this. */
  visible: number;
  /** The alternatives still on the current path, root first. */
  path: number[];
  /** Labels as they read after this step, by node id. */
  labels: Map<number, string>;
  /** Choices that have failed for good: backtracked over or exhausted. */
  abandoned: Set<number>;
  /** Choices that led to a success so far. */
  succeeded: Set<number>;
  caption: string;
}

export interface SearchTree {
  nodes: SearchNode[];
  steps: SearchStep[];
  /** True when the run had more events than are drawn. */
  truncated: boolean;
  solutions: number;
}

interface Point {
  parent: number;
  count: number;
  ambText: string;
  nodes: number[];
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordinal = (i: number): string => ORDINALS[i] ?? `${i + 1}th`;

/** A string argument as the call log printed it, without its quotes. */
function text(arg: string | undefined): string {
  if (arg === undefined) return '';
  if (!arg.startsWith('"')) return arg;
  try {
    return JSON.parse(arg) as string;
  } catch {
    return arg.slice(1, -1);
  }
}

export interface SearchOptions {
  /** Most nodes drawn; later events are left out. */
  maxNodes?: number;
}

export function searchTree(calls: readonly WatchedCall[], { maxNodes = 64 }: SearchOptions = {}): SearchTree {
  const nodes: SearchNode[] = [{ id: 0, kind: 'root', parent: null, children: [], point: null, index: 0, text: 'start', ambText: '' }];
  const steps: SearchStep[] = [];
  const points = new Map<number, Point>();
  const labels = new Map<number, string>([[0, 'start']]);
  const abandoned = new Set<number>();
  const succeeded = new Set<number>();
  let path: number[] = [];
  let solutions = 0;
  let truncated = false;

  const top = (): number => path[path.length - 1] ?? 0;
  const add = (node: Omit<SearchNode, 'id' | 'children'>): number => {
    const id = nodes.length;
    nodes.push({ ...node, id, children: [] });
    if (node.parent !== null) nodes[node.parent]?.children.push(id);
    return id;
  };
  // Everything below `node` that is no longer on the path has been given up.
  const abandonBelow = (keep: number) => {
    const cut = keep === 0 ? 0 : path.indexOf(keep) + 1;
    for (const id of path.slice(cut)) abandoned.add(id);
    path = path.slice(0, cut);
  };
  const push = (kind: SearchStepKind, focus: number, caption: string) => {
    steps.push({
      kind,
      focus,
      visible: nodes.length,
      path: [...path],
      labels: new Map(labels),
      abandoned: new Set(abandoned),
      succeeded: new Set(succeeded),
      caption,
    });
  };

  for (const call of calls) {
    const args = call.args;
    if (call.name === 'amb_tried') {
      if (nodes.length >= maxNodes) {
        truncated = true;
        break;
      }
      const point = Number(args[0]);
      const index = Number(args[1]);
      const ambText = text(args[3]);
      const choice = text(args[4]);
      let known = points.get(point);
      if (known === undefined) {
        known = { parent: top(), count: Number(args[2]), ambText, nodes: [] };
        points.set(point, known);
      } else {
        abandonBelow(known.parent);
      }
      const id = add({ kind: 'choice', parent: known.parent, point, index, text: choice, ambText });
      known.nodes.push(id);
      path.push(id);
      labels.set(id, choice);
      push(
        'try',
        id,
        index === 0
          ? `\`${ambText}\` is reached, a new choice point. It tries its first alternative, \`${choice}\`.`
          : `Back at \`${ambText}\`: it tries its ${ordinal(index)} alternative, \`${choice}\`.`,
      );
    } else if (call.name === 'amb_chose') {
      const point = points.get(Number(args[0]));
      const id = point?.nodes[Number(args[1])];
      const node = id === undefined ? undefined : nodes[id];
      if (node === undefined || id === undefined) continue;
      const value = args[2] ?? '';
      const previous = steps[steps.length - 1];
      if (node.children.length === 0 && previous?.kind === 'try' && previous.focus === id) {
        // The alternative gave its value at once: one keyframe for both.
        labels.set(id, value);
        previous.labels = new Map(labels);
        if (value !== node.text) previous.caption += ` Its value is \`${value}\`.`;
      } else {
        push('value', id, `The alternative \`${node.text}\` of \`${node.ambText}\` succeeds with the value \`${value}\`, and the computation goes on with it.`);
      }
    } else if (call.name === 'amb_exhausted') {
      const point = points.get(Number(args[0]));
      const count = Number(args[1]);
      if (count === 0 || point === undefined) {
        if (nodes.length >= maxNodes) {
          truncated = true;
          break;
        }
        const id = add({ kind: 'dead', parent: top(), point: null, index: 0, text: '✗', ambText: 'amb()' });
        labels.set(id, '✗');
        push('dead', id, 'Dead end: `amb()` has no alternatives, which is how a `require` fails. The failure continuation takes the search back to the most recent choice point.');
      } else {
        abandonBelow(point.parent);
        for (const id of point.nodes) abandoned.add(id);
        const before = point.parent === 0 ? null : nodes[point.parent];
        push(
          'exhausted',
          point.nodes[point.nodes.length - 1] ?? 0,
          before === undefined || before === null
            ? `\`${point.ambText}\` has no alternatives left, and there is no earlier choice point: the search is over.`
            : `\`${point.ambText}\` has no alternatives left, so it fails in turn, and the failure goes back to the choice point before it, \`${before.ambText}\`.`,
        );
      }
    } else if (call.name === 'solution_found' || call.name === 'user_print') {
      if (nodes.length >= maxNodes) {
        truncated = true;
        break;
      }
      const value = call.name === 'solution_found' ? (args[0] ?? '') : (args[1] ?? '');
      solutions++;
      const id = add({ kind: 'solution', parent: top(), point: null, index: 0, text: value, ambText: '' });
      labels.set(id, value);
      for (const on of path) succeeded.add(on);
      succeeded.add(id);
      push(
        'solution',
        id,
        call.name === 'solution_found'
          ? `Success: every requirement on this path holds, and the value is \`${value}\`. \`amb_solutions\` keeps it; for another, it calls the failure continuation that came with it, as \`retry\` does.`
          : `Success: the driver loop prints \`${value}\` and keeps the failure continuation for a \`retry\`.`,
      );
    }
  }

  return { nodes, steps, truncated, solutions };
}
