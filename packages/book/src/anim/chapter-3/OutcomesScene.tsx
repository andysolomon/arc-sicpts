import type { LabClient } from '@sicp/lab';
import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import { useOutcomes } from './concurrencyHooks.ts';
import { describeRun, histogram, labelOf, summarizeRuns, type OutcomeRun } from './outcomes.ts';

/**
 * Many runs of one program, each with its threads interleaved by another seed,
 * and how often each final value came out. Unserialized threads spread over
 * several values; serialized ones collapse onto the results of serial orders.
 * Runs that never finish (a deadlock spins until its steps run out) get a bar
 * of their own.
 */

export interface OutcomesSceneProps {
  source: string;
  title?: string;
  /** How many runs, with seeds 1 to `count`. */
  count?: number;
  /** Steps allowed for each run. */
  budget?: number;
  /** Runs to draw instead of asking the Laboratory (tests). */
  runs?: OutcomeRun[];
  client?: LabClient;
  delayMs?: number;
}

const W = 600;
const H = 240;
const ML = 40;
const MR = 12;
const MT = 18;
const MB = 40;

export function OutcomesScene({ source, title = 'Final values over many interleavings', count = 60, budget, runs: given, client, delayMs }: OutcomesSceneProps) {
  const collected = useOutcomes(given === undefined ? source : '', given === undefined ? count : 0, {
    ...(budget !== undefined && { budget }),
    ...(client !== undefined && { client }),
    ...(delayMs !== undefined && { delayMs }),
  });
  const runs = given ?? collected.runs;
  const stage = useRef<HTMLDivElement>(null);
  const ease = useEase(0.25);
  const player = usePlayer(runs === null ? 0 : runs.length, { stage, resetKey: runs, msPerStep: 160 });
  const all = useMemo(() => (runs === null ? [] : histogram(runs)), [runs]);

  if (runs === null || runs.length === 0) {
    const why = runs === null ? `Running the program with seed ${collected.progress + 1} of ${count}…` : 'No runs yet.';
    return (
      <SceneFrame title={title} provenance="trace" caption={why} empty={`${collected.progress} of ${count} runs done`}>
        <div />
      </SceneFrame>
    );
  }

  const shown = player.index + 1;
  const atEnd = player.atEnd;
  const bars = histogram(runs, shown);
  const latest = runs[player.index];
  const latestLabel = latest === undefined ? null : labelOf(latest);
  const most = Math.max(1, ...all.map((bar) => bar.count));
  // Every label that will appear keeps its place from the first keyframe on.
  const slot = (W - ML - MR) / Math.max(1, all.length);
  const barW = Math.min(56, slot * 0.7);
  const y = (n: number): number => H - MB - ((H - MB - MT) * n) / most;
  const ticks = most <= 5 ? Array.from({ length: most + 1 }, (_, i) => i) : [0, Math.round(most / 2), most];
  const caption = atEnd ? summarizeRuns(runs) : describeRun(runs, player.index);

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={W} height={H} label={`Histogram of the final values of ${runs.length} runs`}>
          <line x1={ML} y1={H - MB} x2={W - MR} y2={H - MB} className="stroke-ink-3" strokeWidth={1} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ML - 3} y1={y(t)} x2={W - MR} y2={y(t)} className="stroke-line" strokeWidth={0.7} />
              <text x={ML - 6} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={9.5} className="fill-ink-3">
                {t}
              </text>
            </g>
          ))}
          <text x={ML - 30} y={MT - 6} fontSize={10} className="fill-ink-3">
            runs
          </text>
          {all.map((bar, i) => {
            const now = bars.find((b) => b.label === bar.label)?.count ?? 0;
            const x = ML + slot * (i + 0.5);
            const hot = !atEnd && bar.label === latestLabel;
            const tone = bar.failure ? 'fill-bad' : hot ? 'fill-accent' : 'fill-num';
            return (
              <g key={bar.label} data-testid="outcome-bar" data-value={bar.label} data-count={now}>
                <motion.rect
                  initial={false}
                  animate={{ y: y(now), height: H - MB - y(now) }}
                  transition={ease}
                  x={x - barW / 2}
                  width={barW}
                  rx={3}
                  className={tone}
                  opacity={now === 0 ? 0 : hot || atEnd ? 1 : 0.75}
                />
                {now > 0 && (
                  <text x={x} y={y(now) - 5} textAnchor="middle" fontSize={10} className="fill-ink-2">
                    {now}
                  </text>
                )}
                <text x={x} y={H - MB + 14} textAnchor="middle" fontSize={bar.label.length > 8 ? 9.5 : 11} className={bar.failure ? 'fill-bad' : 'fill-ink'}>
                  {bar.label}
                </text>
                <text x={x} y={H - MB + 27} textAnchor="middle" fontSize={8.5} className="fill-ink-3">
                  seed {bar.firstSeed}
                </text>
              </g>
            );
          })}
        </Stage>
      </div>
    </SceneFrame>
  );
}
