import type { WatchedCall } from '@sicp/lab';
import { isCut, isPairRead, itemsOf, readValue, show, type Read } from './taggedList.ts';

/**
 * The life of the thunks the lazy evaluator of §4.2.2 makes, read from the
 * calls of its `apply`, `delay_it`, `force_it` and `actual_value`: which
 * argument expressions were delayed, when each was forced and to what, which
 * forcings found the value already there, and which thunks were never forced.
 */

/** The functions whose calls the timeline is read from. */
export const THUNK_WATCH = ['apply', 'delay_it', 'force_it', 'actual_value'] as const;

const ALONE = new Set(['literal', 'name', 'application']);

/** Source text for a tagged-list component, as far as it was sent. */
export function unparse(v: Read): string {
  if (isCut(v)) return '…';
  if (!isPairRead(v) || typeof v[0] !== 'string') return show(v);
  const items = itemsOf(v);
  const part = (i: number): Read => (i < items.length ? (items[i] as Read) : { cut: true });
  // Operands that are not atoms or applications get parentheses.
  const operand = (x: Read): string => {
    const text = unparse(x);
    return isPairRead(x) && typeof x[0] === 'string' && !ALONE.has(x[0]) ? `(${text})` : text;
  };
  switch (v[0]) {
    case 'literal':
      return show(part(1), 1000);
    case 'name':
      return typeof part(1) === 'string' ? (part(1) as string) : '…';
    case 'application':
      return `${operand(part(1))}(${itemsOf(part(2)).map(unparse).join(', ')}${isCut(lastOf(part(2))) ? '…' : ''})`;
    case 'binary_operator_combination':
    case 'logical_composition':
      return `${operand(part(2))} ${typeof part(1) === 'string' ? (part(1) as string) : '…'} ${operand(part(3))}`;
    case 'unary_operator_combination':
      return `${part(1) === '-unary' ? '-' : '!'}${operand(part(2))}`;
    case 'conditional_expression':
      return `${operand(part(1))} ? ${operand(part(2))} : ${operand(part(3))}`;
    case 'lambda_expression': {
      const params = itemsOf(part(1)).map(unparse);
      const body = part(2);
      const shown = isPairRead(body) && body[0] === 'return_statement' ? unparse(itemsOf(body)[1] ?? { cut: true }) : '{ … }';
      return `${params.length === 1 ? params[0] : `(${params.join(', ')})`} => ${shown}`;
    }
    case 'assignment':
      return `${unparse(part(1))} = ${unparse(part(2))}`;
    default:
      return '…';
  }
}

/** The tail end of a list: `null`, or a cut marker when the text stopped. */
function lastOf(v: Read): Read {
  let rest = v;
  while (isPairRead(rest)) rest = rest[1];
  return rest;
}

/** A value as the timeline shows it: numbers and strings as they are, structures briefly. */
export function shortValue(text: string | undefined): string {
  if (text === undefined) return '?';
  const v = readValue(text);
  if (isPairRead(v) && v[0] === 'compound_function') return 'a function';
  if (isPairRead(v) && v[0] === 'primitive') return 'a primitive';
  return show(v, 18);
}

export interface Thunk {
  id: number;
  /** The parameter the thunk was bound to. */
  param: string;
  /** The argument expression, as source text. */
  exp: string;
  /** The text of the thunk as `delay_it` returned it, for matching later forcings. */
  text: string;
}

export type ThunkEvent =
  /** A compound function is applied and each argument becomes a thunk. */
  | { kind: 'delay'; params: string[]; thunks: number[] }
  /**
   * A thunk is forced and its expression evaluated. `done` is set when nothing
   * else happened before the value came back; `again` when the thunk had been
   * forced before and, not memoized, is evaluated once more.
   */
  | { kind: 'force'; thunk: number; via: string | null; primitive: boolean; again: boolean; value: string | null; done: boolean }
  /** A forcing that took a while: the thunk's value is now known. */
  | { kind: 'forced'; thunk: number; value: string | null }
  /** An evaluated thunk is forced: its value comes back with no evaluation. */
  | { kind: 'reuse'; thunk: number | null; via: string | null; primitive: boolean; value: string };

