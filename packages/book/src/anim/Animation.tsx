import type { ReactNode } from 'react';
import { scenes as scenes31 } from './chapter-3/section-3.1.tsx';
import { scenes as scenes32 } from './chapter-3/section-3.2.tsx';
import { scenes as scenes33 } from './chapter-3/section-3.3.tsx';
import { scenes as scenes33Simulation } from './chapter-3/section-3.3-simulation.tsx';
import { scenes as scenes34 } from './chapter-3/section-3.4.tsx';
import { scenes as scenes35 } from './chapter-3/section-3.5.tsx';
import { scenes as scenes35Paradigm } from './chapter-3/section-3.5-paradigm.tsx';
import type { SceneRegistry } from './chapter-3/registry.ts';
import { BranchesScene } from './scenes/BranchesScene.tsx';
import { CallsScene } from './scenes/CallsScene.tsx';
import { CobwebScene } from './scenes/CobwebScene.tsx';
import { ComplexPlaneScene } from './scenes/ComplexPlaneScene.tsx';
import { EnvironmentScene } from './scenes/EnvironmentScene.tsx';
import { GrowthScene } from './scenes/GrowthScene.tsx';
import { HalfIntervalScene } from './scenes/HalfIntervalScene.tsx';
import { HuffmanScene } from './scenes/HuffmanScene.tsx';
import { IntegralScene } from './scenes/IntegralScene.tsx';
import { NewtonScene } from './scenes/NewtonScene.tsx';
import { NewtonsMethodScene } from './scenes/NewtonsMethodScene.tsx';
import { OperationTableScene } from './scenes/OperationTableScene.tsx';
import { OrderScene } from './scenes/OrderScene.tsx';
import { SeriesScene } from './scenes/SeriesScene.tsx';
import { PairsScene } from './scenes/PairsScene.tsx';
import { PictureScene } from './scenes/PictureScene.tsx';
import { SubstitutionScene } from './scenes/SubstitutionScene.tsx';
import { TreeScene } from './scenes/TreeScene.tsx';
import { useTrace } from './useTrace.ts';
import { TaggedListScene } from './chapter4/TaggedListScene.tsx';
import { EvalApplyScene } from './chapter4/EvalApplyScene.tsx';
import { ThunkScene } from './chapter4/ThunkScene.tsx';
import { AmbSearchScene } from './chapter4/AmbSearchScene.tsx';
import { QueryScene } from './chapter4/QueryScene.tsx';

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

const chapter3 = {
  ...scenes31,
  ...scenes32,
  ...scenes33,
  ...scenes33Simulation,
  ...scenes34,
  ...scenes35,
  ...scenes35Paradigm,
} satisfies SceneRegistry;
type Chapter3Kind = keyof typeof chapter3;

/** Running a program for its output alone can take many more steps than a full trace allows. */
const SERIES_BUDGET = 1_000_000;

export interface AnimationProps {
  kind: AnimKind;
  /** The program as the editor currently has it. */
  source: string;
  /** For step-mode editors: the stepper's record index, which some scenes follow. */
  stepIndex?: number | undefined;
  /** Declarations the editor evaluates before the program, unseen. */
  prelude?: string | undefined;
}

export function Animation({ kind, source, stepIndex, prelude }: AnimationProps): ReactNode {
  switch (kind) {
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
      const scene = (chapter3 as SceneRegistry)[kind];
      if (scene !== undefined) return scene({ source, stepIndex, prelude });
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

interface TracedProps {
  kind: Exclude<
    AnimKind,
    'reduce' | 'order' | 'process' | 'substitution+frames' | 'growth' | 'complex-plane' | 'operation-table' | 'series' | Chapter3Kind | Chapter4Kind
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
