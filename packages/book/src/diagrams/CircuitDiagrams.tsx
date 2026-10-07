import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Stage, useEase } from '../anim/svg.tsx';
import { Figure } from './Figure.tsx';

/**
 * The figures of §3.3.4: the primitive gates, the half-adder, the full-adder
 * and the ripple-carry adder, drawn as SVG in the book's theme.
 */

const FONT = 12.5;
const GATE_W = 40;
const GATE_H = 30;

type Point = readonly [number, number];

/** A wire through the given points, with a dot at its start when it branches off another wire. */
function Wire({ points, junction = false, testId }: { points: readonly Point[]; junction?: boolean; testId?: string }) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const [x0, y0] = points[0] ?? [0, 0];
  return (
    <g data-testid={testId}>
      <path d={d} fill="none" className="stroke-ink-3" strokeWidth={1.4} strokeLinejoin="round" />
      {junction && <circle cx={x0} cy={y0} r={2.8} className="fill-ink-3" />}
    </g>
  );
}

function Label({ x, y, children, anchor = 'middle', tone = 'ink' }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; tone?: 'ink' | 'dim' | 'accent' }) {
  const fill = tone === 'ink' ? 'fill-ink' : tone === 'dim' ? 'fill-ink-3' : 'fill-accent-ink';
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={tone === 'dim' ? 10.5 : FONT} className={fill}>
      {children}
    </text>
  );
}

export type GateKind = 'and' | 'or' | 'inverter';

/** The outline of a gate whose inputs are on the left and output on the right, centred on (x, y). */
export function gatePath(kind: GateKind, x: number, y: number): string {
  const x0 = x - GATE_W / 2;
  const x1 = x + GATE_W / 2;
  const y0 = y - GATE_H / 2;
  const y1 = y + GATE_H / 2;
  const r = GATE_H / 2;
  switch (kind) {
    case 'and':
      return `M ${x0} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0} Z`;
    case 'or':
      return `M ${x0 - 3} ${y0} Q ${x0 + GATE_W * 0.55} ${y0} ${x1} ${y} Q ${x0 + GATE_W * 0.55} ${y1} ${x0 - 3} ${y1} Q ${x0 + 7} ${y} ${x0 - 3} ${y0} Z`;
    case 'inverter':
      return `M ${x0} ${y0 + 2} L ${x1 - 7} ${y} L ${x0} ${y1 - 2} Z`;
  }
}

/** A gate symbol centred on (x, y); `gateIn` and `gateOut` give the points to wire it by. */
export function Gate({ kind, x, y, label }: { kind: GateKind; x: number; y: number; label?: string }) {
  return (
    <g data-testid="gate" data-kind={kind}>
      <path d={gatePath(kind, x, y)} className="fill-paper-2 stroke-ink-2" strokeWidth={1.4} strokeLinejoin="round" />
      {kind === 'inverter' && <circle cx={x + GATE_W / 2 - 3.5} cy={y} r={3.5} className="fill-paper stroke-ink-2" strokeWidth={1.4} />}
      {label !== undefined && <Label x={x} y={y + GATE_H / 2 + 11} tone="dim">{label}</Label>}
    </g>
  );
}

const gateIn = (x: number, y: number, which: 1 | 2): Point => [x - GATE_W / 2, y + (which === 1 ? -GATE_H / 4 : GATE_H / 4)];
const gateOut = (x: number, y: number): Point => [x + GATE_W / 2, y];

/** Fades a drawing in the first time it scrolls into view. */
function Reveal({ children }: { children: ReactNode }) {
  const ease = useEase(0.5);
  return (
    <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.4 }} transition={ease}>
      {children}
    </motion.g>
  );
}

/** Figure 3.24: an inverter, an and-gate and an or-gate. */
export function PrimitiveGatesDiagram({ caption }: { caption?: ReactNode }) {
  const gates: { kind: GateKind; name: string; inputs: 1 | 2 }[] = [
    { kind: 'inverter', name: 'inverter', inputs: 1 },
    { kind: 'and', name: 'and-gate', inputs: 2 },
    { kind: 'or', name: 'or-gate', inputs: 2 },
  ];
  return (
    <Figure title="Primitive function boxes" provenance="figure 3.24" caption={caption}>
      <Stage width={480} height={100} label="An inverter, an and-gate and an or-gate">
        <Reveal>
          {gates.map((gate, i) => {
            const x = 90 + i * 150;
            const y = 42;
            const inputs: Point[] = gate.inputs === 1 ? [[x - GATE_W / 2, y]] : [gateIn(x, y, 1), gateIn(x, y, 2)];
            return (
              <g key={gate.kind}>
                {inputs.map(([ix, iy], j) => (
                  <Wire key={j} points={[[ix - 30, iy], [ix + (gate.kind === 'or' ? 3 : 0), iy]]} />
                ))}
                <Wire points={[gateOut(x, y), [x + GATE_W / 2 + 30, y]]} />
                <Gate kind={gate.kind} x={x} y={y} />
                <Label x={x} y={y + 38}>{gate.name}</Label>
              </g>
            );
          })}
        </Reveal>
      </Stage>
    </Figure>
  );
}

