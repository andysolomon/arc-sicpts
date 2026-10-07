import type { StepRecord } from '@sicp/lab';
import type { Trace } from '../useTrace.ts';

/**
 * Local state, read from the trace (§3.1). Two things live here:
 *
 * - `resolveAssignments` moves each assignment to the frame that holds the
 *   name. The trace records an assignment in the frame where it ran (the
 *   frame of `amount => { balance = ... }`), but the binding it changes is
 *   the `balance` of an enclosing frame, and that is where a picture of
 *   frames must show the new value.
 * - `localStateKeyframes` groups the program's names by the state they reach:
 *   every name bound to a function made inside a call is an *object*, whose
 *   state is the variables of the frames that function remembers. Two names
 *   for functions of the same frame name the same object (§3.1.3).
 */

const PROGRAM = 'E0';
const isProgramFrame = (id: string): boolean => /^E\d+$/.test(id);

interface TrackedFrame {
  id: string;
  parent: string | null;
  /** What made the frame: `make_withdraw(100)`, or `block`. */
  label: string;
  bindings: Map<string, string | null>;
}

/** Frames as the records build them, with each assignment landing where its name is bound. */
class FrameTracker {
  readonly frames = new Map<string, TrackedFrame>([[PROGRAM, { id: PROGRAM, parent: null, label: 'program', bindings: new Map() }]]);

  /** The frame that binds `symbol`, looking outward from `from`; `null` when it is outside the program. */
  owner(from: string, symbol: string): string | null {
    for (let id: string | null = from; id !== null; ) {
      const frame = this.frames.get(id);
      if (frame === undefined) return null;
      if (frame.bindings.has(symbol)) return id;
      id = frame.parent;
    }
    return null;
  }

  /** Apply one record; returns the frame a define or assignment changed, if any. */
  apply(record: StepRecord): string | null {
    const { event } = record;
    if (event.kind === 'call') {
      this.frames.set(record.env, {
        id: record.env,
        parent: isProgramFrame(event.closureEnv) ? event.closureEnv : null,
        label: `${event.name}(${event.args.join(', ')})`,
        bindings: new Map(event.params.map((param, i) => [param, event.args[i] ?? 'undefined'])),
      });
      return null;
    }
    if (event.kind !== 'define') return null;
    const target = event.assignment ? (this.owner(record.env, event.symbol) ?? record.env) : record.env;
    let frame = this.frames.get(target);
    if (frame === undefined) {
      frame = { id: target, parent: event.parentEnv, label: 'block', bindings: new Map() };
      this.frames.set(target, frame);
    }
    frame.bindings.set(event.symbol, event.value);
    return target;
  }
}

/** The same trace, with every assignment record placed in the frame whose binding it changes. */
export function resolveAssignments(trace: Trace): Trace {
  const tracker = new FrameTracker();
  let moved = false;
  const records = trace.records.map((record) => {
    const target = tracker.apply(record);
    if (target === null || target === record.env) return record;
    moved = true;
    return { ...record, env: target };
  });
  return moved ? { ...trace, records } : trace;
}

export interface StateCell {
  name: string;
  value: string;
  /** The frame that binds the name. */
  frame: string;
  /** Earlier values, oldest first. */
  history: string[];
}

export interface StateHolder {
  /** The frame the state lives in: the outermost frame below the program's, or `E0` for the program's own state. */
  key: string;
  kind: 'program' | 'object';
  /** Names in the program frame that reach this state. */
  names: string[];
  /** The call that made the frame, e.g. `make_withdraw(100)`. */
  made: string;
  cells: StateCell[];
}

export interface LocalStateKeyframe {
  /** Record number this keyframe follows; 0 before any record. */
  at: number;
  holders: StateHolder[];
  /** The cell that just changed, if one did. */
  changed: { key: string; name: string } | null;
  caption: string;
}

const closureFrame = (value: string | null): string | null => {
  const match = value === null ? null : /^fn\[(E\d+)\]$/.exec(value);
  return match?.[1] ?? null;
};

const isFunctionValue = (value: string): boolean => value.startsWith('fn[') || value.startsWith('primitive');

