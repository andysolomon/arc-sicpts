import { evaluate, type Outcome, type PrepareOptions } from '../evaluator/evaluate.ts';
import type { MachineHooks } from '../evaluator/machine.ts';
import { excerpt } from './sourceText.ts';

/**
 * The shape of a process: how deep the stack of pending calls is at every call
 * and every return. A recursive process climbs and collapses; an iterative one
 * stays flat, because a call in tail position replaces its caller.
 */

export type ProcessKind = 'recursive' | 'iterative';

export interface ProcessRun {
  /** The top-level statement that produced this run, e.g. `factorial(6)`. */
  label: string;
  /** Call depth, sampled at each call and each return, in order. */
  samples: number[];
  maxDepth: number;
  /** Number of compound function applications. */
  calls: number;
  /** `recursive` once any function has been re-entered while still pending. */
  kind: ProcessKind;
  /** True when sampling stopped at the limit; `maxDepth` and `calls` stay exact. */
  truncated: boolean;
}

export interface ProcessShapeSnapshot {
  runs: ProcessRun[];
}

export interface ProcessShapeOptions {
  maxSamplesPerRun?: number;
  maxRuns?: number;
}

export interface ProcessShapeTracer {
  hooks: MachineHooks;
  /** A JSON-safe copy of everything recorded so far. */
  snapshot(): ProcessShapeSnapshot;
  /** Changes whenever the snapshot would. */
  version(): number;
}

export function createProcessShapeTracer(
  source: string,
  options: ProcessShapeOptions = {},
): ProcessShapeTracer {
  const maxSamples = options.maxSamplesPerRun ?? 2048;
  const maxRuns = options.maxRuns ?? 8;
  const runs: ProcessRun[] = [];
  let pendingLabel = '';
  let current: ProcessRun | null = null;
  let version = 0;

  const sample = (run: ProcessRun, depth: number): void => {
    if (run.samples.length < maxSamples) run.samples.push(depth);
    else run.truncated = true;
    version++;
  };

  return {
    hooks: {
      onTopLevelStatement(_index, node) {
        pendingLabel = excerpt(source, node);
        current = null;
      },
      onCall(info) {
        // A run starts with the first call a statement makes, so declarations
        // and plain arithmetic do not produce empty charts.
        if (current === null) {
          if (runs.length >= maxRuns) return;
          current = {
            label: pendingLabel,
            samples: [],
            maxDepth: 0,
            calls: 0,
            kind: 'iterative',
            truncated: false,
          };
          runs.push(current);
        }
        current.calls++;
        if (info.depth > current.maxDepth) current.maxDepth = info.depth;
        if (info.recursive) current.kind = 'recursive';
        sample(current, info.depth);
      },
      onReturn(info) {
        if (current !== null) sample(current, info.depth);
      },
    },
    snapshot: () => ({ runs: runs.map((run) => ({ ...run, samples: [...run.samples] })) }),
    version: () => version,
  };
}

export interface ProcessShapeResult {
  snapshot: ProcessShapeSnapshot;
  outcome: Outcome;
}

/** Run a program and return the shape of every top-level statement that made calls. */
export function processShape(
  source: string,
  options: Pick<PrepareOptions, 'budget' | 'prelude'> & ProcessShapeOptions = {},
): ProcessShapeResult {
  const tracer = createProcessShapeTracer(source, options);
  const outcome = evaluate(source, {
    hooks: [tracer.hooks],
    ...(options.budget !== undefined && { budget: options.budget }),
    ...(options.prelude !== undefined && { prelude: options.prelude }),
  });
  return { snapshot: tracer.snapshot(), outcome };
}

/** The deepest the stack of pending calls gets while the program runs. */
export function maxDepth(source: string): number {
  return Math.max(0, ...processShape(source).snapshot.runs.map((run) => run.maxDepth));
}
