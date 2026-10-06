import {
  createFrameIds,
  createGlobalEnvironment,
  Machine,
  outcomeOf,
  parse,
  SourceError,
  type Environment,
  type Outcome,
} from '@sicp/lab';

export interface Repl {
  /** Evaluate one input. Declarations stay visible to later inputs. */
  evaluate(source: string): Outcome;
}

export function createRepl(budget?: number): Repl {
  const output: string[] = [];
  const frameIds = createFrameIds();
  let env: Environment = createGlobalEnvironment((text) => output.push(text));

  return {
    evaluate(source) {
      output.length = 0;
      try {
        // Each input gets a frame enclosed by the previous one, so a later
        // declaration may shadow an earlier one, as in a notebook.
        const machine = new Machine(parse(source), {
          parent: env,
          frameIds,
          ...(budget !== undefined && { budget }),
        });
        machine.run();
        if (machine.status === 'done') env = machine.programEnv;
        return outcomeOf(machine, [...output]);
      } catch (error) {
        if (error instanceof SourceError) return { status: 'error', error, steps: 0, output: [...output] };
        throw error;
      }
    },
  };
}
