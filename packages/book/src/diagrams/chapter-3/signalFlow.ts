/**
 * Signal-flow diagrams (§3.5.3–§3.5.5) as data: components placed on a
 * plane and wires between them. `SignalFlowDiagram.tsx` draws them; the
 * geometry here is plain functions, tested in node.
 */

export type SignalNodeKind =
  /** A processing component, drawn as a box: `scale: dt`, `integral`, `map: f`. */
  | 'box'
  /** An adder, drawn as a circle with a plus sign. */
  | 'adder'
  /** A named end of a wire: an input, an output, or an initial value. */
  | 'port'
  /** A point where a wire branches; drawn as a dot. */
  | 'tap';

export interface SignalNode {
  id: string;
  kind: SignalNodeKind;
  x: number;
  y: number;
  label?: string;
  /** Box width; boxes are 34 high. */
  w?: number;
  /** Where a port's label sits relative to the point. */
  side?: 'left' | 'right' | 'above' | 'below';
}

export interface SignalEdge {
  from: string;
  to: string;
  /** Bends between the two ends, in order. */
  via?: readonly (readonly [number, number])[];
  /** A name for the signal on this wire, drawn at `at`. */
  label?: string;
  at?: readonly [number, number];
}

export interface SignalFigure {
  width: number;
  height: number;
  nodes: readonly SignalNode[];
  edges: readonly SignalEdge[];
}

export const BOX_HEIGHT = 34;
export const ADDER_RADIUS = 15;
const DEFAULT_BOX_WIDTH = 96;

export const boxWidth = (node: SignalNode): number => node.w ?? DEFAULT_BOX_WIDTH;

/**
 * Where a wire heading from `toward` to the centre of `node` meets the
 * node's outline: the side of a box, the rim of an adder, or the point
 * itself for ports and taps.
 */
export function anchor(node: SignalNode, toward: readonly [number, number]): [number, number] {
  const dx = toward[0] - node.x;
  const dy = toward[1] - node.y;
  if (node.kind === 'port' || node.kind === 'tap' || (dx === 0 && dy === 0)) return [node.x, node.y];
  if (node.kind === 'adder') {
    const d = Math.hypot(dx, dy);
    return [node.x + (dx / d) * ADDER_RADIUS, node.y + (dy / d) * ADDER_RADIUS];
  }
  const hw = boxWidth(node) / 2;
  const hh = BOX_HEIGHT / 2;
  const scale = Math.min(dx === 0 ? Number.POSITIVE_INFINITY : hw / Math.abs(dx), dy === 0 ? Number.POSITIVE_INFINITY : hh / Math.abs(dy));
  return [node.x + dx * scale, node.y + dy * scale];
}

/** The polyline of a wire, from the outline of one node to the outline of the other. */
export function wirePoints(figure: SignalFigure, edge: SignalEdge): [number, number][] {
  const from = figure.nodes.find((n) => n.id === edge.from);
  const to = figure.nodes.find((n) => n.id === edge.to);
  if (from === undefined || to === undefined) throw new Error(`wire ${edge.from} → ${edge.to} names a missing node`);
  const via = (edge.via ?? []).map(([x, y]): [number, number] => [x, y]);
  const first = via[0] ?? [to.x, to.y];
  const last = via[via.length - 1] ?? [from.x, from.y];
  return [anchor(from, first), ...via, anchor(to, last)];
}

export const toPath = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

/** Figure 3.32: `integral` as a signal-processing system, with its feedback loop. */
export const integralFigure: SignalFigure = {
  width: 600,
  height: 170,
  nodes: [
    { id: 'input', kind: 'port', x: 16, y: 80, label: 'input', side: 'above' },
    { id: 'scale', kind: 'box', x: 140, y: 80, label: 'scale: dt' },
    { id: 'add', kind: 'adder', x: 262, y: 80, label: 'add' },
    { id: 'pair', kind: 'box', x: 380, y: 80, label: 'pair', w: 70 },
    { id: 'initial', kind: 'port', x: 380, y: 14, label: 'initial_value', side: 'right' },
    { id: 'tap', kind: 'tap', x: 470, y: 80 },
    { id: 'output', kind: 'port', x: 584, y: 80, label: 'integrated output', side: 'above' },
  ],
  edges: [
    { from: 'input', to: 'scale' },
    { from: 'scale', to: 'add' },
    { from: 'add', to: 'pair' },
    { from: 'initial', to: 'pair' },
    { from: 'pair', to: 'tap' },
    { from: 'tap', to: 'output' },
    { from: 'tap', to: 'add', via: [[470, 145], [262, 145]], label: 'integ, fed back', at: [366, 160] },
  ],
};

