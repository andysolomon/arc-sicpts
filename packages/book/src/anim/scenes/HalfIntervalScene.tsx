import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { callsOf, finalNumber, findMethodCall, fmt, sampler } from '../model/plot.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { Axes, curvePath, extent, frame, pad } from './plot.tsx';

/**
 * The half-interval method drawn: the interval known to hold a root, halved
 * once per call of `search`, with the sign of f at the midpoint deciding
 * which half to keep. The intervals are the arguments the trace recorded.
 */

export interface HalfIntervalSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

export function HalfIntervalScene({ source, trace, title = 'Halving the interval' }: HalfIntervalSceneProps) {
  const call = useMemo(() => findMethodCall(source, 'half_interval_method'), [source]);
  const f = useMemo(() => (call === null ? null : sampler(source, call.fn)), [call, source]);
  const steps = useMemo(
    () =>
      call === null
        ? []
        : callsOf(trace, 'search', call.statement)
            .map((c) => ({ neg: Number(c.args[1]), pos: Number(c.args[2]) }))
            .filter((s) => Number.isFinite(s.neg) && Number.isFinite(s.pos)),
    [call, trace],
  );
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(steps.length === 0 ? 0 : steps.length + 1, { stage, resetKey: trace, msPerStep: 1200 });
  const ease = useEase();

  if (call === null || f === null || steps.length === 0) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : call === null
          ? 'Call `half_interval_method(f, a, b)` at the top level of the program to draw it.'
          : trace.outcome.status === 'error'
            ? `The method stopped with an error: ${trace.outcome.error.message}.`
            : 'The trace has no calls of `search` to draw.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No interval to halve">
        <div />
      </SceneFrame>
    );
  }

  const first = steps[0] ?? { neg: 0, pos: 1 };
  const whole = pad(extent([first.neg, first.pos, ...call.args.filter((a): a is number => a !== null)]), 0.12);

  const atEnd = player.index >= steps.length;
  const step = steps[Math.min(player.index, steps.length - 1)] ?? first;
  const mid = (step.neg + step.pos) / 2;
  const fm = f(mid);
  const lo = Math.min(step.neg, step.pos);
  const hi = Math.max(step.neg, step.pos);
  // Zoom in as the interval shrinks, so that it always fills a good part of the view.
  const half = Math.min((whole[1] - whole[0]) / 2, Math.max(hi - lo, 1e-12) * 1.25);
  const centre = Math.min(whole[1] - half, Math.max(whole[0] + half, mid));
  const xRange: [number, number] = [centre - half, centre + half];
  const zoom = (whole[1] - whole[0]) / (2 * half);
  const samples = Array.from({ length: 41 }, (_, i) => f(xRange[0] + ((xRange[1] - xRange[0]) * i) / 40)).filter((y): y is number => y !== null);
  const fr = frame(xRange, pad(extent([0, ...samples]), 0.1));
  const curve = curvePath(f, fr);
  const zero = fr.sy(0);
  const answer = finalNumber(trace);
  const caption = atEnd
    ? `${fmt(step.neg)} and ${fmt(step.pos)} are within 0.001 of each other, so \`search\` returns their midpoint${answer === null ? '' : `, ${fmt(answer)}`}. ${steps.length} calls of \`search\` cut the interval in half ${steps.length - 1} times.`
    : fm === null
      ? `Between ${fmt(step.neg)} and ${fmt(step.pos)}.`
      : `\`${call.fn}\` is negative at ${fmt(step.neg)} and positive at ${fmt(step.pos)}, so a root lies between. At the midpoint ${fmt(mid)} it is ${fmt(fm)}: ${fm > 0 ? `positive, so ${fmt(mid)} replaces the positive end` : fm < 0 ? `negative, so ${fmt(mid)} replaces the negative end` : 'zero, which is a root'}.`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={fr.box.width} height={fr.box.height} label={`Half-interval search for a root of ${call.fn}`}>
          <motion.rect initial={false} animate={{ x: fr.sx(lo), width: Math.max(1, fr.sx(hi) - fr.sx(lo)) }} transition={ease} y={fr.box.top} height={fr.box.height - fr.box.top - fr.box.bottom} className="fill-accent-soft" />
          <Axes fr={fr} xLabel="x" yLabel={call.fn} />
          <motion.path initial={false} animate={{ d: curve }} transition={ease} fill="none" className="stroke-ink-2" strokeWidth={1.6} />
          <motion.circle initial={false} animate={{ cx: fr.sx(step.neg) }} transition={ease} cy={zero} r={5} className="fill-paper stroke-bad" strokeWidth={2} />
          <motion.text initial={false} animate={{ x: fr.sx(step.neg) }} transition={ease} y={zero + 18} textAnchor="middle" fontSize={10.5} className="fill-bad">
            −
          </motion.text>
          <motion.circle initial={false} animate={{ cx: fr.sx(step.pos) }} transition={ease} cy={zero} r={5} className="fill-paper stroke-ok" strokeWidth={2} />
          <motion.text initial={false} animate={{ x: fr.sx(step.pos) }} transition={ease} y={zero + 18} textAnchor="middle" fontSize={10.5} className="fill-ok">
            +
          </motion.text>
          {!atEnd && fm !== null && (
            <g>
              <motion.line initial={false} animate={{ x1: fr.sx(mid), x2: fr.sx(mid), y1: zero, y2: fr.sy(fm) }} transition={ease} className="stroke-accent" strokeWidth={1.4} strokeDasharray="3 3" />
              <motion.circle data-testid="midpoint" initial={false} animate={{ cx: fr.sx(mid), cy: fr.sy(fm) }} transition={ease} r={4.5} className="fill-accent" />
            </g>
          )}
          {atEnd && answer !== null && <circle data-testid="root" cx={fr.sx(answer)} cy={zero} r={5} className="fill-accent" />}
        </Stage>
      </div>
      <p className="m-0 font-mono text-[11.5px] text-ink-3 tabular-nums" data-testid="interval">
        call {Math.min(player.index, steps.length - 1) + 1} of {steps.length} · interval width {fmt(hi - lo)}
        {zoom > 1.5 ? ` · view magnified ×${Math.round(zoom)}` : ''}
      </p>
    </SceneFrame>
  );
}