/** Figure 3.25: a half-adder from an or-gate, two and-gates and an inverter. */
export function HalfAdderDiagram({ caption }: { caption?: ReactNode }) {
  const or: Point = [180, 60];
  const and1: Point = [180, 160];
  const inv: Point = [290, 160];
  const and2: Point = [430, 110];
  const [orIn1, orIn2] = [gateIn(...or, 1), gateIn(...or, 2)];
  const [and1In1, and1In2] = [gateIn(...and1, 1), gateIn(...and1, 2)];
  const [and2In1, and2In2] = [gateIn(...and2, 1), gateIn(...and2, 2)];
  return (
    <Figure title="A half-adder circuit" provenance="figure 3.25" caption={caption}>
      <Stage width={580} height={220} label="Half-adder: D is A or B, C is A and B, E is not C, S is D and E">
        <Reveal>
          <Label x={22} y={orIn1[1]} anchor="end">A</Label>
          <Label x={22} y={orIn2[1]} anchor="end">B</Label>
          <Wire testId="wire-A" points={[[30, orIn1[1]], [orIn1[0] + 3, orIn1[1]]]} />
          <Wire testId="wire-B" points={[[30, orIn2[1]], [orIn2[0] + 3, orIn2[1]]]} />
          <Wire junction points={[[80, orIn1[1]], [80, and1In1[1]], and1In1]} />
          <Wire junction points={[[110, orIn2[1]], [110, and1In2[1]], and1In2]} />
          <Gate kind="or" x={or[0]} y={or[1]} />
          <Gate kind="and" x={and1[0]} y={and1[1]} />
          <Wire testId="wire-D" points={[gateOut(...or), [380, or[1]], [380, and2In1[1]], and2In1]} />
          <Label x={300} y={or[1] - 10}>D</Label>
          <Wire testId="wire-C" points={[gateOut(...and1), [inv[0] - GATE_W / 2, inv[1]]]} />
          <Wire junction points={[[230, and1[1]], [230, 196], [540, 196]]} />
          <Label x={548} y={196} anchor="start">C</Label>
          <Gate kind="inverter" x={inv[0]} y={inv[1]} />
          <Wire testId="wire-E" points={[gateOut(...inv), [380, inv[1]], [380, and2In2[1]], and2In2]} />
          <Label x={345} y={inv[1] - 10}>E</Label>
          <Gate kind="and" x={and2[0]} y={and2[1]} />
          <Wire testId="wire-S" points={[gateOut(...and2), [540, and2[1]]]} />
          <Label x={548} y={and2[1]} anchor="start">S</Label>
        </Reveal>
      </Stage>
    </Figure>
  );
}

/** A labelled box with named terminals, for adders built from adders. */
function Box({ x, y, w, h, title, testId }: { x: number; y: number; w: number; h: number; title: string; testId?: string }) {
  return (
    <g data-testid={testId}>
      <rect x={x} y={y} width={w} height={h} rx={6} className="fill-paper-2 stroke-ink-2" strokeWidth={1.4} />
      <Label x={x + w / 2} y={y + h / 2}>{title}</Label>
    </g>
  );
}

