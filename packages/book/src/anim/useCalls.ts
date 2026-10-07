import type { JobHandle, WatchedCall } from '@sicp/lab';
import { useEffect, useRef, useState } from 'react';
import { labClient } from '../lab/client.ts';

export interface CallLog {
  calls: WatchedCall[];
  truncated: boolean;
  /** Lines the program displayed. */
  output: string[];
  /** How the run ended: `done`, `error`, `budget-exhausted` or `cancelled`. */
  status: string;
  /** The program's value or error message, when it has one. */
  result: string | null;
}

export interface CallLogOptions {
  /** Declarations the program can use without seeing them, such as an evaluator. */
  prelude?: string | undefined;
  budget?: number;
  maxCalls?: number;
  /** Longest text of one argument or result; the Laboratory's default is 160 characters. */
  maxText?: number;
  /** Wait this long after the text last changed before running it. */
  delayMs?: number;
}

/**
 * The calls a program makes to the named functions, logged by the Laboratory
 * worker and kept in step with the text, as `useTrace` does for the step log.
 * The evaluators of Chapter 4 are Source programs, so this is how a scene sees
 * `evaluate` and `apply`, or `force_it`, at work.
 */
export function useCalls(
  source: string,
  names: readonly string[],
  { prelude, budget = 5_000_000, maxCalls, maxText, delayMs = 350 }: CallLogOptions = {},
): { log: CallLog | null; pending: boolean } {
  const [log, setLog] = useState<CallLog | null>(null);
  const [pending, setPending] = useState(true);
  const job = useRef<JobHandle | null>(null);
  const key = names.join(',');

  useEffect(() => {
    setPending(true);
    const timer = window.setTimeout(() => {
      job.current?.cancel();
      const output: string[] = [];
      let calls: WatchedCall[] = [];
      let truncated = false;
      const handle = labClient().submit(
        {
          type: 'run',
          source,
          budget,
          ...(prelude !== undefined && { prelude }),
          inspect: {
            calls: {
              names: key.split(','),
              ...(maxCalls !== undefined && { maxCalls }),
              ...(maxText !== undefined && { maxText }),
            },
          },
        },
        (event) => {
          if (event.type === 'display') output.push(event.text);
          if (event.type === 'calls') {
            calls = event.calls;
            truncated = event.truncated;
          }
        },
      );
      job.current = handle;
      void handle.finished.then((end) => {
        if (job.current !== handle) return;
        job.current = null;
        setPending(false);
        const result = end.type === 'done' ? end.value : end.type === 'error' ? end.error.message : null;
        setLog({ calls, truncated, output, status: end.type, result });
      });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [budget, delayMs, key, maxCalls, maxText, prelude, source]);

  useEffect(() => () => job.current?.cancel(), []);

  return { log, pending };
}