export interface ThunkTimeline {
  thunks: Thunk[];
  events: ThunkEvent[];
}

const isThunkText = (text: string | undefined): boolean => text !== undefined && text.startsWith('["thunk"');
const isEvaluatedText = (text: string | undefined): boolean => text !== undefined && text.startsWith('["evaluated_thunk"');
const isThunkCall = (call: WatchedCall): boolean =>
  call.name === 'delay_it' || (call.name === 'force_it' && (isThunkText(call.args[0]) || isEvaluatedText(call.args[0])));
const isPrimitiveApply = (call: WatchedCall | undefined): boolean =>
  call !== undefined && call.name === 'apply' && (call.args[0] ?? '').startsWith('["primitive"');

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export function thunkTimeline(calls: readonly WatchedCall[]): ThunkTimeline {
  const byNumber = new Map(calls.map((call) => [call.n, call]));
  const thunks: Thunk[] = [];
  const events: ThunkEvent[] = [];
  const forcedValue = new Map<number, string | null>();
  const forcedAt = new Map<number, number>();
  // For each application of a compound function, the thunk each parameter was bound to.
  const bound = new Map<number, Map<string, number>>();

  /**
   * The thunk a name refers to: the one bound to it by the innermost pending
   * application that has it as a parameter. This is where lookup finds it
   * unless the name is a closure's, whose application has already returned.
   */
  const boundTo = (call: WatchedCall, name: string | null): number | null => {
    if (name === null) return null;
    for (let p = call.parent; p !== null; p = byNumber.get(p)?.parent ?? null) {
      const id = bound.get(p)?.get(name);
      if (id !== undefined) return id;
    }
    return null;
  };
  // Forcings whose value has not come back yet, innermost last.
  const open: { call: WatchedCall; event: ThunkEvent & { kind: 'force' } }[] = [];

  const isWithin = (call: WatchedCall, ancestor: number): boolean => {
    for (let p = call.parent; p !== null; p = byNumber.get(p)?.parent ?? null) if (p === ancestor) return true;
    return false;
  };

  const close = (until: WatchedCall | null): void => {
    while (open.length > 0) {
      const top = open[open.length - 1];
      if (top === undefined || (until !== null && isWithin(until, top.call.n))) return;
      open.pop();
      // Unknown when force_it handed its work on as a tail call, as the unmemoized one does.
      const value = top.call.value === undefined ? null : shortValue(top.call.value);
      if (top.event.done) top.event.value = value;
      else events.push({ kind: 'forced', thunk: top.event.thunk, value });
      forcedValue.set(top.event.thunk, value);
    }
  };

  /** The expression whose value was needed: the `actual_value` that `force_it` replaced as a tail call. */
  const viaOf = (force: WatchedCall): string | null => {
    for (let n = force.n - 1; n >= 0; n--) {
      const call = byNumber.get(n);
      if (call === undefined) break;
      if (call.name === 'actual_value' && call.depth === force.depth && call.parent === force.parent) {
        return unparse(readValue(call.args[0] ?? ''));
      }
      if (call.depth < force.depth) break;
    }
    return null;
  };

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    if (call === undefined) continue;
    const arg = call.args[0];
    if (call.name === 'delay_it') {
      close(call);
      const apply = call.parent === null ? undefined : byNumber.get(call.parent);
      const params =
        apply !== undefined && apply.name === 'apply'
          ? itemsOf(itemsOf(readValue(apply.args[0] ?? ''))[1] ?? null).map((p) => (typeof p === 'string' ? p : '?'))
          : [];
      // The arguments of one application are delayed one after another.
      const group: WatchedCall[] = [call];
      while (calls[i + 1]?.name === 'delay_it' && calls[i + 1]?.parent === call.parent) group.push(calls[++i] as WatchedCall);
      const frame = new Map<string, number>();
      if (call.parent !== null) bound.set(call.parent, frame);
      const ids = group.map((delay, k) => {
        const id = thunks.length;
        frame.set(params[k] ?? '?', id);
        thunks.push({ id, param: params[k] ?? '?', exp: unparse(readValue(delay.args[0] ?? '')), text: delay.value ?? '' });
        return id;
      });
      events.push({ kind: 'delay', params: ids.map((id) => thunks[id]?.param ?? '?'), thunks: ids });
    } else if (call.name === 'force_it' && isThunkText(arg)) {
      close(call);
      const text = arg ?? '';
      // The thunk with the longest text in common; among equals, the one the name is bound to, then an unforced one, then the newest.
      const via = viaOf(call);
      const scoped = boundTo(call, via);
      let best: Thunk | null = null;
      let bestScore = -1;
      for (const thunk of thunks) {
        const score = commonPrefix(thunk.text, text) * 4 + (thunk.id === scoped ? 2 : 0) + (forcedValue.has(thunk.id) ? 0 : 1);
        if (score >= bestScore) {
          best = thunk;
          bestScore = score;
        }
      }
      if (best === null) continue;
      const parent = call.parent === null ? undefined : byNumber.get(call.parent);
      // Done at once when no other thunk is made or forced before its value comes back.
      const next = calls.slice(i + 1).find(isThunkCall);
      const done = next === undefined || !isWithin(next, call.n);
      const event: ThunkEvent & { kind: 'force' } = {
        kind: 'force',
        thunk: best.id,
        via,
        primitive: isPrimitiveApply(parent),
        again: forcedValue.has(best.id),
        value: null,
        done,
      };
      events.push(event);
      forcedAt.set(best.id, events.length - 1);
      open.push({ call, event });
    } else if (call.name === 'force_it' && isEvaluatedText(arg)) {
      close(call);
      const value = shortValue(call.value);
      const via = viaOf(call);
      // An evaluated thunk keeps only its value: find the thunk last forced to it, preferring one bound to the same name.
      const scoped = boundTo(call, via);
      let match: number | null = scoped !== null && forcedValue.has(scoped) ? scoped : null;
      let matchScore = match === null ? -1 : Infinity;
      for (const [id, v] of forcedValue) {
        if (v !== value) continue;
        const score = (thunks[id]?.param === via ? 1_000_000 : 0) + (forcedAt.get(id) ?? 0);
        if (score > matchScore) {
          match = id;
          matchScore = score;
        }
      }
      const parent = call.parent === null ? undefined : byNumber.get(call.parent);
      events.push({ kind: 'reuse', thunk: match, via, primitive: isPrimitiveApply(parent), value });
    }
  }
  close(null);
  return { thunks, events };
}

