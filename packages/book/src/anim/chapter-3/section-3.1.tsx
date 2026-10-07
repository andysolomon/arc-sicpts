import { LocalStateScene } from '../scenes/LocalStateScene.tsx';
import { useTrace } from '../useTrace.ts';
import type { SceneProps, SceneRegistry } from './registry.ts';

/** Objects and the state each one holds, with a card per object (§3.1.1, §3.1.3). */
function LocalStateTraced({ source, stepIndex }: SceneProps) {
  const { trace } = useTrace(source, { maxRecords: 2000 });
  return <LocalStateScene trace={trace} {...(stepIndex !== undefined && { stepIndex })} />;
}

/** Animations of §3.1, by the kind an `<Example anim="...">` names. */
export const scenes = {
  'local-state': (props) => <LocalStateTraced {...props} />,
} satisfies SceneRegistry;
