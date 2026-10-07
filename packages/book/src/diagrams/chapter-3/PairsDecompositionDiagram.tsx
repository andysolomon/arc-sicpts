import type { ReactNode } from 'react';
import { Stage } from '../../anim/svg.tsx';
import { Figure } from '../Figure.tsx';

/**
 * The pairs (S_i, T_j) with i ≤ j, split into the three parts `pairs` builds
 * them from: the corner, the rest of the first row, and the pairs of the two
 * tails, which are the same problem again.
 */

const ROWS = 4;
const COLS = 6;
const CELL_W = 62;
const CELL_H = 30;
const GAP = 4;
const LEFT = 10;
const TOP = 10;

export type PairsPart = 'corner' | 'row' | 'rest' | 'below';

/** Which of the three parts the pair (S_i, T_j) belongs to, counting from 0. */
export function pairsPart(i: number, j: number): PairsPart {
  if (j < i) return 'below';
  if (i === 0) return j === 0 ? 'corner' : 'row';
  return 'rest';
}

const TONE: Record<PairsPart, string> = {
  corner: 'fill-accent stroke-accent',
  row: 'fill-accent-soft stroke-accent',
  rest: 'fill-ok-soft stroke-ok',
  below: 'fill-paper stroke-line',
};

export function PairsDecompositionDiagram({ caption }: { caption?: ReactNode }) {
  const width = LEFT + COLS * (CELL_W + GAP) + 220;
  const height = TOP + ROWS * (CELL_H + GAP) + 10;
  const cells = [];
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const part = pairsPart(i, j);
      const x = LEFT + j * (CELL_W + GAP);
      const y = TOP + i * (CELL_H + GAP);
      cells.push(
        <g key={`${i}-${j}`} data-testid="pairs-part" data-part={part}>
          <rect x={x} y={y} width={CELL_W} height={CELL_H} rx={5} className={TONE[part]} strokeWidth={1} strokeDasharray={part === 'below' ? '3 3' : undefined} />
          {part !== 'below' && (
            <text x={x + CELL_W / 2} y={y + CELL_H / 2} textAnchor="middle" dominantBaseline="central" fontSize={11.5} className={part === 'corner' ? 'fill-paper' : 'fill-ink'}>
              {`(S${i}, T${j})`}
            </text>
          )}
        </g>,
      );
    }
  }
  const legendX = LEFT + COLS * (CELL_W + GAP) + 16;
  const legend: [PairsPart, string, string][] = [
    ['corner', '1. the first pair', 'list(head(s), head(t))'],
    ['row', '2. the rest of the first row', 'stream_map over stream_tail(t)'],
    ['rest', '3. everything else', 'pairs(stream_tail(s), stream_tail(t))'],
  ];
  return (
    <Figure title="Three parts make up pairs(S, T)" provenance="a figure" caption={caption}>
      <Stage width={width} height={height} label="A grid of pairs on or above the diagonal: the corner pair, the rest of the first row, and the remaining triangle, which is pairs of the two tails." maxHeight={220}>
        {cells}
        {legend.map(([part, title, code], k) => (
          <g key={part}>
            <rect x={legendX} y={TOP + 6 + k * 42} width={14} height={14} rx={3} className={TONE[part]} />
            <text x={legendX + 22} y={TOP + 17 + k * 42} fontSize={12} className="fill-ink">
              {title}
            </text>
            <text x={legendX + 22} y={TOP + 33 + k * 42} fontSize={10.5} className="fill-ink-3">
              {code}
            </text>
          </g>
        ))}
      </Stage>
    </Figure>
  );
}
