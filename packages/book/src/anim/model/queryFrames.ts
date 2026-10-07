import type { WatchedCall } from '@sicp/lab';
import { unparse } from './thunks.ts';
import { isCut, isPairRead, itemsOf, readValue, type Read } from './taggedList.ts';

/**
 * The stream of frames of a query (§4.4.2), read from the calls the query
 * system of §4.4.4 makes while the Laboratory runs it: each pattern matched
 * against an assertion, each rule whose conclusion is unified with a pattern,
 * the bindings each success adds to its frame, and each frame that comes out
 * of the whole query as an answer.
 */

/** The functions whose calls the steps are read from. */
export const QUERY_WATCH = ['query', 'check_an_assertion', 'apply_a_rule', 'unify_match', 'extend', 'display_next'] as const;

export interface Binding {
  variable: string;
  value: string;
}

/** A frame as far as its text was sent: the bindings shown, oldest first, and whether older ones were cut off. */
export interface FrameView {
  bindings: Binding[];
  earlier: boolean;
}

export interface Tally {
  matches: number;
  matched: number;
  rules: number;
  unified: number;
  answers: number;
}

/** What one step shows, before the running tally is attached. */
export type StepBody =
  | { kind: 'query'; input: string }
  | { kind: 'assert'; input: string }
  | {
      kind: 'match';
      pattern: string;
      frame: FrameView;
      /** The assertions tried, more than one when consecutive failures are grouped. */
      assertions: string[];
      ok: boolean;
      added: Binding[];
    }
  | { kind: 'rule'; pattern: string; frame: FrameView; conclusion: string; body: string | null; ok: boolean; added: Binding[] }
  | { kind: 'answer'; text: string; index: number }
  /** The end of the run; `skipped` counts the steps a shortened animation leaves out. */
  | { kind: 'done'; truncated: boolean; skipped?: number };

export type QueryStep = StepBody & { tally: Tally };

const isVariable = (v: Read): boolean => {
  if (!isPairRead(v) || v[0] !== 'name' || !isPairRead(v[1])) return false;
  const symbol = v[1][0];
  return typeof symbol === 'string' && symbol.startsWith('$');
};

const variableName = (v: Read): string => (isPairRead(v) && isPairRead(v[1]) ? String(v[1][0]) : '…');

/** A datum or pattern in the book's notation: `list("a", $x)`, `pair("computer", $type)`. */
export function formatData(v: Read): string {
  if (isCut(v)) return '…';
  if (isVariable(v)) return variableName(v);
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (!isPairRead(v)) return 'fn' in v ? v.fn : '…';
  // Walk the list; a tail that is a variable or not a list makes it a pair.
  const items: string[] = [];
  let rest: Read = v;
  while (isPairRead(rest) && !isVariable(rest)) {
    items.push(formatData(rest[0]));
    rest = rest[1];
  }
  if (rest === null) return `list(${items.join(', ')})`;
  if (isCut(rest)) return `list(${[...items, '…'].join(', ')})`;
  return items.reduceRight((tail, item) => `pair(${item}, ${tail})`, formatData(rest));
}

const COMPOUND = new Set(['and', 'or', 'not', 'unique']);

/** A query in the query language's form, written back as the reader typed it. */
export function formatQuery(v: Read): string {
  if (isCut(v)) return '…';
  if (!isPairRead(v) || typeof v[0] !== 'string') return formatData(v);
  const [name, ...args] = itemsOf(v) as [string, ...Read[]];
  const cut = isCut(lastOf(v)) ? ['…'] : [];
  if (name === 'javascript_predicate') return `javascript_predicate(${args.map(unparse).join(', ')})`;
  const parts = args.map(COMPOUND.has(name) ? formatQuery : formatData);
  return `${name}(${[...parts, ...cut].join(', ')})`;
}

function lastOf(v: Read): Read {
  let rest = v;
  while (isPairRead(rest)) rest = rest[1];
  return rest;
}

/** A frame, a list of (variable, value) pairs, newest first, as sent in text. */
export function readFrame(text: string): FrameView {
  const bindings: Binding[] = [];
  let rest = readValue(text);
  while (isPairRead(rest)) {
    const binding = rest[0];
    if (!isPairRead(binding) || isCut(binding[1]) || isCut(binding[0])) break;
    bindings.push({ variable: variableName(binding[0]), value: formatData(binding[1]) });
    rest = rest[1];
  }
  return { bindings: bindings.reverse(), earlier: rest !== null };
}

const stringArg = (text: string | undefined): string => {
  const v = text === undefined ? null : readValue(text);
  return typeof v === 'string' ? v : '…';
};

/** The arguments of the call that starts at `open` (just after its parenthesis), as text. */
function argumentsAt(text: string, open: number): { args: string[]; end: number } | null {
  const args: string[] = [];
  let depth = 0;
  let start = open;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const close = text.indexOf(ch, i + 1);
      if (close < 0) return null;
      i = close;
    } else if (ch === '(') depth++;
    else if (ch === ')') {
      if (depth === 0) {
        args.push(text.slice(start, i).trim());
        return { args, end: i };
      }
      depth--;
    } else if (ch === ',' && depth === 0) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  return null;
}

const squash = (text: string): string => text.replace(/\s+/g, '');

/**
 * The bodies of the rules written in some program text, by their conclusion
 * with spaces removed. The call log cuts long arguments short, so the scene
 * takes a rule's body from the text it was asserted in.
 */
