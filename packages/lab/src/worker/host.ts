import { prepare } from '../evaluator/evaluate.ts';
import { DEFAULT_BUDGET, type Machine } from '../evaluator/machine.ts';
import { stringify } from '../evaluator/values.ts';
import { createProcessShapeTracer } from '../inspect/processShape.ts';
import { createStepTracer } from '../inspect/stepTrace.ts';
import { SourceError } from '../syntax/errors.ts';
import type {
  CheckRequest,
  ErrorPayload,
  LabEvent,
  LabRequest,
  RunRequest,
  TestResult,
  TestSpec,
  TraceOutcome,
  TraceRequest,
} from './protocol.ts';

/**
 * The worker side of the protocol, independent of any actual Worker so that it
 * can be tested directly. Jobs run in slices and yield to the event loop
 * between slices; that is what lets a `cancel` message get through.
 */

export interface HostDeps {
  post(event: LabEvent): void;
  /** Resolve after pending messages have had a chance to be delivered. */
  yieldToEventLoop?: () => Promise<void>;
  now?: () => number;
  /** Evaluator steps per slice. */
  sliceSteps?: number;
}

export interface LabHost {
  handle(request: LabRequest): void;
  /** Number of jobs that have started and not yet reported a terminal event. */
  activeJobs(): number;
}

interface Job {
  cancelled: boolean;
}

const TRACE_BUDGET = 20_000;

