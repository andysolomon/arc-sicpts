import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { findMethodCall, fmt, guessesOf, sampler } from '../model/plot.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { Axes, curvePath, extent, frame, pad } from './plot.tsx';

/**
 * Newton's method for any function g, as `newtons_method(g, guess)` runs it:
 * at each guess the tangent to g, whose root is the next guess. The guesses
 * are the ones the fixed-point search recorded in the trace.
 */

export interface NewtonsMethodSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

export function NewtonsMethodScene({ source, trace, title = 'Newton’s method for any g' }: NewtonsMethodSceneProps) {
  const call = useMemo(() => findMethodCall(source, 'newtons_method'), [source]);
  const g = useMemo(() => (call === null ? null : sampler(source, call.fn)), [call, source]);
  const guesses = useMemo(() => (call === null ? [] : guessesOf(trace, call.statement).slice(0, 16)), [call, trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(guesses.length, { stage, resetKey: trace, msPerStep: 1400 });
  const ease = useEase();

  if (call === null || g === null || guesses.length === 0) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : call === null
          ? 'Call `newtons_method(g, guess)` at the top level of the program to draw it.'
          : 'The trace has no guesses: keep `fixed_point` and its helper `try_with`.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No guesses yet">
        <div />
      </SceneFrame>
    );
  }

  const xRange = pad(extent([0, ...guesses]), 0.15);
  const probe = frame(xRange, [0, 1]);
  const values = Array.from({ length: 41 }, (_, i) => g(probe.x[0] + ((probe.x[1] - probe.x[0]) * i) / 40)).filter((y): y is number => y !== null);
  const fr = frame(xRange, pad(extent([0, ...values]), 0.08));
  const curve = curvePath(g, fr);

  const k = player.index;
  const x = guesses[k] ?? 0;
  const next = guesses[k + 1];
  const gx = g(x) ?? 0;
  const last = next === undefined;
  // The tangent passes through (x, g(x)) and meets the axis at the next guess.
  const slope = next !== undefined && next !== x ? gx / (x - next) : 0;
  const tangentAt = (t: number): number => gx + slope * (t - x);
  const [t0, t1] = fr.x;
  const caption = last
    ? `Guess ${k + 1}: ${fmt(x)}, where \`${call.fn}\` is ${fmt(gx)}. The next guess would differ by less than the tolerance, so this is the root.`
    : `Guess ${k + 1}: ${fmt(x)}. The tangent to \`${call.fn}\` there has slope ${fmt(slope)}, the value of \`deriv(g)(${fmt(x)})\`, and meets the axis at ${fmt(next)}: x − g(x) / Dg(x), which is \`newton_transform\` applied to the guess.`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={fr.box.width} height={fr.box.height} label={`Newton's method on ${call.fn}`}>
          <Axes fr={fr} xLabel="x" yLabel={`g = ${call.fn}`} />
          <path d={curve} fill="none" className="stroke-ink-2" strokeWidth={1.6} />
          {guesses.slice(0, k).map((past, i) => (
            <circle key={`past-${i}`} cx={fr.sx(past)} cy={fr.sy(0)} r={3} className="fill-accent" opacity={0.35} />
          ))}
          <motion.line initial={false} animate={{ x1: fr.sx(x), y1: fr.sy(0), x2: fr.sx(x), y2: fr.sy(gx) }} transition={ease} className="stroke-accent" strokeWidth={1.4} strokeDasharray="2 3" />
          <AnimatePresence>
            {!last && (
              <motion.line
                key="tangent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x1: fr.sx(t0), y1: fr.sy(tangentAt(t0)), x2: fr.sx(t1), y2: fr.sy(tangentAt(t1)) }}
                exit={{ opacity: 0 }}
                transition={ease}
                className="stroke-num"
                strokeWidth={1.8}
              />
            )}
          </AnimatePresence>
          <motion.circle initial={false} animate={{ cx: fr.sx(x), cy: fr.sy(gx) }} transition={ease} r={4.5} className="fill-paper stroke-accent" strokeWidth={2} />
          <motion.circle data-testid="guess" initial={false} animate={{ cx: fr.sx(x), cy: fr.sy(0) }} transition={ease} r={4.5} className="fill-accent" />
          {next !== undefined && (
            <motion.g initial={false} animate={{ x: fr.sx(next), y: fr.sy(0) }} transition={ease}>
              <circle r={4} className="fill-paper stroke-num" strokeWidth={2} />
              <text y={18} textAnchor="middle" fontSize={10.5} className="fill-num">
                next: {fmt(next)}
              </text>
            </motion.g>
          )}
        </Stage>
      </div>
      <ol className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-mono text-[11.5px] text-ink-3" aria-label="Guesses">
        {guesses.map((guess, i) => (
          <li key={i} className={i === k ? 'text-accent-ink' : i < k ? 'text-ink-2' : ''}>
            {i + 1}: {fmt(guess)}
          </li>
        ))}
      </ol>
    </SceneFrame>
  );
}
