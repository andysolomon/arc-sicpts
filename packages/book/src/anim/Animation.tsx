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
import { EnvironmentScene } from './scenes/EnvironmentScene.tsx';
import { GrowthScene } from './scenes/GrowthScene.tsx';
import { HalfIntervalScene } from './scenes/HalfIntervalScene.tsx';
import { IntegralScene } from './scenes/IntegralScene.tsx';
import { NewtonScene } from './scenes/NewtonScene.tsx';
import { NewtonsMethodScene } from './scenes/NewtonsMethodScene.tsx';
import { OrderScene } from './scenes/OrderScene.tsx';
import { SeriesScene } from './scenes/SeriesScene.tsx';
import { SubstitutionScene } from './scenes/SubstitutionScene.tsx';
import { TreeScene } from './scenes/TreeScene.tsx';
import { useTrace } from './useTrace.ts';

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
}

export function Animation({ kind, source, stepIndex }: AnimationProps): ReactNode {
  switch (kind) {
    case 'reduce':
      return <SubstitutionScene source={source} title="Collapsing a combination" />;
    case 'order':
      return <OrderScene source={source} />;
    case 'process':
      return <SubstitutionScene source={source} title="What the process leaves pending" maxSteps={160} />;
    case 'growth':
      return <GrowthScene source={source} />;
    case 'series':
      return <Series source={source} />;
    case 'substitution+frames':
      return (
        <div className="flex flex-col gap-4">
          <SubstitutionScene source={source} title="The substitution model" orderToggle />
          <Traced kind="frames" source={source} stepIndex={stepIndex} title="What the machine does instead" />
        </div>
      );
    default: {
      const scene = (chapter3 as SceneRegistry)[kind];
      if (scene !== undefined) return scene({ source, stepIndex });
      return <Traced kind={kind as TracedProps['kind']} source={source} stepIndex={stepIndex} />;
    }
  }
}

function Series({ source }: { source: string }) {
  // Only the output is drawn, so one record is enough.
  const { trace } = useTrace(source, { budget: SERIES_BUDGET, maxRecords: 1 });
  return <SeriesScene trace={trace} />;
}

interface TracedProps {
  kind: Exclude<AnimKind, 'reduce' | 'order' | 'process' | 'substitution+frames' | 'growth' | 'series' | Chapter3Kind>;
  source: string;
  stepIndex?: number | undefined;
  title?: string;
}

/** Scenes that follow a method through many calls need a longer log than the default. */
const LONG_TRACE: ReadonlySet<TracedProps['kind']> = new Set(['tree-recursion', 'integral', 'half-interval', 'fixed-point', 'newtons-method']);

/** Scenes that need the evaluator's trace of the current text. */
function Traced({ kind, source, stepIndex, title }: TracedProps) {
  const { trace } = useTrace(source, LONG_TRACE.has(kind) ? { maxRecords: 4000 } : {});
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
  }
}
