import { isTerminal, type JobRequest, type LabEvent, type LabRequest, type TerminalEvent } from './protocol.ts';

/**
 * The page side of the protocol. It owns one worker, numbers the jobs, routes
 * events back to whoever submitted them, and guarantees that a cancelled job
 * ends: if the worker does not confirm in time, the worker is replaced.
 */

/** The part of `Worker` the client relies on. */
export interface WorkerLike {
  postMessage(message: LabRequest): void;
  terminate(): void;
  onmessage: ((event: { data: LabEvent }) => void) | null;
}

export interface ClientOptions {
  /** How long to wait for a `cancelled` event before replacing the worker. */
  cancelGraceMs?: number;
}

export interface JobHandle {
  id: number;
  cancel(): void;
  /** Resolves with the event that ended the job. Never rejects. */
  finished: Promise<TerminalEvent>;
}

type Distribute<T> = T extends unknown ? Omit<T, 'id'> : never;
export type JobParams = Distribute<JobRequest>;

interface Pending {
  onEvent: (event: LabEvent) => void;
  resolve: (event: TerminalEvent) => void;
  graceTimer: ReturnType<typeof setTimeout> | null;
}

export class LabClient {
  private readonly spawn: () => WorkerLike;
  private readonly cancelGraceMs: number;
  private worker: WorkerLike | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(spawn: () => WorkerLike, options: ClientOptions = {}) {
    this.spawn = spawn;
    this.cancelGraceMs = options.cancelGraceMs ?? 400;
  }

  submit(params: JobParams, onEvent: (event: LabEvent) => void = () => {}): JobHandle {
    const id = this.nextId++;
    const finished = new Promise<TerminalEvent>((resolve) => {
      this.pending.set(id, { onEvent, resolve, graceTimer: null });
    });
    this.ensureWorker().postMessage({ ...params, id } as JobRequest);
    return { id, finished, cancel: () => this.cancel(id) };
  }

  cancel(id: number): void {
    const job = this.pending.get(id);
    if (job === undefined || job.graceTimer !== null) return;
    this.worker?.postMessage({ type: 'cancel', id });
    job.graceTimer = setTimeout(() => this.replaceWorker(), this.cancelGraceMs);
  }

  /** Stop the worker and end every outstanding job as cancelled. */
  dispose(): void {
    this.replaceWorker();
  }

  private ensureWorker(): WorkerLike {
    if (this.worker === null) {
      const worker = this.spawn();
      worker.onmessage = (event) => this.receive(event.data);
      this.worker = worker;
    }
    return this.worker;
  }

  private receive(event: LabEvent): void {
    const job = this.pending.get(event.id);
    if (job === undefined) return;
    if (isTerminal(event)) this.settle(event.id, job, event);
    else job.onEvent(event);
  }

  private settle(id: number, job: Pending, event: TerminalEvent): void {
    if (job.graceTimer !== null) clearTimeout(job.graceTimer);
    this.pending.delete(id);
    job.onEvent(event);
    job.resolve(event);
  }

  /**
   * The worker did not answer a cancel. Terminate it; every job it was running
   * is lost, so each one ends as a forced cancellation. The next job gets a
   * fresh worker.
   */
  private replaceWorker(): void {
    if (this.worker !== null) {
      this.worker.onmessage = null;
      this.worker.terminate();
      this.worker = null;
    }
    for (const [id, job] of [...this.pending]) {
      this.settle(id, job, { type: 'cancelled', id, steps: 0, forced: true });
    }
  }
}