export type ThunkState = 'delayed' | 'forcing' | 'evaluated';

export interface ThunkRow extends Thunk {
  state: ThunkState;
  value: string | null;
  /** Times its expression was evaluated. */
  forcings: number;
  /** Times its stored value was reused. */
  reuses: number;
}

/**
 * Every thunk made up to and including event `upTo`, in its state at that
 * point. Without memoization a forced thunk stays a thunk, with the value it
 * gave last time noted beside it.
 */
export function rowsAt(timeline: ThunkTimeline, upTo: number, memoizes = true): ThunkRow[] {
  const rows = new Map<number, ThunkRow>();
  timeline.events.slice(0, upTo + 1).forEach((event) => {
    if (event.kind === 'delay') {
      for (const id of event.thunks) {
        const thunk = timeline.thunks[id];
        if (thunk !== undefined) rows.set(id, { ...thunk, state: 'delayed', value: null, forcings: 0, reuses: 0 });
      }
    } else if (event.kind === 'force') {
      const row = rows.get(event.thunk);
      if (row === undefined) return;
      row.forcings++;
      row.state = !event.done ? 'forcing' : memoizes ? 'evaluated' : 'delayed';
      if (event.done) row.value = event.value;
    } else if (event.kind === 'forced') {
      const row = rows.get(event.thunk);
      if (row === undefined) return;
      row.state = memoizes ? 'evaluated' : 'delayed';
      row.value = event.value;
    } else if (event.thunk !== null) {
      const row = rows.get(event.thunk);
      if (row !== undefined) row.reuses++;
    }
  });
  return [...rows.values()];
}
