import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Stage, useEase } from '../../anim/svg.tsx';
import { Figure } from '../Figure.tsx';

/**
 * Figure 3.31: the prime sieve as a signal-processing system (a Henderson
 * diagram). The input stream is split into its head and its tail; the head
 * makes a divisibility filter for the tail, whose output feeds another sieve,
 * and the head is put back in front of what that sieve produces.
 */

const W = 640;
const H = 236;

function Box({ x, y, w, h, label, dashed = false, sub }: { x: number; y: number; w: number; h: number; label: string; dashed?: boolean; sub?: string }) {
  return (
    <g data-testid="sieve-diagram-box">
      <rect x={x} y={y} width={w} height={h} rx={7} className="fill-paper stroke-ink-2" strokeWidth={1.3} strokeDasharray={dashed ? '5 4' : undefined} />
      <text x={x + w / 2} y={y + h / 2 - (sub === undefined ? 0 : 7)} textAnchor="middle" dominantBaseline="central" fontSize={12.5} className="fill-ink">
        {label}
      </text>
      {sub !== undefined && (
        <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle" dominantBaseline="central" fontSize={10.5} className="fill-ink-3">
          {sub}
        </text>
      )}
    </g>
  );
}

function Wire({ d, dashed = false, label, at }: { d: string; dashed?: boolean; label?: string; at?: [number, number] }) {
  return (
    <g>
      <path d={d} fill="none" className="stroke-ink-3" strokeWidth={1.4} strokeDasharray={dashed ? '4 4' : undefined} markerEnd="url(#sieve-diagram-arrow)" />
      {label !== undefined && at !== undefined && (
        <text x={at[0]} y={at[1]} fontSize={10.5} className="fill-ink-3">
          {label}
        </text>
      )}
    </g>
  );
}

export function SieveDiagram({ caption }: { caption?: ReactNode }) {
  const ease = useEase(0.5);
  return (
    <Figure title="Figure 3.31 · The prime sieve as a signal-processing system" provenance="Henderson diagram" caption={caption}>
      <Stage width={W} height={H} label="The sieve: the head of the input makes a filter for its tail, the filtered tail goes into another sieve, and the head is paired with that sieve's output" maxHeight={300}>
        <defs>
          <marker id="sieve-diagram-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-3" />
          </marker>
        </defs>
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ease}>
          <rect x={44} y={18} width={W - 88} height={H - 36} rx={12} className="fill-paper-2 stroke-ink-2" strokeWidth={1.6} />
          <text x={58} y={38} fontSize={13} className="fill-ink font-semibold">
            sieve
          </text>
          <Box x={78} y={98} w={74} h={44} label="head" sub="tail" />
          <Box x={214} y={150} w={138} h={44} label="filter:" sub="not divisible?" />
          <Box x={394} y={150} w={92} h={44} label="sieve" dashed />
          <Box x={520} y={98} w={60} h={44} label="pair" />
          {/* Input and output streams. */}
          <Wire d="M 6 120 L 76 120" />
          <Wire d={`M 582 120 L ${W - 6} 120`} />
          {/* The tail through the filter and the inner sieve. */}
          <Wire d="M 152 132 C 180 132, 186 172, 212 172" label="tail" at={[160, 160]} />
          <Wire d="M 352 172 L 392 172" />
          <Wire d="M 486 172 C 506 172, 506 132, 518 132" />
          {/* The head is one value, not a stream: dashed. */}
          <Wire d="M 152 108 C 250 70, 420 70, 518 108" dashed label="head (a single value)" at={[262, 72]} />
          <Wire d="M 170 104 C 210 104, 283 120, 283 148" dashed />
        </motion.g>
      </Stage>
    </Figure>
  );
}
