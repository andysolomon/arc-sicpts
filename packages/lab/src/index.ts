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
  arrayToList,
  isClosure,
  isLabel,
  isPair,
  isPrimitive,
  listToArray,
  stringify,
  typeName,
  type Closure,
  type Label,
  type Pair,
  type Primitive,
  type Value,
} from './evaluator/values.ts';
export { createGlobalEnvironment, type GlobalOptions, type Segment } from './evaluator/primitives.ts';
export { invoke } from './evaluator/invoke.ts';
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
export { library, listLibrary, machineLibrary, streamLibrary } from './evaluator/library.ts';
export {
  createLibraryEnvironment,
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
export {
  countChangeDefinitions,
  countChangeProgram,
  fibCompareProgram,
  fibDefinitions,
  fibIterDefinitions,
  fibProgram,
} from './chapter-1/treeRecursion.ts';
export { growthProgram, sineDefinitions } from './chapter-1/growth.ts';
export {
  exptDefinitions,
  exptGrowthProgram,
  fastExptProgram,
} from './chapter-1/exponentiation.ts';
export { gcdDefinitions, gcdProgram, lameProgram } from './chapter-1/gcd.ts';
export {
  expmodDefinitions,
  fermatDefinitions,
  fermatProgram,
  primalityGrowthProgram,
  smallestDivisorDefinitions,
  smallestDivisorProgram,
} from './chapter-1/primality.ts';
export { integralProgram, piSumProgram, sumDefinitions, sumProgram } from './chapter-1/sums.ts';
export { conditionalStatementProgram, lambdaProgram, localNamesProgram } from './chapter-1/lambdas.ts';
export {
  averageDefinition,
  dampedProgram,
  fixedPointDefinitions,
  fixedPointProgram,
  halfIntervalDefinitions,
  halfIntervalProgram,
  oscillatingProgram,
} from './chapter-1/generalMethods.ts';
export {
  averageDampProgram,
  newtonDefinitions,
  newtonProgram,
  transformProgram,
} from './chapter-1/returnedValues.ts';

export * from './chapter-2/dataAbstraction.ts';
export * from './chapter-2/sequences.ts';
export * from './chapter-2/pictures.ts';
export * from './chapter-2/symbolicData.ts';
export * from './chapter-2/multipleRepresentations.ts';
export * from './chapter-2/genericArithmetic.ts';
export * from './chapter-2/symbolicAlgebra.ts';
export {
  instructionText,
  readController,
  type Controller,
  type ControllerLine,
  type Instruction,
} from './machines/controller.ts';
export { RegisterMachine, UNASSIGNED, type MachineObserver, type StackEntry } from './machines/registerMachine.ts';
export { dataPaths, type Button, type DataPaths, type OperationNode, type Source } from './machines/dataPaths.ts';
export { parseComponent, programComponent, unparse } from './machines/components.ts';
export { ECEVAL_OPERATION_NAMES } from './machines/evaluatorSupport.ts';
export { machineOf } from './machines/install.ts';
export {
  recordMachine,
  type MachineRecorder,
  show,
  type CodeLineView,
  type MachineView,
  type RunView,
  type Shown,
  type ShownKind,
  type StepView,
} from './machines/inspect.ts';

export {
  factorialController,
  factorialMachineProgram,
  fibController,
  fibMachineProgram,
  gcdController,
  gcdElaboratedProgram,
  gcdMachineProgram,
  gcdControllerProgram,
  gcdSubroutineProgram,
  gcdWithPromptProgram,
  monitoredFactorialProgram,
} from './chapter-5/machines.ts';
export {
  assemblerSource,
  executionSource,
  machineModelSource,
  simulatorFunctions,
  simulatorSource,
  simulatorWithout,
} from './chapter-5/simulator.ts';
export { declaredNames, onlyDeclarations, withoutDeclarations } from './chapter-5/pieces.ts';
export { BROKEN_HEART, collectGarbage, gcControllerSource, memoryImage, type GcRun, type GcStep, type MemoryImage } from './chapter-5/memory.ts';
export {
  ECEVAL_REGISTERS,
  ecevalApplication,
  ecevalApplyDispatch,
  ecevalAssignment,
  ecevalBlock,
  ecevalCompiledControllerSource,
  ecevalConditional,
  ecevalControllerSource,
  ecevalDeclaration,
  ecevalDispatch,
  ecevalDriverLoop,
  ecevalErrors,
  ecevalExternalEntry,
  ecevalMachineSource,
  ecevalProgram,
  ecevalReturn,
  ecevalSequence,
  ecevalLiteral,
  ecevalName,
  ecevalLambda,
  ecevalCompoundApply,
  ecevalReturnUndefined,
  ecevalCompiledApplyDispatch,
  ecevalBlocks,
  ecevalControllerWithout,
  quote,
  readResults,
  runEceval,
  type EcevalResult,
  type EcevalRun,
} from './chapter-5/eceval.ts';
export {
  compileAndGoPrelude,
  compileAndGoSource,
  compileApplication,
  compileCombining,
  compileConditional,
  compileDispatch,
  compileLabels,
  compileLambda,
  compileLinkage,
  compileProgram,
  compilerSource,
  compileSequence,
  compileSimple,
  displayInstructionsSource,
  runCompiled,
} from './chapter-5/compiler.ts';

export * from './chapter-5/section-5-1.ts';
export * from './chapter-5/section-5-2.ts';
export * from './chapter-5/section-5-3.ts';
export * from './chapter-5/section-5-4.ts';
export * from './chapter-5/section-5-5.ts';
export * from './chapter-5/section-5-5-5.ts';
