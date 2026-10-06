import { parse, type StepRecord } from '@sicp/lab';
import type { Trace } from '../useTrace.ts';

/**
 * Frames as the evaluator made them, rebuilt from the trace: which frame each
 * step ran in, what every frame binds, and where each name lookup landed.
 */

export interface Binding {
  name: string;
  /** `null` while the name is reserved but its declaration has not been evaluated. */
  value: string | null;
}

export type FrameStatus = 'live' | 'returned' | 'replaced';

export interface FrameView {
  id: string;
  label: string;
  parent: string | null;
  bindings: Binding[];
  status: FrameStatus;
  /** What the call returned, once it has. */
  value: string | null;
  /** Order of creation. */
  order: number;
}

export interface Lookup {
  symbol: string;
  from: string;
  /** Frame id the name was found in; `null` means the global frame of primitives. */
  found: string | null;
  value: string;
}

export interface EnvState {
  /** Record number this state follows; 0 before any record. */
  at: number;
  frames: FrameView[];
  /** Frame the step ran in. */
  current: string;
  lookup: Lookup | null;
  /** Live call frames, outermost first. */
  stack: string[];
  caption: string;
}

export const PROGRAM_FRAME = 'E0';

const reservedNames = (source: string): string[] => {
  try {
    return parse(source)
      .body.filter((statement) => statement.kind === 'const' || statement.kind === 'let' || statement.kind === 'function')
      .map((statement) => statement.symbol);
  } catch {
    return [];
  }
};

/** One state per record, preceded by the state before the program starts. */
export function environmentStates(source: string, trace: Trace | null): EnvState[] {
  const frames = new Map<string, FrameView>();
  let order = 0;
  const make = (id: string, label: string, parent: string | null, bindings: Binding[]): FrameView => {
    const frame: FrameView = { id, label, parent, bindings, status: 'live', value: null, order: order++ };
    frames.set(id, frame);
    return frame;
  };
  make(
    PROGRAM_FRAME,
    'program',
    null,
    reservedNames(source).map((name) => ({ name, value: null })),
  );
  const stack: string[] = [];
  const snapshot = (at: number, current: string, lookup: Lookup | null, caption: string): EnvState => ({
    at,
    frames: [...frames.values()].map((frame) => ({ ...frame, bindings: frame.bindings.map((b) => ({ ...b })) })),
    current,
    lookup,
    stack: [...stack],
    caption,
  });

  const states: EnvState[] = [
    snapshot(
      0,
      PROGRAM_FRAME,
      null,
      frames.get(PROGRAM_FRAME)?.bindings.length
        ? 'Before anything runs, the program frame already holds every declared name, unassigned.'
        : 'The program frame starts empty.',
    ),
  ];
  if (trace === null) return states;

  const bind = (frame: FrameView, name: string, value: string): void => {
    const existing = frame.bindings.find((b) => b.name === name);
    if (existing !== undefined) existing.value = value;
    else frame.bindings.push({ name, value });
  };
  const resolve = (from: string, symbol: string): string | null => {
    for (let id: string | null = from; id !== null; ) {
      const frame: FrameView | undefined = frames.get(id);
      if (frame === undefined) return null;
      if (frame.bindings.some((b) => b.name === symbol && b.value !== null)) return id;
      id = frame.parent;
    }
    return null;
  };
  const distance = (from: string, to: string | null): number => {
    let n = 0;
    for (let id: string | null = from; id !== null && id !== to; id = frames.get(id)?.parent ?? null) n++;
    return to === null ? n + 1 : n;
  };
  const excerpt = (record: StepRecord): string => source.slice(record.loc.start, record.loc.end).replace(/\s+/g, ' ').replace(/;$/, '');

  for (const record of trace.records) {
    const { event } = record;
    switch (event.kind) {
      case 'define': {
        let frame = frames.get(record.env);
        if (frame === undefined) frame = make(record.env, 'block', event.parentEnv, []);
        bind(frame, event.symbol, event.value);
        states.push(
          snapshot(
            record.n,
            record.env,
            null,
            `${event.assignment ? 'Assign' : 'Declare'} \`${event.symbol}\` = ${event.value} in ${record.env}.`,
          ),
        );
        break;
      }
      case 'call': {
        let replaced: string | null = null;
        if (event.tail) {
          replaced = stack.pop() ?? null;
          const old = replaced === null ? undefined : frames.get(replaced);
          if (old !== undefined) old.status = 'replaced';
        }
        make(
          record.env,
          `${event.name}(${event.args.join(', ')})`,
          event.closureEnv,
          event.params.map((param, i) => ({ name: param, value: event.args[i] ?? 'undefined' })),
        );
        stack.push(record.env);
        const bindings = event.params.map((param, i) => `\`${param}\` to ${event.args[i]}`).join(', ');
        states.push(
          snapshot(
            record.n,
            record.env,
            null,
            `Apply \`${event.name}\`: a new frame ${record.env} extends ${event.closureEnv}${bindings === '' ? '' : ` and binds ${bindings}`}.${
              replaced === null ? '' : ` It is a tail call, so it takes the place of ${replaced} instead of stacking on it.`
            }`,
          ),
        );
        break;
      }
      case 'return': {
        const id = stack.pop();
        const frame = id === undefined ? undefined : frames.get(id);
        if (frame !== undefined) {
          frame.status = 'returned';
          frame.value = event.value;
        }
        states.push(
          snapshot(record.n, record.env, null, `\`${excerpt(record)}\` → ${event.value}. ${id ?? 'The frame'} has done its work.`),
        );
        break;
      }
      case 'name': {
        const found = resolve(record.env, event.symbol);
        const hops = distance(record.env, found);
        const where =
          found === record.env
            ? `found in the current frame ${record.env}`
            : found === null
              ? 'not in any frame of the program, so it is the primitive of that name'
              : `not in ${record.env}, so look outward: found in ${found}, ${hops} frame${hops === 1 ? '' : 's'} out`;
        states.push(
          snapshot(record.n, record.env, { symbol: event.symbol, from: record.env, found, value: event.value }, `Look up \`${event.symbol}\` from ${record.env}: ${where}. Its value is ${event.value}.`),
        );
        break;
      }
      case 'result':
        states.push(snapshot(record.n, record.env, null, `\`${excerpt(record)}\` → ${event.value}, computed in ${record.env}.`));
        break;
      case 'eval':
        states.push(snapshot(record.n, record.env, null, `Evaluate \`${excerpt(record)}\` in ${record.env}.`));
        break;
    }
  }

  const last = states[states.length - 1];
  if (last !== undefined && trace.outcome.status === 'error') {
    states.push({ ...last, at: last.at + 1, caption: `The evaluator stops with an error: ${trace.outcome.error.message}.` });
  }
  return states;
}
