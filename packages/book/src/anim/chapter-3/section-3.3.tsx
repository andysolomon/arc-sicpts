import { BoxPointerScene } from '../scenes/BoxPointerScene.tsx';
import { useTrace } from '../useTrace.ts';
import type { SceneRegistry } from './registry.ts';

/** Queues and tables keep going for a while before their last statement; give them room. */
const BOX_POINTER_TRACE = { heap: true, maxRecords: 2000, budget: 50_000 } as const;

function BoxPointer({ source, stepIndex, title }: { source: string; stepIndex?: number | undefined; title?: string }) {
  const { trace } = useTrace(source, BOX_POINTER_TRACE);
  return <BoxPointerScene trace={trace} stepIndex={stepIndex} {...(title !== undefined && { title })} />;
}

/** Animations of §3.3, by the kind an `<Example anim="...">` names. */
export const scenes = {
  /** Pairs as boxes and pointers, statement by statement, drawn from the Laboratory's heap snapshots (§3.3.1–§3.3.3). */
  'box-pointer': ({ source, stepIndex }) => <BoxPointer source={source} stepIndex={stepIndex} />,
  /** The same drawing, titled for a queue's front and rear pointers (§3.3.2). */
  'box-pointer-queue': ({ source, stepIndex }) => <BoxPointer source={source} stepIndex={stepIndex} title="A queue: front and rear pointers" />,
  /** The same drawing, titled for a table's headed list of records (§3.3.3). */
  'box-pointer-table': ({ source, stepIndex }) => <BoxPointer source={source} stepIndex={stepIndex} title="A table as a headed list of records" />,
} satisfies SceneRegistry;
