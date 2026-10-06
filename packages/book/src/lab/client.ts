import { LabClient, type WorkerLike } from '@sicp/lab';

let client: LabClient | null = null;

/** The page's one Laboratory worker, started on first use. */
export function labClient(): LabClient {
  client ??= new LabClient(
    () =>
      new Worker(new URL('./lab.worker.ts', import.meta.url), {
        type: 'module',
        name: 'sicp-lab',
      }) as unknown as WorkerLike,
  );
  return client;
}
