import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import type { SceneProps } from './chapter-3/registry.ts';
import { useTrace } from './useTrace.ts';

const BranchesScene = lazy(() => import('./scenes/BranchesScene.tsx').then((module) => ({ default: module.BranchesScene })));
const CallsScene = lazy(() => import('./scenes/CallsScene.tsx').then((module) => ({ default: module.CallsScene })));
const CobwebScene = lazy(() => import('./scenes/CobwebScene.tsx').then((module) => ({ default: module.CobwebScene })));
const ComplexPlaneScene = lazy(() => import('./scenes/ComplexPlaneScene.tsx').then((module) => ({ default: module.ComplexPlaneScene })));
const CompareScene = lazy(() => import('./scenes/CompareScene.tsx').then((module) => ({ default: module.CompareScene })));
const CompiledScene = lazy(() => import('./scenes/CompiledScene.tsx').then((module) => ({ default: module.CompiledScene })));
const EnvironmentScene = lazy(() => import('./scenes/EnvironmentScene.tsx').then((module) => ({ default: module.EnvironmentScene })));
const GrowthScene = lazy(() => import('./scenes/GrowthScene.tsx').then((module) => ({ default: module.GrowthScene })));
const HalfIntervalScene = lazy(() => import('./scenes/HalfIntervalScene.tsx').then((module) => ({ default: module.HalfIntervalScene })));
const HuffmanScene = lazy(() => import('./scenes/HuffmanScene.tsx').then((module) => ({ default: module.HuffmanScene })));
const IntegralScene = lazy(() => import('./scenes/IntegralScene.tsx').then((module) => ({ default: module.IntegralScene })));
const MachineScene = lazy(() => import('./scenes/MachineScene.tsx').then((module) => ({ default: module.MachineScene })));
const MemoryScene = lazy(() => import('./scenes/MemoryScene.tsx').then((module) => ({ default: module.MemoryScene })));
const NewtonScene = lazy(() => import('./scenes/NewtonScene.tsx').then((module) => ({ default: module.NewtonScene })));
const NewtonsMethodScene = lazy(() => import('./scenes/NewtonsMethodScene.tsx').then((module) => ({ default: module.NewtonsMethodScene })));
const OperationTableScene = lazy(() => import('./scenes/OperationTableScene.tsx').then((module) => ({ default: module.OperationTableScene })));
const OrderScene = lazy(() => import('./scenes/OrderScene.tsx').then((module) => ({ default: module.OrderScene })));
const SeriesScene = lazy(() => import('./scenes/SeriesScene.tsx').then((module) => ({ default: module.SeriesScene })));
const PairsScene = lazy(() => import('./scenes/PairsScene.tsx').then((module) => ({ default: module.PairsScene })));
const PictureScene = lazy(() => import('./scenes/PictureScene.tsx').then((module) => ({ default: module.PictureScene })));
const SubstitutionScene = lazy(() => import('./scenes/SubstitutionScene.tsx').then((module) => ({ default: module.SubstitutionScene })));
const TreeScene = lazy(() => import('./scenes/TreeScene.tsx').then((module) => ({ default: module.TreeScene })));
const TaggedListScene = lazy(() => import('./chapter4/TaggedListScene.tsx').then((module) => ({ default: module.TaggedListScene })));
const EvalApplyScene = lazy(() => import('./chapter4/EvalApplyScene.tsx').then((module) => ({ default: module.EvalApplyScene })));
const ThunkScene = lazy(() => import('./chapter4/ThunkScene.tsx').then((module) => ({ default: module.ThunkScene })));
const AmbSearchScene = lazy(() => import('./chapter4/AmbSearchScene.tsx').then((module) => ({ default: module.AmbSearchScene })));
const QueryScene = lazy(() => import('./chapter4/QueryScene.tsx').then((module) => ({ default: module.QueryScene })));

/**
 * The animations a section can place under an editor. Each one is drawn from
 * the program as it currently reads in the editor: edit the code and the
 * picture follows.
 */
