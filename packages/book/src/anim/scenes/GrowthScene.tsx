import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { factor, growth, scale, type GrowthPoint, type GrowthSeries, type Scale } from '../model/growth.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import { useShape } from '../useShape.ts';

/**
 * Orders of growth, measured: each top-level call is a point, with its size
 * across and its cost up, once for time (calls made) and once for space (the
 * deepest stack of pending calls). The points appear in program order.
 */

export interface GrowthSceneProps {
  source: string;
  title?: string;
}

const W = 600;
const H = 250;
const GUTTER = 36;
const ML = 46;
const MR = 14;
const MT = 26;
const MB = 34;
const PANEL = (W - GUTTER - ML * 2 - MR * 2) / 2;
const SERIES = [
  { stroke: 'stroke-accent', fill: 'fill-accent', text: 'fill-accent-ink' },
  { stroke: 'stroke-num', fill: 'fill-num', text: 'fill-num' },
  { stroke: 'stroke-str', fill: 'fill-str', text: 'fill-str' },
  { stroke: 'stroke-bad', fill: 'fill-bad', text: 'fill-bad' },
] as const;

const short = (n: number): string =>
  n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : Number.isInteger(n) ? String(n) : n.toPrecision(3);
const times = (x: number): string => `×${x >= 10 ? Math.round(x) : x.toFixed(x < 2 ? 2 : 1).replace(/\.?0+$/, '')}`;

function compare(point: GrowthPoint, previous: GrowthPoint | undefined): string {
  const own = `\`${point.label}\` made ${point.calls} call${point.calls === 1 ? '' : 's'} and was ${point.depth} deep.`;
  if (previous === undefined) return own;
  const calls = point.calls - previous.calls;
  return `${own} Against \`${previous.label}\`: n ${times(point.n / previous.n)}, calls ${times(point.calls / previous.calls)} (${calls >= 0 ? '+' : ''}${calls}), depth ${times(point.depth / previous.depth)}.`;
}

function summary(series: readonly GrowthSeries[]): string {
  const parts = series.flatMap((s) => {
    const calls = factor(s, 'calls');
    const depth = factor(s, 'depth');
    const only = s.points[0];
    if (calls === null || depth === null) {
      return only === undefined ? [] : [`\`${only.label}\`: ${only.calls} calls, ${only.depth} deep`];
    }
    return [`\`${s.name}\`: n ${times(calls.to.n / calls.from.n)} → calls ${times(calls.times)}, depth ${times(depth.times)}`];
  });
  const single = series.every((s) => s.points.length === 1);
  return `${parts.join('; ')}.${single ? ' Measure a function at several sizes to see how its cost grows.' : ''}`;
}

interface PanelProps {
  x0: number;
  title: string;
  measure: 'calls' | 'depth';
  series: readonly GrowthSeries[];
  sx: Scale;
  shown: number;
  current: number;
}

