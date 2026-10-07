import type { StepRecord, TraceOutcome } from '@sicp/lab';

/**
 * A timing diagram read from the evaluator's trace of a program with threads
 * (§3.4): one lane per thread, the steps that matter in the order the machine
 * took them, and the shared variables between the lanes. A shared variable is
 * one that some thread assigns. A write is marked when the thread's last read
 * of the variable came before another thread changed it: that other thread's
 * update is lost (figure 3.29). A write is marked as mixed when the reads it
 * was computed from saw different values, because another thread changed the
 * variable between them.
 */

export type RowKind = 'call' | 'read' | 'write' | 'lock' | 'end';

export interface InterleavingRow {
  /** Position of the record in the trace, 1-based. */
  n: number;
  thread: number;
  kind: RowKind;
  /** Short text for the lane, e.g. `balance → 100` or `withdraw(10)`. */
  text: string;
  symbol?: string;
  value?: string;
  /** How many times in a row the thread did the same thing (a mutex spinning). */
  repeat: number;
  /** For a write: the thread whose update this write overwrites without having seen it. */
  overwrites?: number;
  /** For a write: the different values its thread's reads saw since its last write, when they differ. */
  mixed?: string[];
}

export interface Interleaving {
  /** The threads `concurrent_execute` started, in order. */
  threads: number[];
  /** Variables some thread assigns. */
  shared: string[];
  /** Their values when the threads started. */
  initial: Record<string, string>;
  rows: InterleavingRow[];
  /** The shared variables' values after each row. */
  after: Record<string, string>[];
  /** Writes that overwrote another thread's update unseen. */
  lost: number;
  /** Writes computed from reads that saw different values. */
  mixed: number;
  /** The value of the program, when it finished. */
  value: string | null;
  /** True when the trace stopped at its limit before the program ended. */
  truncated: boolean;
}

const MAX_TEXT = 26;
const clip = (text: string): string => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

/** The steps of a lane that are worth a row, or null for the rest. */
function rowOf(record: StepRecord, shared: ReadonlySet<string>): Omit<InterleavingRow, 'repeat' | 'n' | 'thread'> | null {
  const { event } = record;
  switch (event.kind) {
    case 'name':
      return shared.has(event.symbol) ? { kind: 'read', text: `${event.symbol} → ${event.value}`, symbol: event.symbol, value: event.value } : null;
    case 'define':
      return event.assignment && shared.has(event.symbol)
        ? { kind: 'write', text: `${event.symbol} = ${event.value}`, symbol: event.symbol, value: event.value }
        : null;
    case 'call':
      return event.name === 'lambda' ? null : { kind: 'call', text: clip(`${event.name}(${event.args.join(', ')})`) };
    case 'result':
      return record.text.startsWith('test_and_set(') ? { kind: 'lock', text: `test_and_set → ${event.value}`, value: event.value } : null;
    case 'thread':
      return event.change === 'end' ? { kind: 'end', text: 'ends' } : null;
    default:
      return null;
  }
}

