import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { monoWidth } from '../anim/model/layout.ts';
import { Pill, Stage, useEase } from '../anim/svg.tsx';
import { Figure } from './Figure.tsx';

/**
 * The Celsius–Fahrenheit converter of §3.3.5 as a constraint network
 * (figure 3.28): two multipliers, an adder and three constants, joined by
 * connectors. Drawn statically as a figure, or with values on its connectors
 * by the constraint scene.
 */

const FONT = 12.5;
type Point = readonly [number, number];

function Line({ points }: { points: readonly Point[] }) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  return <path d={d} fill="none" className="stroke-ink-3" strokeWidth={1.4} strokeLinejoin="round" />;
}

function Text({ x, y, children, anchor = 'middle', dim = false }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; dim?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={dim ? 10 : FONT + 2} className={dim ? 'fill-ink-3' : 'fill-ink'}>
      {children}
    </text>
  );
}

/** A constraint box with its operator in the middle and its terminals named at the edges. */
function ConstraintBox({ x, y, op, terminals, testId }: { x: number; y: number; op: string; terminals: { name: string; at: Point; anchor: 'start' | 'end' }[]; testId: string }) {
  return (
    <g data-testid="constraint" data-constraint={testId}>
      <rect x={x} y={y} width={110} height={80} rx={6} className="fill-paper-2 stroke-ink-2" strokeWidth={1.4} />
      <Text x={x + 55} y={y + 40}>{op}</Text>
      {terminals.map((t) => (
        <Text key={t.name} x={t.at[0] + (t.anchor === 'start' ? 6 : -6)} y={t.at[1]} anchor={t.anchor} dim>
          {t.name}
        </Text>
      ))}
    </g>
  );
}

function ConstantBox({ x, y, value }: { x: number; y: number; value: number }) {
  return (
    <g data-testid="constraint" data-constraint={`constant ${value}`}>
      <rect x={x} y={y} width={60} height={30} rx={6} className="fill-paper-2 stroke-ink-2" strokeWidth={1.4} />
      <Text x={x + 30} y={y + 15}>{value}</Text>
    </g>
  );
}

/** Where each connector's label sits. */
export const CONNECTOR_AT: Record<string, Point> = {
  C: [62, 60],
  u: [280, 80],
  v: [500, 60],
  w: [95, 142],
  x: [465, 142],
  y: [530, 142],
  F: [700, 80],
};

export interface ConstraintNetworkProps {
  /** Each connector's value: absent when unknown to the picture, `null` when it has none. Omit for the bare figure. */
  values?: ReadonlyMap<string, string | null>;
  /** The connector whose value just changed. */
  focus?: string | null;
}

export function ConstraintNetwork({ values, focus = null }: ConstraintNetworkProps) {
  const ease = useEase(0.5);
  return (
    <Stage width={750} height={225} label="Celsius–Fahrenheit converter: C times w is u, v times x is u, v plus y is F, with w 9, x 5 and y 32">
      <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={ease}>
        {/* Connectors. */}
        <Line points={[[20, 60], [120, 60]]} />
        <Line points={[[120, 100], [95, 100], [95, 185], [140, 185]]} />
        <Line points={[[230, 80], [330, 80]]} />
        <Line points={[[440, 60], [560, 60]]} />
        <Line points={[[440, 100], [465, 100], [465, 185], [460, 185]]} />
        <Line points={[[560, 100], [530, 100], [530, 185], [545, 185]]} />
        <Line points={[[670, 80], [735, 80]]} />
        <ConstraintBox
          testId="multiplier 1"
          x={120}
          y={40}
          op="×"
          terminals={[
            { name: 'm1', at: [120, 60], anchor: 'start' },
            { name: 'm2', at: [120, 100], anchor: 'start' },
            { name: 'p', at: [230, 80], anchor: 'end' },
          ]}
        />
        <ConstraintBox
          testId="multiplier 2"
          x={330}
          y={40}
          op="×"
          terminals={[
            { name: 'p', at: [330, 80], anchor: 'start' },
            { name: 'm1', at: [440, 60], anchor: 'end' },
            { name: 'm2', at: [440, 100], anchor: 'end' },
          ]}
        />
        <ConstraintBox
          testId="adder"
          x={560}
          y={40}
          op="+"
          terminals={[
            { name: 'a1', at: [560, 60], anchor: 'start' },
            { name: 'a2', at: [560, 100], anchor: 'start' },
            { name: 's', at: [670, 80], anchor: 'end' },
          ]}
        />
        <ConstantBox x={140} y={170} value={9} />
        <ConstantBox x={400} y={170} value={5} />
        <ConstantBox x={545} y={170} value={32} />
      </motion.g>
      {Object.entries(CONNECTOR_AT).map(([name, [x, y]]) => {
        const known = values?.has(name) === true;
        const value = values?.get(name) ?? null;
        const text = values === undefined || !known ? name : `${name} = ${value ?? '?'}`;
        const tone = values === undefined ? 'plain' : name === focus ? 'focus' : known && value !== null ? 'value' : 'dim';
        return (
          <g key={name} data-testid="connector" data-connector={name} data-value={known ? (value ?? '?') : ''}>
            <Pill x={x} y={y} width={Math.max(26, monoWidth(text, FONT) + 16)} height={22} text={text} tone={tone} enter={false} />
          </g>
        );
      })}
    </Stage>
  );
}

/** Figure 3.28: the relation 9C = 5(F − 32) as a constraint network. */
export function CelsiusFahrenheitDiagram({ caption }: { caption?: ReactNode }) {
  return (
    <Figure title="The relation 9C = 5(F − 32) as a constraint network" provenance="figure 3.28" caption={caption}>
      <ConstraintNetwork />
    </Figure>
  );
}
