import { isDeclaration, parse, type Block, type Lambda, type Loc, type StepRecord } from '@sicp/lab';
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
  /** For a lambda's frame, the call as written, e.g. `W1(50)` where the label says `lambda(50)`. */
  appliedAs?: string;
}

export interface Lookup {
  symbol: string;
  from: string;
  /** Frame id the name was found in; `null` means the global frame of primitives. */
  found: string | null;
  value: string;
  /** Set when an assignment, not a lookup, went looking for the name: the binding found is the one changed. */
  assignment?: true;
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

/** `E0`, `E1`, ...; the `global`, `library` and `prelude` frames are outside the program. */
const isProgramFrame = (id: string): boolean => /^E\d+$/.test(id);

const reservedNames = (source: string): string[] => {
  try {
    return parse(source)
      .body.filter((statement) => statement.kind === 'const' || statement.kind === 'let' || statement.kind === 'function')
      .map((statement) => statement.symbol);
  } catch {
    return [];
  }
};

/** The frame a function value points at: `fn[E1]` → `E1`; `null` for any other value. */
export function closureFrame(value: string | null): string | null {
  const match = value === null ? null : /^fn\[([^\]]+)\]$/.exec(value);
  return match?.[1] ?? null;
}

interface SyntaxNode {
  kind: string;
  loc: Loc;
}

/** Every syntax node under `value`, parents before children. */
function* syntaxNodes(value: unknown): Generator<SyntaxNode> {
  if (Array.isArray(value)) {
    for (const item of value) yield* syntaxNodes(item);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const node = value as Partial<SyntaxNode> & Record<string, unknown>;
  if (typeof node.kind === 'string' && node.loc !== undefined) yield node as SyntaxNode;
  for (const [key, child] of Object.entries(node)) if (key !== 'loc') yield* syntaxNodes(child);
}

const parsed = (source: string): ReturnType<typeof parse> | null => {
  try {
    return parse(source);
  } catch {
    return null;
  }
};

/**
 * The names a block frame holds from the moment it is made: the declarations
 * of the innermost block around `loc` that declares anything (only those get
 * a frame), in the order they are written (§3.2.4).
 */
function blockNames(source: string, loc: Loc): string[] {
  let innermost: Block | null = null;
  for (const node of syntaxNodes(parsed(source)?.body ?? [])) {
    if (node.kind !== 'block' || node.loc.start > loc.start || node.loc.end < loc.end) continue;
    const block = node as unknown as Block;
    if (block.body.some(isDeclaration) && (innermost === null || block.loc.end - block.loc.start <= innermost.loc.end - innermost.loc.start)) {
      innermost = block;
    }
  }
  return innermost === null ? [] : innermost.body.filter(isDeclaration).map((d) => d.symbol);
}

/** `W1` for the application `W1(50)`: the operator, when it is a plain name. */
function operatorName(source: string, loc: Loc): string | null {
  const text = source.slice(loc.start, loc.end).trimEnd();
  if (!text.endsWith(')')) return null;
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === ')') depth++;
    else if (text[i] === '(' && --depth === 0) {
      const operator = text.slice(0, i).trim();
      return /^[A-Za-z_$][\w$]*$/.test(operator) ? operator : null;
    }
  }
  return null;
}

/**
 * The parameters of the function each name is bound to, for drawing the code
 * half of a function object: from the declarations in the text, and from the
 * calls in the trace (`W1(50)` applies a function of `amount`).
 */
