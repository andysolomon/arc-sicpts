import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { callTree, type CallNode } from '../model/calls.ts';
import type { TreeInput } from '../model/layout.ts';
import { finalNumber, findMethodCall, fmt, sampler } from '../model/plot.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { Axes, curvePath, extent, frame, pad } from './plot.tsx';

/**
 * The midpoint rule drawn: one rectangle for every value of the integrand the
 * program computed, at the point the trace says it was computed, as wide as
 * `dx`. The running sum of their areas is the integral.
 */

export interface IntegralSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

interface Sample {
  x: number;
  y: number;
}

/** Where the integrand was evaluated, according to the trace. */
function samplesOf(source: string, trace: Trace | null, fn: string): Sample[] {
  const out: Sample[] = [];
  const visit = (node: TreeInput<CallNode>): void => {
    const { data } = node;
    if (data.name === fn && data.value !== null && data.args.length === 1) {
      const x = Number(data.args[0]);
      const y = Number(data.value);
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
    }
    node.children.forEach(visit);
  };
  visit(callTree(source, trace).root);
  return out;
}

const MAX_KEYFRAMES = 30;

export function IntegralScene({ source, trace, title = 'The integral as a sum of rectangles' }: IntegralSceneProps) {
  const call = useMemo(() => findMethodCall(source, 'integral'), [source]);
  const f = useMemo(() => (call === null ? null : sampler(source, call.fn)), [call, source]);
  const samples = useMemo(() => (call === null ? [] : samplesOf(source, trace, call.fn)), [call, source, trace]);
  const stage = useRef<HTMLDivElement>(null);
  // Many rectangles are added a few at a time.
  const per = Math.max(1, Math.ceil(samples.length / MAX_KEYFRAMES));
  const count = samples.length === 0 ? 0 : Math.ceil(samples.length / per) + 1;
  const player = usePlayer(count, { stage, resetKey: trace, msPerStep: 650 });
  const ease = useEase(0.3);

  if (call === null || f === null || samples.length === 0) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : call === null
          ? 'Call `integral(f, a, b, dx)` at the top level of the program to draw it.'
          : `The trace has no calls of \`${call.fn}\`. Name the integrand with a function declaration, and keep \`dx\` large enough for the trace to hold every call.`;
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="Nothing to integrate yet">
        <div />
      </SceneFrame>
    );
  }

  const [a, b, given] = call.args;
  const xs = samples.map((s) => s.x);
  const spacing = samples.length > 1 ? Math.abs((samples[1]?.x ?? 0) - (samples[0]?.x ?? 0)) : 0;
  const dx = given ?? (spacing || 1);
  const xRange = pad([Math.min(a ?? Infinity, ...xs.map((x) => x - dx / 2)), Math.max(b ?? -Infinity, ...xs.map((x) => x + dx / 2))], 0.04);
  const ys = [0, ...samples.map((s) => s.y)];
  const fr = frame(xRange, pad(extent(ys), 0.1));
  const curve = curvePath(f, fr);

  const shown = Math.min(samples.length, player.index * per);
  const atEnd = player.index >= count - 1;
  const partial = samples.slice(0, shown).reduce((sum, s) => sum + s.y, 0);
  const newest = samples.slice(Math.max(0, shown - per), shown);
  const value = finalNumber(trace);
  const caption =
    shown === 0
      ? `\`integral\` evaluates \`${call.fn}\` at the middle of each strip of width ${fmt(dx)} and adds up the values. Times \`dx\`, each value is the area of a rectangle.`
      : atEnd && trace?.truncated === true
        ? `The trace filled up after ${samples.length} values of \`${call.fn}\`, so only those rectangles are drawn${value === null ? '' : `. The program went on to finish the sum and returned ${fmt(value)}`}.`
        : atEnd
        ? `${samples.length} rectangles. Their heights add up to ${fmt(partial)}, and ${fmt(partial)} × ${fmt(dx)} = ${fmt(partial * dx)}${value === null ? '' : `, the value the program returned`}. A smaller \`dx\` makes more, thinner rectangles and a closer answer.`
        : newest.length === 1 && newest[0] !== undefined
          ? `\`${call.fn}(${fmt(newest[0].x)})\` = ${fmt(newest[0].y)}. Running sum of heights: ${fmt(partial)}; times dx: ${fmt(partial * dx)}.`
          : `${shown} of ${samples.length} values of \`${call.fn}\` computed. Running sum of heights: ${fmt(partial)}; times dx: ${fmt(partial * dx)}.`;

  const zero = fr.sy(0);
  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={fr.box.width} height={fr.box.height} label={`Midpoint rule for ${call.fn} with ${samples.length} rectangles`}>
          <Axes fr={fr} xLabel="x" yLabel={call.fn} />
          {samples.slice(0, shown).map((s, i) => {
            const recent = i >= shown - newest.length && !atEnd;
            const top = fr.sy(s.y);
            return (
              <motion.rect
                key={i}
                data-testid="strip"
                initial={{ opacity: 0, y: zero, height: 0 }}
                animate={{ opacity: 1, y: Math.min(top, zero), height: Math.abs(zero - top) }}
                transition={ease}
                x={fr.sx(s.x - dx / 2)}
                width={Math.max(0.5, fr.sx(s.x + dx / 2) - fr.sx(s.x - dx / 2) - 0.6)}
                className={recent ? 'fill-accent-soft stroke-accent' : 'fill-paper-3 stroke-line'}
                strokeWidth={recent ? 1.4 : 0.8}
              />
            );
          })}
          <path d={curve} fill="none" className="stroke-ink-2" strokeWidth={1.6} />
          {newest.map((s, i) =>
            atEnd ? null : <circle key={`dot-${i}`} cx={fr.sx(s.x)} cy={fr.sy(s.y)} r={3.5} className="fill-accent" />,
          )}
        </Stage>
      </div>
    </SceneFrame>
  );
}
