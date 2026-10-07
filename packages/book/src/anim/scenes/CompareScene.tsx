import { parse, type StackMeasure } from '@sicp/lab';
import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { scale, type Scale } from '../model/growth.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import { useLabJob } from '../useLabJob.ts';

/**
 * One function, measured on the explicit-control evaluator and as compiled
 * code (and, when given, on a machine designed for it by hand): total pushes
 * and maximum stack depth at each size the program calls it with (§5.4.4,
 * §5.5.7).
 */

export interface CompareSceneProps {
  source: string;
  title?: string;
  /** A program declaring `special_statistics(n)` for a special-purpose machine. */
  special?: string | undefined;
}

interface Plan {
  definition: string;
  call: string;
  ns: number[];
}

/** The declarations of the program, and the sizes its top-level calls ask for. */
export function comparePlan(source: string): Plan | null {
  let program;
  try {
    program = parse(source);
  } catch {
    return null;
  }
  const declarations = program.body.filter((s) => s.kind === 'function' || s.kind === 'const' || s.kind === 'let');
  const definition = declarations.map((s) => source.slice(s.loc.start, s.loc.end)).join('\n');
  let call: string | null = null;
  const ns: number[] = [];
  for (const statement of program.body) {
    if (statement.kind !== 'application' || statement.fun.kind !== 'name') continue;
    const [arg] = statement.args;
    if (statement.args.length !== 1 || arg?.kind !== 'literal' || typeof arg.value !== 'number') continue;
    if (call !== null && call !== statement.fun.symbol) continue;
    call = statement.fun.symbol;
    ns.push(arg.value);
  }
  if (call === null || definition === '') return null;
  return { definition, call, ns };
}

const W = 600;
const H = 230;
const ML = 44;
const MR = 12;
const MT = 26;
const MB = 30;
const GUTTER = 34;
const PANEL = (W - GUTTER - ML * 2 - MR * 2) / 2;

const SERIES = [
  { key: 'interpreted', name: 'interpreted', stroke: 'stroke-num', fill: 'fill-num', text: 'text-num' },
  { key: 'compiled', name: 'compiled', stroke: 'stroke-accent', fill: 'fill-accent', text: 'text-accent-ink' },
  { key: 'special', name: 'special-purpose', stroke: 'stroke-str', fill: 'fill-str', text: 'text-str' },
] as const;

type Key = (typeof SERIES)[number]['key'];

