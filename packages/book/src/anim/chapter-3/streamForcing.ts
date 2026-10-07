/**
 * What a stream program computed, and how often, read from what it printed.
 * The programs of §3.5.1 and §3.5.2 print each element at the moment it is
 * computed (`display` returns its argument, so `pair(display(x), () => ...)`
 * or `stream_map(display, s)` does it). Every printed number is one
 * computation; a value printed again was computed again, which is what an
 * unmemoized tail does each time it is forced. `display("a label")` starts a
 * new stream, so one program can compare two.
 */

export interface ForcingRun {
  /** The label printed before the run, or '' for numbers printed before any label. */
  label: string;
  /** The numbers printed, in order, as text. */
  values: string[];
}

export function forcingRuns(output: readonly string[]): ForcingRun[] {
  const runs: ForcingRun[] = [];
  let current: ForcingRun | null = null;
  for (const line of output) {
    if (line.startsWith('"')) {
      let label: string;
      try {
        label = String(JSON.parse(line));
      } catch {
        label = line;
      }
      current = { label, values: [] };
      runs.push(current);
      continue;
    }
    if (line.trim() === '' || !Number.isFinite(Number(line))) continue;
    if (current === null) {
      current = { label: '', values: [] };
      runs.push(current);
    }
    current.values.push(line);
  }
  return runs.filter((run) => run.values.length > 0);
}

export interface ForcingCell {
  value: string;
  /** How many times the value has been computed so far. */
  count: number;
}

export interface ForcingRow {
  label: string;
  /** Distinct values in the order they were first computed. */
  cells: ForcingCell[];
  /** Computations so far, repeats included. */
  computations: number;
}

export interface ForcingState {
  rows: ForcingRow[];
  /** The computation that happened last, if any. */
  latest: { row: number; value: string; count: number; elements: number } | null;
}

/** Total computations across all runs. */
export const forcingTotal = (runs: readonly ForcingRun[]): number => runs.reduce((n, run) => n + run.values.length, 0);

/** The picture after the first `upto` computations, counted across runs in the order they were printed. */
export function forcingAt(runs: readonly ForcingRun[], upto: number): ForcingState {
  let left = Math.max(0, upto);
  let latest: ForcingState['latest'] = null;
  const rows = runs.map((run, row): ForcingRow => {
    const cells: ForcingCell[] = [];
    const index = new Map<string, ForcingCell>();
    const taken = run.values.slice(0, left);
    left -= taken.length;
    for (const value of taken) {
      let cell = index.get(value);
      if (cell === undefined) {
        cell = { value, count: 0 };
        index.set(value, cell);
        cells.push(cell);
      }
      cell.count++;
      latest = { row, value, count: cell.count, elements: cells.length };
    }
    return { label: run.label, cells, computations: taken.length };
  });
  return { rows, latest };
}

export interface ForcingSummary {
  label: string;
  elements: number;
  computations: number;
  /** Computations beyond the first of each value. */
  repeats: number;
}

export function forcingSummary(runs: readonly ForcingRun[]): ForcingSummary[] {
  return runs.map((run) => {
    const elements = new Set(run.values).size;
    return { label: run.label, elements, computations: run.values.length, repeats: run.values.length - elements };
  });
}
