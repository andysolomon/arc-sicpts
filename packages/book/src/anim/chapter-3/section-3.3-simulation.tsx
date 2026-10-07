import { CircuitTimingScene } from '../scenes/CircuitTimingScene.tsx';
import { ConstraintScene } from '../scenes/ConstraintScene.tsx';
import { useTrace } from '../useTrace.ts';
import type { SceneProps, SceneRegistry } from './registry.ts';

/**
 * A simulation runs many thousands of steps before its probes have printed
 * everything, and only the printed lines are drawn: a large budget, and one
 * record of the step log is enough.
 */
const SIMULATION_TRACE = { budget: 2_000_000, maxRecords: 1 } as const;

/** One row per probed wire, its signal over simulated time (§3.3.4). */
function CircuitTiming({ source }: SceneProps) {
  const { trace } = useTrace(source, SIMULATION_TRACE);
  return <CircuitTimingScene trace={trace} />;
}

/** The Celsius–Fahrenheit network with the values its probes report (§3.3.5). */
function ConstraintNetworkScene({ source }: SceneProps) {
  const { trace } = useTrace(source, SIMULATION_TRACE);
  return <ConstraintScene trace={trace} />;
}

/** Animations of §3.3.4–§3.3.5, by the kind an `<Example anim="...">` names. */
export const scenes = {
  'circuit-timing': (props) => <CircuitTiming {...props} />,
  'constraint-network': (props) => <ConstraintNetworkScene {...props} />,
} satisfies SceneRegistry;
