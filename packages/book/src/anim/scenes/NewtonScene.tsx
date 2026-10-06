import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { improve, newtonModel } from '../model/newton.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Newton's method drawn: the curve f(y) = y² − x, and at each guess the
 * tangent line, which meets the axis exactly where `improve` puts the next
 * guess. The guesses are the ones the program printed.
 */

export interface NewtonSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

const W = 560;
const H = 300;
const ML = 44;
const MR = 20;
const MT = 18;
const MB = 34;

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toPrecision(6).replace(/\.?0+$/, ''));

export function NewtonScene({ source, trace, title = 'Newton’s method, drawn' }: NewtonSceneProps) {
  const model = useMemo(() => newtonModel(source, trace), [source, trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(model.guesses.length, { stage, resetKey: trace, msPerStep: 1400 });
  const ease = useEase();

  const { x, guesses } = model;
  if (x === null || guesses.length === 0) {
    return (
      <SceneFrame title={title} provenance="trace" caption={trace === null ? 'Tracing the program…' : 'Keep the `display(guess)` call: the guesses it prints are the picture.'} empty="No guesses were printed">
        <div />
      </SceneFrame>
    );
  }

  const root = Math.sqrt(x);
  const yMax = Math.max(...guesses, root) * 1.18;
  const f = (y: number): number => y * y - x;
  const fMin = -x;
  const fMax = f(yMax);
  const sx = (y: number): number => ML + (y / yMax) * (W - ML - MR);
  const sy = (v: number): number => MT + ((fMax - v) / (fMax - fMin)) * (H - MT - MB);
  const axisY = sy(0);

  const curve = Array.from({ length: 81 }, (_, i) => {
    const y = (yMax * i) / 80;
    return `${i === 0 ? 'M' : 'L'} ${sx(y).toFixed(1)} ${sy(f(y)).toFixed(1)}`;
  }).join(' ');

  const k = player.index;
  const g = guesses[k] ?? guesses[guesses.length - 1] ?? 1;
  const next = improve(g, x);
  const error = Math.abs(g * g - x);
  const last = k >= guesses.length - 1;
  // The tangent at (g, f(g)) has slope 2g and crosses the axis at `next`.
  const tangentFrom = Math.max(0, g - (g - next) * 1.6);
  const tangentTo = Math.min(yMax, g + (g - next) * 0.9);
  const tangentY = (y: number): number => f(g) + 2 * g * (y - g);

  const caption = last
    ? `Guess ${k + 1}: ${fmt(g)}. Its square misses ${fmt(x)} by ${fmt(error)}${error < 0.001 ? ', under the 0.001 tolerance, so the program stops' : ''}.${model.inferred ? ' (x inferred from the final guess.)' : ''}`
    : `Guess ${k + 1}: ${fmt(g)}. The tangent to y² − ${fmt(x)} at this guess meets the axis at (${fmt(g)} + ${fmt(x)}/${fmt(g)}) / 2 = ${fmt(next)}, the next guess. That average is exactly what \`improve\` computes.`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={W} height={H} label={`Newton's method converging on the square root of ${fmt(x)}`}>
          <line x1={ML} y1={axisY} x2={W - MR} y2={axisY} className="stroke-ink-3" strokeWidth={1} />
          <line x1={ML} y1={MT} x2={ML} y2={H - MB} className="stroke-ink-3" strokeWidth={1} />
          <text x={W - MR} y={axisY + 14} textAnchor="end" fontSize={10.5} className="fill-ink-3">
            guess y
          </text>
          <text x={ML + 6} y={MT + 8} fontSize={10.5} className="fill-ink-3">
            y² − {fmt(x)}
          </text>
          <path d={curve} fill="none" className="stroke-ink-2" strokeWidth={1.6} />
          <line x1={sx(root)} y1={MT} x2={sx(root)} y2={H - MB} className="stroke-ok" strokeWidth={1} strokeDasharray="3 4" />
          <text x={sx(root)} y={H - MB + 14} textAnchor="middle" fontSize={10.5} className="fill-ok">
            √{fmt(x)} ≈ {fmt(root)}
          </text>
          {guesses.slice(0, k).map((past, i) => (
            <g key={`past-${i}`} opacity={0.35}>
              <line x1={sx(past)} y1={axisY} x2={sx(past)} y2={sy(f(past))} className="stroke-accent" strokeWidth={1} strokeDasharray="2 3" />
              <circle cx={sx(past)} cy={axisY} r={3} className="fill-accent" />
            </g>
          ))}
          <motion.line initial={false} animate={{ x1: sx(g), y1: axisY, x2: sx(g), y2: sy(f(g)) }} transition={ease} className="stroke-accent" strokeWidth={1.4} strokeDasharray="2 3" />
          <AnimatePresence>
            {!last && (
              <motion.line
                key="tangent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x1: sx(tangentFrom), y1: sy(tangentY(tangentFrom)), x2: sx(tangentTo), y2: sy(tangentY(tangentTo)) }}
                exit={{ opacity: 0 }}
                transition={ease}
                className="stroke-num"
                strokeWidth={1.8}
              />
            )}
          </AnimatePresence>
          <motion.circle initial={false} animate={{ cx: sx(g), cy: sy(f(g)) }} transition={ease} r={4.5} className="fill-paper stroke-accent" strokeWidth={2} />
          <motion.circle data-testid="guess" initial={false} animate={{ cx: sx(g), cy: axisY }} transition={ease} r={4.5} className="fill-accent" />
          <motion.text initial={false} animate={{ x: sx(g), y: axisY - 10 }} transition={ease} textAnchor="middle" fontSize={11} className="fill-accent-ink font-semibold">
            {fmt(g)}
          </motion.text>
          {!last && (
            <motion.g initial={false} animate={{ x: sx(next), y: axisY }} transition={ease}>
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
