import type { ProcessShapeSnapshot } from '@sicp/lab';

/**
 * Measurements of one function at several sizes, read from a process-shape
 * snapshot: every top-level call such as `fib(15)` is one point, and calls of
 * the same function form a series. The size is the call's last argument.
 */

export interface GrowthPoint {
  label: string;
  /** The size: the last numeric argument of the call. */
  n: number;
  /** Compound function applications: a measure of time. */
  calls: number;
  /** The deepest the stack of pending calls got: a measure of space. */
  depth: number;
  /** Position among all measured calls, in program order. */
  order: number;
}

export interface GrowthSeries {
  name: string;
  points: GrowthPoint[];
}

export interface Growth {
  series: GrowthSeries[];
  /** All points in program order. */
  points: GrowthPoint[];
}

const CALL = /^([A-Za-z_$][\w$]*)\((.*)\)$/;
const LAST_NUMBER = /(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*$/i;

/** `fib(15)` → `{ name: 'fib', n: 15 }`; null for anything that is not a call with a numeric last argument. */
export function sizeOf(label: string): { name: string; n: number } | null {
  const call = CALL.exec(label.trim());
  if (call === null) return null;
  const [, name = '', args = ''] = call;
  const last = LAST_NUMBER.exec(args);
  return last === null ? null : { name, n: Number(last[1]) };
}

export function growth(snapshot: ProcessShapeSnapshot | null): Growth {
  const points: GrowthPoint[] = [];
  const byName = new Map<string, GrowthPoint[]>();
  for (const run of snapshot?.runs ?? []) {
    const size = sizeOf(run.label);
    if (size === null) continue;
    const point: GrowthPoint = { label: run.label, n: size.n, calls: run.calls, depth: run.maxDepth, order: points.length };
    points.push(point);
    const list = byName.get(size.name) ?? [];
    list.push(point);
    byName.set(size.name, list);
  }
  const series = [...byName].map(([name, list]) => ({ name, points: [...list].sort((a, b) => a.n - b.n) }));
  return { series, points };
}

export interface Scale {
  (value: number): number;
  log: boolean;
  ticks: number[];
}

const niceTicks = (lo: number, hi: number, count: number): number[] => {
  const span = hi - lo || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => span / s <= count) ?? magnitude * 10;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) out.push(Number(t.toPrecision(12)));
  return out;
};

/**
 * A scale from data to pixels. It turns logarithmic when the data spans more
 * than `logRatio` to one, so exponential and linear growth both stay visible.
 */
export function scale(values: readonly number[], [from, to]: [number, number], { logRatio = 100, zero = true }: { logRatio?: number; zero?: boolean } = {}): Scale {
  const positive = values.filter((v) => v > 0);
  const lo = Math.min(...positive, Infinity);
  const hi = Math.max(...values, 1);
  const log = positive.length > 0 && hi / lo >= logRatio;
  if (log) {
    // A little slack, so that 100 003 does not stretch the axis to a million.
    const a = Math.floor(Math.log10(lo) + 0.01);
    const b = Math.max(a + 1, Math.ceil(Math.log10(hi) - 0.01));
    const f = ((v: number) => from + ((Math.log10(Math.max(v, 10 ** a)) - a) / (b - a)) * (to - from)) as Scale;
    f.log = true;
    f.ticks = Array.from({ length: b - a + 1 }, (_, i) => 10 ** (a + i));
    return f;
  }
  const min = zero ? 0 : Math.min(...values);
  const ticks = niceTicks(min, hi, 4);
  const top = Math.max(hi, ticks[ticks.length - 1] ?? hi);
  const f = ((v: number) => from + ((v - min) / (top - min || 1)) * (to - from)) as Scale;
  f.log = false;
  f.ticks = ticks;
  return f;
}

/** The factor by which a measure grew from the first point of a series to the last. */
export function factor(series: GrowthSeries, measure: 'calls' | 'depth'): { from: GrowthPoint; to: GrowthPoint; times: number } | null {
  const from = series.points[0];
  const to = series.points[series.points.length - 1];
  if (from === undefined || to === undefined || from === to || from[measure] === 0) return null;
  return { from, to, times: to[measure] / from[measure] };
}
