import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { finalNumber, findMethodCall, fmt, guessesOf, sampler } from '../model/plot.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { Axes, curvePath, extent, frame, pad, PLOT } from './plot.tsx';

/**
 * A fixed-point search as a cobweb: from a guess on the line y = x, up or
 * down to the curve y = f(x) to apply f, then across to the line again to
 * make the result the next guess. The guesses are the ones the trace recorded.
 */

export interface CobwebSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

/** Steps drawn at most; a search that does not settle is cut short here. */
const MAX_STEPS = 24;

export function CobwebScene({ source, trace, title = 'Searching for a fixed point' }: CobwebSceneProps) {
  const call = useMemo(() => findMethodCall(source, 'fixed_point'), [source]);
  const f = useMemo(() => (call === null ? null : sampler(source, call.fn)), [call, source]);
  const all = useMemo(() => (call === null ? [] : guessesOf(trace, call.statement)), [call, trace]);
  const guesses = all.slice(0, MAX_STEPS + 1);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(guesses.length === 0 ? 0 : guesses.length, { stage, resetKey: trace, msPerStep: 900 });
  const ease = useEase(0.35);

  if (call === null || f === null || guesses.length === 0) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : call === null
          ? 'Call `fixed_point(f, first_guess)` at the top level of the program to draw it.'
          : 'The trace has no guesses: keep the helper `try_with`, whose argument is the guess.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No guesses yet">
        <div />
      </SceneFrame>
    );
  }

  // Square axes, so that y = x runs at 45 degrees and a cobweb looks like one.
  const images = guesses.map((g) => f(g)).filter((y): y is number => y !== null);
  const range = pad(extent([...guesses, ...images]), 0.25);
  const side = PLOT.height - PLOT.top - PLOT.bottom;
  const fr = frame(range, range, { ...PLOT, width: PLOT.left + side + PLOT.right });
  const curve = curvePath(f, fr);

  const k = player.index;
  const settled = trace?.outcome.status === 'done';
  const atEnd = k >= guesses.length - 1;
  const g = guesses[k] ?? 0;
  const next = guesses[k + 1];
  const path = guesses.slice(0, k + 1).reduce((d, guess, i) => {
    const after = guesses[i + 1];
    if (i >= k || after === undefined) return d;
    return `${d} L ${fr.sx(guess).toFixed(1)} ${fr.sy(after).toFixed(1)} L ${fr.sx(after).toFixed(1)} ${fr.sy(after).toFixed(1)}`;
  }, `M ${fr.sx(guesses[0] ?? 0).toFixed(1)} ${fr.sy(guesses[0] ?? 0).toFixed(1)}`);
  const answer = finalNumber(trace);
  const caption = atEnd
    ? settled
      ? `Successive guesses differ by less than the tolerance, so the search stops at ${fmt(answer ?? g)}: the x where the curve crosses the line y = x, the point that \`${call.fn}\` leaves where it is.`
      : `The guesses never settle${all.length > guesses.length ? `, and the trace stopped after ${all.length} of them` : ''}: the path goes round the same loop for ever and the program runs out of steps.`
    : next === undefined
      ? `Guess ${k + 1}: ${fmt(g)}.`
      : `Guess ${k + 1}: ${fmt(g)}. Up to the curve: \`${call.fn}\` gives ${fmt(next)}. Across to the line y = x, and ${fmt(next)} is the next guess.`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={fr.box.width} height={fr.box.height} label={`Cobweb diagram for the fixed point of ${call.fn}`} maxHeight={380}>
          <Axes fr={fr} xLabel="x" yLabel={/^[\w$]+$/.test(call.fn) ? `y = ${call.fn}(x)` : `f = ${call.fn}`} />
          <line x1={fr.sx(range[0])} y1={fr.sy(range[0])} x2={fr.sx(range[1])} y2={fr.sy(range[1])} className="stroke-ok" strokeWidth={1} strokeDasharray="4 4" />
          <text x={fr.sx(range[1]) - 6} y={fr.sy(range[1]) + 26} textAnchor="end" fontSize={10.5} className="fill-ok">
            y = x
          </text>
          <path d={curve} fill="none" className="stroke-ink-2" strokeWidth={1.6} />
          <motion.path initial={false} animate={{ d: path }} transition={ease} fill="none" className="stroke-accent" strokeWidth={1.4} />
          {next !== undefined && !atEnd && (
            <motion.circle initial={false} animate={{ cx: fr.sx(g), cy: fr.sy(next) }} transition={ease} r={3.5} className="fill-paper stroke-accent" strokeWidth={1.6} />
          )}
          <motion.circle data-testid="guess" initial={false} animate={{ cx: fr.sx(g), cy: fr.sy(g) }} transition={ease} r={4.5} className="fill-accent" />
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
