import type { JobHandle, LabClient } from '@sicp/lab';
import { useEffect, useRef, useState } from 'react';
import { labClient } from '../../lab/client.ts';
import type { Trace } from '../useTrace.ts';
import type { OutcomeRun } from './outcomes.ts';

/**
 * Laboratory jobs for §3.4's scenes. `useTrace` traces with whatever schedule
 * the worker picks; these hooks pass a seed, so that the reader can choose an
 * interleaving and see it again, and so that a histogram of many runs is the
 * same each time the page is opened.
 */

export interface SeededTraceOptions {
  maxRecords?: number;
  budget?: number;
  delayMs?: number;
  /** The Laboratory to ask; the page's worker by default. */
  client?: LabClient;
  /** Ask nothing (the caller already has a trace). */
  skip?: boolean;
}

/** The step log of one run of `source`, with its threads interleaved by `seed`. */
export function useSeededTrace(
  source: string,
  seed: number,
  { maxRecords, budget, delayMs = 350, client, skip = false }: SeededTraceOptions = {},
): { trace: Trace | null; pending: boolean } {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [pending, setPending] = useState(true);
  const job = useRef<JobHandle | null>(null);

  useEffect(() => {
    if (skip) return;
    setPending(true);
    const timer = window.setTimeout(() => {
      job.current?.cancel();
      const handle = (client ?? labClient()).submit({
        type: 'trace',
        source,
        seed,
        ...(maxRecords !== undefined && { maxRecords }),
        ...(budget !== undefined && { budget }),
      });
      job.current = handle;
      void handle.finished.then((end) => {
        if (job.current !== handle) return;
        job.current = null;
        setPending(false);
        if (end.type === 'trace-done') setTrace(end);
      });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [budget, client, delayMs, maxRecords, seed, skip, source]);

  useEffect(() => () => job.current?.cancel(), []);

  return { trace, pending };
}

export interface OutcomesOptions {
  /** Steps allowed for each run; a run that deadlocks spins until it runs out. */
  budget?: number;
  delayMs?: number;
  client?: LabClient;
}

/**
 * Runs `source` once for each seed from 1 to `runs`, one after another, and
 * collects how each run ended. `runs` stays null until every run is in.
 */
export function useOutcomes(
  source: string,
  count: number,
  { budget = 20_000, delayMs = 350, client }: OutcomesOptions = {},
): { runs: OutcomeRun[] | null; progress: number } {
  const [runs, setRuns] = useState<OutcomeRun[] | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stopped = false;
    let handle: JobHandle | null = null;
    setRuns(null);
    setProgress(0);
    const timer = window.setTimeout(() => {
      void (async () => {
        const lab = client ?? labClient();
        const collected: OutcomeRun[] = [];
        for (let seed = 1; seed <= count; seed++) {
          if (stopped) return;
          handle = lab.submit({ type: 'run', source, seed, budget });
          const end = await handle.finished;
          if (stopped) return;
          if (end.type === 'done') collected.push({ seed, status: 'done', value: end.value });
          else if (end.type === 'budget-exhausted') collected.push({ seed, status: 'budget-exhausted', value: null });
          else if (end.type === 'error') {
            // A program that does not parse fails the same way for every seed.
            collected.push({ seed, status: 'error', value: null });
            if (end.steps === 0) break;
          } else return;
          setProgress(collected.length);
        }
        setRuns(collected);
      })();
    }, delayMs);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      handle?.cancel();
    };
  }, [budget, client, count, delayMs, source]);

  return { runs, progress };
}