export function interleaving(records: readonly StepRecord[], outcome: TraceOutcome | null = null, truncated = false): Interleaving {
  const threads: number[] = [];
  const sharedSet = new Set<string>();
  for (const r of records) {
    if (r.event.kind === 'thread' && r.event.change === 'spawn' && !threads.includes(r.event.thread)) threads.push(r.event.thread);
    if ((r.thread ?? 0) > 0 && r.event.kind === 'define' && r.event.assignment) sharedSet.add(r.event.symbol);
  }
  const shared = [...sharedSet];

  // The shared variables' values when the first thread started: their last
  // declaration, assignment or binding as a parameter before it.
  const initial: Record<string, string> = {};
  const firstThreaded = records.findIndex((r) => r.thread !== undefined);
  for (const r of firstThreaded < 0 ? [] : records.slice(0, firstThreaded)) {
    if (r.event.kind === 'define' && sharedSet.has(r.event.symbol)) initial[r.event.symbol] = r.event.value;
    if (r.event.kind === 'call') {
      const { params, args } = r.event;
      params.forEach((p, i) => {
        if (sharedSet.has(p) && args[i] !== undefined) initial[p] = args[i];
      });
    }
  }

  const rows: InterleavingRow[] = [];
  const after: Record<string, string>[] = [];
  const current = { ...initial };
  /** Per thread: indices of its rows, newest last. */
  const lanes = new Map<number, number[]>();
  /** Per thread and variable: its reads since its own last write, as row indices. */
  const reads = new Map<string, number[]>();
  /** Per variable: the row and thread of its last write. */
  const lastWrite = new Map<string, { row: number; thread: number }>();
  let lost = 0;
  let mixed = 0;

  for (const record of records) {
    const thread = record.thread ?? 0;
    if (thread === 0 || !threads.includes(thread)) continue;
    const found = rowOf(record, sharedSet);
    if (found === null) continue;

    // A thread that repeats one of its last two rows is spinning: count it there.
    const lane = lanes.get(thread) ?? [];
    const recent = lane.slice(-2).map((i) => rows[i]).find((row) => row !== undefined && row.text === found.text && row.kind !== 'write');
    if (recent !== undefined && found.kind !== 'read') {
      recent.repeat++;
      continue;
    }

    const row: InterleavingRow = { n: record.n, thread, repeat: 1, ...found };
    const index = rows.length;
    const key = `${thread}:${found.symbol ?? ''}`;
    if (found.kind === 'read' && found.symbol !== undefined) reads.set(key, [...(reads.get(key) ?? []), index]);
    if (found.kind === 'write' && found.symbol !== undefined) {
      const seen = reads.get(key) ?? [];
      const last = seen.at(-1);
      const previous = lastWrite.get(found.symbol);
      if (last !== undefined && previous !== undefined && previous.thread !== thread && previous.row > last) {
        row.overwrites = previous.thread;
        lost++;
      }
      const values = [...new Set(seen.map((i) => rows[i]?.value ?? ''))];
      if (values.length > 1) {
        row.mixed = values;
        mixed++;
      }
      reads.delete(key);
      lastWrite.set(found.symbol, { row: index, thread });
      current[found.symbol] = found.value ?? '';
    }
    rows.push(row);
    after.push({ ...current });
    lane.push(index);
    lanes.set(thread, lane);
  }

  return {
    threads,
    shared,
    initial,
    rows,
    after,
    lost,
    mixed,
    value: outcome?.status === 'done' ? outcome.value : null,
    truncated,
  };
}

/** One sentence about a row, for the caption. */
export function describeRow(row: InterleavingRow): string {
  const who = `Thread ${row.thread}`;
  const times = row.repeat > 1 ? ` (${row.repeat} times in a row)` : '';
  switch (row.kind) {
    case 'read':
      return `${who} looks up \`${row.symbol}\`: ${row.value}.`;
    case 'write': {
      const set = `${who} sets \`${row.symbol}\` to ${row.value}`;
      if (row.overwrites !== undefined) {
        return `${set}, computed from a value it read before thread ${row.overwrites} changed \`${row.symbol}\`: thread ${row.overwrites}'s update is lost.`;
      }
      if (row.mixed !== undefined) {
        return `${set}. Its reads saw different values (${row.mixed.join(', then ')}): another thread changed \`${row.symbol}\` in between.`;
      }
      return `${set}.`;
    }
    case 'call':
      return `${who} calls \`${row.text}\`${times}.`;
    case 'lock':
      return row.value === 'true'
        ? `${who} finds the mutex taken: \`test_and_set\` gives true, so it tries again${times}.`
        : `${who} acquires the mutex: \`test_and_set\` gives false and sets the cell.`;
    case 'end':
      return `${who} has finished.`;
  }
}

/** The caption after the last row. */
export function summarize(model: Interleaving): string {
  const result = model.value === null ? (model.truncated ? 'The trace stopped before the program ended.' : 'The program did not finish.') : `The program's value is ${model.value}.`;
  const lost =
    model.lost === 0
      ? 'No write overwrote an update it had not seen.'
      : `${model.lost === 1 ? 'One write' : `${model.lost} writes`} overwrote another thread's update unseen (in red).`;
  const mixed =
    model.mixed === 0
      ? ''
      : ` ${model.mixed === 1 ? 'One write was' : `${model.mixed} writes were`} computed from reads that saw different values (dashed).`;
  return `${result} ${lost}${mixed} Try another seed for another interleaving.`;
}
