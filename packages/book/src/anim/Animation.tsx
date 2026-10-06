import type { ReactNode } from 'react';
import { BranchesScene } from './scenes/BranchesScene.tsx';
import { CallsScene } from './scenes/CallsScene.tsx';
import { EnvironmentScene } from './scenes/EnvironmentScene.tsx';
import { NewtonScene } from './scenes/NewtonScene.tsx';
import { OrderScene } from './scenes/OrderScene.tsx';
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
  | 'process';

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
    case 'substitution+frames':
      return (
        <div className="flex flex-col gap-4">
          <SubstitutionScene source={source} title="The substitution model" orderToggle />
          <Traced kind="frames" source={source} stepIndex={stepIndex} title="What the machine does instead" />
        </div>
      );
    default:
      return <Traced kind={kind} source={source} stepIndex={stepIndex} />;
  }
}

interface TracedProps {
  kind: Exclude<AnimKind, 'reduce' | 'order' | 'process' | 'substitution+frames'>;
  source: string;
  stepIndex?: number | undefined;
  title?: string;
}

/** Scenes that need the evaluator's trace of the current text. */
function Traced({ kind, source, stepIndex, title }: TracedProps) {
  const { trace } = useTrace(source);
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
  }
}