function Panel({ x0, title, measure, series, sx, shown, current }: PanelProps) {
  const ease = useEase();
  const values = series.flatMap((s) => s.points.map((p) => p[measure]));
  const sy = scale(values, [MT + (H - MT - MB), MT]);
  const x = (n: number): number => x0 + sx(n);
  // Each series is named beside its newest point: above it, or below when that
  // would run into the title, and moved down while it overlaps another name.
  const labels = new Map<string, { x: number; y: number }>();
  for (const s of series) {
    const last = s.points.filter((p) => p.order <= shown).at(-1);
    if (last === undefined) continue;
    const at = { x: x(last.n) - 6, y: sy(last[measure]) - 8 };
    if (at.y < MT + 4) at.y += 24;
    while ([...labels.values()].some((o) => Math.abs(o.x - at.x) < 110 && Math.abs(o.y - at.y) < 13)) at.y += 14;
    labels.set(s.name, at);
  }
  return (
    <g>
      <text x={x0} y={MT - 12} fontSize={11} className="fill-ink-2 font-semibold">
        {title}
        {sy.log ? ' · log scale' : ''}
      </text>
      <line x1={x0} y1={H - MB} x2={x0 + PANEL} y2={H - MB} className="stroke-ink-3" strokeWidth={1} />
      <line x1={x0} y1={MT} x2={x0} y2={H - MB} className="stroke-ink-3" strokeWidth={1} />
      {sy.ticks.map((t) => (
        <g key={`y${t}`}>
          <line x1={x0 - 3} y1={sy(t)} x2={x0 + PANEL} y2={sy(t)} className="stroke-line" strokeWidth={0.8} />
          <text x={x0 - 6} y={sy(t)} textAnchor="end" dominantBaseline="central" fontSize={9.5} className="fill-ink-3">
            {short(t)}
          </text>
        </g>
      ))}
      {sx.ticks.map((t) => (
        <text key={`x${t}`} x={x(t)} y={H - MB + 13} textAnchor="middle" fontSize={9.5} className="fill-ink-3">
          {short(t)}
        </text>
      ))}
      <text x={x0 + PANEL} y={H - MB + 27} textAnchor="end" fontSize={10} className="fill-ink-3">
        n{sx.log ? ' · log scale' : ''}
      </text>
      {series.map((s, i) => {
        const style = SERIES[i % SERIES.length] ?? SERIES[0];
        const visible = s.points.filter((p) => p.order <= shown);
        const path = visible.map((p, j) => `${j === 0 ? 'M' : 'L'} ${x(p.n).toFixed(1)} ${sy(p[measure]).toFixed(1)}`).join(' ');
        const last = visible[visible.length - 1];
        const label = labels.get(s.name);
        return (
          <g key={s.name}>
            {visible.length > 1 && <motion.path initial={false} animate={{ d: path }} transition={ease} fill="none" className={style.stroke} strokeWidth={1.8} />}
            {visible.map((p) => (
              <motion.circle
                key={p.label}
                data-testid={measure === 'calls' ? 'growth-point' : undefined}
                initial={{ r: 0 }}
                animate={{ r: p.order === current ? 5 : 3.5 }}
                transition={ease}
                cx={x(p.n)}
                cy={sy(p[measure])}
                className={`${style.fill} ${p.order === current ? 'stroke-paper' : ''}`}
                strokeWidth={1.5}
              />
            ))}
            {last !== undefined && label !== undefined && (
              <text x={label.x} y={label.y} textAnchor="end" fontSize={10.5} className={`${style.text} font-semibold`}>
                {s.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function GrowthScene({ source, title = 'Orders of growth, measured' }: GrowthSceneProps) {
  const { shape } = useShape(source);
  const model = useMemo(() => growth(shape?.snapshot ?? null), [shape]);
  const stage = useRef<HTMLDivElement>(null);
  const count = model.points.length === 0 ? 0 : model.points.length + 1;
  const player = usePlayer(count, { stage, resetKey: shape, msPerStep: 1300 });

  if (model.points.length === 0) {
    const why =
      shape === null
        ? 'Measuring the program…'
        : shape.status === 'budget-exhausted'
          ? 'The program ran out of steps before any measurement finished. Try smaller sizes.'
          : 'Write top-level calls such as `fib(10);`, one per size, to measure them.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="Nothing measured yet">
        <div />
      </SceneFrame>
    );
  }

  const atSummary = player.index >= model.points.length;
  const shown = Math.min(player.index, model.points.length - 1);
  const point = model.points[shown];
  const previous = point === undefined ? undefined : model.series.find((s) => s.points.includes(point))?.points.filter((p) => p.order < point.order && p.n < point.n).at(-1);
  const caption = atSummary ? summary(model.series) : point === undefined ? '' : compare(point, previous);
  const sx = scale(model.points.map((p) => p.n), [0, PANEL], { logRatio: 20 });
  const cut = shape?.status === 'budget-exhausted' ? ' The step budget ran out before the last call finished.' : '';

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption + (atSummary ? cut : ''))}>
      <div ref={stage}>
        <Stage width={W} height={H} label={`Calls and stack depth against n for ${model.series.map((s) => s.name).join(' and ')}`}>
          <Panel x0={ML} title="calls made (time)" measure="calls" series={model.series} sx={sx} shown={shown} current={atSummary ? -1 : shown} />
          <Panel x0={ML * 2 + MR + PANEL + GUTTER} title="deepest stack (space)" measure="depth" series={model.series} sx={sx} shown={shown} current={atSummary ? -1 : shown} />
        </Stage>
      </div>
      <table className="w-auto border-collapse font-mono text-[11.5px] text-ink-3 tabular-nums [&_td]:py-0.5 [&_td]:pr-8 [&_th]:pr-8 [&_th]:text-left [&_th]:font-medium">
        <thead>
          <tr>
            <th>call</th>
            <th>calls</th>
            <th>depth</th>
          </tr>
        </thead>
        <tbody>
          {model.points.map((p) => (
            <tr key={p.label} className={p.order === shown && !atSummary ? 'text-accent-ink' : p.order < shown || atSummary ? 'text-ink-2' : ''}>
              <td>{p.label}</td>
              <td>{p.order <= shown ? p.calls : ''}</td>
              <td>{p.order <= shown ? p.depth : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SceneFrame>
  );
}
