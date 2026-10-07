import type { JobHandle, JobParams, TerminalEvent } from '@sicp/lab';
import { useEffect, useRef, useState } from 'react';
import { labClient } from '../lab/client.ts';

/**
 * The result of one Laboratory job, recomputed a moment after its parameters
 * stop changing, as `useTrace` does for the step log. The previous result
 * stays on screen until the new one is in. `params` is compared by its JSON.
 */
export function useLabJob<T extends TerminalEvent['type']>(
  params: JobParams | null,
  type: T,
  { delayMs = 350 }: { delayMs?: number } = {},
): { result: Extract<TerminalEvent, { type: T }> | null; pending: boolean } {
  const [result, setResult] = useState<Extract<TerminalEvent, { type: T }> | null>(null);
  const [pending, setPending] = useState(params !== null);
  const job = useRef<JobHandle | null>(null);
  const key = params === null ? null : JSON.stringify(params);

  useEffect(() => {
    if (key === null) {
      setPending(false);
      return;
    }
    setPending(true);
    const timer = window.setTimeout(() => {
      job.current?.cancel();
      const handle = labClient().submit(JSON.parse(key) as JobParams);
      job.current = handle;
      void handle.finished.then((end) => {
        if (job.current !== handle) return;
        job.current = null;
        setPending(false);
        if (end.type === type) setResult(end as Extract<TerminalEvent, { type: T }>);
      });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, key, type]);

  useEffect(() => () => job.current?.cancel(), []);

  return { result, pending };
}