function Panel({ x0, title, measure, data, sx, shown }: { x0: number; title: string; measure: 'totalPushes' | 'maximumDepth'; data: Map<Key, StackMeasure[]>; sx: Scale; shown: number }) {
  const ease = useEase();
  const values = [...data.values()].flat().map((m) => m[measure]);
  const sy = scale(values.length === 0 ? [0, 1] : [0, ...values], [H - MB, MT]);
  return (
    <g>
      <text x={x0} y={MT - 12} fontSize={11} className="fill-ink-2 font-semibold">
        {title}
      </text>
      <line x1={x0} y1={H - MB} x2={x0 + PANEL} y2={H - MB} className="stroke-ink-3" />
      <line x1={x0} y1={MT} x2={x0} y2={H - MB} className="stroke-ink-3" />
      {sy.ticks.map((t) => (
        <g key={t}>
          <line x1={x0} y1={sy(t)} x2={x0 + PANEL} y2={sy(t)} className="stroke-line" strokeWidth={0.8} />
          <text x={x0 - 6} y={sy(t)} textAnchor="end" dominantBaseline="central" fontSize={9.5} className="fill-ink-3">
            {t}
          </text>
        </g>
      ))}
      {sx.ticks.map((t) => (
        <text key={t} x={x0 + sx(t)} y={H - MB + 13} textAnchor="middle" fontSize={9.5} className="fill-ink-3">
          {t}
        </text>
      ))}
      <text x={x0 + PANEL} y={H - MB + 26} textAnchor="end" fontSize={10} className="fill-ink-3">
        n
      </text>
      {SERIES.map((series) => {
        const points = (data.get(series.key) ?? []).slice(0, shown + 1);
        if (points.length === 0) return null;
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(x0 + sx(p.n)).toFixed(1)} ${sy(p[measure]).toFixed(1)}`).join(' ');
        return (
          <g key={series.key}>
            {points.length > 1 && <motion.path initial={false} animate={{ d }} transition={ease} fill="none" className={series.stroke} strokeWidth={1.8} />}
            {points.map((p) => (
              <circle key={p.n} cx={x0 + sx(p.n)} cy={sy(p[measure])} r={3.2} className={series.fill} data-testid={measure === 'totalPushes' ? `point-${series.key}` : undefined} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

const ratio = (a: number, b: number): string => (b === 0 ? '—' : (a / b).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''));

export function CompareScene({ source, title = 'Interpreted and compiled, measured', special }: CompareSceneProps) {
  const plan = useMemo(() => comparePlan(source), [source]);
  const { result, pending } = useLabJob(
    plan === null ? null : { type: 'compare', definition: plan.definition, call: plan.call, ns: plan.ns, ...(special !== undefined && { special }) },
    'compare-done',
  );
  const stage = useRef<HTMLDivElement>(null);
  const count = result?.interpreted.length ?? 0;
  const player = usePlayer(count, { stage, resetKey: result, msPerStep: 1200 });

  if (plan === null || result === null || count === 0) {
    const why =
      plan === null
        ? 'Declare a function and call it at a few sizes, such as `factorial(3);`, `factorial(6);`, to measure it.'
        : result === null
          ? pending
            ? 'Measuring…'
            : 'Nothing measured yet.'
          : `Nothing could be measured: ${result.error ?? 'no results'}`;
    return (
      <SceneFrame title={title} provenance="machine" caption={inlineCode(why)} empty="Nothing measured yet">
        <div />
      </SceneFrame>
    );
  }

  const data = new Map<Key, StackMeasure[]>([
    ['interpreted', result.interpreted],
    ['compiled', result.compiled],
    ...(result.special === null ? [] : ([['special', result.special]] as [Key, StackMeasure[]][])),
  ]);
  const sx = scale(result.interpreted.map((m) => m.n), [0, PANEL]);
  const i = player.index;
  const interpreted = result.interpreted[i];
  const compiled = result.compiled[i];
  const handmade = result.special?.[i];
  const caption =
    interpreted === undefined || compiled === undefined
      ? ''
      : `\`${plan.call}(${interpreted.n})\` = ${interpreted.value}. Interpreted: ${interpreted.totalPushes} pushes, depth ${interpreted.maximumDepth}. ` +
        `Compiled: ${compiled.totalPushes} pushes, depth ${compiled.maximumDepth}, ratios ${ratio(compiled.totalPushes, interpreted.totalPushes)} and ${ratio(compiled.maximumDepth, interpreted.maximumDepth)}.` +
        (handmade === undefined ? '' : ` Special-purpose machine: ${handmade.totalPushes} pushes, depth ${handmade.maximumDepth}.`) +
        (result.error === null ? '' : ` (${result.error})`);

  return (
    <SceneFrame title={title} provenance="machine" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={W} height={H} label={`Total pushes and maximum depth against n for ${plan.call}`}>
          <Panel x0={ML} title="total pushes (time)" measure="totalPushes" data={data} sx={sx} shown={i} />
          <Panel x0={ML * 2 + MR + PANEL + GUTTER} title="maximum depth (space)" measure="maximumDepth" data={data} sx={sx} shown={i} />
        </Stage>
      </div>
      <table aria-label="Measurements" className="w-auto border-collapse font-mono text-[11.5px] text-ink-3 tabular-nums [&_td]:py-0.5 [&_td]:pr-6 [&_th]:pr-6 [&_th]:text-left [&_th]:font-medium">
        <thead>
          <tr>
            <th>n</th>
            {SERIES.filter((s) => data.has(s.key)).map((s) => (
              <th key={s.key} className={s.text}>
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.interpreted.map((m, row) => (
            <tr key={m.n} className={row === i ? 'text-ink' : row < i ? 'text-ink-2' : ''}>
              <td>{m.n}</td>
              {SERIES.filter((s) => data.has(s.key)).map((s) => {
                const cell = data.get(s.key)?.[row];
                return <td key={s.key}>{row <= i && cell !== undefined ? `${cell.totalPushes} / ${cell.maximumDepth}` : ''}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 font-mono text-[11px] text-ink-3">each cell: total pushes / maximum depth</p>
    </SceneFrame>
  );
}
