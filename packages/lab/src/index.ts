export type * from './syntax/ast.ts';
export { isDeclaration } from './syntax/ast.ts';
export { SourceError, type ErrorPhase } from './syntax/errors.ts';
export { tokenize, KEYWORDS, type Token, type TokenType } from './syntax/tokenize.ts';
export { parse } from './syntax/parse.ts';

export {
  assign,
  chain,
  declare,
  define,
  extend,
  lookup,
  type Binding,
  type Environment,
  type Frame,
} from './evaluator/environment.ts';
export {
  isClosure,
  isPair,
  isPrimitive,
  stringify,
  typeName,
  type Closure,
  type Pair,
  type Primitive,
  type Value,
} from './evaluator/values.ts';
export { createGlobalEnvironment } from './evaluator/primitives.ts';
export {
  createFrameIds,
  DEFAULT_BUDGET,
  Machine,
  type CallInfo,
  type MachineHooks,
  type MachineOptions,
  type MachineStatus,
  type ReturnInfo,
} from './evaluator/machine.ts';
export {
  evaluate,
  outcomeOf,
  prepare,
  type Outcome,
  type PrepareOptions,
  type Session,
} from './evaluator/evaluate.ts';

export {
  createProcessShapeTracer,
  maxDepth,
  processShape,
  type ProcessKind,
  type ProcessRun,
  type ProcessShapeSnapshot,
} from './inspect/processShape.ts';
export { createStepTracer, type StepEvent, type StepRecord } from './inspect/stepTrace.ts';

export type * from './worker/protocol.ts';
export { isTerminal } from './worker/protocol.ts';
export { createLabHost, type HostDeps, type LabHost } from './worker/host.ts';
export {
  LabClient,
  type ClientOptions,
  type JobHandle,
  type JobParams,
  type WorkerLike,
} from './worker/client.ts';

export { factorialDefinitions, factorialProgram } from './chapter-1/factorial.ts';