export type AnimKind =
  /** Each statement's combination collapsing to its value (§1.1.1). */
  | 'reduce'
  /** Text becoming a tree, values climbing to the root (§1.1.1, §1.1.3). */
  | 'tree'
  /** The program frame as a table of names (§1.1.2). */
  | 'environment'
  /** Calls opening inside calls (§1.1.4). */
  | 'calls'
  /** The substitution model with an order toggle, beside the machine's frames (§1.1.5). */
  | 'substitution+frames'
  /** Conditionals as a lit path through a decision tree (§1.1.6). */
  | 'branches'
  /** Applicative against normal order (§1.1.6). */
  | 'order'
  /** Tangent lines on y² − x (§1.1.7). */
  | 'newton'
  /** Frames, lexical scoping and lookups (§1.1.8). */
  | 'frames'
  /** Deferred operations piling up, or not (§1.2.1). */
  | 'process'
  /** The call tree, with calls that repeat earlier ones marked (§1.2.2). */
  | 'tree-recursion'
  /** Calls and stack depth measured at several sizes (§1.2.3). */
  | 'growth'
  /** Rectangles under the integrand, one per value computed (§1.3.1). */
  | 'integral'
  /** The interval around a root, halved call by call (§1.3.3). */
  | 'half-interval'
  /** A fixed-point search as a cobweb on y = f(x) and y = x (§1.3.3). */
  | 'fixed-point'
  /** Tangent lines on any g, as `newtons_method` runs (§1.3.4). */
  | 'newtons-method'
  /** Box-and-pointer diagrams of every structure the program names, and of its value (§2.1, §2.2). */
  | 'pairs'
  /** The lines a painter draws, revealed in the order it draws them (§2.2.4). */
  | 'picture'
  /** Every complex number the program names, as an arrow in the plane, read through its own selectors (§2.4). */
  | 'complex-plane'
  /** The operation-and-type table, filled by each put and lit by each get (§2.4.3). */
  | 'operation-table'
  /** Huffman code trees with 0 and 1 on their branches, and the path of each decoded symbol (§2.3.4). */
  | 'huffman'
  /** A register machine's data paths, controller and stack as it runs; the evaluator's registers for §5.4 (§5.1 – §5.4). */
  | 'machine'
  /** The pairs the program made, as two vectors of typed pointers (§5.3.1). */
  | 'memory'
  /** The same, then the stop-and-copy collector at work (§5.3.2). */
  | 'garbage-collection'
  /** The code the compiler produces for the program (§5.5). */
  | 'compiled'
  /** Stack use, interpreted against compiled, at each size the program calls (§5.4.4, §5.5.7). */
  | 'compare'
  /** The tagged lists `parse` returns for the program, as a tree, with the syntax predicate that recognizes each component (§4.1.2). */
  | 'tagged-list'
  /** The `evaluate`–`apply` cycle of the metacircular evaluator, from its calls (§4.1.1). */
  | 'eval-apply'
  /** Thunks created, forced and memoized by the lazy evaluator (§4.2.2). */
  | 'thunks'
  /** The choices `amb` makes and the backtracking a failed `require` causes, as a search tree (§4.3). */
  | 'amb-search'
  /** Frames flowing through a query: patterns matched against assertions, rules unified (§4.4). */
  | 'query-frames'
  /** The numbers the program displays, plotted as series (§3.1.2, §3.5.3). */
  | 'series'
  /** Chapter 3's own scenes, registered per section in `chapter-3/`. */
  | Chapter3Kind;

type Chapter3Kind =
  | keyof typeof import('./chapter-3/section-3.1.tsx').scenes
  | keyof typeof import('./chapter-3/section-3.2.tsx').scenes
  | keyof typeof import('./chapter-3/section-3.3-simulation.tsx').scenes
  | keyof typeof import('./chapter-3/section-3.3.tsx').scenes
  | keyof typeof import('./chapter-3/section-3.4.tsx').scenes
  | keyof typeof import('./chapter-3/section-3.5-paradigm.tsx').scenes
  | keyof typeof import('./chapter-3/section-3.5.tsx').scenes;

