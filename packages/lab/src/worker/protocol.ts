import type { HeapSnapshot } from '../inspect/heap.ts';
import type { WatchedCall } from '../inspect/callLog.ts';
import type { Segment } from '../evaluator/primitives.ts';
import type { GcRun } from '../chapter-5/memory.ts';
import type { ProcessShapeSnapshot } from '../inspect/processShape.ts';
import type { MachineView } from '../machines/inspect.ts';
import type { StepRecord } from '../inspect/stepTrace.ts';
import type { Loc } from '../syntax/ast.ts';
import type { ErrorPhase } from '../syntax/errors.ts';

/**
 * Messages between a page and the Laboratory worker. Everything here is plain
 * JSON, so it survives `postMessage` unchanged.
 */

export interface RunRequest {
  type: 'run';
  id: number;
  source: string;
  /** Maximum evaluator steps; defaults to 100 000. */
  budget?: number;
  prelude?: string;
  inspect?: {
    processShape?: boolean;
    /** Log the calls to these functions, sent once the run ends. */
    calls?: { names: string[]; maxCalls?: number; maxText?: number };
  };
  /** Seeds the scheduler of `concurrent_execute`; see `MachineOptions.seed`. */
  seed?: number;
}

/** Evaluate a program and return the whole step log for the stepper. */
export interface TraceRequest {
  type: 'trace';
  id: number;
  source: string;
  budget?: number;
  prelude?: string;
  maxRecords?: number;
  seed?: number;
  /** `heap`: also snapshot the program frame's bindings as a graph of pairs after each top-level statement (§3.3). */
  inspect?: { heap?: boolean };
}

export type TestSpec =
  /** `expr`, evaluated after the program, must equal `expected`. */
  | { name: string; kind: 'value'; expr: string; expected: number | string | boolean | null }
  /** `expr` must be the string naming the measured process kind of `call`. */
  | { name: string; kind: 'shape'; expr: string; call: string }
  /** Evaluating `call` must apply the compound function `fn` at least once and at most `atMost` times. */
  | { name: string; kind: 'calls'; call: string; fn: string; atMost: number }
  /** Evaluating `call` must stop with an error, whose message contains `message` when given. */
  | { name: string; kind: 'error'; call: string; message?: string }
  /**
   * What evaluating `call` displays: exactly `lines` when given, exactly
   * `count` lines when given, and lines containing each of `contains`.
   */
  | { name: string; kind: 'output'; call: string; lines?: string[]; count?: number; contains?: string[] };

export interface CheckRequest {
  type: 'check';
  id: number;
  source: string;
  prelude?: string;
  /** Declarations evaluated in the submission's own frame, before it (see `PrepareOptions.context`). */
  context?: string;
  tests: TestSpec[];
  /** Budget for each test; defaults to 100 000. */
  budget?: number;
  /** Seeds the scheduler for every test, so that a check with threads is repeatable. */
  seed?: number;
}

/** Run a program and record every register machine it makes and starts (§5.1, §5.2). */
export interface MachinesRequest {
  type: 'machines';
  id: number;
  source: string;
  prelude?: string;
  budget?: number;
  /** Steps recorded per run of a machine; defaults to 4000. */
  maxSteps?: number;
}

/** Lay a program's pairs out in memory and collect the garbage (§5.3). */
export interface MemoryRequest {
  type: 'memory';
  id: number;
  source: string;
  /** Index of the first pair; the book's exercise 5.19 starts at 1. */
  start?: number;
}

/**
 * Measure a function interpreted by the explicit-control evaluator and
 * compiled by the compiler, at each argument in `ns` (§5.4.4, §5.5.7).
 */
export interface CompareRequest {
  type: 'compare';
  id: number;
  /** A program declaring the function. */
  definition: string;
  /** The function's name; each measurement evaluates `call(n)`. */
  call: string;
  ns: number[];
  /**
   * Optionally, a program declaring `special_statistics(n)`, which returns
   * `list(value, total_pushes, maximum_depth)` for a special-purpose machine.
   */
  special?: string;
}

