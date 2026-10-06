import type { Trace } from '../useTrace.ts';
import type { TreeInput } from './layout.ts';

/**
 * The tree of compound function calls a program made: which call made which,
 * and what each one returned. A tail call is drawn under the call it replaced,
 * and both receive the value when the tail call returns.
 */

export interface CallNode {
  /** The frame id of the call; the root is `program`. */
  id: string;
  label: string;
  /** The function's name and the arguments in their text form; empty for the root. */
  name: string;
  args: string[];
  /** The id of an earlier call with the same function and arguments, when there was one. */
  repeatOf: string | null;
  /** Record at which the call happened; 0 for the root. */
  calledAt: number;
  /** Record at which the value arrived, or null if it never did. */
  returnedAt: number | null;
  value: string | null;
  tail: boolean;
  recursive: boolean;
}

export interface CallKeyframe {
  at: number;
  /** The call whose body is running. */
  active: string | null;
  caption: string;
}

export interface CallTree {
  root: TreeInput<CallNode>;
  keyframes: CallKeyframe[];
  /** Number of calls recorded. */
  calls: number;
  /** Number of calls that repeat an earlier call exactly. */
  repeats: number;
}

export function callTree(source: string, trace: Trace | null): CallTree {
  const root: TreeInput<CallNode> = {
    data: { id: 'program', label: 'program', name: '', args: [], repeatOf: null, calledAt: 0, returnedAt: null, value: null, tail: false, recursive: false },
    children: [],
  };
  const keyframes: CallKeyframe[] = [{ at: 0, active: null, caption: 'Each call is a box; a box closes when its value comes back.' }];
  if (trace === null) return { root, keyframes, calls: 0, repeats: 0 };

  interface Open {
    node: TreeInput<CallNode>;
    /** True once a tail call has taken this call's place on the stack. */
    replaced: boolean;
  }
  const stack: Open[] = [{ node: root, replaced: false }];
  const top = (): Open => stack[stack.length - 1] ?? { node: root, replaced: false };
  const excerpt = (loc: { start: number; end: number }): string => source.slice(loc.start, loc.end).replace(/\s+/g, ' ');
  let calls = 0;
  let repeats = 0;
  /** The first call of each function on each argument list, by label. */
  const firstCall = new Map<string, TreeInput<CallNode>>();

  for (const record of trace.records) {
    const { event } = record;
    if (event.kind === 'call') {
      calls++;
      const parent = top();
      if (event.tail) parent.replaced = true;
      const label = `${event.name}(${event.args.join(', ')})`;
      const earlier = firstCall.get(label);
      if (earlier !== undefined) repeats++;
      const node: TreeInput<CallNode> = {
        data: {
          id: record.env,
          label,
          name: event.name,
          args: event.args,
          repeatOf: earlier?.data.id ?? null,
          calledAt: record.n,
          returnedAt: null,
          value: null,
          tail: event.tail,
          recursive: event.recursive,
        },
        children: [],
      };
      parent.node.children.push(node);
      if (earlier === undefined) firstCall.set(label, node);
      stack.push({ node, replaced: false });
      keyframes.push({
        at: record.n,
        active: record.env,
        caption: event.tail
          ? `\`${excerpt(record.loc)}\` is a tail call: ${parent.node.data.label} has nothing left to do, so the new call takes its place.`
          : earlier !== undefined && earlier.data.returnedAt !== null
            ? `\`${excerpt(record.loc)}\` opens ${label} inside ${parent.node.data.label}. ${label} was already computed once, and is computed again from scratch.`
            : `\`${excerpt(record.loc)}\` opens a new call inside ${parent.node.data.label}.`,
      });
    } else if (event.kind === 'return') {
      let closed = stack.pop();
      const names: string[] = [];
      while (closed !== undefined && closed.node !== root) {
        closed.node.data.returnedAt = record.n;
        closed.node.data.value = event.value;
        names.push(closed.node.data.label);
        const next = top();
        if (!next.replaced || next.node === root) break;
        closed = stack.pop();
      }
      keyframes.push({
        at: record.n,
        active: top().node === root ? null : top().node.data.id,
        caption:
          names.length > 1
            ? `\`${excerpt(record.loc)}\` → ${event.value}, which is also the value of ${names.slice(1).join(' and ')}.`
            : `\`${excerpt(record.loc)}\` → ${event.value}: the box closes.`,
      });
    }
  }
  return { root, keyframes, calls, repeats };
}
