import type { LabClient } from '@sicp/lab';
import { useId, useMemo, useRef, useState } from 'react';
import { outlineButton } from '../../editor/buttons.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, inlineCode, Pill, Stage, type Tone } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { useSeededTrace } from './concurrencyHooks.ts';
import { describeRow, interleaving, summarize, type InterleavingRow } from './interleaving.ts';

/**
 * A timing diagram drawn from the trace, in the manner of figure 3.29: a lane
 * per thread, time running down, and the shared variables in the middle. The
 * reader picks the seed that interleaves the threads, and so can replay one
 * interleaving or look for another.
 */

export interface InterleavingSceneProps {
  source: string;
  title?: string;
  /** The seed shown first. */
  initialSeed?: number;
  /** A trace to draw instead of asking the Laboratory (tests). */
  trace?: Trace | null;
  client?: LabClient;
  delayMs?: number;
}

const W = 600;
const PAD = 10;
const TOP = 46;
const ROW = 25;
/** Rows on screen at once; earlier ones scroll off the top. */
const WINDOW = 12;
const MAX_RECORDS = 3000;
const BUDGET = 20_000;

function toneOf(row: InterleavingRow): Tone {
  switch (row.kind) {
    case 'read':
      return 'value';
    case 'write':
      return row.overwrites === undefined ? 'focus' : 'bad';
    case 'lock':
      return row.value === 'true' ? 'dim' : 'ok';
    case 'end':
      return 'dim';
    default:
      return 'plain';
  }
}

export function InterleavingScene({ source, title = 'Interleaved threads', initialSeed = 1, trace: given, client, delayMs }: InterleavingSceneProps) {
  const [seed, setSeed] = useState(initialSeed);
  const seedId = useId();
  const traced = useSeededTrace(source, seed, {
    skip: given !== undefined,
    maxRecords: MAX_RECORDS,
    budget: BUDGET,
    ...(client !== undefined && { client }),
    ...(delayMs !== undefined && { delayMs }),
  });
  const trace = given !== undefined ? given : traced.trace;
  const model = useMemo(() => (trace === null ? null : interleaving(trace.records, trace.outcome, trace.truncated)), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const rows = model?.rows ?? [];
  const player = usePlayer(rows.length === 0 ? 0 : rows.length + 1, { stage, resetKey: trace, msPerStep: 900 });

  const controls = (
    <div className="flex items-center gap-2">
      <label htmlFor={seedId} className="text-[13px] text-ink-2">
        seed
      </label>
      <input
        id={seedId}
        type="number"
        min={1}
        value={seed}
        onChange={(event) => {
          const next = Math.floor(Number(event.currentTarget.value));
          if (Number.isFinite(next) && next >= 1) setSeed(next);
        }}
        className="h-8 w-20 rounded-md border border-line bg-transparent px-2 font-mono text-[13px] text-ink pointer-coarse:h-11"
      />
      <button type="button" className={outlineButton} onClick={() => setSeed((s) => s + 1)}>
        Another seed
      </button>
    </div>
  );

  if (model === null || model.threads.length === 0 || rows.length === 0) {
    const why =
      model === null
        ? 'Tracing the program…'
        : trace?.outcome.status === 'error'
          ? `The program stopped with an error: ${trace.outcome.error.message}`
          : model.threads.length === 0
            ? 'This program starts no threads. Call `concurrent_execute(f, g)` to run functions side by side.'
            : 'The threads touch no shared variable. Assign a variable declared outside them to see the interleaving.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No threads to draw yet" extra={controls}>
        <div />
      </SceneFrame>
    );
  }

  const atSummary = player.index >= rows.length;
  const current = Math.min(player.index, rows.length - 1);
  const revealed = atSummary ? rows.length : current + 1;
  const first = Math.max(0, revealed - WINDOW);
  const visible = rows.slice(first, revealed);
  const state = model.after[revealed - 1] ?? model.initial;

  // Lanes left and right of the shared column, as in figure 3.29.
  const k = model.threads.length;
  const middle = Math.ceil(k / 2);
  const columns: (number | 'shared')[] = [...model.threads.slice(0, middle), 'shared', ...model.threads.slice(middle)];
  const colW = (W - PAD * 2) / columns.length;
  const cx = (column: number | 'shared'): number => PAD + colW * (columns.indexOf(column) + 0.5);
  const pillW = Math.min(170, colW - 12);
  const height = TOP + Math.min(WINDOW, rows.length) * ROW + 8;
  const sharedText = model.shared.map((s) => `${s} = ${state[s] ?? '?'}`).join(', ');

  const caption = atSummary ? summarize(model) : describeRow(rows[current] as InterleavingRow);

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)} extra={controls}>
      <div ref={stage}>
        <Stage width={W} height={height} label={`Timing diagram of ${k} threads and ${model.shared.join(', ')}, seed ${seed}`}>
          {columns.map((column) => (
            <g key={String(column)}>
              <text x={cx(column)} y={14} textAnchor="middle" fontSize={11.5} className={column === 'shared' ? 'fill-num font-semibold' : 'fill-ink-2 font-semibold'}>
                {column === 'shared' ? 'shared' : `thread ${column}`}
              </text>
              {column === 'shared' && (
                <text data-testid="shared-state" x={cx(column)} y={30} textAnchor="middle" fontSize={11} className="fill-num">
                  {sharedText}
                </text>
              )}
              <line x1={cx(column)} y1={TOP - 8} x2={cx(column)} y2={height - 4} className="stroke-line" strokeWidth={1} strokeDasharray={column === 'shared' ? undefined : '2 4'} />
            </g>
          ))}
          {visible.map((row, i) => {
            const y = TOP + i * ROW + ROW / 2 - 2;
            const index = first + i;
            const x = cx(row.thread);
            const s = cx('shared');
            const towards = x < s ? 1 : -1;
            const isCurrent = !atSummary && index === current;
            const text = row.repeat > 1 ? `${row.text} ×${row.repeat}` : row.text;
            return (
              <g key={row.n} data-testid="lane-row" data-kind={row.kind} data-thread={row.thread} data-lost={row.overwrites !== undefined ? 'true' : undefined} data-mixed={row.mixed !== undefined ? 'true' : undefined}>
                {(row.kind === 'read' || row.kind === 'write') && (
                  <Edge
                    x1={x + (towards * pillW) / 2}
                    y1={y}
                    x2={row.kind === 'write' ? s - (towards * Math.min(pillW, 110)) / 2 : s}
                    y2={y}
                    tone={row.overwrites !== undefined || isCurrent ? 'accent' : 'line'}
                    dashed={row.kind === 'read'}
                  />
                )}
                <Pill x={x} y={y} width={pillW} height={20} fontSize={11} text={text} tone={toneOf(row)} dashed={row.mixed !== undefined && row.overwrites === undefined} opacity={isCurrent || atSummary ? 1 : 0.72} {...(isCurrent && { strokeWidth: 2.2 })} />
                {row.kind === 'write' && (
                  <Pill x={s} y={y} width={Math.min(pillW, 110)} height={20} fontSize={11} text={row.value ?? ''} tone={row.overwrites === undefined ? 'value' : 'bad'} opacity={isCurrent || atSummary ? 1 : 0.72} />
                )}
              </g>
            );
          })}
        </Stage>
      </div>
    </SceneFrame>
  );
}