/** Figure 3.34: an analog-computer loop that solves dy/dt = f(y). */
export const solveFigure: SignalFigure = {
  width: 520,
  height: 190,
  nodes: [
    { id: 'y0', kind: 'port', x: 230, y: 14, label: 'y0', side: 'right' },
    { id: 'integral', kind: 'box', x: 230, y: 74, label: 'integral', w: 110 },
    { id: 'tap', kind: 'tap', x: 360, y: 74 },
    { id: 'y', kind: 'port', x: 500, y: 74, label: 'y', side: 'above' },
    { id: 'map', kind: 'box', x: 230, y: 150, label: 'map: f', w: 110 },
  ],
  edges: [
    { from: 'y0', to: 'integral' },
    { from: 'integral', to: 'tap' },
    { from: 'tap', to: 'y' },
    { from: 'tap', to: 'map', via: [[360, 150]] },
    { from: 'map', to: 'integral', via: [[80, 150], [80, 74]], label: 'dy', at: [64, 116] },
  ],
};

/** Figure 3.35: two integrators in a loop, for d²y/dt² = a dy/dt + b y. */
export const secondOrderFigure: SignalFigure = {
  width: 600,
  height: 236,
  nodes: [
    { id: 'dy0', kind: 'port', x: 190, y: 12, label: 'dy0', side: 'right' },
    { id: 'int1', kind: 'box', x: 190, y: 66, label: 'integral', w: 100 },
    { id: 'tap1', kind: 'tap', x: 296, y: 66 },
    { id: 'y0', kind: 'port', x: 396, y: 12, label: 'y0', side: 'right' },
    { id: 'int2', kind: 'box', x: 396, y: 66, label: 'integral', w: 100 },
    { id: 'tap2', kind: 'tap', x: 500, y: 66 },
    { id: 'y', kind: 'port', x: 584, y: 66, label: 'y', side: 'above' },
    { id: 'scaleA', kind: 'box', x: 200, y: 140, label: 'scale: a', w: 90 },
    { id: 'scaleB', kind: 'box', x: 200, y: 204, label: 'scale: b', w: 90 },
    { id: 'add', kind: 'adder', x: 84, y: 172, label: 'add' },
  ],
  edges: [
    { from: 'dy0', to: 'int1' },
    { from: 'int1', to: 'tap1' },
    { from: 'tap1', to: 'int2', label: 'dy', at: [312, 54] },
    { from: 'y0', to: 'int2' },
    { from: 'int2', to: 'tap2' },
    { from: 'tap2', to: 'y' },
    { from: 'tap1', to: 'scaleA', via: [[296, 140]] },
    { from: 'tap2', to: 'scaleB', via: [[500, 204]] },
    { from: 'scaleA', to: 'add', via: [[84, 140]] },
    { from: 'scaleB', to: 'add', via: [[84, 204]] },
    { from: 'add', to: 'int1', via: [[30, 172], [30, 66]], label: 'ddy', at: [14, 120] },
  ],
};

