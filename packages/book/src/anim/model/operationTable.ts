import { parse, type Expression } from '@sicp/lab';
import { listItems, listNotation, parseValue, type Datum } from './pairs.ts';
import type { Trace } from '../useTrace.ts';

/**
 * The operation-and-type table of §2.4.3 (figure 2.22), rebuilt from the
 * trace: every call of `put` files an entry under an operation and a type,
 * and every call of `get` looks one up and returns it, or `undefined`.
 * Columns are named by the strings in the type, so `list("polar")` and
 * `"polar"` share the polar column; captions give each key exactly.
 */

export interface Entry {
  op: string;
  /** The column, e.g. `polar` for `list("polar")`, `polar, polar` for a two-argument type. */
  column: string;
  /** The type as written, e.g. `list("polar")`. */
  key: string;
  /** What was filed: the name or a short text of the argument expression. */
  item: string;
}

export type TableKeyframe =
  | { kind: 'put'; entries: Entry[]; installer: string | null; at: number }
  | {
      kind: 'get';
      op: string;
      column: string;
      key: string;
      found: boolean;
      /** The function that called `get`, or null for the program itself. */
      asker: string | null;
      /** When `apply_generic` asked: the function that called it. */
      on: string | null;
      at: number;
    };

export interface Table {
  ops: string[];
  columns: string[];
  keyframes: TableKeyframe[];
}

const PROGRAM_FRAME = 'E0';
export const MAX_LOOKUPS = 30;

const unquote = (text: string): string => (text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text);

function typeOf(text: string): { column: string; key: string } {
  const datum: Datum | null = parseValue(text);
  if (datum === null) return { column: text, key: text };
  const items = listItems(datum);
  const column =
    items !== null && items.length > 0 && items.every((d) => d.kind === 'atom')
      ? items.map((d) => (d.kind === 'atom' ? unquote(d.text) : '')).join(', ')
      : datum.kind === 'atom'
        ? unquote(datum.text)
        : listNotation(datum);
  return { column, key: listNotation(datum) };
}

/** A short label for an expression: a name as it is, a lambda by its parameters. */
function labelOf(expr: Expression | undefined, source: string): string | null {
  if (expr === undefined) return null;
  if (expr.kind === 'name') return expr.symbol;
  if (expr.kind === 'lambda') return `(${expr.params.join(', ')}) => …`;
  const text = source.slice(expr.loc.start, expr.loc.end).replace(/\s+/g, ' ');
  return text.length > 16 ? `${text.slice(0, 15)}…` : text;
}

