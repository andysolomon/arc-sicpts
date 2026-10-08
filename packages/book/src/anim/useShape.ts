import { useEditionPending } from '../editions/context.ts';
import type { JobHandle, ProcessShapeSnapshot } from '@sicp/lab';
import { useEffect, useRef, useState } from 'react';
import { labClient } from '../lab/client.ts';

export interface Shape {
  snapshot: ProcessShapeSnapshot;
  /** How the run ended: `done`, `error`, `budget-exhausted` or `cancelled`. */
  status: string;
}

/**
 * The process shape of every top-level call a program makes, measured by the
 * Laboratory worker and kept in step with the text, as `useTrace` does for
 * the step log. A run is not a trace, so it can afford a much larger budget.
 */
export function useShape(source: string, { budget = 1_000_000, delayMs = 350 }: { budget?: number; delayMs?: number } = {}): {
  shape: Shape | null;
  pending: boolean;
} {
  const [shape, setShape] = useState<Shape | null>(null);
  const [pending, setPending] = useState(true);
  useEditionPending(pending);
  const job = useRef<JobHandle | null>(null);

  useEffect(() => {
    setPending(true);
    const timer = window.setTimeout(() => {
      job.current?.cancel();
      let snapshot: ProcessShapeSnapshot = { runs: [] };
      const handle = labClient().submit({ type: 'run', source, budget, inspect: { processShape: true } }, (event) => {
        if (event.type === 'shape') snapshot = event.snapshot;
      });
      job.current = handle;
      void handle.finished.then((end) => {
        if (job.current !== handle) return;
        job.current = null;
        setPending(false);
        setShape({ snapshot, status: end.type });
      });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [budget, delayMs, source]);

  useEffect(() => () => job.current?.cancel(), []);

  return { shape, pending };
}
