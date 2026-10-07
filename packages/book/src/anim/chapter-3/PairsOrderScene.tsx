import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { appendedPairs, gridSize, interleavedPairs, orderOf, pairsFromOutput, precedingCount, rowShares, type IntPair } from './pairsOrder.ts';

/**
 * The pairs a program prints, lit one by one on a grid of rows i and
 * columns j, beside the same number of pairs taken in another order: the
 * order of `stream_append` when the program interleaves, and the order of
 * `interleave` otherwise.
 */

export interface PairsOrderSceneProps {
  trace: Trace | null;
  title?: string;
}

/** Pairs drawn at most; enough to fill the triangle up to (6, 6), which comes out 63rd. */
const MAX_PAIRS = 64;
const CELL = 28;
const GAP = 3;
const LABEL = 22;
const TITLE = 22;

interface GridProps {
  x: number;
  rows: number;
  cols: number;
  pairs: readonly IntPair[];
  title: string;
  id: 'program' | 'model';
}

function Grid({ x, rows, cols, pairs, title, id }: GridProps) {
  const ease = useEase(0.3);
  const order = new Map<string, number>();
  pairs.forEach(([i, j], k) => {
    const key = `${i},${j}`;
    if (!order.has(key)) order.set(key, k + 1);
  });
  const lastPair = pairs[pairs.length - 1];
  const cells = [];
  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      const n = order.get(`${i},${j}`);
      const latest = lastPair !== undefined && lastPair[0] === i && lastPair[1] === j;
      const below = j < i;
      const cx = x + LABEL + (j - 1) * (CELL + GAP);
      const cy = TITLE + LABEL + (i - 1) * (CELL + GAP);
      cells.push(
        <g key={`${i}-${j}`} data-testid="pairs-cell" data-grid={id} data-i={i} data-j={j} data-order={n ?? ''} data-latest={latest || undefined}>
          <motion.rect
            x={cx}
            y={cy}
            width={CELL}
            height={CELL}
            rx={5}
            initial={false}
            animate={{ opacity: n === undefined && below ? 0.35 : 1 }}
            transition={ease}
            className={latest ? 'fill-accent stroke-accent' : n !== undefined ? 'fill-accent-soft stroke-accent' : 'fill-paper-2 stroke-line'}
            strokeWidth={latest ? 2 : 1}
            strokeDasharray={n === undefined && below ? '3 3' : undefined}
          />
          {n !== undefined && (
            <text x={cx + CELL / 2} y={cy + CELL / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} className={latest ? 'fill-paper' : 'fill-accent-ink'}>
              {n}
            </text>
          )}
        </g>,
      );
    }
  }
  return (
    <g data-testid="pairs-grid" data-grid={id}>
      <text x={x} y={13} fontSize={12} className="fill-ink-2">
        {title}
      </text>
      {Array.from({ length: cols }, (_, k) => (
        <text key={`j${k}`} x={x + LABEL + k * (CELL + GAP) + CELL / 2} y={TITLE + LABEL - 7} textAnchor="middle" fontSize={10} className="fill-ink-3">
          {k + 1}
        </text>
      ))}
      {Array.from({ length: rows }, (_, k) => (
        <text key={`i${k}`} x={x + LABEL - 8} y={TITLE + LABEL + k * (CELL + GAP) + CELL / 2} textAnchor="end" dominantBaseline="central" fontSize={10} className="fill-ink-3">
          {k + 1}
        </text>
      ))}
      {cells}
    </g>
  );
}

const fmtPair = ([i, j]: IntPair) => `(${i}, ${j})`;

export function PairsOrderScene({ trace, title = 'The order the pairs come out in' }: PairsOrderSceneProps) {
  const all = useMemo(() => pairsFromOutput(trace?.output ?? []), [trace]);
  const pairs = all.slice(0, MAX_PAIRS);
  const order = orderOf(pairs);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(pairs.length, { stage, resetKey: trace, msPerStep: 520 });

  if (pairs.length === 0) {
    const why =
      trace === null
        ? 'Running the program…'
        : trace.outcome.status === 'error'
          ? `The program stopped with an error: ${trace.outcome.error.message}`
          : 'Print pairs with `display_list(list(i, j))`, one per line, to light them on the grid.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No pairs printed yet">
        <div />
      </SceneFrame>
    );
  }

  const shown = pairs.slice(0, player.index + 1);
  const contrastAll = order === 'append' ? interleavedPairs(pairs.length) : appendedPairs(pairs.length);
  const contrast = contrastAll.slice(0, shown.length);
  const { rows, cols } = gridSize([...pairs, ...contrastAll]);
  const gridWidth = LABEL + cols * (CELL + GAP) - GAP;
  const width = gridWidth * 2 + 36;
  const height = TITLE + LABEL + rows * (CELL + GAP);

  const current = shown[shown.length - 1] ?? pairs[0];
  const [i, j] = current ?? [1, 1];
  const offGrid = shown.filter(([a, b]) => a > rows || b > cols).length;
  let caption: string;
  if (player.atEnd) {
    const shares = rowShares(shown, rows);
    caption =
      order === 'append'
        ? `All ${shown.length} pairs come from row 1: \`stream_append\` is still on the first row, which never ends, so (2, 2) never comes out. Interleaving, on the right, reaches every row.`
        : order === 'interleave'
          ? `Of ${shown.length} pairs, row 1 gave ${shares[0]}, row 2 gave ${shares[1]}, row 3 gave ${shares[2]}: each row gets half of what the row above it leaves. Appending rows, on the right, would never leave row 1.`
          : `Of ${shown.length} pairs, row 1 gave ${shares[0]}, row 2 gave ${shares[1]}, row 3 gave ${shares[2]}. Appending rows, on the right, would never leave row 1.`;
    if (offGrid > 0) caption += ` ${offGrid} of the pairs lie beyond the grid.`;
  } else {
    caption = `Pair ${shown.length}: ${fmtPair([i, j])}.`;
    if (order === 'interleave' && i <= j) caption += ` ${precedingCount(i, j)} pairs come before it, as 2^i (j − i) + 2^(i−1) − 2 predicts${i === j ? ' (2^i − 2 on the diagonal)' : ''}.`;
    if (i > rows || j > cols) caption += ' It lies beyond the grid.';
  }

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage}>
        <Stage width={width} height={height} label={`The first ${pairs.length} pairs the program printed, on a grid of rows i and columns j`} maxHeight={300}>
          <Grid x={0} rows={rows} cols={cols} pairs={shown} title={order === 'append' ? 'this program (stream_append)' : order === 'interleave' ? 'this program (interleave)' : 'this program'} id="program" />
          <Grid x={gridWidth + 36} rows={rows} cols={cols} pairs={contrast} title={order === 'append' ? 'with interleave' : 'with stream_append'} id="model" />
        </Stage>
      </div>
      <ol aria-label="Pairs in order" className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 font-mono text-[11.5px] text-ink-3">
        {shown.map((p, k) => (
          <li key={k} className={k === shown.length - 1 ? 'text-accent-ink' : 'text-ink-2'}>
            {fmtPair(p)}
          </li>
        ))}
      </ol>
    </SceneFrame>
  );
}