/** The item of a `put`, named as the program wrote it when the call is in the program's text. */
function itemOf(source: string, loc: { start: number; end: number }, fallback: string): string {
  const text = source.slice(loc.start, loc.end);
  if (/^put\s*\(/.test(text)) {
    try {
      const statement = parse(`${text};`).body[0];
      if (statement?.kind === 'application') {
        const label = labelOf(statement.args[2], text);
        if (label !== null) return label;
      }
    } catch {
      // Not the call we thought; fall back to the value.
    }
  }
  const primitive = /^primitive\[(.*)\]$/.exec(fallback);
  return primitive?.[1] ?? fallback;
}

export function operationTable(source: string, trace: Trace | null): Table {
  const ops: string[] = [];
  const columns: string[] = [];
  const keyframes: TableKeyframe[] = [];
  if (trace === null) return { ops, columns, keyframes };

  // Which function each frame belongs to, and who called it.
  const frameName = new Map<string, string>();
  const frameCaller = new Map<string, string>();
  // A body with declarations of its own runs in a block frame inside the call's frame.
  const parent = new Map<string, string>();
  for (const record of trace.records) {
    if (record.event.kind === 'call') {
      frameName.set(record.env, record.event.name);
      frameCaller.set(record.env, record.event.callerEnv);
    } else if (record.event.kind === 'define' && record.event.parentEnv !== null) {
      parent.set(record.env, record.event.parentEnv);
    }
  }
  /** The frame of the call that `env` belongs to, or null at the top level. */
  const callFrame = (env: string): string | null => {
    for (let at: string | undefined = env; at !== undefined && at !== PROGRAM_FRAME; at = parent.get(at)) {
      if (frameName.has(at)) return at;
    }
    return null;
  };
  const nameOf = (env: string): string | null => {
    const frame = callFrame(env);
    return frame === null ? null : (frameName.get(frame) ?? null);
  };

  let lookups = 0;
  /** The frame that made the previous call, when that call was a put. */
  let lastFrame: string | null = null;
  trace.records.forEach((record, i) => {
    const { event } = record;
    if (event.kind !== 'call') return;
    if (event.name === 'put' && event.args.length === 3) {
      const [opText = '', typeText = '', itemText = ''] = event.args;
      const entry: Entry = { op: unquote(opText), ...typeOf(typeText), item: itemOf(source, record.loc, itemText) };
      if (!ops.includes(entry.op)) ops.push(entry.op);
      if (!columns.includes(entry.column)) columns.push(entry.column);
      const installer = nameOf(event.callerEnv);
      const last = keyframes[keyframes.length - 1];
      // The puts of one installation are one keyframe; puts made by the program itself are one each.
      if (installer !== null && last?.kind === 'put' && lastFrame === callFrame(event.callerEnv)) {
        last.entries.push(entry);
        last.at = i;
      } else {
        keyframes.push({ kind: 'put', entries: [entry], installer, at: i });
      }
      lastFrame = callFrame(event.callerEnv);
      return;
    }
    lastFrame = null;
    if (event.name === 'get' && event.args.length === 2 && lookups < MAX_LOOKUPS) {
      lookups++;
      const [opText = '', typeText = ''] = event.args;
      let found = false;
      for (let j = i + 1; j < trace.records.length; j++) {
        const later = trace.records[j]!.event;
        if (later.kind === 'return' && later.depth === event.depth) {
          found = later.value !== 'undefined';
          break;
        }
      }
      const askerFrame = callFrame(event.callerEnv);
      const asker = askerFrame === null ? null : (frameName.get(askerFrame) ?? null);
      const callerOfAsker = askerFrame === null ? undefined : frameCaller.get(askerFrame);
      const on = asker === 'apply_generic' && callerOfAsker !== undefined ? nameOf(callerOfAsker) : null;
      keyframes.push({ kind: 'get', op: unquote(opText), ...typeOf(typeText), found, asker, on, at: i });
    }
  });
  return { ops, columns, keyframes };
}

/** The entries in the table once keyframe `k` has happened. */
export function entriesAt(table: Table, k: number): Entry[] {
  return table.keyframes.slice(0, k + 1).flatMap((f) => (f.kind === 'put' ? f.entries : []));
}

const quote = (s: string): string => `"${s}"`;

export function captionOf(table: Table, k: number): string {
  const frame = table.keyframes[k];
  if (frame === undefined) return '';
  if (frame.kind === 'put') {
    const [first] = frame.entries;
    if (frame.installer === null && frame.entries.length === 1 && first !== undefined) {
      return `\`put(${quote(first.op)}, ${first.key}, ${first.item})\` files \`${first.item}\` under the operation ${quote(first.op)} and the type \`${first.key}\`.`;
    }
    const cols = [...new Set(frame.entries.map((e) => e.column))];
    return `\`${frame.installer ?? 'The program'}\` puts ${frame.entries.length} ${frame.entries.length === 1 ? 'entry' : 'entries'} in the table, filling the ${cols.join(' and ')} column${cols.length === 1 ? '' : 's'}. The functions it files are declared inside it: only the table can reach them.`;
  }
  const lookup = `\`get(${quote(frame.op)}, ${frame.key})\``;
  const who =
    frame.asker === 'apply_generic'
      ? `${frame.on === null ? '' : `\`${frame.on}\` calls \`apply_generic\`, which `}looks up ${lookup}`
      : frame.asker !== null
        ? `\`${frame.asker}\` looks up ${lookup}`
        : `${lookup} looks in the table`;
  if (!frame.found) {
    return `${who} and finds no entry, so the answer is \`undefined\`${frame.asker === 'apply_generic' ? ': there is no method for these types' : ''}.`;
  }
  const entry = [...entriesAt(table, k)].reverse().find((e) => e.op === frame.op && e.key === frame.key);
  return `${who} and finds ${entry === undefined ? 'its entry' : `\`${entry.item}\``} in the ${frame.column} column.`;
}
