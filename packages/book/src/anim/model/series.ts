import type { Trace } from '../useTrace.ts';

/**
 * Numbers a program prints, read as series to plot: each `display(number)`
 * adds a point to the current series, and each `display("a label")` starts a
 * new series with that label. Other lines are ignored.
 */

export interface Series {
  label: string;
  values: number[];
}

export function seriesOf(output: readonly string[]): Series[] {
  const series: Series[] = [];
  let current: Series | null = null;
  for (const line of output) {
    if (line.startsWith('"')) {
      let label: string;
      try {
        label = String(JSON.parse(line));
      } catch {
        label = line;
      }
      current = { label, values: [] };
      series.push(current);
      continue;
    }
    const n = Number(line);
    if (line === '' || !Number.isFinite(n)) continue;
    if (current === null) {
      current = { label: '', values: [] };
      series.push(current);
    }
    current.values.push(n);
  }
  return series.filter((s) => s.values.length > 0);
}

export const seriesFromTrace = (trace: Trace | null): Series[] => seriesOf(trace?.output ?? []);
