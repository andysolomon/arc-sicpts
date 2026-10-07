import { useMemo, useRef } from 'react';
import { ConstraintNetwork } from '../../diagrams/ConstraintNetwork.tsx';
import { constraintCaption, constraintEvents, networkConnector, valuesAt } from '../model/constraintProbes.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Values arriving at the connectors of the Celsius–Fahrenheit network
 * (§3.3.5), one keyframe per line its probes print. Probes named after the
 * network's connectors (`C`, `F`, `u` … `y`, or "Celsius temp" and
 * "Fahrenheit temp") light up on the drawing; other probes are listed below it.
 */

export interface ConstraintSceneProps {
  trace: Trace | null;
  title?: string;
}

export function ConstraintScene({ trace, title = 'Values spreading through the network' }: ConstraintSceneProps) {
  const events = useMemo(() => constraintEvents(trace?.output ?? []), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(events.length, { stage, resetKey: trace, msPerStep: 1000 });
  const error = trace?.outcome.status === 'error' ? trace.outcome.error.message : null;

  if (events.length === 0) {
    return (
      <SceneFrame
        title={title}
        provenance="trace"
        caption={inlineCode(
          trace === null
            ? 'Running the network…'
            : error !== null
              ? `The program stopped: ${error}`
              : 'Attach a probe with `probe(name, connector)` to see the values it reports.',
        )}
        empty="No probe has printed yet"
      >
        <div />
      </SceneFrame>
    );
  }

  const index = Math.min(player.index, events.length - 1);
  const raw = valuesAt(events, index);
  const onNetwork = new Map<string, string | null>();
  const others: [string, string | null][] = [];
  for (const [name, value] of raw) {
    const connector = networkConnector(name);
    if (connector === null) others.push([name, value]);
    else onNetwork.set(connector, value);
  }
  const current = events[index];
  const focus = current === undefined ? null : (networkConnector(current.connector) ?? null);
  let caption = constraintCaption(events, index);
  if (index === events.length - 1 && error !== null) caption += ` Then the program stopped: ${error}`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage} className="flex flex-col gap-2">
        <ConstraintNetwork values={onNetwork} focus={focus} />
        {others.length > 0 && (
          <ul aria-label="Other probes" className="m-0 flex list-none flex-wrap gap-2 p-0 font-mono text-[12.5px]">
            {others.map(([name, value]) => (
              <li key={name} className={`rounded-full border px-2.5 py-0.5 ${name === current?.connector ? 'border-accent text-accent-ink' : 'border-line text-ink-2'}`}>
                {name} = {value ?? '?'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SceneFrame>
  );
}