/** Figure 3.33, the signal-flow half: v = R i + v0 + (1/C) ∫ i dt. */
export const rcFigure: SignalFigure = {
  width: 560,
  height: 210,
  nodes: [
    { id: 'i', kind: 'port', x: 16, y: 96, label: 'i', side: 'above' },
    { id: 'tap', kind: 'tap', x: 70, y: 96 },
    { id: 'scaleR', kind: 'box', x: 220, y: 40, label: 'scale: R' },
    { id: 'scaleC', kind: 'box', x: 180, y: 150, label: 'scale: 1/C' },
    { id: 'integral', kind: 'box', x: 320, y: 150, label: 'integral', w: 90 },
    { id: 'v0', kind: 'port', x: 320, y: 202, label: 'v0', side: 'right' },
    { id: 'add', kind: 'adder', x: 440, y: 96, label: 'add' },
    { id: 'v', kind: 'port', x: 544, y: 96, label: 'v', side: 'above' },
  ],
  edges: [
    { from: 'i', to: 'tap' },
    { from: 'tap', to: 'scaleR', via: [[70, 40]] },
    { from: 'tap', to: 'scaleC', via: [[70, 150]] },
    { from: 'scaleC', to: 'integral' },
    { from: 'v0', to: 'integral' },
    { from: 'scaleR', to: 'add', via: [[440, 40]] },
    { from: 'integral', to: 'add', via: [[440, 150]] },
    { from: 'add', to: 'v' },
  ],
};

/** Figure 3.37: the series RLC circuit as two integrators feeding each other. */
export const rlcFigure: SignalFigure = {
  width: 640,
  height: 290,
  nodes: [
    { id: 'intV', kind: 'box', x: 260, y: 50, label: 'integral, v_C0', w: 120 },
    { id: 'tapV', kind: 'tap', x: 380, y: 50 },
    { id: 'vC', kind: 'port', x: 620, y: 50, label: 'v_C', side: 'above' },
    { id: 'intI', kind: 'box', x: 260, y: 210, label: 'integral, i_L0', w: 120 },
    { id: 'tapI', kind: 'tap', x: 440, y: 210 },
    { id: 'iL', kind: 'port', x: 620, y: 210, label: 'i_L', side: 'above' },
    { id: 'scaleC', kind: 'box', x: 160, y: 104, label: 'scale: −1/C', w: 100 },
    { id: 'scaleL', kind: 'box', x: 250, y: 156, label: 'scale: 1/L', w: 96 },
    { id: 'scaleR', kind: 'box', x: 260, y: 262, label: 'scale: −R/L', w: 104 },
    { id: 'add', kind: 'adder', x: 110, y: 210, label: 'add' },
  ],
  edges: [
    { from: 'intV', to: 'tapV' },
    { from: 'tapV', to: 'vC' },
    { from: 'intI', to: 'tapI' },
    { from: 'tapI', to: 'iL' },
    { from: 'tapI', to: 'scaleC', via: [[440, 104]] },
    { from: 'scaleC', to: 'intV', via: [[50, 104], [50, 50]], label: 'dv_C', at: [16, 80] },
    { from: 'tapV', to: 'scaleL', via: [[380, 156]] },
    { from: 'scaleL', to: 'add', via: [[110, 156]] },
    { from: 'tapI', to: 'scaleR', via: [[440, 262]] },
    { from: 'scaleR', to: 'add', via: [[110, 262]] },
    { from: 'add', to: 'intI', label: 'di_L', at: [150, 200] },
  ],
};

/** Figure 3.38: a joint account fed by the merge of two people's requests. */
export const jointAccountFigure: SignalFigure = {
  width: 580,
  height: 150,
  nodes: [
    { id: 'peter', kind: 'port', x: 16, y: 34, label: 'Peter’s requests', side: 'above' },
    { id: 'paul', kind: 'port', x: 16, y: 126, label: 'Paul’s requests', side: 'below' },
    { id: 'merge', kind: 'box', x: 210, y: 80, label: 'merge', w: 90 },
    { id: 'account', kind: 'box', x: 390, y: 80, label: 'bank account', w: 120 },
    { id: 'out', kind: 'port', x: 564, y: 80, label: 'balances', side: 'above' },
  ],
  edges: [
    { from: 'peter', to: 'merge', via: [[120, 34], [120, 72]] },
    { from: 'paul', to: 'merge', via: [[120, 126], [120, 88]] },
    { from: 'merge', to: 'account' },
    { from: 'account', to: 'out' },
  ],
};

export const signalFigures = {
  integral: integralFigure,
  solve: solveFigure,
  secondOrder: secondOrderFigure,
  rc: rcFigure,
  rlc: rlcFigure,
  jointAccount: jointAccountFigure,
} as const;
