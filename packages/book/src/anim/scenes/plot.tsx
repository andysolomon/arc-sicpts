import type { ReactNode } from 'react';
import { fmt, type Sampler } from '../model/plot.ts';

/** Axes and curves shared by the scenes that plot a function (§1.3). */

export interface PlotBox {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const PLOT: PlotBox = { width: 560, height: 300, left: 46, right: 18, top: 16, bottom: 30 };

export interface Frame {
  box: PlotBox;
  x: [number, number];
  y: [number, number];
  sx(x: number): number;
  sy(y: number): number;
}

export function frame(x: [number, number], y: [number, number], box: PlotBox = PLOT): Frame {
  const [x0, x1] = x[0] === x[1] ? [x[0] - 1, x[1] + 1] : x;
  const [y0, y1] = y[0] === y[1] ? [y[0] - 1, y[1] + 1] : y;
  return {
    box,
    x: [x0, x1],
    y: [y0, y1],
    sx: (v) => box.left + ((v - x0) / (x1 - x0)) * (box.width - box.left - box.right),
    sy: (v) => box.top + ((y1 - v) / (y1 - y0)) * (box.height - box.top - box.bottom),
  };
}

/** Widen a range by a fraction of its length on both sides. */
export const pad = ([lo, hi]: [number, number], by = 0.08): [number, number] => {
  const span = hi - lo || Math.abs(hi) || 1;
  return [lo - span * by, hi + span * by];
};

export const extent = (values: readonly number[]): [number, number] => [Math.min(...values), Math.max(...values)];

/** The curve y = f(x) across the frame, broken wherever f has no value. */
export function curvePath(f: Sampler, fr: Frame, samples = 120): string {
  const [x0, x1] = fr.x;
  const [y0, y1] = fr.y;
  const span = y1 - y0;
  let path = '';
  let pen = false;
  for (let i = 0; i <= samples; i++) {
    const x = x0 + ((x1 - x0) * i) / samples;
    const y = f(x);
    // Leave out what lies far outside the frame, such as a pole.
    if (y === null || y < y0 - span * 2 || y > y1 + span * 2) {
      pen = false;
      continue;
    }
    path += `${pen ? 'L' : 'M'} ${fr.sx(x).toFixed(1)} ${fr.sy(y).toFixed(1)} `;
    pen = true;
  }
  return path.trim();
}

/** The x axis at y = 0 when it is in view, the y axis at the left, and end labels on both. */
export function Axes({ fr, xLabel, yLabel }: { fr: Frame; xLabel: ReactNode; yLabel: ReactNode }) {
  const { box } = fr;
  const zero = fr.y[0] <= 0 && fr.y[1] >= 0 ? fr.sy(0) : box.height - box.bottom;
  return (
    <g>
      <line x1={box.left} y1={zero} x2={box.width - box.right} y2={zero} className="stroke-ink-3" strokeWidth={1} />
      <line x1={box.left} y1={box.top} x2={box.left} y2={box.height - box.bottom} className="stroke-ink-3" strokeWidth={1} />
      <text x={box.left} y={box.height - box.bottom + 16} textAnchor="middle" fontSize={10} className="fill-ink-3">
        {fmt(Number(fr.x[0].toPrecision(3)))}
      </text>
      <text x={box.width - box.right} y={box.height - box.bottom + 16} textAnchor="end" fontSize={10} className="fill-ink-3">
        {xLabel} {fmt(Number(fr.x[1].toPrecision(3)))}
      </text>
      <text x={box.left - 6} y={box.top + 4} textAnchor="end" fontSize={10} className="fill-ink-3">
        {fmt(Number(fr.y[1].toPrecision(3)))}
      </text>
      <text x={box.left + 6} y={box.top + 8} fontSize={10.5} className="fill-ink-3">
        {yLabel}
      </text>
    </g>
  );
}
