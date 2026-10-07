import { useTrace } from '../useTrace.ts';
import { PairsOrderScene } from './PairsOrderScene.tsx';
import type { SceneRegistry } from './registry.ts';

/** Only the output is drawn, so one record is enough; streams of pairs can take many steps. */
const PAIRS_BUDGET = 1_000_000;

function PairsOrder({ source, prelude }: { source: string; prelude: string | undefined }) {
  const { trace } = useTrace(source, { budget: PAIRS_BUDGET, maxRecords: 1, prelude });
  return <PairsOrderScene trace={trace} />;
}

/** Animations of §3.5.3–§3.5.5, by the kind an `<Example anim="...">` names. */
export const scenes = {
  /** Pairs of integers lit on a grid in the order a stream of pairs produces them (§3.5.3). */
  'pairs-order': ({ source, prelude }) => <PairsOrder source={source} prelude={prelude} />,
} satisfies SceneRegistry;