function defaultYield(): Promise<void> {
  // A message channel avoids the 4 ms clamp that nested timers get.
  if (typeof MessageChannel !== 'undefined') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function payload(error: unknown): ErrorPayload {
  if (error instanceof SourceError) {
    return { message: error.message, phase: error.phase, loc: error.loc };
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    phase: 'runtime',
    loc: null,
  };
}

export function createLabHost(deps: HostDeps): LabHost {
  const { post } = deps;
  const pause = deps.yieldToEventLoop ?? defaultYield;
  const now = deps.now ?? (() => performance.now());
  const sliceSteps = deps.sliceSteps ?? 10_000;
  const jobs = new Map<number, Job>();

  /** Run a machine in slices. Resolves `false` when the job was cancelled. */
  async function drive(machine: Machine, job: Job, afterSlice?: () => void): Promise<boolean> {
    for (;;) {
      if (job.cancelled) return false;
      const status = machine.run(sliceSteps);
      afterSlice?.();
      if (status !== 'paused') return true;
      await pause();
    }
  }

  async function run(request: RunRequest, job: Job): Promise<void> {
    const { id, source } = request;
    const started = now();
    const tracer = request.inspect?.processShape === true ? createProcessShapeTracer(source) : null;

    let machine: Machine;
    try {
      machine = prepare(source, {
        budget: request.budget ?? DEFAULT_BUDGET,
        display: (text) => post({ type: 'display', id, text }),
        ...(tracer !== null && { hooks: [tracer.hooks] }),
        ...(request.prelude !== undefined && { prelude: request.prelude }),
      }).machine;
    } catch (error) {
      post({ type: 'error', id, error: payload(error), steps: 0, ms: now() - started });
      return;
    }

    let sent = 0;
    const finished = await drive(machine, job, () => {
      if (tracer !== null && tracer.version() !== sent) {
        sent = tracer.version();
        post({ type: 'shape', id, snapshot: tracer.snapshot() });
      }
    });

    const { steps } = machine;
    const ms = now() - started;
    if (!finished) post({ type: 'cancelled', id, steps, forced: false });
    else if (machine.status === 'done') post({ type: 'done', id, value: stringify(machine.value), steps, ms });
    else if (machine.status === 'budget-exhausted') {
      post({ type: 'budget-exhausted', id, steps, budget: machine.budget, ms });
    } else post({ type: 'error', id, error: payload(machine.error), steps, ms });
  }

  function trace(request: TraceRequest): void {
    const { id, source } = request;
    const tracer = createStepTracer(source, request.maxRecords);
    const output: string[] = [];
    let outcome: TraceOutcome;
    try {
      const { machine } = prepare(source, {
        budget: request.budget ?? TRACE_BUDGET,
        hooks: [tracer.hooks],
        display: (text) => output.push(text),
        ...(request.prelude !== undefined && { prelude: request.prelude }),
      });
      // A trace is bounded by its small budget, so it runs in one go.
      machine.run();
      if (machine.status === 'done') outcome = { status: 'done', value: stringify(machine.value) };
      else if (machine.status === 'error') outcome = { status: 'error', error: payload(machine.error) };
      else outcome = { status: 'budget-exhausted' };
    } catch (error) {
      outcome = { status: 'error', error: payload(error) };
    }
    post({
      type: 'trace-done',
      id,
      records: tracer.records,
      truncated: tracer.truncated(),
      outcome,
      output,
    });
  }

  /** `null` when the test ran to a verdict; `'cancelled'` when the job was cancelled. */
  async function runTest(
    request: CheckRequest,
    test: TestSpec,
    job: Job,
  ): Promise<TestResult | 'cancelled'> {
    const budget = request.budget ?? DEFAULT_BUDGET;
    const result = (pass: boolean, detail: string | null): TestResult => ({
      name: test.name,
      pass,
      detail,
    });
    const describe = (machine: Machine): string =>
      machine.status === 'budget-exhausted'
        ? `budget of ${machine.budget} steps exhausted`
        : (machine.error?.message ?? 'did not finish');

    try {
      // Each test gets a fresh run of the program, so tests cannot affect each other.
      const session = prepare(request.source, {
        budget,
        ...(request.prelude !== undefined && { prelude: request.prelude }),
      });
      if (!(await drive(session.machine, job))) return 'cancelled';
      if (session.machine.status !== 'done') return result(false, describe(session.machine));

      if (test.kind === 'calls') {
        let count = 0;
        const measured = session.follow(`${test.call};`, {
          budget,
          hooks: [{ onCall: (info) => void (info.name === test.fn && count++) }],
        });
        if (!(await drive(measured, job))) return 'cancelled';
        if (measured.status !== 'done') return result(false, describe(measured));
        if (count === 0) return result(false, `${test.call} never applies ${test.fn}`);
        return count <= test.atMost
          ? result(true, null)
          : result(false, `${test.call} applies ${test.fn} ${count} times; at most ${test.atMost} expected`);
      }

      const expr = session.follow(`${test.expr};`, { budget });
      if (!(await drive(expr, job))) return 'cancelled';
      if (expr.status !== 'done') return result(false, describe(expr));

      if (test.kind === 'value') {
        return expr.value === test.expected
          ? result(true, null)
          : result(false, `${test.expr} is ${stringify(expr.value)}`);
      }

      const call = `${test.call};`;
      const tracer = createProcessShapeTracer(call);
      const measured = session.follow(call, { budget, hooks: [tracer.hooks] });
      if (!(await drive(measured, job))) return 'cancelled';
      if (measured.status !== 'done') return result(false, describe(measured));
      const kind = tracer.snapshot().runs[0]?.kind ?? 'iterative';
      return expr.value === kind
        ? result(true, null)
        : result(false, `${test.expr} is ${stringify(expr.value)}, but ${test.call} is ${kind}`);
    } catch (error) {
      return result(false, payload(error).message);
    }
  }

  async function check(request: CheckRequest, job: Job): Promise<void> {
    const results: TestResult[] = [];
    for (const test of request.tests) {
      const result = await runTest(request, test, job);
      if (result === 'cancelled') {
        post({ type: 'cancelled', id: request.id, steps: 0, forced: false });
        return;
      }
      results.push(result);
      await pause();
    }
    post({
      type: 'check-done',
      id: request.id,
      results,
      passed: results.filter((r) => r.pass).length,
      total: results.length,
    });
  }

  async function start(request: Exclude<LabRequest, { type: 'cancel' }>): Promise<void> {
    const job: Job = { cancelled: false };
    jobs.set(request.id, job);
    post({ type: 'started', id: request.id });
    try {
      if (request.type === 'run') await run(request, job);
      else if (request.type === 'trace') trace(request);
      else await check(request, job);
    } catch (error) {
      post({ type: 'error', id: request.id, error: payload(error), steps: 0, ms: 0 });
    } finally {
      jobs.delete(request.id);
    }
  }

  return {
    handle(request) {
      if (request.type === 'cancel') {
        const job = jobs.get(request.id);
        if (job !== undefined) job.cancelled = true;
        return;
      }
      void start(request);
    },
    activeJobs: () => jobs.size,
  };
}
