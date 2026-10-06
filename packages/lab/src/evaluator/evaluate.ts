import { SourceError } from '../syntax/errors.ts';
import { parse } from '../syntax/parse.ts';
import type { Program } from '../syntax/ast.ts';
import type { Environment } from './environment.ts';
import { library } from './library.ts';
import { createFrameIds, Machine, type FrameIds, type MachineHooks } from './machine.ts';
import { createGlobalEnvironment } from './primitives.ts';
import { stringify, type Value } from './values.ts';

export interface PrepareOptions {
  budget?: number;
  hooks?: readonly MachineHooks[];
  /** Receives each line written by `display`. */
  display?: (text: string) => void;
  /** Source evaluated first, in a frame the program can see but not disturb. */
  prelude?: string;
  /** Seeds the scheduler of `concurrent_execute`, so that the interleaving can be repeated. */
  seed?: number;
}

export interface Session {
  machine: Machine;
  frameIds: FrameIds;
  /** Continue in a child frame of the finished program, e.g. to evaluate a check. */
  follow(source: string, options?: Pick<PrepareOptions, 'budget' | 'hooks' | 'seed'>): Machine;
}

const PRELUDE_BUDGET = 1_000_000;

/** The library parses the same way every time, so it is parsed once. */
let libraryProgram: Program | null = null;

/** Evaluate a program of declarations into a frame `id` that extends `parent`. */
function declarations(program: Program, parent: Environment, id: 'library' | 'prelude'): Environment {
  const machine = new Machine(program, { parent, budget: PRELUDE_BUDGET, programFrame: { id, label: id } });
  if (machine.run() !== 'done') {
    throw machine.error ?? new SourceError('runtime', `The ${id} did not finish`, null);
  }
  return machine.programEnv;
}

/** The global frame of primitives with the library frame on top: where every program starts. */
export function createLibraryEnvironment(display: (text: string) => void = () => {}): Environment {
  libraryProgram ??= parse(library);
  return declarations(libraryProgram, createGlobalEnvironment(display), 'library');
}

/**
 * Parse a program and set up a machine for it without running anything.
 * Throws a `SourceError` when the program (or the prelude) does not parse.
 * Frames, outermost first: `global` (primitives), `library` (the list and
 * stream libraries), `prelude` (when given), then the program's own.
 */
export function prepare(source: string, options: PrepareOptions = {}): Session {
  const program = parse(source);
  const frameIds = createFrameIds();
  let parent = createLibraryEnvironment(options.display);
  if (options.prelude !== undefined) parent = declarations(parse(options.prelude), parent, 'prelude');

  const machine = new Machine(program, {
    parent,
    frameIds,
    ...(options.budget !== undefined && { budget: options.budget }),
    ...(options.hooks !== undefined && { hooks: options.hooks }),
    ...(options.seed !== undefined && { seed: options.seed }),
  });

  return {
    machine,
    frameIds,
    follow: (followSource, followOptions = {}) =>
      new Machine(parse(followSource), {
        parent: machine.programEnv,
        frameIds,
        ...(followOptions.budget !== undefined && { budget: followOptions.budget }),
        ...(followOptions.hooks !== undefined && { hooks: followOptions.hooks }),
        ...(followOptions.seed !== undefined && { seed: followOptions.seed }),
      }),
  };
}

export type Outcome =
  | { status: 'done'; value: Value; text: string; steps: number; output: string[] }
  | { status: 'error'; error: SourceError; steps: number; output: string[] }
  | { status: 'budget-exhausted'; steps: number; budget: number; output: string[] };

export function outcomeOf(machine: Machine, output: string[]): Outcome {
  const { steps } = machine;
  if (machine.status === 'done') {
    return { status: 'done', value: machine.value, text: stringify(machine.value), steps, output };
  }
  if (machine.status === 'error' && machine.error !== null) {
    return { status: 'error', error: machine.error, steps, output };
  }
  return { status: 'budget-exhausted', steps, budget: machine.budget, output };
}

/** Run a program to completion on the calling thread. */
export function evaluate(source: string, options: PrepareOptions = {}): Outcome {
  const output: string[] = [];
  const display = (text: string): void => {
    output.push(text);
    options.display?.(text);
  };
  try {
    const { machine } = prepare(source, { ...options, display });
    machine.run();
    return outcomeOf(machine, output);
  } catch (error) {
    if (error instanceof SourceError) return { status: 'error', error, steps: 0, output };
    throw error;
  }
}
