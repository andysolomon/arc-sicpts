import type { JobHandle, TerminalEvent } from '@sicp/lab';
import { useEffect, useRef, useState } from 'react';
import { labClient } from '../lab/client.ts';

export type Trace = Extract<TerminalEvent, { type: 'trace-done' }>;

export interface TraceOptions {
  maxRecords?: number;
  budget?: number;
  /** Wait this long after the text last changed before tracing it. */
  delayMs?: number;
  /** Also snapshot the program's pairs after each top-level statement (`trace.heap`, §3.3). */
  heap?: boolean;
}

/**
 * The step log of a program, computed by the Laboratory worker and kept in
 * step with the text. The previous log stays on screen until the new one is in.
 */
export function useTrace(source: string, { maxRecords, budget, delayMs = 350, heap = false }: TraceOptions = {}): {
  trace: Trace | null;
  pending: boolean;
} {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [pending, setPending] = useState(true);
  const job = useRef<JobHandle | null>(null);

  useEffect(() => {
    setPending(true);
    const timer = window.setTimeout(() => {
      job.current?.cancel();
      const handle = labClient().submit({
        type: 'trace',
        source,
        ...(maxRecords !== undefined && { maxRecords }),
        ...(budget !== undefined && { budget }),
        ...(heap && { inspect: { heap: true } }),
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
  }, [budget, delayMs, heap, maxRecords, source]);

  useEffect(() => () => job.current?.cancel(), []);

  return { trace, pending };
}