export function functionParams(source: string, trace: Trace | null): Map<string, string[]> {
  const params = new Map<string, string[]>();
  for (const node of syntaxNodes(parsed(source)?.body ?? [])) {
    if (node.kind === 'function') {
      const declaration = node as unknown as { symbol: string; lambda: Lambda };
      if (!params.has(declaration.symbol)) params.set(declaration.symbol, declaration.lambda.params);
    } else if (node.kind === 'lambda') {
      const lambda = node as unknown as Lambda;
      if (lambda.name !== null && !params.has(lambda.name)) params.set(lambda.name, lambda.params);
    }
  }
  for (const record of trace?.records ?? []) {
    if (record.event.kind !== 'call') continue;
    const name = operatorName(source, record.loc);
    if (name !== null && !params.has(name)) params.set(name, record.event.params);
  }
  return params;
}

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
  /** Whether `id` is `ancestor` or a frame that extends it. */
  const within = (id: string, ancestor: string): boolean => {
    for (let at: string | null = id; at !== null; at = frames.get(at)?.parent ?? null) if (at === ancestor) return true;
    return false;
  };
  const excerpt = (record: StepRecord): string => source.slice(record.loc.start, record.loc.end).replace(/\s+/g, ' ').replace(/;$/, '');

  let previousEnv = PROGRAM_FRAME;
  for (const record of trace.records) {
    const { event } = record;
    // A block that declares names gets a frame of its own, holding all of
    // them from the start (§3.2.4). The trace first mentions it when a step
    // runs there; the frame it extends is the one the previous step ran in.
    if (event.kind !== 'call' && !frames.has(record.env) && isProgramFrame(record.env)) {
      make(
        record.env,
        'block',
        event.kind === 'define' ? event.parentEnv : previousEnv,
        blockNames(source, record.loc).map((name) => ({ name, value: null })),
      );
    }
    previousEnv = record.env;
    switch (event.kind) {
      case 'define': {
        if (event.assignment) {
          // Assignment changes the first binding of the name it finds, looking outward (§3.2.1).
          const found = resolve(record.env, event.symbol);
          // Not found in the program's frames: fall back to the frame the step ran in.
          const holder = found ?? record.env;
          const frame = frames.get(holder);
          if (frame !== undefined) bind(frame, event.symbol, event.value);
          const hops = distance(record.env, holder);
          const where =
            holder === record.env
              ? `the current frame binds it, so the binding changes here`
              : `not in ${record.env}, so look outward: ${holder}, ${hops} frame${hops === 1 ? '' : 's'} out, is the first frame that binds it, and its binding changes`;
          states.push(
            snapshot(
              record.n,
              record.env,
              { symbol: event.symbol, from: record.env, found: holder, value: event.value, assignment: true },
              `Assign \`${event.symbol}\` = ${event.value} in ${holder}: ${where}.`,
            ),
          );
          break;
        }
        let frame = frames.get(record.env);
        if (frame === undefined) frame = make(record.env, 'block', event.parentEnv, []);
        else if (event.parentEnv !== null && frame.label === 'block' && frame.parent !== event.parentEnv) frame.parent = event.parentEnv;
        bind(frame, event.symbol, event.value);
        const home = closureFrame(event.value);
        states.push(
          snapshot(
            record.n,
            record.env,
            null,
            home === null
              ? `Declare \`${event.symbol}\` = ${event.value} in ${record.env}.`
              : home === record.env
                ? `Declare \`${event.symbol}\` in ${record.env}: a function object, its code paired with a pointer to ${home}, the environment it was made in.`
                : `Declare \`${event.symbol}\` in ${record.env}: the function object made in ${home}, so its environment pointer leads to ${home}.`,
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
        // A lambda has no name of its own; call it by the name it was applied through.
        const name = event.name === 'lambda' ? (operatorName(source, record.loc) ?? event.name) : event.name;
        const frame = make(
          record.env,
          `${event.name}(${event.args.join(', ')})`,
          // Library and prelude functions were made outside the program; their
          // frames hang off the global box, which stands for all of that.
          isProgramFrame(event.closureEnv) ? event.closureEnv : null,
          event.params.map((param, i) => ({ name: param, value: event.args[i] ?? 'undefined' })),
        );
        if (name !== event.name) frame.appliedAs = `${name}(${event.args.join(', ')})`;
        stack.push(record.env);
        const bindings = event.params.map((param, i) => `\`${param}\` to ${event.args[i]}`).join(', ');
        states.push(
          snapshot(
            record.n,
            record.env,
            null,
            `Apply \`${name}\`: a new frame ${record.env} extends ${event.closureEnv}${bindings === '' ? '' : ` and binds ${bindings}`}.${
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
        // A function made during the call keeps the call's frame alive (§3.2.3).
        const home = closureFrame(event.value);
        const kept = home !== null && id !== undefined && within(home, id);
        states.push(
          snapshot(
            record.n,
            record.env,
            null,
            kept
              ? `\`${excerpt(record)}\` → ${event.value}, a function object whose environment is ${home}. ${id} has returned, but it stays: that function still points into it.`
              : `\`${excerpt(record)}\` → ${event.value}. ${id ?? 'The frame'} has done its work.`,
          ),
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
              ? 'not in any frame of the program, so it comes from the global environment'
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
