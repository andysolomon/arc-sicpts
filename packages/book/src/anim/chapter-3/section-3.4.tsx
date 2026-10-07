import { InterleavingScene } from './InterleavingScene.tsx';
import { OutcomesScene } from './OutcomesScene.tsx';
import type { SceneRegistry } from './registry.ts';

/** Animations of §3.4, by the kind an `<Example anim="...">` names. */
export const scenes = {
  /** A timing diagram of the threads, drawn from a trace whose seed the reader picks. */
  interleaving: ({ source }) => <InterleavingScene source={source} />,
  /** A histogram of the final values of 60 runs, one seed each. */
  outcomes: ({ source }) => <OutcomesScene source={source} />,
} satisfies SceneRegistry;
