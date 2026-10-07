import type { WatchedCall } from '../inspect/callLog.ts';
import type { Segment } from '../evaluator/primitives.ts';
import type { ProcessShapeSnapshot } from '../inspect/processShape.ts';
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
}

/** Evaluate a program and return the whole step log for the stepper. */
export interface TraceRequest {
  type: 'trace';
  id: number;
  source: string;
  budget?: number;
  prelude?: string;
  maxRecords?: number;
}

export type TestSpec =
  /** `expr`, evaluated after the program, must equal `expected`. */
  | { name: string; kind: 'value'; expr: string; expected: number | string | boolean | null }
  /** `expr` must be the string naming the measured process kind of `call`. */
  | { name: string; kind: 'shape'; expr: string; call: string }
  /** Evaluating `call` must apply the compound function `fn` at least once and at most `atMost` times. */
  | { name: string; kind: 'calls'; call: string; fn: string; atMost: number }
  /** Evaluating `call` must stop with an error, whose message contains `message` when given. */
  | { name: string; kind: 'error'; call: string; message?: string };

export interface CheckRequest {
  type: 'check';
  id: number;
  source: string;
  prelude?: string;
  tests: TestSpec[];
  /** Budget for each test; defaults to 100 000. */
  budget?: number;
}

export interface CancelRequest {
  type: 'cancel';
  id: number;
}

export type LabRequest = RunRequest | TraceRequest | CheckRequest | CancelRequest;
export type JobRequest = RunRequest | TraceRequest | CheckRequest;

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
      /** Every line drawn by `draw_line`, up to the drawing limit. */
      drawing: Segment[];
    }
  | { type: 'check-done'; id: number; results: TestResult[]; passed: number; total: number };

export type TerminalEvent = Extract<
  LabEvent,
  { type: 'done' | 'error' | 'budget-exhausted' | 'cancelled' | 'trace-done' | 'check-done' }
>;

const TERMINAL: ReadonlySet<LabEvent['type']> = new Set([
  'done',
  'error',
  'budget-exhausted',
  'cancelled',
  'trace-done',
  'check-done',
]);

export function isTerminal(event: LabEvent): event is TerminalEvent {
  return TERMINAL.has(event.type);
}