const chapter3 = {
  'local-state': lazy(() => import('./chapter-3/section-3.1.tsx').then((module) => ({ default: module.scenes['local-state'] }))),
  'circuit-timing': lazy(() => import('./chapter-3/section-3.3-simulation.tsx').then((module) => ({ default: module.scenes['circuit-timing'] }))),
  'constraint-network': lazy(() => import('./chapter-3/section-3.3-simulation.tsx').then((module) => ({ default: module.scenes['constraint-network'] }))),
  'box-pointer': lazy(() => import('./chapter-3/section-3.3.tsx').then((module) => ({ default: module.scenes['box-pointer'] }))),
  'box-pointer-queue': lazy(() => import('./chapter-3/section-3.3.tsx').then((module) => ({ default: module.scenes['box-pointer-queue'] }))),
  'box-pointer-table': lazy(() => import('./chapter-3/section-3.3.tsx').then((module) => ({ default: module.scenes['box-pointer-table'] }))),
  'interleaving': lazy(() => import('./chapter-3/section-3.4.tsx').then((module) => ({ default: module.scenes['interleaving'] }))),
  'outcomes': lazy(() => import('./chapter-3/section-3.4.tsx').then((module) => ({ default: module.scenes['outcomes'] }))),
  'pairs-order': lazy(() => import('./chapter-3/section-3.5-paradigm.tsx').then((module) => ({ default: module.scenes['pairs-order'] }))),
  'stream-forcing': lazy(() => import('./chapter-3/section-3.5.tsx').then((module) => ({ default: module.scenes['stream-forcing'] }))),
  'sieve': lazy(() => import('./chapter-3/section-3.5.tsx').then((module) => ({ default: module.scenes['sieve'] }))),
} satisfies Record<Chapter3Kind, ComponentType<SceneProps>>;

function isChapter3Kind(kind: AnimKind): kind is Chapter3Kind {
  return Object.hasOwn(chapter3, kind);
}

/** Running a program for its output alone can take many more steps than a full trace allows. */
const SERIES_BUDGET = 1_000_000;

export interface AnimationProps {
  kind: AnimKind;
  /** The program as the editor currently has it. */
  source: string;
  /** For step-mode editors: the stepper's record index, which some scenes follow. */
  stepIndex?: number | undefined;
  /** Declarations the program relies on without showing them. */
  prelude?: string | undefined;
  /** For `compare`: a program declaring `special_statistics(n)` for a hand-designed machine. */
  special?: string | undefined;
  /** For `memory`: the index of the first pair. */
  start?: number | undefined;
}

export function Animation(props: AnimationProps): ReactNode {
  return (
    <Suspense fallback={<div role="status" className="rounded-lg bg-paper-2 p-4 text-ink-3">Loading animation…</div>}>
      <AnimationContent {...props} />
    </Suspense>
  );
}

function AnimationContent({ kind, source, stepIndex, prelude, special, start }: AnimationProps): ReactNode {
  switch (kind) {
    case 'machine':
      return <MachineScene source={source} prelude={prelude} />;
    case 'memory':
      return <MemoryScene source={source} layoutOnly {...(start !== undefined && { start })} />;
    case 'garbage-collection':
      return <MemoryScene source={source} title="Stop and copy" {...(start !== undefined && { start })} />;
    case 'compiled':
      return <CompiledScene source={source} />;
    case 'compare':
      return <CompareScene source={source} special={special} />;
    case 'tagged-list':
      return <TaggedListScene source={source} prelude={prelude} />;
    case 'eval-apply':
      return <EvalApplyScene source={source} prelude={prelude} />;
    case 'thunks':
      return <ThunkScene source={source} prelude={prelude} />;
    case 'amb-search':
      return <AmbSearchScene source={source} prelude={prelude} />;
    case 'query-frames':
      return <QueryScene source={source} prelude={prelude} />;
    case 'reduce':
      return <SubstitutionScene source={source} title="Collapsing a combination" />;
    case 'order':
      return <OrderScene source={source} />;
    case 'process':
      return <SubstitutionScene source={source} title="What the process leaves pending" maxSteps={160} />;
    case 'growth':
      return <GrowthScene source={source} />;
    case 'series':
      return <Series source={source} prelude={prelude} />;
    case 'complex-plane':
      return <ComplexPlaneScene source={source} prelude={prelude} />;
    case 'operation-table':
      return <OperationTableScene source={source} prelude={prelude} />;
    case 'substitution+frames':
      return (
        <div className="flex flex-col gap-4">
          <SubstitutionScene source={source} title="The substitution model" orderToggle />
          <Traced kind="frames" source={source} stepIndex={stepIndex} title="What the machine does instead" />
        </div>
      );
    default: {
      if (isChapter3Kind(kind)) {
        const Scene = chapter3[kind];
        return <Scene source={source} stepIndex={stepIndex} prelude={prelude} />;
      }
      return <Traced kind={kind as TracedProps['kind']} source={source} stepIndex={stepIndex} prelude={prelude} />;
    }
  }
}