const list = (names: readonly string[]): string => {
  const quoted = names.map((n) => `\`${n}\``);
  return quoted.length <= 1 ? (quoted[0] ?? '') : `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
};

/** Objects and the state they hold, after each record that changes them. */
export function localStateKeyframes(trace: Trace | null): LocalStateKeyframe[] {
  const first: LocalStateKeyframe = {
    at: 0,
    holders: [],
    changed: null,
    caption: 'Nothing holds state yet. Each object the program makes appears here with the variables its frame keeps.',
  };
  if (trace === null) return [first];

  // Names the program frame itself keeps changing are state too (the global `balance` of §3.1.1).
  const programState = new Set<string>();
  {
    const tracker = new FrameTracker();
    for (const record of trace.records) {
      const target = tracker.apply(record);
      if (target === PROGRAM && record.event.kind === 'define' && record.event.assignment) programState.add(record.event.symbol);
    }
  }

  const tracker = new FrameTracker();
  const histories = new Map<string, string[]>();
  const lastValue = new Map<string, string>();
  let previous: StateHolder[] = [];
  let signature = '[]';
  const keyframes: LocalStateKeyframe[] = [first];

  const derive = (): StateHolder[] => {
    const holders: StateHolder[] = [];
    const program = tracker.frames.get(PROGRAM);
    if (program === undefined) return holders;
    const programCells = [...program.bindings].filter(([name, value]) => programState.has(name) && value !== null);
    if (programCells.length > 0) {
      holders.push({
        key: PROGRAM,
        kind: 'program',
        names: [],
        made: 'the program',
        cells: programCells.map(([name, value]) => ({ name, value: value ?? '', frame: PROGRAM, history: [] })),
      });
    }
    for (const [name, value] of program.bindings) {
      const env = closureFrame(value);
      if (env === null || env === PROGRAM) continue;
      const chain: TrackedFrame[] = [];
      for (let id: string | null = env; id !== null && id !== PROGRAM; ) {
        const frame = tracker.frames.get(id);
        if (frame === undefined) break;
        chain.push(frame);
        id = frame.parent;
      }
      const outer = chain[chain.length - 1];
      if (outer === undefined) continue;
      const existing = holders.find((h) => h.key === outer.id);
      if (existing !== undefined) {
        existing.names.push(name);
        continue;
      }
      const cells: StateCell[] = [];
      for (const frame of chain) {
        for (const [variable, v] of frame.bindings) {
          if (v === null || isFunctionValue(v) || cells.some((c) => c.name === variable)) continue;
          cells.push({ name: variable, value: v, frame: frame.id, history: [] });
        }
      }
      holders.push({ key: outer.id, kind: 'object', names: [name], made: outer.label, cells });
    }
    for (const holder of holders) {
      for (const cell of holder.cells) {
        const id = `${holder.key}.${cell.name}`;
        const history = histories.get(id) ?? [];
        const last = lastValue.get(id);
        if (last !== undefined && last !== cell.value) history.push(last);
        histories.set(id, history);
        lastValue.set(id, cell.value);
        cell.history = [...history];
      }
    }
    return holders;
  };

  for (const record of trace.records) {
    const target = tracker.apply(record);
    if (target === null) continue;
    const holders = derive();
    const next = JSON.stringify(holders.map((h) => [h.key, h.names, h.cells.map((c) => [c.name, c.value])]));
    if (next === signature) continue;
    signature = next;
    const { change, caption } = describe(previous, holders, record);
    keyframes.push({ at: record.n, holders, changed: change, caption });
    previous = holders;
  }

  if (trace.outcome.status === 'error') {
    const last = keyframes[keyframes.length - 1] ?? first;
    keyframes.push({ ...last, at: last.at + 1, changed: null, caption: `The evaluator stops with an error: ${trace.outcome.error.message}.` });
  }
  return keyframes;
}

function describe(before: StateHolder[], after: StateHolder[], record: StepRecord): { change: LocalStateKeyframe['changed']; caption: string } {
  for (const holder of after) {
    const old = before.find((h) => h.key === holder.key);
    if (old === undefined) {
      if (holder.kind === 'program') {
        const cell = holder.cells[0];
        return {
          change: cell === undefined ? null : { key: holder.key, name: cell.name },
          caption: `The program frame declares ${list(holder.cells.map((c) => c.name))}. Every function in the program can see it, and change it.`,
        };
      }
      const state = holder.cells.map((c) => `\`${c.name}\` = ${c.value} in ${c.frame}`).join(', ');
      return {
        change: null,
        caption: `${list(holder.names)} names a new object: the function \`${holder.made}\` returned remembers the frame it was made in, so that frame outlives the call. ${
          state === '' ? 'It has no variables of its own.' : `Its state: ${state}.`
        }`,
      };
    }
    const added = holder.names.filter((n) => !old.names.includes(n));
    if (added.length > 0) {
      return {
        change: null,
        caption: `${list(added)} names the same object as ${list(old.names)}: no call, no new frame. Both names reach the same state.`,
      };
    }
    for (const cell of holder.cells) {
      const was = old.cells.find((c) => c.name === cell.name);
      if (was === undefined || was.value === cell.value) continue;
      const change = { key: holder.key, name: cell.name };
      if (holder.kind === 'program') {
        return { change, caption: `\`${cell.name}\` in the program frame goes from ${was.value} to ${cell.value}.` };
      }
      const others = after.filter((h) => h.kind === 'object' && h.key !== holder.key && h.cells.some((c) => c.name === cell.name));
      const who =
        holder.names.length > 1
          ? `Through ${list(holder.names)} alike, it is the same \`${cell.name}\`.`
          : others.length > 0
            ? `Only ${list(holder.names)} sees it; the \`${cell.name}\` of ${list(others.flatMap((h) => h.names))} does not move.`
            : `Only ${list(holder.names)} can see it.`;
      return { change, caption: `\`${cell.name}\` in ${cell.frame} goes from ${was.value} to ${cell.value}. ${who}` };
    }
  }
  const event = record.event;
  return {
    change: null,
    caption: event.kind === 'define' ? `\`${event.symbol}\` = ${event.value}.` : 'The state changes.',
  };
}