export function ruleBodies(...texts: string[]): Map<string, string | null> {
  const bodies = new Map<string, string | null>();
  for (const text of texts) {
    for (const match of text.matchAll(/\brule\(/g)) {
      const found = argumentsAt(text, (match.index ?? 0) + match[0].length);
      const [conclusion, body] = found?.args ?? [];
      if (conclusion !== undefined && !bodies.has(squash(conclusion))) bodies.set(squash(conclusion), body ?? null);
    }
  }
  return bodies;
}

/** The rule's body with its variables renamed as the conclusion's were, e.g. `$x` to `$x_7`. */
function renamedBody(rule: Read, renamedConclusion: Read, bodies: ReadonlyMap<string, string | null>): string | null {
  const parts = itemsOf(rule);
  const conclusion = parts[1] ?? null;
  const suffix = ((): string => {
    const find = (original: Read, renamed: Read): string | null => {
      if (isVariable(original) && isVariable(renamed)) {
        const a = variableName(original);
        const b = variableName(renamed);
        return b.startsWith(a) ? b.slice(a.length) : null;
      }
      if (isPairRead(original) && isPairRead(renamed)) return find(original[0], renamed[0]) ?? find(original[1], renamed[1]);
      return null;
    };
    return find(conclusion, renamedConclusion) ?? '';
  })();
  const written = bodies.get(squash(formatQuery(conclusion)));
  if (written !== undefined) return written === null ? null : written.replace(/\$[\w$]*/g, (name) => `${name}${suffix}`);
  const body = parts[2];
  if (body === undefined) return isCut(lastOf(rule)) ? '…' : null;
  const rename = (v: Read): Read =>
    isVariable(v) ? ['name', [`${variableName(v)}${suffix}`, null]] : isPairRead(v) ? [rename(v[0]), rename(v[1])] : v;
  return formatQuery(rename(body));
}

/**
 * The steps of a run, in the order the system took them. `output` is what the
 * program displayed; the answers are read from it. `bodies` gives the rules'
 * bodies in full (see `ruleBodies`).
 */
export function queryStepsOf(
  calls: readonly WatchedCall[],
  output: readonly string[],
  { truncated = false, bodies = new Map<string, string | null>() }: { truncated?: boolean; bodies?: ReadonlyMap<string, string | null> } = {},
): QueryStep[] {
  const children = new Map<number, WatchedCall[]>();
  for (const call of calls) {
    if (call.parent === null) continue;
    const list = children.get(call.parent) ?? [];
    list.push(call);
    children.set(call.parent, list);
  }
  const descendants = (n: number): WatchedCall[] => (children.get(n) ?? []).flatMap((c) => [c, ...descendants(c.n)]);
  const added = (under: readonly WatchedCall[]): Binding[] =>
    under
      .filter((c) => c.name === 'extend')
      .map((c) => ({ variable: variableName(readValue(c.args[0] ?? '')), value: formatData(readValue(c.args[1] ?? '')) }));

  const answers = output.filter((line) => line.startsWith('"') && line !== '"Assertion added to data base."').map((line) => stringArg(line));
  const tally: Tally = { matches: 0, matched: 0, rules: 0, unified: 0, answers: 0 };
  const steps: QueryStep[] = [];
  const push = (step: StepBody): void => {
    steps.push({ ...step, tally: { ...tally } });
  };

  for (const call of calls) {
    switch (call.name) {
      case 'query': {
        const input = stringArg(call.args[0]);
        push(input.startsWith('assert(') ? { kind: 'assert', input } : { kind: 'query', input });
        break;
      }
      case 'check_an_assertion': {
        const ok = call.value !== undefined && call.value !== 'null';
        const pattern = formatQuery(readValue(call.args[1] ?? ''));
        const assertion = formatQuery(readValue(call.args[0] ?? ''));
        const frameText = call.args[2] ?? 'null';
        tally.matches++;
        if (ok) tally.matched++;
        const last = steps[steps.length - 1];
        // Consecutive failures of one pattern in one frame make one step.
        if (!ok && last?.kind === 'match' && !last.ok && last.pattern === pattern && sameFrame(last.frame, readFrame(frameText))) {
          last.assertions.push(assertion);
          last.tally = { ...tally };
          break;
        }
        push({
          kind: 'match',
          pattern,
          frame: readFrame(frameText),
          assertions: [assertion],
          ok,
          added: ok ? added(descendants(call.n)) : [],
        });
        break;
      }
      case 'apply_a_rule': {
        const unifies = (children.get(call.n) ?? []).filter((c) => c.name === 'unify_match');
        const result = unifies[unifies.length - 1]?.value;
        const ok = result !== undefined && result !== '"failed"';
        const conclusion = readValue(unifies[0]?.args[1] ?? call.args[0] ?? '');
        tally.rules++;
        if (ok) tally.unified++;
        push({
          kind: 'rule',
          pattern: formatQuery(readValue(call.args[1] ?? '')),
          frame: readFrame(call.args[2] ?? 'null'),
          conclusion: formatQuery(conclusion),
          body: renamedBody(readValue(call.args[0] ?? ''), conclusion, bodies),
          ok,
          added: ok ? added(unifies.flatMap((u) => [u, ...descendants(u.n)])) : [],
        });
        break;
      }
      case 'display_next': {
        if (call.args[0] === 'null') break;
        const index = tally.answers;
        tally.answers++;
        push({ kind: 'answer', text: answers[index] ?? '…', index });
        break;
      }
      default:
        break;
    }
  }
  push({ kind: 'done', truncated });
  return steps;
}

function sameFrame(a: FrameView, b: FrameView): boolean {
  return (
    a.earlier === b.earlier &&
    a.bindings.length === b.bindings.length &&
    a.bindings.every((x, i) => x.variable === b.bindings[i]?.variable && x.value === b.bindings[i]?.value)
  );
}
