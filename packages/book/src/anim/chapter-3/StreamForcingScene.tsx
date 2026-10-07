import { AnimatePresence } from 'motion/react';
import { useMemo, useRef } from 'react';
import { monoWidth } from '../model/layout.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, inlineCode, Pill, Stage } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { forcingAt, forcingRuns, forcingSummary, forcingTotal, type ForcingRow } from './streamForcing.ts';

/**
 * A stream as a chain of cells that grows as its tails are forced: each
 * computed element is a solid cell, and what has not been computed yet is a
 * dashed promise at the end. A cell computed more than once (an unmemoized
 * tail forced again) turns red and counts its computations. The elements are
 * the numbers the program prints as it computes them; `display("label")`
 * starts another stream, so two versions can be compared row by row.
 */

export interface StreamForcingSceneProps {
  trace: Trace | null;
  title?: string;
}

/** Keyframes a run plays in at most; computations are grouped beyond this. */
const KEYFRAMES = 48;
/** Cells drawn per row; older ones fold into a "+n" cell. */
const MAX_CELLS = 10;
const CELL_H = 28;
const GAP = 18;
const ROW_H = 74;
const LEFT = 16;
const PROMISE = '() => …';

const cellWidth = (text: string): number => Math.max(46, monoWidth(text, 12.5) + 18);

export function StreamForcingScene({ trace, title = 'Forcing a stream, one tail at a time' }: StreamForcingSceneProps) {
  const runs = useMemo(() => forcingRuns(trace?.output ?? []), [trace]);
  const total = forcingTotal(runs);
  const perFrame = Math.max(1, Math.ceil(total / KEYFRAMES));
  const frames = total === 0 ? 0 : Math.ceil(total / perFrame);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames, { stage, resetKey: trace, msPerStep: 700 });

  if (runs.length === 0) {
    const why =
      trace === null
        ? 'Running the program…'
        : 'Print each element as it is computed to see the stream grow: `display` returns its argument, so `pair(display(x), () => ...)` or `stream_map(display, s)` does it.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No elements computed yet">
        <div />
      </SceneFrame>
    );
  }

  const upto = Math.min(total, (player.index + 1) * perFrame);
  const state = forcingAt(runs, upto);
  const atEnd = upto >= total;
  const latest = state.latest;
  let caption: string;
  if (atEnd) {
    caption = forcingSummary(runs)
      .map((s) => {
        const name = s.label === '' ? 'The stream' : `\`${s.label}\``;
        return s.repeats === 0
          ? `${name}: ${s.computations} computation${s.computations === 1 ? '' : 's'} for ${s.elements} element${s.elements === 1 ? '' : 's'}, none repeated.`
          : `${name}: ${s.computations} computations for ${s.elements} elements, ${s.repeats} of them repeats.`;
      })
      .join(' ');
    if (runs.length === 1 && trace?.outcome.status === 'done') caption += ' Everything after the last cell is still a promise.';
  } else if (latest === null) {
    caption = '';
  } else if (latest.count === 1) {
    caption = `Computed ${latest.value}: ${latest.elements} element${latest.elements === 1 ? '' : 's'} so far, and the rest of the stream is still a promise.`;
  } else {
    caption = `Computed ${latest.value} again (${latest.count} times now): nothing kept it, so forcing the same tail ran the same computation.`;
  }

  const widths = state.rows.map((row) => visibleCells(row).reduce((w, c) => w + cellWidth(c.text) + GAP, 0) + cellWidth(PROMISE));
  const width = Math.max(420, LEFT * 2 + Math.max(...widths));
  const height = state.rows.length * ROW_H + 8;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={width} height={height} label={`${runs.length} stream${runs.length === 1 ? '' : 's'} with their computed elements`} maxHeight={320}>
          {state.rows.map((row, r) => (
            <Row key={r} row={row} y={r * ROW_H} latest={latest?.row === r ? latest.value : null} />
          ))}
        </Stage>
      </div>
    </SceneFrame>
  );
}

interface Visible {
  text: string;
  count: number;
  value: string | null;
}

function visibleCells(row: ForcingRow): Visible[] {
  const cells = row.cells.map((c): Visible => ({ text: c.value, count: c.count, value: c.value }));
  if (cells.length <= MAX_CELLS) return cells;
  const hidden = cells.length - (MAX_CELLS - 1);
  return [{ text: `+${hidden}`, count: 1, value: null }, ...cells.slice(hidden)];
}

function Row({ row, y, latest }: { row: ForcingRow; y: number; latest: string | null }) {
  const cells = visibleCells(row);
  const cy = y + 44;
  let x = LEFT;
  const placed = cells.map((cell) => {
    const w = cellWidth(cell.text);
    const at = { cell, cx: x + w / 2, w };
    x += w + GAP;
    return at;
  });
  const promiseW = cellWidth(PROMISE);
  const promiseX = x + promiseW / 2;
  return (
    <g data-testid="stream-row" data-label={row.label}>
      <text x={LEFT} y={y + 14} fontSize={11.5} className="fill-ink-3">
        {row.label === '' ? 'the stream' : row.label}
        {` · ${row.computations} computed`}
      </text>
      <AnimatePresence>
        {placed.map(({ cell, cx, w }, i) => {
          const next = placed[i + 1];
          const right = next === undefined ? promiseX - promiseW / 2 : next.cx - next.w / 2;
          return (
            <g key={cell.value ?? 'folded'}>
              <Edge x1={cx + w / 2} y1={cy} x2={right - 2} y2={cy} />
              <Pill
                x={cx}
                y={cy}
                width={w}
                height={CELL_H}
                text={cell.text}
                tone={cell.value === null ? 'dim' : cell.value === latest ? 'focus' : cell.count > 1 ? 'bad' : 'plain'}
                testId={cell.value === null ? 'stream-folded' : 'stream-cell'}
              />
              {cell.count > 1 && (
                <text x={cx + w / 2} y={cy - CELL_H / 2 - 3} textAnchor="end" fontSize={10.5} className="fill-bad" data-testid="stream-count">
                  ×{cell.count}
                </text>
              )}
            </g>
          );
        })}
      </AnimatePresence>
      <Pill x={promiseX} y={cy} width={promiseW} height={CELL_H} text={PROMISE} tone="dim" dashed testId="stream-promise" />
    </g>
  );
}
