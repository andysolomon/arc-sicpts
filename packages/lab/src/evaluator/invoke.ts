import type { Application, Loc, Name, Program } from '../syntax/ast.ts';
import { SourceError } from '../syntax/errors.ts';
import { define, extend } from './environment.ts';
import { Machine } from './machine.ts';
import { APPLY_PRIMITIVE, isClosure, isPrimitive, listToArray, stringify, type Value } from './values.ts';

/**
 * Apply a function value from TypeScript and wait for its result. Primitives
 * are called directly; a closure gets a machine of its own that runs the call
 * to completion. This is how a register machine written in TypeScript applies
 * the operations a Source program hands it, such as `(a, b) => a % b`.
 */

export const INVOKE_BUDGET = 1_000_000;

const NOWHERE: Loc = { start: 0, end: 0, line: 1, col: 1, endLine: 1, endCol: 1 };
const name = (symbol: string): Name => ({ kind: 'name', symbol, loc: NOWHERE });

/** `f(a0, ..., an)`, built once per arity. */
const calls: Program[] = [];
function callOf(arity: number): Program {
  let program = calls[arity];
  if (program === undefined) {
    const application: Application = {
      kind: 'application',
      fun: name('f'),
      args: Array.from({ length: arity }, (_, i) => name(`a${i}`)),
      loc: NOWHERE,
    };
    program = { kind: 'program', body: [application], loc: NOWHERE };
    calls[arity] = program;
  }
  return program;
}

let invocations = 0;

export function invoke(fn: Value, args: readonly Value[], budget = INVOKE_BUDGET): Value {
  if (isPrimitive(fn)) {
    if (fn.arity !== null && fn.arity !== args.length) {
      throw new SourceError('runtime', `${fn.name} expects ${fn.arity} argument(s), got ${args.length}`, null);
    }
    if (fn.name === APPLY_PRIMITIVE) {
      // apply_in_underlying_javascript(f, list(a, b)) is f(a, b).
      const [target, list] = args;
      const spread = listToArray(list ?? null);
      if (spread === null) throw new SourceError('runtime', `${APPLY_PRIMITIVE} expects a list of arguments`, null);
      return invoke(target, spread, budget);
    }
    return fn.impl(...args);
  }
  if (!isClosure(fn)) {
    throw new SourceError('runtime', `Cannot apply ${stringify(fn)}: it is not a function`, null);
  }
  const frame = extend(null, 'invoke', 'invoke');
  define(frame, 'f', fn);
  args.forEach((arg, i) => define(frame, `a${i}`, arg));
  const prefix = `I${invocations++}.`;
  let n = 0;
  const machine = new Machine(callOf(args.length), {
    parent: frame,
    budget,
    frameIds: { next: () => `${prefix}${n++}` },
    programFrame: { id: `${prefix}call`, label: 'call' },
  });
  const status = machine.run();
  if (status === 'done') return machine.value;
  if (status === 'error' && machine.error !== null) throw machine.error;
  const label = fn.lambda.name ?? 'the function';
  throw new SourceError('runtime', `${label} did not finish within ${budget} steps`, null);
}