/** Figure 3.26: a full-adder from two half-adders and an or-gate. */
export function FullAdderDiagram({ caption }: { caption?: ReactNode }) {
  const ha1 = { x: 130, y: 92, w: 100, h: 62 };
  const ha2 = { x: 300, y: 22, w: 100, h: 62 };
  const or: Point = [480, 160];
  const top = (box: typeof ha1) => box.y + 16;
  const bottom = (box: typeof ha1) => box.y + box.h - 16;
  return (
    <Figure title="A full-adder circuit" provenance="figure 3.26" caption={caption}>
      <Stage width={600} height={200} label="Full-adder: two half-adders and an or-gate">
        <Reveal>
          <Label x={22} y={top(ha2)} anchor="end">A</Label>
          <Label x={22} y={top(ha1)} anchor="end">B</Label>
          <Label x={22} y={bottom(ha1)} anchor="end">C_in</Label>
          <Wire points={[[30, top(ha2)], [ha2.x, top(ha2)]]} />
          <Wire points={[[30, top(ha1)], [ha1.x, top(ha1)]]} />
          <Wire points={[[30, bottom(ha1)], [ha1.x, bottom(ha1)]]} />
          <Box testId="half-adder" {...ha1} title="half-adder" />
          <Box testId="half-adder" {...ha2} title="half-adder" />
          <Wire points={[[ha1.x + ha1.w, top(ha1)], [265, top(ha1)], [265, bottom(ha2)], [ha2.x, bottom(ha2)]]} />
          <Label x={250} y={top(ha1) - 10} tone="dim">s</Label>
          <Wire points={[[ha1.x + ha1.w, bottom(ha1)], [265, bottom(ha1)], [265, gateIn(...or, 2)[1]], [gateIn(...or, 2)[0] + 3, gateIn(...or, 2)[1]]]} />
          <Label x={250} y={bottom(ha1) + 10} tone="dim">c1</Label>
          <Wire points={[[ha2.x + ha2.w, bottom(ha2)], [430, bottom(ha2)], [430, gateIn(...or, 1)[1]], [gateIn(...or, 1)[0] + 3, gateIn(...or, 1)[1]]]} />
          <Label x={418} y={bottom(ha2) + 10} tone="dim">c2</Label>
          <Wire points={[[ha2.x + ha2.w, top(ha2)], [550, top(ha2)]]} />
          <Label x={558} y={top(ha2)} anchor="start">SUM</Label>
          <Gate kind="or" x={or[0]} y={or[1]} />
          <Wire points={[gateOut(...or), [550, or[1]]]} />
          <Label x={558} y={or[1]} anchor="start">C_out</Label>
        </Reveal>
      </Stage>
    </Figure>
  );
}

/** Figure 3.27: a ripple-carry adder for n-bit numbers, the carry passing from right to left. */
export function RippleCarryAdderDiagram({ caption }: { caption?: ReactNode }) {
  const stages = ['1', '2', '3', 'n'];
  const w = 78;
  const h = 54;
  const y = 64;
  const xs = [70, 190, 310, 470];
  return (
    <Figure title="A ripple-carry adder" provenance="figure 3.27" caption={caption}>
      <Stage width={600} height={180} label="n full-adders in a row, each one's carry out feeding the next one's carry in">
        <Reveal>
          {stages.map((k, i) => {
            const x = xs[i] ?? 0;
            const next = xs[i - 1];
            return (
              <g key={k}>
                <Wire points={[[x + 20, y - 30], [x + 20, y]]} />
                <Wire points={[[x + w - 20, y - 30], [x + w - 20, y]]} />
                <Label x={x + 20} y={y - 40}>{`A${k}`}</Label>
                <Label x={x + w - 20} y={y - 40}>{`B${k}`}</Label>
                <Box testId="full-adder" x={x} y={y} w={w} h={h} title="FA" />
                <Wire points={[[x + w / 2, y + h], [x + w / 2, y + h + 26]]} />
                <Label x={x + w / 2} y={y + h + 38}>{`S${k}`}</Label>
                {next !== undefined && i !== 3 && <Wire points={[[x, y + h / 2], [next + w, y + h / 2]]} />}
                {i === 3 && <Wire points={[[x, y + h / 2], [(xs[2] ?? 0) + w, y + h / 2]]} />}
              </g>
            );
          })}
          <rect x={(xs[2] ?? 0) + w + 10} y={y + h / 2 - 8} width={50} height={16} className="fill-paper stroke-none" />
          <Label x={(xs[2] ?? 0) + w + 35} y={y + h / 2}>⋯</Label>
          <Wire points={[[xs[0] ?? 0, y + h / 2], [30, y + h / 2]]} />
          <Label x={22} y={y + h / 2} anchor="end">C</Label>
          <Wire points={[[(xs[3] ?? 0) + w + 30, y + h / 2], [(xs[3] ?? 0) + w, y + h / 2]]} />
          <Label x={(xs[3] ?? 0) + w + 38} y={y + h / 2} anchor="start">0</Label>
        </Reveal>
      </Stage>
    </Figure>
  );
}
