import { createLabHost, type LabEvent, type LabRequest } from '@sicp/lab';
import type { Trace } from '../src/anim/useTrace.ts';

/** The step log of a program, exactly as the worker would post it. */
export function traceOf(source: string, maxRecords?: number): Trace {
  const events: LabEvent[] = [];
  const host = createLabHost({ post: (event) => events.push(event) });
  const request: LabRequest = { type: 'trace', id: 1, source, ...(maxRecords !== undefined && { maxRecords }) };
  host.handle(request);
  const done = events.find((event): event is Trace => event.type === 'trace-done');
  if (done === undefined) throw new Error('trace did not finish synchronously');
  return done;
}