/** Compile a program with the compiler of §5.5 and list the instructions. */
export interface CompileRequest {
  type: 'compile';
  id: number;
  source: string;
  target?: string;
  linkage?: string;
}

/** One line of compiled code. */
export interface CompiledLine {
  text: string;
  /** `label`, or the instruction type such as `assign` or `save`. */
  kind: string;
}

export interface CancelRequest {
  type: 'cancel';
  id: number;
}

export type LabRequest =
  | RunRequest
  | TraceRequest
  | CheckRequest
  | MachinesRequest
  | MemoryRequest
  | CompareRequest
  | CompileRequest
  | CancelRequest;
export type JobRequest = Exclude<LabRequest, CancelRequest>;

/** One measurement of a run on a register machine. */
export interface StackMeasure {
  n: number;
  value: string;
  totalPushes: number;
  maximumDepth: number;
}

export interface ErrorPayload {
  message: string;
  phase: ErrorPhase;
  loc: Loc | null;
}

export interface TestResult {
  name: string;
  pass: boolean;
  /** Why the test failed, when it did. */
  detail: string | null;
}

export type TraceOutcome =
  | { status: 'done'; value: string }
  | { status: 'error'; error: ErrorPayload }
  | { status: 'budget-exhausted' };

export type LabEvent =
  | { type: 'started'; id: number }
  | { type: 'display'; id: number; text: string }
  | { type: 'shape'; id: number; snapshot: ProcessShapeSnapshot }
  | { type: 'calls'; id: number; calls: WatchedCall[]; truncated: boolean }
  /** Lines drawn by `draw_line` since the last such event. */
  | { type: 'draw'; id: number; segments: Segment[] }
  | { type: 'done'; id: number; value: string; steps: number; ms: number }
  | { type: 'error'; id: number; error: ErrorPayload; steps: number; ms: number }
  | { type: 'budget-exhausted'; id: number; steps: number; budget: number; ms: number }
  | { type: 'cancelled'; id: number; steps: number; forced: boolean }
  | {
      type: 'trace-done';
      id: number;
      records: StepRecord[];
      truncated: boolean;
      outcome: TraceOutcome;
      output: string[];
      /** Present when the request asked for `inspect.heap`. */
      heap?: HeapSnapshot[];
      /** Every line drawn by `draw_line`, up to the drawing limit. */
      drawing: Segment[];
    }
  | { type: 'check-done'; id: number; results: TestResult[]; passed: number; total: number }
  | { type: 'machines-done'; id: number; machines: MachineView[]; outcome: TraceOutcome; output: string[] }
  | { type: 'memory-done'; id: number; run: GcRun | null; error: string | null }
  | {
      type: 'compile-done';
      id: number;
      lines: CompiledLine[];
      /** Registers the code needs and modifies, as `compile` computed them. */
      needs: string[];
      modifies: string[];
      error: string | null;
    }
  | {
      type: 'compare-done';
      id: number;
      interpreted: StackMeasure[];
      compiled: StackMeasure[];
      special: StackMeasure[] | null;
      error: string | null;
    };

export type TerminalEvent = Extract<
  LabEvent,
  {
    type:
      | 'done'
      | 'error'
      | 'budget-exhausted'
      | 'cancelled'
      | 'trace-done'
      | 'check-done'
      | 'machines-done'
      | 'memory-done'
      | 'compare-done'
      | 'compile-done';
  }
>;

const TERMINAL: ReadonlySet<LabEvent['type']> = new Set([
  'done',
  'error',
  'budget-exhausted',
  'cancelled',
  'trace-done',
  'check-done',
  'machines-done',
  'memory-done',
  'compare-done',
  'compile-done',
]);

export function isTerminal(event: LabEvent): event is TerminalEvent {
  return TERMINAL.has(event.type);
}
