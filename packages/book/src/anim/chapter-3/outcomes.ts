/**
 * The final values of many runs of one program, each run interleaving its
 * threads by a different seed (§3.4), counted value by value.
 */

export interface OutcomeRun {
  seed: number;
  /** How the run ended. */
  status: 'done' | 'error' | 'budget-exhausted' | 'cancelled';
  /** The program's value as text, when it finished. */
  value: string | null;
}

export interface OutcomeBar {
  label: string;
  count: number;
  /** The first seed that gave this outcome, to reproduce it. */
  firstSeed: number;
  /** True for runs that did not end with a value: errors, and runs that never finished. */
  failure: boolean;
}

export const NO_END = 'did not finish';
export const ERROR = 'error';

/** The label of a run: its value (a string without its quotes), or how it failed. */
export function labelOf(run: OutcomeRun): string {
  if (run.status === 'budget-exhausted') return NO_END;
  if (run.status !== 'done' || run.value === null) return ERROR;
  const { value } = run;
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function compareLabels(a: OutcomeBar, b: OutcomeBar): number {
  if (a.failure !== b.failure) return a.failure ? 1 : -1;
  const x = a.label === '' ? Number.NaN : Number(a.label);
  const y = b.label === '' ? Number.NaN : Number(b.label);
  if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
  if (Number.isNaN(x) !== Number.isNaN(y)) return Number.isNaN(x) ? 1 : -1;
  return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
}

/** Bars for the first `shown` runs (all of them by default): numbers in order, failures last. */
export function histogram(runs: readonly OutcomeRun[], shown = runs.length): OutcomeBar[] {
  const bars = new Map<string, OutcomeBar>();
  for (const run of runs.slice(0, shown)) {
    const label = labelOf(run);
    const bar = bars.get(label);
    if (bar === undefined) bars.set(label, { label, count: 1, firstSeed: run.seed, failure: run.status !== 'done' });
    else bar.count++;
  }
  return [...bars.values()].sort(compareLabels);
}

/** The caption for the keyframe that has added run `index` (0-based). */
export function describeRun(runs: readonly OutcomeRun[], index: number): string {
  const run = runs[index];
  if (run === undefined) return '';
  const label = labelOf(run);
  const kinds = histogram(runs, index + 1).length;
  const ended = label === NO_END ? 'never finished: it ran out of steps' : label === ERROR ? 'stopped with an error' : `ended with ${label}`;
  return `Run ${index + 1}, seed ${run.seed}, ${ended}. So far ${kinds} different outcome${kinds === 1 ? '' : 's'}.`;
}

/** The caption once every run is in. */
export function summarizeRuns(runs: readonly OutcomeRun[]): string {
  const bars = histogram(runs);
  const listed = [...bars]
    .sort((a, b) => b.count - a.count)
    .map((bar) => `${bar.label} (${bar.count}×)`)
    .join(', ');
  const one = bars.length === 1;
  return `${runs.length} runs, ${bars.length} different outcome${one ? '' : 's'}: ${listed}.${one ? ' Every interleaving gave the same result.' : ''}`;
}
