import { motion } from 'motion/react';
import { useId, useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { FONT, inlineCode, Stage, useEase } from '../svg.tsx';
import { useTrace, type Trace } from '../useTrace.ts';
import { angleOf, candidates, complexText, describe, magnitudeOf, probeSource, readProbe, short, type ComplexPoint } from '../model/complexPlane.ts';

/**
 * Figure 2.20 drawn from the program (§2.4): every complex number the program
 * names, as an arrow in the plane with its real and imaginary parts, its
 * magnitude and its angle. Sums close a parallelogram; products show their
 * angles adding. The numbers are read through the program's own selectors,
 * so changing the representation changes the captions' stored values and
 * nothing in the picture.
 */

export interface ComplexPlaneSceneProps {
  source: string;
  prelude?: string | undefined;
  title?: string;
}

const MARGIN = 26;
const MAX_WIDTH = 460;
const MAX_HEIGHT = 330;

interface View {
  sx(x: number): number;
  sy(y: number): number;
  width: number;
  height: number;
  x: [number, number];
  y: [number, number];
  step: number;
}

/** A view that holds the origin and every point, with one scale on both axes so that angles look like angles. */
function viewOf(points: readonly ComplexPoint[]): View {
  const xs = [0, ...points.map((p) => p.re)];
  const ys = [0, ...points.map((p) => p.im)];
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  const pad = Math.max(span * 0.14, 0.5);
  const x: [number, number] = [Math.min(...xs) - pad, Math.max(...xs) + pad];
  const y: [number, number] = [Math.min(...ys) - pad, Math.max(...ys) + pad];
  const scale = Math.min(MAX_WIDTH / (x[1] - x[0]), MAX_HEIGHT / (y[1] - y[0]));
  const raw = span / 6;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return {
    sx: (v) => MARGIN + (v - x[0]) * scale,
    sy: (v) => MARGIN + (y[1] - v) * scale,
    width: (x[1] - x[0]) * scale + MARGIN * 2,
    height: (y[1] - y[0]) * scale + MARGIN * 2,
    x,
    y,
    step,
  };
}

/** The ticks of one axis, without 0. */
const ticks = ([lo, hi]: [number, number], step: number): number[] => {
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) if (Math.abs(t) > step / 2) out.push(Number(t.toPrecision(6)));
  return out;
};