function Series({ source, prelude }: { source: string; prelude: string | undefined }) {
  // Only the output is drawn, so one record is enough.
  const { trace } = useTrace(source, { budget: SERIES_BUDGET, maxRecords: 1, prelude });
  return <SeriesScene trace={trace} />;
}

type Chapter4Kind = 'tagged-list' | 'eval-apply' | 'thunks' | 'amb-search' | 'query-frames';
type Chapter5Kind = 'machine' | 'memory' | 'garbage-collection' | 'compiled' | 'compare';

interface TracedProps {
  kind: Exclude<
    AnimKind,
    'reduce' | 'order' | 'process' | 'substitution+frames' | 'growth' | 'complex-plane' | 'operation-table' | 'series' | Chapter3Kind | Chapter4Kind | Chapter5Kind
  >;
  source: string;
  stepIndex?: number | undefined;
  title?: string;
  prelude?: string | undefined;
}

/** Scenes that follow a method through many calls need a longer log than the default. */
const RECORDS: Partial<Record<TracedProps['kind'], number>> = {
  'tree-recursion': 4000,
  integral: 4000,
  'half-interval': 4000,
  'fixed-point': 4000,
  'newtons-method': 4000,
  // The structures a program names can be declared after thousands of steps.
  pairs: 20_000,
  huffman: 20_000,
  // The picture comes with the trace, not from its records.
  picture: 1,
};

/** Scenes that read only what the program built, not each step, can trace a longer run. */
const BUDGET: Partial<Record<TracedProps['kind'], number>> = { pairs: 200_000, picture: 1_000_000, huffman: 200_000 };

/** Scenes that need the evaluator's trace of the current text. */
function Traced({ kind, source, stepIndex, title, prelude }: TracedProps) {
  const maxRecords = RECORDS[kind];
  const budget = BUDGET[kind];
  const { trace } = useTrace(source, {
    ...(maxRecords !== undefined && { maxRecords }),
    ...(budget !== undefined && { budget }),
    prelude,
  });
  const synced = stepIndex !== undefined ? { stepIndex } : {};
  switch (kind) {
    case 'tree':
      return <TreeScene source={source} trace={trace} {...synced} />;
    case 'environment':
      return <EnvironmentScene source={source} trace={trace} title={title ?? 'The environment as a table'} {...synced} />;
    case 'frames':
      return <EnvironmentScene source={source} trace={trace} title={title ?? 'Frames and lookups'} {...synced} />;
    case 'calls':
      return <CallsScene source={source} trace={trace} />;
    case 'branches':
      return <BranchesScene source={source} trace={trace} />;
    case 'newton':
      return <NewtonScene source={source} trace={trace} />;
    case 'tree-recursion':
      return <CallsScene source={source} trace={trace} title="The tree of calls" repeats />;
    case 'integral':
      return <IntegralScene source={source} trace={trace} />;
    case 'half-interval':
      return <HalfIntervalScene source={source} trace={trace} />;
    case 'fixed-point':
      return <CobwebScene source={source} trace={trace} />;
    case 'newtons-method':
      return <NewtonsMethodScene source={source} trace={trace} />;
    case 'pairs':
      return <PairsScene trace={trace} {...(title !== undefined && { title })} />;
    case 'picture':
      return <PictureScene trace={trace} {...(title !== undefined && { title })} />;
    case 'huffman':
      return <HuffmanScene trace={trace} {...(title !== undefined && { title })} />;
  }
}
