import { useMemo } from 'react';
import { resolveAssignments } from '../model/localState.ts';
import { EnvironmentScene } from '../scenes/EnvironmentScene.tsx';
import { LocalStateScene } from '../scenes/LocalStateScene.tsx';
import { useTrace } from '../useTrace.ts';
import type { SceneProps, SceneRegistry } from './registry.ts';

/** Objects and the state each one holds, with a card per object (§3.1.1, §3.1.3). */
function LocalStateTraced({ source, stepIndex }: SceneProps) {
  const { trace } = useTrace(source, { maxRecords: 2000 });
  return <LocalStateScene trace={trace} {...(stepIndex !== undefined && { stepIndex })} />;
}

/**
 * Environment frames, with each assignment shown in the frame that binds the
 * name it changes: `balance = balance - amount` runs in the frame of the
 * withdrawal, and changes the `balance` of the frame the withdrawal remembers.
 */
function LocalStateFrames({ source, stepIndex }: SceneProps) {
  const { trace } = useTrace(source);
  const resolved = useMemo(() => (trace === null ? null : resolveAssignments(trace)), [trace]);
  return (
    <EnvironmentScene
      source={source}
      trace={resolved}
      title="Frames and assignments"
      {...(stepIndex !== undefined && { stepIndex })}
    />
  );
}

/** Animations of §3.1, by the kind an `<Example anim="...">` names. */
export const scenes = {
  'local-state': (props) => <LocalStateTraced {...props} />,
  'local-state-frames': (props) => <LocalStateFrames {...props} />,
} satisfies SceneRegistry;
