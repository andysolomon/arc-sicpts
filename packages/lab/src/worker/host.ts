import { compilerSource, runCompiled } from '../chapter-5/compiler.ts';
import { quote } from '../chapter-5/eceval.ts';
import { instructionText } from '../machines/controller.ts';
import { runEceval } from '../chapter-5/eceval.ts';
import { collectGarbage, memoryImage } from '../chapter-5/memory.ts';
import { evaluate, prepare, type Session } from '../evaluator/evaluate.ts';
import { listToArray } from '../evaluator/values.ts';
import { recordMachine, type MachineRecorder } from '../machines/inspect.ts';
import { DEFAULT_BUDGET, type Machine } from '../evaluator/machine.ts';
import type { Segment } from '../evaluator/primitives.ts';
import { stringify } from '../evaluator/values.ts';
import { createHeapInspector } from '../inspect/heap.ts';
import { createCallLogTracer } from '../inspect/callLog.ts';
import { createProcessShapeTracer } from '../inspect/processShape.ts';
import { createStepTracer } from '../inspect/stepTrace.ts';
import { SourceError } from '../syntax/errors.ts';
import type {
  CheckRequest,
  CompareRequest,
  CompiledLine,
  CompileRequest,
  MachinesRequest,
  MemoryRequest,
  StackMeasure,
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
/** Building and running machines is mostly simulator work, which the step budget does not count. */
const MACHINES_BUDGET = 2_000_000;
const MAX_MACHINES = 6;

/** Lines a single job may draw; a runaway painter stops being shown here. */
export const MAX_SEGMENTS = 20_000;

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
    const watch = request.inspect?.calls;
    const callLog =
      watch === undefined
        ? null
        : createCallLogTracer(watch.names, {
            ...(watch.maxCalls !== undefined && { maxCalls: watch.maxCalls }),
            ...(watch.maxText !== undefined && { maxText: watch.maxText }),
          });
    const hooks = [...(tracer === null ? [] : [tracer.hooks]), ...(callLog === null ? [] : [callLog.hooks])];

    // Lines are sent in batches, after each slice, rather than one message each.
    let drawn = 0;
    let batch: Segment[] = [];
    const flush = (): void => {
      if (batch.length === 0) return;
      post({ type: 'draw', id, segments: batch });
      batch = [];
    };

    let machine: Machine;
    try {
      machine = prepare(source, {
        budget: request.budget ?? DEFAULT_BUDGET,
        display: (text) => {
          flush();
          post({ type: 'display', id, text });
        },
        draw: (segment) => {
          if (drawn++ < MAX_SEGMENTS) batch.push(segment);
        },
        ...(hooks.length > 0 && { hooks }),
        ...(request.prelude !== undefined && { prelude: request.prelude }),
        ...(request.seed !== undefined && { seed: request.seed }),
      }).machine;
    } catch (error) {
      post({ type: 'error', id, error: payload(error), steps: 0, ms: now() - started });
      return;
    }

    let sent = 0;
    const finished = await drive(machine, job, () => {
      flush();
      if (tracer !== null && tracer.version() !== sent) {
        sent = tracer.version();
        post({ type: 'shape', id, snapshot: tracer.snapshot() });
      }
    });

    const { steps } = machine;
    const ms = now() - started;
    if (finished && callLog !== null) post({ type: 'calls', id, calls: callLog.calls, truncated: callLog.truncated() });
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
    let session: Session | null = null;
    const heap =
      request.inspect?.heap === true
        ? createHeapInspector(source, () => session?.machine.programEnv ?? null, { records: () => tracer.records.length })
        : null;
    const drawing: Segment[] = [];
    let outcome: TraceOutcome;
    try {
      session = prepare(source, {
        budget: request.budget ?? TRACE_BUDGET,
        hooks: heap === null ? [tracer.hooks] : [tracer.hooks, heap.hooks],
        display: (text) => output.push(text),
        draw: (segment) => {
          if (drawing.length < MAX_SEGMENTS) drawing.push(segment);
        },
        ...(request.prelude !== undefined && { prelude: request.prelude }),
        ...(request.seed !== undefined && { seed: request.seed }),
      });
      const { machine } = session;
      // A trace is bounded by its small budget, so it runs in one go.
      machine.run();
      heap?.finish();
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
      ...(heap !== null && { heap: heap.snapshots }),
      drawing,
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
      const output: string[] = [];
      const seed = request.seed === undefined ? {} : { seed: request.seed };
      const session = prepare(request.source, {
        budget,
        display: (text) => output.push(text),
        ...seed,
        ...(request.prelude !== undefined && { prelude: request.prelude }),
        ...(request.context !== undefined && { context: request.context }),
      });
      if (!(await drive(session.machine, job))) return 'cancelled';
      if (session.machine.status !== 'done') return result(false, describe(session.machine));

      if (test.kind === 'calls') {
        let count = 0;
        const measured = session.follow(`${test.call};`, {
          budget,
          ...seed,
          hooks: [{ onCall: (info) => void (info.name === test.fn && count++) }],
        });
        if (!(await drive(measured, job))) return 'cancelled';
        if (measured.status !== 'done') return result(false, describe(measured));
        if (count === 0) return result(false, `${test.call} never applies ${test.fn}`);
        return count <= test.atMost
          ? result(true, null)
          : result(false, `${test.call} applies ${test.fn} ${count} times; at most ${test.atMost} expected`);
      }

      if (test.kind === 'error') {
        const failing = session.follow(`${test.call};`, { budget, ...seed });
        if (!(await drive(failing, job))) return 'cancelled';
        if (failing.status === 'done') return result(false, `${test.call} is ${stringify(failing.value)}, but an error was expected`);
        if (failing.status !== 'error') return result(false, describe(failing));
        const message = failing.error?.message ?? '';
        return test.message === undefined || message.includes(test.message)
          ? result(true, null)
          : result(false, `${test.call} stops with "${message}", not with an error about "${test.message}"`);
      }

      if (test.kind === 'output') {
        const from = output.length;
        const measured = session.follow(`${test.call};`, { budget });
        if (!(await drive(measured, job))) return 'cancelled';
        if (measured.status !== 'done') return result(false, describe(measured));
        const lines = output.slice(from);
        const shown = lines.length === 0 ? 'nothing' : lines.slice(0, 3).join(' | ') + (lines.length > 3 ? ' | …' : '');
        if (test.lines !== undefined && (lines.length !== test.lines.length || lines.some((line, i) => line !== test.lines?.[i]))) {
          return result(false, `${test.call} displays ${shown}`);
        }
        if (test.count !== undefined && lines.length !== test.count) {
          return result(false, `${test.call} displays ${lines.length} line(s); ${test.count} expected`);
        }
        const missing = (test.contains ?? []).find((text) => !lines.some((line) => line.includes(text)));
        return missing === undefined ? result(true, null) : result(false, `${test.call} displays no line containing ${missing}`);
      }

      const expr = session.follow(`${test.expr};`, { budget, ...seed });
      if (!(await drive(expr, job))) return 'cancelled';
      if (expr.status !== 'done') return result(false, describe(expr));

      if (test.kind === 'value') {
        return expr.value === test.expected
          ? result(true, null)
          : result(false, `${test.expr} is ${stringify(expr.value)}`);
      }

      const call = `${test.call};`;
      const tracer = createProcessShapeTracer(call);
      const measured = session.follow(call, { budget, ...seed, hooks: [tracer.hooks] });
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

  function machines(request: MachinesRequest): void {
    const recorders: MachineRecorder[] = [];
    const output: string[] = [];
    let outcome: TraceOutcome;
    try {
      const { machine } = prepare(request.source, {
        budget: request.budget ?? MACHINES_BUDGET,
        display: (text) => output.push(text),
        onMachine: (made) => {
          if (recorders.length < MAX_MACHINES) recorders.push(recordMachine(made, { maxSteps: request.maxSteps ?? 4000 }));
        },
        ...(request.prelude !== undefined && { prelude: request.prelude }),
      });
      machine.run();
      if (machine.status === 'done') outcome = { status: 'done', value: stringify(machine.value) };
      else if (machine.status === 'error') outcome = { status: 'error', error: payload(machine.error) };
      else outcome = { status: 'budget-exhausted' };
    } catch (error) {
      outcome = { status: 'error', error: payload(error) };
    }
    post({ type: 'machines-done', id: request.id, machines: recorders.map((r) => r.view()), outcome, output });
  }

  function memory(request: MemoryRequest): void {
    const { image, error } = memoryImage(request.source, { start: request.start ?? 0 });
    if (image === null) {
      post({ type: 'memory-done', id: request.id, run: null, error });
      return;
    }
    try {
      post({ type: 'memory-done', id: request.id, run: collectGarbage(image), error: null });
    } catch (failure) {
      post({ type: 'memory-done', id: request.id, run: null, error: payload(failure).message });
    }
  }

  async function compare(request: CompareRequest, job: Job): Promise<void> {
    const { definition, call, ns } = request;
    const inputs = ns.map((n) => `${call}(${n});`);
    const measures = (run: { results: { value: string; totalPushes: number; maximumDepth: number }[] }, skip: number) =>
      run.results.slice(skip).map((r, i): StackMeasure => ({ n: ns[i] ?? 0, value: r.value, totalPushes: r.totalPushes, maximumDepth: r.maximumDepth }));
    const interpretedRun = runEceval([definition, ...inputs]);
    await pause();
    if (job.cancelled) return post({ type: 'cancelled', id: request.id, steps: 0, forced: false });
    const compiledRun = runCompiled(definition, inputs);
    await pause();
    if (job.cancelled) return post({ type: 'cancelled', id: request.id, steps: 0, forced: false });
    let special: StackMeasure[] | null = null;
    let error = interpretedRun.failure ?? compiledRun.failure;
    if (request.special !== undefined) {
      const outcome = evaluate(`list(${ns.map((n) => `special_statistics(${n})`).join(', ')});`, {
        prelude: request.special,
        budget: MACHINES_BUDGET,
      });
      if (outcome.status === 'done') {
        special = (listToArray(outcome.value) ?? []).map((entry, i): StackMeasure => {
          const [value, pushes, depth] = listToArray(entry) ?? [];
          return { n: ns[i] ?? 0, value: stringify(value), totalPushes: Number(pushes), maximumDepth: Number(depth) };
        });
      } else error ??= outcome.status === 'error' ? outcome.error.message : 'budget exhausted';
    }
    post({
      type: 'compare-done',
      id: request.id,
      interpreted: measures(interpretedRun, 1),
      compiled: measures(compiledRun, 1),
      special,
      error,
    });
  }

  function compile(request: CompileRequest): void {
    const outcome = evaluate(
      `compile(parse(${quote(request.source)}), ${quote(request.target ?? 'val')}, ${quote(request.linkage ?? 'next')});`,
      { prelude: compilerSource, budget: MACHINES_BUDGET },
    );
    if (outcome.status !== 'done') {
      const error = outcome.status === 'error' ? outcome.error.reason : 'the compiler ran out of steps';
      post({ type: 'compile-done', id: request.id, lines: [], needs: [], modifies: [], error });
      return;
    }
    const [needs, modifies, instructions] = listToArray(outcome.value) ?? [];
    const lines = (listToArray(instructions ?? null) ?? []).map(
      (item): CompiledLine => (typeof item === 'string' ? { text: item, kind: 'label' } : { text: instructionText(item), kind: String((listToArray(item) ?? [])[0]) }),
    );
    const strings = (value: unknown): string[] => (listToArray((value ?? null) as never) ?? []).map(String);
    post({ type: 'compile-done', id: request.id, lines, needs: strings(needs), modifies: strings(modifies), error: null });
  }

  async function start(request: Exclude<LabRequest, { type: 'cancel' }>): Promise<void> {
    const job: Job = { cancelled: false };
    jobs.set(request.id, job);
    post({ type: 'started', id: request.id });
    try {
      if (request.type === 'run') await run(request, job);
      else if (request.type === 'trace') trace(request);
      else if (request.type === 'machines') machines(request);
      else if (request.type === 'memory') memory(request);
      else if (request.type === 'compare') await compare(request, job);
      else if (request.type === 'compile') compile(request);
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
