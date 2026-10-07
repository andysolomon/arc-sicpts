import type { SceneRegistry } from './registry.ts';
import { SieveScene } from './SieveScene.tsx';
import { StreamForcingScene } from './StreamForcingScene.tsx';
import { useTrace } from '../useTrace.ts';

/** Animations of §3.5.1 and §3.5.2, by the kind an `<Example anim="...">` names. */

/** Only the output is drawn, so one record is enough; streams can take many steps. */
function StreamForcing({ source }: { source: string }) {
  const { trace } = useTrace(source, { budget: 1_000_000, maxRecords: 1 });
  return <StreamForcingScene trace={trace} />;
}

/** The first thirty or so candidates need a few thousand records of the sieve's trace. */
function Sieve({ source }: { source: string }) {
  const { trace } = useTrace(source, { budget: 20_000, maxRecords: 6000 });
  return <SieveScene trace={trace} />;
}

export const scenes = {
  /** A stream growing as its tails are forced, with repeated computations counted (§3.5.1, §3.5.2). */
  'stream-forcing': ({ source }) => <StreamForcing source={source} />,
  /** The sieve of Eratosthenes as a cascade of filters (§3.5.2). */
  sieve: ({ source }) => <Sieve source={source} />,
} satisfies SceneRegistry;
