import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { fmt } from '../model/plot.ts';
import { seriesFromTrace } from '../model/series.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { Axes, extent, frame, pad, PLOT } from './plot.tsx';

/**
 * The numbers a program displays, plotted in the order it displays them: a
 * running estimate settling down (§3.1.2), or a stream of approximations and
 * its accelerated versions (§3.5.3). `display("label")` starts a new series.
 */

export interface SeriesSceneProps {
  trace: Trace | null;
  title?: string;
}

/** Points revealed per keyframe are chosen so that a run plays in about this many keyframes. */
const KEYFRAMES = 24;
const TONES = ['stroke-accent fill-accent', 'stroke-num fill-num', 'stroke-str fill-str', 'stroke-bad fill-bad'];

export function SeriesScene({ trace, title = 'What the program printed, plotted' }: SeriesSceneProps) {
  const series = useMemo(() => seriesFromTrace(trace), [trace]);
  const longest = Math.max(0, ...series.map((s) => s.values.length));
  const perFrame = Math.max(1, Math.ceil(longest / KEYFRAMES));
  const frames = longest === 0 ? 0 : Math.ceil(longest / perFrame);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames, { stage, resetKey: trace, msPerStep: 450 });

  if (series.length === 0) {
    return (
      <SceneFrame
        title={title}
        provenance="trace"
        caption={inlineCode(trace === null ? 'Running the program…' : 'Display numbers to plot them; display a string to start a new series.')}
        empty="Nothing printed yet"
      >
        <div />
      </SceneFrame>
    );
  }

  const shown = Math.min(longest, (player.index + 1) * perFrame);
  const all = series.flatMap((s) => s.values);
  const fr = frame([0, Math.max(1, longest - 1)], pad(extent(all)));
  const caption = series
    .map((s) => {
      const upto = s.values.slice(0, shown);
      const last = upto[upto.length - 1];
      return `${s.label === '' ? 'values' : s.label}: ${upto.length} of ${s.values.length}${last === undefined ? '' : `, latest ${fmt(last)}`}`;
    })
    .join(' · ');

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={PLOT.width} height={PLOT.height} label={`${series.length} series of printed numbers`}>
          <Axes fr={fr} xLabel="n" yLabel="value" />
          {series.map((s, i) => {
            const tone = TONES[i % TONES.length] ?? TONES[0];
            const points = s.values.slice(0, shown).map((v, n) => [fr.sx(n), fr.sy(v)] as const);
            const d = points.map(([x, y], n) => `${n === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
            return (
              <g key={`${s.label}-${i}`} data-testid="series" data-label={s.label}>
                <path d={d} fill="none" strokeWidth={1.6} className={tone} style={{ fill: 'none' }} />
                {points.length <= 60 &&
                  points.map(([x, y], n) => (
                    <motion.circle key={n} cx={x} cy={y} r={2.6} className={tone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                  ))}
                {s.label !== '' && (
                  <text x={PLOT.width - PLOT.right} y={PLOT.top + 14 + i * 14} textAnchor="end" fontSize={11} className={tone} style={{ stroke: 'none' }}>
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}
        </Stage>
      </div>
    </SceneFrame>
  );
}