/** An arc about the origin from angle `from` to angle `to`, in screen space where y points down. */
function arcPath(cx: number, cy: number, radius: number, from: number, to: number): string {
  const [x1, y1] = [cx + radius * Math.cos(from), cy - radius * Math.sin(from)];
  const [x2, y2] = [cx + radius * Math.cos(to), cy - radius * Math.sin(to)];
  const large = Math.abs(to - from) > Math.PI ? 1 : 0;
  const sweep = to > from ? 0 : 1;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${large} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function ComplexPlaneScene({ source, prelude, title }: ComplexPlaneSceneProps) {
  const found = useMemo(() => candidates(source), [source]);
  const probe = useMemo(() => probeSource(source, (found ?? []).map((c) => c.name)), [found, source]);
  const { trace } = useTrace(probe, { prelude, budget: 200_000, maxRecords: 1 });
  return <ComplexPlane source={source} trace={trace} {...(title !== undefined && { title })} />;
}

export interface ComplexPlaneProps {
  source: string;
  /** The trace of `probeSource(source, …)`, whose output carries the numbers. */
  trace: Trace | null;
  title?: string;
}

/** The plane itself, given the trace of the probed program. */
export function ComplexPlane({ source, trace, title = 'The complex plane' }: ComplexPlaneProps) {
  const found = useMemo(() => candidates(source), [source]);
  const points = useMemo(() => (trace === null || found === null ? [] : readProbe(trace.output, found)), [found, trace]);
  const view = useMemo(() => viewOf(points), [points]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(points.length, { stage, resetKey: trace, msPerStep: 2600 });
  const ease = useEase(0.5);
  const marker = useId().replace(/:/g, '');

  const current = points[player.index];
  if (current === undefined) {
    const why =
      found === null
        ? 'The program does not parse yet.'
        : trace === null
          ? 'Running the program…'
          : trace.outcome.status === 'error'
            ? `The program stopped with an error: ${trace.outcome.error.message}`
            : 'Nothing to draw: declare a complex number at the top level, for example `const z = make_from_real_imag(3, 4);`, with `real_part` and `imag_part` to read it.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No complex numbers yet">
        <div />
      </SceneFrame>
    );
  }

  const { sx, sy } = view;
  const [ox, oy] = [sx(0), sy(0)];
  const shown = points.slice(0, player.index + 1);
  const operands = new Set(current.via === null ? [] : [current.via.left, current.via.right]);
  const byName = (name: string | undefined) => points.find((p) => p.name === name);
  const left = byName(current.via?.left);
  const right = byName(current.via?.right);
  const tone = (p: ComplexPoint): 'current' | 'operand' | 'past' =>
    p === current ? 'current' : operands.has(p.name) ? 'operand' : 'past';
  const lineClass = { current: 'stroke-accent', operand: 'stroke-ink-2', past: 'stroke-ink-3' };
  const textClass = { current: 'fill-accent-ink', operand: 'fill-ink-2', past: 'fill-ink-3' };

  // Arcs: the current number's angle, or for a product its operands' angles laid end to end.
  const r = magnitudeOf(current);
  const radius = Math.max(16, Math.min(46, r * (sx(1) - sx(0)) * 0.35));
  const a = angleOf(current);
  const product = current.via?.op === 'mul' && left !== undefined && right !== undefined;
  const a1 = left === undefined ? 0 : angleOf(left);
  const a2 = right === undefined ? 0 : angleOf(right);
  const labelAt = (angle: number, distance: number): [number, number] => [ox + distance * Math.cos(angle), oy - distance * Math.sin(angle)];

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(describe(current, points))}>
      <div ref={stage} className="flex flex-col gap-2">
        <Stage width={view.width} height={view.height} label={`The complex plane with ${shown.length} of ${points.length} numbers drawn`} maxHeight={400}>
          <defs>
            {(['current', 'operand', 'past'] as const).map((t) => (
              <marker key={t} id={`${marker}-${t}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 8 4 L 0 8 z" className={lineClass[t].replace('stroke-', 'fill-')} />
              </marker>
            ))}
          </defs>
          {/* Axes and ticks */}
          <line x1={sx(view.x[0])} y1={oy} x2={sx(view.x[1])} y2={oy} className="stroke-line" strokeWidth={1.2} />
          <line x1={ox} y1={sy(view.y[0])} x2={ox} y2={sy(view.y[1])} className="stroke-line" strokeWidth={1.2} />
          {ticks(view.x, view.step).map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} y1={oy - 3} x2={sx(t)} y2={oy + 3} className="stroke-ink-3" strokeWidth={1} />
              <text x={sx(t)} y={oy + 14} textAnchor="middle" fontSize={9.5} className="fill-ink-3">
                {t}
              </text>
            </g>
          ))}
          {ticks(view.y, view.step).map((t) => (
            <g key={`y${t}`}>
              <line x1={ox - 3} y1={sy(t)} x2={ox + 3} y2={sy(t)} className="stroke-ink-3" strokeWidth={1} />
              <text x={ox - 6} y={sy(t)} textAnchor="end" dominantBaseline="central" fontSize={9.5} className="fill-ink-3">
                {t}
              </text>
            </g>
          ))}
          <text x={sx(view.x[1])} y={oy - 6} textAnchor="end" fontSize={10.5} className="fill-ink-3">
            real
          </text>
          <text x={ox + 6} y={sy(view.y[1]) + 10} fontSize={10.5} className="fill-ink-3">
            imaginary
          </text>

          {/* What the current number is made of */}
          {current.via?.op === 'add' && left !== undefined && right !== undefined && (
            <g className="stroke-ink-3" strokeWidth={1.1} strokeDasharray="4 3">
              <motion.line key={`pl-${current.name}`} x1={sx(left.re)} y1={sy(left.im)} x2={sx(current.re)} y2={sy(current.im)} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={ease} />
              <motion.line key={`pr-${current.name}`} x1={sx(right.re)} y1={sy(right.im)} x2={sx(current.re)} y2={sy(current.im)} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={ease} />
            </g>
          )}
          {current.via === null && (
            <g data-testid="parts" className="stroke-accent" strokeWidth={1} strokeDasharray="3 3" opacity={0.7}>
              <line x1={sx(current.re)} y1={sy(current.im)} x2={sx(current.re)} y2={oy} />
              <line x1={sx(current.re)} y1={sy(current.im)} x2={ox} y2={sy(current.im)} />
            </g>
          )}
          {product ? (
            <g fill="none" strokeWidth={2}>
              <motion.path key={`a1-${current.name}`} d={arcPath(ox, oy, radius, 0, a1)} className="stroke-num" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={ease} />
              <motion.path key={`a2-${current.name}`} d={arcPath(ox, oy, radius, a1, a1 + a2)} className="stroke-ok" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...ease, delay: 0.3 }} />
            </g>
          ) : (
            <motion.path key={`a-${current.name}`} d={arcPath(ox, oy, radius, 0, a)} fill="none" className="stroke-num" strokeWidth={1.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={ease} />
          )}
          {product ? (
            <>
              <text x={labelAt(a1 / 2, radius + 11)[0]} y={labelAt(a1 / 2, radius + 11)[1]} textAnchor="middle" dominantBaseline="central" fontSize={10} className="fill-num">
                {short(a1)}
              </text>
              <text x={labelAt(a1 + a2 / 2, radius + 11)[0]} y={labelAt(a1 + a2 / 2, radius + 11)[1]} textAnchor="middle" dominantBaseline="central" fontSize={10} className="fill-ok">
                {short(a2)}
              </text>
            </>
          ) : (
            Math.abs(a) > 0.05 && (
              <text x={labelAt(a / 2, radius + 11)[0]} y={labelAt(a / 2, radius + 11)[1]} textAnchor="middle" dominantBaseline="central" fontSize={10} className="fill-num">
                {short(a)}
              </text>
            )
          )}

          {/* The arrows, the current one last so that it is on top */}
          {[...shown.filter((p) => p !== current), current].map((p) => {
            const t = tone(p);
            const [x, y] = [sx(p.re), sy(p.im)];
            const away = Math.atan2(-(y - oy), x - ox);
            const [lx, ly] = [x + 12 * Math.cos(away), y - 12 * Math.sin(away)];
            return (
              <g key={p.name} data-testid="complex-number" data-tone={t}>
                <motion.line
                  initial={{ x2: ox, y2: oy }}
                  animate={{ x2: x, y2: y }}
                  transition={ease}
                  x1={ox}
                  y1={oy}
                  className={lineClass[t]}
                  strokeWidth={t === 'current' ? 2.2 : 1.4}
                  markerEnd={`url(#${marker}-${t})`}
                />
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ ...ease, delay: 0.25 }}
                  x={lx}
                  y={ly}
                  textAnchor={Math.cos(away) < -0.3 ? 'end' : Math.cos(away) > 0.3 ? 'start' : 'middle'}
                  dominantBaseline="central"
                  fontSize={FONT}
                  className={textClass[t]}
                >
                  {t === 'current' ? `${p.name} = ${complexText(p.re, p.im)}` : p.name}
                </motion.text>
              </g>
            );
          })}
        </Stage>
        {points.length > 1 && (
          <ol className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-mono text-[11.5px] text-ink-3" aria-label="Complex numbers">
            {points.map((p, i) => (
              <li key={p.name} className={i === player.index ? 'text-accent-ink' : i < player.index ? 'text-ink-2' : ''}>
                {p.name}
              </li>
            ))}
          </ol>
        )}
      </div>
    </SceneFrame>
  );
}
