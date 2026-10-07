import type { Segment } from '@sicp/lab';

/**
 * What `draw_line` drew, on a unit square with the origin at the bottom left,
 * as the picture language of §2.2.4 expects. Lines outside the square are
 * still shown; the square is only the canvas's outline.
 */

const SIZE = 280;
const PAD = 8;

export function Drawing({ segments, label }: { segments: readonly Segment[]; label?: string }) {
  const sx = (x: number) => PAD + x * SIZE;
  const sy = (y: number) => PAD + (1 - y) * SIZE;
  return (
    <svg
      viewBox={`0 0 ${SIZE + PAD * 2} ${SIZE + PAD * 2}`}
      role="img"
      aria-label={label ?? `Drawing of ${segments.length} lines`}
      data-testid="drawing"
      className="block h-auto w-full max-w-[300px] overflow-visible"
    >
      <rect x={PAD} y={PAD} width={SIZE} height={SIZE} className="fill-paper stroke-line" strokeWidth={1} />
      {segments.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          data-testid="segment"
          x1={sx(x1)}
          y1={sy(y1)}
          x2={sx(x2)}
          y2={sy(y2)}
          className="stroke-ink"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
