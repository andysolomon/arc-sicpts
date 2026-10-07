import { useMemo, useRef } from 'react';
import { probeEvents, timingCaption, timingRows } from '../model/circuitTiming.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * A timing diagram of a circuit simulation (§3.3.4): one row per probed wire,
 * its signal stepping between 0 and 1 over simulated time. Each keyframe is
 * one line a probe printed, so the diagram grows in the order the agenda ran.
 */

export interface CircuitTimingSceneProps {
  trace: Trace | null;
  title?: string;
}

const WIDTH = 580;
const LEFT = 70;
const RIGHT = 54;
const TOP = 10;
const ROW = 38;
const HIGH = 20;
const AXIS = 30;

export function CircuitTimingScene({ trace, title = 'Signals over simulated time' }: CircuitTimingSceneProps) {
  const events = useMemo(() => probeEvents(trace?.output ?? []), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(events.length, { stage, resetKey: trace, msPerStep: 900 });

  if (events.length === 0) {
    const error = trace?.outcome.status === 'error' ? trace.outcome.error.message : null;
    return (
      <SceneFrame
        title={title}
        provenance="trace"
        caption={inlineCode(
          trace === null
            ? 'Running the simulation…'
            : error !== null
              ? `The program stopped: ${error}`
              : 'Attach a probe with `probe(name, wire)` and the wire’s signal is drawn here.',
        )}
        empty="No probe has printed yet"
      >
        <div />
      </SceneFrame>
    );
  }

  const index = Math.min(player.index, events.length - 1);
  const rows = timingRows(events, index);
  const t0 = Math.min(...events.map((e) => e.time));
  const t1 = Math.max(...events.map((e) => e.time));
  const span = Math.max(1, t1 - t0);
  const end = t1 + Math.max(2, span * 0.08);
  const sx = (t: number) => LEFT + ((t - t0) / (end - t0)) * (WIDTH - LEFT - RIGHT);
  const now = events[index]?.time ?? t0;
  const height = TOP + rows.length * ROW + AXIS;
  const times = [...new Set(events.slice(0, index + 1).map((e) => e.time))];

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(timingCaption(events, index))}>
      <div ref={stage}>
        <Stage width={WIDTH} height={height} label={`Timing diagram of ${rows.map((r) => r.wire).join(', ')}`}>
          {rows.map((row, r) => {
            const base = TOP + r * ROW + ROW - 10;
            const level = (v: number) => (v === 0 ? base : base - HIGH);
            const first = row.changes[0];
            let d = '';
            if (first !== undefined) {
              d = `M ${sx(first.time).toFixed(1)} ${level(first.value)}`;
              for (const change of row.changes.slice(1)) {
                d += ` H ${sx(change.time).toFixed(1)} V ${level(change.value)}`;
              }
              d += ` H ${sx(now).toFixed(1)}`;
            }
            const last = row.changes[row.changes.length - 1];
            const current = events[index]?.wire === row.wire;
            return (
              <g key={row.wire} data-testid="timing-row" data-wire={row.wire} data-value={last?.value ?? ''}>
                <text x={LEFT - 12} y={base - HIGH / 2} textAnchor="end" dominantBaseline="central" fontSize={12.5} className={current ? 'fill-accent-ink' : 'fill-ink'}>
                  {row.wire}
                </text>
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={base} y2={base} className="stroke-line" strokeWidth={1} strokeDasharray="2 3" />
                {d !== '' && <path d={d} fill="none" className={current ? 'stroke-accent' : 'stroke-num'} strokeWidth={2} strokeLinejoin="round" />}
                {row.changes.slice(1).map((change) => (
                  <circle key={change.event} data-testid="timing-change" cx={sx(change.time)} cy={level(change.value)} r={2.6} className={change.event === index ? 'fill-accent' : 'fill-num'} />
                ))}
                {last !== undefined && (
                  <text x={WIDTH - RIGHT + 10} y={base - HIGH / 2} dominantBaseline="central" fontSize={12} className="fill-ink-3">
                    {last.value}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={sx(now)} x2={sx(now)} y1={TOP} y2={TOP + rows.length * ROW} className="stroke-accent" strokeWidth={1.2} strokeDasharray="4 3" />
          <line x1={LEFT} x2={WIDTH - RIGHT} y1={TOP + rows.length * ROW + 4} y2={TOP + rows.length * ROW + 4} className="stroke-ink-3" strokeWidth={1} />
          {times.map((t) => (
            <text key={t} data-testid="timing-tick" x={sx(t)} y={TOP + rows.length * ROW + 18} textAnchor="middle" fontSize={10.5} className={t === now ? 'fill-accent-ink' : 'fill-ink-3'}>
              {t}
            </text>
          ))}
          <text x={WIDTH - RIGHT + 10} y={TOP + rows.length * ROW + 18} fontSize={10.5} className="fill-ink-3">
            time
          </text>
        </Stage>
      </div>
    </SceneFrame>
  );
}
